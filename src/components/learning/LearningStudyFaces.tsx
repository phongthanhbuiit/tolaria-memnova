import type { RefObject } from 'react'
import type { useLearningStudy } from '../../hooks/useLearningStudy'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import type { DocumentRenderStatus } from '../documentRenderGate'
import { BlockNoteReadOnly } from '../FlashcardStudyView'
import { Button } from '../ui/button'
import { SourcePagePreview } from './SourcePagePreview'
import { VocabularyStudyDetails } from './VocabularyFields'
import { MediaPreview } from './MediaPreview'
import { learningMediaUrl } from '../../lib/learning/media'

interface FaceState {
  snapshotKey: string
  revealed: boolean
  backVisited: boolean
  sourceReady: boolean
  mnemonicRegion: RefObject<HTMLDivElement | null>
  questionRendered: () => void
  answerRendered: () => void
  questionStatus: (status: DocumentRenderStatus) => void
  answerStatus: (status: DocumentRenderStatus) => void
}
export function LearningStudyFaces({
  study,
  root,
  locale,
  faces,
}: {
  study: ReturnType<typeof useLearningStudy>
  root: string
  locale: AppLocale
  faces: FaceState
}) {
  const item = study.session?.current
  if (!item) return null
  const {
    snapshotKey: key,
    revealed,
    backVisited,
    sourceReady,
    mnemonicRegion,
    questionRendered,
    answerRendered,
    questionStatus,
    answerStatus,
  } = faces
  const isNote = item.content?.kind === 'note'
  const noteDetails =
    item.content?.kind === 'note' ? item.content.details : null
  const answerPage = isNote
    ? item.answerPage
    : item.card.answerMode === 'page' && item.card.answerPageId
      ? item.answerPage
      : item.page
  const answer =
    isNote || item.card.answerMode === 'page'
      ? (answerPage?.content ?? '')
      : item.card.back
  const ownerPath = item.page ? `${root}/${item.page.path}` : undefined
  const audio = isNote
    ? null
    : learningMediaUrl(item.card.properties.audio, root, ownerPath)
  const imageUrl = isNote
    ? null
    : learningMediaUrl(item.card.properties.image, root, ownerPath)
  const t = (key: TranslationKey) => translate(locale, key)
  return (
    <div
      className="mx-auto max-w-2xl space-y-6"
      onClickCapture={(event) => {
        if (
          isNote &&
          event.target instanceof Element &&
          event.target.closest('a,.wikilink,[data-wikilink]')
        ) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
    >
      <div
        hidden={isNote && revealed}
        inert={isNote && revealed}
        aria-hidden={isNote && revealed ? true : undefined}
        className="rounded-xl border bg-card p-6 shadow-sm"
      >
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t(isNote ? 'learning.noteMemory.article' : 'learning.front')}
        </p>
        <BlockNoteReadOnly
          key={`${key}:question`}
          content={isNote ? (item.page?.content ?? '') : item.card.front}
          onReady={isNote ? undefined : questionRendered}
          onRenderStatus={isNote ? questionStatus : undefined}
          verifiedMedia={isNote ? noteDetails?.frontMedia : undefined}
          preserveBody
          locale={locale}
          vaultPath={root}
          notePath={item.page ? `${root}/${item.page.path}` : undefined}
        />
        {!isNote && typeof item.card.properties.IPA === 'string' && (
          <p className="mt-4 text-muted-foreground">
            {item.card.properties.IPA}
          </p>
        )}
        {!isNote && (
          <VocabularyStudyDetails
            properties={item.card.properties}
            locale={locale}
          />
        )}
        {!isNote && (
          <div className="mt-5 space-y-3">
            <MediaPreview src={imageUrl} kind="image" locale={locale} />
            <MediaPreview src={audio} kind="audio" locale={locale} />
          </div>
        )}
      </div>
      {item.sourceError && (
        <div role="alert" className="rounded-lg border border-destructive p-4">
          <p>{t('learning.error')}</p>
          <pre className="whitespace-pre-wrap break-words text-xs">
            {item.sourceError}
          </pre>
          <Button
            variant="outline"
            onClick={() => {
              void study.reload()
            }}
          >
            {t('learning.reload')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void study.skip()
            }}
          >
            {t('learning.skip')}
          </Button>
        </div>
      )}
      {(isNote ? backVisited : revealed) && sourceReady && (
        <div
          ref={mnemonicRegion}
          tabIndex={isNote ? -1 : undefined}
          aria-label={isNote ? t('learning.noteMemory.mnemonic') : undefined}
          hidden={isNote && !revealed}
          inert={isNote && !revealed}
          aria-hidden={isNote && !revealed ? true : undefined}
          className="rounded-xl border border-primary/30 bg-muted/30 p-6"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t(isNote ? 'learning.noteMemory.mnemonic' : 'learning.back')}
          </p>
          <BlockNoteReadOnly
            key={`${key}:answer`}
            content={answer}
            onReady={isNote ? undefined : answerRendered}
            onRenderStatus={isNote ? answerStatus : undefined}
            verifiedMedia={isNote ? noteDetails?.backMedia : undefined}
            preserveBody
            locale={locale}
            vaultPath={root}
            notePath={answerPage ? `${root}/${answerPage.path}` : undefined}
          />
          {!isNote && (
            <VocabularyStudyDetails
              properties={item.card.properties}
              locale={locale}
              answer
            />
          )}
          {!isNote && item.card.answerPageId && answerPage && (
            <div className="mt-4 border-t pt-3">
              <SourcePagePreview
                pageId={answerPage.id}
                title={answerPage.title}
                locale={locale}
              />
              <p className="break-all text-xs text-muted-foreground">
                {answerPage.path}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
