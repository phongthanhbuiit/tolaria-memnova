import { SourcePagePreview } from './SourcePagePreview'
import { CardEditorSection } from './CardEditorSection'
import { FloppyDisk, CircleNotch } from '@phosphor-icons/react'
import { cardEditorStyles } from './cardEditorStyles'
import { useId, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { CardMediaFields } from './CardMediaFields'
import { PropertyEditor } from './PropertyEditor'
import { matchesProperty } from '../../lib/learning/propertyValues'
import {
  cardPresetFields,
  cardPresetKeys,
} from '../../lib/learning/cardPropertyPreset'
import { SourcePagePicker } from './SourcePagePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import type {
  CardDraft,
  LearningCard,
  LearningProperty,
} from '../../lib/learning/types'
import { translate, type TranslationKey, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { VocabularyFields, CardTypeField } from './VocabularyFields'
import { useLearningWorkspace } from './LearningContext'

export function CardForm({
  card,
  initialDraft,
  pageId,
  locale,
  onClose,
}: {
  card?: LearningCard
  initialDraft: CardDraft
  pageId: string
  locale: AppLocale
  onClose: () => void
}) {
  const workspace = useLearningWorkspace()
  const statusId = useId()
  const [operationId] = useState(() => crypto.randomUUID())
  const [draft, setDraft] = useState(() => initialDraft)
  const [vocabularyOpen, setVocabularyOpen] = useState(
    initialDraft.properties.card_type === 'vocabulary',
  )
  const [answerChoice, setAnswerChoice] = useState(
    initialDraft.answerMode === 'inline'
      ? 'inline'
      : initialDraft.answerPageId
        ? 'other'
        : 'current',
  )
  const [otherSource, setOtherSource] = useState(
    initialDraft.answerPageId ?? null,
  )
  const [sourceBusy, setSourceBusy] = useState(false)
  const [propertyBusy, setPropertyBusy] = useState(false)
  const [persisted, setPersisted] = useState(card)
  const [savedDraft, setSavedDraft] = useState<CardDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const root = workspace?.root ?? workspace?.client?.vaultPath ?? ''
  const ownerPage = workspace?.pages?.find((page) => page.id === pageId)
  const ownerPath = ownerPage?.path
  const definitions = draft.propertyDefinitions ?? {}
  const presetFields = cardPresetFields(draft.properties, definitions)
  const hiddenPresetFields = cardPresetKeys.filter(
    (key) => !presetFields.includes(key),
  )
  const invalidProperties = Object.entries(definitions).some(
    ([key, definition]) =>
      !Object.hasOwn(draft.properties, key) ||
      !matchesProperty(draft.properties[key], definition),
  )
  const t = (key: TranslationKey) => translate(locale, key)
  const save = async () => {
    if (
      !workspace?.client ||
      busy ||
      sourceBusy ||
      propertyBusy ||
      invalidProperties ||
      (answerChoice === 'other' && !draft.answerPageId)
    )
      return
    setBusy(true)
    setError(null)
    try {
      if (savedDraft !== draft) {
        const saved = persisted
          ? await workspace.client.updateCard(
              persisted.id,
              persisted.revision,
              draft,
            )
          : await workspace.client.createCard(pageId, draft, operationId)
        setPersisted(saved)
        setSavedDraft(draft)
        trackEvent(
          persisted ? 'memnova_card_updated' : 'memnova_card_created',
          {
            mode: draft.answerMode,
            answer_source:
              draft.answerMode === 'inline'
                ? 'inline'
                : draft.answerPageId
                  ? 'linked'
                  : 'owner',
            status: draft.status,
            card_type:
              draft.properties.card_type === 'vocabulary'
                ? 'vocabulary'
                : 'basic',
            property_count: Object.keys(draft.properties).length,
            typed_count: Object.keys(definitions).length,
          },
        )
      }
      await workspace.refresh()
      onClose()
    } catch (error) {
      setError(String(error))
    } finally {
      setBusy(false)
    }
  }
  const field = (key: 'front' | 'back', value: string) =>
    setDraft((previous) => ({ ...previous, [key]: value }))
  const metadata = (key: string, value: LearningProperty) => {
    if (key === 'card_type' && value === 'vocabulary') setVocabularyOpen(true)
    setDraft((previous) => ({
      ...previous,
      properties: { ...previous.properties, [key]: value },
    }))
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy && !sourceBusy && !propertyBusy) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`${cardEditorStyles.root} flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 w-[calc(100%-32px)] max-w-[720px] sm:max-w-[720px]`}
        onEscapeKeyDown={(event) => {
          if (busy || sourceBusy || propertyBusy) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (busy || sourceBusy || propertyBusy) event.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0 border-b p-5">
          <DialogTitle>
            {t(persisted ? 'learning.editCard' : 'learning.addCard')}
          </DialogTitle>
          <DialogDescription>{t('learning.questionHelp')}</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-5 overflow-y-auto overscroll-contain p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {presetFields.includes('card_type') && (
              <CardTypeField
                properties={draft.properties}
                locale={locale}
                disabled={busy}
                onChange={metadata}
              />
            )}
            <div className="grid gap-2 text-sm">
              <label htmlFor={statusId}>{t('learning.status')}</label>
              <Select
                value={draft.status}
                disabled={busy}
                onValueChange={(value) =>
                  setDraft((previous) => ({
                    ...previous,
                    status: value as CardDraft['status'],
                  }))
                }
              >
                <SelectTrigger id={statusId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cardEditorStyles.portal}>
                  {(['draft', 'active', 'suspended'] as const).map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`learning.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            {t('learning.front')}
            <Textarea
              name="front"
              autoComplete="off"
              autoFocus
              value={draft.front}
              disabled={busy}
              rows={3}
              onChange={(event) => field('front', event.target.value)}
            />
          </label>
          <div className="grid gap-2 text-sm">
            <span id={`${statusId}-answer-label`}>
              {t('learning.answerMode')}
            </span>
            <Select
              value={answerChoice}
              disabled={busy || sourceBusy || propertyBusy}
              onValueChange={(value) => {
                setAnswerChoice(value)
                setDraft((previous) => ({
                  ...previous,
                  answerMode: value === 'inline' ? 'inline' : 'page',
                  answerPageId: value === 'other' ? otherSource : null,
                }))
              }}
            >
              <SelectTrigger aria-labelledby={`${statusId}-answer-label`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cardEditorStyles.portal}>
                <SelectItem value="inline">
                  {t('learning.answerInline')}
                </SelectItem>
                <SelectItem value="current">
                  {t('learning.answerCurrent')}
                </SelectItem>
                <SelectItem value="other">
                  {t('learning.answerOther')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {answerChoice === 'other' && (
            <SourcePagePicker
              value={draft.answerPageId ?? null}
              locale={locale}
              disabled={busy || sourceBusy || propertyBusy}
              onBusyChange={setSourceBusy}
              onChange={(page) => {
                setOtherSource(page.id)
                setDraft((previous) => ({ ...previous, answerPageId: page.id }))
              }}
            />
          )}
          {answerChoice === 'current' && (
            <div className="rounded-md border bg-muted/30 p-3">
              <SourcePagePreview
                pageId={pageId}
                title={ownerPage?.title ?? t('learning.answerCurrent')}
                locale={locale}
                disabled={busy || sourceBusy || propertyBusy}
              />
              {ownerPath && (
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {ownerPath}
                </p>
              )}
            </div>
          )}
          {draft.answerMode === 'inline' && (
            <label className="grid gap-2 text-sm font-medium">
              {t('learning.back')}
              <Textarea
                name="back"
                autoComplete="off"
                value={draft.back}
                disabled={busy}
                rows={5}
                onChange={(event) => field('back', event.target.value)}
              />
            </label>
          )}
          <CardEditorSection
            title={t('learning.vocabulary')}
            open={vocabularyOpen}
            onOpenChange={setVocabularyOpen}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {(['IPA'] as const)
                .filter((key) => presetFields.includes(key))
                .map((key) => (
                  <label key={key} className="grid gap-2 text-sm">
                    IPA
                    <Input
                      name={key}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={busy}
                      value={
                        typeof draft.properties[key] === 'string'
                          ? draft.properties[key]
                          : ''
                      }
                      onChange={(event) => metadata(key, event.target.value)}
                    />
                  </label>
                ))}
            </div>
            <VocabularyFields
              showCardType={false}
              hiddenKeys={hiddenPresetFields}
              properties={draft.properties}
              locale={locale}
              disabled={busy}
              onChange={metadata}
            />
          </CardEditorSection>
          <PropertyEditor
            title={t('properties.card')}
            values={draft.properties}
            definitions={definitions}
            excludedKeys={presetFields}
            reservedKeys={cardPresetKeys}
            locale={locale}
            disabled={busy || sourceBusy || propertyBusy}
            onBusyChange={setPropertyBusy}
            onChange={({ values, definitions }) =>
              setDraft((previous) => ({
                ...previous,
                properties: values,
                propertyDefinitions: definitions,
              }))
            }
          />
          <CardMediaFields
            root={root}
            ownerPath={ownerPath ? `${root}/${ownerPath}` : undefined}
            properties={draft.properties}
            visibleKeys={presetFields}
            locale={locale}
            disabled={busy || sourceBusy || propertyBusy}
            onChange={metadata}
            onBusyChange={setPropertyBusy}
          />
          {persisted && (
            <CardEditorSection title={t('properties.memory')}>
              <div className="space-y-2">
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {t('properties.due')}
                    </dt>
                    <dd className="mt-1 break-words">
                      {Number.isFinite(Date.parse(persisted.schedule.due))
                        ? new Intl.DateTimeFormat(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(persisted.schedule.due))
                        : t('learning.error')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {t('properties.reps')}
                    </dt>
                    <dd>{persisted.schedule.reps}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {t('properties.lapses')}
                    </dt>
                    <dd>{persisted.schedule.lapses}</dd>
                  </div>
                </dl>
              </div>
            </CardEditorSection>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive p-3 text-sm"
            >
              <p>
                {t(
                  savedDraft === draft
                    ? 'learning.savedRefreshFailed'
                    : 'learning.error',
                )}
              </p>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                {error}
              </pre>
            </div>
          )}
        </div>
        <div
          className={`${cardEditorStyles.footer} flex shrink-0 justify-end gap-2 border-t bg-background p-4`}
        >
          <Button
            variant="ghost"
            disabled={busy || sourceBusy || propertyBusy}
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            disabled={
              busy ||
              sourceBusy ||
              propertyBusy ||
              invalidProperties ||
              (answerChoice === 'other' && !draft.answerPageId)
            }
            onClick={() => {
              void save()
            }}
          >
            {busy ? (
              <CircleNotch
                className={`${cardEditorStyles.icon} animate-spin`}
                aria-hidden="true"
              />
            ) : (
              <FloppyDisk
                className={cardEditorStyles.icon}
                aria-hidden="true"
              />
            )}
            {t(
              busy
                ? 'learning.saving'
                : error && savedDraft === draft
                  ? 'learning.retry'
                  : 'common.save',
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
