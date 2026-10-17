import { expect, it } from 'vitest'
import { areGitFeaturesEnabled } from './gitSettings'
it('keeps Git optional until explicitly enabled, preserving an existing opt-in', () => {
  expect(areGitFeaturesEnabled({ git_enabled: null })).toBe(false)
  expect(areGitFeaturesEnabled({})).toBe(false)
  expect(areGitFeaturesEnabled({ git_enabled: true })).toBe(true)
  expect(areGitFeaturesEnabled({ git_enabled: false })).toBe(false)
})
