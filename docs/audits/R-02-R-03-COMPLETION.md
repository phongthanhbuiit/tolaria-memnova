# R-02 / R-03 — completion

Ngày: 17/11/2026. Chế độ FIX, nguồn review A–D1; không làm D2–D4. Hai finding P2 được đăng ký trong FINDINGS trước khi sửa mã. Mỗi regression có commit riêng.

## R-02 — kích thước icon

Commit: `326bf5a0` — `fix: R-02 compact icon button dimensions`.

Nguyên nhân: bước A đổi icon sizes sang `min-h/min-w(--control-*)`. `h-6/w-6` vẫn còn trong class đã merge nhưng minimum thắng used height/width; `!h-6` cũng không thắng một thuộc tính khác là min-height. Ví dụ Chromium trước sửa: New AI chat 28×28; yêu cầu compact 24px bị đè. NoteListHeader clear/expand còn `!min-w-0`, nên bị kéo riêng chiều cao thành 21×28. Đây là CSS sizing, không phải lỗi callback hoặc icon SVG.

Sửa tại Button variants: icon tiêu chuẩn có h/w theo token 28/32/36px và một sàn vùng bấm nhỏ hơn. `icon-inline` dùng spacing step 7 có sẵn, minimum 24,5px với rem=14px, dành cho thao tác nhỏ nằm cùng dòng chữ (panel header, response actions, tooltip nhãn, property pill và clear search). Đây là ngoại lệ inline được yêu cầu trong review, gần token sẵn có nhất trên mức tối thiểu 24px; không thêm token, không đổi `--control-*`. Callers trong review chuyển sang size đó, bỏ h/w và bỏ important ở clear/expand search. Không thêm CSS data-slot. Layout responsive vẫn giữ minimum 44px trên coarse pointer.

### Kiểm kê trước sửa

`rg -n 'size=["\x27]icon' src` và AST TypeScript cho Button JSX, theo cả className literal, cn/conditional và constant trong file: **29** nơi có h-/w-/size-/!h-. Bản kiểm kê được lấy từ `95176804` trước sửa, đối chiếu `f78b8fb9`; [JSON đầy đủ](evidence/R-02-icon-inventory.json) giữ cả class và vị trí baseline.

Bảng dưới là probe Chromium cho sizing classes trên cùng parent 200×52px, calendar 28×52px. Nó tách ảnh hưởng của variant khỏi bố cục cha; các h-full/w-full/auto phụ thuộc context, không phải số đo ảnh native của mọi nơi gọi. Calendar dùng cùng sizing classes ở f78, khác lớp typography; aspect-square được giữ. App có rem=14px nên h-4/5/6/7/8 tương ứng 14/17,5/21/24,5/28px, không được giả định là 16/20/24/28/32px.

| Nơi gọi ở 95176804 | f78b8fb9 (W×H CSS px) | Trước sửa R-02 (W×H) |
|---|---:|---:|
| `src/components/ui/calendar.tsx:258` | 28×28 | 28×32 |
| `src/components/LinuxMenuButton.tsx:105` | 38×52 | 38×52 |
| `src/components/sidebar/SidebarLoadingSections.tsx:114` | 14×14 | 16×28 |
| `src/components/sidebar/SidebarSections.tsx:111` | 14×14 | 16×28 |
| `src/components/sidebar/SidebarSections.tsx:284` | 14×14 | 16×28 |
| `src/components/sidebar/SidebarSections.tsx:296` | 14×14 | 16×28 |
| `src/components/sidebar/SidebarSections.tsx:359` | 14×14 | 16×28 |
| `src/components/FlashcardStudyView.tsx:722` | 28×28 | 32×32 |
| `src/components/AiPanelChrome.tsx:308` | 21×21 | 28×28 |
| `src/components/AiPanelChrome.tsx:319` | 21×21 | 28×28 |
| `src/components/LinuxTitlebar.tsx:190` | 46×52 | 46×52 |
| `src/components/AiWorkspaceFloatingButton.tsx:70` | 42×42 | 42×42 |
| `src/components/TypeCustomizePopover.tsx:136` | 30×30 | 30×30 |
| `src/components/AiWorkspace.tsx:846` | 21×21 | 28×28 |
| `src/components/AiMessage.tsx:255` | 21×21 | 28×28 |
| `src/components/AiMessage.tsx:268` | 21×21 | 28×28 |
| `src/components/AiMessage.tsx:280` | 21×21 | 28×28 |
| `src/components/TableOfContentsPanel.tsx:243` | 21×21 | 28×28 |
| `src/components/FolderTree.tsx:300` | 14×14 | 16×28 |
| `src/components/WorkspaceSettingsRows.tsx:50` | 14×14 | 28×28 |
| `src/components/BulkActionBar.tsx:25` | 28×28 | 28×28 |
| `src/components/BulkActionBar.tsx:88` | 28×28 | 28×28 |
| `src/components/WikilinkPropertyField.tsx:22` | 17.5×17.5 | 32×32 |
| `src/components/status-bar/VaultMenu.tsx:378` | 21×21 | 28×28 |
| `src/components/note-list/NoteListHeader.tsx:74` | 21×21 | 21×28 |
| `src/components/note-list/NoteListHeader.tsx:191` | 14×14 | 16×28 |
| `src/components/note-list/NoteListHeader.tsx:202` | 14×14 | 16×28 |
| `src/components/note-list/NoteListHeader.tsx:253` | 21×21 | 21×28 |
| `src/components/note-list/ListPropertiesPopover.tsx:386` | 24.5×24.5 | 28×28 |

