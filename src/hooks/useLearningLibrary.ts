import { useCallback, useEffect, useRef, useState } from 'react'
import { LearningClient } from '../lib/learning/client'
import type { LearningCard, LearningPage, MigrationPreview, MigrationProgress } from '../lib/learning/types'
import type { StudyStats } from './useStats'
import { trackEvent } from '../lib/telemetry'

type LibraryState = { clock: number; root: string; client: LearningClient | null; phase: 'loading' | 'legacy' | 'migrating' | 'ready' | 'error'; pages: LearningPage[]; cards: LearningCard[]; stats: StudyStats | null; error: string | null; progress: MigrationProgress | null }
const initial = (root: string): LibraryState => ({ clock: 0, root, client: null, phase: 'loading', pages: [], cards: [], stats: null, error: null, progress: null })
export function useLearningLibrary(root: string | null | undefined) {
  const path = root?.replace(/\/$/, '') ?? ''
  const [state, setState] = useState(() => initial(path))
  const [migrationRoot, setMigrationRoot] = useState(path)
  const [migrationVisible, setMigrationOpen] = useState(false)
  const [storedPreview, setPreview] = useState<MigrationPreview | null>(null)
  const [migrationBusy, setBusy] = useState(false)
  const generation = useRef(0)
  const reads = useRef(new Map<string, number>())
  const current = state.root === path ? state : initial(path)
  const migrationOpen = migrationRoot === path && migrationVisible
  const preview = migrationRoot === path ? storedPreview : null
  const busy = migrationRoot === path && migrationBusy
  const load = useCallback(async (client: LearningClient, epoch: number) => {
    const read = (reads.current.get(path) ?? 0) + 1
    reads.current.set(path, read)
    const pages = await client.syncPages()
    const [cards, stats] = await Promise.all([client.listCards(null, true), client.studyStats()])
    if (generation.current === epoch && reads.current.get(path) === read) setState(previous => previous.root !== path ? previous : ({ ...previous, root: path, client, phase: 'ready', pages, cards, stats, clock: Date.now(), error: null }))
  }, [path])
  const connect = useCallback(async () => {
    const epoch = ++generation.current
    if (!path) return
    try {
      const client = await LearningClient.connect(path)
      const progress = await client.migrationStatus()
      if (generation.current !== epoch) return
      setState({ ...initial(path), client, phase: progress.state === 'ready' ? 'loading' : progress.state, progress })
      if (progress.state === 'ready') await load(client, epoch)
    } catch (error) {
      if (generation.current === epoch) setState({ ...initial(path), phase: 'error', error: String(error) })
    }
  }, [path, load])
  const invalidate = useCallback(() => { generation.current++ }, [])
  useEffect(() => { void connect(); return invalidate }, [connect, invalidate])
  const refresh = useCallback(async () => {
    if (current.client && current.phase === 'ready') await load(current.client, generation.current)
  }, [current.client, current.phase, load])
  useEffect(() => {
    if (current.phase !== 'ready') return
    const timer = setInterval(() => { void refresh().catch(error => setState(previous => ({ ...previous, error: String(error) }))) }, 60_000)
    return () => clearInterval(timer)
  }, [current.phase, refresh])
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
  return { ...current, refresh, reconnect: connect, migrationOpen, setMigrationOpen, openMigration, preview, busy, migrate }
}
