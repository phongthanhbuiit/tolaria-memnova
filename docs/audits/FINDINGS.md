# Findings

Quy tắc ghi: xem [skill](../../.agents/skills/memnova-audit/SKILL.md). ID tăng dần, không tái sử dụng.
Trạng thái: `open` · `rejected (lý do)` · `fixed (<commit>)`.

## Đợt 0 — rà soát ban đầu (17/11/2026)

Nguồn: 5 ảnh native baseline của commit `199e69de` + quét grep mã nguồn. **Chưa chạy app trực tiếp**, nên mỗi finding ghi rõ độ chắc:
`ảnh` = thấy trực tiếp trên ảnh · `mã` = số đếm grep, cần mở file xác nhận · `nghi ngờ` = suy ra, phải tái hiện trước khi sửa.

Ảnh viết tắt (đều nằm trong `docs/baselines/ui/`):
`HOME` = `2026-11-16-library-writing/home.png` · `WRITE` = `2026-11-16-library-writing/writing.png` ·
`PROPS` = `2026-11-16-properties-polish/review-action.png` · `REVIEW` = `2026-11-16-release-acceptance/note-review.png`

| ID | Mức | Mục | Tóm tắt | Chắc | Trạng thái |
|---|---|---|---|---|---|
| F-001 | P1 | C2 | File nội bộ `.memnova/retired/<uuid>.md` lộ ra danh sách Thư viện | ảnh | open |
| F-002 | P1 | C4 | Ngày trong danh sách ghi chú là tiếng Anh khi UI tiếng Việt | ảnh | fixed (9c951e78) |
| F-003 | P1 | C4 | Nhãn Properties tiếng Anh lẫn trong UI tiếng Việt | ảnh | open |
| F-004 | P1 | C4 | Công tắc "Ôn tập ghi chú này" và nút "Ôn ghi chú này" gần như trùng tên | ảnh | open |
| F-005 | P1 | C5 | Nút chỉ có icon thiếu `aria-label` (~58 chỗ) | mã | open |
| F-006 | P1 | C3 | 38 phần tử form HTML thô ngoài `ui/` (vi phạm AGENTS.md) | mã | open |
| F-007 | P2 | C4 | Thuật ngữ học tập không nhất quán (trang/ghi chú, ghi nhớ/ôn/gợi nhớ) | ảnh | open |
| F-008 | P2 | C3 | Hai nút chính màu xanh cạnh tranh trên Trang chủ | ảnh | fixed (`70212a69`) |
| F-009 | P2 | C1 | Ghi chú mới tên "Untitled Note 1794825081", breadcrumb hiện slug | ảnh | partial — breadcrumb fixed (`:/fix: F-009 show note titles in breadcrumb`); đặt tên mới ngoài D3 |
| F-010 | P2 | C3 | Mỗi hàng danh sách hiện hai ngày giống nhau, ngày đầu không nhãn | ảnh | fixed (`14154524`) |
| F-011 | P2 | C4 | Hạn ôn hiện mốc thời gian thô, không nói quá hạn bao lâu | ảnh | open |
| F-012 | P2 | C2 | Nhãn đỏ "Cần xử lý" không nói phải làm gì | ảnh | open |
| F-013 | P2 | C3 | Properties: khung rỗng chiếm chỗ, đẩy thao tác học xuống dưới | ảnh | fixed (975948d0, b8796a72, f1a741e0; D1) |
| F-014 | P2 | C3 | Nút ôn chính trong Properties trông như nút phụ/vô hiệu | ảnh | fixed (7be04257; D1) |
| F-015 | P2 | C3 | Màn ôn: 4 nút chấm điểm viền màu dày lạc khỏi ngôn ngữ thị giác của app | ảnh | fixed (87129845, superseded by F-028) |
| F-016 | P2 | C4 | Màn ôn: "0/1 · 0 reviews", "in 1 min." khó hiểu | ảnh | fixed (60445d20) |
| F-017 | P2 | C4 | "Hộp thư đến", "Library", "Notes", thư mục `views` trong sidebar tiếng Việt | ảnh | open |
| F-018 | P2 | C5 | Thanh công cụ editor 10 icon không nhãn | ảnh | fixed (`:/fix: F-018 group and label editor chrome`) |
| F-019 | P2 | C5 | 27 chỗ `outline-none`, có thể mất vòng focus | mã | open |
| F-020 | P2 | C1 | "Trang chủ" và "Ôn tập" trên sidebar: không rõ khác nhau thế nào | nghi ngờ | open |
| F-021 | P2 | C9 | 8 component > 850 dòng (App.tsx 1886) | mã | open |
| F-022 | P3 | C4 | Chữ nội bộ lộ ra: "Lịch ôn · chỉ đọc", "Thuộc tính của trang" trong panel "Thuộc tính" | ảnh | open |

## Chi tiết

### F-001 — File nội bộ lộ ra danh sách Thư viện
- Thực tế (`HOME`): 4+ hàng "Untitled Note 17948260xx" với đường dẫn `.memnova/retired/e79dab74-….md`, làm "Ghi chú · 12" lệch với "4 đến hạn".
- Mong đợi: người dùng không bao giờ thấy đường dẫn `.memnova/` hay UUID.
- Bắt đầu tìm: nơi dựng danh sách học của Trang chủ (grep `retired` trong `src-tauri/` và module learning; `src/` chỉ có ở mock).
- Cần quyết định sản phẩm trước khi sửa: ẩn hẳn, hay gom vào một mục "Cần xử lý (n)" riêng có giải thích. **Dừng hỏi chủ dự án.**
- Chấp nhận: danh sách không chứa mục nào có đường dẫn bắt đầu bằng `.memnova/`; số đếm khớp số hàng; có test.

