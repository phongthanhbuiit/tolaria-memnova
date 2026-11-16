# Hoàn thiện nhãn ôn và thanh cuộn Thuộc tính

Đợt này hoàn tất hai mục rà soát sau a316fc4c. NoteLearningPanel dùng nhãn Review this note / Ôn ghi chú này cho thao tác mở phiên ôn của trang đang xem. Khóa learning.noteMemory.studyThisNote được dịch trực tiếp vào 18 catalog.

Inspector áp dụng app-scrollbar trên chính vùng cuộn hiện có. Sidebar, danh sách và Properties chia sẻ scrollbar-width thin, token màu, fallback WKWebView, prefers-contrast và forced-colors. Button shadcn và icon Play Phosphor hiện có tiếp tục cung cấp thao tác ôn.

## Kiểm chứng phát triển

- Regression nhãn mới RED 1/8 rồi GREEN. 49 unit test panel/Inspector đạt.
- Ba integration ghi chú thường và bật/sửa/ôn/tạm dừng đạt không retry trong 23,6 giây. Ca bật học kiểm tra trực tiếp vùng cuộn Properties có thin mặc định và auto khi prefers-contrast more.
- Validation đạt 18 catalog, 1011 khóa. Bản dịch trực tiếp vì Lara chưa cấu hình.
- PostHog không cần event mới cho sửa nhãn và kiểu cuộn. Luồng mở phiên vẫn dùng requestStudy hiện có, giữ scope ghi chú và pipeline lưu.
- Không dependency, schema, ADR hoặc abstraction mới. CURRENT-STATE được cập nhật cùng ảnh và biên bản.
- CodeScene: not run (optional integration unavailable).

Đợt trước đã nghiệm thu dữ liệu, focus và luồng học trên native. Lượt này kiểm tra lại nhãn và ba thanh cuộn trên cùng app QA cô lập. Thử năm người mới và nghiệm thu bộ cài production vẫn cần thực hiện.


## Native và phân tích tĩnh

Bản QA đóng gói chạy tauri://localhost, identifier và preferences riêng. AppleShowScrollBars=Always. Đã bấm Ôn ghi chú này, mở đáp án đúng nội dung gợi nhớ, đóng phiên và kiểm tra focus trở về chính nút đó. Sidebar và danh sách cuộn tới mục cuối. Kéo thumb Properties tới Information cuối panel. Ba thanh có cùng độ dày mảnh.

Nội dung ghi chú khớp từng byte với snapshot bật học trước đó. SQLite integrity_check ok và foreign_key_check rỗng. Demo sạch. App QA đã dừng. Hai ảnh PNG gốc được xem lại trực quan.

[Thao tác ôn](ui/2026-11-16-properties-polish/review-action.png) và [ba cột cuộn](ui/2026-11-16-properties-polish/three-column-scrollbars.png).

Codacy CLI 0.24.0 chạy ESLint9, Opengrep, Lizard, Stylelint, Jackson và Trivy so với a316fc4c. Không finding mới hoặc analyzer error. ESLint/Jackson/Trivy 0, Opengrep 1, Lizard 2, Stylelint 127 giống baseline. Không Critical/High mới. Bằng chứng ở /tmp/memnova-writing-polish-*. Không refactor cần thiết.

Bản QA có source khớp `e23d721d`, binary SHA-256 `58b6af9e246d22bda146ab9c204265b3e6d229c03f6f401b7b249ac7d41220df`. Pre-commit bình thường đạt lint/types, 490 file / 4921 test, 15 integration trong 1,5 phút và validation locale. Cargo test đạt 1240 unit, 3 ignored, cùng các test khác trong workspace. Cargo llvm-cov --no-clean --fail-under-lines 85 đạt 86,39% lines. Demo sạch.

Normal push `e23d721d` thành công sau hook 8 phút 40 giây. pnpm test:coverage đạt 4921 test và 87,40% lines. Build, lint, types và workflow checks đạt. Core smoke 54/54, thời gian Playwright hiển thị 5,0 phút. CodeScene không chạy do tích hợp tùy chọn chưa cấu hình. Ảnh và tài liệu được push tiếp qua lane docs-only.
