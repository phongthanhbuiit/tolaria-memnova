import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import type { BackupCatalogEntry } from '../../lib/learning/types'
import { translate, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { useLearningWorkspace } from './LearningContext'
import { LibraryBackupRecoveryClient } from '../../lib/learning/backupRecoveryClient'

export function BackupPanel({ locale }: { locale: AppLocale }) {
  const workspace = useLearningWorkspace()
  const client = workspace?.client
  const root = workspace?.root ?? ''
  const recovery = useMemo(() => root ? new LibraryBackupRecoveryClient(root) : null, [root])
  const api = client ?? recovery
  const active = useRef<object | null>(null)
  const locked = useRef(false)
  const [catalog, setCatalog] = useState<{ root: string; items: BackupCatalogEntry[] }>({ root: '', items: [] })
  const [selected, setSelected] = useState('')
  const [verified, setVerified] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const items = catalog.root === root ? catalog.items : []
  useEffect(() => {
    const visit = {}; active.current = visit; locked.current = false
    setBusy(true); setError(null); setVerified(null); setSelected('')
    if (api) void api.listBackups().then(items => {
      if (active.current !== visit) return
      setCatalog({ root, items }); setSelected(items.find(item => item.descriptor)?.id ?? '')
    }).catch(error => { if (active.current === visit) setError(String(error)) })
      .finally(() => { if (active.current === visit) setBusy(false) })
    else setBusy(false)
    return () => { if (active.current === visit) active.current = null }
  }, [api, root, attempt])
  const perform = async (kind: 'create' | 'verify' | 'restore') => {
    const visit = active.current
    if (!api || !workspace || !visit || locked.current || busy) return
    locked.current = true; setBusy(true); setError(null)
    try {
      if (kind === 'create') {
        if (!client) return
        await workspace.flush()
        if (active.current !== visit) return
        const backup = await client.createBackup()
        trackEvent('memnova_backup_created', { files: backup.fileCount })
        const items = await client.listBackups()
        if (active.current === visit) { setCatalog({ root, items }); setSelected(backup.id); setVerified(null) }
      } else if (kind === 'verify') {
        setVerified(null)
        const backup = await api.verifyBackup(selected)
        if (active.current === visit) setVerified(backup.id)
        trackEvent('memnova_backup_verified', { files: backup.fileCount })
      } else if (verified === selected) {
        const result = await api.restoreBackup(selected)
        if (active.current !== visit) return
        await workspace.openLibrary(result.path)
        trackEvent('memnova_backup_restored')
      }
    } catch (error) { if (active.current === visit) setError(String(error)) }
    finally { if (active.current === visit) { locked.current = false; setBusy(false) } }
  }
  const chosen = items.find(item => item.id === selected)
  return <section className="space-y-4" aria-label={t('learning.backupHistory')}>
    <h3 className="text-sm font-medium">{t('learning.backupHistory')}</h3>
    {busy && <p role="status" className="text-sm text-muted-foreground">{t('learning.loading')}</p>}
    {error && <div role="alert" className="rounded-md border border-destructive p-3 text-sm"><p>{t('learning.error')}</p><pre className="my-2 whitespace-pre-wrap break-words text-xs">{error}</pre><Button variant="outline" disabled={busy} onClick={() => setAttempt(value => value + 1)}>{t('learning.retry')}</Button></div>}
    {!busy && !error && !items.length && <p className="text-sm text-muted-foreground">{t('learning.noBackups')}</p>}
    {!!items.length && <Select value={chosen ? selected : ''} disabled={busy} onValueChange={value => { setSelected(value); setVerified(null); setError(null) }}><SelectTrigger className="w-full max-w-xl" aria-label={t('learning.backupHistory')}><SelectValue /></SelectTrigger><SelectContent>{items.map(item => <SelectItem key={item.id} value={item.id}>{item.descriptor ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(item.descriptor.createdAt) : t('learning.error')} · {item.id.slice(0, 8)}</SelectItem>)}</SelectContent></Select>}
    {chosen?.error && <p role="alert" className="break-words text-sm text-destructive">{chosen.error}</p>}
    {verified === selected && chosen && <p role="status" className="text-sm text-muted-foreground">{t('learning.backupVerified')}</p>}
    <div className="flex flex-wrap gap-2">{client && <Button variant="outline" disabled={busy} onClick={() => { void perform('create') }}>{t('learning.backup')}</Button>}<Button variant="outline" disabled={busy || !chosen?.descriptor} onClick={() => { void perform('verify') }}>{t('learning.verifyBackup')}</Button><Button disabled={busy || !chosen?.descriptor || verified !== selected} onClick={() => { void perform('restore') }}>{t('learning.restoreBackup')}</Button></div>
  </section>
}
