# Memnova — nghiệm thu sửa Undo và raw document

Ngày 2026-10-19. Baseline `878951f8`; runtime `8bc9f3ad`; final source/test release `d1613fac69e3817ffb30610ddb018195c5d40d5f`.

## Phạm vi

Theo yêu cầu “sửa fix này rồi push”, lượt này đóng F01 của `MEMNOVA-POST-UX-FOLLOWUP-PLAN.md` và hai lỗi trực tiếp tìm thấy khi kiểm tra save/native menu. Không đánh dấu toàn bộ R01–R06 đã xong: profiling smoke, matrix accessibility và điều kiện production rộng hơn vẫn là follow-up riêng.

- `2d8e7a35`: reset đúng state của History extension khi nạp/thay document; không ghi load thành Undo entry hoặc giữ history của note/mặt trước. Giữ document/selection/các plugin state khác, không remount cả editor hoặc patch dependency.
- `87836291`: raw input và raw flush của managed note đi qua `handleRawContentChange`; canonical document thấy đủ draft trước save/đổi mặt, tránh bản cũ quay lại sau raw exit.
- `8bc9f3ad`: menu Undo/Redo gửi tới keymap rich/CodeMirror khi contenteditable có focus. Native inputs vẫn dùng browser text history. Focus trong text luôn tiêu thụ lệnh, kể cả hết history, để không chạy nhầm Undo organization cấp app.

Same-document save acknowledgement/rerender và untitled auto-rename continuity giữ Undo/Redo. Khi document thực sự được thay, lịch sử text bắt đầu lại; không thêm kho Undo riêng cho từng note. Explicit rename nào đi qua replacement vẫn là boundary an toàn, chưa triển khai giữ history cho mọi kiểu rename. Markdown hai mặt, linked UUID, properties, schema5, scheduler và SDK/dependency giữ nguyên.

## TDD và kiểm tra cục bộ

- Helper với mounted BlockNote thật:7cases RED trước fix → GREEN, gồm load trống, A→B với old edits/redo, cùng path khác face, post-load Undo/Redo, blank/HTML/fallback. Log `/tmp/memnova-undo-{red,green}.log`.
- Hook với editor thật:3cases GREEN, gồm save/rerender, face/raw replacement và untitled auto-rename. Không mock replaceBlocks/undo. Log `/tmp/memnova-undo-{real-hook,rename}.log`.
- Raw browser regression: bản đã bật memorization qua UI vẫn không lưu raw addition (`/tmp/memnova-undo-browser2.log`, RED). Sau nối đúng canonical callbacks, A→B→A, hai mặt, rich/raw, Save/reload, opaque bigint và source file preservation pass. Lượt5tests gồm workspace cũ pass26.5s.
- Menu native phát hiện qua chuột: trước fix rich menu Undo không đổi text dù ⌘Z hoạt động. Unit thật3RED/1PASS →4GREEN; related orchestration/dispatcher/keyboard tổng89PASS. jsdom không có text-range geometry: fixture chỉ skip viewport scrolling, giữ nguyên keymaps/history, không bỏ unhandled errors.
- Normal commit hooks:141tests/10files12.60s;96tests/5files14.37s +2browser15.7s;58tests/5files11.72s +2browser16.9s. Browser cuối còn xác minh menu Undo/Redo trong cả rich và CodeMirror. Không gắn thêm @smoke cho matrix này.
- Lượt browser đầu phải sửa navigation của test quay về item đã virtualize; dùng Go Back thật. Một lượt development chạy giữa thay đổi wiring gặp temporary reference error, đã sửa trước commit; không dùng lượt đó làm evidence pass. Chỉ các lượt GREEN nêu trên được tính.

## Native và dữ liệu

Build production renderer + Tauri debug QA `net.memnova.qa.undo`, bundle `/tmp/memnova-undo-native/Memnova Undo QA.app`. Config và Library riêng tại `/tmp/memnova-undo-native`, analytics/git/AI tắt trong fixture; không đổi HOME hoặc Library/settings thật. Bản native cuối dùng source sau đó commit thành8bc9f3ad. CUA mouse trước rồi keyboard/menu; cửa sổ được Raise trước thao tác cần render readiness.

- Mở Undo Alpha→Undo+Save giữ bài; thêm text→⌘Z→⌘⇧Z→Save đúng; Alpha→Beta→Undo+Save vẫn Beta; Go Back→Alpha→Undo+Save vẫn Alpha đã lưu.
- Enable memorization trên Alpha fixture, Add mnemonic, nhập/lưu mặt sau; đổi Article→Undo+Save không đưa mnemonic vào article. Mở raw, thêm text vào mnemonic, Save, thoát raw và đổi mặt: giữ đầy đủ. Quit/reopen đọc lại article và raw addition.
- Native rebuild menu fix: Edit→Undo bỏ edit, Edit→Redo khôi phục edit ở rich và raw; cuối cùng Undo marker thử nghiệm và Save. Ảnh cuối đã xem `/tmp/memnova-undo-native/native-mnemonic-final.png`, AX receipt cùng tên `.ax.txt`.
- Snapshots chỉ đọc sau app đóng; từ chối WAL chưa checkpoint trước immutable read. Before/final19source/media files; chỉ `Undo Alpha.md` đổi đúng thao tác QA,18file còn lại (gồm Beta, linked source, board snapshots và attachments) cùng hash. Old cards/schedules/bindings3rows và reviews2rows giữ nguyên từng row; thêm đúng1card/schedule/binding cho Alpha được chủ động bật. Journal thêm các operation từ enable/add/edit; không grade thêm review. SQLite schema5, integrityok, FKcheck rỗng. JSON `/tmp/memnova-undo-native/{before,after-keyboard,final,data-checks}.json`.

