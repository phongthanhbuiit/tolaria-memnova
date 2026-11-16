# Danh sách học động và kiểm tra app đóng gói

Bắt đầu từ `a9b1da1b` ngày 16/11/2026. Lượt này tiếp tục đợt 4 và nghiệm thu đóng gói trong [kế hoạch hiện tại](../CURRENT-STATE.md).

## Thay đổi

Trong danh sách học có hơn 50 hàng, thao tác End hoặc Tab có thể phải chờ hàng đích được mount. Trước sửa, pending focus lưu index. Khi danh sách đổi thứ tự hoặc hàng đích bị xoá, index đó có thể trỏ sang một note khác và giành focus.

Pending focus và danh sách button đã mount giờ dùng page ID. Sau khi dữ liệu đổi, app tìm vị trí mới của cùng note để cuộn. Yêu cầu cũ được huỷ nếu note biến mất, không còn khả dụng hoặc người dùng chuyển focus sang điều khiển ngoài danh sách.

Bài thử với 5 người mới đã có [kịch bản, đoạn đọc, phiếu ghi và tiêu chí chọn nhánh tiếp theo](../MEMNOVA-FIRST-LEARNER-TRIAL.md). Các ô kết quả để trống tới khi có người tham gia. Người dùng đã yêu cầu bỏ VoiceOver trong lượt này.

## Kiểm chứng tập trung

- Hai hồi quy đã RED trước sửa, gồm reorder khi đang chờ focus và thay thế hàng đích đã xoá bằng note khác.
- 15 unit test đạt, gồm kích thước 0/1/50/51/1.000, note unavailable, reorder, remove, đổi availability và rời danh sách.
- Chromium đạt 2/2 ca không retry. Danh sách 1.000 note giữ giới hạn DOM và đi đúng Home/End/Shift+Tab. Ca layout còn kiểm tra coarse targets tối thiểu 44px, tương phản 4,5, sáng/tối và reduced motion.
- ESLint và TypeScript đạt ở lượt tập trung. Codacy CLI 0.24.0 chạy local ESLint9, Opengrep, Trivy và Lizard trên file code sửa. Ba analyzer đầu báo 0. Lizard báo một Medium về độ phức tạp renderRow, baseline 18 và bản sửa 22 với ngưỡng 15. Đã rà các nhánh theo ID, availability và huỷ focus, giữ chúng cùng ref callback để quản lý mount/unmount. Không có Critical/High hay analyzer error, CLI trả 1 do Medium.
- CodeScene: not run (optional integration unavailable). Localization: no UI copy changes. PostHog không cần event vì sửa hành vi điều hướng đang có. ADR mới không có, schema và scheduler không thay đổi.

## App đóng gói trên macOS

Bản QA dùng định danh `net.memnova.qa.packaged`, preferences và Library riêng trong `/tmp/memnova-packaged-qw__oh94`. WKWebView mở `tauri://localhost` bằng frontendDist đã nhúng. Bản đầu từ `a9b1da1b` kiểm tra chuột tạo note, gõ/lưu, chọn đoạn, lưu trích đoạn và giữ nguồn/vùng chọn, Mở ghi chú, bật học, thêm gợi nhớ, Study, reveal và Easy.

Tiếp tục Home → Advanced → tạo và xác minh backup → restore sang thư mục mới → mở ghi chú vừa phục hồi. Lịch note mới có 1 review và hạn tiếp theo đúng ngày 24/11. So sánh 9 file và các bảng pages, cards, schedules, reviews, sessions, bindings và operations cho kết quả giống nhau. Hai cơ sở dữ liệu có 2 reviews và 2 schedules, gồm dữ liệu có sẵn trong bản sao. `integrity_check` trả ok và `foreign_key_check` rỗng. Tám test Rust note_backup_tests cũng đạt.

Bản copy QA ký ad hoc cục bộ, `codesign --verify --deep --strict` đạt sau khi ký. Đây là artifact debug để nghiệm thu, chưa có notarization hay cập nhật bản phát hành công khai. Ảnh native được xem qua CUA khi mở note đã restore.

Bản cuối từ `bdc6beed` được build lại tại `/tmp/memnova-packaged-qw__oh94/Final Memnova Packaged QA.app`. SHA-256 binary là `298137cfe5dc91c2b64b8d7d6dd3697400efe34a901428f9a588fd4244c09737`. Ký ad hoc và kiểm tra deep/strict đạt. Native vẫn ở `tauri://localhost`. Với 62 mục học, chuột mở phiên 0/61 rồi Close, Tab vào danh sách, End tới Focus 59, ArrowUp tới Focus 58, Home trở lại đầu và End+Tab ra khỏi danh sách đều đạt. App QA đã dừng, thư mục demo sạch.

## Gate phát hành

Normal pre-commit đạt lint, types và 66 test liên quan. Frontend đầy đủ của bản sửa focus đạt 489 file, 4.912 test, 87,38% line coverage. Sau bổ sung hồi quy Quick Open, lượt cuối đạt 4.913 test, vẫn 87,38% lines. Chạy lại cargo test đạt 1.240 unit test, 1 doc test và 3 ignored. cargo llvm-cov với ngưỡng 85 đạt 86,39% lines.

## Lỗi Quick Open phát hiện trong gate

Lượt push đầu dừng ở ca chuyển sang Note B bằng Quick Open trong lúc xoá note khác. Ca gốc tái hiện cùng lỗi trên `a9b1da1b` và bản sửa focus. Theo dõi sự kiện xác nhận Enter tới window, nhưng listener dùng kết quả từ commit trước vì subscription cập nhật ở passive effect.

Hồi quy dispatch Enter sau khi kết quả mới đã commit và trước passive effects đã RED vì mở nhầm kết quả trước đó. Subscription bàn phím của Quick Open đổi sang layout effect để nhận ngay kết quả tương ứng với DOM. Ca hồi quy và 15 unit test đạt. Spec xoá gốc giữ nguyên byte, đạt 2/2 không retry sau sửa.

Bản sửa Quick Open ở `a50dc0eb`. Normal pre-commit đạt 64 test liên quan, lint và types. Ba ca smoke tập trung về xoá note và tạo note qua Quick Open đạt không retry. Codacy trên QuickOpenPalette báo ESLint9/Opengrep/Trivy 0, một Lizard Medium về độ dài 53 dòng giống baseline. Không có Critical/High hay lỗi analyzer. Localization không có copy mới và PostHog không cần event cho sửa bàn phím đang có.

Artifact QA cuối được build lại từ `a50dc0eb`, cùng đường dẫn .app trên. SHA-256 binary `c4bcae42e12ffd4eab2410dd63938514f5682118564457c6b7147e68fb1f132c`. Native Cmd+P → gõ “Packaged learning check” → Enter ngay sau khi nhập mở đúng `packaged-learning-check.md`, heading và đoạn văn khớp. URL vẫn là `tauri://localhost`, ký ad hoc deep/strict đạt. App dừng sau kiểm tra.

Normal push mã nguồn lên main đạt, core smoke 54/54 trong 4,8 phút. Hook hoàn thành trong 8 phút 52 giây. Repo được kiểm tra sạch ở thư mục demo. Biên bản và bài thử được đưa lên qua lane docs-only sau mã nguồn.
