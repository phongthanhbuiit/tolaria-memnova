import { useMemo, useRef, type KeyboardEvent } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { Button } from '../ui/button'
import { NoteMemoryStatus } from './NoteMemoryStatus'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningPage, NoteLearningSummary } from '../../lib/learning/types'

interface Props {
  rows: NoteLearningSummary[]
  pages: LearningPage[]
  clock: number
  locale: AppLocale
  onOpenPage: (page: LearningPage) => void
  scrollParent: HTMLElement | null
}

function destination(key: string, shift: boolean, position: number, count: number): number | undefined {
  return new Map<string,number>([['Home',0],['End',count - 1],['ArrowDown',position + 1],['ArrowUp',position - 1],['Tab',position + (shift ? -1 : 1)]]).get(key)
}

/** Virtualize large collections in the dashboard's existing scroll area, retaining keyboard access. */
export function NoteMemoryList({ rows, pages, clock, locale, onOpenPage, scrollParent }: Props) {
  const pagesById = useMemo(() => new Map(pages.map(page => [page.id, page])), [pages])
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }), [locale])
  const available = useMemo(() => rows.flatMap((row,index) => pagesById.get(row.view.pageId)?.available ? [index] : []), [rows,pagesById])
  const list = useRef<VirtuosoHandle>(null), buttons = useRef(new Map<number, HTMLButtonElement>())
  const pendingFocus = useRef<number | null>(null)
  const virtual = rows.length > 50
  const navigate = (event: KeyboardEvent<HTMLElement>) => {
    if (!virtual || event.metaKey || event.ctrlKey || event.altKey) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-memory-index]')
    if (!target) return
    const position = available.indexOf(Number(target.dataset.memoryIndex))
    if (position < 0) return
    const next = destination(event.key,event.shiftKey,position,available.length)
    if (next === undefined) return
    if (event.key === 'Tab' && (next < 0 || next >= available.length)) return
    event.preventDefault()
    const index = available[Math.max(0,Math.min(available.length - 1,next))]
    pendingFocus.current = index
    list.current?.scrollToIndex({ index, align: 'center', behavior: 'auto' })
    const button = buttons.current.get(index)
    if (button) { button.focus({ preventScroll: true }); pendingFocus.current = null }
  }
  const renderRow = (index: number, row: NoteLearningSummary) => {
    const page = pagesById.get(row.view.pageId)
    const dueAt = row.card?.schedule.due ?? row.view.schedule?.due
    const date = dueAt ? new Date(dueAt) : null
    const dueText = date && Number.isFinite(date.getTime()) ? formatter.format(date) : null
    return <article key={row.view.pageId} role="listitem" aria-setsize={rows.length} aria-posinset={index + 1} className="note-memory-row flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="min-w-0 flex-1 basis-64"><Button variant="ghost" data-memory-index={index} className="h-auto max-w-full justify-start whitespace-normal break-words px-0 text-left font-medium" disabled={!page?.available} onClick={() => { if (page) onOpenPage(page) }} ref={node => {
        if (!node) { buttons.current.delete(index); return }
        buttons.current.set(index,node)
        if (pendingFocus.current === index) { node.focus({ preventScroll: true }); pendingFocus.current = null }
      }}>{page?.title ?? row.view.path}</Button><p className="break-words text-xs text-muted-foreground">{row.view.path}</p></div>
      <div className="min-w-0 space-y-1 sm:max-w-64"><NoteMemoryStatus state={row.view.state} due={dueAt} clock={clock} locale={locale} />{dueText && <p className="break-words text-xs tabular-nums text-muted-foreground">{translate(locale,'properties.due')}: <time dateTime={dueAt}>{dueText}</time></p>}</div>
    </article>
  }
  return <section role="list" className="note-memory-list" aria-label={translate(locale,'learning.noteMemory.notes')} onKeyDown={navigate}>
    {virtual ? scrollParent ? <Virtuoso ref={list} customScrollParent={scrollParent} data={rows} computeItemKey={(_index,row) => row.view.pageId} initialItemCount={12} increaseViewportBy={160} itemContent={renderRow} /> : <p role="status">{translate(locale,'learning.loading')}</p> : rows.map((row,index) => renderRow(index,row))}
  </section>
}
