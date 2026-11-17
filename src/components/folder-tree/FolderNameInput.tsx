import { Folder } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { useSidebarInlineRenameInput } from '../sidebar/sidebarHooks'

interface FolderNameInputProps {
  ariaLabel: string
  initialValue: string
  placeholder: string
  leftInset?: number
  selectTextOnFocus?: boolean
  submitOnBlur?: boolean
  testId: string
  onCancel: () => void
  onSubmit: (value: string) => Promise<boolean> | boolean
}

export function FolderNameInput({
  ariaLabel,
  initialValue,
  placeholder,
  leftInset = 16,
  selectTextOnFocus = false,
  submitOnBlur = false,
  testId,
  onCancel,
  onSubmit,
}: FolderNameInputProps) {
  const {
    handleKeyDown,
    inputRef,
    setValue,
    submitValue,
    value,
  } = useSidebarInlineRenameInput({
    initialValue,
    onCancel,
    onSubmit,
    selectTextOnFocus,
  })

  return (
    <div className="flex items-center gap-2 rounded-md" style={{ paddingTop: 0, paddingBottom: 0, paddingRight: 16, paddingLeft: leftInset }}>
      <Folder size={16} className="size-4 shrink-0 text-muted-foreground" />
      <Input
        ref={inputRef}
        aria-label={ariaLabel}
        controlSize="sm" className="flex-1 px-2 text-body font-medium"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={submitOnBlur ? () => { void submitValue() } : undefined}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        data-testid={testId}
      />
    </div>
  )
}
