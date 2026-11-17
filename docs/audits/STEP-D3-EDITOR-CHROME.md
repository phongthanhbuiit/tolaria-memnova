# D3 — Editor chrome

FIX F-018, F-036 và chỉ phần breadcrumb của F-009. Baseline `707bac53`. Không sửa đặt tên file/ghi chú mới, dữ liệu, phím tắt hoặc nội dung BlockNote. Node 24.12.0.

## Cổng an toàn

`git fetch origin && git status --short && git rev-list --count origin/main..HEAD`: exit 0; 0 commit chưa push. Không có log đêm DỪNG HÀNG ĐỢI trước bước này. Giữ nguyên AGENTS và các skill/SPEC/PLAN/OVERNIGHT untracked của người dùng.

## Đo trước

14 module chrome trực tiếp; thêm phần CSS pseudo-placeholder H1 trong EditorTheme.css, các luật typography nội dung còn lại nằm ngoài phạm vi và được giữ nguyên. Floating BlockNote formatting controls được kiểm kê riêng, không thay pipeline nhập/chuyển đổi nội dung.

| File | SPEC8 chữ | Cỡ cũ | h/w thô | radius thô | màu literal |
|---|---:|---:|---:|---:|---:|
| `src/components/BreadcrumbBar.tsx` | 6 | 5 | 11 | 3 | 0 |
| `src/components/Editor.tsx` | 1 | 2 | 2 | 0 | 0 |
| `src/components/editor-content/EditorContentLayout.tsx` | 1 | 4 | 10 | 5 | 0 |
| `src/components/StatusBar.tsx` | 1 | 0 | 0 | 0 | 0 |
| `src/components/ArchivedNoteBanner.tsx` | 2 | 0 | 0 | 1 | 0 |
| `src/components/ConflictNoteBanner.tsx` | 3 | 0 | 0 | 2 | 0 |
| `src/components/RawEditorFindBar.tsx` | 0 | 3 | 5 | 2 | 0 |
| `src/components/NoteMemoryEditorTabs.tsx` | 0 | 0 | 2 | 0 | 0 |
| `src/components/FlashcardEditorTabs.tsx` | 1 | 2 | 0 | 3 | 0 |
| `src/components/status-bar/StatusBarBadges.tsx` | 5 | 0 | 2 | 7 | 0 |
| `src/components/status-bar/StatusBarSections.tsx` | 4 | 0 | 3 | 4 | 0 |
| `src/components/status-bar/VaultMenu.tsx` | 7 | 2 | 6 | 10 | 0 |
| `src/components/status-bar/AiAgentsBadge.tsx` | 2 | 2 | 3 | 1 | 0 |
| `src/components/status-bar/styles.ts` | 0 | 0 | 0 | 0 | 0 |

SPEC §8 toàn src trước: typography **193**, CSS data-slot **0**. D3 có 33 dòng typography. CSS đã 0 nên giữ 0; không đổi selector để né grep.

## F-036

Native tái hiện placeholder Heading đậm nghiêng như H1 thật. RED WebKit: font-style nhận italic thay normal. Sửa chỉ pseudo-element của H1 không có nội dung, color text-faint, font-style normal, weight 400; giữ nguyên font-size/line-height/letter-spacing của H1 thật và chuỗi placeholder do BlockNote sinh. Không thêm important hoặc data-slot selector.

## Trạng thái

F-036 và F-018 fixed; F-009 chỉ phần breadcrumb fixed, đặt tên mới vẫn ngoài D3. Mã và QA chrome hoàn tất; R-08 được ghi riêng, chưa phân loại được nguồn flaky của ba regression create/paste ngoài chrome. Không tuyên bố các ca đó ổn định hoặc đã sửa nhập liệu native.

## F-009 — chỉ breadcrumb

