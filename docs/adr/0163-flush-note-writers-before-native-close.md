# ADR-0163: flush canonical note writers before normal native close and quit

Status: accepted. Date: 2026-10-19. Extends ADR0154; no storage/dependency change.

## Context

M23 reproduced lost text by pasting into a normal note and immediately pressing Cmd+Q. Neither native CloseRequested nor ExitRequested waited for editor debounce/autosave. M12's save/navigation tests did not cover process termination. A second regression showed that flushBeforeAction resolved successfully for a dirty note when its Library was unavailable.

## Decision

Veto normal native close/quit until every affected webview acknowledges a fresh canonical note flush. Window close waits for its owner; app quit waits for all existing webviews, including note windows and the AI workspace. Requests carry a transient UUID, and acknowledgements are bound to the implicit native caller label. Stale/duplicate/foreign acknowledgements cannot approve another request. A startup query retrieves an intent emitted before listeners mounted. No note text or paths cross this handshake.

The shared root boundary opens a modal before flushing, keeping editors mounted while preventing further input. MainApp registers its existing rich/raw producer flush followed by useAppSave.flushBeforeAction; no second serializer, source writer or autosave implementation is introduced. Registration lifetime follows Library ownership, so changing/unmounting the writer during an asynchronous save rejects close. Windows without a note writer acknowledge a no-op.

Any save failure, lost participant, bridge failure or 30-second timeout keeps windows open. Timeout never forces exit; a late save cannot approve a retry without a new flush. UI retains an error with Retry and Cancel. Native timers/listeners are disposed. Dirty notes with no active Library now reject flush instead of silently resolving. Clean notes retain their no-op behavior.

## Limits and verification

Use a regular native Quit menu item with the existing platform label and CmdOrCtrl+Q accelerator, calling AppHandle.exit. macOS's predefined Quit calls NSApp.terminate directly and bypasses ExitRequested; the native failing replay established this separately from the renderer writer tests. This protects Cmd+Q, app menu quit, window close and programmatic normal exits. Tauri's special restart exit cannot be vetoed by ExitRequestApi; Dock/system termination, OS force-kill/crash and updater relaunch are outside this normal-close guarantee. Existing explicit-save forms and unapplied conversion choices are not automatically submitted.

Regression evidence includes the original native lost-text fixture, targeted writer/session/domain tests, and a rebuilt native quick-quit replay after implementation. Final native acceptance is recorded in the M23 baseline, not inferred from browser mocks. SQLite schema, learning identities, schedules and note configuration stay unchanged. PostHog: no new event needed for this correctness fix; no note content is instrumented.
