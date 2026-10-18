import type { LearningClient } from './client'
import type { LearningPage, NoteSourcePreview } from './types'

export type SourceSelectionClient = Pick<
  LearningClient,
  'vaultPath' | 'previewNoteSource' | 'ensurePage'
>
export class SourceRegistrationError extends Error {
  readonly registrationAttempted: boolean
  constructor(error: unknown, registrationAttempted: boolean) {
    super(error instanceof Error ? error.message : String(error))
    this.registrationAttempted = registrationAttempted
  }
}
function sameSelection(
  current: NoteSourcePreview,
  selected: NoteSourcePreview
): boolean {
  return (
    current.path === selected.path &&
    current.face === selected.face &&
    current.fingerprint === selected.fingerprint
  )
}

/** Only an explicit Apply calls this function; preview and cancellation never register a page. */
export async function registerSelectedSource(
  client: SourceSelectionClient,
  selected: NoteSourcePreview,
  active: () => boolean
): Promise<LearningPage> {
  let registrationAttempted = false
  const requireActive = () => {
    if (!active()) throw Error('stale-source-selection')
  }
  try {
    requireActive()
    const current = await client.previewNoteSource(selected.path, selected.face)
    requireActive()
    if (
      !sameSelection(current, selected) ||
      current.sourceHash !== selected.sourceHash
    )
      throw Error('source-selection-changed')
    registrationAttempted = true
    const page = await client.ensurePage(selected.path, selected.sourceHash)
    requireActive()
    const registered = await client.previewNoteSource(page.path, selected.face)
    requireActive()
    if (
      !sameSelection(registered, selected) ||
      registered.pageId !== page.id ||
      (selected.pageId !== null && selected.pageId !== page.id)
    )
      throw Error('source-selection-changed-after-registration')
    return page
  } catch (error) {
    throw new SourceRegistrationError(error, registrationAttempted)
  }
}
