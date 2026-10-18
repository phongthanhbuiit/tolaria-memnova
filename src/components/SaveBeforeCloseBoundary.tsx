import { type ReactNode } from 'react'
import { useNativeNoteClose } from '../hooks/useNativeNoteClose'
import { createTranslator, resolveEffectiveLocale } from '../lib/i18n'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

export function SaveBeforeCloseBoundary({ children }: { children: ReactNode }) {
  const { status, dismiss, retry } = useNativeNoteClose()
  const t = createTranslator(resolveEffectiveLocale(document.documentElement.lang))
  const saving = status.kind === 'saving'
  return <>
    {children}
    <Dialog open={status.kind !== 'idle'} onOpenChange={open => { if (!open && !saving) dismiss() }}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={e => { if (saving) e.preventDefault() }}
        onPointerDownOutside={e => e.preventDefault()} onKeyDown={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-base">{t(saving ? 'save.close.saving' : 'save.close.failed')}</DialogTitle>
          <DialogDescription>{t(saving ? 'save.close.wait' : 'save.close.retained')}</DialogDescription>
        </DialogHeader>
        {!saving && <DialogFooter>
          <Button variant="outline" onClick={dismiss}>{t('common.cancel')}</Button>
          <Button onClick={() => { void retry() }}>{t('learning.retry')}</Button>
        </DialogFooter>}
      </DialogContent>
    </Dialog>
  </>
}