### F-002 — Ngày tiếng Anh trong UI tiếng Việt
- **R-01 hoàn tất — fixed (`9c951e78`):** sáu commit riêng; bỏ locale mặc định, Calendar/tháng/thứ/aria theo app, bộ lọc ngày, Git/Pulse relative time, subtitle/Search với số nhiều và số đếm theo locale. 4.974 unit pass; 32 test ở mỗi TZ Los Angeles/TP.HCM; native en↔vi sáng/tối, dữ liệu giữ nguyên; coverage frontend 87,46%, Rust 86,40%; l10n 18 catalog/1.028 key. [Bảng commit, RED/GREEN, ảnh và giới hạn](R-01-F-002-COMPLETION.md). Push mã thành công bằng hook hiện có, ca F-039 còn flaky/pass retry; không sửa finding đó.
- **R-01 — reopened (17/11/2026):** review độc lập FAIL. Còn sót: formatter `dateDisplay.ts:39,58,68,83` mặc định en; Calendar chưa nhận locale app (Properties/AddPropertyForm/learning/DateValueInput); preview/title/aria bộ lọc ngày format cứng tiếng Anh; Git history today/yesterday/Nd/Nmo ago; note list relativeDate just now/Nm/Nh/Nd ago; subtitle/Search N words/Empty/link(s), số đếm en-US và thiếu plural theo locale. Giữ nguyên dữ liệu lưu, parser, ISO nhập, sort và lịch ôn. Chỉ đổi fixed sau khi đủ tiêu chí R-01 và có báo cáo [R-01](R-01-F-002-COMPLETION.md).
- Thực tế (`WRITE`): "November 16, 2026", "Created November 16, 2026". Trong khi Properties (`PROPS`) hiện "16:14 ngày 16 thg 11, 2026".
- Mong đợi: một hàm định dạng ngày dùng chung, theo locale đang chọn; chữ "Created" lấy từ `en.json`.
- Bắt đầu tìm: component hàng danh sách ghi chú; grep `Created` và `toLocaleDateString`/`Intl.DateTimeFormat`.
- Chấp nhận: đổi ngôn ngữ sang vi → không còn tên tháng tiếng Anh ở bất kỳ bề mặt nào; test với locale vi.
- Sửa: truyền locale hiện có vào formatter dùng chung cho ngày hiển thị; thay bảng tháng tiếng Anh bằng Intl, giữ US/European/ISO và ngày lịch gốc. “Created” lấy từ key đã dịch `noteList.sort.created`. Regression test chuyển locale ngay trên cùng hàng ghi chú; QA native đối chiếu Anh ↔ Việt và hai theme. [Biên bản, ảnh và giới hạn kiểm tra](F-002-LOCALIZED-DATES.md).

### F-003 — Nhãn Properties tiếng Anh
- Thực tế (`PROPS`): "Type, Status, Date, URL, Icon, Belongs to, Related to, Has" cạnh "Thuộc tính", "Thêm thuộc tính".
- Lưu ý: đây có thể là tên khoá frontmatter. Khoá trong file giữ nguyên; chỉ dịch **nhãn hiển thị** của các khoá hệ thống. Khoá do người dùng tự tạo hiển thị nguyên văn.
- Chấp nhận: các khoá hệ thống có nhãn dịch trong mọi locale; file Markdown không đổi một byte.

### F-004 — Hai điều khiển gần trùng tên
- Thực tế (`PROPS`): công tắc "Ôn tập ghi chú này" (bật/tắt lịch) ngay trên nút "Ôn ghi chú này" (mở phiên ôn).
- Đề xuất: công tắc → "Đưa vào lịch ôn"; nút → "Ôn ngay". Cập nhật luôn câu hướng dẫn ở Trang chủ đang trích tên công tắc.
- Chấp nhận: hai nhãn không dùng chung động từ; mọi locale được cập nhật; `pnpm l10n:validate` pass.

### F-005 — Nút icon thiếu tên truy cập
- Thực tế: grep `size="icon` không kèm `aria-label` cùng dòng ≈ 58. Phép đếm một dòng nên có dương tính giả — mở từng file xác nhận.
- Chấp nhận: axe qua Playwright không còn lỗi `button-name` trên S1–S11; mỗi nút icon có tooltip trùng `aria-label`.

### F-006 — Phần tử form HTML thô
- Thực tế: 38 chỗ `<button|input|select|textarea>` ngoài `src/components/ui`. Nhiều nhất: `inspector/InspectorChrome.tsx` (4), `StatusDropdown.tsx` (4), `EditableValue.tsx` (4), `inspector/RelationshipsPanel.tsx` (3), `TagsDropdown.tsx` (3), `AddPropertyForm.tsx` (3).
- Sửa: thay bằng `Button`/`Input`/`Select` shadcn, **mỗi file một commit**, giữ nguyên hành vi và test hiện có.
- Chấp nhận: grep còn 0 (hoặc từng ngoại lệ có chú thích lý do).

