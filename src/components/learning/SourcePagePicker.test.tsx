import { fireEvent, render, screen, waitFor, act, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SourcePagePicker } from './SourcePagePicker'
import { makeEntry } from '../../test-utils/noteListTestUtils'
const { state }=vi.hoisted(()=>({state:{workspace:{root:'/a',client:{vaultPath:'/a',ensurePage:vi.fn()},entries:[] as ReturnType<typeof makeEntry>[],pages:[],flush:vi.fn(),refresh:vi.fn()}}}))
vi.mock('./LearningContext',()=>({useLearningWorkspace:()=>state.workspace}))
vi.mock('./SourcePagePreview',()=>({SourcePagePreview:()=>null}))
vi.mock('../BlockNoteReadOnly',()=>({BlockNoteReadOnly:({content}:{content:string})=><div>{content}</div>}))
it('selects duplicate titles with keyboard by path and ignores an old Library response',async()=>{
 let finish!:(page:unknown)=>void
 const oldClient={vaultPath:'/a',previewNoteSource:vi.fn(async(path:string)=>({pageId:null,path,face:'front',content:'Article',sourceHash:'a'.repeat(64),fingerprint:'b'.repeat(64),media:[],hasBack:false,backLinked:false})),ensurePage:vi.fn(()=>new Promise(resolve=>{finish=resolve}))}
 state.workspace={root:'/a',client:oldClient,entries:[makeEntry({path:'/a/one.md',title:'Same'}),makeEntry({path:'/a/two.md',title:'Same'}),makeEntry({path:'/elsewhere/secret.md',title:'Same'})],pages:[],flush:vi.fn().mockResolvedValue(undefined),refresh:vi.fn()}
 const change=vi.fn(),busy=vi.fn()
 const {rerender,unmount}=render(<SourcePagePicker value={null} locale="en" disabled={false} onChange={change} onBusyChange={busy} />)
 const input=screen.getByLabelText('Answer page')
 fireEvent.change(input,{target:{value:'Same'}})
 expect(screen.queryByText('/elsewhere/secret.md')).not.toBeInTheDocument()
 fireEvent.keyDown(input,{key:'ArrowDown'});fireEvent.keyDown(input,{key:'ArrowDown'});fireEvent.keyDown(input,{key:'Enter'})
 const dialog=await screen.findByRole('dialog')
 const apply=within(dialog).getByRole('button',{name:'Use source',exact:true})
 await waitFor(()=>expect(apply).toBeEnabled());fireEvent.click(apply)
 await waitFor(()=>expect(oldClient.ensurePage).toHaveBeenCalledWith('two.md','a'.repeat(64)))
 expect(busy).toHaveBeenLastCalledWith(true)
 state.workspace={...state.workspace,root:'/b',client:{vaultPath:'/b',ensurePage:vi.fn()},entries:[]}
 rerender(<SourcePagePicker value={null} locale="en" disabled={false} onChange={change} onBusyChange={busy} />)
 await act(async()=>finish({id:'old',path:'two.md',title:'Same',available:true}))
 expect(change).not.toHaveBeenCalled();expect(busy).toHaveBeenLastCalledWith(false)
 unmount()
})
it('does not flush, register or change a source merely by selecting it and cancelling',async()=>{
 const client={vaultPath:'/a',ensurePage:vi.fn().mockResolvedValue({id:'new',path:'source.md',title:'Source',available:true}),previewNoteSource:vi.fn().mockResolvedValue({pageId:null,path:'source.md',face:'front',content:'Source',sourceHash:'a'.repeat(64),fingerprint:'b'.repeat(64),hasBack:false,backLinked:false,media:[]})}
 state.workspace={root:'/a',client,entries:[makeEntry({path:'/a/source.md',title:'Source'})],pages:[],flush:vi.fn().mockResolvedValue(undefined),refresh:vi.fn()}
 const change=vi.fn()
 render(<SourcePagePicker value={null} locale="en" disabled={false} onChange={change} />)
 const input=screen.getByLabelText('Answer page')
 fireEvent.change(input,{target:{value:'Source'}})
 fireEvent.keyDown(input,{key:'ArrowDown'});fireEvent.keyDown(input,{key:'Enter'})
 await act(async()=>{await Promise.resolve()})
 expect(client.ensurePage).not.toHaveBeenCalled()
 expect(state.workspace.flush).not.toHaveBeenCalled()
 const dialog=await screen.findByRole('dialog')
 fireEvent.click(within(dialog).getByRole('button',{name:'Cancel',exact:true}))
 expect(change).not.toHaveBeenCalled()
 expect(client.ensurePage).not.toHaveBeenCalled()
})
