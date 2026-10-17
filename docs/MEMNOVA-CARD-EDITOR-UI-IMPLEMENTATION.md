# Card editor UI implementation ledger

Plan: MEMNOVA-CARD-EDITOR-UI-PLAN.md. Starting commit: 9ac824b8, main clean. User authorized the complete U00–U08 run. Dependencies may use committed locally verified checkpoints during this full run; DONE requires normal push. No subagents, schema/API/scheduler/dependency changes.

| Task | Status | Evidence |
|---|---|---|
| U00 | Verified, push pending | 85 learning tests/28 files passed in 13.21s. Browser baseline: 24 Add/Edit × Basic/Vocabulary × light/dark × 1280/768/480 screenshots and computed styles, one scenario passed in 15.6s. /tmp/memnova-card-ui-evidence; /tmp/memnova-u00-{baseline,measure}.log. |
| U01 | Verified, push pending | Scoped typography; 24 browser captures/assertions: textarea 14px/400 and select 32px stable at all breakpoints. Global primitives unchanged. /tmp/memnova-u01-measure.log. |
| U02 | TODO | |
| U03 | TODO | |
| U04 | TODO | |
| U05 | TODO | |
| U06 | TODO | |
| U07 | TODO | |
| U08 | TODO | |

Before: CodeScene not run (optional integration unavailable); existing thresholds unchanged. Native baseline screenshots from the preceding release are historical only; this run's native QA is pending. No UI copy change or analytics event in U00. Planning/baseline only, no production code changes.

U00 actual CSS: root14px/devicePixelRatio1. Desktop textarea12.25px/17.5px/500 vs narrow14px/21px/500; controls12.25px/31.5px height, title15.75px. U01 explicitly normalizes form-only roles; native/comparison calibration continues in U07.
