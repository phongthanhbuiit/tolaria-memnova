import { invoke } from '@tauri-apps/api/core'
import type { CardDraft, LearningCard, LibraryDescriptor } from './types'

/** A connection is bound to both the validated folder and persistent UUID. */
export class LearningClient {
  private constructor(readonly vaultPath: string, readonly libraryId: string) {}

  static async connect(vaultPath: string): Promise<LearningClient> {
    const descriptor = await invoke<LibraryDescriptor>('learning_command', {
      vaultPath, libraryId: null, request: { kind: 'describe' },
    })
    if (!descriptor || descriptor.schemaVersion !== 1 || !descriptor.libraryId) {
      throw new Error('Unsupported learning database')
    }
    return new LearningClient(vaultPath, descriptor.libraryId)
  }

  private call<T>(request: Record<string, unknown>): Promise<T> {
    return invoke<T>('learning_command', { vaultPath: this.vaultPath, libraryId: this.libraryId, request })
  }

  listCards(pageId: string | null = null, includeTrashed = false): Promise<LearningCard[]> {
    return this.call({ kind: 'listCards', pageId, includeTrashed })
  }

  createCard(pageId: string, draft: CardDraft): Promise<LearningCard> {
    return this.call({ kind: 'createCard', pageId, draft })
  }

  updateCard(cardId: string, revision: number, draft: CardDraft): Promise<LearningCard> {
    return this.call({ kind: 'updateCard', cardId, revision, draft })
  }

  cloneCard(cardId: string): Promise<LearningCard> {
    return this.call({ kind: 'cloneCard', cardId })
  }
}