Không thử last-stroke mới trong native lượt này; các board/source cũ giữ bytes, các test canvas hiện có trong full Vitest lane được release gate kiểm tra. Không gán lịch sử U11 thành QA mới.

## Release gates

| Gate | Kết quả thực chạy |
|---|---|
| Lint/types/build | Normal pre-push lint0warnings, `pnpm build` (tsc -b + Vite) pass. Native renderer + Tauri debug build pass riêng. |
| Frontend coverage | Normal hook `pnpm test:coverage --silent`: **4931tests/492files PASS**,148.41s; **87.37% lines**,83.54% statements,75.53% branches,85.08% functions; ≥70% pass. |
| Rust coverage | `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1`: **1240unit PASS/3ignored**,52.21s;1doc PASS; **86.38% lines**,exit0. Không thêm exclusions. Final push skip Rust lane đúng rule vì không có Rust source change; số này là lệnh riêng của lượt sửa này. |
| Core smoke | Final normal push **54/54PASS**, không retry/flaky; console4.6m. Phase đo monotonic **274.303533292s** gồm startup/runner/teardown, <300s. Không suy ra ba lượt benchmark R03 đã hoàn thành hoặc mọi máy đều đạt số này. |
| Localization | `pnpm l10n:validate`:18catalogs/990Englishkeys pass; no UI copy changes. |

Lượt source push đầu **FAIL**, không được tính release:4931unit pass nhưng core53pass/1fail (test app-action Undo còn giữ focus trong editor), retry chuẩn của config cũng fail. Đã sửa setup để kiểm tra text-focused Undo không đổi organization, rồi focus control ngoài editor trước app-action Undo/Redo; giữ assertion/state persistence, số54tests và @smoke. Case riêng GREEN6.5s; normal commit `d1613fac` cả9keyboard cases GREEN30.3s. Không đổi runtime để khôi phục fallthrough nguy hiểm, không thêm retry hoặc sửa hook. Final push chạy lại đúng full gates sau thay đổi test.

Logs local: `/tmp/memnova-undo-push-first.log`, `/tmp/memnova-undo-push-first-timing.json`, `/tmp/memnova-undo-app-action-{green,commit}.log`, `/tmp/memnova-undo-push.log`, `/tmp/memnova-undo-push-timing.json`, `/tmp/memnova-undo-rust-coverage.log`. Artifact `/tmp` chỉ có trên máy QA, không được chia sẻ qua Git.

## Phân tích và giới hạn

Codacy CLI0.24 local:8touched/newcodepaths,4originalbaselinepaths tại878951f8. ESLint0, Opengrep1typed React props-spread advisory giống baseline1; Lizard8 so với baseline7. Finding mới duy nhất là test tích hợp52NLOC vượt threshold50: orchestration có assertion cả hai mặt/save/reopen, không là security defect; giữ assertions và không suppress rule. Các cảnh báo Editor length/parameter/complexity có sẵn, không tăng metric trong các finding tương ứng. Không Critical/High mới, không analyzer failure. CLIexit1 vì findings, không gọi scan sạch. `/tmp/memnova-undo-codacy-{baseline,current}.{log,sarif}`.

CodeScene before/after/project: **NOT RUN (optional integration unavailable)** theo AGENTS/ADR0137. Không hạ `.codescene-thresholds`, sửa hooks/coverage exclusions hoặc bypass verify.

Localization: no UI copy changes; validator18catalogs/990Englishkeys pass. PostHog: no event needed because bug fixes restore existing actions; không thêm noisy analytics/PII. Refactor: scope helper history/reset và test fixtures; ADR mới:none (bug fixes, không storage/dependency/core abstraction mới). Docs: ABSTRACTIONS cập nhật history/raw/menu contract, follow-up plan ghi đúng phạm vi và receipt này. Không Todoist hoặc nhắn bên ngoài.

Chưa kiểm chứng trong lượt này: VoiceOver, touch vật lý, Windows/Linux, signed installer, production tldraw license, force-kill, mọi kiểu rename giữ history, full Playwright regression ngoài files được chọn/core lane. Core smoke dùng Vite dev, native QA dùng built renderer. R03/R04/R05 trong follow-up plan không tự hoàn thành từ việc sửa F01.

Normal `git push origin main` exit0, hooks7m46s; wrapper chỉ đo output của lệnh push bình thường, wall468.94s gồm network. Remote xác nhận `d1613fac69e3817ffb30610ddb018195c5d40d5f`; working tree và demo fixtures sạch sau source push. Native apps và test servers của task đã dừng. Receipt/plan được commit/push sau bằng docs-only lane bình thường; final receipt SHA xem Git history. Không bỏ hook, không tạo branch/PR hoặc merge upstream.
