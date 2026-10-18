import type { KeyboardEvent, SyntheticEvent } from 'react'
import { BlockNoteReadOnly } from '../BlockNoteReadOnly'
import { Button } from '../ui/button'
import { translate, type AppLocale } from '../../lib/i18n'
import type { NoteFacePreview } from '../../lib/learning/types'

function stopNavigation(event: SyntheticEvent<HTMLElement>) {
  if (
    event.target instanceof Element &&
    event.target.closest('a,.wikilink,[data-wikilink]')
  ) {
    event.preventDefault()
    event.stopPropagation()
  }
}
export function SourceSelectionPreview(props: {
  preview: Pick<
    NoteFacePreview,
    'path' | 'face' | 'content' | 'fingerprint' | 'media'
  > | null
  root: string
  locale: AppLocale
  busy?: boolean
  error?: string | null
  onRetry: () => void
}) {
  const { preview, root, locale, busy, error, onRetry } = props
  const stopLinkKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') stopNavigation(event)
  }
  return (
    <section
      className="min-w-0 space-y-3"
      aria-label={translate(locale, 'editor.noteMemory.sourceReadOnly')}
      onClickCapture={stopNavigation}
      onKeyDownCapture={stopLinkKey}
    >
      {busy && <p role="status">{translate(locale, 'learning.loading')}</p>}
      {error && (
        <div role="alert">
          <p>{translate(locale, 'learning.error')}</p>
          <pre className="my-2 whitespace-pre-wrap break-words text-xs">
            {error}
          </pre>
          <Button variant="outline" onClick={onRetry}>
            {translate(locale, 'learning.noteMemory.refreshPreview')}
          </Button>
        </div>
      )}
      {preview && (
        <>
          <p className="text-xs text-muted-foreground">
            {translate(
              locale,
              preview.face === 'front'
                ? 'learning.noteMemory.article'
                : 'learning.noteMemory.mnemonic'
            )}{' '}
            · {translate(locale, 'editor.noteMemory.sourceReadOnly')}
          </p>
          <BlockNoteReadOnly
            key={`${root}:${preview.path}:${preview.face}:${preview.fingerprint}`}
            content={preview.content}
            preserveBody
            vaultPath={root}
            notePath={`${root}/${preview.path}`}
            locale={locale}
          />
        </>
      )}
    </section>
  )
}