### F-007 — Thuật ngữ học tập
- Thực tế: "Ghi nhớ trang", "Ôn tập", "Ôn ghi chú đến hạn", "Thẻ cũ", "Gợi nhớ", "Thuộc tính của trang" — vừa "trang" vừa "ghi chú" cho cùng một thứ.
- Sửa: lập bảng thuật ngữ (1 khái niệm = 1 từ mỗi ngôn ngữ) trong `docs/audits/GLOSSARY.md`, chủ dự án duyệt, rồi mới sửa locale.

### F-008 — Hai nút chính trên Trang chủ
- Thực tế (`HOME`): "Ghi chú mới" và "Ôn ghi chú đến hạn (4)" cùng kiểu nút đặc màu xanh.
- Sửa: mỗi vùng chỉ một nút chính. Đề xuất giữ "Ôn ghi chú đến hạn" là chính khi có bài đến hạn, "Ghi chú mới" là outline; đảo lại khi không có bài đến hạn.

- D2: hai hành động viết/duyệt ở header dùng outline lg; giữ nút ôn làm hành động chính. Không đổi callback hoặc thêm điều kiện theo lịch học. [Bằng chứng D2](STEP-D2-HOME-LIST-SIDEBAR.md).

### F-009 — Tên ghi chú mặc định
- Thực tế (`REVIEW`, `HOME`): tiêu đề "Untitled Note 1794825081", breadcrumb "untitled-note-1794825081"; (`WRITE`) breadcrumb "pomodoro" thay vì tiêu đề "Pomodoro".
- Sửa: tiêu đề mặc định đã dịch ("Chưa đặt tên"), số chống trùng chỉ nằm ở tên file; breadcrumb hiện tiêu đề.
- Lưu ý: chạm cách đặt tên file → đọc ADR liên quan trước, không đổi tên file đã có.

- D3: breadcrumb ưu tiên H1 hiện tại → frontmatter → metadata → filename fallback. Chỉ hiện một tiêu đề; Enter/double-click vẫn mở stem thật, rename/sync vẫn hành động tường minh. Không đổi đặt tên mới. RED 3/4 fail → GREEN 4/4; suite liên quan 108/108. [Bằng chứng D3](STEP-D3-EDITOR-CHROME.md).

### F-010 — Hai ngày trùng nhau trên mỗi hàng
- Thực tế (`WRITE`): "November 16, 2026    Created November 16, 2026" ở mọi hàng.
- Sửa: chỉ hiện ngày theo tiêu chí sắp xếp đang chọn; dùng ngày tương đối ("Hôm qua") cho mốc gần.

- D2 theo yêu cầu chủ dự án: bỏ ngày tạo thứ hai; giữ nguyên `getDisplayDate` (modified → created), formatter, locale, sort và dữ liệu. RED: 3 ca thất bại vì ngày lặp; GREEN: ca ngày khác/giống/fallback/null và workspace badge. Chuẩn hoá token chữ/control của hàng và công cụ danh sách. [Bằng chứng D2](STEP-D2-HOME-LIST-SIDEBAR.md).

### F-011 — Hạn ôn dạng mốc thô
- Thực tế (`HOME`): "07:00 ngày 1 thg 1, 2026" cạnh nhãn "Đến hạn" (đã quá hạn hơn 10 tháng).
- Sửa: "Quá hạn 10 tháng" / "Đến hạn hôm nay" / "Còn 3 ngày"; mốc đầy đủ đưa vào tooltip.

### F-012 — "Cần xử lý" không có hướng dẫn
- Thực tế (`HOME`): nhãn đỏ, không tooltip nhìn thấy, không hành động. Phụ thuộc quyết định ở F-001.
- Chấp nhận: bấm/di chuột vào nhãn nêu lý do và có ít nhất một hành động khắc phục.

### F-013 — Properties nhiều khung rỗng
- Thực tế (`PROPS`): 4 dòng "—" + 3 khung nét đứt "Thêm" + 2 nút lớn chiếm ~60% chiều cao trước khi tới phần học.
- Sửa: gộp thuộc tính rỗng sau một dòng "Thêm thuộc tính"; quan hệ rỗng thu thành một nút; đưa khối học lên trên hoặc cho thu gọn từng nhóm.
- Yêu cầu ban đầu: **đổi bố cục panel → cần chủ dự án duyệt phác thảo trước.** Chủ dự án đã giao FIX D1 theo SPEC §7; giữ đủ hành động và không thêm menu/bước thao tác.
- D1: gợi ý thuộc tính thành lưới tự co theo cỡ chữ, quan hệ thành hàng nhãn + nút thêm; bỏ khung nét đứt, inset 16px. [Ảnh sáng/tối và nghiệm thu](STEP-D1-PROPERTIES-MNEMONIC.md).

### F-014 — Nút ôn trông như nút phụ
- Thực tế (`PROPS`): "Ôn ghi chú này" nền xám nhạt, giống trạng thái disabled; trên `HOME` cùng hành động lại là nút xanh đặc.
- Sửa: dùng variant `default` của `Button` khi ghi chú đến hạn, `outline` khi chưa.
- D1: phân biệt bằng due và clock hiện có; giữ guard enabled và dispatch scope. Có regression test cùng ảnh tương lai hai theme trong [biên bản](STEP-D1-PROPERTIES-MNEMONIC.md).

### F-015 — Nút chấm điểm lạc tông
- Thực tế (`REVIEW`): 4 ô viền đỏ/cam/lục/lam dày 2px; thẻ gợi nhớ là hộp lồng hộp (nền xám bọc nền trắng).
- Sửa: dùng `Button variant="outline"` + chấm màu nhỏ hoặc nền nhạt từ biến theme; bỏ một lớp hộp của thẻ. Dùng skill `interface-design` khi sửa.

