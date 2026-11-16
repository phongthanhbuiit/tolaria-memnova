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


## Nghiệm thu native tại 5281fd90

App debug đóng gói chạy tauri://localhost với identifier và preferences QA riêng, ký ad hoc xác minh đạt. Thư viện thử riêng có 30 thư mục dài và nhiều ghi chú. Cấu hình macOS AppleShowScrollBars=Always được giữ để quan sát trực tiếp thanh native.

- Ghi chú thường mở với bytes ban đầu nguyên vẹn, không tab học. Bật học trong Properties là thao tác rõ ràng.
- Ghi chú mới thêm gợi nhớ, paste và Cmd+S cập nhật ngay Edit mnemonic và Study trong Properties đang mở. Lỗi summary cũ phát hiện ở lượt native đầu đã được sửa bằng refresh sau receipt nội dung, với regression RED→GREEN.
- Mouse Back to note giữ bài viết và focus Edit mnemonic. Study mở trực tiếp, Show mnemonic có nội dung vừa lưu, Close trả focus Study. Tạm dừng bỏ Study, giữ nội dung và sửa được gợi nhớ. Keyboard Return trả focus đúng.
- Kéo sidebar 250→220px, cuộn tới thư mục cuối và ghi chú cuối. Hai cột dùng thanh mảnh, không có cuộn ngang.
- Markdown sau tạm dừng khớp snapshot đã bật, chỉ thay enabled true thành false. SQLite integrity_check=ok, foreign_key_check rỗng. App QA đã dừng, demo sạch.
- Ảnh gốc được lưu bằng CUA, đã xem lại trực quan.

| Trạng thái | Ảnh native |
|---|---|
| Ghi chú thường | [ordinary](ui/2026-11-16-writing-first/ordinary.png) |
| Đang bật học trong Properties | [enabled](ui/2026-11-16-writing-first/enabled.png) |
| Sửa gợi nhớ và quay lại | [mnemonic](ui/2026-11-16-writing-first/mnemonic.png) |
| Phiên ôn | [study](ui/2026-11-16-writing-first/study.png) |
| Tạm dừng | [paused](ui/2026-11-16-writing-first/paused.png) |
| Sidebar 220px và cuộn cuối | [scroll](ui/2026-11-16-writing-first/scroll-220.png) |

Pre-commit bình thường đạt lint/types, 490 file / 4921 test frontend, 18 integration trong 1,8 phút và validation locale. Ca hook/persistence bổ sung đạt 29/29. Cargo test đạt 1240 unit, 3 ignored, và các test khác của workspace. Cargo llvm-cov --no-clean --fail-under-lines 85 đạt 86,39% lines. Một lượt cargo test ban đầu lỗi crate doctest trong lúc QA rebuild cùng target, lượt tuần tự sau đạt.

Codacy bổ sung quét hook mới, layout và Properties. Hook không có finding. ESLint 0, Opengrep 1 so với 2 baseline, Lizard 6 so với 6, Trivy retry đạt 0 và không analyzer error. Không Critical/High mới. Bằng chứng scan nằm ngoài source tại /tmp/memnova-writing-first-receipt-*.

Normal push `5281fd90` lên main thành công sau hook 8 phút 49 giây. pnpm test:coverage đạt 490 file / 4921 test và 87,40% line coverage. Build, lint, types, workflow checks đạt. Core smoke 54/54 trong 4,9 phút. CodeScene không chạy vì tích hợp tùy chọn chưa cấu hình. Demo-vault và demo-vault-v2 sạch. Biên bản và sáu ảnh native được đẩy qua lane docs-only sau commit mã nguồn.
