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

## F-037 và phần token còn lại của D2

Nav, loại, Saved View, yêu thích và thư mục dùng cùng nền primary/10 + chữ primary + radius md khi chọn. Badge luôn neutral, caption; icon có fill/shape bổ sung cho màu. Khi rời mục loại, màu chữ trở lại foreground bằng class rõ ràng. Giữ màu metadata của icon khi không chọn. Không đổi handler, rename/context menu, drag/drop, điều hướng hoặc lọc. Các control dùng Button/Input size API; bỏ toàn bộ important trong D2. Dọn nốt token của skeleton, nhóm liên quan và chrome, đồng bộ header theo 2 × control-sm, giữ riêng clearance 80/90px của traffic lights macOS.

RED badge neutral thất bại trên baseline (active All Notes còn màu đặc). GREEN: 133 test sidebar/folder; 134 test tập trung cuối gồm sidebar và note-list rendering. Các assertion màu, padding và selector khóa chiều cao 52px cũ được cập nhật sang token/selector độc lập chiều cao; giữ các assertion callback, keyboard, count, dữ liệu và clearance platform. Không có dependency mới.

## Bảng trước/sau theo file

Mỗi ô là số dòng `trước → sau`; cột control được phân loại trên JSX Button/Input/SelectTrigger/TabsTrigger và các raw control tương ứng. Cột h/w thô vẫn gồm icon, layout, min-w-0 và skeleton; đây không phải số control sai kích thước. Radius lẻ = shorthand rounded không bậc hoặc borderRadius số, không đếm các token sm/md/lg/xl/full hợp lệ. [Regex, số thô và dòng control](evidence/D2-counts.json).

| File (src/components/) | SPEC8 chữ | Cỡ cũ | Control h/w | h/w thô | Radius lẻ | Màu literal |
|---|---:|---:|---:|---:|---:|---:|
| `FolderTree.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 0 | 0 → 0 | 0 → 0 |
| `NoteItem.tsx` | 4 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 1 → 0 | 0 → 0 |
| `NoteList.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `Sidebar.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `SidebarParts.tsx` | 8 → 0 | 0 → 0 | 0 → 0 | 7 → 9 | 10 → 0 | 0 → 0 |
| `folder-tree/FolderContextMenu.tsx` | 0 → 0 | 5 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `folder-tree/FolderItemRow.tsx` | 1 → 0 | 0 → 0 | 0 → 0 | 3 → 3 | 3 → 0 | 0 → 0 |
| `folder-tree/FolderNameInput.tsx` | 1 → 0 | 0 → 0 | 0 → 0 | 1 → 0 | 1 → 0 | 0 → 0 |
| `folder-tree/FolderTreeRow.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `folder-tree/folderTreeLayout.ts` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `learning/LearningDashboard.tsx` | 0 → 0 | 7 → 0 | 1 → 0 | 4 → 4 | 1 → 0 | 0 → 0 |
| `learning/NoteCatalogFilters.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 3 → 2 | 0 → 0 | 0 → 0 |
| `learning/NoteLearningDashboard.tsx` | 0 → 0 | 5 → 0 | 0 → 0 | 4 → 4 | 0 → 0 | 0 → 0 |
| `learning/NoteMemoryList.tsx` | 0 → 0 | 2 → 0 | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 |
| `note-item/ChangeNoteContent.tsx` | 5 → 0 | 1 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `note-item/PropertyChips.tsx` | 3 → 0 | 0 → 0 | 0 → 0 | 1 → 0 | 0 → 0 | 0 → 0 |
| `note-list/FilterPills.tsx` | 2 → 0 | 0 → 0 | 0 → 0 | 1 → 0 | 0 → 0 | 0 → 0 |
| `note-list/InboxFilterPills.tsx` | 2 → 0 | 0 → 0 | 0 → 0 | 1 → 0 | 0 → 0 | 0 → 0 |
| `note-list/ListPropertiesPopover.tsx` | 4 → 0 | 0 → 0 | 2 → 0 | 4 → 2 | 1 → 0 | 0 → 0 |
| `note-list/NoteListChangesMenu.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `note-list/NoteListChangesMenuView.tsx` | 0 → 0 | 1 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `note-list/NoteListContextMenu.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `note-list/NoteListContextMenuView.tsx` | 0 → 0 | 2 → 0 | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 |
| `note-list/NoteListHeader.tsx` | 3 → 0 | 0 → 0 | 1 → 0 | 7 → 5 | 2 → 0 | 0 → 0 |
| `note-list/NoteListLayout.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 2 → 0 | 0 → 0 |
| `note-list/NoteListViews.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `note-list/PinnedCard.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `note-list/RelationshipGroupSection.tsx` | 0 → 0 | 0 → 0 | 1 → 0 | 1 → 0 | 0 → 0 | 0 → 0 |
| `note-list/TrashWarningBanner.tsx` | 2 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `note-list/useNoteListModel.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| `sidebar/FavoritesSection.tsx` | 1 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 2 → 0 | 0 → 0 |
| `sidebar/SidebarGroupHeader.tsx` | 1 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 0 → 0 | 0 → 0 |
| `sidebar/SidebarLoadingSections.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 5 → 4 | 3 → 0 | 0 → 0 |
| `sidebar/SidebarSections.tsx` | 0 → 0 | 1 → 0 | 0 → 0 | 4 → 0 | 0 → 0 | 0 → 0 |
| `sidebar/SidebarTopNav.tsx` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 0 |
| `sidebar/SidebarViewActions.tsx` | 1 → 0 | 1 → 0 | 1 → 0 | 1 → 1 | 1 → 0 | 0 → 0 |
| `sidebar/SidebarViewItem.tsx` | 1 → 0 | 0 → 0 | 0 → 0 | 1 → 1 | 2 → 0 | 0 → 0 |
| `sidebar/sidebarStyles.ts` | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| **Tổng 38 file có sẵn** | 39 → 0 | 25 → 0 | 6 → 0 | 58 → 44 | 29 → 0 | 1 → 0 |

