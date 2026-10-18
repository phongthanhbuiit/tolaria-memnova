# Memnova sổ triển khai học thuộc trang ghi chú

Plan: [nghiệp vụ và dữ liệu](MEMNOVA-NOTE-MEMORY-PLAN.md). Task: [M00 đến M25](MEMNOVA-NOTE-MEMORY-TASKS.md).

Ngày lập: 2026-10-18. Baseline source đối chiếu: `88ae677a`. DONE bên dưới ghi checkpoint phạm vi task đã push, không có nghĩa toàn bộ nghiệp vụ đã mở cho người dùng. M23–M25 vẫn chưa hoàn tất. Các điều kiện nghiệm thu cần tích hợp lại (đặc biệt watcher M05 và inactive properties M18) được ghi trong [kiểm toán hiện tại](baselines/2026-10-19-note-memory-task-audit.md); không tính chúng là đã qua nghiệm thu toàn luồng. VERIFIED_LOCAL chưa phải hoàn tất hoặc đã phát hành.

| Task | Trạng thái | Commit đã push | Bằng chứng và giới hạn |
|---|---|---|---|
| M00 | DONE | 855ea883 | Baseline122 frontend/92 Rust; fixture test, final93 learning Rust; production20 samples; Codacy0; pre-commit54 smoke/4.6m; pre-push4585 tests, frontend86.51% lines, Rust hook86.97% lines (excludes lib/main/menu),54 smoke/4.7m. Push8m40s passed, remote SHA verified. Native NOT RUN. See baseline report. |
| M01 | DONE | 4072540b; pushed fef27504 | 50 codec tests;72 focused including legacy;144 learning tests; final types/lint/related pre-commit pass. Shared28 parse+7 patch vectors. Codacy reviewed one false Medium/one Minor, no Critical/High; ADR0147/docs. See M01 baseline. Batch push after M03. |
| M02 | DONE | ca6d912a,b71dbad8; pushed fef27504 | Native3 tests cover37 shared vectors; frontend52;96 Rust learning pass; clippy/rustfmt pass. Main Codacy one Minor/no Medium+, CRLF fix scan0. Pre-commit passed; batch push fef27504 succeeded. |
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
| M19 | DONE | fa3934f4; pushed35dfa19f | 65module tests8.05s; normal hook305tests/39files,3browser7.1s,18locales/962keys; M22 baseline integration issue explicitly retained. Normal batch pushed35dfa19f; full gates below. |
| M20 | DONE | d76f7d99,679f3c05,1e3514e1; pushed35dfa19f | Default note/legacy workspace, opt-in controls, scoped properties, conversion/recovery and startup backup reader implemented. Normal final hook4861frontend/481files,1228Rust/3ignored pass;274module frontend,206learning Rust,3real startup recovery,4browser12.9s pass. Normal batch pushed35dfa19f; native end-to-end M23–M25 remain. |
| M21 | DONE | 9baccd37; pushed35dfa19f | Normal hook4864frontend/481files133.99s;4browser59.0s including378layout cases and canvas keyboard/fullscreen;978keys/18catalogs. CodeScene NOT RUN. Normal batch pushed35dfa19f. |
| M22 | DONE | 98ea525d,6ea806a8; pushed35dfa19f | Final normal hook368frontend/49files26.50s,213native15.31s,12browser1.8m passed;244native learning/IPC,15integration zero retries +4file-backed browser cases,lint/types/clippy/Codacy pass. Normal batch pushed35dfa19f; M23–M25 not yet accepted. |
| M23 | VERIFIED_LOCAL | 1c27b64b,d3445c3f,f626ba63 | Native A4/both faces/media/last-stroke quit, failed-save retry/window close, linked move/missing, grade/undo, conversion conflict/reuse/fresh, retained journal and independent-root/missing/corrupt-DB restore passed with closed SQLite/hash proofs. Final recovery hook129tests/17files; baseline m23. Normal batch push remains M25. |
| M24 | IN_PROGRESS | M23 verified f626ba63 | Production baseline comparison and100/1000-shape resource measurements pending. |
| M25 | NOT_STARTED | — | — |

