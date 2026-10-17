import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SourcePagePicker } from './SourcePagePicker'
import { makeEntry } from '../../test-utils/noteListTestUtils'
const { state }=vi.hoisted(()=>({state:{workspace:{root:'/a',client:{vaultPath:'/a',ensurePage:vi.fn()},entries:[] as ReturnType<typeof makeEntry>[],pages:[],flush:vi.fn(),refresh:vi.fn()}}}))
vi.mock('./LearningContext',()=>({useLearningWorkspace:()=>state.workspace}))
vi.mock('./SourcePagePreview',()=>({SourcePagePreview:()=>null}))
it('selects duplicate titles with keyboard by path and ignores an old Library response',async()=>{
 let finish!:(page:unknown)=>void
 const oldClient={vaultPath:'/a',ensurePage:vi.fn(()=>new Promise(resolve=>{finish=resolve}))}
 state.workspace={root:'/a',client:oldClient,entries:[makeEntry({path:'/a/one.md',title:'Same'}),makeEntry({path:'/a/two.md',title:'Same'}),makeEntry({path:'/elsewhere/secret.md',title:'Same'})],pages:[],flush:vi.fn().mockResolvedValue(undefined),refresh:vi.fn()}
 const change=vi.fn(),busy=vi.fn()
 const {rerender,unmount}=render(<SourcePagePicker value={null} locale="en" disabled={false} onChange={change} onBusyChange={busy} />)
 const input=screen.getByLabelText('Answer page')
 fireEvent.change(input,{target:{value:'Same'}})
 expect(screen.queryByText('/elsewhere/secret.md')).not.toBeInTheDocument()
 fireEvent.keyDown(input,{key:'ArrowDown'});fireEvent.keyDown(input,{key:'ArrowDown'});fireEvent.keyDown(input,{key:'Enter'})
 await waitFor(()=>expect(oldClient.ensurePage).toHaveBeenCalledWith('two.md'))
 expect(busy).toHaveBeenLastCalledWith(true)
 state.workspace={...state.workspace,root:'/b',client:{vaultPath:'/b',ensurePage:vi.fn()},entries:[]}
 rerender(<SourcePagePicker value={null} locale="en" disabled={false} onChange={change} onBusyChange={busy} />)
 await act(async()=>finish({id:'old',path:'two.md',title:'Same',available:true}))
 expect(change).not.toHaveBeenCalled();expect(busy).toHaveBeenLastCalledWith(false)
 unmount()
})
