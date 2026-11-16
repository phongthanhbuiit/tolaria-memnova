# Hoàn thiện nhãn ôn và thanh cuộn Thuộc tính

Đợt này hoàn tất hai mục rà soát sau a316fc4c. NoteLearningPanel dùng nhãn Review this note / Ôn ghi chú này cho thao tác mở phiên ôn của trang đang xem. Khóa learning.noteMemory.studyThisNote được dịch trực tiếp vào 18 catalog. Nhãn Study dùng chung ở các màn hình khác giữ ý nghĩa của các điểm vào đó.

Inspector áp dụng app-scrollbar trên chính vùng cuộn hiện có. Sidebar, danh sách và Properties chia sẻ scrollbar-width thin, token màu, fallback WKWebView, prefers-contrast và forced-colors. Button shadcn và icon Play Phosphor hiện có tiếp tục cung cấp thao tác ôn.

## Kiểm chứng phát triển

- Regression nhãn mới RED 1/8 rồi GREEN. 49 unit test panel/Inspector đạt.
- Ba integration ghi chú thường và bật/sửa/ôn/tạm dừng đạt không retry trong 23,6 giây. Ca bật học kiểm tra trực tiếp vùng cuộn Properties có thin mặc định và auto khi prefers-contrast more.
- Validation đạt 18 catalog, 1011 khóa. Bản dịch trực tiếp vì Lara chưa cấu hình.
- PostHog không cần event mới cho sửa nhãn và kiểu cuộn. Luồng mở phiên vẫn dùng requestStudy hiện có, giữ scope ghi chú và pipeline lưu.
- Không dependency, schema, ADR hoặc abstraction mới. CURRENT-STATE được cập nhật cùng ảnh và biên bản.
- CodeScene: not run (optional integration unavailable).

Đợt trước đã nghiệm thu dữ liệu, focus và luồng học trên native. Lượt này kiểm tra lại nhãn và ba thanh cuộn trên cùng app QA cô lập. Thử năm người mới và nghiệm thu bộ cài production vẫn cần thực hiện.
