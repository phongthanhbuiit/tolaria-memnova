import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { BackupPanel } from './BackupPanel'
const { workspace } = vi.hoisted(() => ({ workspace: { root:'/qa',client:{listBackups:vi.fn(),verifyBackup:vi.fn(),createBackup:vi.fn(),restoreBackup:vi.fn()},flush:vi.fn(),openLibrary:vi.fn() } }))
vi.mock('./LearningContext',()=>({useLearningWorkspace:()=>workspace}))
const descriptor={id:'backup-1',createdAt:Date.now(),fileCount:2,bytes:200,libraryId:'lib'}
beforeEach(()=>{
 vi.clearAllMocks();workspace.root='/qa'
 workspace.client.listBackups.mockResolvedValue([{id:descriptor.id,descriptor,error:null}])
 workspace.client.verifyBackup.mockResolvedValue(descriptor)
 workspace.client.restoreBackup.mockResolvedValue({path:'/qa-restored'})
 workspace.flush.mockResolvedValue(undefined);workspace.openLibrary.mockResolvedValue(undefined)
})
it('discovers old backups after remount and verifies before restoring into a new Library',async()=>{
 const view=render(<BackupPanel locale="en" />)
 await screen.findByRole('combobox',{name:'Backup history'})
 expect(screen.getByRole('button',{name:'Restore backup',exact:true})).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'Verify backup',exact:true}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'Restore backup',exact:true})).toBeEnabled())
 fireEvent.click(screen.getByRole('button',{name:'Restore backup',exact:true}))
 await waitFor(()=>expect(workspace.openLibrary).toHaveBeenCalledWith('/qa-restored'))
 view.unmount();render(<BackupPanel locale="en" />)
 await screen.findByRole('combobox',{name:'Backup history'})
 expect(workspace.client.createBackup).not.toHaveBeenCalled()
 expect(screen.getByRole('button',{name:'Restore backup',exact:true})).toBeDisabled()
})
it('does not show a late old-Library catalog after a switch',async()=>{
 let resolve!:(value:unknown)=>void
 workspace.client.listBackups.mockReturnValueOnce(new Promise(done=>{resolve=done})).mockResolvedValueOnce([])
 const view=render(<BackupPanel locale="en" />)
 workspace.root='/other';view.rerender(<BackupPanel locale="en" />)
 await screen.findByText('No backups yet.')
 resolve([{id:descriptor.id,descriptor,error:null}])
 await waitFor(()=>expect(screen.queryByRole('combobox')).not.toBeInTheDocument())
})
it('a corrupt entry cannot be verified or restored',async()=>{
 workspace.client.listBackups.mockResolvedValue([{id:'bad',descriptor:null,error:'Corrupt manifest'}])
 render(<BackupPanel locale="en" />)
 await screen.findByRole('combobox')
 fireEvent.click(screen.getByRole('combobox'))
 fireEvent.click(screen.getByRole('option'))
 expect(screen.getByRole('button',{name:'Verify backup',exact:true})).toBeDisabled()
 expect(screen.getByRole('button',{name:'Restore backup',exact:true})).toBeDisabled()
})
