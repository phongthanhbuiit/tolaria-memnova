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

Đang thực hiện các finding còn lại và gate phát hành; chưa tuyên bố D3 hoàn tất.

## F-009 — chỉ breadcrumb

RED 3/4 ca fail khi trigger vẫn hiện slug; GREEN 108/108 test liên quan. Tiêu đề hiện tại H1/frontmatter được ưu tiên, rồi metadata, rồi fallback filename. Draft đổi tên vẫn stem gốc; Escape không ghi, Enter gọi đúng path/stem, entry không đổi. Tạo ghi chú, slugify và đồng bộ tên file giữ nguyên. Native xác nhận tiêu đề hiển thị thay slug, bằng chứng D3-F009-after-native.png. SPEC8 193→193 / 0→0; chỉ sửa hiển thị, chưa đổi typography.
