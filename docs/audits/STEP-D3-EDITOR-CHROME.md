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

F-036 và breadcrumb F-009 đã commit. F-018 có mã/ảnh/test dưới đây; kết quả release và push sẽ ghi sau khi hook kết thúc.

## F-009 — chỉ breadcrumb

RED 3/4 ca fail khi trigger vẫn hiện slug; GREEN 108/108 test liên quan. Tiêu đề hiện tại H1/frontmatter được ưu tiên, rồi metadata, rồi fallback filename. Draft đổi tên vẫn stem gốc; Escape không ghi, Enter gọi đúng path/stem, entry không đổi. Tạo ghi chú, slugify và đồng bộ tên file giữ nguyên. Native xác nhận tiêu đề hiển thị thay slug, bằng chứng D3-F009-after-native.png. SPEC8 193→193 / 0→0; chỉ sửa hiển thị, chưa đổi typography.

## F-018 — công cụ và token chrome

Tái sử dụng ActionTooltip/Radix sẵn có cho icon actionbar; các nhãn icon chính đã có bản dịch ở baseline, nên giữ nguyên khóa/handler/shortcut. Bổ sung nhóm Ghi chú, Giao diện, Thao tác tệp bằng role group + đường phân cách; giữ thứ tự DOM/Tab, đo overflow và các menu item hiện có. Khi hẹp, nhóm tệp vẫn mounted và ẩn theo cơ chế overflow cũ; không đổi danh tính control. Mỗi icon dùng size icon-sm 28px, icon 16px. Không đổi virtualizer/path key từ F-039/F-041.

Nhánh Schedule/Review Deck trước còn tiếng Anh: chuyển tooltip, aria-label và nhãn qua 14 khóa en + mọi catalog. Lara exit 1 vì thiếu LARA_ACCESS_KEY_ID/SECRET; dịch trực tiếp 17 catalog còn lại, validator xác nhận 18 catalog/1042 khóa. Thanh tìm của editor thô dùng ActionTooltip cho các icon, có hover/focus/Escape; tìm/thay thế và input vẫn cùng handler. Các banner/diff/tab chrome dùng Button có sẵn, không đổi role/tab selection hoặc callback. Không tạo API/component dùng chung mới.

RED có hai hành vi hợp lệ: thiếu nhóm chức năng và nhánh due-today chưa dịch. Test kiểm kê icon ban đầu thiếu inspectorCollapsed nên chỉ có 9 icon; sửa fixture để bật icon thứ 10, không lấy lỗi fixture làm bằng chứng sản phẩm. GREEN 67/67 test tập trung; 10 icon tiếng Việt đều có aria-label và focus tooltip. WebKit 2/2 test thật, retries=0: H1 trống đúng faint/normal/400; tiêu đề breadcrumb đúng; double-click giữ stem; hover/focus/Escape tooltip; byte nội dung file giữ nguyên.

Token: caption/small/body/body-lg; hint chọn note 15→body-lg 14; empty frame/header 52→2×control-sm 56; status bar 30→control-md 32; nút/input đi qua API size/controlSize. Bo góc chip/skeleton sm4, control md6, popup/menu lg8. Số width layout, divider 1px, geometry macOS và số kích thước skeleton không phải control được giữ theo spacing hiện có; không chuyển literal sang CSS để né grep. Không sửa shared token hoặc UI primitive. EditorTheme.css chỉ thêm pseudo-placeholder F-036, không sửa CSS typography nội dung/BlockNote pipeline. Floating formatting controls do BlockNote sở hữu đã kiểm kê nhưng nằm ngoài actionbar 10 icon của F-018; không đổi dictionary hoặc input/content config của BlockNote trong D3.

## Bảng trước/sau theo file

Đếm số dòng khớp regex như D2. Control là className/style trực tiếp trên Button/Input/SelectTrigger/TabsTrigger hoặc raw control qua TypeScript AST; helper class của status bar cũng đã bỏ h-6/w-6 thủ công. H/w thô gồm layout, min-w-0, icon, skeleton; radius lẻ chỉ rounded không bậc hoặc borderRadius số, không đếm token hợp lệ. Dữ liệu/regex/dòng control: [D3-counts.json](evidence/D3-counts.json).

| File (src/components/) | SPEC8 chữ | Cỡ cũ | Control h/w | H/w thô | Radius lẻ | Màu literal |
|---|---:|---:|---:|---:|---:|---:|
| `BreadcrumbBar.tsx` | 6→0 | 5→0 | 1→0 | 11→9 | 1→0 | 0→0 |
| `Editor.tsx` | 1→0 | 2→0 | 0→0 | 2→2 | 0→0 | 0→0 |
| `editor-content/EditorContentLayout.tsx` | 1→0 | 4→0 | 0→0 | 10→10 | 5→0 | 0→0 |
| `StatusBar.tsx` | 1→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 |
| `ArchivedNoteBanner.tsx` | 2→0 | 0→0 | 0→0 | 0→0 | 1→0 | 0→0 |
| `ConflictNoteBanner.tsx` | 3→0 | 0→0 | 0→0 | 0→0 | 2→0 | 0→0 |
| `RawEditorFindBar.tsx` | 0→0 | 3→0 | 2→0 | 5→5 | 2→0 | 0→0 |
| `NoteMemoryEditorTabs.tsx` | 0→0 | 0→0 | 0→0 | 2→2 | 0→0 | 0→0 |
| `FlashcardEditorTabs.tsx` | 1→0 | 2→0 | 0→0 | 0→0 | 0→0 | 0→0 |
| `status-bar/StatusBarBadges.tsx` | 5→0 | 0→0 | 2→0 | 2→1 | 5→0 | 0→0 |
| `status-bar/StatusBarSections.tsx` | 4→0 | 0→0 | 0→0 | 3→1 | 0→0 | 0→0 |
| `status-bar/VaultMenu.tsx` | 7→0 | 2→0 | 1→0 | 6→3 | 1→0 | 0→0 |
| `status-bar/AiAgentsBadge.tsx` | 2→0 | 2→0 | 0→0 | 3→1 | 0→0 | 0→0 |
| `status-bar/styles.ts` | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 |

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

### Modern Web Guidance

Đã search/retrieve toolbar và interest-triggered-tooltips bằng query tập trung; không legacy-scan. Áp dụng toolbar “Icon-only buttons need an `aria-label`” và tooltip “Do not override author ARIA”: aria-label là tên đã dịch, tooltip bổ sung shortcut, không thay tên accessible. Giữ ActionTooltip/Radix có hover/focus/Escape và collision handling cho WKWebView; interestFor chưa được Safari hỗ trợ, không thêm polyfill/dependency trong đêm. Hướng dẫn composite toolbar đòi một tab stop/focusgroup, xung đột yêu cầu giữ phím tắt/Tab hiện có: dùng role group, giữ natural Tab thay vì tự nhận role toolbar chưa đáp ứng keyboard contract. Quyết định bảo thủ ghi trong log đêm.

## Gate phát hành

Đang hoàn tất coverage/build và hook; bản ghi kết quả cuối sẽ cập nhật trước push docs.
