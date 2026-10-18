# ADR 0161: Startup backup recovery without a current Store

Status: Accepted

## Context

Store::open correctly rejects an existing Library whose database is missing. The backup UI previously required a connected Store, so that guard also prevented discovery of the backups needed to recover. A failed restore with an invalid backup identity could create an empty destination container before validation.

## Decision

Separate BackupReader, containing only a canonical root and the existing validated Library manifest identity, from the current SQLite connection. Store backup APIs delegate catalog/verification/restore to this same reader; snapshot creation still requires the Store and its consistent online database snapshot. Reuse the existing manifest, checksum, metadata-path, database/version, binding/journal and foreign-key validators.

Expose Library-bound listRecoveryBackups/verifyRecoveryBackup/restoreRecoveryBackup before Store initialization. Catalog discovery may read the existing identity without a caller identity; verify and restore require that identity, and stale/wrong identities fail. Requests accept no arbitrary restore target. Verification never initializes or repairs the unavailable current database. Restore validates before creating a destination container, revalidates the archive and publishes only a fresh child under .memnova/restores. Original files/database and archive files remain untouched.

The recovery client learns its owner from catalog discovery, rejects stale catalog responses and never calls describe/connect. Error screens in the dashboard and note learning tab expose the existing backup panel using this reader; snapshot creation is unavailable without a normal client. Verification remains explicit before restore. Opening the restored Library uses the existing Library-switch/flush guards. No migration state is forced ready and no legacy card is converted by reconnecting.

## Consequences

No schema, dependency, scheduler or source-format change. A valid existing Library manifest is required; missing-manifest handling is a separate corruption case and must not invent an identity. Browser recovery remains a text-model simulation; real filesystem/SQLite command tests prove missing/corrupt-current-database behavior, original/archive bytes and mtimes, exact restored database bytes and retained card/schedule values. Native end-to-end UI acceptance remains M23. This closes the startup integration deferred by the UI checkpoint in ADR0160.
