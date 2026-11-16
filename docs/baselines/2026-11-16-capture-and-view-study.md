# Lưu trích đoạn và ôn Saved View

Bắt đầu từ `5e140f83` trên main ngày 16/11/2026. Người dùng yêu cầu thực hiện kế hoạch sau khi đã đối chiếu giao diện mới.

## Phạm vi được chọn

Sửa nhãn gỡ thư viện khỏi danh sách, lưu trích đoạn kèm nguồn và mở phiên ôn từ kết quả Saved View. Mỗi ghi chú mới vẫn bắt đầu là ghi chú thường. Nguồn nội dung, pipeline ghi file và scheduler dùng cơ chế hiện có.

Buổi thử với 5 người dùng mới cần người tham gia thực tế. Tiêu chí là 4/5 người tự viết ghi chú, thêm gợi nhớ và chấm lượt đầu trong 5 phút. Nhánh PDF, extension trình duyệt và xuất backup có mật khẩu phụ thuộc kết quả đó.

## Kiểm chứng

## Kết quả hành vi

- Lưu đoạn chọn qua thanh định dạng hoặc nhập văn bản + URL từ bảng lệnh. Ghi chú mới giữ nguồn trong Markdown và bắt đầu ở trạng thái thường. Save giữ vùng chọn ở nguồn, thông báo có Mở ghi chú. Cancel không tạo file, lỗi giữ draft. Cùng một lượt thử lại dùng đường dẫn ổn định và kiểm tra nội dung khi file đã tồn tại.
- Saved View có bộ lọc Đến hạn tạm theo view và nút ôn số ghi chú sẵn sàng trong Library hiện tại. Bắt đầu phiên lưu editor, làm mới lịch rồi tính lại giao của phạm vi view với ghi chú đến hạn. Lỗi refresh cho phép thử lại, rời view loại bỏ scope cũ, pending chặn bấm lặp.
- Gỡ thư viện dùng nhãn rõ ràng trên Cài đặt, thanh trạng thái, bảng lệnh và fallback menu native. Hướng dẫn backup nêu quyền truy cập bản sao.

## QA và giới hạn

- Native macOS debug, định danh `net.memnova.qa.capture`, webview incognito, thư viện `/tmp/memnova-capture-native.4pyncpdi/Library` và preferences riêng. Dùng chuột chọn đoạn, mở toolbar, lưu, kiểm tra còn nguồn/vùng chọn rồi Mở ghi chú mới. So sánh file nguồn với bản trước bằng `cmp` đạt. [Ảnh sau Save](ui/2026-11-16-capture-study/capture-native.png).
- Bật học trên ghi chú vừa lưu, thêm mnemonic bằng editor native, Cmd+S, vào Saved View, bật Due, ôn đúng 1 note, reveal, Good, Close. Due về 0 và focus về nút ôn. Shift+Tab rồi Space tắt lọc, danh sách đầy đủ trở lại. [Ảnh sau grade](ui/2026-11-16-capture-study/study-native.png).
- SQLite native `integrity_check` trả `ok`, foreign_key_check rỗng, 1 review đã lưu. Browser capture đạt 2/2 trên file thật. Saved View sau refactor đạt 1/1, gồm lỗi refresh/Retry và xác minh các Markdown gốc nguyên byte. Pre-commit chạy lại cả 3 ca.
- Các probe/ảnh native dùng thư viện tổng hợp, debug với Vite. Bộ cài production, VoiceOver và thử nghiệm với 5 người dùng mới chưa thực hiện trong đợt này. Các nhánh mở rộng phụ thuộc phản hồi người dùng vẫn là công việc sau.
- Codacy CLI 0.24.0 dùng auto-config/SARIF ngoài tracked source và chạy local ESLint9, Opengrep, Trivy, Lizard. Lượt đầu phát hiện App vượt ngưỡng Critical, đã tách `useWorkspaceStudyRequests` và quét lại. Lượt cuối có 10 advisory props-spread giống baseline và 18 cảnh báo Lizard Medium so với 17 baseline. Cảnh báo mới về độ dài hàm chứa form 52 dòng so với ngưỡng 50 được giữ để labels/validation/focus nằm cùng luồng. Các cảnh báo còn lại ở file/hàm đã vượt ngưỡng trước, một số metric tăng theo tính năng. Không phát hiện defect bảo mật mới từ Medium. Không Critical/High hoặc analyzer error ở lượt cuối. Baseline chạy lại sau khi cấu hình Git và danh sách file cho bản sao; các lượt không đọc được file bị loại khỏi bằng chứng.
- Localization dịch trực tiếp 18 catalog vì Lara chưa cấu hình, validator đạt 1.003 khóa. PostHog thêm `excerpt_captured` với `source_kind` và `memnova_saved_view_study_requested` với `due_count`. Nhãn gỡ thư viện không cần event riêng.
- Refactor tách yêu cầu ôn khỏi App để đáp ứng ngưỡng Codacy, dùng pipeline tạo note/session hiện có. ADR mới không cần cho thay đổi này. Architecture, Abstractions, Current State và guide đã cập nhật. Demo vault sạch.

- Hồi quy nhãn hộp thoại đã RED trước khi sửa, rồi 142 test Cài đặt/thanh trạng thái/bảng lệnh/i18n đạt. Lara chưa cấu hình trong môi trường, các khóa được dịch trực tiếp vào 18 catalog.
- Baseline learning trước tích hợp đạt 10/10 test ở NoteLearningPanel và useLearningLibrary.noteWorkspace.
- `cargo test --manifest-path src-tauri/Cargo.toml` đạt 1.240 unit tests và doc test. Ba test native bị ignore được báo riêng trong output.
- `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85` đạt **86,39% lines**.
- Codacy CLI 0.24.0 đã chạy ESLint9, Opengrep, Trivy và Lizard trên nhãn/menu/bảng lệnh. Chưa kết luận scan toàn bộ tính năng từ kết quả phần này.

CodeScene: not run (optional integration unavailable).


## Cổng phát hành

Mã tính năng ở `05ae7aa3`. Normal pre-commit đạt lint, types, 1.089 test liên quan, 3/3 ca tích hợp mới, 54/54 core smoke trong 4,7 phút và validator 18 catalog/1.003 khóa. Một lượt trước bị huỷ sau khi phát hiện shared mock ảnh hưởng fixture cũ, đã giới hạn mock vào riêng spec Saved View. Lượt khác thất bại/trở nên flaky lúc máy ngủ. Log macOS xác nhận hai lần sleep trùng ca lỗi. Ca roundtrip chạy riêng đạt 2/2 trên commit gốc và 2/2 trên mã mới, không retry. Giữ máy thức bằng tiến trình caffeinate chỉ trong các gate kế tiếp.

Normal pre-push đã đạt lint, TypeScript/Vite build và `pnpm test:coverage`: **488 file, 4.899 tests đạt, 87,37% lines**. Rust coverage riêng đã đạt 86,39%. Codacy CLI cuối exit 1 vì cảnh báo Medium, không có analyzer error. CodeScene before/after/project không đo được do optional integration unavailable.

Thư viện demo sạch. Các app/server QA sở hữu bởi task đã dừng sau kiểm tra. Normal `git push origin main` đã thành công, hook 8 phút. Core smoke đạt **54/54 trong 4,6 phút**, toàn bộ cổng trước push đạt. Remote xác nhận `05ae7aa3af813cf92f51527214e4e379a14631a3`. Receipt này cập nhật sau push mã nguồn qua lane docs-only bình thường. Tiến trình giữ máy thức tạm thời được dừng khi kết thúc.
