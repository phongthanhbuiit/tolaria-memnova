# M22 — integration and failure matrix

Starting HEAD9baccd37 main; M19–M21 VERIFIED_LOCAL, five commits ahead of remote c8c71603. Initial tree clean. M21 final hook4864frontend/481files133.99s,4browser59.0s pass. Native baseline cargo test --manifest-path src-tauri/Cargo.toml --lib learning:: -- --test-threads=1:206pass13.18s. CodeScene before NOT RUN optional unavailable. Relevant coordinator/conversion/source/storage ADRs0148–0161 reviewed; preserve schema5/scheduler/XP and raw user data. Bug fixes require failing regression before edits. Existing I01–I12 evidence will be rerun and mapped rather than equating browser mocks with SQLite/native QA.

## Native fault cycle 1

Five new behavioral regressions all failed before fixes (0pass/5fail,0.31s): missing manifest generated a replacement UUID before owner rejection; stale second-connection file_written/conflict checkpoint overwrote applied receipt; Serde inline unit variant ignored nested unknown fields; fresh conversion accepted nonfresh schedule values; healthy source previews failed on unrelated duplicate UUIDs.

Fixes: fail closed before identity creation when database/WAL/SHM survives without manifest; terminal receipt permits only identical replay or exact existing save compaction, and SQL checkpoint update compares prior phase/payload atomically; strict wire helper preserves inline JSON shape while rejecting unknown fields; fresh conversion compares every schedule field with existing fresh defaults, keeping its frozen due date but rejecting future due beyond intent time; note-only previews use per-UUID SourceCatalog matching while legacy strict importer remains unchanged. No schema or scheduler calculation changes.

GREEN5pass1.57s; complete native learning211pass14.11s; cargo clippy --lib --tests -- -D warnings and cargo fmt pass. Preservation assertions cover source bytes/mtime, exact applied journal, one card revision, retained cards/schedules/reviews/profile/raw properties and no source auto-enable. Two independent Store connections certify stale checkpoint protection; this is not a distributed filesystem transaction guarantee.

Codacy CLI11Rust paths:Opengrep0;Lizard15reviewed advisories (5Medium/10Minor). Test lengths express cross-table preservation; production length/complexity findings are existing store/conversion/codec regions with small guarded fixes. No new Critical/High/security findings. ESLint selected0Rust files (not an ESLint security pass). CodeScene NOT RUN optional unavailable. Localization:no UI copy changes. PostHog:no event needed for correctness guards. No ADR needed for bug fixes; architecture checkpoint note updated. Full fault matrix/native UI/performance/release still pending.

## Editor and integration cycle

Additional RED evidence: rich debounce discarded pending state after a thrown flush (reentrant scheduling also covered); resize cancel/unmount left window listeners that wrote dimensions after departure; file-replace had no upload-first override, while the installed tldraw default changes the pointer before upload; actual physical drag at125% zoom overshot40px by10px. Keyboard automatic-width resizing likewise mixed viewport and document pixels (900px measured at150% must become600px before adding8). The initial keyboard test used unsupported JSDOM style.zoom assignment; it was corrected to model CSSOM zoom, then rerun RED against the old calculation before the fix. GREEN30tests/4files2.18s.

A real filesystem/browser ordinary-note edit dropped the standalone back-marker comment. ADR0162 adds a hidden internal durable comment representation using the existing pipeline, not a new SQLite schema or on-disk format. Unit round-trip/fenced-literal checks pass. Actual browser ordinary edit retains the marker without UUID/config/learning; explicit raw removal survives return to rich mode and another edit/save (5.1s). Both configured-face and ordinary-note workspace flows pass together.

Canvas imports now intercept file-replace, upload a unique durable asset before pointer updates, preserve crop/geometry, batch the update, and ignore failed/stale/departed results. Rich flush keeps failed/reentrant drafts pending. Resize cleans pointermove/up/cancel on cancel/unmount/lifecycle changes and converts physical drag/automatic width through existing documentZoom. No snapshot/schema/ink algorithm changes.

Native indented-code media regression first failed by requiring missing.png from a code example. A bounded indentation context distinguishes standalone/tabbed code, paragraph continuations and list images; Native learning212pass13.46s before the final alias cases. Do not interpret this targeted scanner as a claim of full general HTML/CommonMark fidelity.

Real macOS public-command rename regression failed after case-only rename because SQLite registration treated the still-resolving old spelling as a second physical file. Existing canonical file paths now distinguish aliases from actual duplicate notes. Case-only and composed/decomposed Unicode renames preserve source bytes, binding/card ID and schedule. An intermediate Unicode test accidentally targeted an existing fixture source and correctly received a name collision; the fixture uses a distinct basename now. Duplicate-file rejection remains tested.

