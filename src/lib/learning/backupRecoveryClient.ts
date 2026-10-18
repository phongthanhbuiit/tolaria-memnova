import { learningInvoke } from './client'
import type { BackupCatalogEntry, BackupDescriptor } from './types'

/** Recovery never connects to, initializes or repairs the unavailable current Store. */
export class LibraryBackupRecoveryClient {
  private root: string
  private libraryId: string | null = null
  private read = 0
  constructor(root: string) {
    this.root = root.replace(/\/$/, '')
  }
  async listBackups(): Promise<BackupCatalogEntry[]> {
    if (!this.root) throw Error('missing-library-folder')
    const read = ++this.read
    const catalog = await learningInvoke<{
      libraryId: string
      backups: BackupCatalogEntry[]
    }>('learning_command', {
      vaultPath: this.root,
      libraryId: null,
      request: { kind: 'listRecoveryBackups' },
    })
    if (read !== this.read) throw Error('stale-backup-catalog')
    this.libraryId = catalog.libraryId
    return catalog.backups
  }
  private async call<T>(kind: string, backupId: string): Promise<T> {
    if (!this.libraryId) throw Error('backup-catalog-required')
    return learningInvoke<T>('learning_command', {
      vaultPath: this.root,
      libraryId: this.libraryId,
      request: { kind, backupId },
    })
  }
  verifyBackup(id: string): Promise<BackupDescriptor> {
    return this.call('verifyRecoveryBackup', id)
  }
  restoreBackup(id: string): Promise<{ path: string }> {
    return this.call('restoreRecoveryBackup', id)
  }
}
