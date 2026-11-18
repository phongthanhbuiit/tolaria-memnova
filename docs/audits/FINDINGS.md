# Findings

Quy tắc ghi: xem [skill](../../.agents/skills/memnova-audit/SKILL.md). ID tăng dần, không tái sử dụng.
Trạng thái: `open` · `partial` · `fixed — chờ QA native (phạm vi)` · `rejected (lý do)` · `fixed (<commit>)`.

## Tiến độ hiện tại — tổng kết đêm 18/11/2026

Đối chiếu [tóm tắt buổi sáng](OVERNIGHT-2026-11-18.md#tóm-tắt-buổi-sáng) và bằng chứng của từng bước. Các bảng theo đợt bên dưới giữ mô tả và số đếm baseline. Bảng này ghi trạng thái hiện tại. Tổng kết **DONE D3/D4A/E1/R-08/TEST-STABILITY/R-10** và **PARTIAL D4B/E2/I18N-A11Y-2/LEARNING-COPY**. D4B đã xong mã trong 5 file F-032, còn F-038 chờ native legacy.

| Mức | Open | Partial | Fixed — chờ QA native |
|---|---|---|---|
| P0 | Không | Không | Không |
| P1 | Không | F-005 | Không |
| P2 | F-021 | F-009, F-032 | F-012 (pending/invalid/deleted), R-11 (editor thuộc tính) |
| P3 | Không | Không | F-038 (Home/Decks/FlashcardStudyView legacy) |

**Đã đóng:** F-001–F-004, F-006–F-008, F-010–F-011, F-013–F-020, F-022–F-031, F-033–F-037, F-039–F-041 (**35 F**) và R-01–R-10, R-12–R-16 (**15 R**). F-023/F-025/F-030/F-031 là phần nền tảng A. R-05 là test-only. Telex native vẫn chưa được xác minh.

**Còn chờ native/bằng chứng bổ sung:** F-005 (nhãn nội bộ Excalidraw còn tiếng Anh, ảnh trước tối của E2); F-032 (message/tool chỉ có fixture); F-038 (các màn legacy không có route native); Telex trong AI và ô wikilink từ R-05/E2. F-005/F-032 vẫn partial vì ngoài QA còn phần mã/phạm vi chưa hoàn tất. F-038 đã sửa mã nhưng không tính đóng khi các màn legacy mới được kiểm bằng fixture/diff/test; đối chiếu giới hạn native trong [D4B](STEP-D4B-INLINE-STYLE.md).

Coverage dòng gần nhất (R-10): FE **87,85%**, Rust đầy đủ **86,41%**. Grep SPEC §8 hiện tại **1 / 0**.

Đóng lô 18/11/2026. R-15 đã dịch đủ catalog. F-024 và R-16 giữ trạng thái fixed. F-005 còn nhãn nội bộ Excalidraw và F-032 còn mã ngoài 10 file đã xử lý nên vẫn partial. [Báo cáo lô](BATCH-2026-11-18.md).

## Đợt 0 — rà soát ban đầu (17/11/2026)

Nguồn: 5 ảnh native baseline của commit `199e69de` + quét grep mã nguồn. **Chưa chạy app trực tiếp**, nên mỗi finding ghi rõ độ chắc:
`ảnh` = thấy trực tiếp trên ảnh · `mã` = số đếm grep, cần mở file xác nhận · `nghi ngờ` = suy ra, phải tái hiện trước khi sửa.

Ảnh viết tắt (đều nằm trong `docs/baselines/ui/`):
`HOME` = `2026-11-16-library-writing/home.png` · `WRITE` = `2026-11-16-library-writing/writing.png` ·
`PROPS` = `2026-11-16-properties-polish/review-action.png` · `REVIEW` = `2026-11-16-release-acceptance/note-review.png`

| ID | Mức | Mục | Tóm tắt | Chắc | Trạng thái |
|---|---|---|---|---|---|
| F-001 | P1 | C2 | File nội bộ `.memnova/retired/<uuid>.md` lộ ra danh sách Thư viện | ảnh | fixed (`3ce2c128`) |
| F-002 | P1 | C4 | Ngày trong danh sách ghi chú là tiếng Anh khi UI tiếng Việt | ảnh | fixed (9c951e78) |
| F-003 | P1 | C4 | Nhãn Properties tiếng Anh lẫn trong UI tiếng Việt | ảnh | fixed (`1a262b64`) |
| F-004 | P1 | C4 | Công tắc "Ôn tập ghi chú này" và nút "Ôn ghi chú này" gần như trùng tên | ảnh | fixed (`e8dfc0c2`) |
| F-005 | P1 | C5 | Nút chỉ có icon thiếu `aria-label` (~58 chỗ) | mã | partial — nút nội bộ Excalidraw còn tiếng Anh |
| F-006 | P1 | C3 | 38 phần tử form HTML thô ngoài `ui/` (vi phạm AGENTS.md) | mã | fixed (`f5462464`) |
| F-007 | P2 | C4 | Thuật ngữ học tập không nhất quán (trang/ghi chú, ghi nhớ/ôn/gợi nhớ) | ảnh | fixed (`25fdd409`) |
| F-008 | P2 | C3 | Hai nút chính màu xanh cạnh tranh trên Trang chủ | ảnh | fixed (`70212a69`) |
| F-009 | P2 | C1 | Ghi chú mới tên "Untitled Note 1794825081", breadcrumb hiện slug | ảnh | partial — breadcrumb fixed (`6b1e6200`); đặt tên mới ngoài D3 |
| F-010 | P2 | C3 | Mỗi hàng danh sách hiện hai ngày giống nhau, ngày đầu không nhãn | ảnh | fixed (`14154524`) |
| F-011 | P2 | C4 | Hạn ôn hiện mốc thời gian thô, không nói quá hạn bao lâu | ảnh | fixed (`dad0db41`) |
| F-012 | P2 | C2 | Nhãn đỏ "Cần xử lý" không nói phải làm gì | ảnh | fixed — chờ QA native (nhãn pending/invalid/deleted, `27e39775`) |
| F-013 | P2 | C3 | Properties: khung rỗng chiếm chỗ, đẩy thao tác học xuống dưới | ảnh | fixed (975948d0, b8796a72, f1a741e0; D1) |
| F-014 | P2 | C3 | Nút ôn chính trong Properties trông như nút phụ/vô hiệu | ảnh | fixed (7be04257; D1) |
| F-015 | P2 | C3 | Màn ôn: 4 nút chấm điểm viền màu dày lạc khỏi ngôn ngữ thị giác của app | ảnh | fixed (87129845, superseded by F-028) |
| F-016 | P2 | C4 | Màn ôn: "0/1 · 0 reviews", "in 1 min." khó hiểu | ảnh | fixed (60445d20) |
| F-017 | P2 | C4 | "Hộp thư đến", "Library", "Notes", thư mục `views` trong sidebar tiếng Việt | ảnh | fixed (`5ef69069`) |
| F-018 | P2 | C5 | Thanh công cụ editor 10 icon không nhãn | ảnh | fixed (`247911cc`) |
| F-019 | P2 | C5 | 27 chỗ `outline-none`, có thể mất vòng focus | mã | fixed (`9463246e`) |
| F-020 | P2 | C1 | "Trang chủ" và "Ôn tập" trên sidebar: không rõ khác nhau thế nào | ảnh | fixed (`3fef6852`) |
| F-021 | P2 | C9 | 8 component > 850 dòng (App.tsx 1886) | mã | open |
| F-022 | P3 | C4 | Chữ nội bộ lộ ra: "Lịch ôn · chỉ đọc", "Thuộc tính của trang" trong panel "Thuộc tính" | ảnh | fixed (`b8351fef`) |

## Chi tiết

### F-001 — File nội bộ lộ ra danh sách Thư viện
- **E1 — fixed (`3ce2c128`), 18/11/2026:** Ẩn metadata ở catalog/index/số đếm/scope dẫn xuất, giữ nguyên storage và file retired. Native baseline 6→5 hàng; search/Quick Open/content search không trả sentinel; 259 Markdown giữ hash. [Biên bản và bằng chứng](STEP-E1-FUNCTION-COPY.md).
- Thực tế (`HOME`): 4+ hàng "Untitled Note 17948260xx" với đường dẫn `.memnova/retired/e79dab74-….md`, làm "Ghi chú · 12" lệch với "4 đến hạn".
- Mong đợi: người dùng không bao giờ thấy đường dẫn `.memnova/` hay UUID.
- Bắt đầu tìm: nơi dựng danh sách học của Trang chủ (grep `retired` trong `src-tauri/` và module learning; `src/` chỉ có ở mock).
- Quyết định E1 của người dùng: chỉ ẩn khi hiển thị/đánh chỉ mục; tuyệt đối không sửa/xóa/di chuyển file retired. Đề xuất hỏi/đưa vào mục riêng trước đây không còn áp dụng.
- Chấp nhận: danh sách không chứa mục nào có đường dẫn bắt đầu bằng `.memnova/`; số đếm khớp số hàng; có test.

### F-002 — Ngày tiếng Anh trong UI tiếng Việt
- **E1 — bổ sung R-01 (`ebec147f`):** History/tooltip đã i18n, bỏ default locale en ở relativeDate/formatSubtitle/formatSearchSubtitle, giữ parser/sort/dữ liệu. Regression RED→GREEN và native AX/ảnh sáng/tối trong [biên bản E1](STEP-E1-FUNCTION-COPY.md).
- **R-01 hoàn tất — fixed (`9c951e78`):** sáu commit riêng; bỏ locale mặc định, Calendar/tháng/thứ/aria theo app, bộ lọc ngày, Git/Pulse relative time, subtitle/Search với số nhiều và số đếm theo locale. 4.974 unit pass; 32 test ở mỗi TZ Los Angeles/TP.HCM; native en↔vi sáng/tối, dữ liệu giữ nguyên; coverage frontend 87,46%, Rust 86,40%; l10n 18 catalog/1.028 key. [Bảng commit, RED/GREEN, ảnh và giới hạn](R-01-F-002-COMPLETION.md). Push mã thành công bằng hook hiện có, ca F-039 còn flaky/pass retry; không sửa finding đó.
- **R-01 — reopened (17/11/2026):** review độc lập FAIL. Còn sót: formatter `dateDisplay.ts:39,58,68,83` mặc định en; Calendar chưa nhận locale app (Properties/AddPropertyForm/learning/DateValueInput); preview/title/aria bộ lọc ngày format cứng tiếng Anh; Git history today/yesterday/Nd/Nmo ago; note list relativeDate just now/Nm/Nh/Nd ago; subtitle/Search N words/Empty/link(s), số đếm en-US và thiếu plural theo locale. Giữ nguyên dữ liệu lưu, parser, ISO nhập, sort và lịch ôn. Chỉ đổi fixed sau khi đủ tiêu chí R-01 và có báo cáo [R-01](R-01-F-002-COMPLETION.md).
- Thực tế (`WRITE`): "November 16, 2026", "Created November 16, 2026". Trong khi Properties (`PROPS`) hiện "16:14 ngày 16 thg 11, 2026".
- Mong đợi: một hàm định dạng ngày dùng chung, theo locale đang chọn; chữ "Created" lấy từ `en.json`.
- Bắt đầu tìm: component hàng danh sách ghi chú; grep `Created` và `toLocaleDateString`/`Intl.DateTimeFormat`.
- Chấp nhận: đổi ngôn ngữ sang vi → không còn tên tháng tiếng Anh ở bất kỳ bề mặt nào; test với locale vi.
- Sửa: truyền locale hiện có vào formatter dùng chung cho ngày hiển thị; thay bảng tháng tiếng Anh bằng Intl, giữ US/European/ISO và ngày lịch gốc. “Created” lấy từ key đã dịch `noteList.sort.created`. Regression test chuyển locale ngay trên cùng hàng ghi chú; QA native đối chiếu Anh ↔ Việt và hai theme. [Biên bản, ảnh và giới hạn kiểm tra](F-002-LOCALIZED-DATES.md).

### F-003 — Nhãn Properties tiếng Anh
- **E1 — fixed (`1a262b64`), 18/11/2026:** Dịch nhãn hệ thống và placeholder Properties/Type/Relationships trong đủ locale; giữ khóa/giá trị, tên tùy chỉnh và dữ liệu. [Biên bản và bằng chứng](STEP-E1-FUNCTION-COPY.md).
- Thực tế (`PROPS`): "Type, Status, Date, URL, Icon, Belongs to, Related to, Has" cạnh "Thuộc tính", "Thêm thuộc tính".
- Lưu ý: đây có thể là tên khoá frontmatter. Khoá trong file giữ nguyên; chỉ dịch **nhãn hiển thị** của các khoá hệ thống. Khoá do người dùng tự tạo hiển thị nguyên văn.
- Chấp nhận: các khoá hệ thống có nhãn dịch trong mọi locale; file Markdown không đổi một byte.

### F-004 — Hai điều khiển gần trùng tên
- **E1 — fixed (`e8dfc0c2`), 18/11/2026:** Công tắc Đưa vào lịch ôn / nút Ôn ngay; help Home khớp nhãn. Test giữ callback và native mở đúng UX verification 1/1, không chấm điểm. [Biên bản và bằng chứng](STEP-E1-FUNCTION-COPY.md).
- Thực tế (`PROPS`): công tắc "Ôn tập ghi chú này" (bật/tắt lịch) ngay trên nút "Ôn ghi chú này" (mở phiên ôn).
- Đề xuất: công tắc → "Đưa vào lịch ôn"; nút → "Ôn ngay". Cập nhật luôn câu hướng dẫn ở Trang chủ đang trích tên công tắc.
- Chấp nhận: hai nhãn không dùng chung động từ; mọi locale được cập nhật; `pnpm l10n:validate` pass.

### F-005 — Nút icon thiếu tên truy cập
- Lô 4 · Truyền locale ứng dụng vào Excalidraw và kiểm tra đổi ngôn ngữ khi đang vẽ. RED: sau en → vi, nút vẫn đọc “Zoom in”.
- **Fixed phần Lô 4 (F-005)**. SDK nhận locale của ứng dụng, bật catalog vi-VN có sẵn, dùng catalog Memnova cho hai nhãn truy cập tiếng Việt còn thiếu và giữ thuộc tính lang của app. Đổi en → vi → en giữ hình và lịch sử hoàn tác trong regression. Chuỗi SDK chưa có bản dịch dùng tiếng Anh. Native vi [sáng](review-shots/2026-11-18/F-005-after-light.png) · [tối](review-shots/2026-11-18/F-005-after-dark.png).
- Đóng lô `21870f47` đã dịch nút chọn biểu tượng và nút menu bảng vẽ cho mọi catalog. QA xác nhận en, vi, de-DE và ja-JP. Nhãn nội bộ Excalidraw vẫn thuộc phần còn lại của finding. [QA lô](BATCH-2026-11-18.md).
- **Bổ sung trong lô, 18/11/2026:** Quét JSX theo cả thuộc tính và nội dung nhiều dòng, mở thêm các trạng thái qua test quét. Đã bổ sung tên tiếng Việt cho mũi tên tăng/giảm của [menu sắp xếp](../../src/components/SortDropdown.tsx), [các nút chọn biểu tượng](../../src/components/TypeCustomizePopover.tsx), [nút và combobox sửa biểu tượng](../../src/components/IconEditableValue.tsx), [combobox loại thẻ legacy](../../src/components/inspector/FlashcardPanel.tsx) và [tên trường đi kèm giá trị trong combobox chọn kho lưu trữ](../../src/components/WorkspaceSelector.tsx). Combobox chọn trường lọc đã được R-14 gắn nhãn cho từng hàng, nay được quét lại cùng bộ chọn toán tử. R-13 đã dịch hai nút BlockNote và qua kiểm tra lại khi chuyển ngôn ngữ.
- **Bảng vẽ nhúng:** Axe `button-name` phát hiện nút menu mặc định Excalidraw thiếu tên. [Lớp nhúng](../../src/components/ExcalidrawWhiteboard.tsx) giờ gắn nhãn catalog, còn nút và menu gốc vẫn xử lý chuột, Enter và Escape. Axe kiểm lại không báo vi phạm `button-name` trong các trạng thái bảng vẽ đã mở. Vẫn partial vì Excalidraw còn tên màn hình đọc tiếng Anh cho công cụ phụ, phóng to/thu nhỏ, hoàn tác/làm lại, trợ giúp và bộ chọn màu nền. SDK 0.18.1 áp dụng `langCode` cho cả nội dung hiển thị và thuộc tính ngôn ngữ của tài liệu. Bản sửa này chỉ gắn nhãn nút menu và giữ nguyên giao diện bảng vẽ.
- **E2 — partial (`f6601cbc`), 18/11/2026:** nhãn/tooltip icon của app đã dịch đủ catalog; mở rộng test sang mọi HTML button kể cả role combobox, 22/22 GREEN. Axe app/learning không còn button-name violation trong các trạng thái đã quét. Native BlockNote vẫn có hai nhãn English, ghi R-13 nên chưa đóng yêu cầu mọi nút được dịch. [Biên bản E2](STEP-E2-A11Y-FORMS.md).
- Thực tế: grep `size="icon` không kèm `aria-label` cùng dòng ≈ 58. Phép đếm một dòng nên có dương tính giả — mở từng file xác nhận.
- Chấp nhận: axe qua Playwright không còn lỗi `button-name` trên S1–S11; mỗi nút icon có tooltip trùng `aria-label`.

### F-006 — Phần tử form HTML thô
- **E2 — fixed (`f5462464`), 18/11/2026:** baseline hiện tại 32 raw tags ở 16 file → 0; Button/Input bare giữ presentation, refs/attributes/handlers. AST RED/GREEN, Enter/Escape/blur/emoji trên Chromium và WebKit; native Quick Open/Settings/quan hệ. Mỗi finding một commit theo yêu cầu E2 hiện tại. [Biên bản E2](STEP-E2-A11Y-FORMS.md).
- Thực tế: 38 chỗ `<button|input|select|textarea>` ngoài `src/components/ui`. Nhiều nhất: `inspector/InspectorChrome.tsx` (4), `StatusDropdown.tsx` (4), `EditableValue.tsx` (4), `inspector/RelationshipsPanel.tsx` (3), `TagsDropdown.tsx` (3), `AddPropertyForm.tsx` (3).
- Sửa: thay bằng `Button`/`Input`/`Select` shadcn, **mỗi file một commit**, giữ nguyên hành vi và test hiện có.
- Chấp nhận: grep còn 0 (hoặc từng ngoại lệ có chú thích lý do).

### F-007 — Thuật ngữ học tập
- Thực tế: "Ghi nhớ trang", "Ôn tập", "Ôn ghi chú đến hạn", "Thẻ cũ", "Gợi nhớ", "Thuộc tính của trang" — vừa "trang" vừa "ghi chú" cho cùng một thứ.
- Lựa chọn người dùng đã áp dụng vào 28 giá trị `vi.json`. Kiểm key và placeholder cùng bảng 201 key trước/sau. [Thuật ngữ](GLOSSARY.md) · [Biên bản](STEP-LEARNING-COPY.md).

### F-008 — Hai nút chính trên Trang chủ
- Thực tế (`HOME`): "Ghi chú mới" và "Ôn ghi chú đến hạn (4)" cùng kiểu nút đặc màu xanh.
- Sửa: mỗi vùng chỉ một nút chính. Đề xuất giữ "Ôn ghi chú đến hạn" là chính khi có bài đến hạn, "Ghi chú mới" là outline; đảo lại khi không có bài đến hạn.

- D2: hai hành động viết/duyệt ở header dùng outline lg; giữ nút ôn làm hành động chính. Không đổi callback hoặc thêm điều kiện theo lịch học. [Bằng chứng D2](STEP-D2-HOME-LIST-SIDEBAR.md).

### F-009 — Tên ghi chú mặc định
- Lô 4 · Nhãn “Chưa có tiêu đề” cho ghi chú mới có tên sinh tự động và chưa có H1. Tên tệp vẫn dùng cho thao tác đổi tên và tự đồng bộ khi viết H1.
- **Fixed phần Lô 4 (F-009)**. Danh sách và breadcrumb dùng nhãn ở lớp hiển thị. RED 2 ca → GREEN 183 test liên quan. Native tạo ghi chú, xác minh stem untitled-note-1794998298, nhập H1 rồi mở lại wave-four-qa-heading.md. [Sáng](review-shots/2026-11-18/F-009-after-light.png) · [Tối](review-shots/2026-11-18/F-009-after-dark.png) · [Sau khi nhập H1](review-shots/2026-11-18/F-009-after-h1-light.png).
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
- Sửa thành ngày tương đối. Tooltip ngày giờ tuyệt đối mở khi hover hoặc focus. Hai múi giờ Chromium/WebKit đều đạt, có mốc DST. [Biên bản](STEP-LEARNING-COPY.md).

### F-012 — "Cần xử lý" không có hướng dẫn
- Thực tế (`HOME`): nhãn đỏ, không tooltip nhìn thấy, không hành động. Phụ thuộc quyết định ở F-001.
- Nhãn hiển thị hướng xử lý theo từng trạng thái. Kiểm được ba nhãn bằng fixture và đường dẫn phục hồi trên native. Library native thử không có trạng thái cần xử lý để đối chiếu trực tiếp. [Biên bản](STEP-LEARNING-COPY.md).

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
- **E1 — fixed (`5ef69069`), 18/11/2026:** Dịch section loại mặc định sau sort, giữ ID/custom sidebarLabel/tùy chọn tên chính xác; Inbox vi thống nhất Chưa sắp xếp. Giữ nguyên thư mục thật Library và views theo chỉ dẫn người dùng. [Biên bản và bằng chứng](STEP-E1-FUNCTION-COPY.md).
- Thực tế (`HOME`): "Hộp thư đến" (nghĩa hộp thư email), gốc thư mục "Library" dù tiêu đề là "Thư viện", loại "Notes", thư mục `views` (chứa Saved View) hiện như thư mục môn học.
- Sửa: "Hộp thư đến" → "Chưa sắp xếp"; dịch nhãn gốc và loại mặc định; ẩn `views` khỏi cây thư mục (xác nhận đó là thư mục hệ thống trước).

### F-018 — Thanh công cụ editor
- Thực tế (`WRITE`): 10 icon liền nhau, một số khó đoán. Cần kiểm tooltip + phím tắt khi chạy app.
- Sửa: tooltip có tên + phím tắt cho từng nút; gom nút ít dùng vào "…".

- D3: giữ nhãn/tooltip đã có của icon chính; thêm nhóm chức năng, dịch nhánh Schedule/Review Deck và focus tooltip thanh tìm. Token hoá chrome/status bar; 10 icon AX/tooltip tiếng Việt kiểm riêng. [Nghiệm thu D3](STEP-D3-EDITOR-CHROME.md).

### F-019 — `outline-none`
- **E2 — fixed (`9463246e`), 18/11/2026:** thêm solid focus-visible outlines/token và kế thừa shared controls; bỏ suppression ở row không focusable. 5/5 Chromium + 5/5 WebKit (sáng/tối/forced colors); native Tab qua AI/status/sidebar/Settings/listbox. Literal outline-none 35→26, các chỗ giữ có replacement/kế thừa, không lấy số literal bằng 0 làm tiêu chí. [Biên bản E2](STEP-E2-A11Y-FORMS.md).
- Thực tế: 27 chỗ. Mở từng chỗ, kiểm có `focus-visible:ring` thay thế không.
- Chấp nhận: Tab qua mọi điều khiển đều thấy vòng focus ở cả hai theme.

### F-020 — Trang chủ và Ôn tập
- Hai màn có phần Ghi nhớ chung. Trang chủ có thêm tổng quan Thư viện và tiến độ, Ôn tập mở danh sách để duyệt. Mô tả tooltip phân biệt hai đích và test xác nhận hành vi điều hướng. [Biên bản](STEP-LEARNING-COPY.md).

### F-021 — Component quá lớn
- `App.tsx` 1886 · `AiWorkspace.tsx` 1403 · `SingleEditorView.tsx` 1389 · `BreadcrumbBar.tsx` 1247 · `SettingsPanel.tsx` 1221 · `inspector/RelationshipsPanel.tsx` 986 · `status-bar/StatusBarBadges.tsx` 862 · `tolariaEditorFormatting.tsx` 851.
- Chỉ tách khi một finding khác buộc phải sửa file đó. Không refactor hàng loạt.

### F-022 — Chữ nội bộ
- **E1 — fixed (`b8351fef`), 18/11/2026:** Lịch ôn / Chỉnh sửa thuộc tính, giữ schedule readonly và đích editor. Ảnh native sáng/tối và TDD đạt. [Biên bản và bằng chứng](STEP-E1-FUNCTION-COPY.md).
- "Lịch ôn · chỉ đọc" → "Lịch ôn". Nút "Thuộc tính của trang" trong panel "Thuộc tính" → đổi tên theo đúng thứ nó mở.

## Đợt 1 — hệ thống thị giác (17/11/2026)

Nguồn: kiểm kê grep toàn `src/` + đọc `learning/LearningStudyView.tsx`, `LearningStudyFaces.tsx`, `noteMemory.css`, `index.css` + 3 ảnh màn học. Số đo và cách sửa chi tiết: [`DESIGN-SPEC.md`](DESIGN-SPEC.md). Các finding dưới đây là **gốc rễ**; nhiều finding Đợt 0 (F-008, F-013, F-014, F-015) là triệu chứng của chúng.

| ID | Mức | Tóm tắt | Bằng chứng | Sửa theo | Trạng thái |
|---|---|---|---|---|---|
| F-023 | P1 | Không có thang chữ: 15+ cỡ, đặt bằng 4 cách khác nhau | SPEC §0 | SPEC §1 | fixed (ddbeb0d2, nền tảng bước A) |
| F-024 | P1 | ≥ 120 chỗ chữ 8–10px, khó đọc | `text-[10px]` 45, `text-[9px]` 6, `fontSize: 8/9/10` 12… | SPEC §1 | fixed (D4A và [đợt bổ sung CSS/chữ kế thừa](STEP-D4A-TYPOGRAPHY.md#bổ-sung-css-và-cỡ-chữ-kế-thừa)) |
| F-025 | P1 | `--text-muted` #B4B4B4 (≈2.1:1) dùng cho nhãn đọc được; token màu chữ trùng giá trị | `src/index.css:86-90` | SPEC §2 | fixed (207e1294, nền tảng bước A) |
| F-026 | P1 | CSS tính năng ghi đè component shadcn (`[data-slot=…]`) → cùng `Button`/`Switch` mà mỗi màn một cỡ | `learning/noteMemory.css:10-18,31,64,83-85` | SPEC §3 | fixed (a2428886) |
| F-027 | P1 | Màn ôn thẻ: ba vùng lệch mép (`max-w-4xl` / `3xl` / `2xl`), hộp lồng hộp, nội dung cần nhớ yếu hơn tiêu đề | `LearningStudyView.tsx:138,296`, `LearningStudyFaces.tsx:71,87,149` | SPEC §6 | fixed (62053c7a + 96754f2a) |
| F-028 | P1 | Nút chấm điểm `border-2` viền màu + nền nhuộm, cao tự do | `LearningStudyView.tsx:332`, `noteMemory.css:110-115` | SPEC §6 | fixed (87129845) |
| F-029 | P2 | Hai màn ôn song song, hai bảng màu chấm điểm | `FlashcardStudyView.tsx:53` vs `noteMemory.css:112-115` | SPEC §6 "Gom mã" | fixed (def6ee51) |
| F-030 | P2 | 6 chiều cao điều khiển (`h-6`…`h-12`); nút cạnh nhau khác cỡ | SPEC §0; ảnh `PROPS` ("Thuộc tính của trang" vs "+ Thêm mối quan hệ") | SPEC §3 | fixed (f8991a15, nền tảng bước A) |
| F-031 | P2 | Bo góc tuỳ tiện (7 mức + inline) | SPEC §0 | SPEC §4 | fixed (8dd9f931, nền tảng bước A) |
| F-032 | P2 | 331 `style={{}}` inline, khó giữ đồng bộ | PulseView 26, AiPanelChrome 20, SidebarParts 18, AiMessage 18, TelemetryConsentDialog 14 | SPEC §1–4 | partial — D4B dọn 5 file, lô `23cdf9c7…3f1cbb7e` dọn thêm 10 file, 77→17 object trong phạm vi và 72/72 cặp ảnh giống từng pixel. [D4B](STEP-D4B-INLINE-STYLE.md) · [Đóng lô](BATCH-2026-11-18.md) |
| F-033 | P2 | Trang chủ: hai tiêu đề gần bằng cỡ ("Thư viện", "Ghi nhớ trang"); tab trông như nút | ảnh `HOME` | SPEC §7 | fixed (`6f9932a8`) |
| F-034 | P2 | Màn hoàn thành ôn dùng `text-3xl`, lệch thang | `LearningStudyView.tsx:258` | SPEC §6 | fixed (3a1ff145) |
| F-035 | P2 | Sửa gợi nhớ: hai thanh ngang chồng nhau, nút "Chọn nguồn" to hơn chữ xung quanh | ảnh `2026-11-16-writing-first/mnemonic.png` | SPEC §7 | fixed (e28d4857; D1) |
| F-036 | P2 | Placeholder tiêu đề rỗng ("Heading" nghiêng đậm) trông như nội dung thật | ảnh `REVIEW` | SPEC §7 | fixed (`4878968e`) |
| F-037 | P2 | Mục sidebar đang chọn: huy hiệu số đổi sang đặc màu, mục khác thì không — hai kiểu "đang chọn" | ảnh `WRITE` vs `HOME` | SPEC §7 | fixed (`707bac53`) |
| F-038 | P3 | Độ đậm chữ dùng cả 400/500/600/700 ngoài editor | `font-bold` 21 | SPEC §1 | fixed — chờ QA native (e1fed99d…9de3e360; Home/Decks/FlashcardStudyView legacy; [giới hạn](STEP-D4B-INLINE-STYLE.md)) |
| F-039 | P2 | Core smoke wikilink không ổn định: Cmd+click xong H1 đích rỗng | `tests/smoke/wikilink-path-fix.spec.ts:63-70`, tái hiện cả baseline `f78b8fb9` | 90/90 không retry; full checks và pre-push dry-run sạch; [biên bản](F-039-COMPLETION.md) | fixed (`95176804`) |
| F-040 | P2 | Core smoke keyboard delete/Quick Open phụ thuộc retry | `tests/smoke/delete-note-nonblocking.spec.ts:53`, log pre-push bước C | Chờ Note B được chọn trước Enter | fixed test-only (`6074bb90`) |
| F-041 | P1 | WebKit regression: render error react-virtuoso khi lưu ghi chú thường trước Command Palette | `note-memory-workspace.spec.ts:124-147`; HEAD trước sửa 20/20 fail | Marker 60/60, regression 10/10, lane WebKit 10/10, native chuột/bàn phím đạt; [biên bản](F-041-COMPLETION.md) | fixed (`4c46db3c`) |

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
- Chấp nhận: xác định nguyên nhân và chạy ổn định không retry. Chưa sửa trong scope F-026.
- 18/11/2026 · **fixed (test-only, `6074bb90`)**. Baseline 10/10 thường nhưng 7/10 khi CPU chậm 4×. Ba lượt lỗi ghi nhận Note B đã hiện nhưng chưa được highlight tại Enter. Spec đợi đúng hàng selected rồi giữ Enter, H1, delete pending và thông báo hoàn tất. Sau sửa đạt 20/20 thường và 10/10 dưới CPU chậm, không retry. [Biên bản](STEP-TEST-STABILITY.md).

## Regression review A–D1 — R-02 / R-03

| ID | Mức | Nguồn | Tóm tắt | Trạng thái |
|---|---|---|---|---|
| R-02 | P2 | review A–D1 | Minimum size của Button icon từ bước A đè kích thước nhỏ ở call site, làm nút phình/lệch hàng | fixed (`326bf5a0`) |
| R-03 | P2 | review A–D1 | Undo ở màn ôn biến mất sau click, làm mất focus bàn phím đồng bộ | fixed (`e8cdfc3e`) |

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

- P2 · test-only · **fixed (`bbdaf558`)** theo ngoại lệ test chặn gate trong OVERNIGHT-RULES.
- RED trên HEAD D3 và checkout độc lập baseline `707bac53`, retries=0: `vault-workflows.spec.ts` đòi ẩn file còn tồn tại chỉ vì `Trashed: true`, và tìm nhãn Related to khi Properties chưa mở. [Baseline RED](evidence/D3-R06-baseline-red.txt). Không kết luận bug app mới.
- ADR-0045 đã bỏ Trash và yêu cầu cờ Trashed là metadata thường. Test mới xác nhận note có cờ cũ vẫn hiện và byte cờ giữ nguyên, xoá đúng file fixture tạm rồi mở lại Library, giữ assertion note biến mất/Note C vẫn hiện và thêm kiểm tra file không tồn tại. Test relationships click nút Properties trước assertion cũ. Không sửa app/fixture gốc, không thêm timeout/retry/skip hoặc hạ coverage.
- GREEN: 8/8 filesystem regression, 30,2s, retries=0. [Log](evidence/D3-R06-green.txt). Hai ca này xuất hiện khi hook chạy lại file có helper filename của D3; sửa trong commit test riêng, không làm D4 hoặc F-040.


## R-07 — Type-create regression dùng mock mặc định thay bridge filesystem

- P2 · test-only · **fixed (`652b29af`)** theo ngoại lệ test chặn gate của luật đêm.
- Baseline `707bac53` độc lập và HEAD D3 cùng fail 2/2 ở assertion `.bn-editor` visible sau tạo note trong mock mặc định, trước assertion breadcrumb. AX có entry mới và textbox; không kết luận bug app native. [Baseline RED, retries=0](evidence/D3-R07-baseline-red.txt). Hook mặc định đã tự retry2 và vẫn fail, không dùng retry làm bằng chứng pass.
- Dùng createFixtureVaultCopy/openFixtureVaultDesktopHarness/cleanup đã có như các core creation test; test có thư viện nhỏ riêng và bridge tạo/đọc file thật, không dùng dữ liệu demo hoặc prefs thật. Bỏ fixed sleep thay bằng readiness sẵn có của helper. Giữ nguyên assertion editor visible, filename/loại Project hoặc Note và raw frontmatter, không tăng timeout/retry/skip, không sửa app/mock.
- GREEN 2/2, 10,0s, retries=0. [Log](evidence/D3-R07-green.txt). Commit test riêng; không sửa F-040.


## R-08 — Flaky create/paste do readiness và selection của test

- P1 · **fixed (test-only, `71ee87bb`)**.
- Probe ban đầu D3: baseline `707bac53` 3/3 pass, cuối D3 1/3. [Baseline](evidence/D3-R08-baseline-probe.txt), [D3](evidence/D3-R08-current-probe.txt).
- Lượt regression rộng của D3 có 45 pass và 3 flaky trên config retry cũ. Probe selection trong D3 từng ghi End đổi offset 20 → 24. [Log regression](evidence/D3-R08-browser-regression.txt) · [Probe selection](evidence/D3-R08-geometry.txt).
- Ma trận không retry trên 7 commit, 5 lần cho mỗi ca tại mỗi commit. Baseline 12/15, cuối D3 9/15. Cmd+N và dán giữa hậu tố tái hiện trong ma trận baseline. Probe Home riêng đạt 19/20 trên baseline, tái hiện cùng lỗi ký tự đầu vào thân bài. Chưa xác định được commit D3 gây hồi quy app.
- Spec đợi Library fixture sẵn sàng và caret trong editor model trước khi gõ/dán. Giữ assertions về nội dung, filename, metadata và sau lưu. Chromium đạt **20/20 mỗi ca**, tổng **60/60**, không retry. [Biên bản](R-08-COMPLETION.md) · [Kết quả từng lượt](evidence/R-08-playwright.txt).


## R-09 — Ba ca browser mở rộng lỗi từ baseline D4A

- P2 · **fixed (test-only, `95106c09`)**.
- `ai-panel-shortcut.spec.ts:16`: panel visible nhưng `getByTitle('Close AI panel')` không có. `release-channel-settings.spec.ts:14` (hai ca): helper không mở được settings-panel bằng shortcut hoặc command fallback. Không đổi selector/timeout/assertion của các ca này.
- Tái hiện baseline độc lập `b95c7193` **3/3 fail**, và D4A **3/3 fail**, retries=0. [Baseline](evidence/D4A-R09-baseline.txt), [lượt D4A, kèm 5 ca pass](evidence/D4A-browser-regression.txt). Không dùng retry để che lỗi. Bằng chứng native D4A cho thấy Settings và AI panel mở qua chuột, chưa chứng minh mọi precondition browser đúng.
- 18/11/2026 · AI workspace và hai ca Settings gốc đều fail 10/10 không retry. AI mở được nhưng nút đúng là “Close AI workspace”, từ trước F-005. Cmd+, cũ đến trước readiness và probe fallback gửi Enter vào “Use Dark Mode”. Spec mới dùng role/tên truy cập, chờ Library và chạy riêng shortcut lẫn lệnh chính xác “Open Settings”. Mỗi ca đạt 20/20 không retry. [Biên bản](STEP-TEST-STABILITY.md).


## R-10 — Mô tả Welcome tiếng Việt vượt mép nút

- P3 · **fixed**. Nút Welcome dùng layout responsive, phần chữ co lại và xuống dòng, màn Welcome cuộn theo chiều dọc khi cần. Giữ kích hoạt và focus. [QA R-10](OVERNIGHT-2026-11-18.md#r-10--done).
- Native QA macOS1440×900, vi, sáng/tối: mô tả của nút tạo Library chạy vượt đường viền bên phải. Còn đọc được nhưng không nằm trong vùng hiển thị nút. [Baseline sáng](evidence/D4A-welcome-before-light.png), [đối chiếu tối](evidence/D4A-welcome-compare-dark.png). Hiện tượng có cả trước/sau thay token.
- Tái hiện bằng profile QA rỗng, locale vi. Sau sửa, chữ nằm trong nút ở 1440×900, 1024×700 và 480×400. Ma trận vi/en/ru-RU trên Chromium/WebKit và cả hai theme đạt 36/36. [Trước](evidence/R-10-before-light.png) · [Sau](evidence/R-10-after-light.png).

## R-11 — Copy English còn ngoài các nhãn E1 được chỉ định

- **I18N-A11Y-2:** mã và test quét đã sửa trong `29e69743`. **fixed — chờ QA native (editor thuộc tính)**. Xác minh Quick Open bằng AX native và nút Lưu trên Chromium/WebKit. [Biên bản và danh sách khớp](STEP-I18N-A11Y-2.md#r-11--quét-tên-truy-cập-và-nhãn-tiếng-việt).
- **E2:** phần accessible name Close quick open đã được dịch trong F-005 (`f6601cbc`); copy Save còn ngoài phạm vi E2, R-11 vẫn open.

- P2 · C4 · Có sẵn ở baseline E1.
- Native vi: editor thuộc tính còn nút “Save” (`src/lib/locales/vi.json`, khóa `common.save`); Quick Open còn accessible name “Close quick open” (`src/components/QuickOpenPalette.tsx:160`). [Ảnh editor vi](evidence/F-022-editor-after.png); Quick Open AX đã được quan sát khi kiểm sentinel.
- Tái hiện: chọn vi → mở Properties → Chỉnh sửa thuộc tính → xem nút Save; hoặc ⌘P → đọc accessible name nút đóng. Chấp nhận: đưa mọi nhãn vào source catalog/đủ bản dịch, giữ save/close handlers và phím tắt. Không đổi tên dữ liệu/thư mục thật. Để bước copy riêng, không mở rộng finding hệ thống Type/Status/quan hệ của F-003.

## R-12 — Precondition cũ trong smoke thuộc tính chặn commit E1

- P2 · test-only · **fixed (`e2721566`)** theo ngoại lệ gate của luật chạy đêm, tương tự R-06.
- Baseline độc lập `286fffae`, retries=0: `note-memory-properties.spec.ts:68` tìm button đổi độ rộng trong toolbar khi 1280×800/Properties mở; action đã ở overflow menu. Tab Mnemonic cũ cũng không còn là đường sửa gợi nhớ hiện hành. [Baseline RED / GREEN](evidence/E1-red-green.txt).
- Test đi qua More note actions → menuitem Switch to wide note width, rồi button Edit mnemonic. Giữ nguyên mọi assertion Markdown, opaque YAML, width, hai mặt và save; không sửa app hoặc tăng timeout/retry/skip.
- GREEN tường minh 1/1, 8,7s, --retries=0; hook thường sau sửa pass ngay lần đầu. Hook cũ trước sửa đã tự dùng hai retry theo config có sẵn và vẫn fail; không thêm retry và không gọi lượt cũ là pass.

## R-13 — Nhãn icon nội bộ BlockNote vẫn tiếng Anh trong UI vi

- P2 · copy/a11y dependency · **fixed (`f91accb8`)**. Dictionary theo locale app, giữ nội dung, selection, draft và undo. Xác minh tên nút tiếng Việt trên native. [Biên bản](STEP-I18N-A11Y-2.md).
- Native vi, UX verification → editor → hover vùng block: AX có button `Add block` và `Open block menu`. Hai nút có tên nhưng chưa được dịch. [AX đầy đủ](evidence/R-13-native-AX.txt), [ảnh ngữ cảnh](evidence/E2-editor-labels.png).
- Baseline E2 tạo BlockNote với dictionary mặc định của dependency.
- Tác động: người dùng đọc màn hình tiếng Việt gặp tên hành động English trong editor. Chấp nhận: tên/tooltip hai nút và các control liên quan theo locale, có regression đổi locale mà không mất selection/draft; nguồn copy/catalog theo AGENTS. Không remount editor để đổi nhãn nếu làm mất trạng thái.

## R-14 — Ô chọn trường trong bộ lọc thiếu tên truy cập

- P2 · a11y · **fixed (`c068a687`)**. Từng shared Input có label liên kết riêng. Xác minh hai hàng native và test Enter chỉ đổi hàng được chọn. [Biên bản](STEP-I18N-A11Y-2.md).
- `src/components/FilterFieldCombobox.tsx:195`: input role combobox có aria-controls/expanded nhưng không có aria-label/labelledby hoặc label liên kết. Browser fixture E2 có hai điều kiện, sau khi sửa các button combobox vẫn còn 2 input combobox có accessible name rỗng. [DOM và phép đếm](evidence/E2-combobox-browser.txt), [fixture](evidence/E2-axe-fixture-source.txt).
- Tái hiện: mở FilterBuilder với title/status → kiểm accessibility tree của hai ô chọn trường. Giá trị title/status không thay cho author name. Tác động: khó phân biệt ô chọn trường với các control lọc khác khi dùng screen reader; vẫn thao tác bàn phím được.
- Chấp nhận: tên trường lọc đã dịch, liên kết đúng từng control; giữ query/property key, value, callbacks và phím. Không nới rule button-name để che lỗi input; bổ sung kiểm form naming riêng ở bước sau.

## R-15 — Chuỗi tiếng Anh chưa đưa vào catalog

- P2 · i18n · **fixed đủ locale** (`91ff4da7`, `21870f47`). Native vi từng hiện “Paragraph”, “Match all conditions”, “Add filter” và “Add group”. Các chuỗi này nằm ngoài phép so khớp nguyên giá trị với catalog ở R-11. [AX ban đầu](evidence/I18N-A11Y-2-native-AX.txt).
- Đưa 42 khóa vào catalog cho kiểu khối, nhãn và tooltip định dạng, toán tử, chế độ khớp, các nút, ô giá trị và trạng thái tìm trường rỗng. Tên trường Markdown, giá trị và payload `all`/`any` giữ nguyên. Đã thay giá trị tiếng Anh tạm trong 16 catalog, giữ placeholder và ký hiệu Markdown. Validator cuối lô đạt 18 catalog và 1.153 khóa. [QA lô](BATCH-2026-11-18.md).
- Hai test hồi quy RED → GREEN. WKWebView native vi 1440×900 xác nhận menu kiểu khối, đổi VÀ/HOẶC, thêm điều kiện, thêm nhóm lồng, chọn toán tử bằng Down/Enter và đóng bằng Escape. SPEC §8 giữ **1 / 0**. [Thanh định dạng sáng trước](evidence/R-15-toolbar-before.png) · [sau](evidence/R-15-toolbar-after.png) · [tối trước](evidence/R-15-toolbar-before-dark.png) · [sau](evidence/R-15-toolbar-after-dark.png). [View sáng trước](evidence/R-15-filter-before.png) · [sau](evidence/R-15-filter-after.png) · [tối trước](evidence/R-15-filter-before-dark.png) · [sau](evidence/R-15-filter-after-dark.png).
- Chromium kiểm nhãn vi và thanh định dạng en đạt. Hai ca trong `filter-wikilink-autocomplete.spec.ts` đều dừng ở bước mở View trên cả baseline `c89e0aa7` lẫn bản sửa. Bản chạy đối chiếu dùng nút Tạo View và ô chọn trường hiện hành trên fixture tạm, giữ nguyên assertion nhập văn bản/wikilink, đạt 2/2 không retry.

## R-16 — Smoke H1 đôi lúc vẫn thấy tiêu đề cũ trong danh sách

- P2 · lỗi đồng bộ metadata trong app · **fixed** (`:/^fix: R-16 keep saved headings current in the note list`). Hook R-10 ghi editor đã hiện “Alpha Project Fast Typing Flow”, hàng đã chọn vẫn hiện “Alpha Project”. [Kết quả và AX ban đầu](evidence/R-16-smoke.txt).
- Baseline `dcc809fd` đạt 5/5 khi chạy riêng và 5/5 với CPU chậm 4×. Giữ phản hồi nạp nền đầu tiên của Library fixture đến sau khi API lưu trả 200 tái hiện lỗi 5/5 ở assertion tên trong danh sách. Cả năm trace đều ghi yêu cầu lưu có H1 cuối. Mỗi lượt chạy một lần với `--retries=0`.
- `useVaultLoader` giao việc nạp Library đang mở cho luồng khởi tạo. Luồng nền chỉ nạp các Library khác, tránh áp lại snapshot cũ sau khi người dùng sửa tiêu đề. Lượt kiểm sau thay đổi này đạt 9/10. Lượt lỗi có “Saved” và cảnh báo React về độ sâu cập nhật, toàn bộ phản hồi nạp danh sách đã về trước Cmd+S. `useEditorSaveWithLinks` cập nhật tên hiển thị từ nội dung vừa lưu trong cùng lần cập nhật metadata, kể cả khi transition của tiêu đề nháp còn chờ.
- Hai test hồi quy Vitest đã RED rồi GREEN, tổng 161/161 ca liên quan đạt. Sau cả hai sửa đổi, Chromium đạt 10/10 với `--retries=0 --repeat-each=10` trên ca gốc ở dòng 154, giữ đủ assertion của editor, danh sách và mở lại. Cả 10 trace ghi API lưu trả 200 với H1 cuối.

## Đợt 2 · Lô 1

### F-042 · W2-01 · Quick Open ghi ký tự vào ghi chú

- P1 · **fixed (commit W2-01)**. Trong Library QA native 1440×900, vi, tập trung editor và gõ `x` ngay sau phím tắt. Cmd+P: 5/5 ký tự lọt vào ghi chú, tệp Markdown tự lưu kết thúc bằng `xxxxx`. Cmd+K: 5/5 ký tự vào ô lệnh. Không retry.
- Đạt khi ký tự gõ ngay sau cả hai phím tắt vào ô tìm kiếm/lệnh và giữ nguyên nội dung ghi chú, có regression test.
- Nguyên nhân: Quick Open đợi timer 50 ms để focus. Ô tìm kiếm giờ nhận focus khi mount, trước khi vẽ. Chromium RED: Cmd+P thêm `x` vào editor, Cmd+K đạt. GREEN: 2/2, không retry, kiểm nội dung editor và byte tệp. Native sau sửa: 10/10 ở tối và một lượt đối chiếu ở sáng, tệp QA giữ nguyên ký tự từ lần tái hiện.
- Ảnh native: [trước sáng](review-shots/2026-11-18/W2-01-before-light.png) · [trước tối](review-shots/2026-11-18/W2-01-before-dark.png) · [sau sáng](review-shots/2026-11-18/W2-01-after-light.png) · [sau tối](review-shots/2026-11-18/W2-01-after-dark.png).

### F-043 · W2-02 · Quick Open cắt hàng kết quả

- P1 · **fixed (commit W2-02)**. [Ảnh gốc](review-shots/2026-11-18/11a-quick-open-light.png) cho thấy thanh cuộn ngang trong danh sách chỉ có một kết quả. Kiểm lại trên native thấy danh sách dài bị cắt ngang hàng cuối ở đáy. Kết quả đơn của fixture hiện đủ.
- Đạt khi từ một đến khoảng tám hàng hiển thị đầy đủ ở cả hai theme, kết quả tiếp theo cuộn theo chiều dọc.
- Danh sách dùng vùng cuộn dọc với giới hạn tám hàng theo chiều cao điều khiển hiện tại. Native vi 1440×900: tám hàng thấy đủ ở hai theme, truy vấn đúng tên thấy một hàng trọn vẹn.
- Ảnh native: [trước sáng](review-shots/2026-11-18/W2-02-before-light.png) · [trước tối](review-shots/2026-11-18/W2-02-before-dark.png) · [sau sáng](review-shots/2026-11-18/W2-02-after-light.png) · [sau tối](review-shots/2026-11-18/W2-02-after-dark.png) · [một kết quả](review-shots/2026-11-18/W2-02-after-single-light.png).

### F-044 · W2-03 · Thuộc tính cắt nhãn và giá trị

- P1 · **fixed (commit W2-03)**. [Ảnh gốc](review-shots/2026-11-18/07-thuoc-tinh-xem-light.png) cho thấy nhãn ngày bị cắt và thanh cuộn ngang. Fixture vi có ngày địa phương, nhãn dài và URL dài.
- Đạt khi mỗi thuộc tính có một hàng hoặc một cặp nhãn trên giá trị, chữ đọc được và panel không cuộn ngang ở bề rộng mặc định.
- Nhãn và giá trị đã lưu dùng trọn chiều rộng. Ngày, URL và văn bản dài xuống dòng. Lịch ôn dùng một cặp dòng cho lần ôn tới. Native vi 1440×900: nhãn dài, hai ngày và URL đều đọc được, chỉ cuộn dọc.
- Ảnh native: [trước sáng](review-shots/2026-11-18/W2-03-before-light.png) · [trước tối](review-shots/2026-11-18/W2-03-before-dark.png) · [sau sáng](review-shots/2026-11-18/W2-03-after-light.png) · [sau tối](review-shots/2026-11-18/W2-03-after-dark.png).

### F-045 · W2-04 · Pill Loại chồng lên nhãn Trạng thái

- P1 · **fixed (commit W2-04)** theo [ảnh gốc](review-shots/2026-11-18/08-thuoc-tinh-chon-ngay-light.png). Sau W2-03, fixture hẹp đã tách hàng khỏi Trạng thái, nhưng hàng Loại đổi từ ngang sang dọc vì kế thừa số cột của lưới ngoài.
- Đạt khi mỗi hàng Loại có vị trí riêng, không chồng nhãn Trạng thái khi mở hoặc đóng dialog, kể cả khi thu panel.
- Hàng Loại dùng lưới riêng hai cột, chiếm cả hàng của lưới cha. Native vi 1440×900, panel hẹp, sáng/tối: Loại và Trạng thái tách rõ khi mở và đóng dialog.
- Ảnh native: [trước sáng](review-shots/2026-11-18/W2-04-before-light.png) · [trước tối](review-shots/2026-11-18/W2-04-before-dark.png) · [sau sáng](review-shots/2026-11-18/W2-04-after-light.png) · [sau tối](review-shots/2026-11-18/W2-04-after-dark.png).

### F-046 · W2-05 · Lịch bật ra cắt hàng tuần cuối

- P1 · **fixed (commit W2-05)**. Native vi 1440×900, Chỉnh sửa thuộc tính → trường Ngày → tháng 11/2026. Hàng chứa ngày 30/11 nằm ngoài nền popover, dù có trong cây trợ năng.
- Đạt khi đủ sáu hàng với mọi tháng và popover nằm trong cửa sổ.
- Lịch luôn dựng sáu tuần. Ô ngày dùng kích thước cố định, nên WebKit đo đủ chiều cao bảng. Popover trong dialog ưu tiên phía trên và vẫn cho Radix đảo phía theo không gian. Native vi 1440×900 sáng/tối thấy hàng cuối đầy đủ, bấm và lưu được 30/11/2026. Test lịch RED trước sửa, GREEN 18/18, Playwright chọn và nhập ngày 3/3.
- Ảnh native: [trước sáng](review-shots/2026-11-18/W2-05-before-light.png) · [trước tối](review-shots/2026-11-18/W2-05-before-dark.png) · [sau sáng](review-shots/2026-11-18/W2-05-after-light.png) · [sau tối](review-shots/2026-11-18/W2-05-after-dark.png).

### F-047 · W2-06 · Panel AI cắt điều khiển bên phải

- P1 · **fixed (commit W2-06)**. Native vi 1440×900: mở Thuộc tính rồi mở bảng AI từ nút nổi. Hàng cảnh báo cắt nút Khôi phục và phần soạn thảo cắt mép phải, gồm nút gửi.
- Đạt khi cảnh báo, nút khôi phục, trình soạn thảo và nút gửi đều nằm trong panel ở 1440×900 và kích thước cửa sổ nhỏ nhất.
- Phiên chat co theo panel và nhóm điều khiển xuống dòng khi cần. Native vi sáng/tối: 1440×900 có cả Thuộc tính và AI, 480×400 ở chế độ viết. Nhập bản nháp ở 480×400 để kiểm nút gửi, không gửi ra ngoài.
- Ảnh native: [trước sáng](review-shots/2026-11-18/W2-06-before-light.png) · [trước tối](review-shots/2026-11-18/W2-06-before-dark.png) · [sau sáng](review-shots/2026-11-18/W2-06-after-light.png) · [sau tối](review-shots/2026-11-18/W2-06-after-dark.png) · [480×400 sáng](review-shots/2026-11-18/W2-06-minimum-light.png) · [480×400 tối](review-shots/2026-11-18/W2-06-minimum-dark.png).

### F-048 · W2-07 · Dialog xóa ghi chú lẫn tiếng Anh và sai số lượng

- P1 · **fixed (commit W2-07)**. Native vi 1440×900, menu Thêm hành động ghi chú → Xóa ghi chú này: tiêu đề và nút còn tiếng Anh, xóa đứng trước hủy, nội dung số nhiều khi xóa một ghi chú.
- Đạt khi xác nhận dùng shadcn AlertDialog, copy vi đúng số lượng và thứ tự Hủy → Xóa.
- AlertDialog hiển thị Hủy trước Xóa vĩnh viễn và đặt focus ban đầu vào Hủy. Enter kích hoạt nút đang focus. Native vi 1440×900: xác nhận một ghi chú ở sáng và hai ghi chú ở tối, Hủy/Esc giữ ghi chú. Vitest 23/23, Playwright 6/6 qua các lần chạy riêng. Ca giữ gợi nhớ đổi bước mở editor từ tab cũ sang nút Sửa gợi nhớ đang dùng và giữ các assertion lưu/xóa.
- Catalog en/vi hoàn tất, bốn khóa ghi vào [L10N-PENDING](L10N-PENDING.md), validator đạt 18 catalog. Dùng sự kiện `note_deleted` đã có.
- Ảnh native: [trước sáng](review-shots/2026-11-18/W2-07-before-light.png) · [trước tối](review-shots/2026-11-18/W2-07-before-dark.png) · [một ghi chú sáng](review-shots/2026-11-18/W2-07-after-light.png) · [hai ghi chú tối](review-shots/2026-11-18/W2-07-after-dark.png).

### F-049 · W2-08 · Mặt sau thẻ cũ hiển thị JSON tldraw

- P1 · **fixed (commit W2-08)**. Native vi 1440×900: Ôn tập → Thẻ cũ → Bắt đầu ôn → Hiện câu trả lời. `Whiteboard Test` có một khối `tldraw` sau `FLASHCARD:BACK` trong Markdown. SQLite lưu nguyên khối ở `cards.back`. Renderer Excalidraw không nhận định dạng tldraw nên BlockNote hiện JSON như mã.
- Đạt khi mặt sau hiển thị bản vẽ hoặc thông báo dễ hiểu, với tệp Markdown và dữ liệu thẻ giữ nguyên.
- Khối tldraw/whiteboard được thay bằng thông báo bản địa hóa trong renderer chỉ đọc, kể cả nhánh lỗi parse. Excalidraw và các khối mã thông thường giữ renderer hiện tại. RED 2/2 trước sửa, GREEN 121/121 gồm renderer, LearningStudyView và Markdown. Native vi 1440×900, sáng/tối thấy thông báo thay cho JSON. Không chấm điểm và không có đường ghi dữ liệu trong bản sửa.
- SHA-256 trùng trước/sau khi so tệp Markdown và hai mặt SQLite của thẻ QA:
  - `markdown f55385b014d712110358204ff47262a62c6a82a6d56da6162c155e96ea378695`
  - `front 9eda256c9a89994802aba6af7ed7bd328a986e3f7561c0079ea0ce479f33a70f`
  - `back f0ffd6bdd71c6d4d5c5b21cee3616420b57c7884912d83577b84eb046e8af210`
- Catalog en/vi hoàn tất, một khóa ghi vào [L10N-PENDING](L10N-PENDING.md).
- Ảnh native: [trước sáng](review-shots/2026-11-18/W2-08-before-light.png) · [trước tối](review-shots/2026-11-18/W2-08-before-dark.png) · [sau sáng](review-shots/2026-11-18/W2-08-after-light.png) · [sau tối](review-shots/2026-11-18/W2-08-after-dark.png).

## Đợt 2 · Lô 2

W2-09 bỏ qua vì mục Quyết định còn ghi “chưa quyết”.

### F-050 · W2-11 · Mặt sau thẻ nằm ngoài vùng nhìn

- P2 · **fixed (commit W2-11)**. [Ảnh gốc](review-shots/2026-11-18/14-flashcard-da-lat-light.png). Mở Whiteboard Test trong Thẻ cũ, lật thẻ có câu hỏi dài. Muốn đọc câu trả lời phải cuộn thân dialog.
- Đạt khi lật thẻ đưa câu trả lời vào vùng nhìn và giữ phím chấm 1–4.
- Khi mặt sau dựng xong, focus vào vùng câu trả lời và cuộn tức thì. Test RED → GREEN (17/17), gồm phím chấm sau lật. Native vi 1440×900 [sáng](review-shots/2026-11-18/W2-11-after-light.png) · [tối](review-shots/2026-11-18/W2-11-after-dark.png).

### F-051 · W2-12 · Tên thẻ lặp trong nội dung câu hỏi

- P2 · **fixed (commit W2-12)**. [Ảnh gốc](review-shots/2026-11-18/13-flashcard-mat-truoc-light.png). Tên Whiteboard Test ở dialog và ở H1 đầu câu hỏi.
- Đạt khi tên chỉ xuất hiện một lần và vẫn hiển thị các tiêu đề riêng trong câu hỏi.
- Bỏ H1 đầu trùng tên trong nội dung hiển thị của thẻ legacy. Test RED → GREEN (18/18). Native [sáng](review-shots/2026-11-18/W2-12-after-light.png) · [tối](review-shots/2026-11-18/W2-12-after-dark.png).

### F-052 · W2-13 · Thiếu tóm tắt khi hoàn thành phiên

- P2 · **fixed (commit W2-13)**. [Ảnh gốc](review-shots/2026-11-18/15-flashcard-ket-thuc-phien-light.png). Phiên kết thúc chỉ có tổng lượt ôn, tiêu đề chung và nút Đóng.
- Đạt khi hiện số thẻ theo mức chấm gần nhất trong phiên, hạn ôn sớm nhất và Ôn tiếp nếu còn thẻ đến hạn trong phạm vi vừa ôn.
- Tóm tắt đọc lượt chấm chưa bị hoàn tác cuối cùng của mỗi thẻ và hạn sớm nhất của các thẻ còn hoạt động. Ôn tiếp dùng lối mở phiên hiện có, chỉ hiện khi còn thẻ đến hạn trong phạm vi. Không đổi cách lưu phiên hoặc tính lịch.
- UI và Rust đều RED trước sửa. Vitest 20/20, Rust session 14/14. Native [sáng](review-shots/2026-11-18/W2-13-after-light.png) · [tối](review-shots/2026-11-18/W2-13-after-dark.png). QA chấm chuột, hoàn tác, lật Space và chấm phím 4 trong Library tạm.

### F-053 · W2-14 · Trang Ôn tập thiếu phân cấp và mục Nâng cao chưa rõ

- P2 · **fixed (commit W2-14)**. Native vi 1440×900: tab sát mép trên, tab Thẻ cũ chứa hai tiêu đề Bộ thẻ, nhãn MEMNOVA và một khung trống quanh nút Nâng cao.
- Đạt khi trang có đệm trên, một tiêu đề, tab Bộ thẻ dễ nhận diện và điều khiển Nâng cao có mũi tên báo trạng thái.
- Trang có tiêu đề Ôn tập với lề như Trang chủ, tab Bộ thẻ và disclosure Nâng cao có mũi tên. Xác nhận mở/đóng bằng chuột. Vitest RED → GREEN 12/12. Native [trước tối](review-shots/2026-11-18/W2-14-before-dark.png) · [sau sáng](review-shots/2026-11-18/W2-14-after-light.png) · [sau tối](review-shots/2026-11-18/W2-14-after-dark.png).

### F-054 · W2-20 · Nút chấm lặp từ chỉ tương lai

- P3 · **fixed (commit W2-20)**. Native vi, nút Học lại hiện “sau 1 phút nữa” sau khi lật gợi nhớ.
- Đạt khi nút hiện “1 phút nữa” từ Intl.RelativeTimeFormat và giữ nguyên mốc dự đoán.
- Định dạng khoảng ôn dùng chung trên hai renderer. Với vi chỉ bỏ “sau” khi đầu ra Intl đồng thời có “nữa”. Vitest RED → GREEN 33/33. Native thấy “1 phút nữa”, “6 phút nữa”, “8 ngày nữa” [sáng](review-shots/2026-11-18/W2-20-after-light.png) · [tối](review-shots/2026-11-18/W2-20-after-dark.png).

### F-055 · W2-22 · Hai nút ôn ghi chú có cùng biểu tượng

- P3 · **fixed (commit W2-22)**. Sau khi lật gợi nhớ, Quay lại ghi chú và Hoàn tác cùng dùng mũi tên gập. [Ảnh trước](review-shots/2026-11-18/W2-20-after-light.png).
- Đạt khi biểu tượng chuyển về ghi chú và hoàn tác lượt chấm có hình khác nhau và giữ nguyên tên truy cập.
- Quay lại ghi chú dùng mũi tên trái thẳng. Hoàn tác giữ mũi tên gập. SVG là trang trí, nhãn và handler giữ nguyên. Vitest RED → GREEN 22/22. Native [sáng](review-shots/2026-11-18/W2-22-after-light.png) · [tối](review-shots/2026-11-18/W2-22-after-dark.png).

### F-056 · W2-13 · Ôn tiếp mở sai luồng khi phiên cũ lược trường lane

- P2 · Playwright en, vi, de-DE, ja-JP. Trong Library tạm, mở phiên thẻ cũ có một thẻ, thêm thẻ đến hạn cùng ghi chú sau khi bắt đầu, chấm thẻ đầu rồi chọn Ôn tiếp. Phiên mới chọn luồng Ghi nhớ nên không nhận thẻ cũ đến hạn.
- Đạt khi Ôn tiếp mở đúng luồng và phạm vi của phiên đã xong, kể cả khi scope đã lưu lược trường `lane` theo định dạng legacy.
- UI mặc định luồng legacy trước khi kiểm thẻ đến hạn và mở phiên nối tiếp. Giữ scope lưu, thuật toán xếp lịch và phím ôn.

## Đợt 2 — Lô 3

### F-057 · W2-10 · Editor bị ép hẹp khi mở Thuộc tính và AI

- P2 · Mở một ghi chú, rồi mở Thuộc tính và AI. Hai panel chia chiều ngang với editor, tiêu đề và breadcrumb bị cắt ở 1440×900. [Ảnh audit](review-shots/2026-11-18/18-bang-ai-rong-light.png).
- Đạt khi editor giữ tối thiểu khoảng 480 px ở 1440×900 và 1024×700, hai panel vẫn mở được và các thao tác hiện có vẫn khả dụng.
- **fixed (commit W2-10)**. Khi hai công cụ mở, danh sách tự thu ở cửa sổ chật, AI nằm nổi khi cột editor không chứa được cả hai panel. Kiểm tra native vi [1440 sáng](review-shots/2026-11-18/W2-10-after-1440-light.png) · [1440 tối](review-shots/2026-11-18/W2-10-after-1440-dark.png) · [1024 sáng](review-shots/2026-11-18/W2-10-after-1024-light.png) · [1024 tối](review-shots/2026-11-18/W2-10-after-1024-dark.png).

### F-058 · W2-15 · Công cụ sao lưu và khôi phục nằm ở Trang chủ

- P2 · Mở Trang chủ → Nâng cao. Công cụ sao lưu, xác minh và khôi phục ở cùng nhóm hành động trên Trang chủ. [Ảnh audit](review-shots/2026-11-18/02-trang-chu-light.png).
- Đạt khi nhóm công cụ chuyển sang Cài đặt › Thư viện. Giữ thao tác, dữ liệu và khả năng khôi phục khi Library lỗi. Phạm vi chỉ gồm chuyển công cụ sao lưu và khôi phục.
- **fixed (commit W2-15)**. Cùng bảng công cụ nằm trong Thư viện. Lối cứu hộ trên màn lỗi vẫn khả dụng. Playwright RED → GREEN cho tạo/xác minh, khóa khôi phục và tải lại. QA native tạo, xác minh, khôi phục vào Library tạm mới. SHA-256 ghi chú mẫu trùng bản gốc. [1440 sáng](review-shots/2026-11-18/W2-15-after-1440-light.png) · [1440 tối](review-shots/2026-11-18/W2-15-after-1440-dark.png) · [1024 sáng](review-shots/2026-11-18/W2-15-after-1024-light.png) · [1024 tối](review-shots/2026-11-18/W2-15-after-1024-dark.png).

### F-059 · W2-17 · Ngày trong panel và chip dùng nhiều cách hiển thị

- P2 · Mở Thuộc tính của ghi chú có ngày, lịch ôn và thuộc tính ngày hiển thị trong danh sách. Các bề mặt dùng ngày đầy đủ, ngày–giờ rút gọn và chuỗi ISO. [Ảnh audit](review-shots/2026-11-18/07-thuoc-tinh-xem-light.png).
- Đạt khi ngày, ngày–giờ và chip dùng cùng formatter theo locale và cài đặt ngày. Giá trị lưu tiếp tục là ISO.
- **fixed (commit W2-17)**. Chip ngày của hộp thoại và ngày đến hạn dùng formatter theo tùy chọn hiển thị. Vitest hai ca RED, 20 test GREEN gồm lịch và xuất ISO từ bộ chọn. Native vi chuyển từ dạng thân thiện sang châu Âu, kiểm [1440 sáng](review-shots/2026-11-18/W2-17-after-1440-light.png) · [1440 tối](review-shots/2026-11-18/W2-17-after-1440-dark.png) · [1024 sáng](review-shots/2026-11-18/W2-17-after-1024-light.png) · [1024 tối](review-shots/2026-11-18/W2-17-after-1024-dark.png). SHA-256 ghi chú mẫu giữ nguyên khi chỉ đổi tùy chọn.

### F-060 · W2-18 · Các lối thêm và sửa trong panel Thuộc tính bị phân tán

- P2 · Mở Thuộc tính và xem cạnh các trường quan hệ trống. Ba chữ Thêm giống giá trị, thêm quan hệ và thêm/sửa thuộc tính nằm ở các vị trí khác nhau. Với ghi chú chưa có Loại, mục chuẩn bị chưa chỉ rõ bước tiếp theo. [Ảnh audit](review-shots/2026-11-18/07-thuoc-tinh-xem-light.png).
- Đạt khi Thêm là nút ghost, các lối thêm và sửa gom ở cùng nhóm, hướng dẫn ngắn và nêu cụ thể thao tác cần làm.
- **fixed (commit W2-18)**. Các nút thêm tham chiếu dùng ghost kèm dấu cộng. Thêm thuộc tính, thêm quan hệ và mở chỉnh sửa nằm trong cùng nhóm. Ghi chú chưa có thuộc tính được chỉ rõ cách đặt Loại mặc định. RED → GREEN 151 test tập trung. Native vi [1440 sáng](review-shots/2026-11-18/W2-18-after-1440-light.png) · [1440 tối](review-shots/2026-11-18/W2-18-after-1440-dark.png) · [1024 sáng](review-shots/2026-11-18/W2-18-after-1024-light.png) · [1024 tối](review-shots/2026-11-18/W2-18-after-1024-dark.png) · [chưa có Loại](review-shots/2026-11-18/W2-18-untyped-1440-dark.png). Ba khóa copy vào danh sách chờ đóng lô.

## Đợt 2 · Lô 4

### F-061 · W2-16 · Tên ứng dụng và mô tả kênh phát hành

- P2 · Cài đặt còn tên Tolaria và mô tả Alpha theo thao tác đẩy lên nhánh phát triển. [Ảnh audit](review-shots/2026-11-18/17a-cai-dat-tab-dau-dark.png).
- Đạt khi catalog en/vi dùng Memnova và giải thích sự khác nhau giữa bản ổn định và bản thử nghiệm.
- **fixed (commit W2-16)**. Nhãn catalog dùng Memnova. Hai mô tả kênh phát hành chờ dịch ngoài en/vi. Validator đạt cả 18 catalog.

### F-062 · W2-19 · Cảnh báo hướng dẫn Gemini chưa dịch

- P2 · Mở AI khi Library chưa có GEMINI.md, banner ghép tiếng Việt với “Gemini guidance can be created”. [Ảnh audit](review-shots/2026-11-18/18-bang-ai-rong-light.png).
- Đạt khi lý do và thao tác tạo hoặc khôi phục được diễn đạt theo ngôn ngữ ứng dụng.
- **fixed (commit W2-19)**. Banner và trạng thái hướng dẫn dùng catalog. Khi thiếu GEMINI.md, câu chỉ rõ chọn Khôi phục để tạo tệp. Test vi RED → GREEN.

### F-063 · W2-21 · Lớp phủ của hộp thoại và thanh trạng thái

- P3 · Mở phiên ôn Thẻ cũ. Ảnh audit cho thấy thanh trạng thái qua nền bán trong suốt. Đạt khi lớp phủ kéo tới mép dưới và nằm trên thanh trạng thái. [Ảnh audit](review-shots/2026-11-18/13-flashcard-mat-truoc-light.png).
- **Đã đạt trên baseline**. Native vi 1440×900 cho thấy thanh trạng thái được làm tối trong [theme sáng](review-shots/2026-11-18/W2-21-verified-light.png) và [theme tối](review-shots/2026-11-18/W2-21-verified-dark.png). Playwright Chromium/WebKit đo overlay kín viewport ở zoom 80%, 100%, 150%. Thêm kiểm tra lớp phủ ở mép dưới trong luồng ôn của app.

### F-064 · W2-23 · Có thể kéo chọn chữ trên giao diện

- P3 · Kéo qua các nhãn Trang chủ. Chữ chrome bị bôi đen cùng lúc. Đạt khi kéo trong chrome không chọn chữ, còn nội dung ghi chú và trường nhập vẫn chọn được. [Ảnh audit](review-shots/2026-11-18/02-trang-chu-light.png).
- **fixed (commit W2-23)**. Khóa chọn chữ ở chrome và bật lại cho nội dung ghi chú, rich/raw editor và trường nhập. Playwright Chromium/WebKit xác nhận các vùng áp dụng. Native vi [sáng](review-shots/2026-11-18/W2-23-after-light.png) · [tối](review-shots/2026-11-18/W2-23-after-dark.png).

### F-065 · W2-24 · Cảnh báo MCP và bộ đếm thay đổi cùng dùng màu cảnh báo

- P3 · Thanh trạng thái có MCP chưa kết nối và số thay đổi chờ lưu. Đạt khi tooltip MCP nói lý do, chỉ rõ cách mở thiết lập nếu khả dụng, còn bộ đếm dùng màu trung tính.
- **fixed (commit W2-24)**. Tooltip giải thích tình trạng MCP và hiện lời chỉ dẫn khi có thể mở thiết lập. Số thay đổi có nền và chữ trung tính. Vitest RED → GREEN 69 test.
- QA native tiếng Việt ở 1440×900. [Sáng](review-shots/2026-11-18/W2-24-after-light.png) · [Tối](review-shots/2026-11-18/W2-24-after-dark.png).

### F-066 · W2-25 · Icon Topics thiếu tương phản ở theme tối

- P3 · Mở sidebar tối với màu Loại Topics là indigo. Đo foreground so với nền sidebar được 1,37:1. Đạt khi icon không dưới 3:1. [Ảnh audit](review-shots/2026-11-18/07-thuoc-tinh-xem-dark.png).
- **fixed (commit W2-25)**. Trong theme tối, màu biểu tượng lấy từ màu Loại và màu chữ sidebar đã có. Playwright Chromium đo cùng cấu hình indigo từ 1,37:1 lên 7,28:1. Native vi 1440×900 [sáng](review-shots/2026-11-18/W2-25-after-light.png) · [tối](review-shots/2026-11-18/W2-25-after-dark.png).

## Đợt 3

### F-067 · W3-01 · Nút AI nổi

- P2 · Nút tròn AI ở góc dưới phải đè lên nút "Ôn ngay" của panel Thuộc tính. Ảnh đối chiếu: W2-18-after-1440-light.
- Đạt khi: Nút nổi không bao giờ che điều khiển: ẩn hoặc dời khi panel phải mở/khi chồng lên vùng có nút; kiểm 1440×900 và 1024×700.

### F-068 · W3-02 · Ngày tháng

- P2 · Vẫn 4 kiểu: danh sách "ngày 18 tháng 11, 2026", ví dụ trong Cài đặt "11 tháng 5 năm 2026", Thuộc tính "18/11/2026", tổng kết phiên "15:41 ngày 26 thg 11, 2026" (tiếp F-059). Ảnh đối chiếu: 10, 17b, W2-18-after, W2-13-after.
- Đạt khi: Ví dụ trong Cài đặt khớp đúng chuỗi app hiển thị; danh sách, tổng kết phiên, nút ôn dùng cùng formatter; ngày có giờ cùng một mẫu. Giá trị lưu giữ ISO.

### F-069 · W3-03 · Command Palette

- P2 · Lệnh còn tiếng Anh: "Start Review Session", "Copy File Path", "Toggle Table of Contents". Ảnh đối chiếu: 11b.
- Đạt khi: Grep toàn bộ đăng ký lệnh, mọi nhãn qua catalog; test quét không còn nhãn lệnh cứng.
