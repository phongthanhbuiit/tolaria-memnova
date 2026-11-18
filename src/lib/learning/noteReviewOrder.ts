export type NoteReviewFrontOrder = 'mnemonic' | 'article'

export function noteReviewFrontOrder(value: unknown): NoteReviewFrontOrder {
  return value === 'article' ? 'article' : 'mnemonic'
}
