import { CardEditorSection } from './CardEditorSection'
import { CircleNotch, ImageSquare, MusicNotes } from '@phosphor-icons/react'
import { cardEditorStyles } from './cardEditorStyles'
import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { trackEvent } from '../../lib/telemetry'
import { isTauri } from '../../mock-tauri'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { MediaPreview } from './MediaPreview'
import { learningMediaUrl } from '../../lib/learning/media'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningProperty } from '../../lib/learning/types'
type Props = {
  root: string
  ownerPath?: string
  properties: Record<string, LearningProperty>
  visibleKeys: readonly string[]
  locale: AppLocale
  disabled: boolean
  onChange: (key: string, value: LearningProperty) => void
  onBusyChange?: (busy: boolean) => void
}
export function CardMediaFields(props: Props) {
  const {
    root,
    ownerPath,
    properties,
    visibleKeys,
    locale,
    disabled,
    onChange,
    onBusyChange,
  } = props
  const [expanded, setExpanded] = useState(() =>
      visibleKeys.some(
        (key) =>
          typeof properties[key] === 'string' &&
          properties[key].trim().length > 0,
      ),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null)
  const active = useRef<object | null>(null),
    locked = useRef(false),
    busyCallback = useRef(onBusyChange)
  useEffect(() => {
    busyCallback.current = onBusyChange
  }, [onBusyChange])
  useEffect(() => {
    const visit = {}
    active.current = visit
    locked.current = false
    setBusy(false)
    setError(null)
    return () => {
      if (active.current === visit) {
        active.current = null
        busyCallback.current?.(false)
      }
    }
  }, [root])
  const choose = async (kind: 'audio' | 'image') => {
    const visit = active.current
    if (!visit || disabled || locked.current || !isTauri()) return
    locked.current = true
    setBusy(true)
    busyCallback.current?.(true)
    setError(null)
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        multiple: false,
        title: translate(
          locale,
          kind === 'image'
            ? 'properties.chooseImage'
            : 'properties.chooseAudio',
        ),
        filters: [
          {
            name: translate(locale, `learning.${kind}`),
            extensions:
              kind === 'image'
                ? ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp']
                : ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'webm'],
          },
        ],
      })
      if (typeof selected !== 'string' || active.current !== visit) return
      const imported = await invoke<string>(
        kind === 'image' ? 'copy_image_to_vault' : 'copy_audio_to_vault',
        { vaultPath: root, sourcePath: selected },
      )
      if (active.current !== visit) return
      const filename = imported.split(/[\\/]/).pop() ?? ''
      onChange(kind, kind === 'image' ? `attachments/${filename}` : filename)
      trackEvent('memnova_card_media_selected', { kind })
    } catch (error) {
      if (active.current === visit) setError(String(error))
    } finally {
      if (active.current === visit) {
        locked.current = false
        setBusy(false)
        busyCallback.current?.(false)
      }
    }
  }
  return (
    <CardEditorSection
      title={translate(locale, 'properties.media')}
      open={expanded}
      onOpenChange={setExpanded}
      disabled={busy}
    >
      <div aria-busy={busy} className="space-y-4">
        {busy && (
          <p role="status" className="flex items-center gap-2">
            <CircleNotch
              className={`${cardEditorStyles.icon} animate-spin`}
              aria-hidden="true"
            />
            {translate(locale, 'learning.loading')}
          </p>
        )}
        {(['image', 'audio'] as const)
          .filter((kind) => visibleKeys.includes(kind))
          .map((kind) => (
            <div key={kind} className="space-y-2">
              <label className="grid gap-2 text-sm">
                {translate(locale, `learning.${kind}`)}
                <Input
                  value={
                    typeof properties[kind] === 'string' ? properties[kind] : ''
                  }
                  autoComplete="off"
                  spellCheck={false}
                  disabled={disabled || busy}
                  onChange={(event) => onChange(kind, event.target.value)}
                />
              </label>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || busy || !isTauri()}
                title={
                  !isTauri()
                    ? translate(locale, 'properties.nativePicker')
                    : undefined
                }
                onClick={() => void choose(kind)}
              >
                {kind === 'image' ? (
                  <ImageSquare
                    className={cardEditorStyles.icon}
                    aria-hidden="true"
                  />
                ) : (
                  <MusicNotes
                    className={cardEditorStyles.icon}
                    aria-hidden="true"
                  />
                )}
                {translate(
                  locale,
                  kind === 'image'
                    ? 'properties.chooseImage'
                    : 'properties.chooseAudio',
                )}
              </Button>
              <MediaPreview
                src={learningMediaUrl(properties[kind], root, ownerPath)}
                kind={kind}
                locale={locale}
              />
            </div>
          ))}
        {error && (
          <pre
            role="alert"
            className="whitespace-pre-wrap break-words text-xs text-destructive"
          >
            {error}
          </pre>
        )}
      </div>
    </CardEditorSection>
  )
}