### F-016 — Chữ khó hiểu ở màn ôn
- Thực tế (`REVIEW`): "0/1 · 0 reviews"; "in 1 min."; "Return to article" trong khi nơi khác gọi là note.
- Sửa: "Ghi chú 1/1 · chưa ôn lần nào"; "sau 1 phút"; "Quay lại ghi chú".

### F-017 — Sidebar lẫn ngôn ngữ và thư mục nội bộ
- Thực tế (`HOME`): "Hộp thư đến" (nghĩa hộp thư email), gốc thư mục "Library" dù tiêu đề là "Thư viện", loại "Notes", thư mục `views` (chứa Saved View) hiện như thư mục môn học.
- Sửa: "Hộp thư đến" → "Chưa sắp xếp"; dịch nhãn gốc và loại mặc định; ẩn `views` khỏi cây thư mục (xác nhận đó là thư mục hệ thống trước).

### F-018 — Thanh công cụ editor
- Thực tế (`WRITE`): 10 icon liền nhau, một số khó đoán. Cần kiểm tooltip + phím tắt khi chạy app.
- Sửa: tooltip có tên + phím tắt cho từng nút; gom nút ít dùng vào "…".

- D3: giữ nhãn/tooltip đã có của icon chính; thêm nhóm chức năng, dịch nhánh Schedule/Review Deck và focus tooltip thanh tìm. Token hoá chrome/status bar; 10 icon AX/tooltip tiếng Việt kiểm riêng. [Nghiệm thu D3](STEP-D3-EDITOR-CHROME.md).

### F-019 — `outline-none`
- Thực tế: 27 chỗ. Mở từng chỗ, kiểm có `focus-visible:ring` thay thế không.
- Chấp nhận: Tab qua mọi điều khiển đều thấy vòng focus ở cả hai theme.

### F-020 — Trang chủ và Ôn tập
- Nghi ngờ: Trang chủ đã chứa danh sách học + nút ôn; mục "Ôn tập" riêng có thể trùng. Chạy app, so hai màn rồi mới kết luận.

### F-021 — Component quá lớn
- `App.tsx` 1886 · `AiWorkspace.tsx` 1403 · `SingleEditorView.tsx` 1389 · `BreadcrumbBar.tsx` 1247 · `SettingsPanel.tsx` 1221 · `inspector/RelationshipsPanel.tsx` 986 · `status-bar/StatusBarBadges.tsx` 862 · `tolariaEditorFormatting.tsx` 851.
- Chỉ tách khi một finding khác buộc phải sửa file đó. Không refactor hàng loạt.

### F-022 — Chữ nội bộ
- "Lịch ôn · chỉ đọc" → "Lịch ôn". Nút "Thuộc tính của trang" trong panel "Thuộc tính" → đổi tên theo đúng thứ nó mở.

## Đợt 1 — hệ thống thị giác (17/11/2026)

Nguồn: kiểm kê grep toàn `src/` + đọc `learning/LearningStudyView.tsx`, `LearningStudyFaces.tsx`, `noteMemory.css`, `index.css` + 3 ảnh màn học. Số đo và cách sửa chi tiết: [`DESIGN-SPEC.md`](DESIGN-SPEC.md). Các finding dưới đây là **gốc rễ**; nhiều finding Đợt 0 (F-008, F-013, F-014, F-015) là triệu chứng của chúng.

