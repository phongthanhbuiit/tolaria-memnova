import { ArrowClockwise, ArrowSquareOut, ArrowUUpLeft, LinkSimple } from '@phosphor-icons/react'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Button } from '../ui/button'
import { createResourceLifetime } from '../editorResourceScope'
import { LearningError } from './LearningError'
import { SourceSelectionPreview } from './SourceSelectionPreview'
import { NoteBackSourceDialog } from './NoteBackSourceDialog'
import { focusLearningDialogTrigger } from './useLearningDialogFocus'
import { useLearningWorkspace } from './LearningContext'
import { translate, type AppLocale } from '../../lib/i18n'
import type { MemoryBack } from '../../lib/learning/noteMemoryConfig'
import type { NoteFacePreview } from '../../lib/learning/types'
import { joinVaultPath, notePathsMatch } from '../../utils/notePathIdentity'
import { canonicalWikilinkTargetForEntry } from '../../utils/wikilink'

interface BackToolbarProps {
  back: MemoryBack
  ownerPath: string
  ownerPageId: string
  locale: AppLocale
  onApplyBack: (back: MemoryBack) => Promise<void>
  onNavigate: (target: string) => void
}
type ToolbarAction = {
  scope: object
  kind: 'open' | 'local'
  busy: boolean
  error: string | null
}
export function NoteBackSourceToolbar(props: BackToolbarProps) {
  const { back, ownerPath, ownerPageId, locale, onApplyBack, onNavigate } =
    props
  const workspace = useLearningWorkspace(),
    client = workspace?.client,
    root = workspace?.root ?? ''
  const lifecycle = useMemo(
    () => createResourceLifetime({ client, root, ownerPath }),
    [client, root, ownerPath]
  )
  const lockedRef = useRef<object | null>(null),
    [open, setOpen] = useState(false)
  const [storedAction, setAction] = useState<ToolbarAction | null>(null),
    action = storedAction?.scope === lifecycle ? storedAction : null
  useLayoutEffect(() => {
    lifecycle.activate()
    lockedRef.current = null
    return lifecycle.deactivate
  }, [lifecycle])
  const target =
    back.kind === 'page'
      ? workspace?.pages?.find((page) => page.id === back.pageId)
      : null
  const perform = async (kind: 'open' | 'local') => {
    if (!workspace || lockedRef.current || !lifecycle.isActive()) return
    const token = {}
    lockedRef.current = token
    setAction({ scope: lifecycle, kind, busy: true, error: null })
    try {
      await workspace.flush()
      if (!lifecycle.isActive()) return
      if (kind === 'local') await onApplyBack({ kind: 'inline' })
      else {
        if (!target?.available) throw Error('missing-source')
        const entry = workspace.entries?.find((entry) =>
          notePathsMatch(entry.path, joinVaultPath(root, target.path))
        )
        if (!entry) throw Error('missing-source-entry')
        const owner = workspace.entries?.find((entry) =>
          notePathsMatch(entry.path, ownerPath)
        )
        onNavigate(canonicalWikilinkTargetForEntry(entry, root, owner))
      }
    } catch (error) {
      if (lifecycle.isActive())
        setAction({ scope: lifecycle, kind, busy: false, error: String(error) })
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
  if (workspace?.phase !== 'ready')
    return (
      <div className="note-memory-toolbar px-4 py-2 text-sm">
        {workspace?.phase === 'error' ? (
          <p role="alert">{translate(locale, 'learning.error')}</p>
        ) : (
          <Button
            variant="outline"
            disabled={workspace?.phase === 'loading' || !client}
            onClick={() => {
              void workspace?.openMigration()
            }}
          >
            {translate(locale, 'learning.prepare')}
          </Button>
        )}
      </div>
    )
  return (
    <div className="note-memory-toolbar border-b border-border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 break-words text-xs text-muted-foreground">
          {back.kind === 'inline'
            ? translate(locale, 'editor.noteMemory.localMnemonic')
            : (target?.title ??
              translate(locale, 'learning.noteMemory.mnemonicSource'))}
          {back.kind === 'page' && (
            <>
              {' '}
              ·{' '}
              {translate(
                locale,
                back.face === 'front'
                  ? 'learning.noteMemory.article'
                  : 'learning.noteMemory.mnemonic'
              )}
            </>
          )}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={Boolean(action?.busy)}
          onClickCapture={focusLearningDialogTrigger}
          onClick={() => setOpen(true)}
        >
          <LinkSimple aria-hidden="true" />
          {translate(locale, 'learning.noteMemory.chooseSource')}
        </Button>
        {back.kind === 'page' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={
                Boolean(action?.busy) ||
                !target?.available ||
                back.pageId === ownerPageId
              }
              onClick={() => {
                void perform('open')
              }}
            >
              <ArrowSquareOut aria-hidden="true" />
              {translate(locale, 'editor.noteMemory.openSource')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={Boolean(action?.busy)}
              onClick={() => {
                void perform('local')
              }}
            >
              <ArrowUUpLeft aria-hidden="true" />
              {translate(locale, 'editor.noteMemory.useLocal')}
            </Button>
          </>
        )}
      </div>
      {action?.busy && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {translate(locale, 'learning.loading')}
        </p>
      )}
      {action?.error && <LearningError error={action.error} locale={locale}><Button variant="outline" size="sm" onClick={() => { void perform(action.kind) }}><ArrowClockwise aria-hidden="true" />{translate(locale, 'learning.retry')}</Button></LearningError>}
      <NoteBackSourceDialog
        open={open}
        ownerPath={ownerPath}
        ownerPageId={ownerPageId}
        locale={locale}
        onOpenChange={setOpen}
        onApplyBack={onApplyBack}
      />
    </div>
  )
}

interface LinkedPreviewProps {
  back: Extract<MemoryBack, { kind: 'page' }>
  ownerPageId?: string | null
  locale: AppLocale
  style?: CSSProperties
}
export function LinkedNoteBackPreview(props: LinkedPreviewProps) {
  const { back, ownerPageId, locale, style } = props
  const workspace = useLearningWorkspace(),
    client = workspace?.phase === 'ready' ? workspace.client : null,
    root = workspace?.root ?? '',
    clock = workspace?.clock
  const [attempt, setAttempt] = useState(0),
    { pageId, face } = back
  const scope = useMemo(
    () => ({ client, root, pageId, face, ownerPageId, clock, attempt }),
    [client, root, pageId, face, ownerPageId, clock, attempt]
  )
  const [stored, setRead] = useState<{
      scope: object
      preview: NoteFacePreview | null
      error: string | null
    } | null>(null),
    current = stored?.scope === scope ? stored : null
  useEffect(() => {
    if (!client) return
    let active = true
    const load = async () => {
      try {
        if (!ownerPageId || pageId === ownerPageId)
          throw Error('self-or-missing-owner-source')
        if (!notePathsMatch(client.vaultPath, root))
          throw Error('library-identity-changed')
        const preview = await client.readNoteFace(pageId, face)
        if (preview.pageId !== pageId || preview.face !== face)
          throw Error('invalid-source-preview')
        if (active) setRead({ scope, preview, error: null })
      } catch (error) {
        if (active) setRead({ scope, preview: null, error: String(error) })
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [client, root, pageId, face, ownerPageId, scope])
  return (
    <div className="min-h-0 flex-1 overflow-y-auto" style={style}>
      <div className="editor-content-wrapper p-4">
        <SourceSelectionPreview
          preview={current?.preview ?? null}
          root={root}
          locale={locale}
          busy={Boolean(client && !current)}
          error={
            !client
              ? (workspace?.error ?? 'learning-source-unavailable')
              : current?.error
          }
          onRetry={() => setAttempt((value) => value + 1)}
        />
      </div>
    </div>
  )
}
