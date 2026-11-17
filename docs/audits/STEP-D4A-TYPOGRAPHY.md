# D4A — Typography (F-024)

Ngày 18/11/2026. FIX, chế độ đêm. Baseline `b95c7193`; mã cuối `2b7268e0`. Chỉ thay cỡ chữ/line-height trong 42 file TSX; giữ nguyên màu, độ đậm, bố cục, hành vi, phím tắt, dữ liệu và key danh sách theo path. Không thay nội dung BlockNote, F-040, D3 hoặc thiết kế D4 khác.

## Kết quả và ngoại lệ

Lệnh thứ nhất SPEC §8: **160 → 1 dòng** trên toàn `src` không tính test; **159 → 0 dòng chữ khớp grep** sau khi tách một ngoại lệ icon được phép. Không báo grep thô bằng 0. Lệnh CSS `[data-slot=…]`: **0 → 0**. Dòng giữ nguyên là `src/components/NoteTitleIcon.tsx:35`, `fontSize: size`: glyph emoji phải cùng kích thước hình học với nhánh SVG/image của icon. Đây không phải chữ giao diện: ví dụ `src/components/NoteIcon.tsx:37` truyền size26, ngoài thang chữ; ép icon vào thang sẽ đổi hình học và lệch nhánh SVG/image. Không chuyển literal sang chỗ khác để né grep.

Tất cả cỡ pixel chữ được thay trong D4A đều từ 11px trở lên tại root 14px. Phạm vi này là lệnh grep TSX được giao; không chứng nhận mọi CSS/`text-xs` cũ trong toàn app đã đạt sàn 11px. F-024 rộng hơn D4A vì còn các kiểu chữ cũ ngoài biểu thức grep. Giữ finding ở **partial — D4A đã dọn literal; còn kiểm soát chữ kế thừa/CSS và QA native các trạng thái hiếm**. Không đóng finding bằng riêng kết quả grep.

Ánh xạ: 9/10/11→caption 11/16; 12→small 12/18; 13→body 13/20; 14→body-lg 14/22; 15 ở ô nhập→body-lg, ở tiêu đề FilePreview→title; 16 tiêu đề Settings→title 16/24; 18 tiêu đề consent→title; 28 Welcome→display 20/28. Không đổi font-weight 700/900 có sẵn vì yêu cầu chỉ cho phép cỡ chữ/line-height; việc chuẩn hoá weight thuộc finding khác.

Dùng tiện ích kích thước `text-(length:--text-…)` và `leading-(--text-…--line-height)` tham chiếu token có sẵn. Khác với `text-caption`/`text-title` đầy đủ, chúng không phát sinh font-weight mới. CSS build xác nhận `.text-\(length\:--text-caption\){font-size:var(--text-caption)}`; token dùng rem và line-height không đơn vị. Giữ các tiện ích leading tường minh có sẵn; không thay chiều cao/padding để che clipping.

## Cổng an toàn và commit

Fetch/status/rev-list thành công; HEAD=origin/main=b95c7193, 0 commit chưa push. Không có lệnh dừng trong log. Giữ nguyên dirt của người dùng: AGENTS.md, .agents/, APP-AUDIT-PLAN.md, DESIGN-SPEC.md, OVERNIGHT-RULES.md; không stage chúng. Node 24.12.0. Các nhóm được tách theo yêu cầu người dùng thay cho quy tắc một finding/một commit của skill.

| Nhóm | Commit | Grep thứ nhất tại commit |
|---|---|---|
| Study / legacy Home / Decks | 3310fdf3 | 160 → 132 |
| Dialog / palette / search | efca58d9 | 132 → 101 |
| Settings / Welcome | 7b8df785 | 101 → 87 |
| AI | 365c76e3 | 87 → 48 |
| Pulse | ff8ce17f | 48 → 30 |
| Chrome còn lại | 2b7268e0 | 30 → 1 |

Đếm lại từ Git tree của từng commit, không dùng trạng thái worktree cuối để suy ra. CSS data-slot ở mọi commit vẫn 0. [Số đo Git tree](evidence/D4A-commit-grep.json).

## Kiểm kê từng file

