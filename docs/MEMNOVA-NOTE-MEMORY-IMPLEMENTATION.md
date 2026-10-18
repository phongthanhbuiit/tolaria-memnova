# Memnova sổ triển khai học thuộc trang ghi chú

Plan: [nghiệp vụ và dữ liệu](MEMNOVA-NOTE-MEMORY-PLAN.md). Task: [M00 đến M25](MEMNOVA-NOTE-MEMORY-TASKS.md).

Ngày lập: 2026-10-18. Baseline source đối chiếu: `88ae677a`. DONE là hoàn thành phạm vi task và push, không có nghĩa toàn bộ nghiệp vụ đã mở cho người dùng. M19–M25 vẫn chưa hoàn tất. Bảng dưới ghi trạng thái triển khai thực tế; VERIFIED_LOCAL chưa phải hoàn tất hoặc đã phát hành. Các giới hạn kiểm chứng được ghi trong từng baseline.

| Task | Trạng thái | Commit đã push | Bằng chứng và giới hạn |
|---|---|---|---|
| M00 | DONE | 855ea883 | Baseline122 frontend/92 Rust; fixture test, final93 learning Rust; production20 samples; Codacy0; pre-commit54 smoke/4.6m; pre-push4585 tests, frontend86.51% lines, Rust hook86.97% lines (excludes lib/main/menu),54 smoke/4.7m. Push8m40s passed, remote SHA verified. Native NOT RUN. See baseline report. |
| M01 | DONE | 4072540b; pushed fef27504 | 50 codec tests;72 focused including legacy;144 learning tests; final types/lint/related pre-commit pass. Shared28 parse+7 patch vectors. Codacy reviewed one false Medium/one Minor, no Critical/High; ADR0147/docs. See M01 baseline. Batch push after M03. |
| M02 | DONE | ca6d912a,b71dbad8; pushed fef27504 | Native3 tests cover37 shared vectors; frontend52;96 Rust learning pass; clippy/rustfmt pass. Main Codacy one Minor/no Medium+, CRLF fix scan0. Pre-commit passed, batch push pending. |
| M03 | DONE | fef27504 | Additive schema5, four new native tests;100 learning+64 focused frontend pass, types/clippy/fmt pass. Codacy reviewed advisories/no CriticalHigh; ADR0148/docs; pushed fef27504. See M03 baseline. |
| M04 | DONE | 7a2209af | Native coordinator;11 focused and111 learning tests pass; clippy/fmt pass; Codacy no Medium+/6 reviewed Minor. Hash/revision/replay/crash/compaction preservation; see M04 baseline. Pushed98e31147; batch gates below. |
| M05 | DONE | 086d56bd | Native note lifecycle;15 new cases/126 learning pass, clippy/fmt pass. No new Medium+/security findings; existing pages advisory reviewed. Source/history/identity and missing-database guards; see M05 baseline. UI/watcher dispatch staged M06–M20. |
| M06 | DONE | cb4160ca | Typed note IPC/client/browser QA; six real command cases, all1139 Rust unit tests/3ignored pass; types/lint/clippy; reviewed Codacy2Medium/21Minor, no lint/security/CriticalHigh. Config exact replay, bound/pending/rename/missing-DB guards; see M06 baseline. Pre-commit passed; pushed98e31147. |
| M07 | DONE | 95aed8a0 | Live faces/source/media fingerprints;1153 native and90 focused frontend pass; see M07 baseline. Normal pre-commit4662 frontend/1153 Rust passed; pushed98e31147. |
| M08 | DONE | 98e31147 | Seven real-file backup tests/150 learning pass; typed binding/journal validation, old1–4 restore and root-move preservation. See M08 baseline; committed/pushed98e31147. |
| M09 | DONE | 7f223d38 | Read-only DB/WAL/source preview;9 native domain+1 command cases,159 learning/7 IPC/14 focused frontend pass. See M09 baseline; normal verified batch pushed90256f36. |
| M10 | DONE | 1e055d09,b6584766 | Explicit backup-first apply/resume/compatibility;13 native domain cases,1184 unit/22 focused frontend pass; normal pre-commit passed; batch pushed90256f36. See M10 baseline. |
| M11 | DONE | 0082af91 + UI checkpoint | Core recovery178 module/9 IPC; UI10 tests, browser mouse/text-model QA; baseline m11. Batch pushed90256f36; UI entry intentionally still awaits M20. |
| M12 | DONE | 77d107c3 batch release | Normal push passed9m8s; frontend4730/87.11%lines, native1194+1integration/3ignored, hook87.62%lines,54smoke4.6m. Native M14 proof in baseline. |
| M13 | DONE | 77d107c3 batch release | Normal push passed9m8s; frontend4730/87.11%lines, native1194+1integration/3ignored, hook87.62%lines,54smoke4.6m. Native M14 proof in baseline. |
| M14 | DONE | 77d107c3 batch release | Normal push passed9m8s; frontend4730/87.11%lines, native1194+1integration/3ignored, hook87.62%lines,54smoke4.6m. Native M14 proof in baseline. |
| M15 | DONE | 0a1bfc8d | Canonical editor, scoped persistence/projection;143 targeted tests,411 verified pre-commit tests/43files, browser8.3s. Native checkpoint completed; normal batch push c8c71603 passed. |
| M16 | DONE | 81bce958,a1cededc | Read-only native source preview; explicit guarded registration/config queue. 5 real IPC cases; UI pre-commit305 tests/32files and browser9.7s; 18locales/957keys. Native checkpoint completed; normal batch push c8c71603 passed. |
| M17 | DONE | b27e1144 | 11 native lifecycle cases,44 focused frontend; normal pre-commit4797 frontend/464files,1210Rust/3ignored, browser9.8s; normal batch push c8c71603 passed. |
| M18 | DONE | 678c5826,c8c71603 | Canonical property writes, readonly schedule/raw metadata;4816frontend/1216Rust verified hook; actual native property/width/two-face/source Cancel/link/inline/restart proof,419 vault tests. Normal batch push c8c71603 passed. |
| M19 | IN_PROGRESS | Not committed | M07/M15/M16 dependencies DONE. Initial audit3REDs fixed;65module tests/3real-renderer browser cases pass; uncommitted pending normal hook. Existing whole-app integration baseline failure carried to M22. |
| M20 | NOT_STARTED | — | — |
| M21 | NOT_STARTED | — | — |
| M22 | NOT_STARTED | — | — |
| M23 | NOT_STARTED | — | — |
| M24 | NOT_STARTED | — | — |
| M25 | NOT_STARTED | — | — |

