# Memnova hiện tại

**Đối chiếu ngày 16/11/2026.** Bộ cài release local Apple Silicon từ `8e99c7f0` đã được build và kiểm tra, gồm bản sửa backup sau khi rời editor. [Bộ cài và phạm vi nghiệm thu](baselines/2026-11-16-release-build.md). Luồng viết trước và thao tác học trong Properties nằm ở commit `5281fd90`, thay thế hàng tab `dbd3ee1c` / `f4a600ce`. Hoàn thiện nhãn ôn và thanh cuộn Properties nằm ở `e23d721d`. Sidebar, danh sách và Properties dùng cùng kiểu thanh cuộn mảnh. Nút mở phiên ghi rõ **Review this note / Ôn ghi chú này**. [Nghiệm thu chỉnh sửa cuối](baselines/2026-11-16-properties-polish.md). [Nghiệm thu và ảnh native mới](baselines/2026-11-16-writing-and-properties.md). Trích đoạn và ôn Saved View có từ `05ae7aa3`. Bản cài công khai đối chiếu theo tag v0.1.0, commit `d0b400d5`. Trang này là điểm đọc đầu tiên để xác định giao diện, dữ liệu và việc còn mở.

## Người dùng thấy gì khi viết và học?

Memnova mở hoặc tạo một thư mục Markdown trên máy, gọi là **Thư viện**. Người dùng có thể viết ngay mà không cần tài khoản, Git hay AI. Sidebar và danh sách ghi chú vẫn ở bên trái, editor ở giữa, Properties mở ở bên phải khi cần. Ghi chú mở vào bài viết. Các thao tác bật học, thêm/sửa gợi nhớ và bắt đầu ôn nằm trong Properties. Khi sửa gợi nhớ, editor có nút quay lại ghi chú. Luồng này thay thế hàng tab học của mốc trước.

| Trạng thái | Thao tác và kết quả quan sát trên main | Ảnh native |
|---|---|---|
| Ghi chú thường | Mở note vào thẳng editor. Trong **Properties**, công tắc **Spaced repetition** đang tắt. Ghi chú chưa học không có thanh tab học. | [Trước khi bật](baselines/ui/2026-11-16-writing-first/ordinary.png) |
| Đã bật ghi nhớ | Bật công tắc trong Properties. Chọn **Add mnemonic** để viết gợi nhớ, hoặc **Edit mnemonic** để sửa. **Review this note / Ôn ghi chú này** trong Properties mở thẳng phiên ôn. Mở đáp án rồi chọn mức nhớ để ghi nhận lượt ôn. | [Gợi nhớ đã có, ghi chú đến hạn](baselines/ui/2026-11-16-writing-first/enabled.png) |
| Đã ôn một lượt rồi tạm dừng | Tắt công tắc. Editor hiện bài viết. Properties giữ thao tác sửa gợi nhớ, lịch sử và công tắc bật lại. Properties hiển thị lịch sử ôn ở chế độ chỉ đọc. Bật lại công tắc để tiếp tục. | [Sau khi tạm dừng](baselines/ui/2026-11-16-writing-first/paused.png) |

Ba ảnh trong bảng được chụp native trên app QA đóng gói tại `5281fd90`, tiếng Việt, Library và preferences riêng. Đã kiểm tra ghi chú mới, bật học, sửa/lưu gợi nhớ, nút học trực tiếp, đóng phiên, tạm dừng, bàn phím và focus. [Ảnh editor gợi nhớ](baselines/ui/2026-11-16-writing-first/mnemonic.png). Các ảnh hàng tab cũ được giữ theo mốc lịch sử tại `baselines/ui/2026-11-16-single-note-navigation/`.

Ảnh QA ngày 14/11 có panel **Paused**, nút **Resume**, và năm **58839** thuộc luồng cũ. Lỗi đổi mili giây thành giây ở dữ liệu demo đã sửa trong `d538fb4b`. Kiểu điều khiển học đổi trong `a6b6fc82` và quy tắc hiện tab đổi trong `fdcc1459`. Tên file ảnh QA có thể giống nhau giữa các lần chạy.

Sidebar, danh sách ghi chú và Properties dùng cùng kiểu thanh cuộn native mảnh, theo token theme và ưu tiên tương phản cao. Sidebar rút gọn tên thư mục dài bằng dấu ba chấm và giữ hàng trong chiều rộng cột. Hover hoặc focus xem đường dẫn đầy đủ. [Nghiệm thu tên dài](baselines/2026-11-16-sidebar-folder-overflow.md).