`learning/NoteMemoryList.css` là file D2 mới, chỉ có @reference và @apply các token, không có font-size số/data-slot/important. Không chuyển literal sang CSS để né grep. Kích thước icon đi qua API của icon và spacing token hiện có; các số layout/placeholder, geometry platform, đường viền 1px và cấu hình virtualizer không bị biến thành control size mới. Không sửa tokens dùng chung hoặc editor.

| Commit / finding | SPEC8 typography toàn src | CSS data-slot |
|---|---:|---:|
| Baseline `4c46db3c` | 232 | 0 |
| `70212a69` F-008 (variant/size) | 232 | 0 |
| `14154524` F-010 | 210 | 0 |
| `6f9932a8` F-033 | 207 | 0 |
| F-037 / D2 cuối | 193 | 0 |

Không có số nào tăng. Cột CSS đã bằng 0 trước D2 nên không thể giảm; commit F-008 chỉ đổi thứ bậc nút nên không có match typography để bỏ. Tổng typography giảm 39 dòng; phần còn lại nằm ngoài D2.

## Ảnh native trước/sau

Hai bundle Tauri QA riêng, incognito, prefs/Library tạm; không ghi vào cấu hình người dùng. Chụp nguyên cửa sổ, không ghép hoặc sửa nội dung ảnh; chuyển định dạng từ byte JPEG của screenshot API sang PNG không đổi số pixel. Indicator chia sẻ màn hình/con trỏ macOS có thể xuất hiện trong ảnh. [Kích thước và SHA-256](evidence/D2-native-images.json).

