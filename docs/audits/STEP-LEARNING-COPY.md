# F-007, F-011, F-012 và F-020 — Copy ôn tập

18/11/2026 · Baseline `68dc3bb8` · Node 24.12.0. Cổng an toàn đạt trên `main`, đồng bộ với `origin/main`, 0 commit chờ push.

| Finding | Commit | Kết quả |
|---|---|---|
| F-007 | `25fdd409` | Chuẩn hoá 28 giá trị trong `vi.json`. Ghi chú cho note/page, ôn hoặc ôn tập cho review, Ghi nhớ cho tên tính năng, thẻ cho flashcard. Giữ “Trang chủ” cho Home và “gợi nhớ” cho mnemonic. |
| F-011 | `dad0db41` | Ngày tương đối trên danh sách Ghi nhớ. Tooltip giữ ngày giờ tuyệt đối bằng locale hiện tại. |
| F-012 | `27e39775` | Nhãn nêu hành động theo trạng thái. Pending chỉ đến phục hồi bản nháp trong Nâng cao, invalid chỉ đến tệp/quyền và deleted chỉ đến sao lưu. |
| F-020 | `3fef6852` | Trang chủ nói rõ tổng quan thư viện và tiến độ. Ôn tập nói rõ nơi duyệt ghi chú trong lịch ôn. Hai mục vẫn mở đúng màn hình bằng chuột hoặc phím. |

## Tái hiện và nghiệm thu

- **F-007** · Kiểm đối chiếu giá trị RED 28/28 rồi GREEN 28/28. Giữ thứ tự key và placeholder. Sau sửa, từ “trang” chỉ còn ở nhãn “Trang chủ”. [Bảng 201 key trước/sau](GLOSSARY.md) · [Trước](evidence/F-007-before.png) · [Sau](evidence/F-007-after.png).
- **F-011** · RED trên cả hai múi giờ vì hàng hiện ngày giờ tuyệt đối. GREEN Chromium và WebKit **2/2 mỗi engine**, không retry, bao gồm `Asia/Ho_Chi_Minh` và `America/Los_Angeles` qua mốc DST tháng 3. Kiểm quá hạn, hôm nay, còn ngày, quá hạn 10 tháng, tiếng Anh, `datetime`, cả hover lẫn focus và Escape. So ngày lịch địa phương theo offset của mỗi mốc. `Intl.RelativeTimeFormat` diễn đạt hạn tương lai ở các locale mặc định. Dùng catalog và `Intl.NumberFormat` ở nhãn quá hạn và câu “Còn …” tiếng Việt. Chỉ định dạng lại giá trị, badge đến hạn và timestamp FSRS giữ nguyên. [Trước](evidence/F-011-before.png) · [Sau](evidence/F-011-after.png).
- **F-012** · Ba trạng thái trước đây cùng hiện “Cần xử lý”. Sau sửa ba test nhãn vi đều GREEN, năm test trạng thái chạy chung đều đạt. Fixture Chromium kiểm bảy trạng thái ở rộng 480 px trên cả nền sáng và tối. Native đã mở **Nâng cao → Bản nháp và phục hồi**. Library native thử không có bản nháp đang chờ. Nhãn ba trạng thái đã kiểm bằng fixture, trạng thái finding **fixed — chờ QA native (pending/invalid/deleted)**. [Trước](evidence/F-012-before.png) · [Sau](evidence/F-012-after.png).
- **F-020** · RED thiếu tên mô tả. GREEN Chromium và WebKit **1/1 mỗi engine**, không retry. Tooltip mở bằng hover/focus và đóng bằng Escape. Mô tả có sẵn qua `aria-describedby` kể cả trước khi mở tooltip. Test xác nhận phần tổng quan chỉ xuất hiện ở Trang chủ và hai mục vẫn điều hướng khi kích hoạt. [Trước](evidence/F-020-before.png) · [Sau](evidence/F-020-after.png).

## QA, dữ liệu và cổng phát hành

- QA native dùng WKWebView debug với bundle và profile riêng, Library sao chép từ fixture E1. Quan sát nhãn **Ghi nhớ**, **Quá hạn 2 ngày**, **Còn 6 ngày** và ngày tuyệt đối khi focus hàng. Cả hai tooltip sidebar hiện khi tab đến nút, Escape đóng tooltip, Enter mở Ôn tập. Ảnh native trên phiên CUA, ảnh trước/sau lưu từ Chromium. [AX native](evidence/LEARNING-COPY-native-AX.txt).
- Sau QA, 89/89 tệp Markdown ngoài thư mục quản trị có cùng SHA-256. Bản xuất SQLite của 5 lịch ôn, 4 lượt ôn, 5 thẻ khớp từng byte. Không chấm phiên ôn, áp dụng phục hồi hoặc chỉnh dữ liệu. Demo vault và fixture gốc sạch.
- Hook thường qua lint, TypeScript, build và 5.045 test frontend trong 506 tệp. Coverage frontend **87,85%** lines. Smoke curated đạt **54/54 trong 5,4 phút** ở hook. Lượt đo riêng với `--retries=0` đạt **54/54 trong 4,9 phút**. Rust `cargo test` **1.241 unit và 1 integration**, 3 ignored có sẵn. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1` đạt **86,41%** lines.
- Codacy CLI 0.24.0 local trên file app thay đổi. Baseline và bản cuối đều có **9** cảnh báo Medium, **0 Critical/High mới**. Phần số đo tăng nằm ở helper có thêm mô tả và tooltip. ESLint9 và Trivy không có issue. CodeScene: not run (optional integration unavailable).
- Dịch trực tiếp bảy key mới sang toàn bộ 18 catalog vì Lara credentials không có. `pnpm l10n:validate` đạt 1.109 khóa. Grep SPEC §8 **1 → 1 / 0 → 0**. Modern Web Guidance dùng cho phép so ngày theo lịch địa phương, tooltip mở khi hover/focus và thao tác phím sẵn có. Dùng shared Tooltip tương thích WKWebView.
- PostHog không cần event cho copy và định dạng. ADR, dependency và refactor riêng không phát sinh. Cập nhật CURRENT-STATE, FINDINGS, GLOSSARY và log đêm.
