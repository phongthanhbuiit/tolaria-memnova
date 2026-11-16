import type { MouseEvent as ReactMouseEvent, MouseEventHandler } from 'react'
import {
  Folder,
  FolderOpen,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { FolderNode } from '../../types'
import { useFolderRowInteractions } from './useFolderRowInteractions'

interface FolderItemRowProps {
  contentInset: number
  depthIndent: number
  isExpanded: boolean
  isSelected: boolean
  node: FolderNode
  onOpenMenu: (node: FolderNode, event: ReactMouseEvent<HTMLElement>) => void
  onSelect: () => void
  onStartRenameFolder?: (folderPath: string) => void
  onToggle: () => void
  canOpenMenu?: boolean
}

export function FolderItemRow({
  contentInset,
  depthIndent,
  isExpanded,
  isSelected,
  node,
  onOpenMenu,
  onSelect,
  onStartRenameFolder,
  onToggle,
  canOpenMenu = true,
}: FolderItemRowProps) {
  const hasChildren = node.children.length > 0
  const { handleRenameDoubleClick, handleSelectClick } = useFolderRowInteractions({
    hasChildren,
    onRenameFolder: onStartRenameFolder ? () => onStartRenameFolder(node.path) : undefined,
    onSelect,
    onToggle,
  })

  return (
    <div
      className={cn(
        'group relative flex min-w-0 items-center gap-1 rounded transition-colors',
        isSelected
          ? 'bg-[var(--accent-blue-light)] text-primary'
          : 'text-foreground hover:bg-accent',
      )}
      style={{ paddingLeft: depthIndent, borderRadius: 4 }}
    >
      <FolderSelectButton
        contentInset={contentInset}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        isSelected={isSelected}
        node={node}
        onClick={handleSelectClick}
        onContextMenu={(event) => {
          if (!canOpenMenu) {
            event.preventDefault()
            return
          }
          onSelect()
          onOpenMenu(node, event)
        }}
        onDoubleClick={handleRenameDoubleClick}
      />
    </div>
  )
}

function FolderSelectButton({
  contentInset,
  hasChildren,
  isExpanded,
  isSelected,
  node,
  onClick,
  onContextMenu,
  onDoubleClick,
}: {
  contentInset: number
  hasChildren: boolean
  isExpanded: boolean
  isSelected: boolean
  node: FolderNode
  onClick: (clickDetail: number) => void
  onContextMenu: MouseEventHandler<HTMLButtonElement>
  onDoubleClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-auto min-w-0 flex-1 justify-start gap-2 rounded text-left text-[13px] font-medium hover:bg-transparent',
            isSelected ? 'text-primary hover:text-primary' : 'text-foreground hover:text-foreground',
          )}
          style={{
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: contentInset,
            paddingRight: 16,
          }}
          aria-expanded={hasChildren ? isExpanded : undefined}
          onClick={(event) => onClick(event.detail)}
          onContextMenu={onContextMenu}
          onDoubleClick={onDoubleClick}
          data-testid={`folder-row:${node.path}`}
        >
          {isSelected || isExpanded ? (
            <FolderOpen size={17} weight="fill" className="size-[17px] shrink-0" />
          ) : (
            <Folder size={17} className="size-[17px] shrink-0" />
          )}
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" aria-hidden={!node.path || node.path === node.name} className="break-words">
        {node.path || node.name}
      </TooltipContent>
    </Tooltip>
  )
}
