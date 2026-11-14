import { useContext, useEffect } from 'react'
import { resolveEffectiveLocale, translate } from '../lib/i18n'
import { DocumentRenderContext } from './documentRenderContext'

/** The Markdown codec still owns the snapshot. An unseen drawing cannot be graded. */
export function PreservedWhiteboard({ blockId }: { blockId: string }) {
  const report = useContext(DocumentRenderContext)
  useEffect(() => {
    report?.(blockId, 'error')
    return () => report?.(blockId, 'loading')
  }, [blockId, report])
  const locale = resolveEffectiveLocale(document.documentElement.lang)
  return <p contentEditable={false} className="rounded border px-3 py-2 text-sm text-muted-foreground">
    {translate(locale, 'editor.whiteboard.preserved')}
  </p>
}
