# R-11, R-13 và R-14 — Tiếng Việt và tên truy cập

18/11/2026. Baseline `e8e2b240`. Cổng an toàn xác nhận `main` đồng bộ với remote và 0 commit chờ push. Chạy Node 24.12.0. QA dùng Library và profile tạm.

## R-11 · Quét tên truy cập và nhãn tiếng Việt

Sửa `common.save` thành **Lưu** và tinh chỉnh tên nút Quick Open thành **Đóng cửa sổ mở nhanh**. Component Quick Open đã tra khóa catalog từ F-005. Test mở editor thuộc tính, kiểm nút Lưu, mở Quick Open và bấm nút đóng qua tên truy cập.

Spec `vietnamese-surface-labels.spec.ts` render app với browser locale `vi-VN`. Quét sidebar, danh sách, editor, Properties và editor thuộc tính, Home, hộp thoại chế độ xem, Quick Open, Command Palette, Settings, Search và AI workspace. So khớp nguyên chuỗi với `en.json` từ cây truy cập, văn bản, placeholder và title. Attachment ghi bề mặt, loại nhãn, các khóa en cùng giá trị và lý do nếu giữ tiếng Anh. Phép đối chiếu tính đúng giá trị hiển thị khi nhiều khóa dùng chung một chuỗi.

RED ghi 45 mục cần sửa, gồm “Save”, “Create View”, “Vault Safe”, tên listbox “Notes”, loại thuộc tính “Text” và lệnh “Reveal in Finder”. Sửa 103 giá trị có sẵn trong catalog vi cùng các call site để dùng khóa hiện có. Thêm khóa loại thuộc tính **Tags** và dịch đủ 18 catalog. Test GREEN trên Chromium và WebKit với `--retries=0`. Còn 15 mục khớp nguyên chuỗi thuộc tên Git, tiêu đề Markdown, giá trị và khóa thuộc tính, hoặc `sidebarLabel` của fixture. [RED từng bề mặt](evidence/I18N-A11Y-2-labels-before.json) · [Các kết quả khớp sau sửa](evidence/I18N-A11Y-2-labels-after.json).

## R-13 · Dictionary BlockNote theo locale

Dùng dictionary từ `@blocknote/core/locales` 0.46.2 ở editor và chế độ chỉ đọc. Các biến thể Tây Ban Nha và Bồ Đào Nha dùng chung dictionary ngôn ngữ tương ứng. `be-BY`, `be-Latn` và `id-ID` dùng fallback `en` vì package thiếu dictionary. Mỗi editor giữ bản sao dictionary riêng. Khi đổi locale, đồng bộ bản sao theo lần render đã commit và cập nhật giao diện với cùng editor và ProseMirror view. CSS lấy placeholder từ dictionary hiện hành vì BlockNote chụp chuỗi khi mount view. Không nhập dependency mới.

RED đổi app sang vi nhưng không tìm thấy “Thêm khối”. Regression GREEN **2/2 Chromium và 2/2 WebKit, retries=0**. Ca thật dùng Command Palette để đổi en → vi → id-ID, giữ kết quả chọn ký tự, nội dung, cùng DOM editor và bản nháp chưa ghi ra tệp. Undo xóa đúng phần vừa gõ, Redo phục hồi, placeholder đổi locale và nút BlockNote chuyển về tiếng Anh ở id-ID. Probe chặn write của fixture để kiểm tra nháp còn trong editor. [AX tiếng Anh trước sửa](evidence/R-13-native-AX.txt) · [Kiểm tra native sau sửa](evidence/I18N-A11Y-2-native-AX.txt).

## R-14 · Tên truy cập từng ô chọn trường

Nhãn **Trường lọc** dùng shared Label và `htmlFor` trỏ đến ID riêng của input mỗi hàng. Giá trị trường, query, listbox và các phím tương tác giữ đúng hợp đồng cũ. RED Testing Library không tìm thấy combobox theo tên vi. GREEN **21 ca** FilterBuilder/FilterFieldCombobox. Test hai điều kiện lồng nhau xác nhận cả hai label và khi sửa trường bằng Enter chỉ đổi hàng đích.

## QA, phạm vi và cổng phát hành

- Native debug WKWebView với bundle QA và thư viện tạm. Kiểm Quick Open bằng Cmd+P, menu BlockNote bằng chuột và hai hàng lọc bằng chuột rồi Down/Enter. Ảnh editor được chụp trong phiên CUA. Editor thuộc tính có nút Lưu được kiểm trên Chromium/WebKit vì chức năng thuộc tính phức hợp của Library native thử chưa sẵn sàng. [AX native](evidence/I18N-A11Y-2-native-AX.txt).
- Modern Web Guidance `accessibility` và `forms` yêu cầu liên kết label với input bằng `for` và `id`. ID React riêng theo từng hàng giúp label luôn trỏ đúng control khi có nhiều điều kiện hoặc group. RTL kiểm tên và liên kết, native kiểm phím Down/Enter ở hàng thứ hai.
- Ghi R-15 cho các chuỗi quan sát ngoài phép so khớp catalog như “Paragraph” của toolbar tùy biến và “Match all conditions” trong bộ lọc. Tên dữ liệu và khóa lưu trữ trong Library là dữ liệu người dùng. Phép quét đối chiếu chuỗi nguyên vẹn trong các bề mặt đã liệt kê.
- Rust: `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` đạt 1.241 unit và 1 integration, 3 ignored có sẵn. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1` đạt **86,41%** lines.
- Cả ba commit qua pre-commit thường. R-11 cập nhật selector kiểm ngày sang “Ngày” sau khi đổi catalog. Pre-commit R-13 chạy đủ **5.042 test trong 506 tệp**. Hook push chạy lint, TypeScript, build và toàn bộ test frontend với **87,84%** line coverage. Smoke curated **54/54 trong 4,7 phút**, không có lượt retry.
- Codacy CLI 0.24.0 (local) trên tệp mã app thay đổi, baseline → sau sửa **91 → 90**. ESLint9 và Trivy không báo lỗi. Một Critical sẵn có ở `EditorLayout` (81 tham số theo Lizard). Bản trung gian chạm ngưỡng Critical NLOC ở `SingleEditorView`. Sau điều chỉnh đã quét lại. SARIF cuối có **0 Critical/High mới**. Các cảnh báo Medium thay đổi số đo ở `Editor`, `FilterFieldCombobox` và `SingleEditorView` dưới ngưỡng Critical, do gắn dictionary/label trong luồng đang có. CLI trả 1 vì còn issue. Cả năm analyzer hoàn tất. Tệp test thuộc exclusions của Codacy, nên kiểm bằng lint, Vitest và Playwright.
- CodeScene: not run (optional integration unavailable). Số đếm SPEC §8 **1 → 1 / 0 → 0**. Dịch trực tiếp khóa mới vào cả 18 catalog vì không có Lara credentials. Validator **18 catalog, 1.102 khóa**, giữ placeholder và tên sản phẩm.
- PostHog không cần event mới cho nhãn và dictionary. Refactor phục vụ code health và ADR mới: không có. Cập nhật ABSTRACTIONS cho hook dictionary. Hai demo vault và fixture nguồn sạch. Khởi động debug đã chạy migration loại ghi chú trong bản sao native tạm, ví dụ `Is A: Project` → `type: Project`. Kiểm thử browser xác nhận không ghi bản nháp của ca đổi locale ra tệp.
