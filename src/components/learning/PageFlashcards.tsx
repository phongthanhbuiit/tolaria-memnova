import type { AppLocale } from '../../lib/i18n'
import { useLearningWorkspace } from './LearningContext'
import { LegacyPageFlashcards } from './LegacyPageFlashcards'
import { NoteLearningPanel } from './NoteLearningPanel'

export { LegacyPageFlashcards } from './LegacyPageFlashcards'
export function PageFlashcards(props: { path: string; locale: AppLocale }) {
  const workspace = useLearningWorkspace()
  return workspace?.client?.supportsNoteMemory && workspace.phase === 'ready'
    ? <NoteLearningPanel key={`${workspace.client.libraryId}:${props.path}`} path={props.path} locale={props.locale} />
    : <LegacyPageFlashcards path={props.path} locale={props.locale} />
}
