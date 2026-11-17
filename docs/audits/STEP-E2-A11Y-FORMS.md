# E2 — Accessibility và form controls

**18/11/2026 · FIX · Chế độ đêm · PARTIAL.** F-019 và F-006 đã sửa trong phạm vi mã nguồn; F-005 đã xử lý tên nút của app nhưng chưa đóng toàn bộ vì nhãn BlockNote còn tiếng Anh (R-13). **Telex native chưa kiểm được**, không có bằng chứng để kết luận mất chữ hoặc mở P1 IME. Không tạo bộ cài phát hành.

| Finding | Commit mã | Kết quả |
|---|---|---|
| F-005 | `f6601cbc` | Partial: tên/tooltip nút do app quản lý đã dịch; quét cả button mang role combobox. R-13 còn mở. |
| F-019 | `9463246e` | Fixed: khôi phục focus-visible, native Tab và Chromium/WebKit pass. |
| F-006 | `f5462464` | Fixed: 32 phần tử thô → 0, 16 file bề mặt, giữ handlers/refs/giá trị/phím. |

## Cổng an toàn và phạm vi

- Gate đầu bước: fetch/status/rev-list exit 0, HEAD=origin/main=`91400c39`, 0 commit chưa push; không có dòng dừng hàng đợi.
- Đã đọc audit skill, AGENTS, OVERNIGHT-RULES, FINDINGS, roadmap E và tài liệu kiến trúc/baseline. Không sửa/stage AGENTS.md đang sửa, `.agents/`, PLAN/SPEC/OVERNIGHT-RULES untracked. Hash AGENTS giữ nguyên.
- Node **24.12.0** cho các check. Chỉ ba finding E2; không sửa F-040, logic danh sách/key path F-039, dữ liệu hoặc nội dung BlockNote.
- Mỗi finding một commit. Các commit chưa công bố được gom lại một lần để đưa phần combobox vào đúng F-005; cả ba commit cuối đều qua hook bình thường, không bỏ qua hook.

## F-005 — Tên truy cập và bản dịch

Bổ sung aria-label/tooltip dịch cho nút đóng/backdrop, sửa URL/icon, xóa/thêm giá trị/quan hệ, palette màu, emoji, nhóm bộ lọc, thao tác chọn nhiều, audio, Mermaid, menu Linux và nút dialog dùng chung. Bốn nhãn AI cũ còn tiếng Anh được dịch lại. Thêm author name cho TypeSelector, kiểu thuộc tính và toán tử lọc: nội dung hiện tại của combobox không tự tạo accessible name.

Tooltip đơn dùng cùng chuỗi với aria-label. Emoji dùng hành động đã dịch + glyph Unicode được chọn; tên tiếng Anh trong catalog tìm kiếm không được dùng làm nhãn hành động. Tên ghi chú, tag, đường dẫn, tên thuộc tính người dùng và các giá trị lưu giữ nguyên.

**TDD và quét:**

- RED đầu: 15/21 ca fail; bổ sung URL: 1/22 fail; quét mọi thẻ `button` bắt thêm 3/22 ca fail ở role combobox. GREEN cuối: **22/22**. Assertion kiểm tên truy cập mọi HTML button, nhãn icon tiếng Việt và tooltip/aria khớp nhau. [RED](evidence/E2-F005-red.txt), [URL RED](evidence/E2-F005-url-red.txt), [combobox RED](evidence/E2-F005-combobox-red.txt), [GREEN](evidence/E2-F005-green.txt).
- Các test thêm/xóa giá trị vẫn kiểm cùng callback và kết quả; selector đổi sang accessible name chính xác, gồm `Remove B`. Không bỏ hoặc nới kiểm tra giá trị/kích thước.
- axe-core **4.11.1** qua Playwright, chỉ rule `button-name`: **23 trạng thái component app + 18 ca learning = 0 vi phạm cuối**, không pageerror. Ba trạng thái combobox có RED trước sửa và được kiểm lại sau sửa. Legacy Decks rỗng và hai ca inspector learning không có button áp dụng, không tính chúng là bằng chứng nút đã được kiểm. [Kết quả app](evidence/E2-axe-app.json), [learning](evidence/E2-axe-learning.json), [RED axe](evidence/E2-axe-combobox-red.json), [fixture audit tạm](evidence/E2-axe-fixture-source.txt).
- Mẫu S1 Welcome/Clone; S2 Home/list/bulk; S3 sidebar; S4 breadcrumb/editor chrome; S5 Properties; S6 Decks và learning study; S7 Quick Open/Search/filter; S8 Commit; S9 AI chrome; S10 Settings/palette; S11 confirm/delete/dialog. Đây là các trạng thái đại diện, không phải mọi nhánh/onboarding/lỗi/mọi menu của S1–S11. Fixture audit dùng callback cục bộ, không ghi Library hoặc gửi AI, đã xóa khỏi tests sau khi thu bằng chứng.
- Bộ regression cố định có 16 ca rendered button-name của learning en/vi và bộ quét app bằng RTL. Quét role button đơn thuần không đủ cho combobox; ca RTL cuối kiểm cả HTML button.