43 file ban đầu khớp, gồm 42 file được sửa và một ngoại lệ giữ nguyên. [Grep trước](evidence/D4A-grep-before.txt), [grep sau](evidence/D4A-grep-after.txt), [TSV](evidence/D4A-grep-by-file.tsv).

| File trong src/components | Trước | Sau |
|---|---:|---:|
| `AiActionCard.tsx` | 3 | 0 |
| `AiAgentsOnboardingPrompt.tsx` | 1 | 0 |
| `AiMessage.tsx` | 8 | 0 |
| `AiPanelChrome.tsx` | 11 | 0 |
| `AiWorkspace.tsx` | 5 | 0 |
| `AiWorkspaceChrome.tsx` | 2 | 0 |
| `AiWorkspaceSidebar.tsx` | 5 | 0 |
| `BulkActionBar.tsx` | 1 | 0 |
| `CommandPalette.tsx` | 5 | 0 |
| `CommandPaletteAiMode.tsx` | 4 | 0 |
| `CommitDialog.tsx` | 2 | 0 |
| `ConflictResolverModal.tsx` | 1 | 0 |
| `DecksPage.tsx` | 9 | 0 |
| `DeleteProgressNotice.tsx` | 1 | 0 |
| `DiffView.tsx` | 1 | 0 |
| `EmojiPicker.tsx` | 1 | 0 |
| `FilePreview.tsx` | 4 | 0 |
| `FilterBuilder.tsx` | 3 | 0 |
| `FlashcardStudyView.tsx` | 5 | 0 |
| `GitRepositorySelect.tsx` | 1 | 0 |
| `GitRequiredModal.tsx` | 1 | 0 |
| `HomePage.tsx` | 14 | 0 |
| `InlineWikilinkParts.tsx` | 5 | 0 |
| `LinuxMenuButton.tsx` | 1 | 0 |
| `NoteSearchList.tsx` | 2 | 0 |
| `NoteTitleIcon.tsx` | 1 | 1 |
| `PulseView.tsx` | 17 | 0 |
| `QuickOpenPalette.tsx` | 1 | 0 |
| `RenameDetectedBanner.tsx` | 3 | 0 |
| `SearchPanel.tsx` | 9 | 0 |
| `SettingsControls.tsx` | 3 | 0 |
| `SettingsFooter.tsx` | 1 | 0 |
| `SettingsPanel.tsx` | 1 | 0 |
| `SortDropdown.tsx` | 2 | 0 |
| `TableOfContentsPanel.tsx` | 2 | 0 |
| `TelemetryConsentDialog.tsx` | 6 | 0 |
| `Toast.tsx` | 1 | 0 |
| `TypeCustomizePopover.tsx` | 3 | 0 |
| `UpdateBanner.tsx` | 3 | 0 |
| `WelcomeScreen.tsx` | 7 | 0 |
| `WorkspaceInitialsBadge.tsx` | 1 | 0 |
| `WorkspaceSettingsRows.tsx` | 2 | 0 |
| `filter-builder/DateValueInput.tsx` | 1 | 0 |

## Native QA

Bản debug/incognito riêng `net.memnova.qa.d4a`, config `/tmp/memnova-d4a/native/prefs`, Library `/tmp/memnova-d4a/native/Library`. Welcome dùng bundle `net.memnova.qa.d4a.welcome` và preferences rỗng riêng. Tái dùng executable debug D2 vì Rust không đổi; window title nội bộ còn D2, displayName chính còn D3; renderer là mã đang kiểm qua localhost:5201. Server ban đầu chỉ bind IPv6 khiến cửa sổ trống; khởi động lại server bind 127.0.0.1 rồi relaunch QA thành công. Không dùng Library/prefs thật hoặc thay HOME.

38 ảnh native nguyên bản (2880×1800, cửa sổ 1440×900) và 19 ảnh ghép cạnh nhau trong `evidence/D4A-*.png`. Ảnh ghép chỉ thu nhỏ và đặt cạnh, không sửa giao diện trong ảnh. Ngôn ngữ vi; copy AI/Commit tiếng Anh là hiện trạng có sẵn. Một số background khác do điều hướng; Settings bật Git/AI trong cấu hình QA để mở các bề mặt tương ứng, không phải thay đổi hành vi ứng dụng. Commit/Search được đối chiếu bằng cách tạm trả đúng file bề mặt về baseline ngoài các lượt commit, chụp rồi áp lại bản đã kiểm. Không đưa các bước đối chiếu tạm vào commit.

