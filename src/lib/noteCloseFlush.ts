/** One canonical note writer per webview. Library changes invalidate an in-flight close. */
let current: { flush: () => Promise<void> } | undefined

export function registerNoteCloseFlush(flush: () => Promise<void>): () => void {
  const registration = { flush }
  current = registration
  return () => { if (current === registration) current = undefined }
}

export async function flushRegisteredNoteChanges(): Promise<void> {
  const registration = current
  await registration?.flush()
  if (current !== registration) throw new Error('Note context changed while saving')
}