## Bản cài và mã nguồn

| Phạm vi | Đã có |
|---|---|
| **v0.1.0 cho Mac Apple Silicon** | Bản ký ad hoc. Viết Markdown, wikilink, thuộc tính tùy chỉnh, Inbox, Saved Views và ôn ghi chú. Bản cài giữ nội dung hình vẽ cũ trong Markdown nhưng chưa hiển thị hay sửa hình. [Tải và cài đặt](../README.md) |
| **main từ 05ae7aa3** | Lưu trích đoạn từ editor hoặc URL và ôn theo Saved View. Hai tính năng này có trong mã nguồn sau tag v0.1.0. |
| **main từ a69159c5** | Gõ `/Excalidraw` trong editor để thêm hình mới. Dữ liệu hình và ảnh nhúng lưu trong khối Markdown. Study hiển thị hình ở chế độ chỉ xem. Chưa có chuyển đổi tự động từ tldraw. [Quyết định về Excalidraw](adr/0165-excalidraw-note-drawings.md) |

## Nội dung, lịch học và sao lưu

- **Ghi chú**. Một trang được bật học có một lịch ôn. Article và Mnemonic cục bộ ở chung file Markdown. Có thể chọn một mặt của trang khác trong cùng thư viện làm gợi nhớ. Ôn trang đang mở chỉ cập nhật lịch của chính trang đó. Các thẻ độc lập đời trước vẫn truy cập được ở mục Legacy. [Hướng dẫn ghi nhớ](MEMNOVA-NOTE-MEMORY-GUIDE.md)
- **Lịch sử**. Thư mục `.memnova` của thư viện chứa định danh và cơ sở dữ liệu SQLite cho lịch ôn, phiên học, lịch sử và phục hồi. Xoá nó có thể làm mất quá trình học. [Thiết kế lưu trữ](adr/0138-memnova-learning-store.md)
- **Sao lưu**. Vào **Home → Advanced → Backup history**, tạo và xác minh backup. Restore khôi phục vào thư mục mới. Backup gồm Markdown, tệp đính kèm và snapshot SQLite. SHA-256 kiểm tra tính toàn vẹn. Memnova lưu các file thư viện và bản backup ở dạng có thể đọc được bởi tài khoản có quyền truy cập. [Thiết kế backup](adr/0139-verified-library-backups.md)
- **Vault** là từ kế thừa chỉ thư mục lưu ghi chú. Một số nhãn vẫn dùng từ này. Hộp thoại gỡ thư viện hiện dùng “Gỡ thư viện khỏi danh sách?” và nói rõ các tệp vẫn ở trong thư mục trên máy. [Chuỗi giao diện](../src/lib/locales/vi.json)

## Lưu trích đoạn và ôn theo Saved View

- Chọn chữ trong editor rồi bấm **Lưu trích đoạn kèm nguồn** trên thanh định dạng. Lưu tạo ghi chú thường có wikilink nguồn và trả về vùng chọn đang đọc. Bấm **Mở ghi chú** trong thông báo khi muốn chuyển sang bản vừa lưu. Có thể mở cùng lệnh từ bảng lệnh để nhập văn bản và URL web. Khi lưu lỗi, bản nháp vẫn nằm trong hộp thoại để thử lại. [Ảnh native sau khi lưu](baselines/ui/2026-11-16-capture-study/capture-native.png)
- Chọn một Saved View. Bật **Đến hạn** để xem các ghi chú cần ôn trong kết quả của view, rồi chọn **Ôn ghi chú đến hạn (n)**. App lưu nội dung đang sửa và làm mới lịch trước khi mở phiên. Sau khi chấm, số đến hạn cập nhật và focus quay về nút ôn. Bộ lọc Đến hạn được giữ tạm theo view trong phiên làm việc. [Ảnh native sau khi ôn](baselines/ui/2026-11-16-capture-study/study-native.png)

## Nghiệm thu kế hoạch cải tiến từ Obsidian

