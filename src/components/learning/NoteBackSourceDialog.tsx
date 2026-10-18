import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NoteAutocomplete } from '../NoteAutocomplete'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { createResourceLifetime } from '../editorResourceScope'
import { useLearningWorkspace } from './LearningContext'
import { SourceSelectionPreview } from './SourceSelectionPreview'
import { useSourcePreview } from './useSourcePreview'
import {
  registerSelectedSource,
  SourceRegistrationError,
} from '../../lib/learning/sourceSelection'
import { translate, type AppLocale } from '../../lib/i18n'
import type {
  MemoryBack,
  MemoryFace,
} from '../../lib/learning/noteMemoryConfig'
import type { LearningPage } from '../../lib/learning/types'
import { notePathsMatch } from '../../utils/notePathIdentity'
import './noteMemory.css'

interface BackSourceDialogProps {
  open: boolean
  ownerPath: string
  ownerPageId: string
  locale: AppLocale
  onOpenChange: (open: boolean) => void
  onApplyBack: (back: MemoryBack) => Promise<void>
}
type Choice = { scope: object; path: string; face: MemoryFace | null }
type Registration = {
  scope: object
  path: string
  face: MemoryFace
  page: LearningPage
}
type Action = {
  scope: object
  busy: boolean
  error: string | null
  partial: boolean
}