| ID | Mức | Tóm tắt | Bằng chứng | Sửa theo | Trạng thái |
|---|---|---|---|---|---|
| F-023 | P1 | Không có thang chữ: 15+ cỡ, đặt bằng 4 cách khác nhau | SPEC §0 | SPEC §1 | fixed (ddbeb0d2, nền tảng bước A; call sites B–D chưa dọn) || fixed (ddbeb0d2, foundation A; call sites B–D pending) |
| F-024 | P1 | ≥ 120 chỗ chữ 8–10px, khó đọc | `text-[10px]` 45, `text-[9px]` 6, `fontSize: 8/9/10` 12… | SPEC §1 | open |
| F-025 | P1 | `--text-muted` #B4B4B4 (≈2.1:1) dùng cho nhãn đọc được; token màu chữ trùng giá trị | `src/index.css:86-90` | SPEC §2 | fixed (207e1294, nền tảng bước A; call sites B–D chưa dọn) || fixed (207e1294, foundation A; call sites B–D pending) |
| F-026 | P1 | CSS tính năng ghi đè component shadcn (`[data-slot=…]`) → cùng `Button`/`Switch` mà mỗi màn một cỡ | `learning/noteMemory.css:10-18,31,64,83-85` | SPEC §3 | fixed (a2428886) |
| F-027 | P1 | Màn ôn thẻ: ba vùng lệch mép (`max-w-4xl` / `3xl` / `2xl`), hộp lồng hộp, nội dung cần nhớ yếu hơn tiêu đề | `LearningStudyView.tsx:138,296`, `LearningStudyFaces.tsx:71,87,149` | SPEC §6 | fixed (62053c7a + 96754f2a) |
| F-028 | P1 | Nút chấm điểm `border-2` viền màu + nền nhuộm, cao tự do | `LearningStudyView.tsx:332`, `noteMemory.css:110-115` | SPEC §6 | fixed (87129845) |
| F-029 | P2 | Hai màn ôn song song, hai bảng màu chấm điểm | `FlashcardStudyView.tsx:53` vs `noteMemory.css:112-115` | SPEC §6 "Gom mã" | fixed (def6ee51) |
| F-030 | P2 | 6 chiều cao điều khiển (`h-6`…`h-12`); nút cạnh nhau khác cỡ | SPEC §0; ảnh `PROPS` ("Thuộc tính của trang" vs "+ Thêm mối quan hệ") | SPEC §3 | fixed (f8991a15, nền tảng bước A; call sites B–D chưa dọn) || fixed (f8991a15, foundation A; call sites B–D pending) |
| F-031 | P2 | Bo góc tuỳ tiện (7 mức + inline) | SPEC §0 | SPEC §4 | fixed (8dd9f931, nền tảng bước A; call sites B–D chưa dọn) || fixed (8dd9f931, foundation A; call sites B–D pending) |
| F-032 | P2 | 331 `style={{}}` inline, khó giữ đồng bộ | PulseView 26, AiPanelChrome 20, SidebarParts 18, AiMessage 18, TelemetryConsentDialog 14 | SPEC §1–4 | open |
| F-033 | P2 | Trang chủ: hai tiêu đề gần bằng cỡ ("Thư viện", "Ghi nhớ trang"); tab trông như nút | ảnh `HOME` | SPEC §7 | fixed (`6f9932a8`) |
| F-034 | P2 | Màn hoàn thành ôn dùng `text-3xl`, lệch thang | `LearningStudyView.tsx:258` | SPEC §6 | fixed (3a1ff145) |
| F-035 | P2 | Sửa gợi nhớ: hai thanh ngang chồng nhau, nút "Chọn nguồn" to hơn chữ xung quanh | ảnh `2026-11-16-writing-first/mnemonic.png` | SPEC §7 | fixed (e28d4857; D1) |
| F-036 | P2 | Placeholder tiêu đề rỗng ("Heading" nghiêng đậm) trông như nội dung thật | ảnh `REVIEW` | SPEC §7 | fixed (`:/fix: F-036 distinguish empty title placeholder`) |
| F-037 | P2 | Mục sidebar đang chọn: huy hiệu số đổi sang đặc màu, mục khác thì không — hai kiểu "đang chọn" | ảnh `WRITE` vs `HOME` | SPEC §7 | fixed (`:/fix: F-037 sidebar selection and D2 tokens`) |
| F-038 | P3 | Độ đậm chữ dùng cả 400/500/600/700 ngoài editor | `font-bold` 21 | SPEC §1 | open |
| F-039 | P2 | Core smoke wikilink không ổn định: Cmd+click xong H1 đích rỗng | `tests/smoke/wikilink-path-fix.spec.ts:63-70`, tái hiện cả baseline `f78b8fb9` | 90/90 không retry; full checks và pre-push dry-run sạch; [biên bản](F-039-COMPLETION.md) | fixed (`:/^fix: F-039 stabilize wikilink navigation during source saves`) |
| F-040 | P2 | Core smoke keyboard delete/Quick Open phụ thuộc retry | `tests/smoke/delete-note-nonblocking.spec.ts:53`, log pre-push bước C | Xác định nguyên nhân trong lane đầy đủ; không coi retry là smoke sạch | open |
| F-041 | P1 | WebKit regression: render error react-virtuoso khi lưu ghi chú thường trước Command Palette | `note-memory-workspace.spec.ts:124-147`; HEAD trước sửa 20/20 fail | Marker 60/60, regression 10/10, lane WebKit 10/10, native chuột/bàn phím đạt; [biên bản](F-041-COMPLETION.md) | fixed (`:/^fix: F-041 stop WebKit note-list update feedback`) |

D2 hoàn tất F-008/F-010/F-033/F-037: typography toàn src 232 → 193, CSS data-slot 0 → 0; ngày hiển thị vẫn modified → created theo helper cũ. [Ma trận ảnh native và số đếm từng file](STEP-D2-HOME-LIST-SIDEBAR.md). F-024/F-032 tiếp tục open cho phần ngoài D2; không làm D3/D4 hoặc F-040.

D1 hoàn tất phần Properties/sửa gợi nhớ của F-024/F-032: grep typography toàn src giảm 307 → 232, CSS data-slot giữ 0 → 0. Hai finding vẫn **open** cho D2–D4. F-035 ghép thanh qua slot trình bày, giữ callback/flush guards; [ảnh và kết quả kiểm tra D1](STEP-D1-PROPERTIES-MNEMONIC.md).

Ghi chú: F-015 và F-016 (Đợt 0) được thay bằng F-027/F-028 + SPEC §6 — đánh dấu `fixed` cùng lúc.

### F-039 — Smoke Cmd+click wikilink không ổn định

- P2 · C9.4 · S7 · Đã xác nhận render churn/row identity trong app khi source lưu đồng thời điều hướng; bằng chứng và regression RED → GREEN trong [biên bản](F-039-COMPLETION.md).
- Tái hiện: 1) Chạy `pnpm exec playwright test --config playwright.smoke.config.ts tests/smoke/wikilink-path-fix.spec.ts --retries=0`. 2) Ca `@smoke` chờ H1 “Manage Sponsorships” nhưng nhận chuỗi rỗng. 3) Lặp lại trên checkout gốc `f78b8fb9`, `BASE_URL=http://127.0.0.1:41742`, cùng kết quả.
- Tác động: release gate thất bại hoặc phụ thuộc retry; lượt đầu có 53 passed + 1 flaky trong 6,2 phút. Pre-push cuối trên `8dd9f931` có 53 passed / 1 failed trong 6,0 phút, thất bại cả retry và chặn push. Cả hai lượt vượt mục tiêu 5 phút.
- Bằng chứng: [log baseline](evidence/F-039-smoke-baseline.txt), [log pre-push cuối](evidence/F-039-pre-push.txt), `tests/smoke/wikilink-path-fix.spec.ts:65-70`. Chi tiết trong [biên bản bước A](STEP-A-FOUNDATION.md).
- Chấp nhận: xác định nguyên nhân fixture/test hoặc app rồi chạy lane ổn định không retry; không hạ assertion, tăng timeout hoặc sửa ngoài scope trong bước A.

