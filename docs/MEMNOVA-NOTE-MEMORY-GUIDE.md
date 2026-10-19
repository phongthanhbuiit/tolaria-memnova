# Memnova: ghi nhớ một trang Markdown

Đây là hướng dẫn cho nghiệp vụ note-memory hiện hành. Các tài liệu multi-card trước đây mô tả luồng Legacy, không phải mặc định của note mới. Trạng thái triển khai và bằng chứng ở [sổ task M00–M25](MEMNOVA-NOTE-MEMORY-IMPLEMENTATION.md).

## Ghi chú thường và trang cần học

Mở hoặc tạo `.md` rồi viết như ứng dụng ghi chú bình thường. Chỉ khi chọn **Flashcards → Enable memorization**, trang đó mới có một mục học riêng. Không phải mọi Markdown, wikilink hoặc trang nguồn được liên kết đều trở thành flashcard.

Trong **Content**, **Article** là bài cần thuộc (có thể là cả trang A4). Chọn **Add mnemonic** để tạo mặt **Mnemonic**. Mặt sau có thể chứa chữ, ảnh và whiteboard qua công cụ editor hiện có; không bắt buộc dùng canvas. Hai mặt lưu trong cùng `.md`, phân cách bằng `<!-- FLASHCARD:BACK -->`. Cây thư mục chỉ có một file; không tạo thư mục canvas ẩn hoặc một bản bài học độc lập trong SQLite.

Dùng thiết lập chiều rộng note sẵn có cho cả hai mặt; whiteboard có thể mở rộng bằng điều khiển của nó. Đổi mặt, chuyển note và đóng ứng dụng bình thường đều đi qua hàng đợi lưu chung. Khi lưu thất bại, ứng dụng giữ bản đang sửa và cho Retry/Cancel. Cơ chế đóng bình thường không bảo đảm trước force-kill, crash hoặc updater restart.

## Mặt sau lấy từ một trang khác

Từ thanh điều khiển hai mặt, chọn source và xem preview. Chọn rõ Article hoặc Mnemonic rồi **Use source** để áp dụng. Preview/Cancel không ghi file. Khi cần đăng ký UUID cho trang nguồn, hệ thống tạo backup và kiểm tra source trước khi ghi; nếu bước sau thất bại, UUID/backup đã tạo vẫn có thể còn và được báo để xử lý tiếp.

Mặt sau liên kết chỉ đọc. **Open source** lưu trang hiện tại trước khi mở nơi sửa thật. **Use local mnemonic** quay về mặt sau cục bộ được giữ lại. Di chuyển source trong cùng Library vẫn tìm theo UUID. Source bị mất/trùng UUID hoặc không còn mặt hợp lệ sẽ chặn ôn cho tới khi sửa; không dùng nội dung SQLite cũ để giả là nguồn còn tồn tại. Không hỗ trợ chuỗi back-of-linked-back.

Học trang A không tự học hoặc chấm điểm trang B mà A liên kết. Nếu bật học B riêng, B có lịch riêng. Nếu đã thuộc B và muốn ngừng ôn B, chọn Pause memorization trên B; liên kết từ A vẫn đọc nội dung B. Mở wikilink và đọc trang không tạo lượt review.

## Thuộc bài, lịch ôn và properties

Chọn **Study**, tự nhớ Article, rồi **Show mnemonic** để đối chiếu gợi ý. Chọn Again/Hard/Good/Easy theo mức nhớ thực tế. Đánh giá cập nhật lịch; **Undo** hoàn lại lượt hợp lệ gần nhất. Đóng phiên sẽ giữ trạng thái để tiếp tục đúng phạm vi. Home thống kê các lượt đã commit.

“Đã thuộc” không phải một trạng thái vĩnh viễn do đọc hoặc tick property. Nếu muốn ngừng ôn hẳn, dùng **Pause memorization**; nội dung hai mặt và lịch sử vẫn giữ. Bật lại không tạo lịch mới. Có thể tự thêm property `Status: Completed` để tổ chức ghi chú, nhưng property đó không tự chấm điểm hoặc dừng lịch.