RED 3/4 ca fail khi trigger vẫn hiện slug; GREEN 108/108 test liên quan. Tiêu đề hiện tại H1/frontmatter được ưu tiên, rồi metadata, rồi fallback filename. Draft đổi tên vẫn stem gốc; Escape không ghi, Enter gọi đúng path/stem, entry không đổi. Tạo ghi chú, slugify và đồng bộ tên file giữ nguyên. Native xác nhận tiêu đề hiển thị thay slug, bằng chứng D3-F009-after-native.png. SPEC8 193→193 / 0→0 trong commit F-009; token typography thuộc F-018. Tên trợ năng cũng theo đúng tiêu đề nhìn thấy qua aria-labelledby; hướng dẫn filename/Enter đã dịch là description riêng qua aria-describedby và sr-only, giữ aria-label fallback đang được consumer dùng để nhận diện file. RED tên trợ năng còn là filename → GREEN tên là tiêu đề và description giữ stem. Không đặt hint trong tên accessible hoặc trong text của nút. Native cuối xác nhận button mang tiêu đề, double-click vẫn mở stem thật, Escape huỷ; bằng chứng D3-native-accessible-title.ax.txt và D3-accessible-title-after-native.png. Không chạy VoiceOver trực tiếp; đã kiểm native AX, Playwright name/description và keyboard.

## F-018 — công cụ và token chrome

Tái sử dụng ActionTooltip/Radix sẵn có cho icon actionbar; các nhãn icon chính đã có bản dịch ở baseline, nên giữ nguyên khóa/handler/shortcut. Bổ sung nhóm Ghi chú, Giao diện, Thao tác tệp bằng role group + đường phân cách; giữ thứ tự DOM/Tab, đo overflow và các menu item hiện có. Khi hẹp, nhóm tệp vẫn mounted và ẩn theo cơ chế overflow cũ; không đổi danh tính control. Mỗi icon dùng size icon-sm 28px, icon 16px. Không đổi virtualizer/path key từ F-039/F-041.

Nhánh Schedule/Review Deck trước còn tiếng Anh: chuyển tooltip, aria-label và nhãn qua 14 khóa en + mọi catalog. Lara exit 1 vì thiếu LARA_ACCESS_KEY_ID/SECRET; dịch trực tiếp 17 catalog còn lại, validator xác nhận 18 catalog/1042 khóa. Thanh tìm của editor thô dùng ActionTooltip cho các icon, có hover/focus/Escape; tìm/thay thế và input vẫn cùng handler. Các banner/diff/tab chrome dùng Button có sẵn, không đổi role/tab selection hoặc callback. Không tạo API/component dùng chung mới.

RED có hai hành vi hợp lệ: thiếu nhóm chức năng và nhánh due-today chưa dịch. Test kiểm kê icon ban đầu thiếu inspectorCollapsed nên chỉ có 9 icon; sửa fixture để bật icon thứ 10, không lấy lỗi fixture làm bằng chứng sản phẩm. GREEN 67/67 test tập trung; 10 icon tiếng Việt đều có aria-label và focus tooltip. WebKit 2/2 test thật, retries=0: H1 trống đúng faint/normal/400; tiêu đề breadcrumb đúng; double-click giữ stem; hover/focus/Escape tooltip; byte nội dung file giữ nguyên.

Token: caption/small/body/body-lg; hint chọn note 15→body-lg 14; empty frame/header 52→2×control-sm 56; status bar 30→control-md 32; nút/input đi qua API size/controlSize. Bo góc chip/skeleton sm4, control md6, popup/menu lg8. Số width layout, divider 1px, geometry macOS và số kích thước skeleton không phải control được giữ theo spacing hiện có; không chuyển literal sang CSS để né grep. Không sửa shared token hoặc UI primitive. EditorTheme.css chỉ thêm pseudo-placeholder F-036, không sửa CSS typography nội dung/BlockNote pipeline. Floating formatting controls do BlockNote sở hữu đã kiểm kê nhưng nằm ngoài actionbar 10 icon của F-018; không đổi dictionary hoặc input/content config của BlockNote trong D3.

## Bảng trước/sau theo file

