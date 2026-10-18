import { expect, it } from 'vitest'
import cases from '../../../tests/fixtures/note-memory/readiness-corpus.json'
import { usefulMemoryContent } from './noteMemoryReadiness'
it.each(cases)('$name', item => {
  if ('problem' in item) expect(() => usefulMemoryContent(item.source)).toThrow(item.problem)
  else expect(usefulMemoryContent(item.source)).toBe(item.useful)
})