Trạng thái dùng: NOT_STARTED, IN_PROGRESS, VERIFIED_LOCAL, BLOCKED_WITH_EVIDENCE, DONE. VERIFIED_LOCAL là code đã commit và test tại local, chưa phải hoàn tất hoặc releasable. Khi user giao toàn bộ đợt, dependency có thể dùng checkpoint VERIFIED_LOCAL có commit và evidence thật; chỉ đổi DONE sau normal push thành công. Khi giao một task riêng, dependency phải DONE. Không có trạng thái “DONE nhưng chưa test/push”.

## Checkpoint kiểm toán trước M22 — 2026-10-19 (lượt kiểm tra lại)

Local HEAD `9baccd37`; remote `refs/heads/main` xác minh lại qua `git ls-remote` là `c8c71603095dbd0d322ff48a1347bd9c6cbaf655`. Năm commit M19–M21 chưa push (`fa3934f4`, `d76f7d99`, `679f3c05`, `1e3514e1`, `9baccd37`); M22 đang triển khai. Không lấy coverage/hook c8c71603 làm bằng chứng release của working tree.

Bảng task ở đầu tài liệu là nguồn trạng thái hiện hành duy nhất. Các mục batch release và audit cũ bên dưới là lịch sử, không phải danh sách việc hiện còn thiếu. M19 live faces và M20 default workspace/conversion/recovery đã có code tích hợp và local tests; chúng không còn là các implementation gap như tại lần audit đầu. M22–M25 vẫn chưa nghiệm thu.

Lần kiểm tra lại phát hiện lỗi báo cáo: snapshot cũ dùng HEAD fa3934f4, một bảng audit lịch sử bị cập nhật lẫn 4/5 cột, và đoạn M19 cũ vẫn nói “chưa commit”. Đã tách lịch sử khỏi trạng thái hiện tại. Kết quả M21 và các lỗi dữ liệu nghi vấn phải được xác minh riêng, không đánh dấu DONE chỉ vì sửa sổ tiến độ.

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


## Lịch sử audit đầu — 2026-10-19

Xem [báo cáo audit tại checkpoint c8c71603](baselines/2026-10-19-note-memory-task-audit.md). Khi đó M19 chưa hoàn thiện, conversion/recovery UI chưa được mount và default workspace vẫn dùng đường cũ. Đây là các thiếu sót thật ở checkpoint đó. M19–M20 đã tiếp tục triển khai sau audit, theo các commit và baseline trong bảng hiện hành; không đọc các kết luận lịch sử này như trạng thái của HEAD mới.

Nguyên nhân kéo dài được xác nhận: implementation/integration còn thiếu, cộng với nhiều lần chạy full hook do IPC/shared CSS, push khoảng 9–10 phút và rebuild native sau khi tìm được regression. Ngoài ra sổ tiến độ có đoạn lỗi thời gây cảm giác quay lại task cũ. Không bỏ hook hoặc đổi tiêu chí nghiệm thu để gọi phần còn thiếu là hoàn tất.

M19 normal verified commit fa3934f410309f81cf1bbacaca61a0970d244237:305related frontend/39files,3browser7.1s,lint/types/localization962keys passed. No hook bypass. Additional editor-resource case1pass645ms. Tree clean after commit; remote stillc8c71603 because the planned M19–M22 batch is not pushed yet. This is VERIFIED_LOCAL, not DONE or final release.

## M19–M22 normal batch release

Push35dfa19f succeeded8m53s:4871frontend/482files147.32s,87.33%lines/83.49%statements;1235Rustunit+1integration/3ignored;hook Rust87.69%lines with its existing exclusions.54core smoke4.6m;lint/types/build/clippy/format pass. CodeScene NOT RUN optional unavailable. Remote/localSHA match and tree/demo clean. M23 native final, M24 performance and M25 final unexcluded coverage/release remain required.