### TDD và QA R-02

- RED: `pnpm exec vitest run src/components/ui/button.test.tsx`: 7 fail / 9 pass. Browser regression cũng fail (New AI chat 28×28 trước sửa; inline size chưa tồn tại). Logs: `/tmp/memnova-r02-r03/R-02-{red,browser-red}.log`.
- GREEN: 16/16 class tests, 2/2 Chromium integration, `--retries=0`. Browser test đo mọi size cả sáng/tối, kiểm tra click New AI chat và Enter Remove Lesson. Standard icon sizes 28/32/36px, inline 24,5×24,5px. Text/study minima giữ nguyên. Types và lint chạy trên Node 24.
- Native Tauri debug/WebKit, bundle QA riêng `net.memnova.qa.r02r03`, incognito; `MEMNOVA_CONFIG_HOME=/tmp/memnova-r02-r03/native/prefs`, Library `/tmp/memnova-r02-r03/native/Library`. Không dùng Library/preferences cá nhân. Bản debug có native backend hiện hữu và frontend live của checkout.
- Bề mặt sản phẩm thật: tìm Grow → mở note → mục lục → đóng bằng chuột; clear search bằng chuột rồi gõ `x`, focus vẫn ở search. Workspace labels: bật multi-vault chỉ trong draft Settings, xem hàng, không lưu thay đổi này. Ảnh `R-02-{before,after}-{light,dark}-{search,toc,workspaces}*.png` trong [evidence](evidence/).
- AI header/response và WikilinkPropertyField: native mở **fixture component thật**, callback cục bộ, không gửi prompt/AI và không ghi Library. Chuột Regenerate → Tab Copy → Tab/Enter Fork → Tab/Enter Remove Lesson: output đổi đúng, property pill biến mất. Ảnh `R-02-{before,after}-{light,dark}-ai-property.png`. Đây là bằng chứng renderer/chuột/bàn phím trên WebKit, không phải kiểm thử dịch vụ AI.
- SPEC §8: 232 → 232 typography; 0 → 0 CSS data-slot. Không tăng.
- Codacy CLI 0.24.0, auto config ngoài source, 8 file production liên quan: ESLint9/Semgrep/Lizard/Trivy chạy; 21 warning trước và sau, không analyzer error, không Critical/High mới. 4 props-spreading warning và 17 cảnh báo kích thước/nhánh/tham số đã có ở baseline; các spread là component props nội bộ, không thêm nguồn input hay HTML injection. Tests/fixtures bị loại theo `.codacy.yaml`, kiểm bằng ESLint/TypeScript/Playwright riêng.

## R-03

Commit: `:/^fix: R-03 retain study focus across mouse undo` (Git revision selector cho commit chứa thay đổi này).

### Nguyên nhân và giới hạn bằng chứng

`LearningStudyView` chỉ mount Undo khi canUndo. Khi pointer focus nằm ở Undo và session chuyển canUndo → false mà không đổi snapshot thẻ, React gỡ phần tử đang focus. Test component với Button/Dialog thật đo được **activeElement = body ngay trong lần cập nhật đó**. Effect autofocus chỉ phụ thuộc snapshot/readiness, nên không đảm bảo giữ focus đồng bộ cho chuyển trạng thái này. Dialog có thể phục hồi focus sau qua MutationObserver, hoặc renderer của snapshot mới có thể focus nút lật thẻ.

**Không kết luận quá bằng chứng:** native hai thẻ và 8 ca Chromium baseline với refresh chậm đều tiếp tục dùng Space/1–4 được. Trình duyệt phục hồi focus ở các lượt đó. RED chứng minh mất focus đồng bộ của view, không chứng minh phím ngừng hoạt động ở mọi engine/lượt chạy. Ca unit đầu tiên chỉ phát keydown khi focus ở native Button là sai mô phỏng Space, đã loại bỏ; không dùng kết quả đó làm bằng chứng lỗi. Regression cuối mô phỏng cả native activation khi cần và thất bại ngay tại activeElement = body, trước phần Space.

