import { useId, useLayoutEffect, useMemo, useRef, type KeyboardEvent } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { NoteMemoryStatus } from './NoteMemoryStatus'
import { createReviewDueFormatter } from './reviewDueDisplay'
import './NoteMemoryList.css'
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
  const listId = useId()
  const pagesById = useMemo(() => new Map(pages.map(page => [page.id, page])), [pages])
  const formatDue = useMemo(() => createReviewDueFormatter(locale, clock), [locale, clock])
  const available = useMemo(() => rows.flatMap((row,index) => pagesById.get(row.view.pageId)?.available ? [index] : []), [rows,pagesById])
  const list = useRef<VirtuosoHandle>(null), buttons = useRef(new Map<string, HTMLButtonElement>())
  const pendingFocus = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (!pendingFocus.current) return
    const index = rows.findIndex(row => row.view.pageId === pendingFocus.current)
    if (index < 0 || !pagesById.get(pendingFocus.current)?.available) {
      pendingFocus.current = null
      return
    }
    list.current?.scrollToIndex({ index, align: 'center', behavior: 'auto' })
  }, [rows, pagesById])
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
    const pageId = rows[index].view.pageId
    pendingFocus.current = pageId
    list.current?.scrollToIndex({ index, align: 'center', behavior: 'auto' })
    const button = buttons.current.get(pageId)
    if (button) { button.focus({ preventScroll: true }); pendingFocus.current = null }
  }
  const renderRow = (index: number, row: NoteLearningSummary) => {
    const page = pagesById.get(row.view.pageId)
    const dueAt = row.card?.schedule.due ?? row.view.schedule?.due
    const due = formatDue(dueAt)
    const labelId = `${listId}-title-${index}`
    const detailId = `${listId}-detail-${index}`
    const statusId = `${listId}-status-${index}`
    return <Tooltip key={row.view.pageId}>
      <TooltipTrigger asChild>
        <article role="listitem" aria-setsize={rows.length} aria-posinset={index + 1} className="note-memory-row border-b border-border">
          <Button size="md" layout="responsive" variant="ghost" data-memory-index={index} className="w-full flex-wrap justify-between gap-x-4 gap-y-1 rounded-none px-2 py-2 text-left focus-visible:outline-offset-[-2px]"
            disabled={!page?.available} aria-labelledby={labelId} aria-describedby={`${detailId} ${statusId}`}
            onClick={() => { if (page) onOpenPage(page) }} ref={node => {
              if (!node) { buttons.current.delete(row.view.pageId); return }
              buttons.current.set(row.view.pageId,node)
              if (pendingFocus.current === row.view.pageId && page?.available) { node.focus({ preventScroll: true }); pendingFocus.current = null }
            }}>
            <span className="min-w-0 flex-[1_1_12rem]">
              <span id={labelId} className="block font-medium">{page?.title ?? row.view.path}</span>
              <span id={detailId} className="block text-small font-normal text-muted-foreground">{row.view.path}</span>
            </span>
            <span id={statusId} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-normal">
              <NoteMemoryStatus state={row.view.state} due={dueAt} clock={clock} locale={locale} />
              {due && <time dateTime={dueAt} className="text-small tabular-nums text-muted-foreground">
                {due.relative}<span className="sr-only"> · {due.absolute}</span>
              </time>}
            </span>
          </Button>
        </article>
      </TooltipTrigger>
      {due && <TooltipContent>{due.absolute}</TooltipContent>}
    </Tooltip>
  }
  return <TooltipProvider><section role="list" className="note-memory-list" aria-label={translate(locale,'learning.noteMemory.notes')} onKeyDown={navigate} onBlurCapture={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) pendingFocus.current = null
  }}>
    {virtual ? scrollParent ? <Virtuoso ref={list} customScrollParent={scrollParent} data={rows} computeItemKey={(_index,row) => row.view.pageId} initialItemCount={12} increaseViewportBy={160} itemContent={renderRow} /> : <p role="status">{translate(locale,'learning.loading')}</p> : rows.map((row,index) => renderRow(index,row))}
  </section></TooltipProvider>
}
