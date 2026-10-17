import { describe, expect, it } from 'vitest'
import { areAiFeaturesEnabled } from './aiFeatures'

describe('areAiFeaturesEnabled', () => {
  it('keeps optional AI off until the user explicitly enables it', () => {
    expect(areAiFeaturesEnabled(undefined)).toBe(false)
    expect(areAiFeaturesEnabled({ ai_features_enabled: null })).toBe(false)
    expect(areAiFeaturesEnabled({ ai_features_enabled: true })).toBe(true)
    expect(areAiFeaturesEnabled({ ai_features_enabled: false })).toBe(false)
  })
})
