import { useContext } from 'react'
import { translate, type AppLocale } from '../lib/i18n'
import { DrawingSourceContext } from './drawingSourceContext'
import { Button } from './ui/button'

export function DrawingSourceButton({ locale, openSource }: { locale: AppLocale; openSource: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" className="self-start" onClick={openSource}>
      {translate(locale, 'editor.unsupportedDrawing.source')}
    </Button>
  )
}

export function DrawingNotice() {
  const context = useContext(DrawingSourceContext)
  const locale = context?.locale ?? 'en'
  return (
    <div role="note" className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3 text-body text-text-secondary">
      <span>{translate(locale, 'learning.legacyDrawingUnavailable')}</span>
      {context && <DrawingSourceButton locale={locale} openSource={context.openSource} />}
    </div>
  )
}
