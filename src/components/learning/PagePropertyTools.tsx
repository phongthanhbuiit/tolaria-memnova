import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { PagePropertyEditor } from './PagePropertyEditor'
import { useLearningWorkspace } from './LearningContext'
import { pagePropertySnapshot } from '../../lib/learning/pagePropertySnapshot'
import type { ParsedFrontmatter } from '../../utils/frontmatter'
import type { FrontmatterValue } from '../Inspector'
import { translate, type AppLocale } from '../../lib/i18n'

type Options = { silent?: boolean }
export function PagePropertyTools({
  path,
  content,
  frontmatter,
  locale,
  onUpdate,
  onRemove,
}: {
  path: string
  content: string | null
  frontmatter: ParsedFrontmatter
  locale: AppLocale
  onUpdate?: (
    key: string,
    value: FrontmatterValue,
    options?: Options,
  ) => unknown
  onRemove?: (key: string, options?: Options) => unknown
}) {
  const workspace = useLearningWorkspace()
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null)
  const visit = useRef<object | null>(null)
  useEffect(() => {
    const token = {}
    visit.current = token
    setOpen(false)
    setBusy(false)
    setError(null)
    return () => {
      if (visit.current === token) visit.current = null
    }
  }, [path, workspace?.client])
  const ready = workspace?.phase === 'ready' && !!workspace.client
  const show = async () => {
    const token = visit.current
    if (!workspace || !ready || busy || !token) return
    setBusy(true)
    setError(null)
    try {
      await workspace.flush()
      if (visit.current === token) setOpen(true)
    } catch (error) {
      if (visit.current === token) setError(String(error))
    } finally {
      if (visit.current === token) setBusy(false)
    }
  }
  return (
    <div className="space-y-2 px-3 py-3">
      <Button
        variant="outline"
        size="sm"
        className="w-full whitespace-normal"
        disabled={!ready || busy || !onUpdate || !onRemove}
        onClick={() => void show()}
      >
        {translate(locale, 'properties.page')}
      </Button>
      {!ready && (
        <p className="text-xs text-muted-foreground">
          {translate(locale, 'properties.readyHelp')}
        </p>
      )}
      {error && (
        <p role="alert" className="break-words text-xs text-destructive">
          {error}
        </p>
      )}
      {open && onUpdate && onRemove && (
        <PagePropertyEditor
          key={`${workspace?.client?.libraryId}:${path}`}
          path={path}
          values={pagePropertySnapshot(frontmatter, content)}
          excludedKeys={[
            'type',
            'is_a',
            'is a',
            'workspace',
            'aliases',
            'title',
            'archived',
            'archived_at',
          ]}
          locale={locale}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
