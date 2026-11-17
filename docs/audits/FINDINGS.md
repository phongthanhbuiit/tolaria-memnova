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
| F-002 | P1 | C4 | Ngày trong danh sách ghi chú là tiếng Anh khi UI tiếng Việt | ảnh | fixed (commit `fix: localize note dates for selected UI language`; xem biên bản) |
| F-003 | P1 | C4 | Nhãn Properties tiếng Anh lẫn trong UI tiếng Việt | ảnh | open |
| F-004 | P1 | C4 | Công tắc "Ôn tập ghi chú này" và nút "Ôn ghi chú này" gần như trùng tên | ảnh | open |
| F-005 | P1 | C5 | Nút chỉ có icon thiếu `aria-label` (~58 chỗ) | mã | open |
| F-006 | P1 | C3 | 38 phần tử form HTML thô ngoài `ui/` (vi phạm AGENTS.md) | mã | open |
| F-007 | P2 | C4 | Thuật ngữ học tập không nhất quán (trang/ghi chú, ghi nhớ/ôn/gợi nhớ) | ảnh | open |
| F-008 | P2 | C3 | Hai nút chính màu xanh cạnh tranh trên Trang chủ | ảnh | open |
| F-009 | P2 | C1 | Ghi chú mới tên "Untitled Note 1794825081", breadcrumb hiện slug | ảnh | open |
| F-010 | P2 | C3 | Mỗi hàng danh sách hiện hai ngày giống nhau, ngày đầu không nhãn | ảnh | open |
| F-011 | P2 | C4 | Hạn ôn hiện mốc thời gian thô, không nói quá hạn bao lâu | ảnh | open |
| F-012 | P2 | C2 | Nhãn đỏ "Cần xử lý" không nói phải làm gì | ảnh | open |
| F-013 | P2 | C3 | Properties: khung rỗng chiếm chỗ, đẩy thao tác học xuống dưới | ảnh | fixed (975948d0, b8796a72, f1a741e0; D1) |
| F-014 | P2 | C3 | Nút ôn chính trong Properties trông như nút phụ/vô hiệu | ảnh | fixed (7be04257; D1) |
| F-015 | P2 | C3 | Màn ôn: 4 nút chấm điểm viền màu dày lạc khỏi ngôn ngữ thị giác của app | ảnh | fixed (87129845, superseded by F-028) |
| F-016 | P2 | C4 | Màn ôn: "0/1 · 0 reviews", "in 1 min." khó hiểu | ảnh | fixed (60445d20) |
| F-017 | P2 | C4 | "Hộp thư đến", "Library", "Notes", thư mục `views` trong sidebar tiếng Việt | ảnh | open |
| F-018 | P2 | C5 | Thanh công cụ editor 10 icon không nhãn | ảnh | open |
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

### F-009 — Tên ghi chú mặc định
- Thực tế (`REVIEW`, `HOME`): tiêu đề "Untitled Note 1794825081", breadcrumb "untitled-note-1794825081"; (`WRITE`) breadcrumb "pomodoro" thay vì tiêu đề "Pomodoro".
- Sửa: tiêu đề mặc định đã dịch ("Chưa đặt tên"), số chống trùng chỉ nằm ở tên file; breadcrumb hiện tiêu đề.
- Lưu ý: chạm cách đặt tên file → đọc ADR liên quan trước, không đổi tên file đã có.

