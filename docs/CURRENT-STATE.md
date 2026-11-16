# Memnova hiện tại

**Đối chiếu ngày 16/11/2026.** Ba ảnh trạng thái ghi nhớ đầu tiên được kiểm tra tại `a69159c5` trên `main`. Các tính năng trích đoạn và ôn Saved View được bổ sung trong đợt [nghiệm thu mới](baselines/2026-11-16-capture-and-view-study.md). Bản cài đối chiếu theo tag [v0.1.0](https://github.com/phongthanhbuiit/tolaria-memnova/releases/tag/v0.1.0), commit `d0b400d5`. Trang này là điểm đọc đầu tiên khi cần biết người dùng đang thấy gì, dữ liệu nằm ở đâu và việc nào còn mở.

## Người dùng thấy gì khi viết và học?

Memnova mở hoặc tạo một thư mục Markdown trên máy, gọi là **Thư viện**. Người dùng có thể viết ngay mà không cần tài khoản, Git hay AI. Sidebar và danh sách ghi chú vẫn ở bên trái, editor ở giữa, Properties mở ở bên phải khi cần. Hai thay đổi dễ nhận ra nhất so với bản giao diện tháng 10 là cách bật học trong Properties và lúc nào thanh tab học xuất hiện.

| Trạng thái của cùng một note | Thao tác và kết quả quan sát trên main | Ảnh Chromium |
|---|---|---|
| Ghi chú thường | Mở note vào thẳng editor. Trong **Properties**, công tắc **Spaced repetition** đang tắt. Ghi chú chưa học không có thanh tab học. | [Trước khi bật](baselines/ui/2026-11-16-a69159c5/ordinary.png) |
| Đã bật ghi nhớ | Bật công tắc để hiện **Content / Memorization**. Trong **Memorization**, chọn **Add mnemonic** nếu thiếu gợi nhớ. Sau khi thêm, **Study** mở phiên ôn. Mở đáp án rồi chọn mức nhớ để ghi nhận lượt ôn. | [Gợi nhớ đã có, ghi chú đến hạn](baselines/ui/2026-11-16-a69159c5/enabled.png) |
| Đã ôn một lượt rồi tạm dừng | Tắt công tắc. Editor hiện lại và hai tab **Content / Memorization** biến mất. Vì note vẫn có mặt gợi nhớ, **Article / Mnemonic** còn dùng được. Properties hiển thị lịch sử ôn ở chế độ chỉ đọc. Bật lại công tắc để tiếp tục. | [Sau khi tạm dừng](baselines/ui/2026-11-16-a69159c5/paused.png) |

Ba ảnh chụp ngày 16/11/2026 bằng Chromium, giao diện tiếng Anh, 1280 × 720, trên bản sao thư viện kiểm thử. Bài kiểm tra đi qua bật học, viết gợi nhớ, lưu, chấm một lượt, tạm dừng và bật lại bằng bàn phím. Các ảnh ghi đúng các bước của cùng ca kiểm thử. Lượt này chưa chạy bản cài macOS hay VoiceOver. [Ca kiểm thử](../tests/integration/note-memory-workspace.spec.ts)

Ảnh QA ngày 14/11 có panel **Paused**, nút **Resume**, và năm **58839** thuộc luồng cũ. Lỗi đổi mili giây thành giây ở dữ liệu demo đã sửa trong `d538fb4b`. Kiểu điều khiển học đổi trong `a6b6fc82` và quy tắc hiện tab đổi trong `fdcc1459`. Tên file ảnh QA có thể giống nhau giữa các lần chạy.

## Bản cài và mã nguồn

| Phạm vi | Đã có |
|---|---|
| **v0.1.0 cho Mac Apple Silicon** | Bản ký ad hoc. Viết Markdown, wikilink, thuộc tính tùy chỉnh, Inbox, Saved Views và ôn ghi chú. Bản cài giữ nội dung hình vẽ cũ trong Markdown nhưng chưa hiển thị hay sửa hình. [Tải và cài đặt](../README.md) |
| **main tại a69159c5** | Gõ `/Excalidraw` trong editor để thêm hình mới. Dữ liệu hình và ảnh nhúng lưu trong khối Markdown. Study hiển thị hình ở chế độ chỉ xem. Chưa có chuyển đổi tự động từ tldraw. [Quyết định về Excalidraw](adr/0165-excalidraw-note-drawings.md) |

## Nội dung, lịch học và sao lưu

- **Ghi chú**. Một trang được bật học có một lịch ôn. Article và Mnemonic cục bộ ở chung file Markdown. Có thể chọn một mặt của trang khác trong cùng thư viện làm gợi nhớ. Ôn trang đang mở chỉ cập nhật lịch của chính trang đó. Các thẻ độc lập đời trước vẫn truy cập được ở mục Legacy. [Hướng dẫn ghi nhớ](MEMNOVA-NOTE-MEMORY-GUIDE.md)
- **Lịch sử**. Thư mục `.memnova` của thư viện chứa định danh và cơ sở dữ liệu SQLite cho lịch ôn, phiên học, lịch sử và phục hồi. Xoá nó có thể làm mất quá trình học. [Thiết kế lưu trữ](adr/0138-memnova-learning-store.md)
- **Sao lưu**. Vào **Home → Advanced → Backup history**, tạo và xác minh backup. Restore khôi phục vào thư mục mới. Backup gồm Markdown, tệp đính kèm và snapshot SQLite. SHA-256 kiểm tra tính toàn vẹn. Memnova lưu các file thư viện và bản backup ở dạng có thể đọc được bởi tài khoản có quyền truy cập. [Thiết kế backup](adr/0139-verified-library-backups.md)
- **Vault** là từ kế thừa chỉ thư mục lưu ghi chú. Một số nhãn vẫn dùng từ này. Hộp thoại gỡ thư viện hiện dùng “Gỡ thư viện khỏi danh sách?” và nói rõ các tệp vẫn ở trong thư mục trên máy. [Chuỗi giao diện](../src/lib/locales/vi.json)

## Lưu trích đoạn và ôn theo Saved View

- Chọn chữ trong editor rồi bấm **Lưu trích đoạn kèm nguồn** trên thanh định dạng. Lưu tạo ghi chú thường có wikilink nguồn và trả về vùng chọn đang đọc. Bấm **Mở ghi chú** trong thông báo khi muốn chuyển sang bản vừa lưu. Có thể mở cùng lệnh từ bảng lệnh để nhập văn bản và URL web. Khi lưu lỗi, bản nháp vẫn nằm trong hộp thoại để thử lại. [Ảnh native sau khi lưu](baselines/ui/2026-11-16-capture-study/capture-native.png)
- Chọn một Saved View. Bật **Đến hạn** để xem các ghi chú cần ôn trong kết quả của view, rồi chọn **Ôn ghi chú đến hạn (n)**. App lưu nội dung đang sửa và làm mới lịch trước khi mở phiên. Sau khi chấm, số đến hạn cập nhật và focus quay về nút ôn. Bộ lọc Đến hạn được giữ tạm theo view trong phiên làm việc. [Ảnh native sau khi ôn](baselines/ui/2026-11-16-capture-study/study-native.png)

## Công việc sau mốc này

| Trạng thái | Việc và tiêu chí |
|---|---|
| Đã xác minh trong mã | Sửa ngày demo, điều hướng tới Retry trên màn chào, đưa bật/tạm dừng ghi nhớ vào Properties và tích hợp Excalidraw trên main. Kiểm tra trạng thái phát hành trước khi giới thiệu Excalidraw cho người dùng bản cài. |
| Cần bằng chứng bổ sung | Chạy VoiceOver với danh sách học thay đổi khi đang focus. Đo ba lượt core smoke không retry theo ngân sách 5 phút. Kiểm tra luồng cài → viết → học → backup → restore trên bộ cài mục tiêu. Các kết quả cũ có phạm vi và phiên bản riêng. [Biên bản theo dõi](archive/plans/MEMNOVA-POST-UX-FOLLOWUP-PLAN.md) |
| Cần người tham gia | Đo với 5 người mới, mục tiêu 4 người tự viết ghi chú, thêm gợi nhớ và chấm lượt đầu trong 5 phút. Dựa trên trở ngại quan sát được để chọn thử PDF đúng trang, tiện ích trình duyệt hoặc xuất backup có mật khẩu. |

## Cách cập nhật khi sản phẩm đổi

1. Đối chiếu commit của mã đang chạy và tag của bản cài. Khi có thay đổi UI, ghi trạng thái thao tác cụ thể như note mới, đang học hoặc đã tạm dừng.
2. Chạy ca liên quan với thư viện thử và thư mục output mới. Ví dụ cho ba trạng thái ở trên, chạy từ gốc repo:

   ```sh
   qa_output=$(mktemp -d)
   pnpm exec playwright test --config playwright.integration.config.ts \
     tests/integration/note-memory-workspace.spec.ts -g 'explicit note enable' \
     --retries=0 --output="$qa_output"
   ```

   Ca gốc xuất ảnh cuối sau khi tạm dừng. Để cập nhật đủ bộ ảnh, chụp thêm trước khi bật công tắc và khi nút Study đã sẵn sàng, tắt animation khi chụp. Kiểm tra ảnh và trạng thái công tắc sau khi giao diện ổn định.
3. Cập nhật bảng, mốc mã và liên kết ảnh trong trang này cùng thay đổi hành vi. Ảnh tham chiếu nằm dưới `docs/baselines/ui/<ngày>-<commit>/`. Dùng [các quyết định kiến trúc](adr/), [kết quả QA](baselines/) và [kế hoạch lưu trữ](archive/plans/) để tra lịch sử của phiên bản tương ứng.