Đếm số dòng khớp regex như D2. Control là className/style trực tiếp trên Button/Input/SelectTrigger/TabsTrigger hoặc raw control qua TypeScript AST; helper class của status bar cũng đã bỏ h-6/w-6 thủ công. H/w thô gồm layout, min-w-0, icon, skeleton; radius lẻ chỉ rounded không bậc hoặc borderRadius số, không đếm token hợp lệ. Dữ liệu/regex/dòng control: [D3-counts.json](evidence/D3-counts.json).

| File (src/components/) | SPEC8 chữ | Cỡ cũ | Control h/w | H/w thô | Radius lẻ | Màu literal |
|---|---:|---:|---:|---:|---:|---:|
| `BreadcrumbBar.tsx` | 6→0 | 5→0 | 1→0 | 11→9 | 1→0 | 2→0 |
| `Editor.tsx` | 1→0 | 2→0 | 0→0 | 2→2 | 0→0 | 0→0 |
| `editor-content/EditorContentLayout.tsx` | 1→0 | 4→0 | 0→0 | 10→10 | 5→0 | 0→0 |
| `StatusBar.tsx` | 1→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 |
| `ArchivedNoteBanner.tsx` | 2→0 | 0→0 | 0→0 | 0→0 | 1→0 | 0→0 |
| `ConflictNoteBanner.tsx` | 3→0 | 0→0 | 0→0 | 0→0 | 2→0 | 0→0 |
| `RawEditorFindBar.tsx` | 0→0 | 3→0 | 2→0 | 5→5 | 2→0 | 0→0 |
| `NoteMemoryEditorTabs.tsx` | 0→0 | 0→0 | 0→0 | 2→2 | 0→0 | 0→0 |
| `FlashcardEditorTabs.tsx` | 1→0 | 2→0 | 0→0 | 0→0 | 0→0 | 1→0 |
| `status-bar/StatusBarBadges.tsx` | 5→0 | 0→0 | 2→0 | 2→1 | 5→0 | 0→0 |
| `status-bar/StatusBarSections.tsx` | 4→0 | 0→0 | 0→0 | 3→1 | 0→0 | 0→0 |
| `status-bar/VaultMenu.tsx` | 7→0 | 2→0 | 1→0 | 6→3 | 1→0 | 0→0 |
| `status-bar/AiAgentsBadge.tsx` | 2→0 | 2→0 | 0→0 | 3→1 | 0→0 | 0→0 |
| `status-bar/styles.ts` | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 |

Kiểm kê màu đầu dùng regex palette hẹp nên bỏ sót violet. Bảng cuối mở rộng palette, đọc lại đúng nguồn baseline bất biến 707bac53: BreadcrumbBar 2 dòng và FlashcardEditorTabs 1 dòng màu chữ literal, nay đều 0. Giữ nguyên D3-before-counts.json làm bản ghi thô ban đầu; D3-counts.json là bảng đối chiếu đã hiệu chỉnh, không đổi baseline hoặc giấu mẫu grep.

SPEC §8 toàn src: **193→160** typography, **0→0** CSS data-slot; D3 typography **33→0**. Không thêm important, data-slot override, dependency, retry, skip hoặc timeout. Giữ mọi assertion hành vi; các assertion yêu cầu slug/cỡ cũ được cập nhật đúng hợp đồng UI mới và có regression riêng giữ filename/handlers.

## Native và bảo toàn dữ liệu

QA debug/incognito identifier net.memnova.qa.d3, MEMNOVA_CONFIG_HOME=/tmp/memnova-d3/native/prefs, Library=/tmp/memnova-d3/native/Library. Tái sử dụng binary debug D2 (Rust không đổi), tên window nội bộ còn Memnova D2 1440 QA; bundle/identifier/config riêng D3 và renderer mã hiện tại qua server sẵn có localhost:5201. Không dùng prefs thật hoặc ~/Laputa, không thay HOME/cài đặt hệ thống.

