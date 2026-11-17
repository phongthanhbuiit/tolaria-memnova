import { Button } from '@/components/ui/button'
import { translate } from '../lib/i18n'
import { useAppLocale } from '../hooks/useAppPreferences'
import { useCallback, useEffect } from 'react'
import { NoteTitleIcon } from './NoteTitleIcon'
import { focusNoteIconPropertyEditor } from './noteIconPropertyEvents'
import { resolveNoteIcon } from '../utils/noteIcon'

interface NoteIconProps {
  icon: string | null
  editable?: boolean
}

export function NoteIcon({ icon, editable = true }: NoteIconProps) {
  const locale = useAppLocale()
  const hasIcon = resolveNoteIcon(icon).kind !== 'none'

  // Listen for command palette "Set Note Icon" event
  useEffect(() => {
    if (!editable) return
    const handler = () => focusNoteIconPropertyEditor()
    window.addEventListener('laputa:open-icon-picker', handler)
    return () => window.removeEventListener('laputa:open-icon-picker', handler)
  }, [editable])

  const handleActivate = useCallback(() => {
    if (!editable) return
    focusNoteIconPropertyEditor()
  }, [editable])

  return (
    <div className="note-icon-area" data-testid="note-icon-area" style={{ position: 'relative' }}>
      {hasIcon ? (
        <Button variant="bare" type="button"
          className="note-icon-button note-icon-button--active"
          onClick={handleActivate}
          data-testid="note-icon-display"
          title={translate(locale, 'a11y.editIcon')}
          aria-label={translate(locale, 'a11y.editIcon')}
          disabled={!editable}
        >
          <NoteTitleIcon icon={icon} size={26} />
        </Button>
      ) : (
        editable && (
          <Button variant="bare" type="button"
            className="note-icon-button note-icon-button--add"
            onClick={handleActivate}
            data-testid="note-icon-add"
            title={translate(locale, 'a11y.addIcon')}
            aria-label={translate(locale, 'a11y.addIcon')}
          >
            <span className="note-icon-button__plus">+</span>
            <span className="note-icon-button__label">{translate(locale, 'a11y.addIcon')}</span>
          </Button>
        )
      )}
    </div>
  )
}