Trạng thái dùng: NOT_STARTED, IN_PROGRESS, VERIFIED_LOCAL, BLOCKED_WITH_EVIDENCE, DONE. VERIFIED_LOCAL là code đã commit và test tại local, chưa phải hoàn tất hoặc releasable. Khi user giao toàn bộ đợt, dependency có thể dùng checkpoint VERIFIED_LOCAL có commit và evidence thật; chỉ đổi DONE sau normal push thành công. Khi giao một task riêng, dependency phải DONE. Không có trạng thái “DONE nhưng chưa test/push”.

## Mẫu ghi kết quả mỗi task

```text
Task:
Starting HEAD và dependency commits:
Working tree trước task:
Phạm vi thực hiện và contract được giữ:
Baseline command / exit / số test / thời gian:
Regression RED (với bug) và GREEN:
Các test module/legacy/integration/native đã chạy:
File/table preservation evidence và mutation dự kiến:
CodeScene before/after hoặc NOT RUN kèm lý do:
Codacy tools, paths, new/baseline severity và Medium disposition:
Localization keys/targets/method/validation hoặc no UI copy changes:
PostHog events/safe fields hoặc lý do không cần event:
ADR/docs cập nhật:
Coverage/release hook kết quả thực:
Evidence artifact paths và screenshots đã xem:
Giới hạn / NOT RUN / lỗi có sẵn:
Commit và normal push thành công:
Demo dirt và owned QA process cleanup:
Task kế tiếp đủ dependency:
```

## Bằng chứng của lượt lập kế hoạch

- Chỉ tạo ba tài liệu này; không thay application code, schema, dependency, hook hoặc Library dữ liệu.
- Source đọc: parser hai mặt, editor/flush, tldraw snapshot/assets, note properties, SQLite card/source/session/backup/migration và AGENTS hiện hành.
- 28 test splitter/durable Markdown/whiteboard pass ở lượt đánh giá ngay trước kế hoạch; không dùng kết quả đó để đánh dấu M00 hoặc task implementation DONE.
- CodeScene: NOT RUN, docs-only; integration tùy chọn không được dùng để ngăn lập kế hoạch. Codacy/coverage/native/l10n runtime: không chạy lại cho tài liệu này; không có UI copy hoặc production behavior thay đổi.
- Kiểm tra cấu trúc tài liệu: PASS, đủ 26 task với mục tiêu/nghiệm thu và 26 trạng thái NOT_STARTED; dependency graph không vòng lặp; đủ 12 integration cases; local document/source links tồn tại; code fences cân bằng và không trailing whitespace.
- Kết quả kiểm tra cấu trúc tài liệu và commit/push của lượt lập kế hoạch được báo ở phần bàn giao; không tự điền SHA chưa tồn tại.

## M01–M03 batch release evidence