Bước B cũng bị cùng gate chặn trên `715aa8b5`: 53 passed / 1 failed, 6,0 phút, thất bại cả retry; [log](evidence/step-B-pre-push.txt). Không sửa F-039 trong phạm vi B.

Bước C trên `dc29bf7d`: F-039 thất bại cả retry (lượt đầu Grow Newsletter, retry H1 rỗng); 52 passed / 1 flaky / 1 failed, 5,6 phút. Hook chặn push. [Log](evidence/step-C-pre-push.txt).

Bước D1: push cuối sau khi cập nhật assertion màu Properties vẫn bị F-039 chặn (Grow Newsletter rồi H1 rỗng); 52 passed / 1 flaky / 1 failed, 5,6 phút. F-040 cũng tái hiện ở lượt đầu rồi pass retry. Lint/build/full coverage pass; không sửa hai finding ngoài D1. [Log](evidence/step-D1-pre-push.txt).

17/11/2026 — F-039 fixed trong commit `:/^fix: F-039 stabilize wikilink navigation during source saves`: cache projection của entry bất biến, key hàng theo path và chờ tín hiệu UI trong smoke. Test gốc 10/10 fail trước sửa; bản cuối đạt 30/30 trước, 30/30 đồng thời và 30/30 sau suite, không retry; suite đồng thời 54/54. Full Node 24/Rust checks và pre-push dry-run 54/54, không flaky. Người dùng cho phép sửa nguyên nhân dùng chung; F-040/F-041 vẫn open, không sửa test hoặc trạng thái hai finding đó. [Biên bản, trace/video và gate](F-039-COMPLETION.md).

### F-040 — Core smoke keyboard delete/Quick Open phụ thuộc retry

- P2 · C9 · S7 · Chắc chắn về một lượt smoke flaky; chưa kết luận lỗi thao tác thật trên app hay regression của F-026.
- Tái hiện đã quan sát: 1) `git push origin main` trên `dc29bf7d`. 2) Core smoke `delete-note-nonblocking.spec.ts:21` mở Quick Open khi deletion còn pending, nhập Note B và Enter. 3) Assertion heading Note B ở dòng 53 không tìm thấy trong 5 giây; retry pass.
- Tác động: lane chỉ qua ca này nhờ retry, không phải smoke sạch. Không có bằng chứng mất dữ liệu; test dùng mock delete pending.
- Bằng chứng: [pre-push](evidence/step-C-pre-push.txt). Chạy riêng không retry `--repeat-each=3`: [bản cuối 3/3 pass](evidence/F-040-delete-current.txt), [baseline f78b8fb9 3/3 pass](evidence/F-040-delete-baseline.txt); chưa tái hiện ngoài lane đầy đủ.
- Chấp nhận: xác định nguyên nhân timing/fixture/app trong lane đầy đủ, chạy ổn định không retry; không tăng timeout/hạ assertion để che lỗi. Chưa sửa trong scope F-026.

## Regression review A–D1 — R-02 / R-03

| ID | Mức | Nguồn | Tóm tắt | Trạng thái |
|---|---|---|---|---|
| R-02 | P2 | review A–D1 | Minimum size của Button icon từ bước A đè kích thước nhỏ ở call site, làm nút phình/lệch hàng | fixed (`326bf5a0`) |
| R-03 | P2 | review A–D1 | Undo ở màn ôn biến mất sau click, làm mất focus bàn phím đồng bộ | fixed (`:/^fix: R-03 retain study focus across mouse undo`) |

### R-02 — Nút icon phình sau bước A

- P2 · Nguồn: review A–D1; ghi nhận trước khi sửa; 29 nơi gọi đã đối chiếu với `f78b8fb9`. Fixed: `326bf5a0`; [bảng kích thước, TDD và ảnh](R-02-R-03-COMPLETION.md).
- Bằng chứng mã: `src/components/ui/button.tsx:36-40` đặt `min-h/min-w` cho icon sizes, trong khi các call site còn đặt `h-/w-`: AiPanelChrome, TableOfContentsPanel, WorkspaceSettingsRows, AiMessage, WikilinkPropertyField và note-list/NoteListHeader.
- Tác động: nút icon nhỏ trong dòng chữ/thanh công cụ bị minimum size đè, làm lệch hàng.
- Chấp nhận: kiểm kê toàn src, bảng kích thước baseline/current; sửa ở variant dùng token, không đổi `--control-*`, không thêm important hoặc override data-slot; test từng size và ảnh native trước/sau sáng/tối. Không làm D2–D4.

### R-03 — Focus sau Undo trong phiên ôn