export function NoteBackSourceDialog(props: BackSourceDialogProps) {
  const { open, ownerPath, ownerPageId, locale, onOpenChange, onApplyBack } =
    props
  const workspace = useLearningWorkspace(),
    client = workspace?.client ?? null,
    root = workspace?.root || client?.vaultPath || ''
  const lifecycle = useMemo(
    () =>
      createResourceLifetime({ client, root, open, ownerPath, ownerPageId }),
    [client, root, open, ownerPath, ownerPageId]
  )
  const [storedChoice, setChoice] = useState<Choice | null>(null),
    choice = storedChoice?.scope === lifecycle ? storedChoice : null
  const [storedRegistration, setRegistration] = useState<Registration | null>(
    null
  )
  const registration =
    storedRegistration?.scope === lifecycle &&
    storedRegistration.path === choice?.path &&
    storedRegistration.face === choice?.face
      ? storedRegistration
      : null
  const [storedAction, setAction] = useState<Action | null>(null),
    action = storedAction?.scope === lifecycle ? storedAction : null
  const [query, setQuery] = useState(''),
    id = useId(),
    faceId = useId(),
    lockedRef = useRef<object | null>(null)
  useLayoutEffect(() => {
    lifecycle.activate()
    lockedRef.current = null
    return lifecycle.deactivate
  }, [lifecycle])
  const preview = useSourcePreview({
    client,
    path: choice?.path ?? null,
    face: choice?.face ?? 'front',
    open,
    ownerPath,
    ownerPageId,
  })
  const entries = (workspace?.entries ?? []).filter(
    (entry) =>
      entry.path.startsWith(`${root}/`) &&
      /\.(md|markdown)$/i.test(entry.path) &&
      !notePathsMatch(entry.path, ownerPath)
  )
  const select = (absolute: string) => {
    if (action?.busy || !entries.some((entry) => entry.path === absolute))
      return
    setChoice({
      scope: lifecycle,
      path: absolute.slice(root.length + 1),
      face: null,
    })
    setQuery('')
    setRegistration(null)
    setAction(null)
  }
  const selectFace = (face: MemoryFace) => {
    if (choice) {
      setChoice({ ...choice, face })
      setRegistration(null)
      setAction(null)
    }
  }
  const apply = async () => {
    if (
      !open ||
      !client ||
      !workspace ||
      !choice?.face ||
      !lifecycle.isActive() ||
      lockedRef.current ||
      (!registration && !preview.preview)
    )
      return
    const token = {}
    lockedRef.current = token
    setAction({
      scope: lifecycle,
      busy: true,
      error: null,
      partial: Boolean(registration || action?.partial),
    })
    let partial = Boolean(registration || action?.partial)
    try {
      await workspace.flush()
      if (!lifecycle.isActive()) return
      let page = registration?.page
      if (!page) {
        page = await registerSelectedSource(
          client,
          preview.preview!,
          lifecycle.isActive
        )
        if (!lifecycle.isActive()) return
        partial = true
        setRegistration({
          scope: lifecycle,
          path: choice.path,
          face: choice.face,
          page,
        })
      }
      await workspace.flush()
      if (!lifecycle.isActive()) return
      await onApplyBack({ kind: 'page', pageId: page.id, face: choice.face })
      if (lifecycle.isActive()) onOpenChange(false)
    } catch (error) {
      if (lifecycle.isActive())
        setAction({
          scope: lifecycle,
          busy: false,
          error: String(error),
          partial:
            partial ||
            (error instanceof SourceRegistrationError &&
              error.registrationAttempted),
        })
    } finally {
      if (lockedRef.current === token) {
        lockedRef.current = null
        if (lifecycle.isActive())
          setAction((previous) =>
            previous?.scope === lifecycle
              ? { ...previous, busy: false }
              : previous
          )
      }
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!lockedRef.current) onOpenChange(value)
      }}
    >
      <DialogContent
        className="note-memory-dialog"
        showCloseButton={false}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {translate(locale, 'learning.noteMemory.chooseSource')}
          </DialogTitle>
          <DialogDescription>
            {translate(locale, 'editor.noteMemory.registrationHelp')}
          </DialogDescription>
        </DialogHeader>
        <div className="note-memory-body">
          <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-medium">
              {translate(locale, 'learning.noteMemory.mnemonicSource')}
            </label>
            <NoteAutocomplete
              inputId={id}
              selectByPath
              entries={entries}
              typeEntryMap={{}}
              value={query}
              onChange={setQuery}
              onSelect={select}
              disabled={Boolean(action?.busy)}
            />
            {choice && (
              <p className="break-all text-xs text-muted-foreground">
                {choice.path}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor={faceId} className="text-sm font-medium">
              {translate(locale, 'editor.noteMemory.sourceFace')}
            </label>
            <Select
              value={choice?.face ?? ''}
              disabled={!choice || Boolean(action?.busy) || preview.busy}
              onValueChange={(value) => selectFace(value as MemoryFace)}
            >
              <SelectTrigger id={faceId} className="w-full">
                <SelectValue
                  placeholder={translate(
                    locale,
                    'editor.noteMemory.sourceFace'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="front">
                  {translate(locale, 'learning.noteMemory.article')}
                </SelectItem>
                <SelectItem
                  value="back"
                  disabled={
                    !preview.preview?.hasBack || preview.preview.backLinked
                  }
                >
                  {translate(locale, 'learning.noteMemory.mnemonic')}
                </SelectItem>
              </SelectContent>
            </Select>
            {preview.preview &&
              (!preview.preview.hasBack || preview.preview.backLinked) && (
                <p className="text-xs text-muted-foreground">
                  {translate(locale, 'editor.noteMemory.backUnavailable')}
                </p>
              )}
          </div>
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
              <Button
                variant="outline"
                disabled={Boolean(action.busy)}
                onClick={preview.reload}
              >
                {translate(locale, 'learning.noteMemory.refreshPreview')}
              </Button>
            </div>
          )}
        </div>
        <div className="note-memory-footer">
          <Button
            variant="outline"
            disabled={Boolean(action?.busy)}
            onClick={() => onOpenChange(false)}
          >
            {translate(locale, 'common.cancel')}
          </Button>
          <Button
            disabled={
              Boolean(action?.busy) ||
              preview.busy ||
              !choice?.face ||
              (!registration && !preview.preview)
            }
            onClick={() => {
              void apply()
            }}
          >
            {translate(
              locale,
              registration && action?.error
                ? 'learning.retry'
                : 'editor.noteMemory.applySource'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