Normal `git push origin main` succeeded at fef27504 (9m3s gate). 4638 frontend tests/437 files, lines86.58% (statements83.08%); build/lint/types pass. Rust1104 unit tests plus1 integration pass,3 ignored; hook coverage87.09% lines with its existing lib/main/menu exclusions. Unexcluded final coverage remains M25, not claimed here. Core smoke54 pass (4.6m); CodeScene NOT RUN optional unavailable. M03 pre-commit2751 related frontend tests and100 Rust learning tests pass. Codacy SQL attempt: analyzer selected0 files, SQL scan NOT APPLICABLE (not a claimed security pass); SQLite constraints are verified through real database tests. Final new binding reader scan has one reviewed Minor, no Medium+. Demo dirt empty, remote/local SHA matched after push. Logs archived under /tmp/memnova-note-memory-evidence/m03/.

M06 normal pre-commit: full frontend4659 tests/440files pass121.62s; Rust1139 pass/3ignored36.92s. Commitcb4160ca; batch push still pending M08.

## M04–M08 batch release evidence

Normal push98e31147 passed9m5s: lint/build/types,4662 frontend tests/441files, frontend86.78% lines (83.22% statements),1160 Rust unit tests+1integration/3ignored, hook Rust87.36% lines (existing lib/main/menu exclusions),54smoke/4.6m. CodeScene NOT RUN optional unavailable. Remote/local SHA matched, working tree/demo dirt empty. M08 normal pre-commit150 learning tests passed4.97s. Evidence:/tmp/memnova-note-memory-evidence/m08/. M25 unexcluded coverage/native QA still required; this is not completion of the whole plan.

M09 normal pre-commit:4664 frontend tests/442files pass137.52s;1170 Rust unit tests pass/3ignored42.48s. Commit7f223d38; batch push follows M11.

M10 API normal pre-commit: full frontend passed (see archived log);1184 Rust unit tests pass/3ignored51.76s. Commitb6584766; native core1e055d09. Codacy reviewed one63-line behavioral command test plus existing dispatcher/false browser span; no new security/CriticalHigh. Batch push follows M11.

## M09–M11 batch release evidence

Normal push90256f36 succeeded10m42s: build/lint/types,4682 frontend tests/445files, frontend86.85% lines/83.09% statements;1191 native unit tests+1integration pass/3ignored; hook Rust87.61% lines with existing lib/main/menu exclusions. Core smoke54 pass4.9m, under5m. CodeScene NOT RUN optional unavailable. Remote/local90256f367cf711ff50b8c43036152fd24b3f5923 match, tree/demo dirt clean. Conversion/recovery UI stays staged until M20. M11 UI pre-commit4682 tests passed194.16s. Evidence:/tmp/memnova-note-memory-evidence/m11/. Final unexcluded coverage and native GUI are still required later.

M12 commit31baa8cf normal pre-commit308 tests/39files pass32.35s. M13 uses this committed local dependency; normal batch push follows M14.

M13 commita16cf2cf normal pre-commit256 related tests/29files pass43.09s. M14 native QA added real-store/schema/whole-Tauri-URL/buffered-event and desktop-menu regressions that also harden M12/M13 before the batch push.

## M12–M14 batch release evidence

Normal push77d107c35e095f1aa15641503422057655ee34f1 succeeded9m8s.4730 frontend tests,87.11%lines/83.33%statements;1194 Rust unit tests+1integration pass,3ignored; hook Rust87.62%lines with existing lib/main/menu exclusions.54core smoke pass4.6m; lint/types/build pass. CodeScene NOT RUN optional credentials unavailable. Codacy25paths reviewed,no newCritical/High/security findings. Remote/local SHA matched and working tree/demo dirt empty. M14 verified commit77d107c3:294frontend/35files,181learning,4browser tests. Evidence:/tmp/memnova-note-memory-evidence/m14/. M25 unexcluded Rust coverage and remaining M15–M25 acceptance still required.

M15 normal verified commit0a1bfc8d:411 related frontend tests/43files pass, types/lint pass; browser1pass8.3s. No Rust production change in this task. Native combined checkpoint and normal batch push pending M18; no claim of full-plan completion.

M16 UI normal verified commit a1cededc:305 frontend tests/32files, lint/types,1 browser test9.7s,18catalogs/957keys pass. Native API core81bce958 previously passed5 real IPC cases and full1199 Rust unit tests. CodeScene NOT RUN optional integration unavailable. Batch push/native integrated checkpoint pending M18.


## M15–M18 batch release evidence