| Đợt | Kết quả đã kiểm tra | Điều kiện còn lại |
|---|---|---|
| 1. Làm rõ Thư viện và backup | Trên macOS, gỡ khỏi danh sách rồi mở lại thư mục bằng hộp chọn hệ thống. Sáu tệp Markdown và một ảnh khớp SHA-256. Lịch ôn và lượt ôn khớp từng hàng. Hướng dẫn đã mô tả ai có thể đọc backup. | Còn thuật ngữ Vault kế thừa ở một số phần của app. Các nhãn tiếng Việt ở bộ chọn, Cài đặt thư viện và bảng lệnh dùng Thư viện. |
| 2. Lưu trích đoạn kèm nguồn | Đoạn chọn trong note hoặc văn bản dán kèm URL tạo note thường. Có thể tiếp tục đọc, mở note từ thông báo, huỷ hoặc thử lại khi ghi lỗi. Liên kết đến đúng tệp nguồn cả khi tên chứa ký tự đặc biệt hoặc có tệp trùng tên. | Luồng đã đạt trên app debug đóng gói dùng tauri://localhost. Đã kiểm tra executable release trên định danh QA riêng và xác minh app cài từ DMG. Phát hành công khai dùng artifact/ký phân phối phù hợp. |
| 3. Ôn theo Saved View | Lọc đến hạn, giới hạn phạm vi theo view và thư viện đang dùng. Ca 10 ghi chú cùng chủ đề, 3 đến hạn đã đạt. Sau khi chấm một note, đóng rồi mở lại, app giữ đúng ID phiên ở 1/3 và hoàn tác về note đầu. | Luồng học và backup/restore đã đạt trên executable release dùng định danh QA riêng, từ DMG ký ad hoc. |
| 4. Thử với người học | Đã sửa pending focus theo ID để giữ đúng note khi danh sách đổi. 15 unit test và 2 ca Chromium về danh sách 1.000 note, bàn phím và layout đạt. [Biên bản](baselines/2026-11-16-dynamic-focus-and-packaged-qa.md). | Người dùng đã bỏ yêu cầu VoiceOver ngày 16/11/2026. Cần 5 người lần đầu sử dụng. Giao một đoạn đọc, yêu cầu lưu nguồn, bật học, chấm lượt đầu và tìm lại nguồn. Ghi thời gian, bước cần trợ giúp và số người tự hoàn thành trong 5 phút. Mục tiêu 4/5. [Bài thử và phiếu ghi](MEMNOVA-FIRST-LEARNER-TRIAL.md). |
| 5. Chọn phần mở rộng | Các lựa chọn là PDF mở đúng trang, tiện ích trình duyệt hoặc xuất backup có mật khẩu. | Chọn một nhánh sau đợt 4 dựa trên trở ngại phổ biến. Luồng tạo ghi chú → học → backup → restore đã đạt trên artifact debug đóng gói. DMG local và executable release đã qua nghiệm thu theo phạm vi ghi trong biên bản release. |

Hai mẫu tiếng Việt để thử (*Khái niệm*, *Trích dẫn sách*) và chuyển khoá API đã lưu sang Keychain là các đề xuất riêng trong phần so sánh ban đầu. Quyết định hiện tại vẫn là lưu ghi chú Markdown và lịch ôn SQLite có thể đọc được bởi tài khoản có quyền truy cập thư mục.

## Công việc sau mốc này

| Trạng thái | Việc và tiêu chí |
|---|---|
| Đã xác minh trong mã | Sửa ngày demo, điều hướng tới Retry trên màn chào, đưa bật/tạm dừng ghi nhớ vào Properties và tích hợp Excalidraw trên main. Kiểm tra trạng thái phát hành trước khi giới thiệu Excalidraw cho người dùng bản cài. |
| Đã nghiệm thu release local | DMG ký ad hoc được mount/copy/xác minh chữ ký. Luồng viết → học → backup → restore đạt trên bản sao executable release có định danh QA riêng. 89 tệp và 13 bảng SQLite khớp sau restore. Developer ID/notarization và phát hành công khai cần cấu hình riêng. [Biên bản release](baselines/2026-11-16-release-build.md) |
| Đã đo core smoke | Trên bản chụp cố định `bf34180f`, 3 lượt không retry đạt 54/54 mỗi lượt, thời gian 290,02 / 279,94 / 281,55 giây. Cả ba dưới 300 giây. Mục tiêu 240 giây còn thiếu 41,55 giây ở trung vị. [Số đo và điều kiện](baselines/2026-11-16-capture-and-view-study.md) |
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