- P2 · Nguồn: review A–D1; ghi nhận trước khi sửa. RED 4/4: activeElement = body ngay khi Undo unmount; native/browser baseline có phục hồi qua dialog nên chưa chứng minh phím mất ở mọi lượt. Fixed: `:/^fix: R-03 retain study focus across mouse undo`; [TDD, giới hạn bằng chứng và QA](R-02-R-03-COMPLETION.md).
- Bằng chứng mã: `src/components/learning/LearningStudyView.tsx:338` chỉ mount Undo khi `session.canUndo`; sau Undo phần tử đang focus bị unmount. Đối chiếu thêm FlashcardStudyView.
- Tác động: focus có thể rơi về body và Space/1–4/Esc không còn tới vùng ôn.
- Chấp nhận: click Undo bằng chuột rồi Space và 1–4 vẫn lật/chấm thẻ, activeElement không phải body; giữ nút disabled hoặc trả focus về vùng thẻ; không đổi phím, guard, FSRS hay dữ liệu phiên; QA native sáng/tối với Library/preferences riêng.

## R-04 — Flaky assertion tìm kiếm bị prefetch nền làm nhiễu

- P2 · Nguồn: pre-push R-02/R-03, không thuộc review A–D1 · **fixed (`4f7e458a`)**.
- Bằng chứng: actual push của `e8cdfc3e` bị chặn ở `NoteList.rendering.test.tsx:435,482`: mock get_note_content bị gọi với `/vault/a.md`, dù search không đọc từng file. Log `/tmp/memnova-r02-r03/push-first-failure.log`.
- Nguyên nhân: useLikelyNextPreload (`src/components/note-list/useNoteListModel.tsx:79-103`) khởi động sau 350ms; mock transport thêm 100ms (`src/mock-tauri/index.ts:49`). Test search dùng cùng handler toàn cục và khẳng định không có bất kỳ read nào. Prefetch hợp lệ hoặc request đang chạy từ test trước có thể làm assertion thất bại tùy thời gian thực thi.
- Tái hiện deterministic trước R-02/R-03: checkout archive `95176804` ngoài repo, trong test hidden-frontmatter dùng fake clock đi qua 500ms sau render, rồi thực hiện search/assertion cũ → fail với đúng `/vault/a.md`. Các file test/model/cache/transport giống byte giữa baseline và hai commit R-02/R-03. Log RED `/tmp/memnova-r02-r03/gate-baseline-red.log`.
- Sửa test-only đã được người dùng cho phép: mock riêng prefetchNoteContent trong file test rendering/search để assertion tiếp tục kiểm tra transport của search; prefetch vẫn được kiểm tra ở NoteList.keyboard.test.tsx. Probe baseline 500ms chuyển GREEN; patch `/tmp/memnova-r02-r03/proposed-R-04.patch`. Không sửa app, không nới assertion tìm kiếm, không thêm retry/timeout/skip.
- Chấp nhận: test deterministic qua mốc prefetch, cả rendering/keyboard suite pass, full coverage và normal pre-push pass không flaky. Người dùng đã cho phép R-04 test-only và push. 63/63 rendering/keyboard pass trên repo thật; toàn bộ rendering pass trong coverage. Coverage lượt đó còn fail IME R-05 ở file khác; sau R-05, 4.996/4.996 pass, lines87,47%; đang chờ pre-push cuối.

## R-05 — Test IME liên tiếp đợi callback trước khi DOM commit xong

- P2 · Nguồn: coverage sau R-04 · **fixed (`:/^test: R-05 await IME composition updates`), test-only**. Giữ giới hạn: không kết luận lỗi native/app.
- Bằng chứng FAIL: `/tmp/memnova-r02-r03/R-04-coverage.log`, WikilinkChatInput.test.tsx:352: draft cuối “안” thay vì “안녕”, trong khi DOM chứa hai text node. R-04 rendering/search pass; tổng 4.995 pass / 1 fail.
- Mã app/test IME giống baseline `95176804`, không bị R-02/R-03/R-04 sửa. Probe 40 ca độc lập trên baseline đều pass; chưa gọi đây là baseline failure tái hiện ổn định.
- Giả thuyết: InlineWikilinkInput.tsx:489-491 flush composition qua queueMicrotask, onChange chạy trước forceRender remount editor theo key. Test chỉ đợi spy onDraftChange rồi phát composition tiếp vào node có thể đang chờ remount. Callback không phải tín hiệu DOM đã commit.
- Sửa **test-only, được người dùng cho phép**: await act(async ...) quanh cả hai compositionEnd để flush microtask/React updates rồi tiếp tục tương tác, theo https://react.dev/reference/react/act. Giữ nguyên mọi assertion draft/DOM, không sleep/timeout/retry/skip, không sửa app. Patch `/tmp/memnova-r02-r03/proposed-R-05.patch`; 32/32 test pass trên bản sao baseline với patch.
- Chấp nhận: suite IME + coverage + normal pre-push pass. Chưa khẳng định lỗi gõ IME của app được tái hiện hoặc đã sửa; đây là đề xuất làm đúng ranh giới async trong test. Người dùng đã cho phép R-05 test-only và push. 95/95 test IME/rendering/keyboard pass; full coverage 501 files, 4.996 tests pass, lines87,47%. Đang chạy pre-push cuối trước publish.

## Mẫu cho finding mới

```markdown
### F-0xx — <một câu từ góc nhìn người dùng>
- Mức · Mục Cx.y · Bề mặt Sx · Độ chắc
- Tái hiện: 1) … 2) …
- Thực tế / Mong đợi
- Bằng chứng: `src/…/File.tsx:123` hoặc `evidence/F-0xx-before.png`
- Sửa: … · Chấp nhận: … (đo được, viết được thành test)
```

