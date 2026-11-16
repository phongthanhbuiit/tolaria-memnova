import { useCallback, useEffect, useRef, useState } from 'react'
import { LearningClient } from '../lib/learning/client'
import type { LearningCard, LearningPage, MigrationPreview, MigrationProgress, NoteLearningSummary } from '../lib/learning/types'
import type { StudyStats } from './useStats'
import { trackEvent } from '../lib/telemetry'

type LibraryState = { clock: number; root: string; client: LearningClient | null; phase: 'loading' | 'legacy' | 'migrating' | 'ready' | 'error'; pages: LearningPage[]; cards: LearningCard[]; notes: NoteLearningSummary[]; stats: StudyStats | null; error: string | null; progress: MigrationProgress | null }
const initial = (root: string): LibraryState => ({ clock: 0, root, client: null, phase: 'loading', pages: [], cards: [], notes: [], stats: null, error: null, progress: null })

async function readSnapshot(client: LearningClient) {
  const workspace = client.supportsNoteMemory ? await client.syncNoteWorkspace() : { pages: await client.syncPages(), notes: [] }
  const [cards, stats] = await Promise.all([client.listCards(null, true), client.studyStats()])
  return { ...workspace, cards, stats, clock: Date.now() }
}
type Snapshot = Awaited<ReturnType<typeof readSnapshot>>

export function useLearningLibrary(root: string | null | undefined) {
  const path = root?.replace(/\/$/, '') ?? ''
  const [state, setState] = useState(() => initial(path))
  const [migrationRoot, setMigrationRoot] = useState(path)
  const [migrationVisible, setMigrationOpen] = useState(false)
  const [storedPreview, setPreview] = useState<MigrationPreview | null>(null)
  const [migrationBusy, setBusy] = useState(false)
  const generation = useRef(0)
  const latestRead = useRef<Promise<Snapshot | undefined> | undefined>(undefined)
  const connections = useRef(new WeakMap<LearningClient, number>())
  const current = state.root === path ? state : initial(path)
  const migrationOpen = migrationRoot === path && migrationVisible
  const preview = migrationRoot === path ? storedPreview : null
  const busy = migrationRoot === path && migrationBusy
  const load = useCallback((client: LearningClient, epoch: number) => {
    if (generation.current !== epoch) return
    const settle = (publish: () => Snapshot) => {
      if (generation.current !== epoch) return
      // Readers waiting to start Study follow the same authoritative read as the UI.
      return latestRead.current === read ? publish() : latestRead.current
    }
    const read: Promise<Snapshot | undefined> = readSnapshot(client).then(
      data => settle(() => {
        setState(previous => previous.root !== path ? previous : ({ ...previous, root: path, client, phase: 'ready', ...data, error: null }))
        return data
      }),
      error => settle(() => {
        setState(previous => previous.root !== path ? previous : { ...previous, error: String(error) })
        throw error
      }),
    )
    latestRead.current = read
    return read
  }, [path])
  const connect = useCallback(async () => {
    const epoch = ++generation.current
    if (!path) return
    try {
      const client = await LearningClient.connect(path)
      const progress = await client.migrationStatus()
      if (generation.current !== epoch) return
      connections.current.set(client, epoch)
      setMigrationRoot(path); setMigrationOpen(false); setBusy(false); setPreview(null)
      setState({ ...initial(path), client, phase: progress.state === 'ready' ? 'loading' : progress.state, progress })
      if (progress.state === 'ready') await load(client, epoch)
    } catch (error) {
      if (generation.current === epoch) {
        setMigrationRoot(path); setMigrationOpen(false); setBusy(false); setPreview(null)
        setState({ ...initial(path), phase: 'error', error: String(error) })
      }
    }
  }, [path, load])
  const invalidate = useCallback(() => { generation.current++ }, [])
  useEffect(() => { void connect(); return invalidate }, [connect, invalidate])
  const refreshSnapshot = useCallback(async () => {
    const epoch = current.client ? connections.current.get(current.client) : undefined
    if (current.client && current.phase === 'ready' && epoch !== undefined) return load(current.client, epoch)
  }, [current.client, current.phase, load])
  const refresh = useCallback(async () => { await refreshSnapshot() }, [refreshSnapshot])
  useEffect(() => {
    if (current.phase !== 'ready') return
    const timer = setInterval(() => { void refresh().catch(() => {}) }, 60_000)
    return () => clearInterval(timer)
  }, [current.phase, refresh, path])
  const openMigration = useCallback(async () => {
    const epoch = generation.current
    setMigrationRoot(path); setPreview(null); setMigrationOpen(true); setBusy(true)
    try { const value = await LearningClient.previewMigration(path); if (generation.current === epoch) setPreview(value) }
    catch (error) { if (generation.current === epoch) setState(previous => ({ ...previous, error: String(error) })) }
    finally { if (generation.current === epoch) setBusy(false) }
  }, [path])
  const migrate = useCallback(async (flush: () => Promise<unknown>) => {
    if (!current.client) return
    const client = current.client
    const epoch = generation.current
    setBusy(true)
    try {
      await flush()
      let progress = await client.migrationStatus()
      if (progress.state === 'legacy') {
        if (!preview) throw new Error('Preview is not available')
        progress = await client.beginMigration(preview.fingerprint, localStorage.getItem('tolaria-memnova:stats'))
        trackEvent('memnova_migration_started', { pages: progress.totalPages, cards: progress.totalCards })
      }
      while (progress.state === 'migrating' && generation.current === epoch) {
        progress = await client.resumeMigration()
        if (generation.current === epoch) setState(previous => ({ ...previous, phase: progress.state, progress, error: null }))
      }
      if (generation.current === epoch && progress.state === 'ready') {
        await load(client, epoch); setMigrationOpen(false)
        trackEvent('memnova_migration_completed', { pages: progress.importedPages, cards: progress.importedCards, reviews: progress.importedReviews })
      }
    } catch (error) {
      if (generation.current === epoch) setState(previous => ({ ...previous, error: String(error) }))
      trackEvent('memnova_migration_failed', { stage: 'import' })
    } finally { if (generation.current === epoch) setBusy(false) }
  }, [current.client, preview, load])
  return { ...current, refresh, refreshSnapshot, reconnect: connect, migrationOpen, setMigrationOpen, openMigration, preview, busy, migrate }
}
