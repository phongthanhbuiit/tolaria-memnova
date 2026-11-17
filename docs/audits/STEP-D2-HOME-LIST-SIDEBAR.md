# D2 — Trang chủ, danh sách ghi chú, sidebar

Chế độ FIX; chỉ F-008, F-010, F-033, F-037. Baseline `4c46db3c39c7a927b5570f7cd213080d7861fe9e`, Node 24.19.0. Không sửa D3/D4, F-040 hoặc pipeline dữ liệu.

## Bước 0 — phạm vi và đo trước

38 file dưới đây thuộc các bề mặt đang được App sử dụng. `HomePage.tsx` không được import nên không thuộc phạm vi. Các dialog học, UI primitives, editor/Properties/AI, domain hooks nằm ngoài D2. `NoteListViews.tsx` được kiểm kê nhưng giữ nguyên F-039/F-041.

Đếm số dòng khớp regex, không phải số occurrence. Cột h/w là kiểm kê thô gồm cả layout, icon và giá trị 0; chỉ kích thước control phải chuyển qua API size. Cột radius liệt kê cả token hợp lệ để không che mất baseline.

| File (src/components/) | SPEC8 chữ | Cỡ cũ | h/w literal | radius | Màu chữ literal |
|---|---:|---:|---:|---:|---:|
| `FolderTree.tsx` | 0 | 0 | 1 | 1 | 0 |
| `NoteItem.tsx` | 4 | 0 | 1 | 2 | 0 |
| `NoteList.tsx` | 0 | 0 | 0 | 0 | 0 |
| `Sidebar.tsx` | 0 | 0 | 0 | 0 | 0 |
| `SidebarParts.tsx` | 8 | 0 | 7 | 12 | 0 |
| `folder-tree/FolderContextMenu.tsx` | 0 | 5 | 0 | 1 | 0 |
| `folder-tree/FolderItemRow.tsx` | 1 | 0 | 3 | 3 | 0 |
| `folder-tree/FolderNameInput.tsx` | 1 | 0 | 1 | 2 | 0 |
| `folder-tree/FolderTreeRow.tsx` | 0 | 0 | 0 | 0 | 0 |
| `folder-tree/folderTreeLayout.ts` | 0 | 0 | 0 | 0 | 0 |
| `learning/LearningDashboard.tsx` | 0 | 7 | 4 | 4 | 0 |
| `learning/NoteCatalogFilters.tsx` | 0 | 0 | 3 | 0 | 0 |
| `learning/NoteLearningDashboard.tsx` | 0 | 5 | 4 | 1 | 0 |
| `learning/NoteMemoryList.tsx` | 0 | 2 | 2 | 1 | 0 |
| `note-item/ChangeNoteContent.tsx` | 5 | 1 | 0 | 0 | 0 |
| `note-item/PropertyChips.tsx` | 3 | 0 | 1 | 3 | 0 |
| `note-list/FilterPills.tsx` | 2 | 0 | 1 | 1 | 0 |
| `note-list/InboxFilterPills.tsx` | 2 | 0 | 1 | 1 | 0 |
| `note-list/ListPropertiesPopover.tsx` | 4 | 0 | 4 | 1 | 0 |
| `note-list/NoteListChangesMenu.tsx` | 0 | 0 | 0 | 0 | 0 |
| `note-list/NoteListChangesMenuView.tsx` | 0 | 1 | 0 | 2 | 0 |
| `note-list/NoteListContextMenu.tsx` | 0 | 0 | 0 | 0 | 0 |
| `note-list/NoteListContextMenuView.tsx` | 0 | 2 | 1 | 2 | 0 |
| `note-list/NoteListHeader.tsx` | 3 | 0 | 7 | 3 | 0 |
| `note-list/NoteListLayout.tsx` | 0 | 0 | 2 | 2 | 0 |
| `note-list/NoteListViews.tsx` | 0 | 0 | 0 | 0 | 0 |
| `note-list/PinnedCard.tsx` | 0 | 0 | 0 | 0 | 0 |
| `note-list/RelationshipGroupSection.tsx` | 0 | 0 | 1 | 1 | 0 |
| `note-list/TrashWarningBanner.tsx` | 2 | 0 | 0 | 0 | 0 |
| `note-list/useNoteListModel.tsx` | 0 | 0 | 0 | 0 | 0 |
| `sidebar/FavoritesSection.tsx` | 1 | 0 | 2 | 2 | 0 |
| `sidebar/SidebarGroupHeader.tsx` | 1 | 0 | 1 | 0 | 0 |
| `sidebar/SidebarLoadingSections.tsx` | 0 | 0 | 5 | 6 | 0 |
| `sidebar/SidebarSections.tsx` | 0 | 1 | 4 | 6 | 0 |
| `sidebar/SidebarTopNav.tsx` | 0 | 0 | 0 | 0 | 1 |
| `sidebar/SidebarViewActions.tsx` | 1 | 1 | 1 | 3 | 0 |
| `sidebar/SidebarViewItem.tsx` | 1 | 0 | 1 | 2 | 0 |
| `sidebar/sidebarStyles.ts` | 0 | 0 | 0 | 0 | 0 |