[AX trước](evidence/E2-native-before-AX.txt), [đối chứng native sau](evidence/E2-native-AI-ASCII.txt); tên Gửi tin nhắn được quan sát trên native sau dịch.

**Chưa đóng F-005:** native vi còn `Add block` / `Open block menu` do BlockNote cung cấp. Hai nút có tên nhưng chưa dịch; ghi **R-13 P2**, không đổi lifetime/dictionary của editor trong đêm. Native ảnh không chứng minh được mọi nhãn thuộc thư viện đã dịch. Ô input chọn trường lọc cũng chưa có author name, ghi riêng **R-14 P2**; nó không phải button và không phải phần tử HTML thô mới. [AX editor](evidence/R-13-native-AX.txt), [kiểm combobox trình duyệt](evidence/E2-combobox-browser.txt).

## F-019 — Focus bàn phím

`outline-none` làm kiểu viền còn `none`; khai báo độ dày riêng chưa đủ. Dùng **focus-visible:outline-solid** cùng độ dày/màu token hiện có. Thêm outline cho tab panel, rich chat/wikilink, search, vùng listbox, vùng nội dung ôn và các primitive cần fallback; viền inset ở vùng có overflow. Bỏ suppression vô ích trên property row không focusable. Các Input/Button kế thừa viền từ component chung, kể cả caller đặt `focus-visible:ring-0`.

Không đổi tabIndex, handler, thứ tự DOM hoặc shortcut. Những chỗ đã có focus-visible ring được giữ; ring/outline của Select/menu vẫn theo state bàn phím. Không dùng CSS override data-slot hoặc important.

- RED **4/4 fail** (tab panel/search, sáng/tối). GREEN **5/5 Chromium, 5/5 WebKit**, gồm forced colors cho tab panel/Input/rich chat. [RED](evidence/E2-F019-red.txt), [Chromium](evidence/E2-F019-chromium.txt), [WebKit](evidence/E2-F019-webkit.txt).
- Native: mở bằng chuột rồi Tab/Shift+Tab vào chat, 32 bước Tab qua AI/status/sidebar và 8 bước trong Settings (select, switch, số, radio); listbox nhận focus sau Tab/Shift+Tab. Không kích hoạt công tắc hay đổi dữ liệu. [Tab](evidence/E2-native-tabs.txt), [Settings Tab](evidence/E2-native-settings-tabs.txt).
- Số literal `outline-none` **35→26** là inventory, không phải tiêu chí về 0: các dòng còn lại có focus-visible riêng hoặc kế thừa từ shared Input/Button. `outline-hidden` tương đương ở dialog/popover/menu cũng được rà và bổ sung outline ở chỗ sửa. [Ledger](evidence/E2-focus-counts.json).

| File | Trước | Sau |
|---|---:|---:|
| `src/components/AddPropertyForm.tsx` | 2 | 2 |
| `src/components/ColorInput.tsx` | 2 | 2 |
| `src/components/CommandPalette.tsx` | 1 | 1 |
| `src/components/DynamicPropertiesPanel.tsx` | 1 | 0 |
| `src/components/EditableValue.tsx` | 4 | 4 |
| `src/components/EmojiPicker.tsx` | 1 | 1 |
| `src/components/FlashcardEditorTabs.tsx` | 1 | 0 |
| `src/components/FlashcardStudyView.tsx` | 2 | 1 |
| `src/components/HomePage.tsx` | 1 | 1 |
| `src/components/InlineWikilinkParts.tsx` | 1 | 1 |
| `src/components/PropertyValueCells.tsx` | 1 | 0 |
| `src/components/PulseView.tsx` | 1 | 0 |
| `src/components/SearchPanel.tsx` | 1 | 1 |
| `src/components/SortDropdown.tsx` | 2 | 0 |
| `src/components/StatusDropdown.tsx` | 1 | 1 |
| `src/components/TagsDropdown.tsx` | 1 | 1 |
| `src/components/note-list/FilterPills.tsx` | 1 | 0 |
| `src/components/note-list/InboxFilterPills.tsx` | 1 | 0 |
| `src/components/note-list/NoteListLayout.tsx` | 1 | 1 |
| `src/components/ui/button.tsx` | 1 | 1 |
| `src/components/ui/checkbox.tsx` | 1 | 1 |
| `src/components/ui/dialog.tsx` | 1 | 1 |
| `src/components/ui/input.tsx` | 1 | 1 |
| `src/components/ui/scroll-area.tsx` | 1 | 1 |
| `src/components/ui/select.tsx` | 1 | 1 |
| `src/components/ui/switch.tsx` | 1 | 1 |
| `src/components/ui/tabs.tsx` | 1 | 1 |
| `src/components/ui/textarea.tsx` | 1 | 1 |