Explicit source Use always calls ensurePage. Extending the unrelated-duplicate regression exposed that ensurePage still invoked the strict whole-Library sync even after preview was fixed. Existing-ID registration now validates the selected UUID/path through SourceCatalog and syncs its unique entries; a selected duplicate still fails, and legacy sync_pages/import retains its strict contract. Source registration does not enable/review the reference.

Final native cargo test --lib learning:244pass15.83s, including real filesystem/SQLite command paths; clippy --lib --tests -- -D warnings and rustfmt pass. Types pass. Final full lint passes when run sequentially: an earlier parallel lint failed ENOENT because Playwright deleted test-results while ESLint walked it; this was orchestration/artifact contention, not a source defect. Do not run those two directory-walking operations in parallel.

Final actual-renderer integration15pass1.9m, zero retries: retained card edit/status/trash/clone fixture, whole-page answer, waiting/resume/undo/keyboard, backup reload/verify,378layout cases, coarse/contrast/focus, fullscreen/pointer zoom, live note Study and ordinary/raw marker preservation. Four additional file-backed editor/source/properties/delete browser cases pass21.0s with zero retries; none was added to curated smoke. Earlier retained-card tests assumed removed Add/Clone UI and the old mock Library. They now seed retained cards through the existing API in disposable fixtures and exercise the actual retained-card surface; creation is not advertised as a default UI action. A backup-reload check also needed to await the fixture's note-list initialization before navigating Home. These fixture failures are retained in logs, not presented as production fixes.

Codacy final23touched/new paths:ESLint0;Opengrep6baseline typed custom-component props-spread warnings;Lizard20reviewed advisories (7Medium/13Minor), chiefly existing source registration/renderer/test spans plus bounded new indentation logic. No new Critical/High/security finding. No rule suppressed. Localization:no UI copy changes. PostHog:no extra event needed for preservation/correctness fixes. CodeScene NOT RUN optional unavailable. ABI/schema/dependencies/scheduler/XP unchanged; ADR0162/ABSTRACTIONS updated. Demo dirt empty.

## I01–I12 checkpoint mapping

| Case | Verified evidence at this checkpoint | Separate remaining acceptance |
|---|---|---|
| I01 | Native workspace/lifecycle no-op guards; ordinary real-file marker/raw-removal browser flow, no UUID/config | Native GUI ordinary edit at M23 |
| I02 | Native binding/lifecycle/journal tests; configured two-face editor and default opt-in browser flow | Fresh native A4/image/drawing session and restart at M23 |
| I03 | Seven native interruption checkpoints; failed/reentrant flush, last-stroke producer tests; raw/face/save browser coverage | Mouse stroke→flip/navigation/quit/restart at M23 |
| I04 | Native source/face/media tests and IPC; actual source Cancel/link/inline browser flow; unrelated duplicate explicit registration fixed | Native moved/missing source UI at M23 |
| I05 | Native property queue/raw-value preservation; real-file opaque YAML and next-mnemonic save browser test | Native final properties/width observation at M23 |
| I06 | Native conversion same-goal reuse/fresh/conflict/retry/backup tests with table fingerprints | Native conversion UI at M23 |
| I07 | Native multi-card survivors/missing/trashed/whole-page tests; retained cards actual browser edit/status/restore/study | Retained M18 pending fixture native recovery at M23 |
| I08 | Native all checkpoints, replay/compaction/conflict, terminal receipt from independent connection, strict malformed config/fresh schedule | Native recovery UI interaction at M23 |
| I09 | Native fingerprints/media/grade/undo/legacy sessions; actual browser hide/reveal/return/rate/relearn/resume/undo | Real native grade/undo database manifest at M23 |
| I10 | Native public rename/move/clone/delete/pending guards and macOS case/Unicode alias regression; browser deletion flush | Native final lifecycle walkthrough at M23 |
| I11 | Native backup old versions/root move/portable media/SQLite/journal plus startup recovery real commands; browser verify gating/catalog reload | Native new-root and missing-database startup restore at M23 |
| I12 | 378layout cases plus computed contrast/focus/coarse/reduced motion; physical zoom resize and fullscreen/width return | Native WebKit observation at M23; hardware touch/screen reader NOT RUN |

All these are task-scoped checkpoints, not a substitute for M23/M24/M25. Folder-tab suspicion was inspected: current navigation uses setSingleTab plus a flush boundary; no reachable unrelated dirty-tab loss was demonstrated. No multi-tab redesign added. Conversion readiness/media snapshots already compare the full ConversionSources on resume/commit; no change needed there. Do not leave speculative review notes labeled as confirmed bugs.

Final normal verified commit6ea806a8:368frontend/49files26.50s,213native learning15.31s and12changed integration tests1.8m pass; lint/types/format pass. No retries occurred and no hook was bypassed. Preceding native fault commit98ea525d passed211learning tests13.44s. Both commits are VERIFIED_LOCAL until normal batch push succeeds. Demo dirt clean.