### Sửa và TDD

- Luôn render Undo, disabled khi không thể Undo / busy / pending, giữ chỗ trong footer theo phương án được review cho phép. Đây là thay đổi rõ ràng so với quy tắc ẩn Undo ban đầu ở SPEC §6, được yêu cầu R-03 cho phép thay thế.
- Vùng thẻ có tabindex=-1 (chỉ nhận focus lập trình, không thêm Tab stop). Click Undo đưa focus vào vùng thẻ **trước** gọi callback. DOM này tồn tại qua busy và snapshot, nên không cần chờ Promise hay thêm listener/phím/sleep.
- Không đổi guard bàn phím, mapping Space/1–4/Esc, useLearningStudy, FSRS, lịch, request hay dữ liệu phiên. FlashcardStudyView legacy riêng không có Undo; source đã đối chiếu và 10 test hiện hữu pass, không sửa file đó.
- RED: 4/4 trường hợp rating 1–4 fail tại activeElement = body. [Log RED](evidence/R-03-RED.txt). GREEN: LearningStudyView 16/16 + FlashcardStudyView 10/10.
- Chromium: 21/21 integration, retries=0: 16 ca Undo (note/legacy × 1–4 × refresh chậm/snapshot ổn định), 3 ca renderer/readiness/legacy hiện hữu và 2 ca R-02. Các ca Undo dùng mouse click thật, keyboard thật, activeElement khác body, grade đúng số; kiểm tra Undo disabled. WebKit cũng đạt 18/18 (16 Undo + 2 sizing), retries=0. F8 chỉ là gate trong fixture để giải phóng committed refresh, không phải phím sản phẩm. Không sleep cố định hoặc đổi timeout/retry.

### Native sáng/tối

Cùng bundle, prefs và Library cô lập của R-02. Bề mặt sản phẩm thật: mouse Study → Show mnemonic → Good → Undo, rồi Space và 3 (tối) / 2 (sáng); progress trở về thẻ trước, mặt gợi nhớ hiện, rating quay về thẻ tiếp theo. Escape đóng phiên và focus trả về Study due notes. [Tối](evidence/R-03-after-dark-library-undo-space.png), [sáng](evidence/R-03-after-light-library-undo-space.png), [Undo disabled](evidence/R-03-after-dark-library-disabled.png).

Fixture native với view/hook/renderer thật và transport cục bộ giữ refresh: mouse Undo → Saving (Undo vẫn ở chỗ cũ, disabled; AX focus ở vùng thẻ) → F8 giải phóng → Space → 1 (tối) / 4 (sáng) → Done → Escape. Không ghi SQLite trong fixture này. [Sáng đang refresh](evidence/R-03-after-light-pending-refresh.png), [tối đang refresh](evidence/R-03-after-dark-pending-refresh.png), [grade 1](evidence/R-03-after-dark-grade-1.png), [grade 4](evidence/R-03-after-light-grade-4.png). Ảnh before cùng tên tương ứng giữ trạng thái Undo biến mất, kể cả trước baseline khi phím vẫn hoạt động nhờ dialog.

Snapshot SQLite của Library QA sau khi đóng phiên: integrity_check = ok, foreign_key_check rỗng; 6 sessions, 9 reviews, 5 schedules (các lượt rating/Undo QA có chủ ý). 256/256 tệp Markdown giống byte với bản sao ban đầu, không có tệp thêm/xóa/đổi nội dung. Không chạm Library cá nhân. SPEC §8: 232 → 232 và 0 → 0.

Codacy cuối: 8 file production, 21 warning cả trước/sau, không lỗi analyzer, không Critical/High mới. Cảnh báo Lizard cho LearningStudyView giảm NLOC 257→256 và nhánh 68→67; các warning khác giữ nguyên. Không dùng Lizard làm điểm CodeScene.

## Release gates

Full check suite trên Node **24.19.0** đã pass. [Biên bản máy](evidence/R-02-R-03-checks.json); logs đầy đủ ở `/tmp/memnova-r02-r03/`.

| Gate | Kết quả |
|---|---|
| `pnpm lint` | pass, không warning |
| `pnpm exec tsc -b` | pass |
| `pnpm test` | 501 files, 4.996 tests pass |
| `pnpm test:coverage` | 4.996 tests pass; lines **87,47%** (gate ≥70%) |
| `cargo test --manifest-path src-tauri/Cargo.toml` | 1.240 unit + 1 integration pass; 3 ignored đã có ở baseline, không thêm ignore |
| `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85` | pass; lines **86,40%** |
| `pnpm l10n:validate` | 18 catalogs, 1.028 keys |
| Chromium / WebKit targeted, retries=0 | 21/21 và 18/18 |

