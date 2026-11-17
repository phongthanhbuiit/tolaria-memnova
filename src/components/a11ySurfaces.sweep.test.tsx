import { createRef, type ReactElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppPreferencesProvider } from '../hooks/useAppPreferences'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { TooltipProvider } from './ui/tooltip'
import { Sidebar } from './Sidebar'
import { NoteList } from './NoteList'
import { BreadcrumbBar } from './BreadcrumbBar'
import { DynamicPropertiesPanel } from './DynamicPropertiesPanel'
import { AddPropertyForm } from './AddPropertyForm'
import { FilterBuilder } from './FilterBuilder'
import { BulkActionBar } from './BulkActionBar'
import { QuickOpenPalette } from './QuickOpenPalette'
import { SearchPanel } from './SearchPanel'
import { StatusDropdown } from './StatusDropdown'
import { TagsDropdown } from './TagsDropdown'
import { NoteIcon } from './NoteIcon'
import { AccentColorPicker } from './AccentColorPicker'
import { EmojiPicker } from './EmojiPicker'
import { HomePage } from './HomePage'
import { DecksPage } from './DecksPage'
import { PulseView } from './PulseView'
import { AiPanelHeader, AiPanelComposer } from './AiPanelChrome'
import { TagPillList, UrlValue } from './EditableValue'
import { makeEntry, buildNoteListProps } from '../test-utils/noteListTestUtils'