16 ảnh trước + 16 ảnh sau: 1440×900/1024×700 × en/vi × light/dark × note có tiêu đề/H1 rỗng. Retina gấp đôi số pixel. Sidebar kéo chuột giữ 250px khi lớn, 230px khi nhỏ. Chuyển theme/ngôn ngữ chỉ trong prefs QA. Đã xem contact sheet và ảnh native: H1 thật/đoạn văn giữ typography, Heading rỗng faint/upright, breadcrumb tên đọc được, icon có nhóm và overflow không che tên. Ảnh ghép chỉ đặt nguyên screenshot cạnh nhau, không chỉnh nội dung.

Chuột trước: chọn note, menu More (nhãn Việt), bật/tắt Raw, mở Properties, double-click breadcrumb (draft breadcrumb-slug-d3). Sau đó Cmd+Shift+I đóng Properties, Cmd+K mở Palette, Cmd+\ bật/tắt Raw, Cmd+F mở thanh tìm và Escape đóng; Escape draft không đổi tên. Không hiện render-error. CUA native không có API hover; hover/focus/Escape tooltip kiểm bằng Playwright thật (WebKit), native xác nhận nhãn AX và click/menu. Bundle QA đã thoát.

[Dữ liệu sau QA](evidence/D3-data-preservation.json): **258/258 Markdown hash giống trước; 13/13 bảng SQLite giống từng hàng**, integrity_check=ok, foreign_key_check rỗng. Không đổi tên file, tạo note mới, lịch ôn, cấu trúc SQLite hoặc dữ liệu người dùng trong QA.

| Kích thước · ngôn ngữ · theme | Note có tiêu đề | H1 rỗng |
|---|---|---|
| 1440-en-light | [Trước / sau](evidence/D3-compare-1440-en-light-note.png) | [Trước / sau](evidence/D3-compare-1440-en-light-empty.png) |
| 1440-en-dark | [Trước / sau](evidence/D3-compare-1440-en-dark-note.png) | [Trước / sau](evidence/D3-compare-1440-en-dark-empty.png) |
| 1440-vi-light | [Trước / sau](evidence/D3-compare-1440-vi-light-note.png) | [Trước / sau](evidence/D3-compare-1440-vi-light-empty.png) |
| 1440-vi-dark | [Trước / sau](evidence/D3-compare-1440-vi-dark-note.png) | [Trước / sau](evidence/D3-compare-1440-vi-dark-empty.png) |
| 1024-en-light | [Trước / sau](evidence/D3-compare-1024-en-light-note.png) | [Trước / sau](evidence/D3-compare-1024-en-light-empty.png) |
| 1024-en-dark | [Trước / sau](evidence/D3-compare-1024-en-dark-note.png) | [Trước / sau](evidence/D3-compare-1024-en-dark-empty.png) |
| 1024-vi-light | [Trước / sau](evidence/D3-compare-1024-vi-light-note.png) | [Trước / sau](evidence/D3-compare-1024-vi-light-empty.png) |
| 1024-vi-dark | [Trước / sau](evidence/D3-compare-1024-vi-dark-note.png) | [Trước / sau](evidence/D3-compare-1024-vi-dark-empty.png) |

## Phân tích chất lượng

CodeScene: not run (optional integration unavailable). Không dùng Lizard thay CodeScene.

Codacy CLI 0.24.0, config auto/SARIF ở /tmp, không upload: ESLint9 0 issue, Trivy 0; Opengrep 18 cảnh báo props-spreading có sẵn; Lizard 48→47 issue, giảm một Medium độ dài ConflictNoteBanner. Không có identity issue mới, **không có Critical/High mới**. Critical có sẵn EditorLayout 81 tham số (ngưỡng 80) không tăng; các Medium còn lại là độ dài/độ phức tạp/props của file có sẵn, không đổi hành vi nên không refactor ngoài D3. CLI exit 1 vì baseline finding và analyzer error: Opengrep không parse BreadcrumbBar.tsx (Syntax error, fileNotAnalyzed=true), xác nhận cùng lỗi trên baseline 707bac53 bằng JSON riêng. Đây là giới hạn security scan của file đó, không gọi analyzer đó là pass; tsc/ESLint và test runtime file này đều qua. Tests bị loại theo .codacy.yaml của dự án; không đổi exclusion. [So sánh](evidence/D3-codacy-summary.json).

