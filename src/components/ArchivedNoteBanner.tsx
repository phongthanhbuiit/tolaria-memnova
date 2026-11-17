import { Button } from '@/components/ui/button'
import { Archive, ArrowUUpLeft } from '@phosphor-icons/react'
import { translate, type AppLocale } from '../lib/i18n'

interface ArchivedNoteBannerProps {
  onUnarchive: () => void
  locale?: AppLocale
}

export function ArchivedNoteBanner({ onUnarchive, locale = 'en' }: ArchivedNoteBannerProps) {
  return (
    <div
      data-testid="archived-note-banner"
      className="text-small"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 16px',
        background: 'var(--muted)',
        borderBottom: '1px solid var(--border)',
        color: 'var(--muted-foreground)',
        flexShrink: 0,
      }}
    >
      <Archive size={13} weight="bold" />
      <span>{translate(locale, 'editor.banner.archived')}</span>
      <Button variant="outline" size="sm" type="button"
        data-testid="unarchive-btn"
        onClick={onUnarchive}
        className="ml-auto"
        title={translate(locale, 'editor.banner.unarchive')}
      >
        <ArrowUUpLeft size={12} />
        {translate(locale, 'editor.banner.unarchive')}
      </Button>
    </div>
  )
}
