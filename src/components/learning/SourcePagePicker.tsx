import { useEffect, useId, useRef, useState } from 'react'
import { NoteAutocomplete } from '../NoteAutocomplete'
import { SourcePagePreview } from './SourcePagePreview'
import { SourceSelectionPreview } from './SourceSelectionPreview'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningPage } from '../../lib/learning/types'
import type { LearningClient } from '../../lib/learning/client'
import type { VaultEntry } from '../../types'
import {
  registerSelectedSource,
  SourceRegistrationError,
} from '../../lib/learning/sourceSelection'
import { useLearningWorkspace } from './LearningContext'
import { useSourcePreview } from './useSourcePreview'
import './noteMemory.css'

interface PickerProps {
  value: string | null
  locale: AppLocale
  disabled: boolean
  onChange: (page: LearningPage) => void
  onBusyChange?: (busy: boolean) => void
  label?: string
}
type PendingSource = {
  client: LearningClient
  entry: VaultEntry
  registered?: LearningPage
}
type SourceAction = {
  client: LearningClient
  busy: boolean
  error: string | null
  partial: boolean
}

export function SourcePagePicker(props: PickerProps) {
  const { value, locale, disabled, onChange, onBusyChange, label } = props
  const workspace = useLearningWorkspace(),
    client = workspace?.client ?? null,
    root = workspace?.root || client?.vaultPath || ''
  const id = useId(),
    [query, setQuery] = useState('')
  const [stored, setPending] = useState<PendingSource | null>(null),
    pending = stored?.client === client ? stored : null
  const [choice, setChoice] = useState<{
    client: LearningClient
    page: LearningPage
  } | null>(null)
  const [storedAction, setAction] = useState<SourceAction | null>(null),
    action = storedAction?.client === client ? storedAction : null
  const active = useRef<object | null>(null),
    locked = useRef<object | null>(null),
    busyCallbackRef = useRef(onBusyChange)
  const candidatePath = pending?.entry.path.slice(root.length + 1) ?? null
  const preview = useSourcePreview({
    client,
    path: candidatePath,
    face: 'front',
    open: Boolean(pending),
  })
  const busy = Boolean(action?.busy || preview.busy)
  useEffect(() => {
    busyCallbackRef.current = onBusyChange
  }, [onBusyChange])
  useEffect(() => {
    busyCallbackRef.current?.(busy)
  }, [busy])
  useEffect(() => {
    const visit = {}
    active.current = visit
    locked.current = null
    setQuery('')
    setPending(null)
    setAction(null)
    return () => {
      if (active.current === visit) {
        active.current = null
        busyCallbackRef.current?.(false)
      }
    }
  }, [client, root])
  const entries = (workspace?.entries ?? []).filter(
    (entry) =>
      entry.path.startsWith(`${root}/`) && /\.(md|markdown)$/i.test(entry.path)
  )
  const selected =
    workspace?.pages.find((page) => page.id === value) ??
    (choice?.client === client && choice.page.id === value ? choice.page : null)
  const choose = (path: string) => {
    const entry = entries.find((entry) => entry.path === path)
    if (!client || !entry || disabled || locked.current) return
    setQuery('')
    setPending({ client, entry })
    setAction(null)
  }
  const apply = async () => {
    const visit = active.current
    if (
      !workspace ||
      !client ||
      !visit ||
      !pending ||
      disabled ||
      locked.current ||
      (!pending.registered && !preview.preview)
    )
      return
    locked.current = visit
    setAction({
      client,
      busy: true,
      error: null,
      partial: Boolean(pending.registered),
    })
    let partial = Boolean(pending.registered)
    try {
      await workspace.flush()
      if (active.current !== visit) return
      if (!pending.registered) {
        const page = await registerSelectedSource(
          client,
          preview.preview!,
          () => active.current === visit
        )
        if (active.current !== visit) return
        partial = true
        setPending({ ...pending, registered: page })
        setChoice({ client, page })
        onChange(page)
      }
      await workspace.refresh()
      if (active.current === visit) {
        setPending(null)
        setAction(null)
      }
    } catch (error) {
      if (active.current === visit)
        setAction({
          client,
          busy: false,
          error: String(error),
          partial:
            partial ||
            (error instanceof SourceRegistrationError &&
              error.registrationAttempted),
        })
    } finally {
      if (locked.current === visit) {
        locked.current = null
        if (active.current === visit)
          setAction((previous) =>
            previous?.client === client
              ? { ...previous, busy: false }
              : previous
          )
      }
    }
  }
  return (
    <div className="space-y-2 text-sm">
      <label htmlFor={id} className="font-medium">
        {label ?? translate(locale, 'learning.sourcePage')}
      </label>
      <NoteAutocomplete
        inputId={id}
        selectByPath
        entries={entries}
        typeEntryMap={{}}
        value={query}
        onChange={setQuery}
        onSelect={choose}
        disabled={disabled || busy}
      />
      {selected && (
        <SourcePagePreview
          pageId={selected.id}
          title={selected.title}
          locale={locale}
          disabled={disabled || busy}
        />
      )}
      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !locked.current) {
            setPending(null)
            setAction(null)
          }
        }}
      >
        <DialogContent
          className="note-memory-dialog"
          showCloseButton={!action?.busy}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>
              {pending?.entry.title ??
                translate(locale, 'learning.noteMemory.chooseSource')}
            </DialogTitle>
            <DialogDescription>
              {translate(locale, 'editor.noteMemory.registrationHelp')}
            </DialogDescription>
            <p className="note-memory-caption break-all">{candidatePath}</p>
          </DialogHeader>
          <div className="note-memory-body">
            <SourceSelectionPreview
              preview={preview.preview}
              root={root}
              locale={locale}
              busy={preview.busy}
              error={preview.error}
              onRetry={preview.reload}
            />
            {action?.error && (
              <div role="alert">
                <p>{translate(locale, 'learning.error')}</p>
                <pre className="my-2 whitespace-pre-wrap break-words text-xs">
                  {action.error}
                </pre>
                {action.partial && (
                  <p>
                    {translate(locale, 'editor.noteMemory.registrationPartial')}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="note-memory-footer">
            <Button
              variant="outline"
              disabled={Boolean(action?.busy)}
              onClick={() => {
                setPending(null)
                setAction(null)
              }}
            >
              {translate(locale, 'common.cancel')}
            </Button>
            <Button
              disabled={
                disabled || busy || (!pending?.registered && !preview.preview)
              }
              onClick={() => {
                void apply()
              }}
            >
              {translate(
                locale,
                pending?.registered
                  ? 'learning.noteMemory.retryRefresh'
                  : 'editor.noteMemory.applySource'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
