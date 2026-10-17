---
type: ADR
id: "0139"
title: "Verified Library backup directories and fresh restores"
status: active
date: 2026-10-17
supersedes: null
---

## Context

SQLite cutover must be recoverable without losing legacy lesson content, schedules or media. Copying the main file of an open WAL database is incomplete. Restore must not overwrite another Library or follow paths supplied by an untrusted inventory.

## Decision

Create private backup directories under `.memnova/backups/<UUID>`. Use SQLite's online backup API, then convert only the detached snapshot to rollback-journal mode so it is a standalone database without live WAL/SHM files. Keep the source connection in WAL mode. Include the Library manifest, all regular content/media files and empty lesson folders; exclude `.git` internals and the live `.memnova` tree to avoid recursive backups. SHA-256 (`sha2` 0.10.9, already present transitively) records each file's exact bytes in a versioned inventory.

Check the database integrity, foreign keys, schema version, Library identity, content fingerprints and SQLite data version before publishing the backup. Reject symbolic links and concurrent source changes. Failed staging is removed automatically. Restore validates safe relative paths, metadata identities and checksums before copying into a temporary directory, verifies the copy, and publishes only to a fresh destination. Existing directories are never replaced. Native IPC restores only into an app-owned fresh directory inside the validated Library boundary; it does not accept an arbitrary destination path.

## Consequences

Backups preserve durable learning data and original UTF-8/CRLF Markdown and binary media. They are directories that can be copied with the Library rather than a new archive/export format. Symlink-based attachments require resolving their storage before backup; a failure is reported rather than silently omitting those files. The migration/import phase must preserve the available legacy review-log snapshot in its own recovery checkpoint before cutover. Backup verification proves integrity and identity consistency, not authenticity of a third-party archive.