## F-006 — Shared form controls

Chuyển 30 button và 2 input sang shadcn Button/Input. Biến thể `bare` giữ kiểu trình bày đang có, có focus-visible dùng chung và truyền nguyên refs, native attributes, giá trị, event handlers. Tránh áp typography/kích thước/SVG sizing mặc định lên các control cũ. Variant chuẩn của control hiện hữu giữ nguyên. Chính sách được ghi trong ABSTRACTIONS cùng commit.

- AST guard RED: **32** JSX form tags ngoài ui; GREEN **0**. Không chỉ grep một dòng. [RED](evidence/E2-F006-red.txt), [GREEN + quét tên](evidence/E2-F006-green.txt).
- Hai ca Playwright trên cả Chromium/WebKit: mục tiêu ngày giữ mouse edit, auto/ref focus, min/max, Enter, Escape và blur; emoji giữ click/Enter và đúng glyph. Các test liên quan AI/Pulse/Sort/Quick Open tiếp tục qua hook.
- Đo CSS trước/sau của daily-goal button/input, note icon và emoji giống nhau về rect, font/line-height/weight và kích thước SVG. [Trước](evidence/E2-form-before.json), [sau](evidence/E2-form-after.json). Đây là renderer fixture, không phải ảnh native của màn legacy.
- **Không còn ngoại lệ raw form tag ngoài ui.** Rich `contenteditable` vẫn giữ vì là editor chứa wikilink chips/selection/composition; nó không thuộc bốn form tags cần thay. Không đổi pipeline IME hoặc nội dung BlockNote.

| File | Raw trước | Raw sau |
|---|---:|---:|
| `src/components/AiActionCard.tsx` | 1 | 0 |
| `src/components/AiMessage.tsx` | 3 | 0 |
| `src/components/CommandPalette.tsx` | 2 | 0 |
| `src/components/DecksPage.tsx` | 3 | 0 |
| `src/components/EmojiPicker.tsx` | 1 | 0 |
| `src/components/HomePage.tsx` | 2 | 0 |
| `src/components/InlineWikilinkParts.tsx` | 1 | 0 |
| `src/components/NoteIcon.tsx` | 2 | 0 |
| `src/components/NoteSearchList.tsx` | 1 | 0 |
| `src/components/PulseView.tsx` | 6 | 0 |
| `src/components/QuickOpenPalette.tsx` | 1 | 0 |
| `src/components/RenameDetectedBanner.tsx` | 2 | 0 |
| `src/components/SearchPanel.tsx` | 2 | 0 |
| `src/components/SettingsPanel.tsx` | 1 | 0 |
| `src/components/SortDropdown.tsx` | 3 | 0 |
| `src/components/filter-builder/FilterFieldOptionsList.tsx` | 1 | 0 |
| **Tổng** | **32** | **0** |

## Native và IME

Bundle `net.memnova.qa.e2`, profile `/tmp/memnova-e2/native/prefs`, Library `/tmp/memnova-e2/native/Library`, debug incognito WKWebView riêng. Reuse executable Rust QA D2 vì không đổi backend; renderer là mã E2. Tiêu đề window D2 còn từ binary QA, không phải app thật. 1440×900 logical/Retina, vi, sáng/tối. Không vào HOME/Laputa hoặc cấu hình thật; không gửi AI, commit/push Library hay chấm lịch ôn. Đã dừng app/server QA sau kiểm.

