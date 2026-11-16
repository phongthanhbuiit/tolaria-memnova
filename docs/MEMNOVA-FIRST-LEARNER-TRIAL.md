# Thử Memnova với người học lần đầu

Dùng cho đợt 4 của [kế hoạch hiện tại](CURRENT-STATE.md). Mục tiêu là quan sát người mới từ lúc đọc đến lượt ôn đầu và quay lại nguồn. Mỗi người dùng một thư viện thử riêng, trên cùng một bản build macOS đã ghi rõ commit. Người tham gia tự thao tác bằng cách họ thường dùng.

## Chuẩn bị

Chọn 5 người chưa từng dùng Memnova. Ghi mã P01–P05, ngôn ngữ giao diện, thiết bị và cách nhập liệu. Đưa ứng dụng về cùng trạng thái ban đầu trước mỗi buổi. Thư viện thử có một ghi chú tên *Đọc thử*, chứa đoạn văn dưới đây. Có thể tạo bằng luồng tạo note thông thường.

> Khi học một khái niệm mới, hãy tự giải thích nó bằng lời của mình và nghĩ ra một ví dụ. Sau một khoảng nghỉ, thử nhớ lại trước khi mở tài liệu. Nếu chưa nhớ được, đọc lại phần liên quan rồi thử một lần nữa.

Đoạn văn được viết cho bài thử này. Đóng các cửa sổ chứa hướng dẫn chi tiết trước khi bắt đầu. Xin sự đồng ý trước khi ghi âm hoặc quay màn hình. Chỉ ghi thao tác, thời gian và trở ngại vào bảng tổng hợp.

## Bài giao cho người tham gia

Đọc nguyên văn yêu cầu sau, rồi bắt đầu đồng hồ.

> Bạn muốn giữ lại một ý từ đoạn đọc để sau này ôn lại. Hãy lưu ý đó cùng nguồn, thêm một câu gợi nhớ, thực hiện lượt ôn đầu tiên và mở lại đoạn đọc ban đầu. Bạn có thể dùng ứng dụng theo cách mình thấy tự nhiên. Hãy nói ra điều bạn đang tìm khi bị vướng.

Đồng hồ 5 phút tính từ lúc đọc xong yêu cầu đến khi người tham gia tự chấm lượt ôn đầu. Tiếp tục quan sát việc mở lại nguồn sau mốc này. Người điều phối ghi lại từng lần hỏi và mọi hướng dẫn đã đưa. Nếu người tham gia chưa thể tiếp tục, ghi thời điểm rồi đưa một gợi ý cụ thể, sau đó tiếp tục quan sát. Một người hoàn thành sau gợi ý được tính vào nhóm có hỗ trợ.

## Đường đi để người điều phối đối chiếu

1. Chọn một đoạn trong *Đọc thử*, dùng hành động lưu trích đoạn trên thanh định dạng.
2. Lưu, kiểm tra vẫn ở vị trí đọc và mở ghi chú mới từ thông báo.
3. Trong Properties, bật Spaced repetition và thêm Mnemonic.
4. Bấm Review this note trong Properties, xem gợi nhớ và tự chấm.
5. Trở lại ghi chú đã lưu, theo liên kết nguồn để mở đúng *Đọc thử*.

Có thể hoàn thành bằng một đường khác nếu kết quả đúng. Ghi đường đi thực tế và cách người tham gia hiểu các nhãn. Kiểm tra trên đĩa rằng ghi chú nguồn còn nguyên, trích đoạn giữ nguồn và lượt ôn đã được lưu.

## Phiếu ghi kết quả

Điền thời gian theo phút và giây kể từ lúc bắt đầu. Các ô trống chưa có dữ liệu đo.

| Mã | Tìm lưu trích đoạn | Tìm bật học | Chấm lượt đầu | Mở lại nguồn | Số lần hỗ trợ | Tự hoàn thành trong 5 phút | Trở ngại quan sát |
|---|---|---|---|---|---|---|---|
| P01 | | | | | | | |
| P02 | | | | | | | |
| P03 | | | | | | | |
| P04 | | | | | | | |
| P05 | | | | | | | |

Ghi thêm commit, đường dẫn artifact, ngày thử, locale, macOS, cách nhập liệu và kết quả đối chiếu dữ liệu cho từng buổi. Mục tiêu là ít nhất 4/5 người tự chấm lượt đầu trong 5 phút.

## Kiểm tra khả năng tiếp cận

Trên cùng bản build, kiểm tra bằng chuột rồi bàn phím. Với danh sách 0, 1, 50, 51 và 1.000 ghi chú, ghi item trước/sau khi đổi thứ tự, lọc, xoá và mở lại danh sách. Thử Home, End, phím mũi tên, Tab và Shift+Tab. Khi item biến mất, focus cần ở vị trí người dùng có thể tiếp tục thao tác.

Ngày 16/11/2026, người dùng bỏ yêu cầu kiểm tra VoiceOver khỏi đợt này. Ghi kết quả chuột, bàn phím và accessibility tree trong biên bản QA.

## Chọn bước tiếp theo

Sau 5 buổi, nhóm các trở ngại theo bước thực tế. Ưu tiên sửa bước làm nhiều người dừng lại. Khi luồng cơ bản đạt mục tiêu, chọn một nhánh mở rộng theo nguồn tài liệu và nhu cầu được quan sát.

| Quan sát phổ biến | Nhánh để thử |
|---|---|
| Phải dò lại trang trong giáo trình PDF | Lưu nguồn PDF kèm số trang và mở lại đúng trang |
| Chuyển giữa trình duyệt và app nhiều lần để lưu đoạn đọc | Web Clipper |
| Cần mang backup qua dịch vụ khác và đặt mật khẩu cho bản sao | Xuất backup có mật khẩu |

Ghi số người gặp trở ngại, ví dụ thao tác và tiêu chí cho thử nghiệm tiếp theo. Cập nhật kết quả vào CURRENT-STATE cùng biên bản QA sau khi có dữ liệu.
