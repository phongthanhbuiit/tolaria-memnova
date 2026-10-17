import { Eye } from '@phosphor-icons/react'
import { cardEditorStyles } from './cardEditorStyles'
import { useEffect, useState, useRef } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { BlockNoteReadOnly } from '../FlashcardStudyView'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningClient } from '../../lib/learning/client'
import type { StudyPage } from '../../lib/learning/types'
import { trackEvent } from '../../lib/telemetry'
import { useLearningWorkspace } from './LearningContext'

type Read = {
  client: LearningClient
  id: string
  page: StudyPage | null
  error: string | null
}
export function SourcePagePreview({
  pageId,
  title,
  locale,
  disabled = false,
}: {
  pageId: string
  title: string
  locale: AppLocale
  disabled?: boolean
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const workspace = useLearningWorkspace()
  const client = workspace?.client
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState<Read | null>(null)
  const [attempt, setAttempt] = useState(0)
  const current =
    read && read.client === client && read.id === pageId ? read : null
  useEffect(() => {
    if (!open || !client) return
    let cancelled = false
    client
      .readStudyPage(pageId)
      .then((page) => {
        if (!cancelled) setRead({ client, id: pageId, page, error: null })
      })
      .catch((error) => {
        if (!cancelled)
          setRead({ client, id: pageId, page: null, error: String(error) })
      })
    return () => {
      cancelled = true
    }
  }, [client, pageId, open, attempt])
  return (
    <>
      <div
        className={`${cardEditorStyles.root} flex min-w-0 flex-wrap items-center justify-between gap-2`}
      >
        <span className="min-w-0 flex-1 break-words font-medium">{title}</span>
        <Button
          ref={trigger}
          variant="ghost"
          aria-label={`${translate(locale, 'cardEditor.previewSource')}: ${title}`}
          className="max-w-full whitespace-normal text-left"
          disabled={disabled || !client}
          onClick={() => {
            setRead(null)
            setOpen(true)
            trackEvent('memnova_source_preview_opened')
          }}
        >
          <Eye className={cardEditorStyles.icon} aria-hidden="true" />
          {translate(locale, 'cardEditor.previewSource')}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onKeyDown={(event) => event.stopPropagation()}
          onCloseAutoFocus={(event) => {
            if (trigger.current?.isConnected) {
              event.preventDefault()
              trigger.current.focus()
            }
          }}
          showCloseButton={false}
          aria-describedby={undefined}
          className="learning-editor-preview flex max-h-[85dvh] flex-col overflow-hidden p-0 sm:max-w-3xl"
        >
          <DialogHeader
            className={`${cardEditorStyles.root} shrink-0 border-b p-5`}
          >
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>{current?.page?.title ?? title}</DialogTitle>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {translate(locale, 'learning.close')}
              </Button>
            </div>
          </DialogHeader>
          <div
            className="min-h-0 overflow-y-auto p-5"
            onClickCapture={(event) => {
              if (
                (event.target as HTMLElement).closest(
                  'a,.wikilink,[data-wikilink]',
                )
              ) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}
            onKeyDownCapture={(event) => {
              if (
                event.key === 'Enter' &&
                (event.target as HTMLElement).closest(
                  'a,.wikilink,[data-wikilink]',
                )
              ) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}
          >
            {!current && (
              <p role="status">{translate(locale, 'learning.loading')}</p>
            )}
            {current?.error && (
              <div role="alert">
                <p>{translate(locale, 'learning.sourceUnavailable')}</p>
                <pre className="my-3 whitespace-pre-wrap break-words text-xs">
                  {current.error}
                </pre>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRead(null)
                    setAttempt((value) => value + 1)
                  }}
                >
                  {translate(locale, 'learning.retry')}
                </Button>
              </div>
            )}
            {current?.page && (
              <BlockNoteReadOnly
                content={current.page.content}
                preserveBody
                locale={locale}
                vaultPath={workspace?.root}
                notePath={`${workspace?.root}/${current.page.path}`}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