| Cỡ / locale / theme / bề mặt | Trước | Sau |
|---|---|---|
| 1440-en-light-home | ![trước](evidence/D2-before-1440-en-light-home.png) | ![sau](evidence/D2-after-1440-en-light-home.png) |
| 1440-en-light-list | ![trước](evidence/D2-before-1440-en-light-list.png) | ![sau](evidence/D2-after-1440-en-light-list.png) |
| 1440-en-dark-home | ![trước](evidence/D2-before-1440-en-dark-home.png) | ![sau](evidence/D2-after-1440-en-dark-home.png) |
| 1440-en-dark-list | ![trước](evidence/D2-before-1440-en-dark-list.png) | ![sau](evidence/D2-after-1440-en-dark-list.png) |
| 1440-vi-light-home | ![trước](evidence/D2-before-1440-vi-light-home.png) | ![sau](evidence/D2-after-1440-vi-light-home.png) |
| 1440-vi-light-list | ![trước](evidence/D2-before-1440-vi-light-list.png) | ![sau](evidence/D2-after-1440-vi-light-list.png) |
| 1440-vi-dark-home | ![trước](evidence/D2-before-1440-vi-dark-home.png) | ![sau](evidence/D2-after-1440-vi-dark-home.png) |
| 1440-vi-dark-list | ![trước](evidence/D2-before-1440-vi-dark-list.png) | ![sau](evidence/D2-after-1440-vi-dark-list.png) |
| 1024-en-light-home | ![trước](evidence/D2-before-1024-en-light-home.png) | ![sau](evidence/D2-after-1024-en-light-home.png) |
| 1024-en-light-list | ![trước](evidence/D2-before-1024-en-light-list.png) | ![sau](evidence/D2-after-1024-en-light-list.png) |
| 1024-en-dark-home | ![trước](evidence/D2-before-1024-en-dark-home.png) | ![sau](evidence/D2-after-1024-en-dark-home.png) |
| 1024-en-dark-list | ![trước](evidence/D2-before-1024-en-dark-list.png) | ![sau](evidence/D2-after-1024-en-dark-list.png) |
| 1024-vi-light-home | ![trước](evidence/D2-before-1024-vi-light-home.png) | ![sau](evidence/D2-after-1024-vi-light-home.png) |
| 1024-vi-light-list | ![trước](evidence/D2-before-1024-vi-light-list.png) | ![sau](evidence/D2-after-1024-vi-light-list.png) |
| 1024-vi-dark-home | ![trước](evidence/D2-before-1024-vi-dark-home.png) | ![sau](evidence/D2-after-1024-vi-dark-home.png) |
| 1024-vi-dark-list | ![trước](evidence/D2-before-1024-vi-dark-list.png) | ![sau](evidence/D2-after-1024-vi-dark-list.png) |

Bằng chứng bổ sung F-037: [Saved View](evidence/D2-after-1024-vi-light-view.png), [loại](evidence/D2-after-1024-vi-light-type.png), [thư mục và mục loại trở về foreground](evidence/D2-after-1024-vi-light-folder.png). Chuột mở Home, All Notes, Saved View, loại, thư mục; counter giữ nguyên. Tab lane: chuột chọn Old cards, Left chỉ chuyển focus về Note memory, Enter mới chọn. [AX native](evidence/D2-native-tabs.txt). Command Palette đổi en/vi và nút footer đổi sáng/tối đều hoạt động. Không chấm lượt ôn hoặc sửa nội dung. Favorites không có trong fixture native này; thao tác và render được kiểm bằng test sidebar hiện có.

Trong quá trình đổi nguồn qua HMR để cô lập commit, một phiên dev giữ layout cũ/hiện danh sách trống tạm thời. Đã khởi động sạch QA, đợi Library load và kiểm lại điều hướng/các hàng; ảnh sau dùng trạng thái đã render. Không sửa virtualizer hoặc thêm timeout/retry để che trạng thái đó. Hai QA process đã thoát khi hoàn tất; server 5201 sẵn có được giữ nguyên.

## Bảo toàn hợp đồng và dữ liệu

[Source được giữ nguyên](evidence/D2-preserved-source.json): NoteListViews (F-039 path keys + F-041 stable virtualizer), useNoteListModel, getDisplayDate/sort helpers và dispatcher phím tắt khớp byte với baseline. Không thay SQL/Rust, parser, codec, lưu note hoặc lịch FSRS. Ngoại lệ ARIA có chủ đích: Home lane chuyển từ aria-pressed button sang Tabs aria-selected/tabpanel do Radix quản lý; giữ nội dung và analytics, không strip ARIA do thư viện sinh ra.

[Kiểm native read-only sau khi quit](evidence/D2-data-preservation.json): mỗi Library khớp **256/256** Markdown SHA-256 (bao gồm bản backup fixture), cả 13 bảng SQLite khớp từng hàng. Store chính: 11 pages, 5 cards/schedules/bindings, 5 sessions, 4 reviews, 23 operations; không tăng lượt học. Store và hai backup đều integrity_check=ok, foreign_key_check rỗng. Demo vault không có dirt.

## Kiểm tra phát hành

Node **24.19.0**, pnpm **10.27.0**. [Commands, exit code và coverage](evidence/D2-checks.json).