**Page properties** là frontmatter của file `.md`; user được chỉnh giá trị nghiệp vụ được hỗ trợ. Khối YAML phức tạp/không hỗ trợ được giữ nguyên và hiển thị bảo vệ. Các field `_memnova_*`, lịch ôn và ID nội bộ do hệ thống quản lý. Properties của card cũ thuộc dữ liệu Legacy độc lập; sau conversion, bản cũ chỉ để giữ lịch sử, không phải một bộ properties trang đang hoạt động thứ hai.

## Dữ liệu cũ và conversion

Card nhiều câu hỏi trong một trang vẫn ở **Legacy**. Không tự đổi nội dung hoặc chọn lịch thắng khi card đã khác Markdown. Conversion có preview và lựa chọn rõ nguồn Article/Mnemonic, giữ lịch cũ hoặc bắt đầu mới. Các trường hợp không đủ điều kiện/đang xung đột được báo và giữ lại; không tuyên bố chuyển toàn bộ thành công khi còn skipped/conflict.

Chỉ Apply mới thực hiện conversion đã chọn, sau backup và kiểm tra lại preview. Nếu file đổi sau preview, refresh rồi chọn lại. Recovery giữ immutable intent và bản nháp; Retry có thể vẫn cần quyết định, không có nghĩa đã lưu thành công. Copy các bản cần giữ trước khi chọn giữ file trên đĩa hoặc giải quyết xung đột.

## Backup, di chuyển và khôi phục

Markdown/media là nguồn nội dung; SQLite schema **5** giữ binding, schedule, review, session và recovery journal. `.memnova/learning.sqlite3` cùng manifest không phải cache. Không xóa nó để “reset”, không Git-sync database/WAL đang mở, và không chỉ copy Markdown rồi kỳ vọng giữ lịch sử.

Dùng **Home → Advanced → Backup history**: Create, Verify rồi Restore. Restore xác minh lại và tạo Library ở thư mục mới; không ghi đè Library gốc. Khi database gốc bị mất/hỏng, startup recovery vẫn cho chọn backup đã có mà không khởi tạo database rỗng. Backup chỉ có ý nghĩa đầy đủ khi chứa cả Markdown, media và learning data; giữ bản gốc để đối chiếu.

Đổi tên/chuyển folder trong cùng Library giữ UUID và lịch. Duplicate preparation tạo UUID/lịch mới; không thêm giao diện clone file mới trong đợt này. Chuyển note đang học sang Library khác bị chặn; dùng verified Library backup/restore để dời toàn bộ cùng lịch sử. Xóa note cũng xóa mnemonic nằm trong chính file; linked source và attachment dùng chung bên ngoài phạm vi xóa không bị xóa dây chuyền.

Để quay về phiên bản ứng dụng cũ, đóng app và giữ bản sao nguyên Library trước. Khôi phục backup tương thích vào thư mục riêng và dùng phiên bản app tương ứng với backup; không hạ `user_version`, sửa journal hay chỉ thay SQLite/Markdown một phía. Binary cũ không được giả định đọc được schema 5. Không có tự động downgrade hoặc chuyển lịch giữa hai Library.

## Phạm vi đã kiểm và giới hạn

Nghiệm thu dùng Library tổng hợp, không dữ liệu thật: native macOS lưu hai mặt/canvas, linked source, grade/undo, conversion/recovery và restore sang root độc lập, cùng browser/tests thực. Xem [M23](baselines/2026-10-19-note-memory-m23.md), [M24](baselines/2026-10-19-note-memory-m24.md) và báo cáo release cuối để biết command, kết quả và phần chưa chạy.

Timing/heap trong Chromium không đại diện tuyệt đối cho WebKit native. Physical touch, VoiceOver, hệ điều hành khác và bản cài đặt phát hành có ký số không được suy ra từ những phép thử này. tldraw production có yêu cầu license riêng; cảnh báo license thấy trong QA không được bỏ qua hoặc né bằng bản vá cleanup.
