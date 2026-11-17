// Real renderer components with local callbacks; no AI/network or Library writes.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Link, X } from '@phosphor-icons/react'
import { Button } from '../../src/components/ui/button'
import { TooltipProvider } from '../../src/components/ui/tooltip'
import { AiPanelHeader } from '../../src/components/AiPanelChrome'
import { AiMessage } from '../../src/components/AiMessage'
import { WikilinkPropertyField } from '../../src/components/WikilinkPropertyField'
import '../../src/index.css'
import '../../src/App.css'

const sizes = ['default', 'md', 'xs', 'sm', 'lg', 'toolbar', 'study-grade', 'study-reveal', 'icon', 'icon-xs', 'icon-sm', 'icon-md', 'icon-lg', 'icon-inline'] as const
export function Fixture() {
  const [dark, setDark] = useState(false)
  const [action, setAction] = useState('None')
  const [link, setLink] = useState('[[Lesson]]')
  return <TooltipProvider><main className="grid gap-6 bg-background p-6 text-foreground">
    <h1>R-02 native component fixture</h1>
    <Button size="sm" onClick={() => { document.documentElement.dataset.theme = dark ? 'light' : 'dark'; setDark(!dark) }}>Switch theme</Button>
    <section aria-label="Button sizes" className="flex flex-wrap items-start gap-4">{sizes.map(size => <div key={size} className="grid justify-items-center gap-2"><span>{size}</span><Button size={size} aria-label={size}><X size={16} /></Button></div>)}</section>
    <section aria-label="AI panel" className="max-w-lg border border-border">
      <AiPanelHeader agentLabel="Local QA" agentReadiness="ready" targetKind="api_model" permissionMode="safe" permissionModeDisabled={false} onPermissionModeChange={() => {}} onNewChat={() => setAction('New chat')} onClose={() => setAction('Close AI')} />
      <AiMessage userMessage="Renderer fixture only" messageId="qa" actions={[]} response="A local response for testing compact actions." onRegenerate={() => setAction('Regenerate')} onFork={() => setAction('Fork')} />
    </section>
    <section aria-label="Wikilink property" className="max-w-lg"><WikilinkPropertyField id="qa-link" label="Related" icon={Link} value={link} placeholder="Add note" onAdd={() => {}} onRemove={() => { setLink(''); setAction('Remove link') }} /></section>
    <output aria-live="polite">Last action: {action}</output>
  </main></TooltipProvider>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