- `pnpm lint`, `pnpm exec tsc -b`, `pnpm test`: pass **502 file / 5.000 test**. `pnpm test:coverage`: pass, **87,49% lines** (83,71% statements, 75,76% branches, 85,35% functions), gate ≥70%. `pnpm build` pass; cảnh báo chunk >500kB đã có, không đổi ngưỡng.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` pass. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1` pass **86,40% lines**, gate ≥85%. Chạy serial để không tranh chấp probe Codex stdin có sẵn; không sửa Rust hoặc test.
- WebKit integration: `BASE_URL=http://localhost:5201 MEMNOVA_PLAYWRIGHT_WEBKIT=1 pnpm exec playwright test --config playwright.integration.config.ts tests/integration/note-memory-workspace.spec.ts --retries=0`: **5/5**, 35,3s. Có cả hai biến thể literal marker, tạo backup từ Home và lưu note thường rồi mở Command Palette. [Log](evidence/D2-webkit.txt). Không sửa spec, assertion, timeout, retry, skip hoặc F-041 để đạt kết quả.
- Probe renderer: **16/16** case (Chromium/WebKit × 1024/1440 × en/vi × light/dark), badge **22px / radius 4px / chữ 12px**, nhãn filter 12px, heading mục 16px, không overflow ngang. Chuột/Left/Enter manual activation ở cả hai engine; forced colors Chromium giữ border underline. [Số đo](evidence/D2-browser-metrics.json), [script chạy lại từ repo với server 5201](evidence/D2-browser-probe.mjs). Đây là renderer fixture, không thay bằng chứng native hoặc filesystem.
- `pnpm l10n:validate`: **18 catalog × 1.028 key**, pass; no UI copy changes.
- Codacy MCP không có trong tool inventory; dùng local Analysis CLI **0.24.0** với auto config/SARIF ngoài tracked source, không upload. ESLint9 0→0, Semgrep 21→21, Trivy 0→0; Lizard **56→54** warning Medium. Không analyzer error, **không Critical/High mới**. [Đối chiếu từng warning](evidence/D2-codacy-summary.json). Đã review props spreading/complexity hiện có; parser Lizard đổi attribution anonymous → NoteLearningDashboard và báo NLOC 77→113, CCN 18→22 ở JSX sau Tabs. Hai signature Medium này được giữ: phần thay đổi chỉ trình bày và gom hai analytics callback thành onValueChange, không có đường IO/security mới; không tắt rule hoặc coi Lizard là CodeScene. Script probe mới được scan riêng: **0 issue / 4 analyzers**, [log](evidence/D2-codacy-probe.txt). Tests giữ project exclusions và được kiểm bởi lint/test runner.
- CodeScene: not run (optional integration unavailable).
- Demo dirt: `git status --short -- demo-vault demo-vault-v2` rỗng. Không stage AGENTS, skill, PLAN, SPEC hoặc các tài liệu untracked do người dùng tạo.

Một finding một commit trên main, hooks bật. Hook F-037 đã qua changed-file lint, incremental types và related tests. Các lần hook chặn assertion CSS cũ được sửa đúng token; không hạ gate hoặc dùng no-verify. Lượt push đầu được chủ động dừng trước cập nhật remote để trả ba menu loại về variant ghost gốc, bảo toàn nền hover; 10/10 test menu/title bar và Codacy file đó khớp các warning cũ ([biên bản](evidence/D2-menu-preservation.json)). `git push origin main` sau sửa chạy lại toàn bộ pre-push bắt buộc; đối chiếu HEAD với origin/main sau khi push trong phiên thực hiện.

## Modern Web Guidance

- **tabs**: Tôi dùng manual activation vì “Selecting a tab has side effects”; giữ analytics hiện có. “Draw the underline with a border on a pseudo-element” dẫn tới border underline thay background, còn thấy trong forced colors. Radix hiện có hỗ trợ WKWebView thay cho focusgroup chưa được Safari hỗ trợ; không thêm API/polyfill.
- **accessibility**: Tôi giữ heading semantic và một h1 theo “Use one `<h1>` element per page”, cùng focus/target của UI primitives. Native mouse và Left/Enter đã kiểm; không thay shortcut app.
- **color**: Tôi giữ token chữ và icon fill/underline theo “Don't use color alone”, không đưa màu literal mới hoặc đổi palette. Cả light/dark có ảnh native; không tuyên bố đã đo tương phản toàn bộ app ngoài D2.
- **css**: Tôi scope badge trong danh sách Home theo “Overrides are fine for specialization”. Shared badge CSS hiện unlayered, nên specialization cũng unlayered, dùng @apply token; không sửa thứ tự layer toàn app, không important/data-slot, không ảnh hưởng dialog khác.

Localization: no UI copy changes; không cần gọi dịch. PostHog: no event needed because chỉ đổi trình bày; giữ `memnova_learning_lane_selected` và các event hiện có. Refactoring: chỉ trình bày trong D2; không pipeline mới. ADRs: none. Docs: biên bản này, FINDINGS, CURRENT-STATE. CodeScene: not run (optional integration unavailable).