Pre-push dry-run pass: build, 4.996 tests với coverage 87,47%, **54/54 core smoke không flaky/retry phát sinh**; tổng 11m47s. Smoke 5,5 phút, vượt mục tiêu dưới 5 phút của repo ở lượt có kiểm tra fixture bổ sung chạy đồng thời; không đổi timeout/retry để che kết quả. Actual push chạy lại normal hook cho cả hai commit, ghi receipt cuối ở `/tmp/memnova-r02-r03/push.log` và phản hồi hoàn tất.

Production source không đổi sau các gates trên. Typecheck bổ sung cho hai fixtures/hai specs (vì tsconfig chính loại tests) đã pass; sửa prop permission `default`→`safe` trong fixture AI và chạy lại 2 ca Chromium pass, không thay nhánh hiển thị API-model hay mã sản phẩm. Correction nằm trong commit R-02 đã amend qua hook bình thường. Cấu hình typecheck bổ sung có trong biên bản máy.

- CodeScene: not run (optional integration unavailable).
- Localization: no UI copy changes. Không cần dịch; validator ở release gate.
- PostHog: no event needed because these fixes restore existing control geometry/focus, without a new user action.
- Refactoring: none needed ngoài variant sizing tối thiểu; không thay abstraction lưu trữ.
- ADRs: none. Docs: FINDINGS, CURRENT-STATE, ABSTRACTIONS và báo cáo này.
- Demo vault dirt: `git status --short -- demo-vault demo-vault-v2` rỗng; không thay fixture demo.

## R-04 — tách prefetch nền khỏi assertion search (đã được cho phép)

Commit: `:/^test: R-04 isolate note-list search from background prefetch`.

Actual push lần đầu bị chặn trước khi lên remote: lint/build pass, coverage có hai test NoteList.rendering fail vì prefetch nền chạm shared content mock. Log được giữ ở `/tmp/memnova-r02-r03/push-first-failure.log`. Không thử push lại để chờ may mắn.

Đã tái hiện độc lập trên archive baseline `95176804`, trước R-02/R-03: dùng fake clock 500ms sau render để đi qua mốc prefetch 350ms + mock transport 100ms, assertion cũ fail với `/vault/a.md`. [Log RED](evidence/R-04-RED.txt). Không thêm sleep hay thay timeout sản phẩm. Người dùng đã cho phép mở scope R-04 test-only trước khi áp dụng patch.

Sửa 7 dòng trong NoteList.rendering.test.tsx: partial mock module, chỉ thay prefetchNoteContent bằng spy. Rendering/search vẫn phải dùng đúng search_vault và không đọc từng file; giữ nguyên tất cả assertion. Các test hover/likely-next preload trong NoteList.keyboard.test.tsx vẫn dùng đường riêng và pass. Không thay app hoặc D2–D4, không thêm retry/skip/fixme.

- 63/63 test rendering/keyboard pass trên repo thật; ESLint file pass.
- Coverage sau R-04: 501 files, 4.995 pass / 1 fail; các ca rendering pass, failure duy nhất ở IME của file khác (R-05). Chưa coi đây là coverage/pre-push cuối đã pass.
- Codacy CLI 0.24.0 được gọi cho file test: **0 file / 0 tool chạy** do exclusions dự án. Không ghi là đã phân tích test hoặc gán điểm. Dùng ESLint/Vitest cho file này; 8 file production không đổi, kết quả scan production trước đó vẫn không có Critical/High mới.
- R-04 test-only: không có UI copy, analytics, ADR, refactor app hoặc native QA mới. Native/Markdown/SQLite và Rust evidence ở trên áp dụng cho production source không đổi.

## R-05 — blocker kế tiếp, chưa áp dụng đề xuất

Coverage sau R-04 gặp ca consecutive IME của WikilinkChatInput.test.tsx: spy draft còn “안” thay vì “안녕”. Source app và test giống baseline; probe 40 ca baseline nguyên bản đều pass, nên chưa kết luận baseline lỗi ổn định hay lỗi native/app. [Finding R-05](FINDINGS.md).

Đề xuất test-only 2 dòng await act(async ...) cho hai compositionEnd, theo [React act](https://react.dev/reference/react/act): callback onChange không đảm bảo DOM đã commit trước tương tác tiếp theo. Patch `/tmp/memnova-r02-r03/proposed-R-05.patch` qua kiểm tra áp dụng, 32/32 test pass trên bản sao. Giữ mọi assertion, không sửa app, không tăng timeout/retry. Đang chờ phép mở scope trước khi áp dụng. Các lượt gate pass/dry-run trước đó là kết quả lịch sử, không đại diện cho coverage hoặc actual push hiện đang bị chặn.
