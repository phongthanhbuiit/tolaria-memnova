# Memnova sổ triển khai học thuộc trang ghi chú

Plan: [nghiệp vụ và dữ liệu](MEMNOVA-NOTE-MEMORY-PLAN.md). Task: [M00 đến M25](MEMNOVA-NOTE-MEMORY-TASKS.md).

Ngày lập: 2026-10-18. Baseline source đối chiếu: `88ae677a`. **Đây là bàn giao kế hoạch, không phải báo cáo đã triển khai. Tất cả task dưới đây chưa bắt đầu.** Task M00 phải lấy HEAD/toolchain/baseline mới khi thực thi.

| Task | Trạng thái | Commit đã push | Bằng chứng và giới hạn |
|---|---|---|---|
| M00 | DONE | 855ea883 | Baseline122 frontend/92 Rust; fixture test, final93 learning Rust; production20 samples; Codacy0; pre-commit54 smoke/4.6m; pre-push4585 tests, frontend86.51% lines, Rust hook86.97% lines (excludes lib/main/menu),54 smoke/4.7m. Push8m40s passed, remote SHA verified. Native NOT RUN. See baseline report. |
| M01 | DONE | 4072540b; pushed fef27504 | 50 codec tests;72 focused including legacy;144 learning tests; final types/lint/related pre-commit pass. Shared28 parse+7 patch vectors. Codacy reviewed one false Medium/one Minor, no Critical/High; ADR0147/docs. See M01 baseline. Batch push after M03. |
| M02 | DONE | ca6d912a,b71dbad8; pushed fef27504 | Native3 tests cover37 shared vectors; frontend52;96 Rust learning pass; clippy/rustfmt pass. Main Codacy one Minor/no Medium+, CRLF fix scan0. Pre-commit passed, batch push pending. |
| M03 | DONE | fef27504 | Additive schema5, four new native tests;100 learning+64 focused frontend pass, types/clippy/fmt pass. Codacy reviewed advisories/no CriticalHigh; ADR0148/docs; normal batch push pending. See M03 baseline. |
| M04 | DONE | 7a2209af | Native coordinator;11 focused and111 learning tests pass; clippy/fmt pass; Codacy no Medium+/6 reviewed Minor. Hash/revision/replay/crash/compaction preservation; see M04 baseline. Pushed98e31147; batch gates below. |
| M05 | DONE | 086d56bd | Native note lifecycle;15 new cases/126 learning pass, clippy/fmt pass. No new Medium+/security findings; existing pages advisory reviewed. Source/history/identity and missing-database guards; see M05 baseline. UI/watcher dispatch staged M06–M20. |
| M06 | DONE | cb4160ca | Typed note IPC/client/browser QA; six real command cases, all1139 Rust unit tests/3ignored pass; types/lint/clippy; reviewed Codacy2Medium/21Minor, no lint/security/CriticalHigh. Config exact replay, bound/pending/rename/missing-DB guards; see M06 baseline. Pre-commit passed; pushed98e31147. |
| M07 | DONE | 95aed8a0 | Live faces/source/media fingerprints;1153 native and90 focused frontend pass; see M07 baseline. Normal pre-commit4662 frontend/1153 Rust passed; batch push pending. |
| M08 | DONE | 98e31147 | Seven real-file backup tests/150 learning pass; typed binding/journal validation, old1–4 restore and root-move preservation. See M08 baseline; committed/pushed98e31147. |
| M09 | DONE | 7f223d38 | Read-only DB/WAL/source preview;9 native domain+1 command cases,159 learning/7 IPC/14 focused frontend pass. See M09 baseline. Normal commit/batch push pending. |
| M10 | DONE | 1e055d09,b6584766 | Explicit backup-first apply/resume/compatibility;13 native domain cases,1184 unit/22 focused frontend pass; normal pre-commit passed; batch push pending. See M10 baseline. |
| M11 | DONE | 0082af91 + UI checkpoint | Core recovery178 module/9 IPC; UI10 tests, browser mouse/text-model QA; baseline m11. Normal batch push pending. |
| M12 | DONE | 77d107c3 batch release | Normal push passed9m8s; frontend4730/87.11%lines, native1194+1integration/3ignored, hook87.62%lines,54smoke4.6m. Native M14 proof in baseline. |
| M13 | DONE | 77d107c3 batch release | Normal push passed9m8s; frontend4730/87.11%lines, native1194+1integration/3ignored, hook87.62%lines,54smoke4.6m. Native M14 proof in baseline. |
| M14 | DONE | 77d107c3 batch release | Normal push passed9m8s; frontend4730/87.11%lines, native1194+1integration/3ignored, hook87.62%lines,54smoke4.6m. Native M14 proof in baseline. |
| M15 | IN_PROGRESS | M06,M12–M14 DONE | Focused baseline and canonical face/save regressions. |
| M16 | NOT_STARTED | — | — |
| M17 | NOT_STARTED | — | — |
| M18 | NOT_STARTED | — | — |
| M19 | NOT_STARTED | — | — |
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
