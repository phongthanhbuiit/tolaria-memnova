import { translate, type AppLocale } from '../lib/i18n'
import type { VaultEntry } from '../types'
import { slugifyNoteStem } from './noteSlug'

export function displayNoteTitle(entry: VaultEntry, locale: AppLocale): string {
  if (entry.hasH1 || (entry.fileKind && entry.fileKind !== 'markdown')) return entry.title

  const stem = entry.filename.match(/^(untitled-.+-\d+(?:-\d+)?)\.md$/i)?.[1]
  return stem && slugifyNoteStem(entry.title) === stem.toLocaleLowerCase()
    ? translate(locale, 'editor.untitledNote')
    : entry.title
}
