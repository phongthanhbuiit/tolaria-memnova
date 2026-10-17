import { expect, it } from 'vitest'
import { learningPageScope } from './pageScope'
import type { LearningPage } from './types'
import type { VaultEntry } from '../../types'
it('includes a lesson own cards along with descendants without pulling in unrelated lessons', () => {
  const pages: LearningPage[] = ['root', 'child', 'unrelated'].map(id => ({ id, path: `${id}.md`, title: id, available: true, createdAt: null, modifiedAt: null }))
  const entries = pages.map(page => ({ path: `/library/${page.path}`, filename: page.path, title: page.title, aliases: [], belongsTo: page.id === 'child' ? ['[[root]]'] : [] })) as unknown as VaultEntry[]
  expect(learningPageScope('root', '/library', pages, entries)).toEqual(['root', 'child'])
  expect(learningPageScope('unrelated', '/library', pages, entries)).toEqual(['unrelated'])
})
