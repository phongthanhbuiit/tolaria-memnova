# Sidebar vừa khung khi tên thư mục dài

Người dùng gửi ảnh thanh cuộn ngang phía dưới sidebar ngày 16/11/2026. Nguyên nhân tái hiện ở hàng thư mục. Button là flex item với min-width mặc định theo nội dung, nên nhãn dài không được co lại để ellipsis có hiệu lực.

Mã sửa ở `f01d44f6` đặt min-width bằng 0 trên hàng/button và cho nhãn chiếm phần còn lại bằng flex. Sidebar tiếp tục dùng vùng cuộn dọc hiện có. Tooltip shadcn hiển thị đầy đủ đường dẫn khi hover hoặc focus; chuỗi tên trong DOM giữ nguyên. Tooltip chỉ lặp lại tên được ẩn khỏi accessibility tree để tránh đọc lặp.

## Kiểm chứng

- Ca Chromium trước sửa đo nội dung sidebar rộng hơn khung 788px và RED. Sau sửa, cùng ca đạt ở 220/250/400px với scrollWidth bằng clientWidth trong sai số 1px.
- Ca kiểm tra còn xác nhận nhãn ellipsis, accessible name đầy đủ, chọn thư mục, Tab tới thư mục và tooltip, Escape đóng tooltip, cuộn dọc xuống thư mục cuối.
- 105 test thư mục/sidebar tập trung đạt. Normal pre-commit đạt lint/types, 165 test liên quan và ca Chromium 1/1.
- Codacy CLI 0.24.0 chạy cục bộ ESLint9, Opengrep, Trivy và Lizard trên file code sửa. Ba analyzer đầu báo 0. Hai cảnh báo Medium về số tham số giống baseline. Không Critical/High hoặc analyzer error, CLI trả 1 vì Medium.
- CodeScene: not run (optional integration unavailable). Localization: no UI copy changes. PostHog không cần event mới vì sửa layout/hành vi hiển thị hiện có. Không có ADR, schema hoặc dependency mới.

## Native macOS

App QA đóng gói có runtime khớp `f01d44f6`, URL `tauri://localhost`, ký ad hoc xác minh đạt. Dùng Library/preferences riêng tại `/tmp/memnova-folder-qa-k4lzu_nt`, root tên UUID dài và 22 thư mục con cùng một thư mục lồng. Kéo sidebar từ 250 xuống 220px, tên rút gọn và thanh cuộn ngang biến mất. Cuộn dọc tới thư mục cuối, click thư mục lồng và Tab để hiện tooltip đều đạt. App đã dừng và demo sạch.

[Ảnh sidebar 220px](ui/2026-11-16-sidebar-folder-overflow/sidebar.png) và [tooltip bàn phím](ui/2026-11-16-sidebar-folder-overflow/tooltip.png) là PNG gốc từ native QA.

Lượt frontend đầy đủ đạt 489 file, 4.913 test và 87,37% line coverage. Chạy lại cargo test đạt 1.240 unit test và 1 doc test, 3 ignored. cargo llvm-cov với ngưỡng 85 đạt 86,39% lines.

Normal push mã nguồn main thành công ở `f01d44f6`. Core smoke đạt 54/54 trong 4,8 phút, hook 9 phút 4 giây. Demo sạch. Biên bản và ảnh được push qua lane docs-only sau mã nguồn.