Localization: 14 khóa mới trong en, dịch trực tiếp đủ locale sau khi Lara thiếu credentials; l10n:validate pass. PostHog: không cần event mới vì chỉ đổi cách trình bày/nhãn của thao tác sẵn có. Refactoring: chỉ chuyển control chrome sang shadcn có sẵn, không tạo abstraction mới. ADR: không có; ADR-0068/0143/0144 giữ nguyên. Docs: ABSTRACTIONS cập nhật surface breadcrumb, CURRENT-STATE cập nhật D3. D4 không làm.

## Gate phát hành

Node 24.12.0: pnpm lint và tsc -b exit 0; pnpm test 504 file / 5007 test pass; pnpm test:coverage pass, lines **87,50%** (ngưỡng 70%). pnpm build exit 0 (cảnh báo chunk lớn có sẵn). Rust cargo test serial **1241 passed**; cargo llvm-cov --no-clean --fail-under-lines 85 serial pass, lines **86,40%**. l10n validator pass. Pre-commit F-036/F-009/F-018 đều qua bình thường; F-018 còn chạy 2 test D3 Chromium pass.

13 smoke ảnh hưởng trực tiếp bởi breadcrumb (auto-rename/save/switch/quick-open/multibyte) pass trong 2,3 phút, retries=0. Các spec dùng chữ breadcrumb làm identity filename được chuyển sang aria-label filename có sẵn, giữ đúng stem/path và mọi kiểm tra byte/file/disk/timeout. Quick-open thêm assertion tiêu đề nhìn thấy; test D3 riêng xác nhận không hiện slug. Không đổi tên ghi chú mới. Chỉ mã app trong D3; các file test ngoài D3 là consumer của hợp đồng breadcrumb, không đổi behavior app ngoài D3.

Hook phát hiện hai precondition cũ ở vault-workflows; baseline 707bac53 độc lập tái hiện 2/2 lỗi (không retry). R-06 sửa test-only riêng: xác nhận cờ Trashed không ẩn note theo ADR-0045, xoá đúng file fixture sao chép rồi giữ assertion vắng mặt/Note C vẫn hiện và kiểm tra disk; mở Properties trước assertion relationships. 8/8 pass, retries=0. Không sửa app hoặc fixture gốc. Lượt hook cũ tự dùng retry=1 theo config hiện có nhưng cả hai vẫn fail; không coi retry là cách sửa. Lượt sửa pass không retry. Baseline Vite lần đầu chưa khởi động trong 60s; dùng cacheDir tạm riêng ngoài source, giữ nguyên timeout, sau đó mới lấy RED hai test thực tế.

`git push origin main` lượt cuối **exit 0**, cập nhật main `707bac53→652b29af`, hook bình thường **8m30s**. Lint/build/coverage pass; **core curated 54/54, 4,6 phút, không test nào retry**, đạt ngân sách dưới5 phút. F-040 không sửa; đã flaky ở lượt push trước nhưng pass lượt cuối. Hook không chạy lại Rust vì không đổi src-tauri; kiểm tra Rust thủ công đầy đủ ở trên đã pass. CodeScene không chạy vì tích hợp chưa cấu hình.

Push đầu exit1 ở hai assertion breadcrumb trong wikilink smoke mà bước cập nhật consumer đã bỏ sót: expected slug, received title, ngay precondition trước chèn/Cmd+click. Sửa đúng hợp đồng F-009: kiểm visible title và giữ stem riêng qua aria-label; giữ nguyên data-target, navigation, filename và assertion body. Focused wikilink 2/2, retries=0; gộp vào commit F-009 rồi push lại bình thường. Đây không phải bằng chứng F-039 runtime tái phát. Lượt đầu còn một F-040 pass nhờ retry cũ. [Lượt đầu](evidence/D3-pre-push-first.txt), [lượt cuối](evidence/D3-pre-push-final.txt), [wikilink không retry](evidence/D3-wikilink-contract.txt).

