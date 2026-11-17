// Real renderer controls; local drafts only, no AI/network or Library writes.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/tabs'
import { TooltipProvider } from '../../src/components/ui/tooltip'
import { AppPreferencesProvider } from '../../src/hooks/useAppPreferences'
import { WikilinkChatInput } from '../../src/components/WikilinkChatInput'
import { SearchPanel } from '../../src/components/SearchPanel'
import '../../src/index.css'
import '../../src/App.css'

export function Fixture() {
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState(false)
  return <AppPreferencesProvider locale="vi"><TooltipProvider><main className="grid gap-6 bg-background p-6 text-foreground">
    <Button onClick={() => setSearch(true)}>Search</Button>
    <Tabs defaultValue="note"><TabsList><TabsTrigger value="note">Note</TabsTrigger></TabsList><TabsContent value="note">Content</TabsContent></Tabs>
    <Input aria-label="Name" />
    <WikilinkChatInput entries={[]} value={draft} onChange={setDraft} onSend={() => {}} placeholder="Chat draft" />
    <SearchPanel open={search} vaultPath="/qa" entries={[]} onClose={() => setSearch(false)} onSelectNote={() => {}} />
  </main></TooltipProvider></AppPreferencesProvider>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
