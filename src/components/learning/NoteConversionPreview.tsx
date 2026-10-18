import { ArrowRight } from '@phosphor-icons/react'
import { translate, type AppLocale } from '../../lib/i18n'
import type { NoteConversionPage } from '../../lib/learning/noteConversionTypes'
import type { ConversionDraft } from './useNoteConversion'
function selectedText(page: NoteConversionPage, pages: NoteConversionPage[], draft: ConversionDraft, reverse: boolean): string | null {
  if (reverse && draft.back?.kind === 'page') {
    const back = draft.back, target = pages.find(page => page.pageId === back.pageId)
    return (back.face === 'front' ? target?.front : target?.back) ?? null
  }
  const source = reverse ? draft.back?.kind === 'inline' ? draft.back.source : null : draft.front
  if (!source) return null
  if (source.kind === 'markdown') return reverse ? page.back ?? '' : page.front
  const card = page.candidates.find(candidate => candidate.card.id === source.cardId)?.card
  return (reverse ? card?.back : card?.front) ?? null
}
export function NoteConversionPreview({ page,pages,draft,locale }: { page: NoteConversionPage; pages: NoteConversionPage[]; draft: ConversionDraft; locale: AppLocale }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale,key)
  return <div className="note-memory-diff">{([false,true] as const).map(reverse => {
    const selected = selectedText(page,pages,draft,reverse)
    return <section key={String(reverse)} className="min-w-0 space-y-2"><h3>{t(reverse ? 'learning.noteMemory.mnemonic' : 'learning.noteMemory.article')}</h3><div className="note-memory-pair"><div><p className="note-memory-caption">{t('learning.noteMemory.currentNote')}</p><pre>{(reverse ? page.back : page.front) || t('learning.noteMemory.missingMnemonic')}</pre></div><ArrowRight aria-hidden="true" className="note-memory-pair-arrow" /><div className="note-memory-selected"><p className="note-memory-caption">{t('learning.noteMemory.selectedResult')}</p><pre>{selected === null ? t('learning.noteMemory.chooseSource') : selected || t('learning.noteMemory.missingMnemonic')}</pre></div></div></section>
  })}</div>
}
