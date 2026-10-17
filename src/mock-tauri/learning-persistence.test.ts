import { expect, it, vi } from 'vitest'
import { mockLearningCommand } from './learning'
import { makeEntry } from '../test-utils/noteListTestUtils'
it('keeps learning reads and unchanged source syncs free of storage writes', async () => {
  const root = '/qa/read-only-learning'
  const context = { read: async () => '# Lesson', entries: vi.fn().mockResolvedValue([makeEntry({ path: `${root}/lesson.md`, title: 'Lesson' })]) }
  const descriptor = await mockLearningCommand({ vaultPath: root, request: { kind: 'describe' } }, context) as { libraryId: string }
  const args = { vaultPath: root, libraryId: descriptor.libraryId }
  await mockLearningCommand({ ...args, request: { kind: 'syncPages' } }, context)
  const write = vi.spyOn(Storage.prototype, 'setItem')
  try {
    for (const kind of ['describe', 'migrationStatus', 'listPages', 'listCards', 'studyStats', 'syncPages']) await mockLearningCommand({ ...args, request: { kind } }, context)
    expect(write).not.toHaveBeenCalled()
    context.entries.mockResolvedValue([makeEntry({ path: `${root}/lesson.md`, title: 'Changed title' })])
    await mockLearningCommand({ ...args, request: { kind: 'syncPages' } }, context)
    expect(write).toHaveBeenCalledTimes(1)
  } finally { write.mockRestore() }
})
it('keeps property definitions with exact card retries, clones and page hint retries',async()=>{
 const root='/qa/properties-atomic';const context={read:async()=> '# Page',entries:async()=>[]}
 const descriptor=await mockLearningCommand({vaultPath:root,request:{kind:'describe'}},context) as {libraryId:string}
 const args={vaultPath:root,libraryId:descriptor.libraryId}
 const page=await mockLearningCommand({...args,request:{kind:'ensurePage',path:'page.md'}},context) as {id:string}
 const definitions={flag:{valueKind:'boolean'}}
 const draft={front:'Q',back:'A',answerMode:'inline',status:'active',position:0,properties:{flag:false},propertyDefinitions:definitions}
 const card=await mockLearningCommand({...args,request:{kind:'createCard',pageId:page.id,draft}},context) as {id:string;revision:number}
 const next={...draft,properties:{flag:true}}
 const request={...args,request:{kind:'updateCard',cardId:card.id,revision:0,draft:next}}
 await mockLearningCommand(request,context)
 expect(await mockLearningCommand(request,context)).toMatchObject({revision:1,propertyDefinitions:definitions})
 const clone=await mockLearningCommand({...args,request:{kind:'cloneCard',cardId:card.id}},context)
 expect(clone).toMatchObject({revision:0,propertyDefinitions:definitions,schedule:{reps:0}})
 const hints={...args,request:{kind:'setPagePropertyDefinitions',pageId:page.id,expected:{},definitions}}
 await mockLearningCommand(hints,context);expect(await mockLearningCommand(hints,context)).toEqual(definitions)
})
