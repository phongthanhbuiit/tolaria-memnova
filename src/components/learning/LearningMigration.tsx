import { useState } from 'react'
import { trackEvent } from '../../lib/telemetry'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { translate, type AppLocale } from '../../lib/i18n'
import { useLearningWorkspace } from './LearningContext'
export function LearningMigration({ locale, onRestore }: { locale: AppLocale; onRestore: (path: string) => Promise<unknown> }) {
  const workspace = useLearningWorkspace()
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  if (!workspace) return null
  const { preview, progress, busy } = workspace
  const restore = async () => {
    if (!workspace.client || !progress?.backupId) return
    setRestoring(true)
    try { const backup = await workspace.client.restoreBackup(progress.backupId); await onRestore(backup.path); trackEvent('memnova_backup_restored'); workspace.setMigrationOpen(false) }
    catch (error) { setRestoreError(String(error)) }
    finally { setRestoring(false) }
  }
  return <Dialog open={workspace.migrationOpen} onOpenChange={open => { if (!busy && !restoring) workspace.setMigrationOpen(open) }}><DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{translate(locale, 'learning.prepare')}</DialogTitle><DialogDescription>{translate(locale, 'learning.prepareHelp')}</DialogDescription></DialogHeader>
    {preview && <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4"><span>{translate(locale, 'decks.cards_count', { n: preview.cardCount })}</span><span>{translate(locale, 'home.daily_goal_reviews', { n: preview.reviewCount })}</span></div>}
    {progress?.state === 'migrating' && <p role="status">{progress.importedPages}/{progress.totalPages}</p>}
    {preview?.issues.map((issue, index) => <div key={index} className="rounded border p-3 text-xs"><p className="font-semibold">{issue.path}</p><p>{issue.code}: {issue.detail}</p></div>)}
    {(workspace.error || restoreError) && <pre role="alert" className="whitespace-pre-wrap break-words rounded border border-destructive p-3 text-xs">{workspace.error || restoreError}</pre>}
    <div className="flex flex-wrap justify-end gap-2">{!workspace.client && <Button variant="outline" disabled={busy || restoring} onClick={() => { void workspace.reconnect() }}>{translate(locale, 'learning.retry')}</Button>}<Button variant="outline" disabled={busy || restoring} onClick={() => workspace.setMigrationOpen(false)}>{translate(locale, 'common.cancel')}</Button>{progress?.backupId && <Button variant="outline" disabled={busy || restoring} onClick={() => { void restore() }}>{translate(locale, 'learning.restoreBackup')}</Button>}<Button disabled={!workspace.client || busy || restoring || (!preview && workspace.phase !== 'migrating') || !!preview?.issues.some(issue => issue.severity === 'error')} onClick={() => { void workspace.migrate(workspace.flush) }}>{translate(locale, busy ? 'learning.saving' : workspace.phase === 'migrating' ? 'learning.resume' : 'learning.import')}</Button></div>
  </DialogContent></Dialog>
}
