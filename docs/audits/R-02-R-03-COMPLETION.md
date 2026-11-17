# R-02 / R-03 — completion

Ngày: 17/11/2026. Chế độ FIX, nguồn review A–D1; không làm D2–D4. Hai finding P2 được đăng ký trong FINDINGS trước khi sửa mã. Mỗi regression có commit riêng.

## R-02 — kích thước icon

Commit: `:/^fix: R-02 compact icon button dimensions` (Git revision selector; hash sẽ được ghi ở commit R-03).

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

Đã đăng ký; chưa sửa ở commit R-02. Regression focus và bằng chứng native được bổ sung trong commit riêng tiếp theo.

## Release gates

Full check suite Node 24 và pre-push sẽ được ghi sau commit R-03, trước khi push main. Không tuyên bố đã đạt ở commit R-02.

- CodeScene: not run (optional integration unavailable).
- Localization: no UI copy changes. Không cần dịch; validator ở release gate.
- PostHog: no event needed because these fixes restore existing control geometry/focus, without a new user action.
- Refactoring: none needed ngoài variant sizing tối thiểu; không thay abstraction lưu trữ.
- ADRs: none. Docs: FINDINGS, CURRENT-STATE, ABSTRACTIONS và báo cáo này.
- Demo vault dirt: kiểm tra trước commit/push; không thay fixture demo có chủ ý.
