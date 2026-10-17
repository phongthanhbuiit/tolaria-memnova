# Properties and answer sources implementation ledger

Plan: [N00–N17](./MEMNOVA-PROPERTIES-AND-SOURCES-PLAN.md). Starting checkout: `89fd0465` on main, clean. User authorized the full ordered implementation on 2026-10-18; the per-task stop instruction in the handoff prompt does not apply to this full run. A task is released only after its verified normal push. In this authorized full run, implementation dependencies are checked against local committed code and test evidence; normal pushes group related checkpoints. Pending tasks are not marked DONE before their checkpoint is pushed.

| Task | State | Evidence / commit |
|---|---|---|
| N00 | DONE | Frontend baseline 35/35; four expected failing review probes. Rust baseline rerun passed after cleaning regenerable build artifacts. Schema v2. /tmp/memnova-n00-{frontend,rust,probes}.log |
| N01 | DONE | 6c0e5fb4 pushed. ADR-0145 defines wire/storage/editor boundaries; docs-only, contract follows the plan. |
| N02 | DONE | 23ee018e. Three RED regressions, then 38/38 learning tests; metadata arrays/aliases preserved. /tmp/memnova-n02-{red,green,types,codacy}.log. No UI copy, schema, schedule or analytics change. |
| N03 | DONE | a3d052a9. RED UI/backend probes then 39 learning UI tests and card backend tests passed. Trash restores unchanged content to Draft; clone/edit bypass rejected. Browser fixture matches native. No new copy/schema/events. |
| N04 | DONE | e84c4422. Catalog reopen/corrupt/symlink/traversal tests and backup suite passed; the full commit hook exposed inherited GIT_AUTHOR/COMMITTER environment in Rust fixtures. A RED workflow regression now protects child-process identity isolation; ID-bound list/verify client tests. Catalog does not claim full verification. /tmp/memnova-n04-* |
| N05 | DONE | 72e50383. 3 component tests, 43 learning tests, browser catalog reload test 15.6s; four other learning flows passed separately. Native create/remount/discover/verify/fresh-directory restore passed; integrity ok, 4 cards/5 review rows/2 sessions preserved. 18 locales validated, Lara unavailable/manual translations. |
| N06 | Verified, push pending | 2f1e17b1. Schema v3 adds nullable source FK/index; old values/memory preserved. Backup-first v2 upgrade, reopen idempotence, failure rollback, same-Library reference and clone tests passed with the full learning backend module. Frontend/client types pass. /tmp/memnova-n06-* |
| N07 | Verified, push pending | ff5e7a44. Owner/source DTO split; linked fingerprints include path for media moves. Three lifecycle scenarios cover rename/replacement/missing/malformed/revival/duplicate identity and no implicit deck membership. Native learning module and 50 frontend learning tests passed. /tmp/memnova-n07-* |
| N08 | Verified, push pending | 81 learning backend tests and 51 frontend tests; source changes reject unseen ratings, committed lost-response requests replay once after source deletion/reopen, Undo restores memory, legacy receipts deserialize/replay. Optional answerFingerprint is retained exactly on frontend retries. /tmp/memnova-n08-* |
| N09 | TODO | |
| N10 | DONE | Six pure value tests cover unknown/falsy metadata, Gregorian dates, lossless conversion, stable references and prototype-key safety. RED/green/type/Codacy logs under /tmp/memnova-n10-*. No runtime/UI/schema change yet. |
| N11 | TODO | |
| N12 | TODO | |
| N13 | TODO | |
| N14 | TODO | |
| N15 | TODO | |
| N16 | TODO | |
| N17 | TODO | |

Evidence logs are outside source under /tmp/memnova-n*. No user Library is a fixture. CodeScene: not run (optional integration unavailable); thresholds unchanged. Initial probe file was removed from the checkout after the red run; the original is retained in the review evidence directory referenced by the plan.

Checkpoint 1 pushed a457ec16 through normal hooks: 4,537 frontend tests, 86.45% frontend lines; configured Rust coverage 86.87%, 1,077 passing unit tests and one integration (3 ignored); 54 smoke cases in 4.8m, total 8m56s. CodeScene unavailable/not run. This is release evidence for N02–N05/N10, not for the upcoming schema/source/property interfaces.