SPEC §8 toàn src trước: typography **232**, CSS `[data-slot=]` **0**. CSS đã bằng 0 nên không thể giảm tiếp; giữ 0 và giảm typography. D2 có **39** dòng typography.

Ảnh native trước: hai QA bundle/incognito riêng, config và Library tạm tại `/tmp/memnova-d2/native/{1440,1024}`; không dùng prefs/vault người dùng. 1440×900 → 2880×1800 pixels Retina; 1024×700 → 2048×1400. Ở cửa sổ nhỏ đã kéo sidebar bằng chuột trước khi đặt chính xác kích thước cửa sổ; giữ bố cục đó khi chụp sau.

## F-008

Header dùng hai Button outline lg; nút ôn tiếp tục là hành động chính. Không thêm logic theo due count, không đổi callback, dữ liệu hoặc analytics. Thay đổi variant/size thuần trình bày, không cần RED hành vi. SPEC8: 232 → 232; CSS slot 0 → 0 (commit thứ bậc nút, chưa phải đợt dọn typography).

## F-010

RED: `vitest run src/components/NoteItem.test.tsx` có 3 fail / 24 tests: ngày khác nhau, ngày trùng nhau + workspace, và fallback chỉ có created đều còn dòng Created thứ hai. GREEN sau sửa bỏ Created; giữ nguyên `getDisplayDate`, formatter, locale và object đầu vào. Không đổi sort hoặc icon/type semantics. Ngày `small`, tên `body` 500, snippet `small`; chips và công cụ dùng token/component sẵn có. Assertion CSS cũ được đổi sang token mới; assertion hành vi không bị bỏ.

## F-033

Thư viện dùng `display`; tiêu đề mục dùng `title`. Thay hai lane button bằng Tabs line có sẵn, giữ scope, query, analytics và lifecycle nội dung. Dùng manual activation vì việc chọn lane gửi analytics; mũi tên chỉ chuyển focus, Enter/Space mới chọn. Radix quản lý roving focus trên WKWebView; không thêm focusgroup (Safari chưa hỗ trợ), dependency hoặc polyfill. Underline dùng border pseudo-element để vẫn thấy trong forced colors. TabsContent không có padding/border/background; wrapper main giữ layout. Bộ lọc md/nhãn small; metadata small, badge trạng thái chỉ trong danh sách Home bo sm và cao 22px bằng padding token trong `NoteMemoryList.css` mới, chỉ scope danh sách Home (không đổi shared CSS ngoài D2).

RED: test tablist/tabpanel thất bại trên button cũ; GREEN 40/40 ca dashboard + note-list. Test dùng mouseDown như các Radix Tabs đang có trong repo, giữ kiểm tra lane và requestStudy. F-010 hook cuối: 78 file / 895 tests pass; test locale vẫn kiểm dữ liệu không đổi.

Kiểm native phát hiện utility trong cascade layer không thắng shared CSS unlayered của status badge. Đã chuyển phần specialization vào CSS của riêng NoteMemoryList (vẫn dùng `@apply` token, không raw font-size, important hoặc data-slot). Không thay shared badge hay các dialog ngoài D2.

## Nghiệm thu

Đang thực hiện; chưa tuyên bố các gate hoặc native sau sửa đã qua.
