# Một hàng điều hướng cho ghi chú học

Bắt đầu từ `900e8b7a` ngày 16/11/2026. Người dùng chỉ ra hai tầng Content/Memorization rồi Article/Mnemonic khiến họ không hiểu các lựa chọn.

## Kết quả giao diện

Ghi chú học có một hàng **Ghi chú · Gợi nhớ · Ôn tập**, tiếng Anh **Note · Memory cue · Study**. Khi chưa có gợi nhớ, nút thêm gợi nhớ ở cạnh hàng tab. Trong phần Ôn tập, dùng hành động thêm gợi nhớ của panel. Ghi chú thường không có hàng điều hướng. Khi tạm dừng học nhưng còn gợi nhớ, hai phần văn bản vẫn mở được.

Tab dùng shadcn, kích hoạt bằng Enter/Space sau khi di chuyển focus bằng mũi tên. Lựa chọn có thể lưu nội dung nên chuyển focus không tự đổi phần đang sửa. Hàng tab cuộn ngang ở editor hẹp. Vạch dưới hiển thị phần đã chọn bằng đường viền hỗ trợ forced colors. Luồng legacy giữ nhãn và cách kích hoạt cũ.

## Kiểm tra

- Hồi quy một tablist duy nhất đã RED trước sửa. 11 unit test tập trung đạt, cùng TypeScript và ESLint.
- Ba ca Chromium không retry đạt, gồm bật học, thêm và sửa gợi nhớ, lưu, học, tạm dừng; một hàng ở 160/200/480px trong en/vi/de; coarse targets, sáng/tối, tương phản, reduced motion và bàn phím.
- Hai ca Undo/Redo với đổi note, đổi mặt và raw mode đạt 2/2 khi source ổn định. Lượt đầu có lỗi render Virtuoso ở danh sách ghi chú trong lúc source còn thay đổi. Lượt sau đạt cả hai ca, giữ các assertion dữ liệu.
- Native app đóng gói mở `tauri://localhost`, Library và preferences riêng tại `/tmp/memnova-tabs-qa-20xkglvg`. Đổi Ghi chú/Gợi nhớ ngay sau khi thêm ARTICLE_VERIFIED, thêm MNEMONIC_VERIFIED và Cmd+S giữ cả hai marker đúng mặt trên đĩa. Tiêu đề, nguồn và gợi nhớ cũ còn nguyên. Ôn tập → Học → Đóng quay lại đúng phần và focus. Tắt học còn hai tab, ghi chú thường không có tab. SQLite integrity ok, foreign keys rỗng, hai review cũ giữ nguyên.
- [Ảnh đang bật học](ui/2026-11-16-single-note-navigation/enabled.png), [đã tạm dừng](ui/2026-11-16-single-note-navigation/paused.png), [ghi chú thường](ui/2026-11-16-single-note-navigation/ordinary.png).

Ba nhãn mới được dịch trực tiếp vào 18 catalog vì Lara chưa cấu hình. `pnpm l10n:validate` đạt 1.008 khóa. Không cần sự kiện PostHog mới vì đây là sửa cách trình bày cùng các hành động hiện có. Không có schema, dependency hay ADR mới. Cập nhật Architecture, Abstractions, guide và Current State cùng đợt. CodeScene: not run (optional integration unavailable).

## Cổng chất lượng và giới hạn

Normal pre-commit của `dbd3ee1c` đạt lint, types, 4.913 frontend test và kiểm tra bản dịch. Lượt integration có một ca flaky vì test nhấn Enter trước khi focus mũi tên của Radix đến tab đích. Đã thêm assertion chờ focus trước Enter, giữ assertion kích hoạt và chạy hai ca liên quan ba lần đạt 6/6 không retry. Hành vi legacy được giữ automatic, note-memory dùng manual.

Codacy CLI 0.24.0 chạy local ESLint9, Opengrep, Trivy và Lizard. ESLint/Trivy báo 0. Opengrep có hai cảnh báo props-spread, một sẵn có và một mới để chỉ ghi đè aria-labelledby khi cần, giữ nhãn mặc định của primitive cho legacy. Lizard có bảy Medium so với sáu baseline. Cảnh báo mới về số tham số component navigation được rà theo typed props dùng trong cùng hàng điều hướng. Hai hàm/layout đã vượt ngưỡng độ dài/độ phức tạp từ baseline, metric layout tăng theo điều kiện hiển thị. Không có Critical/High hoặc analyzer error. CLI trả 1 vì các cảnh báo.

Bản đóng gói cuối chứa code `dbd3ee1c` và sửa activationMode có trong `f4a600ce`. Binary SHA-256 `75affd6c0a3c10fe84b932c866ed3165fa42d91ce82538b7545c52371020604c`, ký ad hoc local và xác minh strict đạt. Missing-cue được kiểm tra một nút Thêm gợi nhớ trên cả phần Ghi chú và Ôn tập. Ảnh enabled/ordinary trong biên bản được thay bằng PNG gốc từ build cuối. App QA đã dừng.

Lượt pre-push trên mã cuối đạt frontend 489 file, 4.913 test, line coverage 87,37%. Chạy lại cargo test đạt 1.240 unit test và 1 doc test, 3 ignored. cargo llvm-cov với ngưỡng 85 đạt 86,39% lines.

Normal push main thành công ở `f4a600ce`. Core smoke đạt 54/54 trong 4,7 phút, hook 8 phút 41 giây. Demo vault sạch. Biên bản và ảnh được push riêng theo lane docs-only.
