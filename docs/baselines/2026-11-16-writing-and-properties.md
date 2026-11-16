# Viết ghi chú và điều khiển học trong Thuộc tính

Đợt này thay thế hàng Ghi chú / Gợi nhớ / Ôn tập sau khi người dùng phản hồi rằng các mục trộn nội dung và hành động. Ghi chú thường và ghi chú bật học mở vào bài viết. Properties giữ công tắc opt-in, Add/Edit mnemonic và Study mở trực tiếp phiên ôn. Khi sửa gợi nhớ, editor hiện tên phần và Back to note. Luồng Legacy giữ giao diện cũ.

Properties dùng NoteLearningPanel ở chế độ compact, cùng Button shadcn, Phosphor và token Tolaria. Conversion, recovery, trạng thái lỗi và lịch sử vẫn có điểm vào. Cầu nối noteMemoryEditorActions đăng ký editor theo Library/path, dọn đăng ký theo handler identity và gọi pipeline flush/chuyển mặt hiện có. Layout kiểm tra identity sau khi flush để ngăn yêu cầu cũ đổi ghi chú mới. Lỗi lưu giữ mặt hiện tại. Quay lại khôi phục focus về nút trong Properties.

Sidebar và danh sách ghi chú dùng app-scrollbar. Thanh native mảnh lấy màu text-secondary, nền trong suốt. Fallback WebKit 6px được giới hạn qua feature query. prefers-contrast more dùng độ rộng auto và text-primary. Forced colors trả về màu hệ thống. Không đổi thiết lập macOS. Tên dài vẫn ellipsis và có tooltip khi hover/focus.

## Bằng chứng phát triển

- RED trước sửa xác nhận ghi chú bật học vẫn có tablist. RED của Properties xác nhận thiếu chế độ compact và nút sửa gợi nhớ.
- 64 unit test liên quan đạt, gồm lỗi lưu, đổi note trong lúc flush, cô lập Library và cleanup đăng ký, Inspector và Properties actions.
- Layout browser matrix đạt ở cửa sổ hẹp, mức zoom, theme, locale, pointer coarse, reduced motion và tương phản. Ca scrollbar đạt 220/250/400px, chọn thư mục, tooltip, cuộn tới cuối và kiểm tra hai cột ở các chế độ màu.
- Kiểu cuộn có tỷ lệ tương phản thumb/nền 4,14–8,36 trên theme sáng/tối.
- Hai lỗi khi đổi test được sửa ở test entry point. Sau reload phải mở Properties. Nút Study phải tìm trong region Note memory vì sidebar có cùng accessible name.
- Các kiểm thử không thay hợp đồng Markdown, lịch ôn, binding hay định dạng backup.

## Phân tích và bản dịch

Codacy CLI 0.24.0 so với 2e8afdef chạy ESLint9, Opengrep, Lizard, Stylelint, Trivy và Jackson. ESLint 0, Opengrep 4 Medium so với 5, Lizard 16 Medium so với 17. Stylelint giữ nguyên 127 Minor của CSS có sẵn. CSS mới không thêm finding. Jackson/Trivy 0. Cảnh báo mới về cập nhật ref trong render đã sửa bằng useLayoutEffect. Lizard của layout tăng 73 lên 75 do guard identity, đã xem xét. Trivy retry tuần tự đạt sau lỗi analyzer tạm thời. Không có Critical/High mới.

CodeScene: not run (optional integration unavailable). Hai khóa mới được dịch trực tiếp sang đủ 18 catalog vì Lara chưa được cấu hình. pnpm l10n:validate đạt 1010 khóa. Tiếng Việt sidebar dùng Ôn tập, công tắc dùng Ôn tập ghi chú này. Telemetry giữ các event bật học, sửa gợi nhớ và yêu cầu Study hiện có, metadata không chứa nội dung. Thanh cuộn là sửa hiển thị nên không thêm event. Không dependency, schema hoặc ADR mới. Tài liệu ABSTRACTIONS, hướng dẫn ghi nhớ, protocol người học mới và CURRENT-STATE được cập nhật.

Nghiệm thu với năm người mới và bộ cài production vẫn cần thực hiện trong phạm vi kế hoạch sản phẩm trước đó.
