import { Sparkle } from '@phosphor-icons/react'
import type { VaultEntry } from '../types'
import type { NoteReference } from '../utils/ai-context'
import { InlineWikilinkInput } from './InlineWikilinkInput'

interface CommandPaletteAiModeProps {
  entries: VaultEntry[]
  value: string
  claudeCodeReady: boolean
  aiAgentReady?: boolean
  aiAgentLabel?: string
  inputRef?: React.RefObject<HTMLDivElement | null>
  onChange: (value: string) => void
  onSubmit: (text: string, references: NoteReference[]) => void
}

function stripLeadingSpace(value: string): string {
  return value.startsWith(' ') ? value.slice(1) : value
}

export function CommandPaletteAiMode({
  entries,
  value,
  claudeCodeReady,
  aiAgentReady,
  aiAgentLabel = 'Claude Code',
  inputRef,
  onChange,
  onSubmit,
}: CommandPaletteAiModeProps) {
  const resolvedAiAgentReady = aiAgentReady ?? claudeCodeReady

  return (
    <InlineWikilinkInput
      entries={entries}
      value={value}
      inputRef={inputRef}
      onChange={onChange}
      onSubmit={(text, references) => onSubmit(stripLeadingSpace(text), references)}
      submitOnEmpty={true}
      placeholder={`Ask ${aiAgentLabel}...`}
      dataTestId="command-palette-ai-input"
      editorClassName="border-none px-0 py-0 text-(length:--text-body-lg) leading-(--text-body-lg--line-height)"
      suggestionListVariant="palette"
      paletteHeader={(
        <div className="mb-2 flex items-center gap-2 text-(length:--text-caption) leading-(--text-caption--line-height) font-medium uppercase tracking-[0.08em] text-muted-foreground">
          <Sparkle size={12} weight="fill" />
          <span>Ask {aiAgentLabel}</span>
        </div>
      )}
      paletteEmptyState={(
        <div className="px-4 py-6 text-center text-(length:--text-body) leading-(--text-body--line-height) text-muted-foreground">
          {!resolvedAiAgentReady ? (
            `${aiAgentLabel} is not available on this machine.`
          ) : (
            <>
              <div className="mb-1 font-medium text-foreground">Ask {aiAgentLabel}</div>
              <div>
                {value.trim().length === 0
                  ? 'Type your prompt after the leading space.'
                  : 'Type [[ to insert a note reference inline.'}
              </div>
            </>
          )}
        </div>
      )}
      paletteFooter={(
        <div className="flex items-center gap-4 border-t border-border px-4 py-1.5 text-(length:--text-caption) leading-(--text-caption--line-height) text-muted-foreground">
          <span>{aiAgentLabel} mode</span>
          <span>↵ send</span>
          <span>esc close</span>
        </div>
      )}
    />
  )
}
