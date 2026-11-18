# Memnova hiện tại

**18/11/2026 — Welcome:** R-10 cho phép mô tả nút tạo Library xuống dòng trong nút, và màn hình chào cuộn được khi cửa sổ thấp. Kiểm vi, en và ru-RU ở 1440×900, 1024×700 và 480×400. [Ma trận QA và ảnh trước/sau](audits/OVERNIGHT-2026-11-18.md#r-10--done).

**18/11/2026 — Copy ôn tập:** UI tiếng Việt dùng ghi chú, ôn tập/ôn, Ghi nhớ và thẻ theo thuật ngữ đã chọn. Hạn ôn hiển thị tương đối với mốc tuyệt đối trong tooltip. Các trạng thái cần phục hồi chỉ ra bước tiếp theo. Sidebar có mô tả cho Trang chủ và Ôn tập. [Biên bản, bảng thuật ngữ và ảnh đối chiếu](audits/STEP-LEARNING-COPY.md).

**18/11/2026 — Tiếng Việt và tên truy cập:** R-11 dịch Lưu và tên nút đóng Quick Open, thêm quét nhãn tiếng Anh còn trùng catalog trên các bề mặt chính. Nút Lưu đã kiểm trên Chromium/WebKit, còn kiểm editor thuộc tính native. R-13 dùng dictionary BlockNote theo locale và giữ trạng thái editor khi đổi ngôn ngữ. R-14 bổ sung label tiếng Việt cho từng ô chọn trường trong bộ lọc. R-15 đưa nhãn thanh định dạng và bộ lọc tạo View vào catalog en/vi. [Biên bản R-11/R-13/R-14](audits/STEP-I18N-A11Y-2.md) · [QA R-15](audits/FINDINGS.md#r-15--chuỗi-tiếng-anh-chưa-đưa-vào-catalog).

**18/11/2026 — E2 / a11y và form controls (PARTIAL):** F-019 khôi phục solid focus-visible và F-006 chuyển 32 raw form tags sang shared Button/Input, giữ presentation/giá trị/phím. R-13 đã dịch hai nút BlockNote và R-14 đặt tên cho bộ chọn trường lọc. Đợt bổ sung F-005 đã đặt tên cho các bộ chọn và nút icon còn sót khi quét, gồm nút menu mặc định của Excalidraw. Một số tên truy cập nội bộ của bảng vẽ vẫn dùng tiếng Anh. Telex native vẫn chưa được xác minh. [Tình trạng F-005](audits/FINDINGS.md#f-005--nút-icon-thiếu-tên-truy-cập) · [Biên bản E2](audits/STEP-E2-A11Y-FORMS.md).

**18/11/2026 — E1 / chức năng và copy:** Ẩn record retired ở catalog/chỉ mục hiển thị, giữ file và lịch sử; dịch nhãn hệ thống Properties/sidebar, phân biệt “Đưa vào lịch ôn”/“Ôn ngay”, rút gọn nhãn lịch và làm rõ editor thuộc tính. Hoàn thiện History/tooltip và locale bắt buộc của các formatter được chỉ định. Native WKWebView sáng/tối, en/vi; sentinel và nội dung Markdown giữ hash, lịch/thẻ không đổi. [Biên bản E1, commit, TDD và kiểm phát hành](audits/STEP-E1-FUNCTION-COPY.md). R-11 ghi hai copy còn ngoài phạm vi; R-12 sửa precondition smoke bằng thao tác hiện hành, không sửa app. Đây là mã nguồn, chưa tạo bộ cài mới.

**18/11/2026 — D4B / F-032, F-038:** Năm file Pulse/AI chrome/sidebar/AI message/consent chuyển static inline sang utility, giữ pixel geometry và biến theme; style object92→11, còn9dynamic+2delay và editorStyle scrolling contract được ghi rõ. F-032 toàn app còn partial. F-038 đã đưa weight chrome về400/500/600, giữ700 cho nội dung/cú pháp editor. [Số đo từng file, ma trận ảnh và gates D4B](audits/STEP-D4B-INLINE-STYLE.md). Hook source54/54core, frontend87,50%, Rust86,40%; chưa phải bản cài phát hành mới.

**18/11/2026 — D4A / F-024:** Sáu commit theo nhóm study, dialog/palette, Settings/Welcome, AI, Pulse và chrome thay cỡ chữ literal bằng token. Đợt bổ sung F-024 đã xử lý các cỡ CSS và cỡ kế thừa dưới 11px, giữ ngoại lệ glyph emoji động. Grep SPEC §8 hiện còn 1 dòng emoji. [Biên bản, ảnh native tiếng Việt 1440×900 sáng/tối và giới hạn](audits/STEP-D4A-TYPOGRAPHY.md). Ba ca R-09 đã ổn định sau khi sửa selector và tín hiệu sẵn sàng. [Biên bản kiểm thử](audits/STEP-TEST-STABILITY.md). Chưa build bản cài phát hành mới.

**18/11/2026 — bước D3:** Editor actionbar chia nhóm và dùng tooltip/aria đã dịch, chrome/status bar dùng token; H1 rỗng faint/upright; breadcrumb hiện tiêu đề, filename chỉ đổi qua thao tác tường minh. [Ảnh native trước/sau, TDD, dữ liệu và gate D3](audits/STEP-D3-EDITOR-CHROME.md). Không đổi nội dung BlockNote hoặc đặt tên ghi chú mới. Core curated cuối 54/54 không retry; Ba lỗi readiness/selection của R-08 đã tái hiện trên baseline trước D3. Bản sửa Playwright đạt 20/20 mỗi ca, không retry. [Biên bản R-08](audits/R-08-COMPLETION.md). D4A được ghi ở mục mới phía trên; chưa phải bản cài phát hành mới.

**18/11/2026 — bước D2:** Trang chủ dùng display/title và Tabs gạch chân, giữ một hành động chính; hàng danh sách chỉ còn một ngày theo formatter hiện có, sidebar thống nhất trạng thái chọn và badge trung tính. [Ma trận ảnh native 1440/1024, en/vi, sáng/tối và nghiệm thu D2](audits/STEP-D2-HOME-LIST-SIDEBAR.md). Giữ F-039/F-041 và dữ liệu; D3 có nghiệm thu riêng ở trên; D4 chưa thực hiện. Đây chưa phải bản cài phát hành mới.

**17/11/2026 — F-041 (P1):** sửa vòng cập nhật giữa metadata transition và layout store của react-virtuoso trên WebKit. Giữ dữ liệu thứ tự danh sách ổn định theo path, hàng đọc metadata mới qua context. [Tỉ lệ lỗi trước/sau, regression RED và native QA riêng](audits/F-041-COMPLETION.md). Chưa phải bản cài phát hành mới.

**17/11/2026 — R-02/R-03:** sửa minimum size làm icon trong dòng chữ phình sau bước A; biến thể inline dùng spacing token có vùng bấm 24,5px, standard giữ 28/32/36px. [Kiểm kê 29 nơi gọi, TDD và ảnh native sáng/tối](audits/R-02-R-03-COMPLETION.md). Undo luôn giữ chỗ, disabled khi không khả dụng và click trả focus về vùng thẻ trước khi cập nhật; Space/1–4/Esc được kiểm tra riêng. D2–D4 chưa thực hiện.

**17/11/2026 — F-039, Cmd+click wikilink ổn định khi source lưu:** giữ identity của note không đổi trong projection một workspace và key hàng danh sách theo đường dẫn. Smoke vẫn dùng fixture lớn ban đầu, đạt 30/30 trước + 30/30 đồng thời + 30/30 sau core suite, không retry; full Node 24/Rust checks và pre-push dry-run sạch. [Nguyên nhân, trace/video, native QA và kiểm tra](audits/F-039-COMPLETION.md). F-040 đã được xử lý ở bước ổn định kiểm thử. F-041 có nghiệm thu riêng ở đoạn trên. Đây chưa phải bản cài phát hành mới.

**17/11/2026 — R-01/F-002, ngày và số theo ngôn ngữ giao diện:** bổ sung locale bắt buộc cho formatter, Calendar có tháng/thứ/aria đã dịch, bộ lọc ngày, thời gian tương đối Git/Pulse và số từ/liên kết theo locale/số nhiều. Sáu commit sửa kết thúc tại `9c951e78`; QA native Anh/Việt sáng/tối và test hai múi giờ trong [biên bản R-01](audits/R-01-F-002-COMPLETION.md). ISO nhập/lưu, parser, sort và lịch ôn giữ nguyên. Mã đã push qua hook hiện có, nhưng core smoke còn F-039 pass nhờ retry; đây chưa phải bản cài phát hành mới.

**17/11/2026 — nền tảng UI bước A:** bổ sung thang chữ chrome, kích thước điều khiển và bo góc trong token/components dùng chung; nâng tương phản màu chữ. Không chỉnh mã màn hình hoặc typography editor. [Phạm vi, số đếm SPEC §8 và ảnh QA sáng/tối](audits/STEP-A-FOUNDATION.md).

**17/11/2026 — màn ôn bước B:** dialog 640px, một bề mặt gợi nhớ 18/28, nút chấm trung tính dùng chung với Legacy và trạng thái hoàn thành theo SPEC §6. Giữ hành vi, phím tắt và lịch ôn. [Ảnh sáng/tối, số đo và kết quả kiểm tra](audits/STEP-B-STUDY.md).

**17/11/2026 — API điều khiển học bước C:** bỏ toàn bộ CSS chọn nội bộ `data-slot`; kích thước, wrapping, vùng chạm và khung dialog đi qua variant/size của UI dùng chung. Handler, lịch ôn và dữ liệu giữ nguyên. [Ảnh, QA native và check suite](audits/STEP-C-CONTROL-VARIANTS.md).

**17/11/2026 — Properties và sửa gợi nhớ bước D1:** chuẩn hóa chữ, nút và bo góc theo token; thu gọn gợi ý thuộc tính/quan hệ rỗng, gộp thanh quay lại và chọn nguồn. Nút ôn dùng màu nhấn khi đến hạn, outline khi chưa đến hạn. Giữ thao tác và lịch ôn. [Ảnh sáng/tối, số đếm và kiểm tra trên mã nguồn local](audits/STEP-D1-PROPERTIES-MNEMONIC.md). D2–D4 chưa thực hiện; push đang bị gate baseline F-039 chặn, WebKit còn F-041. Đây chưa phải bản cài phát hành mới.

**Đối chiếu ngày 16/11/2026.** Bản local Apple Silicon mới `199e69de` đã đóng gói giao diện Thư viện và luồng viết mới; [ảnh, nghiệm thu và thông tin DMG](baselines/2026-11-16-library-writing.md). Mốc release local `8e99c7f0` trước đó đã kiểm tra backup sau khi rời editor. [Bộ cài và phạm vi nghiệm thu](baselines/2026-11-16-release-build.md). Luồng viết trước và thao tác học trong Properties nằm ở commit `5281fd90`, thay thế hàng tab `dbd3ee1c` / `f4a600ce`. Hoàn thiện nhãn ôn và thanh cuộn Properties nằm ở `e23d721d`. Sidebar, danh sách và Properties dùng cùng kiểu thanh cuộn mảnh. Nút mở phiên ghi rõ **Review this note / Ôn ghi chú này**. [Nghiệm thu chỉnh sửa cuối](baselines/2026-11-16-properties-polish.md). [Nghiệm thu và ảnh native mới](baselines/2026-11-16-writing-and-properties.md). Trích đoạn và ôn Saved View có từ `05ae7aa3`. Bản cài công khai đối chiếu theo tag v0.1.0, commit `d0b400d5`. Trang này là điểm đọc đầu tiên để xác định giao diện, dữ liệu và việc còn mở.

## Thư viện: viết hoặc học

Trên mã nguồn mới, **Trang chủ → Tất cả ghi chú** mở danh sách tệp của thư viện, kể cả Markdown chưa bật học. **Ghi chú mới** mở thẳng editor. Ghi chú vẫn là Markdown thường cho tới khi bạn bật **Ôn tập ghi chú này** trong Thuộc tính.

Trong danh sách học, tìm theo tiêu đề hoặc đường dẫn (ví dụ `Vật lý/` nếu hai môn có bài trùng tên), chọn thư mục và bật **Đến hạn** khi cần. Số trên nút ôn là số ghi chú đến hạn khớp với phạm vi đang chọn. Thư viện chưa có ghi chú học sẽ hiện hướng dẫn bắt đầu thay cho bộ lọc. [Ảnh và phạm vi kiểm tra](baselines/2026-11-16-library-writing.md).

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