Normal push c8c71603095dbd0d322ff48a1347bd9c6cbaf655 succeeded9m51s:4816frontend/468files,87.25%lines/83.44%statements;1216Rust/3ignored,hook87.63%lines;54core smoke4.7m;lint/types/build/clippy/format pass. Additional unexcluded cargo llvm-cov report --fail-under-lines85 succeeds86.62%lines, including lib/main/menu; final M25 command must still run after last changes. CodeScene NOT RUN optional unavailable. Codacy all changed code reviewed and native combined checkpoint with rebuilt backend/SQLite/byte proof recorded in M18 baseline. Remote/local match, working tree/demo dirt empty. Evidence /tmp/memnova-note-memory-evidence/m18/. Remaining M19–M25 are not complete.


## Kiểm toán tiến độ theo yêu cầu người dùng — 2026-10-19

Đối chiếu task M00–M25, code consumers, git local/remote và log thực; không chạy lại full suite chỉ để báo trạng thái. HEAD/remote cùng c8c71603095dbd0d322ff48a1347bd9c6cbaf655. Local có thay đổi M19 chưa commit, nên bằng chứng release c8c71603 không bao phủ working tree hiện tại.

| Nhóm | Kết luận sau đối chiếu | Việc còn lại |
|---|---|---|
| M00–M10 | Codec/binding/journal/backup/conversion backend đã commit/push và có regression evidence | Không dùng các pass này thay nghiệm thu end-to-end cuối đợt |
| M11 | Component chuyển đổi/phục hồi và tests đã push | NoteConversionDialog chưa được mount trong luồng app; integration thuộc M20, chưa được tuyên bố là sử dụng trọn vẹn |
| M12–M14 | Canvas flush, lỗi snapshot, portable media đã push; native subset có bằng chứng | Native toàn luồng sau default cutover vẫn thuộc M23 |
| M15–M18 | Editor, linked source, lifecycle và properties đã push c8c71603; native subset/SQLite/file proof | Giao diện bật/tắt mới và workspace mutations khi note không active thuộc M20; không coi M18 là đã thay mọi generic writer |
| M19 | Đang làm, chưa commit/push | LearningStudyView vẫn dùng card.front/card.back; chưa tiêu thụ note details/render status/media verification; thiếu return Article/hide front và shortcut guards |
| M20 | Chưa bắt đầu | Default note lane, legacy lane riêng, enable/disable/conversion/recovery entry, folder scope và inactive/bulk mutations |
| M21 | Chưa bắt đầu | Toàn bộ style/a11y/locales/width/zoom matrix; screenshots cũ chỉ là subset |
| M22 | Chưa bắt đầu | Full I01–I12/fault matrix; các edge cases/race đã ghi nhận là cần regression, chưa phải đã sửa |
| M23 | Chưa bắt đầu | Native end-to-end sau code cuối; các checkpoint M14/M18 không thay task này |
| M24 | Chưa bắt đầu | Đo lại performance/resource lifecycle so với M00 |
| M25 | Chưa bắt đầu | Final gates/scans/docs/commit/push sau các task còn lại |

Audit focused command: vitest run LearningStudyView.test.tsx/useLearningStudy.recovery.test.ts/verifiedNoteMedia.test.ts →20tests,17passed/3failed,3.48s. Ba failures là hợp đồng mới chưa hoàn thiện trong Study UI: live faces; revoke grade/render snapshot; shortcuts qua button/repeat. Retry receipt regression và3media mapping cases đã green, nhưng module media chưa tích hợp renderer. tsc -b passed. Changed-file ESLint initially failed1missing-effect-dependency warning in new test mock; this is current WIP, not an upstream failure or a release pass. Logs:/tmp/memnova-task-audit-{focused,types-build,lint}.log.

Nguyên nhân kéo dài: một số commit đổi IPC/shared CSS kích hoạt full pre-commit; push giữ full release gate9m51s, trong đó54core smoke4.7m. Native checkpoints tìm ra lỗi thật phải thêm regression/rebuild; có cả thời gian sửa fixture/launch QA. Quản lý tiến độ chưa tốt: row DONE vẫn chứa câu pending cũ và updates nói nhiều về kiểm tra hơn phần sản phẩm còn thiếu. Đã sửa các câu pending trong bảng hiện tại; các đoạn lịch sử bên dưới vẫn là lịch sử tại thời điểm commit. Không hạ gate, bỏ hook hoặc sửa kế hoạch để gọi phần thiếu là DONE.


M19 follow-through after audit: live note faces/readiness/shortcut regressions fixed,65module tests8.05s and3actual-renderer browser cases7.7s pass. A legacy whole-app integration failure at Add card reproduced on clean pushed HEAD as well; it remains explicitly unresolved for M22/M25. Current M19 changes still need normal commit and batch push before DONE. The initial audit's17pass/3fail is historical, not the latest module result.
