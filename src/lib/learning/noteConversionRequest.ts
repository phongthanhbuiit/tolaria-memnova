import type { ConversionBackChoice, ConversionFaceChoice, ConversionMemoryChoice, NoteConversionRequest } from './noteConversionTypes'
function fields(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid-conversion-request')
  const object = value as Record<string, unknown>
  if (Object.keys(object).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(object, key))) throw Error('invalid-conversion-fields')
  return object
}
function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw Error('invalid-conversion-identity')
  return value
}
function face(value: unknown): ConversionFaceChoice {
  if (value && typeof value === 'object' && 'kind' in value && value.kind === 'markdown') { fields(value, ['kind']); return { kind: 'markdown' } }
  const input = fields(value, ['kind', 'cardId'])
  if (input.kind !== 'card') throw Error('invalid-conversion-face')
  return { kind: 'card', cardId: uuid(input.cardId) }
}
function back(value: unknown): ConversionBackChoice {
  if (value && typeof value === 'object' && 'kind' in value && value.kind === 'inline') { const input = fields(value, ['kind', 'source']); return { kind: 'inline', source: face(input.source) } }
  const input = fields(value, ['kind', 'pageId', 'face'])
  if (input.kind !== 'page' || (input.face !== 'front' && input.face !== 'back')) throw Error('invalid-conversion-back')
  return { kind: 'page', pageId: uuid(input.pageId), face: input.face }
}
function memory(value: unknown): ConversionMemoryChoice {
  if (value && typeof value === 'object' && 'kind' in value && value.kind === 'fresh') { fields(value, ['kind']); return { kind: 'fresh' } }
  const input = fields(value, ['kind', 'cardId', 'confirmedSameGoal'])
  if (input.kind !== 'reuse' || input.confirmedSameGoal !== true) throw Error('confirm-same-learning-goal')
  return { kind: 'reuse', cardId: uuid(input.cardId), confirmedSameGoal: true }
}
/** Canonical field order makes browser receipt replay insensitive to JSON key order. */
export function parseNoteConversionRequest(value: unknown): NoteConversionRequest {
  const input = fields(value, ['operationId', 'pageId', 'expectedFingerprint', 'front', 'back', 'memory'])
  if (typeof input.expectedFingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(input.expectedFingerprint)) throw Error('invalid-conversion-fingerprint')
  return { operationId: uuid(input.operationId), pageId: uuid(input.pageId), expectedFingerprint: input.expectedFingerprint, front: face(input.front), back: back(input.back), memory: memory(input.memory) }
}