vi.mock('../mock-tauri', () => ({ isTauri: () => false, mockInvoke: vi.fn(async (command: string) => command === 'get_vault_pulse' ? [{ hash: 'abc', shortHash: 'abc', message: 'Bản lưu QA', author: 'QA', date: Date.now() / 1000, files: [], added: 0, modified: 0, deleted: 0 }] : { results: [], elapsed_ms: 0 }) }))
afterEach(cleanup)
const entry = makeEntry({ title: 'Ghi chú kiểm tra', icon: 'rocket' })
const entries = [entry]
const noop = vi.fn()
function mount(ui: ReactElement) {
  return render(<AppPreferencesProvider locale="vi"><TooltipProvider>{ui}</TooltipProvider></AppPreferencesProvider>)
}
function scan() {
  for (const button of document.querySelectorAll('button')) expect(button, button.outerHTML).not.toHaveAccessibleName('')
  expect(screen.queryAllByRole('button', { name: '' }).map(button => button.outerHTML)).toEqual([])
  for (const button of screen.queryAllByRole('button')) {
    const visible = button.cloneNode(true) as HTMLElement
    visible.querySelectorAll('.sr-only, svg, [aria-hidden="true"]').forEach(node => node.remove())
    const text = visible.textContent?.trim() ?? ''
    const iconOnly = !text || /^[×+✓✔✎]+$/.test(text) || button.getAttribute('data-size')?.startsWith('icon') || button.getAttribute('data-testid') === 'emoji-option'
    if (!iconOnly) continue
    const label = button.getAttribute('aria-label')
    expect(label, button.outerHTML).toBeTruthy()
    expect(label).not.toMatch(/^(Send|Copy|Play|Organize|Archive|Unarchive|Permanently|Color|Close|Open|Clear|Change|Remove|Edit|Add|Choose|Browse|End|Application menu|Red|Blue|Green|Orange|Yellow|Purple|Pink|Gray|Teal)\b/)
    if (button.title) expect(button.title).toBe(label)
  }
}
const surfaces: [string, () => ReactElement][] = [
  ['sidebar', () => <Sidebar entries={entries} selection={{ kind: 'filter', filter: 'all' }} onSelect={noop} locale="vi" />],
  ['note list', () => <NoteList {...buildNoteListProps({ entries }).props} />],
  ['editor chrome', () => <BreadcrumbBar entry={entry} locale="vi" wordCount={0} showDiffToggle diffMode={false} diffLoading={false} onToggleDiff={noop} onToggleInspector={noop} onToggleRaw={noop} onToggleFavorite={noop} onToggleNoteWidth={noop} onRevealFile={noop} />],
  ['properties', () => <DynamicPropertiesPanel entry={entry} content="" frontmatter={{ Status: 'Active', tags: ['QA'] }} locale="vi" onAddProperty={noop} onUpdateProperty={noop} onDeleteProperty={noop} />],
  ['add property', () => <AddPropertyForm locale="vi" onAdd={noop} onCancel={noop} vaultStatuses={[]} />],
  ['view filters', () => <FilterBuilder group={{ all: [{ field: 'title', op: 'contains', value: 'QA' }, { any: [{ field: 'status', op: 'equals', value: 'Active' }] }] }} availableFields={['title', 'status']} onChange={noop} />],
  ['selection actions', () => <BulkActionBar count={2} onOrganize={noop} onArchive={noop} onDelete={noop} onClear={noop} />],
  ['quick open', () => <QuickOpenPalette open entries={entries} locale="vi" onSelect={noop} onClose={noop} />],
  ['search', () => <SearchPanel open entries={entries} vaultPath="/qa" onSelectNote={noop} onClose={noop} />],
  ['status menu', () => <StatusDropdown value="Active" vaultStatuses={['Active']} onSave={noop} onCancel={noop} />],
  ['tags menu', () => <TagsDropdown selectedTags={['QA']} vaultTags={['QA']} onToggle={noop} onClose={noop} />],
  ['note icon', () => <NoteIcon icon="rocket" />],
  ['color picker', () => <AccentColorPicker selectedColor="blue" onSelectColor={noop} />],
  ['editable URL', () => <UrlValue value="https://example.com" isEditing={false} onSave={noop} onCancel={noop} onStartEdit={noop} />],
  ['editable tags', () => <TagPillList label="tag" items={['QA']} onSave={noop} />],
  ['legacy home', () => <HomePage entries={entries} stats={{ totalXp: 0, streak: 0, lastStudyDate: null, dailyGoal: 20, todayReviews: 0, todayCorrect: 0, todayXp: 0, todayDurationMs: 0, heatmap: [], combo: 0 }} level={1} currentLevelXP={0} nextLevelXP={100} onStartReview={noop} onNavigate={noop} onUpdateDailyGoal={noop} locale="vi" />],
  ['legacy decks', () => <DecksPage entries={entries} onStartStudyDeck={noop} locale="vi" />],
  ['AI chrome', () => <><AiPanelHeader agentLabel="QA" agentReadiness="ready" locale="vi" permissionMode="default" permissionModeDisabled={false} onPermissionModeChange={noop} onClose={noop} onNewChat={noop} /><AiPanelComposer entries={entries} agentLabel="QA" agentReadiness="ready" locale="vi" input="" inputRef={createRef<HTMLDivElement>()} isActive={false} onChange={noop} onSend={noop} /></>],
]
it.each(surfaces)('F-005 rendered sweep: %s has named buttons and localized icon labels', (_name, view) => { mount(view()); scan() })
it('F-005 scans the populated Pulse surface', async () => { mount(<PulseView vaultPath="/qa" locale="vi" />); await waitFor(() => expect(screen.getByText('Bản lưu QA')).toBeInTheDocument()); scan() })
it('F-005 scans status swatches after opening the color palette', () => { mount(<StatusDropdown value="Active" vaultStatuses={['Active']} onSave={noop} onCancel={noop} />); fireEvent.click(screen.getByTestId('status-color-swatch-Active')); scan() })
it('F-005 scans filtered emoji choices without treating English catalog names as localized labels', () => { mount(<EmojiPicker onSelect={noop} onClose={noop} />); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'rocket' } }); expect(screen.getAllByTestId('emoji-option').length).toBeGreaterThan(0); scan() })

it('F-005 scans the shared dialog close icon in Vietnamese', () => { mount(<Dialog open><DialogContent><DialogTitle>Tùy chỉnh</DialogTitle></DialogContent></Dialog>); scan() })
