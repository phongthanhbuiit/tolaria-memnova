import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { PropertyEditor } from './PropertyEditor'
import { useLearningWorkspace } from './LearningContext'
import { pagePropertyKey } from '../../lib/learning/pagePropertySnapshot'
import {
  pageEditorValues,
  pageWireValues,
  persistPageValues,
  sameValue,
} from '../../lib/learning/pagePropertyDraft'
import {
  matchesProperty,
  type PropertyDefinitions,
  type PropertyValues,
} from '../../lib/learning/propertyValues'
import type { FrontmatterValue } from '../Inspector'
import { translate, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'

type WriterOptions = { silent?: boolean }
type Props = {
  path: string
  values: PropertyValues
  excludedKeys: readonly string[]
  locale: AppLocale
  onUpdate: (
    key: string,
    value: FrontmatterValue,
    options?: WriterOptions,
  ) => unknown
  onRemove: (key: string, options?: WriterOptions) => unknown
  onClose: () => void
}
export function PagePropertyEditor({
  path,
  values,
  excludedKeys,
  locale,
  onUpdate,
  onRemove,
  onClose,
}: Props) {
  const workspace = useLearningWorkspace(),
    client = workspace?.client
  const root = workspace?.root ?? client?.vaultPath ?? ''
  const initialPages = useRef(workspace?.pages ?? [])
  const page = workspace?.pages.find((page) => `${root}/${page.path}` === path)
  const pageId = page?.id
  const ownerId = useRef(pageId ?? null)
  const initial = useRef(structuredClone(values))
  const progress = useRef(structuredClone(values))
  const expected = useRef<PropertyDefinitions>({})
  const originalEditor = useRef<PropertyValues>({})
  const pendingHint = useRef(false)
  const active = useRef<object | null>(null)
  const [draft, setDraft] = useState<{
    values: PropertyValues
    definitions: PropertyDefinitions
  } | null>(null)
  const [busy, setBusy] = useState(false),
    [pickerBusy, setPickerBusy] = useState(false),
    [valuesSaved, setValuesSaved] = useState(false)
  const [error, setError] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0)
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const invalidProperties =
    !!draft &&
    Object.entries(draft.definitions).some(
      ([key, definition]) =>
        !matchesProperty(draft.values[key], definition) &&
        (!Object.hasOwn(originalEditor.current, key) ||
          !sameValue(draft.values[key], originalEditor.current[key]) ||
          !sameValue(definition, expected.current[key])),
    )
  useEffect(() => {
    const visit = {}
    active.current = visit
    let cancelled = false
    if (!client)
      return () => {
        if (active.current === visit) active.current = null
      }
    const load = pageId
      ? client.pagePropertyDefinitions(pageId)
      : Promise.resolve({})
    load
      .then((definitions) => {
        if (cancelled) return
        expected.current = definitions
        originalEditor.current = pageEditorValues(
          initial.current,
          definitions,
          initialPages.current,
        )
        setDraft({ values: originalEditor.current, definitions })
      })
      .catch((error) => {
        if (!cancelled) setError(String(error))
      })
    return () => {
      cancelled = true
      if (active.current === visit) active.current = null
    }
  }, [client, pageId, attempt])
  const save = async () => {
    if (
      !draft ||
      !client ||
      !workspace ||
      busy ||
      pickerBusy ||
      !active.current ||
      invalidProperties
    )
      return
    const visit = active.current
    const isActive = () => active.current === visit
    setBusy(true)
    setError(null)
    try {
      if (!pendingHint.current) {
        const wire = pageWireValues(
          draft.values,
          draft.definitions,
          workspace.pages,
          initial.current,
          originalEditor.current,
        )
        if (
          sameValue(wire, initial.current) &&
          sameValue(expected.current, draft.definitions)
        ) {
          onClose()
          return
        }
        if (
          !sameValue(values, initial.current) &&
          !sameValue(values, progress.current)
        )
          throw Error(t('properties.pageChanged'))
        await workspace.flush()
        if (!isActive()) return
        await persistPageValues(
          progress.current,
          wire,
          {
            update: async (key, value) =>
              onUpdate(key, value, { silent: true }),
            remove: async (key) => onRemove(key, { silent: true }),
          },
          isActive,
        )
        if (!isActive()) return
        pendingHint.current = true
        setValuesSaved(true)
      }
      if (!sameValue(expected.current, draft.definitions)) {
        if (!ownerId.current) {
          const owner = await client.ensurePage(path.slice(root.length + 1))
          if (!isActive()) return
          ownerId.current = owner.id
        }
        if (!isActive()) return
        await client.setPagePropertyDefinitions(
          ownerId.current,
          expected.current,
          draft.definitions,
        )
      }
      if (!isActive()) return
      await workspace.refresh()
      if (isActive()) {
        trackEvent('memnova_page_properties_saved', {
          field_count: Object.keys(draft.values).length,
          type_count: Object.keys(draft.definitions).length,
        })
        onClose()
      }
    } catch (error) {
      if (isActive()) setError(String(error))
    } finally {
      if (isActive()) setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy && !pickerBusy) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] flex-col overflow-hidden p-0 sm:max-w-2xl"
        onEscapeKeyDown={(event) => {
          if (busy || pickerBusy) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (busy || pickerBusy) event.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0 border-b p-5">
          <DialogTitle>{t('properties.page')}</DialogTitle>
          <DialogDescription>{t('properties.pageHelp')}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
          {draft ? (
            <PropertyEditor
              values={draft.values}
              definitions={draft.definitions}
              excludedKeys={excludedKeys}
              reservedKeys={excludedKeys}
              validateKey={(key, oldKey) =>
                pagePropertyKey(key, draft.values, oldKey)
              }
              locale={locale}
              disabled={busy || valuesSaved}
              onChange={setDraft}
              onBusyChange={setPickerBusy}
            />
          ) : (
            !error && <p role="status">{t('learning.loading')}</p>
          )}
          {error && (
            <div role="alert" className="rounded border border-destructive p-3">
              <p>
                {t(valuesSaved ? 'properties.hintFailed' : 'learning.error')}
              </p>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                {error}
              </pre>
              {!draft && (
                <Button
                  onClick={() => {
                    setError(null)
                    setAttempt((value) => value + 1)
                  }}
                >
                  {t('learning.retry')}
                </Button>
              )}
            </div>
          )}
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t p-4">
          <Button
            variant="outline"
            disabled={busy || pickerBusy}
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!draft || busy || pickerBusy || invalidProperties}
            onClick={() => void save()}
          >
            {t(
              busy
                ? 'learning.saving'
                : valuesSaved
                  ? 'learning.retry'
                  : 'common.save',
            )}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
