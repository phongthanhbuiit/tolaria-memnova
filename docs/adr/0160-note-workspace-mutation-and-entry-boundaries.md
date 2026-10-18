# ADR 0160: Note workspace mutations and default entry boundaries

Status: Accepted

## Context

The note-memory backend and editor queue exist independently from the legacy card dashboard. Opening an ordinary note must not register or enable it. Inactive property actions cannot fall back to a generic write for configured/bound notes. Conversion/recovery can change files while a clean editor tab still holds the preceding source; refreshing that source must not overwrite a newer local draft.

## Decision

Compatible ready clients load syncNoteWorkspace and retain legacy cards separately. New study defaults to the notes lane; old-card actions explicitly choose legacy. Folder scopes use filesystem path boundaries and an explicit nested-folder choice, never Markdown links. Keep the original UI for older clients and for import/setup. Preserve old-card viewing, editing, suspension and trash recovery; hide standalone new/clone card creation in the compatible default workspace.

Use NoteWorkspaceMutations for explicit enable/pause and inactive properties. Resolve an active NoteEditorPersistence first; inactive notes instantiate the same coordinator. Retain uncertain immutable requests, including replay before a newly pending state blocks competing writers. Root disposal deactivates cached writers. Scope property fallback by normalized Library path; an ordinary property lookup reads without assigning identities. Only explicit enable/identity preparation performs guarded backup-first registration. Existing legacy memory requires conversion choices rather than implicit reuse.

Keep a bound note on the canonical editor path even if raw editing removes its learning configuration. Preserve the identity utility's /tmp versus /private/tmp equivalence for ownership and registration. Native hash/revision checks remain authoritative.

Flush all open notes in the current Library before conversion/backup operations. Conversion and recovery reload only clean open sources in that Library, with exact preceding-source guards before updating tabs. A closed tab is never recreated and a later draft is never replaced. Initial conversion preview and Cancel do not register UUIDs; a separate preparation action rechecks the full conversion/source fingerprint before registration, then reloads preview and requires fresh explicit choices. A possibly committed registration is reported as partial if refresh fails.

Refresh readiness on panel/dashboard entry and after external watcher updates, in addition to the existing periodic refresh. Do not scan the Library for every body keystroke or canvas pointer event. Flush and refresh before starting study so the queue reflects the saved faces. Source writes still use the existing coordinator; source refresh is a guarded read, not a second autosave engine.

## Consequences

No new schema, dependency, scheduling algorithm or hidden canvas file. The local back remains in its Markdown file; linked back selection retains its prior contract. New telemetry uses categorical lane/stage and numeric enable flags, with no note content, UUID or path. Label reuses the installed radix-ui primitive through the shadcn/ui component pattern. Browser file-backed QA proves the default renderer/text-model flow; native Tauri/SQLite acceptance remains M23. M20 startup recovery before Store-open and the final acceptance tasks remain explicitly tracked rather than implied complete by this UI checkpoint.
