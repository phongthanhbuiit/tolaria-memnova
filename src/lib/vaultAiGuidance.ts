import { getLocaleDateLocale, translate, type AppLocale } from './i18n'
import type { VaultEntry } from '../types'

export type VaultAiGuidanceFileState = 'checking' | 'managed' | 'missing' | 'broken' | 'custom'

export interface VaultAiGuidanceStatus {
  agentsState: VaultAiGuidanceFileState
  claudeState: VaultAiGuidanceFileState
  geminiState: VaultAiGuidanceFileState
  canRestore: boolean
}

type RawVaultAiGuidanceStatus = Partial<{
  agents_state: VaultAiGuidanceFileState | null
  claude_state: VaultAiGuidanceFileState | null
  gemini_state: VaultAiGuidanceFileState | null
  can_restore: boolean | null
}>

const GUIDANCE_FILENAMES = new Set(['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'])

export function createCheckingVaultAiGuidanceStatus(): VaultAiGuidanceStatus {
  return {
    agentsState: 'checking',
    claudeState: 'checking',
    geminiState: 'checking',
    canRestore: false,
  }
}

function normalizeFileState(value: string | null | undefined): VaultAiGuidanceFileState {
  switch (value) {
    case 'managed':
    case 'missing':
    case 'broken':
    case 'custom':
      return value
    default:
      return 'checking'
  }
}

export function normalizeVaultAiGuidanceStatus(
  payload: RawVaultAiGuidanceStatus | null | undefined,
): VaultAiGuidanceStatus {
  return {
    agentsState: normalizeFileState(payload?.agents_state),
    claudeState: normalizeFileState(payload?.claude_state),
    geminiState: normalizeFileState(payload?.gemini_state),
    canRestore: payload?.can_restore === true,
  }
}

export function isVaultAiGuidanceStatusChecking(status: VaultAiGuidanceStatus): boolean {
  return status.agentsState === 'checking'
    || status.claudeState === 'checking'
    || status.geminiState === 'checking'
}

export function vaultAiGuidanceNeedsRestore(status: VaultAiGuidanceStatus): boolean {
  if (!status.canRestore || isVaultAiGuidanceStatusChecking(status)) return false
  return status.agentsState === 'missing'
    || status.agentsState === 'broken'
    || status.claudeState === 'missing'
    || status.claudeState === 'broken'
    || status.geminiState === 'missing'
    || status.geminiState === 'broken'
}

export function vaultAiGuidanceUsesCustomFiles(status: VaultAiGuidanceStatus): boolean {
  return status.agentsState === 'custom'
    || status.claudeState === 'custom'
    || status.geminiState === 'custom'
}

function isMissingOrBroken(state: VaultAiGuidanceFileState): boolean {
  return state === 'missing' || state === 'broken'
}

function getBrokenGuidanceSummary(status: VaultAiGuidanceStatus, locale: AppLocale): string | null {
  if (isMissingOrBroken(status.agentsState)) return translate(locale, 'ai.guidance.agentsBroken')
  if (isMissingOrBroken(status.claudeState)) return translate(locale, 'ai.guidance.claudeBroken')
  if (status.geminiState === 'missing') return translate(locale, 'ai.guidance.geminiMissing')
  if (status.geminiState === 'broken') return translate(locale, 'ai.guidance.geminiBroken')
  return null
}

export function getVaultAiGuidanceSummary(status: VaultAiGuidanceStatus, locale: AppLocale = 'en'): string {
  if (isVaultAiGuidanceStatusChecking(status)) return translate(locale, 'ai.guidance.checking')
  const brokenSummary = getBrokenGuidanceSummary(status, locale)
  if (brokenSummary) return brokenSummary
  const customNames = [
    status.agentsState === 'custom' ? 'AGENTS.md' : null,
    status.claudeState === 'custom' ? 'CLAUDE.md' : null,
    status.geminiState === 'custom' ? 'GEMINI.md' : null,
  ].filter((name): name is string => name !== null)
  if (!customNames.length) return translate(locale, 'ai.guidance.ready')
  const files = new Intl.ListFormat(getLocaleDateLocale(locale), { type: 'conjunction' }).format(customNames)
  return translate(locale, 'ai.guidance.custom', { files })
}

export function buildVaultAiGuidanceRefreshKey(entries: VaultEntry[]): string {
  return entries
    .filter((entry) => GUIDANCE_FILENAMES.has(entry.filename))
    .map((entry) => `${entry.path}:${entry.modifiedAt ?? 0}:${entry.fileSize}`)
    .sort()
    .join('|')
}