### F-041 — WebKit render error trước Command Palette

- P1 · C9 · WebKit là engine của WKWebView trong app native; render error chặn luồng lưu ghi chú thường → Command Palette. Nâng P1 theo yêu cầu ngày 17/11/2026; bằng chứng và kết luận mới trong [biên bản F-041](F-041-COMPLETION.md).
- Tái hiện: chạy `MEMNOVA_PLAYWRIGHT_WEBKIT=1 BASE_URL=http://localhost:5201 pnpm exec playwright test --config playwright.integration.config.ts tests/integration/note-memory-workspace.spec.ts --grep 'ordinary note editing retains' --retries=0`. Sau khi lưu ghi chú thường có marker literal, test mở Command Palette nhưng app hiển thị render error có `getRootForUpdatedFiber`, `forceStoreRerender`, `react-virtuoso`, `VirtualNoteList2`.
- Current D1: lane đầy đủ 7 passed / 2 failed; chạy riêng hai ca vẫn 2 failed. Cùng hai ca với baseline `b23296e9` trên port 41743: 1 failed / 1 passed, cùng stack ở ca blank lines. Vì vậy có bằng chứng lỗi tồn tại trước D1; không khẳng định từng biến thể đều thất bại ổn định trên baseline.
- Bằng chứng: [current](evidence/F-041-webkit-current.txt), [current recheck](evidence/F-041-webkit-recheck.txt), [baseline](evidence/F-041-webkit-baseline.txt), [snapshot baseline](evidence/F-041-baseline-context.md), [snapshot current](evidence/F-041-current-context.md).
- Chấp nhận: xác định nguyên nhân rồi cả hai case và lane đầy đủ WebKit pass không retry; không hạ assertion hoặc tăng timeout. D1 giữ nguyên các spec, không sửa note list/editor ngoài phạm vi.

17/11/2026 — F-041 **fixed** (`:/^fix: F-041 stop WebKit note-list update feedback`), nâng **P1** vì WebKit là engine WKWebView của app native. HEAD `3f0404ff` sau F-039 vẫn fail 20/20; nguyên nhân là metadata transition phát lại data vào layout store của Virtuoso. Virtualizer nay so sánh thứ tự path, hàng đọc metadata mới qua context. Regression mới RED → GREEN; marker 60/60, regression 10/10, lane WebKit 10/10 không retry; native QA riêng lưu → Command Palette qua chuột và Cmd+S/Cmd+K đạt. Full gate cuối sạch, FE 87,48% / Rust 86,40%; các lỗi gate ban đầu được giữ riêng trong [biên bản](F-041-COMPLETION.md). F-040 giữ nguyên open và không sửa test.


## R-06 — Hai precondition cũ trong regression filesystem chặn commit D3

- P2 · test-only · **fixed (`:/^test: R-06 align filesystem regression preconditions`)** theo ngoại lệ test chặn gate trong OVERNIGHT-RULES.
- RED trên HEAD D3 và checkout độc lập baseline `707bac53`, retries=0: `vault-workflows.spec.ts` đòi ẩn file còn tồn tại chỉ vì `Trashed: true`, và tìm nhãn Related to khi Properties chưa mở. [Baseline RED](evidence/D3-R06-baseline-red.txt). Không kết luận bug app mới.
- ADR-0045 đã bỏ Trash và yêu cầu cờ Trashed là metadata thường. Test mới xác nhận note có cờ cũ vẫn hiện và byte cờ giữ nguyên, xoá đúng file fixture tạm rồi mở lại Library, giữ assertion note biến mất/Note C vẫn hiện và thêm kiểm tra file không tồn tại. Test relationships click nút Properties trước assertion cũ. Không sửa app/fixture gốc, không thêm timeout/retry/skip hoặc hạ coverage.
- GREEN: 8/8 filesystem regression, 30,2s, retries=0. [Log](evidence/D3-R06-green.txt). Hai ca này xuất hiện khi hook chạy lại file có helper filename của D3; sửa trong commit test riêng, không làm D4 hoặc F-040.


## R-07 — Type-create regression dùng mock mặc định thay bridge filesystem

- P2 · test-only · **fixed (`:/^test: R-07 isolate type creation fixtures`)** theo ngoại lệ test chặn gate của luật đêm.
- Baseline `707bac53` độc lập và HEAD D3 cùng fail 2/2 ở assertion `.bn-editor` visible sau tạo note trong mock mặc định, trước assertion breadcrumb. AX có entry mới và textbox; không kết luận bug app native. [Baseline RED, retries=0](evidence/D3-R07-baseline-red.txt). Hook mặc định đã tự retry2 và vẫn fail, không dùng retry làm bằng chứng pass.
- Dùng createFixtureVaultCopy/openFixtureVaultDesktopHarness/cleanup đã có như các core creation test; test có thư viện nhỏ riêng và bridge tạo/đọc file thật, không dùng dữ liệu demo hoặc prefs thật. Bỏ fixed sleep thay bằng readiness sẵn có của helper. Giữ nguyên assertion editor visible, filename/loại Project hoặc Note và raw frontmatter, không tăng timeout/retry/skip, không sửa app/mock.
- GREEN 2/2, 10,0s, retries=0. [Log](evidence/D3-R07-green.txt). Commit test riêng; không sửa F-040.