Đường chuột: mở AI, chọn UX verification, mở Properties/quan hệ, mở/đóng Settings, lọc Quick Open và chọn ghi chú bằng chuột; Cmd+P/Cmd+K, Escape và Tab vẫn hoạt động. Không xuất hiện màn render error trong các đường này. Native chưa đi hết các trạng thái legacy study, tool call AI, Linux menu và mọi nhánh dialog; browser/RTL không được gọi là bằng chứng native cho chúng. Bổ sung author name combobox cuối chỉ được kiểm RTL/axe, chưa kiểm lại native.

**Telex: CHƯA KIỂM ĐƯỢC.** VietnameseSimpleTelex đã có trong nguồn nhập được bật, nhưng nguồn đang chọn là ABC. Hai hotkey 60/61 đều disabled; Control+Space không đổi nguồn. CUA không lấy được menu SystemUIServer và TextInputMenuAgent (`-10005 timeoutReached`). Dừng hướng này, giữ nguyên cài đặt hệ thống theo luật đêm. [Môi trường](evidence/E2-IME-environment.json).

Đối chứng physical key trên ABC: `kiem tra e2` nhận đủ ở ô chat AI và ô Tiêu đề ghi chú trong quan hệ; vòng gọi 11 phím lần lượt 208ms và 189ms, không phải phép đo độ trễ IME. Draft AI đã xóa, truy vấn wikilink đã hủy. [AI](evidence/E2-native-AI-ASCII.txt), [wikilink](evidence/E2-native-wikilink-ASCII.txt). **Không tính đối chứng ASCII hoặc paste/synthetic composition là pass Telex; chưa kết luận có/không mất chữ, không mở P1 giả.**

Cần phiên native có nguồn Telex chọn được để gõ nhanh `Tooi ddang vieets tieengs Vieetj cos daaus vaaf lieen keets ghi chus.` và đối chiếu `Tôi đang viết tiếng Việt có dấu và liên kết ghi chú.` ở cả hai ô. Nếu mất chữ: ghi P1 mới với expected/actual, nguồn nhập, tốc độ và ảnh; không sửa IME trong bước E2.

## Ảnh native

Ảnh gốc được đổi định dạng sang PNG, không dựng lại UI. Before/after là trạng thái thật đã quan sát; ảnh Quick Open sau có ghi chú/Properties đang mở ở nền, vì đã đi qua đường chọn ghi chú. Viền focus đổi có chủ ý trong F-019. F-005 có trước sáng, sau sáng/tối; chưa có trước tối nên không ghi đủ ma trận trước/sau cho finding này.

| Phạm vi | Trước | Sau |
|---|---|---|
| F-005 sáng | [Ảnh](evidence/F-005-before.png) | [Ảnh](evidence/F-005-after.png) |
| F-005 tối | Chưa chụp trước | [Ảnh](evidence/F-005-after-dark.png) |
| F-019 sáng | [Ảnh](evidence/F-019-before.png) | [Ảnh](evidence/F-019-after.png) |
| F-019 tối | [Ảnh](evidence/F-019-before-dark.png) | [Ảnh](evidence/F-019-after-dark.png) |
| F-006 Quick Open sáng | [Ảnh](evidence/F-006-before.png) | [Ảnh](evidence/F-006-after.png) |
| F-006 Quick Open tối | [Ảnh](evidence/F-006-before-dark.png) | [Ảnh](evidence/F-006-after-dark.png) |

Ảnh bổ sung: [Settings tối](evidence/E2-settings-after-dark.png), [listbox focus](evidence/E2-list-focus-after-light.png), [Command Palette](evidence/E2-command-palette-after-light.png), [AI ASCII](evidence/E2-AI-ASCII-control.png), [wikilink ASCII](evidence/E2-wikilink-ASCII-control.png), [editor labels](evidence/E2-editor-labels.png).

## Check phát hành và nguồn tham chiếu

