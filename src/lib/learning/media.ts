import { resolveNoteMediaUrl } from '../../utils/vaultImages'
export function learningMediaUrl(
  value: unknown,
  root: string,
  ownerPath?: string,
): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const raw = value.trim()
  if (
    /^[a-z][a-z\d+.-]*:/i.test(raw) &&
    !/^https?:\/\//i.test(raw) &&
    !/^asset:\/\//i.test(raw)
  )
    return null
  const path =
    !raw.includes('/') && !raw.includes('\\') ? `attachments/${raw}` : raw
  return resolveNoteMediaUrl(path, root, ownerPath)
}
