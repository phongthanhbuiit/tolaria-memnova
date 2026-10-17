import { useState } from 'react'
import { translate, type AppLocale } from '../../lib/i18n'
export function MediaPreview({
  src,
  kind,
  locale,
}: {
  src: string | null
  kind: 'image' | 'audio'
  locale: AppLocale
}) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!src) return null
  if (failed === src)
    return (
      <p
        role="alert"
        className="rounded border border-destructive p-3 text-sm text-destructive"
      >
        {translate(locale, 'properties.mediaUnavailable')}
      </p>
    )
  return kind === 'image' ? (
    <img
      src={src}
      alt={translate(locale, 'learning.image')}
      className="max-h-64 max-w-full rounded-lg object-contain"
      onError={() => setFailed(src)}
    />
  ) : (
    <audio
      src={src}
      aria-label={translate(locale, 'learning.audio')}
      className="max-w-full"
      controls
      preload="metadata"
      onError={() => setFailed(src)}
    />
  )
}