| Bề mặt | Sáng | Tối |
|---|---|---|
| welcome | [Trước / sau](evidence/D4A-welcome-compare-light.png) | [Trước / sau](evidence/D4A-welcome-compare-dark.png) |
| settings | [Trước / sau](evidence/D4A-settings-compare-light.png) | [Trước / sau](evidence/D4A-settings-compare-dark.png) |
| pulse | [Trước / sau](evidence/D4A-pulse-compare-light.png) | [Trước / sau](evidence/D4A-pulse-compare-dark.png) |
| ai-panel | [Trước / sau](evidence/D4A-ai-panel-compare-light.png) | [Trước / sau](evidence/D4A-ai-panel-compare-dark.png) |
| quick-open | [Trước / sau](evidence/D4A-quick-open-compare-light.png) | [Trước / sau](evidence/D4A-quick-open-compare-dark.png) |
| palette | [Trước / sau](evidence/D4A-palette-compare-light.png) | [Trước / sau](evidence/D4A-palette-compare-dark.png) |
| commit | [Trước / sau](evidence/D4A-commit-compare-light.png) | [Trước / sau](evidence/D4A-commit-compare-dark.png) |
| list-search | [Trước / sau](evidence/D4A-list-search-compare-light.png) | [Trước / sau](evidence/D4A-list-search-compare-dark.png) |
| search | [Trước / sau](evidence/D4A-search-compare-light.png) | [Trước / sau](evidence/D4A-search-compare-dark.png) |

AI onboarding có thêm [cặp tối](evidence/D4A-ai-onboarding-compare-dark.png). Mouse: Settings, theme, Pulse, AI panel, Quick Open, menu View→Command Palette, Commit→Cancel, tìm danh sách. Keyboard: Cmd+Shift+F mở tìm toàn Library, truy vấn Reading trả 20 kết quả trước/sau; Cmd+K mở palette, không có màn render error. Không gửi prompt AI, không cài agent, không nhấn Commit/Push của Library QA. App QA đã thoát.

Giới hạn: legacy `HomePage`/`DecksPage`/phần màn FlashcardStudyView không còn được mount trong đường đi hiện hành; chỉ phần BlockNoteReadOnly được dùng lại. Không thay router để dựng đường đi mới. Chưa chụp native các trạng thái hiếm như conflict, rename detection, tiến độ xoá, cập nhật, nội dung AI tool/result hoặc preview mọi loại tệp; LinuxMenuButton không có native surface trên macOS. Các nhánh đó được kiểm bằng test liên quan và bất biến AST, không gọi chúng là native PASS. Welcome có mô tả dài vượt mép nút ở cả trước/sau (R-10, P3); giữ nguyên vì sửa bố cục ngoài phạm vi. Chưa chứng nhận reflow 320px hoặc text zoom200% cho toàn app.

## Kiểm chứng và release gates