| Gate | Kết quả |
|---|---|
| Node / lint / types / build | Node 24.12.0, lint + tsc -b + build exit 0; hook cuối kiểm lại mã cuối. |
| Frontend | pnpm test: 506 file / 5.041 pass; full test:coverage của push cuối cũng **506 file / 5.041 pass**, **87,83% lines** ≥70%. |
| Rust tests | cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1: **1.241 unit + 1 integration pass**, 3 ignored có sẵn, exit 0. |
| Rust coverage | cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1: **86,41% lines**, exit 0; không loại lib/main/menu trong lượt này. |
| Rust hook | Push frontend-only tự bỏ Rust lint/coverage vì không có src-tauri changes; manual tests/coverage ở trên đã chạy. Không gọi fmt/clippy là đã chạy trong E2. |
| Browser | **23/23 Chromium + 23/23 WebKit**, --retries=0; gồm button names, focus/forced colors và form behavior. Author name combobox bổ sung có RTL RED/GREEN và axe riêng. |
| Core pre-push | **54/54**, **4,5 phút** <5; không failed row hoặc actual retry. |
| Localization | **18 catalog / 1.100 English keys**, validator exit 0 trong hook F-005. |
| Codacy | CLI 0.24.0 local: **128→128** warning; Semgrep 81, Lizard 47, không thêm nhận dạng cảnh báo; ESLint9/Trivy 0. Không Critical/High mới được báo. CLI exit 1 vì warnings và 1 parser error baseline ở PulseView, không gọi scan hoàn toàn pass. |
| CodeScene | **not run (optional integration unavailable)**; không sửa ratchet hoặc bịa điểm. |
| SPEC §8 | **1→1**, **0→0**: ngoại lệ fontSize glyph động NoteTitleIcon có từ D4A; không thêm typography literal hoặc CSS data-slot override. |
| Push mã | **ok**: origin/main `91400c39→f5462464`, hook bình thường **8m12s**, exit 0; remote trùng HEAD sau push. |

[Log push mã đầy đủ](evidence/E2-prepush-source.txt), [check bổ sung](evidence/E2-release-checks.txt), [Codacy baseline](evidence/E2-codacy-before.sarif), [Codacy cuối](evidence/E2-codacy-after.sarif), [summary](evidence/E2-codacy-summary.json), [analyzer error](evidence/E2-codacy-errors.json).

Medium review: props-spreading là baseline ở các đường forward props; bỏ chúng sẽ làm mất native attributes/refs/handlers cần giữ. Complexity là baseline, không có nhận dạng cảnh báo mới; NLOC thay đổi nhỏ do nhãn/hook hoặc parser TSX. PulseView không được Semgrep phân tích ở cả baseline/final; đã đọc diff chỉ đổi JSX Button và focus classes, các I/O/path/data handlers giữ nguyên. ESLint/types/tests vẫn kiểm file; đây là giới hạn scan, không thay bằng tuyên bố Semgrep đã pass.


Modern Web Guidance CLI tra tập trung và retrieve `accessibility`, `forms`, `ime-safe-enter-submit`, `css`, `icons`; áp dụng tên truy cập rõ, giữ native button/input semantics, `type="button"` cho helper, focus outline và fallback forced colors. Guide IME nhắc Safari có thứ tự sự kiện khác; vì vậy không thay native Telex bằng test giả. Không thêm công nghệ CSS/icon mới. [Trích hướng dẫn/command](evidence/E2-guidance.txt).

Localization: 39 key mới trong en.json, sửa 4 nhãn AI hiện hữu, dịch trực tiếp đủ 18 catalog vì không có Lara credentials; placeholders/product names được validator kiểm. Không thêm dependency. PostHog: không event mới vì các thao tác vẫn như cũ, đây là a11y/refactor control. CodeScene: **not run (optional integration unavailable)**. Refactoring: bare variants để giữ presentation, không refactor vì điểm số. ADR: none; không đổi storage/model/integration. Docs: ABSTRACTIONS, CURRENT-STATE, FINDINGS, báo cáo này, log đêm và evidence.

Hash **259/259 Markdown không đổi**, gồm retired; không thêm/mất file. [Đối chiếu](evidence/E2-data-preservation.json). Demo-vault/demo-vault-v2 sạch. AGENTS.md giữ hash; tài liệu/skill untracked của người dùng không stage.

## Câu hỏi cho người dùng / quyết định đêm

- Đã chọn giữ một commit mỗi finding theo yêu cầu hiện tại, thay quy định cũ “mỗi file một commit” của F-006. Giữ controls có presentation cũ qua variant bare, không áp lại layout.
- Telex: chọn không bật hotkey/chỉnh cài đặt hệ thống, không giả định ABC/paste là Telex. Cần kiểm lại khi truy cập được menu nguồn nhập.
- Theo `.agents/skills/memnova-audit/SKILL.md`: “Thấy lỗi mới → ghi finding mới, không sửa.” BlockNote labels và ô chọn trường lọc chưa có author name: ghi R-13/R-14 P2, giữ nguyên editor/input pipeline theo quy tắc lỗi mới không mở rộng sửa. Vì yêu cầu “mọi nút đã dịch” chưa đạt ở dependency, F-005 và E2 giữ partial.