### F-010 — Hai ngày trùng nhau trên mỗi hàng
- Thực tế (`WRITE`): "November 16, 2026    Created November 16, 2026" ở mọi hàng.
- Sửa: chỉ hiện ngày theo tiêu chí sắp xếp đang chọn; dùng ngày tương đối ("Hôm qua") cho mốc gần.

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
| F-033 | P2 | Trang chủ: hai tiêu đề gần bằng cỡ ("Thư viện", "Ghi nhớ trang"); tab trông như nút | ảnh `HOME` | SPEC §7 | open |
| F-034 | P2 | Màn hoàn thành ôn dùng `text-3xl`, lệch thang | `LearningStudyView.tsx:258` | SPEC §6 | fixed (3a1ff145) |
| F-035 | P2 | Sửa gợi nhớ: hai thanh ngang chồng nhau, nút "Chọn nguồn" to hơn chữ xung quanh | ảnh `2026-11-16-writing-first/mnemonic.png` | SPEC §7 | fixed (e28d4857; D1) |
| F-036 | P2 | Placeholder tiêu đề rỗng ("Heading" nghiêng đậm) trông như nội dung thật | ảnh `REVIEW` | SPEC §7 | open |
| F-037 | P2 | Mục sidebar đang chọn: huy hiệu số đổi sang đặc màu, mục khác thì không — hai kiểu "đang chọn" | ảnh `WRITE` vs `HOME` | SPEC §7 | open |
| F-038 | P3 | Độ đậm chữ dùng cả 400/500/600/700 ngoài editor | `font-bold` 21 | SPEC §1 | open |
| F-039 | P2 | Core smoke wikilink không ổn định: Cmd+click xong H1 đích rỗng | `tests/smoke/wikilink-path-fix.spec.ts:65-70`, tái hiện cả baseline `f78b8fb9` | Chạy ổn định không retry; phân biệt fixture/test và lỗi app trước khi sửa | open |
| F-040 | P2 | Core smoke keyboard delete/Quick Open phụ thuộc retry | `tests/smoke/delete-note-nonblocking.spec.ts:53`, log pre-push bước C | Xác định nguyên nhân trong lane đầy đủ; không coi retry là smoke sạch | open |
| F-041 | P2 | WebKit regression: render error react-virtuoso khi lưu ghi chú thường trước Command Palette | `note-memory-workspace.spec.ts:124-147`; tái hiện baseline b23296e9 | Phân biệt lỗi app/fixture, giữ assertion và timeout | open |

D1 hoàn tất phần Properties/sửa gợi nhớ của F-024/F-032: grep typography toàn src giảm 307 → 232, CSS data-slot giữ 0 → 0. Hai finding vẫn **open** cho D2–D4. F-035 ghép thanh qua slot trình bày, giữ callback/flush guards; [ảnh và kết quả kiểm tra D1](STEP-D1-PROPERTIES-MNEMONIC.md).

Ghi chú: F-015 và F-016 (Đợt 0) được thay bằng F-027/F-028 + SPEC §6 — đánh dấu `fixed` cùng lúc.

### F-039 — Smoke Cmd+click wikilink không ổn định

- P2 · C9.4 · S7 · Chắc chắn về lỗi smoke; chưa kết luận đây là lỗi thao tác thật trên app.
- Tái hiện: 1) Chạy `pnpm exec playwright test --config playwright.smoke.config.ts tests/smoke/wikilink-path-fix.spec.ts --retries=0`. 2) Ca `@smoke` chờ H1 “Manage Sponsorships” nhưng nhận chuỗi rỗng. 3) Lặp lại trên checkout gốc `f78b8fb9`, `BASE_URL=http://127.0.0.1:41742`, cùng kết quả.
- Tác động: release gate thất bại hoặc phụ thuộc retry; lượt đầu có 53 passed + 1 flaky trong 6,2 phút. Pre-push cuối trên `8dd9f931` có 53 passed / 1 failed trong 6,0 phút, thất bại cả retry và chặn push. Cả hai lượt vượt mục tiêu 5 phút.
- Bằng chứng: [log baseline](evidence/F-039-smoke-baseline.txt), [log pre-push cuối](evidence/F-039-pre-push.txt), `tests/smoke/wikilink-path-fix.spec.ts:65-70`. Chi tiết trong [biên bản bước A](STEP-A-FOUNDATION.md).
- Chấp nhận: xác định nguyên nhân fixture/test hoặc app rồi chạy lane ổn định không retry; không hạ assertion, tăng timeout hoặc sửa ngoài scope trong bước A.