## R-07/R-08 và giới hạn hồi quy

R-07: hai ca type-create dùng mock mặc định fail trước assertion breadcrumb trên baseline 707bac53. Chuyển thiết lập sang Library filesystem/desktop fixture sẵn có, giữ nguyên kiểm tra editor/loại/frontmatter và timeout, bỏ fixed sleep; 2/2 pass không retry. Commit test riêng, không sửa app/mock. Native/input pipeline không đổi.

R-08 **open, P2 — chưa xác định test/app hay liên quan D3**: lane browser rộng chạy trước khi gộp commit có 45 pass + 3 flaky (create-note-default-properties, new-note-heading-paste-regression, new-note-immediate-editability). Config retry cũ tự chạy, không thêm retry và không coi đây là pass ổn định. Ca thứ nhất chưa có breadcrumb sau Cmd+N; ca paste nhận suffix chữ sai vị trí; ca Home chưa thấy body trong file mong đợi. Probe riêng retries=0: baseline 707bac53 3/3 pass, mã cuối D3 1/3 pass (hai ca đầu fail); một probe paste có log selection lại pass và End chuyển offset20→24. Không đủ bằng chứng gọi là lỗi baseline, không kết luận End sai trên macOS hoặc đã xác định gốc. Toàn bộ log được giữ trong evidence/D3-R08-*.txt. Theo luật đêm, giữ finding mở và không sửa BlockNote/typing để mở rộng D3; core gate cuối ghi riêng bên trên. Không sửa F-040.

Đã xoá đúng hai note trắng do default-mock probe sinh trong demo-vault-v2 (untitled-note-1794942136.md, untitled-note-1794942989.md), giữ fixture gốc. Kiểm cuối `git status --short -- demo-vault demo-vault-v2` và tests/fixtures rỗng; không còn instrumentation test. AGENTS và các file skill/SPEC/PLAN/OVERNIGHT-RULES của người dùng có hash giữ nguyên.

## Commit

- 4878968e — F-036.
- 6b1e6200 — F-009 breadcrumb, accessible name/description và test consumer filename.
- 247911cc — F-018, token chrome và test D3.
- bbdaf558 — R-06, precondition regression filesystem.
- 652b29af — R-07, fixture type-create.

Các fixup đã gộp trước push trong detached checkout riêng; aggregate tree trước/sau giống hệt, không stash/ghi AGENTS hoặc các file hướng dẫn của người dùng. Mỗi finding D3 một commit. Chỉ push main với hook bình thường. Commit docs cuối chứa biên bản và log đêm.

### Modern Web Guidance

- **`toolbar`**: Tôi giữ tên icon qua aria-label đã dịch và chia role group theo chức năng ("Icon-only buttons need an `aria-label`"). Giữ natural Tab theo yêu cầu sản phẩm, không thêm role toolbar/focusgroup khi chưa đổi keyboard contract.
- **`interest-triggered-tooltips`**: Tôi giữ ActionTooltip/Radix và các ARIA do control cung cấp ("Do not override author ARIA"). Nó hỗ trợ hover/focus/Escape và tránh phụ thuộc interestFor/popover hint chưa hỗ trợ Safari; không thêm dependency/polyfill.
- **`accessibility`**: Tôi đặt aria-labelledby vào text tiêu đề và tách hướng dẫn filename thành description ("Do include a control's visible text in its accessible name"). Dùng sr-only/aria-describedby có sẵn để giữ tương thích, không đổi aria-label fallback hoặc handler rename.

Đã cross-check hướng dẫn bằng search/retrieve tập trung; không legacy-scan. Không ép các API mới vào WKWebView, không tuyên bố kiểm VoiceOver hay toàn bộ accessibility của editor/vendor.
