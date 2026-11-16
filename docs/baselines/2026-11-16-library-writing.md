# Thư viện: tìm bài để học và viết ghi chú thường

Từ Trang chủ, **Tất cả ghi chú** mở lại danh sách Markdown; **Ghi chú mới** mở editor kể cả khi màn học đang chiếm trọn cửa sổ. Từ editor chưa mở tệp nào, có thể bấm **Ghi chú mới** hoặc **Mở ghi chú**. Cmd+N và Quick Open dùng cùng luồng ghi tệp thường.

Danh sách học tìm theo tiêu đề và đường dẫn trong thư mục đang chọn. Hai bài trùng tên có đường dẫn riêng. Nút ôn đếm các ghi chú đến hạn khớp với phạm vi đã chọn. Khi không có ghi chú học, các bộ lọc không xuất hiện. Tiến độ và **Nâng cao** nằm trước danh sách; có thể mở sao lưu và phục hồi mà không cần cuộn qua hàng nghìn bài. Thao tác duyệt và lọc không bật học hàng loạt.

## Cơ sở thiết kế

Ba phần được rà riêng: màn học khi nhiều tệp, việc ghi chép hằng ngày, và thiết kế/QA native. Theo [redesign-existing-projects của Open Design](https://github.com/nexu-io/open-design/blob/beacaae6e1222c4f76ed88c8c1aedd49f55a8f6d/skills/redesign-skill/SKILL.md), giữ hệ thống giao diện hiện hữu và sửa những trạng thái thiếu đường đi tiếp. Các hàng phẳng dùng token Tolaria, tiêu đề nổi hơn đường dẫn, điều khiển dùng Button, Input, Select, Switch và Label chung. Tìm kiếm có nhãn thật; xóa truy vấn trả focus về ô nhập.

## Nghiệm thu

- Playwright: danh sách 1.000 ghi chú giới hạn số hàng được gắn vào DOM; tìm tệp thứ 974; lọc đến hạn, xóa bộ lọc, đi đầu/cuối danh sách bằng bàn phím, và khôi phục focus sau khi đóng hộp thoại. Ma trận hồi quy gồm 486 tổ hợp bề mặt, kích thước, zoom, theme và ngôn ngữ.
- Tauri/macOS tiếng Việt, Thư viện và preferences dùng riêng: tìm `Vật lý/` thu hẹp 4 ghi chú đến hạn xuống 2, có bài trùng tên cùng môn khác. Phiên ôn mở đúng 0/2 và đóng trả focus về nút ôn. Không tìm thấy: vô hiệu nút ôn; xóa truy vấn trả focus về ô tìm. Mở được toàn bộ ghi chú, ghi chú mới và Quick Open qua chuột/bàn phím.
- Bản dịch: hai khóa mới được dịch trực tiếp, không dùng Lara Cloud; validator kiểm tra 18 catalog, 1.013 khóa. PostHog: `note_created` thêm nguồn `library` và `empty_editor`; `memnova_library_due_filter_changed` chỉ ghi trạng thái bật/tắt, không thu từ khóa, tiêu đề hay đường dẫn.
- Rust không đổi. Test release: 1.240 unit đạt, 3 ignored; ca integration cũng đạt. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85`: 86,40% dòng. Các hook Git hoạt động; CodeScene: not run (optional integration unavailable). Không thêm dependency, thay đổi schema hay ADR.

Ảnh native cuối, app debug Tauri/macOS tiếng Việt, thư viện thử có 85 ghi chú trước khi tạo: [Trang chủ](ui/2026-11-16-library-writing/home.png), [danh sách đã lọc](ui/2026-11-16-library-writing/filter.png), [editor trống](ui/2026-11-16-library-writing/empty.png), [ghi chú đã lưu](ui/2026-11-16-library-writing/writing.png).
