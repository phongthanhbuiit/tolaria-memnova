import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { translate, type AppLocale, type TranslationKey } from '../lib/i18n'
import { EXCERPT_CAPTURE_EVENT, excerptSourceUrl, type ExcerptCapture, type ExcerptSelection } from '../lib/excerptCapture'
import type { VaultEntry } from '../types'

type SaveCapture = (capture: ExcerptCapture, isCurrent: () => boolean) => Promise<VaultEntry>
interface CaptureDraft {
  id: string
  entry?: VaultEntry
  selection?: ExcerptSelection
}
interface CaptureProps {
  active: VaultEntry | null
  vaultPath: string
  locale: AppLocale
  onSave: SaveCapture
  onSaved: (entry: VaultEntry) => void
}

export function ExcerptCaptureDialog({ active, vaultPath, locale, onSave, onSaved }: CaptureProps) {
  const [draft, setDraft] = useState<CaptureDraft | null>(null)
  useEffect(() => {
    function open(event: Event) {
      const selection = (event as CustomEvent<ExcerptSelection | undefined>).detail
      if (!vaultPath || (selection && (!active || active.path !== selection.path || !selection.isCurrent()))) return
      setDraft(current => current ?? {
        id: crypto.randomUUID(), selection, entry: selection && active ? active : undefined,
      })
    }
    window.addEventListener(EXCERPT_CAPTURE_EVENT, open)
    return () => window.removeEventListener(EXCERPT_CAPTURE_EVENT, open)
  }, [active, vaultPath])

  return draft && (
    <ExcerptForm draft={draft} vaultPath={vaultPath} locale={locale}
      onSave={onSave} onSaved={onSaved} onClose={() => setDraft(null)} />
  )
}

type FieldError = 'capture.invalidText' | 'capture.invalidUrl' | 'capture.failed'
function ExcerptForm({ draft, vaultPath, locale, onSave, onSaved, onClose }: Omit<CaptureProps, 'active'> & {
  draft: CaptureDraft
  onClose: () => void
}) {
  const [text, setText] = useState(draft.selection?.text ?? '')
  const [sourceUrl, setSourceUrl] = useState('')
  const [error, setError] = useState<FieldError | null>(null)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const mounted = useRef(false)
  useLayoutEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const textRef = useRef<HTMLTextAreaElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const formId = useId()
  const errorId = `${formId}-error`
  const t = (key: TranslationKey) => translate(locale, key)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    if (!text.trim()) {
      setError('capture.invalidText')
      textRef.current?.focus()
      return
    }
    const url = excerptSourceUrl(sourceUrl)
    if (!draft.entry && !url) {
      setError('capture.invalidUrl')
      urlRef.current?.focus()
      return
    }
    if (draft.selection && !draft.selection.isCurrent()) {
      setError('capture.failed')
      return
    }
    const source = draft.entry ? { kind: 'note' as const, entry: draft.entry } : { kind: 'web' as const, url: url! }
    saving.current = true
    setBusy(true)
    setError(null)
    try {
      const created = await onSave({ id: draft.id, text, source, vaultPath }, () => mounted.current)
      if (mounted.current) {
        onSaved(created)
        onClose()
      }
    } catch {
      if (mounted.current) {
        setError('capture.failed')
        setBusy(false)
      }
    } finally {
      saving.current = false
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !saving.current) onClose() }}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={event => {
        if (draft.selection?.isCurrent()) {
          event.preventDefault()
          draft.selection.restoreFocus()
        }
      }}>
        <DialogHeader>
          <DialogTitle>{t('capture.action')}</DialogTitle>
          <DialogDescription>{t('capture.description')}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="grid gap-4" aria-busy={busy}>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-text`}>{t('capture.excerpt')}</Label>
            <Textarea id={`${formId}-text`} ref={textRef} name="excerpt" required readOnly={busy}
              aria-invalid={error === 'capture.invalidText' || undefined}
              aria-describedby={error === 'capture.invalidText' ? errorId : undefined}
              value={text} onChange={event => {
                setText(event.target.value)
                if (error === 'capture.invalidText' && event.target.value.trim()) setError(null)
              }} />
          </div>
          {draft.entry ? <p className="break-words text-sm text-muted-foreground">{translate(locale, 'capture.noteSource', { title: draft.entry.title })}</p> :
            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-url`}>{t('capture.url')}</Label>
              <Input id={`${formId}-url`} ref={urlRef} name="url" type="url" autoCapitalize="none" spellCheck={false} autoComplete="url" required readOnly={busy}
                aria-invalid={error === 'capture.invalidUrl' || undefined}
                aria-describedby={error === 'capture.invalidUrl' ? errorId : undefined}
                value={sourceUrl} onChange={event => {
                  setSourceUrl(event.target.value)
                  if (error === 'capture.invalidUrl' && excerptSourceUrl(event.target.value)) setError(null)
                }} />
            </div>}
          {error && <p id={errorId} role="alert" className="text-sm text-destructive">{t(error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={busy}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