- Bất biến AST trên 43 file: bỏ riêng fontSize/lineHeight và tiện ích kích thước liên quan rồi so sánh, **0 thay đổi còn lại** ([kết quả](evidence/D4A-invariant.txt), [CSS build](evidence/D4A-token-css.txt)). Ngoài ra chỉ một bộ chọn test đổi từ lớp pixel sang lớp token; assertion thứ tự nhóm không đổi. Script kiểm tra nằm ngoài nguồn, không thêm test phản chiếu implementation.
- CSS/layout thuần được miễn RED theo AGENTS. Lượt unit đầu 5006 pass/1 fail: test thứ tự nhóm CommandPalette tìm lớp `text-[11px]` đã bị xoá. Giữ nguyên `toEqual(['Navigation','Note','View'])`, chỉ cập nhật bộ chọn sang token caption. Targeted GREEN 30/30. Commit dialog đầu bị hook từ chối vì lỗi này; sửa đúng rồi commit lại bằng hook bình thường, không bypass.
- `pnpm lint`, `pnpm exec tsc -b`, build: exit0. `pnpm test:coverage`: **504 file / 5007 test pass**, lines **87,50%** (≥70%). Lượt pnpm test đầu có lỗi selector nêu trên; toàn bộ test sau sửa chạy lại qua coverage và pre-push, không ghi lượt đầu là pass.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1`: 1240 unit +1 integration pass, 3 ignored có sẵn; exit0. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1`: **86,40% lines**, exit0. Không đổi Rust.
- Browser regression mở rộng: **5 pass /3 fail**, `--retries=0`. Palette AI hai ca, Journal visibility và list search hai ca pass. Ba ca lỗi tái hiện **3/3 fail trên baseline b95c7193**, không retry: release-channel-settings hai ca không mở được panel theo helper cũ; ai-panel-shortcut thấy panel nhưng không tìm được title cũ `Close AI panel`. Ghi **R-09**, không sửa ngoài phạm vi khi chưa chặn curated push. [Lượt hiện tại](evidence/D4A-browser-regression.txt), [baseline độc lập](evidence/D4A-R09-baseline.txt).
- Pre-push curated/full gate: **exit0**, lint + TypeScript/build + frontend coverage + **54/54 core smoke trong4,6phút**, không retry ở lượt này. Push mã nguồn main `b95c7193→2b7268e0` thành công, hook bình thường **8m9s**; Rust được hook bỏ qua do không đổi Rust, đã chạy độc lập ở trên. [Log hook đầy đủ](evidence/D4A-push-source.txt). Commit docs cuối được push bằng hook bình thường sau khi ghi log.
- Codacy CLI0.24.0, cấu hình và exclusions của dự án, không upload: ESLint9 0→0; Trivy0→0; Semgrep15→15; Lizard63→63; **78→78 cảnh báo baseline**, không Critical/High mới. Không dùng Lizard làm CodeScene. Semgrep/Opengrep **không parse được PulseView.tsx cả trước/sau**, `fileNotAnalyzed=true`, một analyzer error mỗi lượt; không gọi analyzer đó là pass. Tsc/lint và so sánh AST bổ sung bằng chứng cho file này. [Tóm tắt analyzer](evidence/D4A-codacy-summary.json).
- CodeScene: not run (optional integration unavailable). Không có PAT/project ID. Không sửa ratchet.
- Localization: no UI copy changes; `pnpm l10n:validate` pass 18 catalog/1042 khóa; không cần Lara. PostHog: no event needed because typography-only, không có hành động mới.
- Refactoring: none needed. ADRs: none. Không thêm component/hook/data model/integration/dependency nên không cần sửa ARCHITECTURE/ABSTRACTIONS. Cập nhật CURRENT-STATE, FINDINGS và log đêm.
- Data preservation: **258 Markdown +3 SQLite giống từng byte/hash** so với bản Library QA được sao chép, không có tệp mới/mất/sửa; [hash](evidence/D4A-data-hashes.json). Mở read-only DB gốc bằng SQLite local báo unable to open database file; dùng hash byte thay cho suy diễn đã query/integrity pass. Demo dirt kiểm tra rỗng.

## Câu hỏi cho người dùng / quyết định đêm

Không hỏi hoặc chờ duyệt. Chọn giữ emoji icon ngoài thang chữ theo ngoại lệ người dùng cho phép, thay vì đổi hình học icon hoặc chuyển literal để né grep. Giữ F-024 partial đến khi xử lý các cỡ kế thừa/CSS ngoài grep và hoàn tất native trạng thái hiếm; không tuyên bố toàn app hết chữ dưới11px chỉ nhờ grep. Không sửa ba regression baseline ngoài phạm vi; không thay timeout/retry/skip/coverage/assertion.

### Modern Web Guidance

- **`typography`**: Tôi dùng token rem có sẵn và line-height không đơn vị để chữ theo root font size, giữ riêng độ đậm hiện có (“Use unitless numbers for `line-height`”). Tôi giữ các chiều cao/nowrap cũ theo phạm vi chỉ typography và ghi rõ giới hạn zoom/reflow; không coi tra guide là bằng chứng toàn app đạt accessibility.