Bước B cũng bị cùng gate chặn trên `715aa8b5`: 53 passed / 1 failed, 6,0 phút, thất bại cả retry; [log](evidence/step-B-pre-push.txt). Không sửa F-039 trong phạm vi B.

Bước C trên `dc29bf7d`: F-039 thất bại cả retry (lượt đầu Grow Newsletter, retry H1 rỗng); 52 passed / 1 flaky / 1 failed, 5,6 phút. Hook chặn push. [Log](evidence/step-C-pre-push.txt).

Bước D1: push cuối sau khi cập nhật assertion màu Properties vẫn bị F-039 chặn (Grow Newsletter rồi H1 rỗng); 52 passed / 1 flaky / 1 failed, 5,6 phút. F-040 cũng tái hiện ở lượt đầu rồi pass retry. Lint/build/full coverage pass; không sửa hai finding ngoài D1. [Log](evidence/step-D1-pre-push.txt).

### F-040 — Core smoke keyboard delete/Quick Open phụ thuộc retry

- P2 · C9 · S7 · Chắc chắn về một lượt smoke flaky; chưa kết luận lỗi thao tác thật trên app hay regression của F-026.
- Tái hiện đã quan sát: 1) `git push origin main` trên `dc29bf7d`. 2) Core smoke `delete-note-nonblocking.spec.ts:21` mở Quick Open khi deletion còn pending, nhập Note B và Enter. 3) Assertion heading Note B ở dòng 53 không tìm thấy trong 5 giây; retry pass.
- Tác động: lane chỉ qua ca này nhờ retry, không phải smoke sạch. Không có bằng chứng mất dữ liệu; test dùng mock delete pending.
- Bằng chứng: [pre-push](evidence/step-C-pre-push.txt). Chạy riêng không retry `--repeat-each=3`: [bản cuối 3/3 pass](evidence/F-040-delete-current.txt), [baseline f78b8fb9 3/3 pass](evidence/F-040-delete-baseline.txt); chưa tái hiện ngoài lane đầy đủ.
- Chấp nhận: xác định nguyên nhân timing/fixture/app trong lane đầy đủ, chạy ổn định không retry; không tăng timeout/hạ assertion để che lỗi. Chưa sửa trong scope F-026.

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

- P2 · C9 · Chưa kết luận lỗi native hoặc nguyên nhân app/fixture. Ngoài bề mặt D1.
- Tái hiện: chạy `MEMNOVA_PLAYWRIGHT_WEBKIT=1 BASE_URL=http://localhost:5201 pnpm exec playwright test --config playwright.integration.config.ts tests/integration/note-memory-workspace.spec.ts --grep 'ordinary note editing retains' --retries=0`. Sau khi lưu ghi chú thường có marker literal, test mở Command Palette nhưng app hiển thị render error có `getRootForUpdatedFiber`, `forceStoreRerender`, `react-virtuoso`, `VirtualNoteList2`.
- Current D1: lane đầy đủ 7 passed / 2 failed; chạy riêng hai ca vẫn 2 failed. Cùng hai ca với baseline `b23296e9` trên port 41743: 1 failed / 1 passed, cùng stack ở ca blank lines. Vì vậy có bằng chứng lỗi tồn tại trước D1; không khẳng định từng biến thể đều thất bại ổn định trên baseline.
- Bằng chứng: [current](evidence/F-041-webkit-current.txt), [current recheck](evidence/F-041-webkit-recheck.txt), [baseline](evidence/F-041-webkit-baseline.txt), [snapshot baseline](evidence/F-041-baseline-context.md), [snapshot current](evidence/F-041-current-context.md).
- Chấp nhận: xác định nguyên nhân rồi cả hai case và lane đầy đủ WebKit pass không retry; không hạ assertion hoặc tăng timeout. D1 giữ nguyên các spec, không sửa note list/editor ngoài phạm vi.
