import { useId } from 'react'
import { Checkbox } from '../ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { translate, type AppLocale } from '../../lib/i18n'
import type { NoteConversionPage, ConversionBackChoice, ConversionFaceChoice } from '../../lib/learning/noteConversionTypes'
import type { ConversionDraft } from './useNoteConversion'
const faceValue = (face: ConversionFaceChoice | null) => face?.kind === 'card' ? `card:${face.cardId}` : face?.kind ?? ''
const fromValue = (value: string): ConversionFaceChoice => value === 'markdown' ? { kind: 'markdown' } : { kind: 'card',cardId: value.slice(5) }
export function NoteConversionChoices({ page, pages, draft, disabled, locale, onChange }: { page: NoteConversionPage; pages: NoteConversionPage[]; draft: ConversionDraft; disabled: boolean; locale: AppLocale; onChange: (draft: ConversionDraft) => void }) {
  const id = useId(), t = (key: Parameters<typeof translate>[1]) => translate(locale,key)
  const cards = page.candidates.filter(candidate => candidate.card.status !== 'trashed')
  const linkedIds = new Set(page.candidates.map(candidate => candidate.card.answerPageId).filter(Boolean))
  const targets = pages.filter(target => linkedIds.has(target.pageId) && target.pageId && target.pageId !== page.pageId && !target.issues.length)
  const memory = draft.memory, back = draft.back
  const backValue = back?.kind === 'page' ? `page:${back.pageId}:${back.face}` : back?.kind === 'inline' ? faceValue(back.source) : ''
  const changedFace = (patch: Partial<ConversionDraft>) => onChange({ ...draft,...patch,memory: memory?.kind === 'reuse' ? { ...memory,confirmedSameGoal: false } : memory })
  const cardLabel = (index: number) => translate(locale,'learning.noteMemory.oldCard',{ n: index + 1 })
  const sources = (reverse: boolean) => <><SelectItem value="markdown">{t('learning.noteMemory.fromNote')}</SelectItem>{cards.filter(candidate => !reverse || candidate.card.answerMode === 'inline').map((candidate,index) => <SelectItem key={candidate.card.id} value={`card:${candidate.card.id}`}>{cardLabel(index)} · {candidate.card.front.slice(0,60)}</SelectItem>)}</>
  const setBack = (value: string) => { const [,pageId,face] = value.split(':'); const back: ConversionBackChoice = value.startsWith('page:') ? { kind: 'page',pageId,face: face === 'back' ? 'back' : 'front' } : { kind: 'inline',source: fromValue(value) }; changedFace({ back }) }
  return <div className="note-memory-choices">
    <div><label htmlFor={`${id}-front`}>{t('learning.noteMemory.articleSource')}</label><Select value={faceValue(draft.front)} disabled={disabled} onValueChange={value => changedFace({ front: fromValue(value) })}><SelectTrigger id={`${id}-front`} aria-label={t('learning.noteMemory.articleSource')}><SelectValue placeholder={t('learning.noteMemory.chooseSource')} /></SelectTrigger><SelectContent className="note-memory-portal">{sources(false)}</SelectContent></Select></div>
    <div><label htmlFor={`${id}-back`}>{t('learning.noteMemory.mnemonicSource')}</label><Select value={backValue} disabled={disabled} onValueChange={setBack}><SelectTrigger id={`${id}-back`} aria-label={t('learning.noteMemory.mnemonicSource')}><SelectValue placeholder={t('learning.noteMemory.chooseSource')} /></SelectTrigger><SelectContent className="note-memory-portal">{sources(true)}{targets.map(target => <SelectItem key={target.path} value={`page:${target.pageId}:front`}>{target.title} · {t('learning.noteMemory.article')}</SelectItem>)}{targets.filter(target => target.back !== null && target.config?.back.kind !== 'page').map(target => <SelectItem key={`${target.path}:back`} value={`page:${target.pageId}:back`}>{target.title} · {t('learning.noteMemory.mnemonic')}</SelectItem>)}</SelectContent></Select></div>
    <div className="note-memory-history"><label htmlFor={`${id}-memory`}>{t('learning.noteMemory.history')}</label><Select value={memory?.kind === 'reuse' ? memory.cardId : memory?.kind ?? ''} disabled={disabled} onValueChange={value => onChange({ ...draft,memory: value === 'fresh' ? { kind: 'fresh' } : { kind: 'reuse',cardId: value,confirmedSameGoal: false } })}><SelectTrigger id={`${id}-memory`} aria-label={t('learning.noteMemory.history')}><SelectValue placeholder={t('learning.noteMemory.chooseSource')} /></SelectTrigger><SelectContent className="note-memory-portal"><SelectItem value="fresh">{t('learning.noteMemory.freshHistory')}</SelectItem>{cards.map((candidate,index) => <SelectItem key={candidate.card.id} value={candidate.card.id}>{t('learning.noteMemory.keepHistory')} · {cardLabel(index)}</SelectItem>)}</SelectContent></Select>
      {memory?.kind === 'reuse' && <label className="note-memory-confirm" htmlFor={`${id}-confirm`}><Checkbox id={`${id}-confirm`} disabled={disabled} checked={memory.confirmedSameGoal} onCheckedChange={checked => onChange({ ...draft,memory: { ...memory,confirmedSameGoal: checked === true } })} /><span>{t('learning.noteMemory.sameGoal')}</span></label>}
    </div>
  </div>
}
