import type { ReactElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppPreferencesProvider } from '../hooks/useAppPreferences'
import { TooltipProvider } from './ui/tooltip'
import { SmartPropertyValueCell } from './PropertyValueCells'
import { AddPropertyForm } from './AddPropertyForm'
import { PropertyValueEditor } from './learning/PropertyValueEditor'
import { DateValueInput } from './filter-builder/DateValueInput'
import { GitHistoryPanel } from './inspector/GitHistoryPanel'
import { NoteItem } from './NoteItem'
import { SearchPanel } from './SearchPanel'
import { PulseView } from './PulseView'
import { makeEntry } from '../test-utils/noteListTestUtils'

vi.unmock('react-day-picker')
vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: vi.fn(async (command: string) => {
    if (command === 'search_vault') return { results: [{ path: '/vault/tu-lieu.md', title: 'Tư liệu', snippet: '', score: 1, note_type: null }], elapsed_ms: 1 }
    if (command === 'get_vault_pulse') return [{ hash: 'a', shortHash: 'a', message: 'Bản lưu', author: 'QA', date: Date.now() / 1000 - 30, files: [], added: 0, modified: 0, deleted: 0 }]
    return null
  }),
}))
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 17, 12)) })
afterEach(() => { cleanup(); vi.useRealTimers() })

function mount(ui: ReactElement) {
  render(<TooltipProvider><AppPreferencesProvider locale="vi">{ui}</AppPreferencesProvider></TooltipProvider>)
}
function scan() {
  const labels = [...document.querySelectorAll('[aria-label], [title], [placeholder]')].flatMap(el => [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('placeholder')])
  const rendered = [document.body.textContent, ...labels].join(' ')
  expect(rendered).not.toMatch(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|ago|just now|words|today|yesterday)\b/i)
  cleanup()
}
it('R-01 sweeps real Vietnamese date surfaces, including their accessible labels', async () => {
  mount(<SmartPropertyValueCell propKey="Due" value="2026-11-16" displayMode="date" isEditing locale="vi" vaultStatuses={[]} vaultTags={[]} onStartEdit={vi.fn()} onSave={vi.fn()} onSaveList={vi.fn()} />)
  expect(screen.getByRole('combobox', { name: 'Chọn tháng' })).toBeInTheDocument()
  scan()

  mount(<AddPropertyForm locale="vi" onAdd={vi.fn()} onCancel={vi.fn()} vaultStatuses={[]} />)
  fireEvent.keyDown(screen.getByTestId('add-property-type-trigger'), { key: 'ArrowDown' })
  fireEvent.click(screen.getByRole('option', { name: /Date/ }))
  fireEvent.click(screen.getByTestId('add-property-date-trigger'))
  expect(screen.getByRole('combobox', { name: 'Chọn tháng' })).toBeInTheDocument()
  scan()

  mount(<PropertyValueEditor name="Hạn" value="2026-11-16" definition={{ valueKind: 'date' }} locale="vi" disabled={false} onChange={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Hạn' }))
  expect(screen.getByRole('combobox', { name: 'Chọn tháng' })).toBeInTheDocument()
  scan()

  mount(<DateValueInput value="2026-11-16" onChange={vi.fn()} />)
  fireEvent.focus(screen.getByTestId('date-value-input'))
  expect(screen.getByTestId('date-value-preview')).toHaveTextContent('16 tháng 11, 2026')
  fireEvent.click(screen.getByTestId('date-picker-trigger'))
  expect(screen.getByRole('combobox', { name: 'Chọn tháng' })).toBeInTheDocument()
  scan()

  mount(<GitHistoryPanel commits={[0, 1, 5, 60].map((d, i) => ({ hash: String(i), shortHash: String(i), message: 'Bản lưu', author: 'QA', date: Date.now() / 1000 - d * 86400 }))} />)
  expect(screen.getByText('Hôm nay')).toBeInTheDocument()
  scan()

  const entry = makeEntry({ path: '/vault/tu-lieu.md', title: 'Tư liệu', createdAt: new Date(2026, 10, 16).getTime() / 1000, modifiedAt: Date.now() / 1000, wordCount: 1234, outgoingLinks: ['Nguồn'] })
  mount(<NoteItem entry={entry} isSelected={false} typeEntryMap={{}} onClickNote={vi.fn()} />)
  expect(screen.getByTestId('note-date-row')).toHaveTextContent('tháng 11')
  scan()

  mount(<SearchPanel open vaultPath="/vault" entries={[entry]} onSelectNote={vi.fn()} onClose={vi.fn()} />)
  fireEvent.change(screen.getByPlaceholderText('Search in all notes...'), { target: { value: 'Tư liệu' } })
  await screen.findByText('Tư liệu')
  scan()

  mount(<PulseView vaultPath="/vault" locale="vi" />)
  await screen.findByText('bây giờ')
  scan()
})
