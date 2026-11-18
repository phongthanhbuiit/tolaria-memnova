# R-09 và F-040 — Ổn định kiểm thử

Ngày 18/11/2026. Baseline `22952e90`. Các lượt khoanh vùng và nghiệm thu chạy Chromium, Node 24.12.0, một worker mỗi lượt, `--retries=0`. Library và browser context thử được tách khỏi dữ liệu thật. [Kết quả từng lượt](evidence/TEST-STABILITY-playwright.txt).

| Ca | Spec gốc | Chẩn đoán | Sau sửa |
|---|---:|---|---:|
| R-09 · Cmd+Shift+L từ editor | 0/10 | AI workspace mở. Spec tìm nhầm nút đóng của panel cũ | **20/20** |
| R-09 · Settings mặc định Stable | 0/10 | Shortcut đến trước khi giao diện sẵn sàng | **20/20** |
| R-09 · Chọn Alpha, lưu và mở lại | 0/10 | Fallback cũ gửi Enter mà chưa xác nhận đúng lệnh | **20/20** |
| F-040 · Xóa pending → Quick Open → Note B | 10/10 thường, 7/10 với CPU 4× chậm | Ở cả 3 lượt lỗi, Note B đã hiện nhưng chưa được chọn khi Enter tới | **20/20** |

## R-09 · Lỗi kiểm thử

- `ai-panel-shortcut.spec.ts` mở được `ai-panel` bên trong AI workspace bằng Cmd+Shift+L. Snapshot hiển thị button “Close AI workspace”. `AiWorkspace.tsx` hiển thị header riêng và dùng nhãn bản địa hóa `ai.workspace.close`. Lịch sử Git gắn nút đó với `78892c46`, trước F-005. Nút “Close AI panel” vẫn thuộc header của panel độc lập. Spec tìm theo role và tên truy cập của workspace, bấm đóng rồi xác nhận workspace ẩn.
- Hai ca Settings gốc đều hết thời gian tại assertion panel sau fallback. Trong probe phím tắt gốc, `networkidle` đã trả về nhưng ở keydown nút Settings chưa có và `defaultPrevented=false`. Khi nút Settings đã hiện, cùng cách gửi Cmd+, cho `defaultPrevented=true` và mở panel. Chuột trên status bar và lệnh chính xác “Open Settings” cũng mở được panel trên cùng mã app. Probe helper cũ trên UI đã sẵn sàng ghi nhận **3/3** lần Enter chạy “Use Dark Mode” vì test chỉ đợi một hàng `data-selected`, rồi panel Settings tiếp tục vắng mặt.
- Spec dùng Library fixture, chờ giao diện có thể nhận lệnh và ghim browser locale Anh. Ca Stable đi qua Cmd+,. Ca Alpha chọn đúng lệnh trong Command Palette, chọn Alpha, bấm Save, chờ panel đóng rồi mở lại bằng Cmd+,. Giữ kiểm tra giá trị mặc định, đủ Stable/Alpha, không có Beta và giá trị Alpha sau mở lại. Bỏ fallback và sleep 500 ms.

## F-040 · Lỗi readiness của kiểm thử

Spec gốc pass 10/10 khi chạy tập trung. Trong lane curated baseline, ca F-040 cũng pass. Probe riêng dùng CDP mô phỏng CPU chậm 4× và ghi DOM ở capture phase của Enter. Ca gốc tái hiện 3/10 lần cùng assertion H1 “Note B” từ log lịch sử. Cả ba lần input đã focus và danh sách có đúng Note B, nhưng hàng chưa được highlight nên Enter không mở ghi chú. `useNoteSearch.ts` reset index ở effect sau đổi query. `QuickOpenPalette.tsx` chỉ mở kết quả đang được chọn khi Enter được xử lý.

Spec đợi hàng Note B được highlight và ô tìm kiếm có focus rồi gửi Enter. Các assertion H1, xóa còn pending và thông báo sau hoàn tất giữ nguyên. Probe CPU chậm sau sửa đạt **10/10** và ghi đúng Note B đang được chọn ở mọi Enter. Một lượt trung gian dừng ở 6/10 vì server dùng chung đã thoát. Log ghi rõ bốn lỗi kết nối và lượt chạy đủ trên server riêng.

## Cổng phát hành

- Commit R-09 `95106c09` và F-040 `6074bb90`. Pre-commit R-09 3/3, F-040 2/2, không có retry thực tế.
- Node 24.12.0. Changed-file lint, `pnpm exec tsc -b` và `pnpm test` exit 0. Vitest đạt 5.041 ca trong 506 tệp.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` exit 0, 1.241 unit + 1 integration pass và 3 ignored sẵn có. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1` exit 0, **86,41%** lines.
- Push mã qua pre-push trong **8 phút 28 giây**. Build và `pnpm test:coverage` exit 0, frontend **87,84%** lines. Core curated **54/54 trong 4,6 phút**, 0 retry. Rust đã kiểm riêng vì hook tự bỏ qua Rust khi chỉ sửa test trình duyệt.

- Codacy CLI 0.24.0. Cấu hình repo giữ nguyên exclusions. Quét bổ sung phạm vi đúng ba spec thay đổi bằng cấu hình tạm ngoài repo, gồm ESLint9, Opengrep, Lizard và Trivy. So baseline với bản sửa **0 → 0 issues**, không có Critical/High mới.
- CodeScene: not run (optional integration unavailable). Localization: no UI copy changes. Validator đạt 18 catalog, 1.100 khóa. PostHog: không cần event vì chỉ sửa kiểm thử. Refactor và ADR: không có.
- Grep SPEC §8: **1 → 1 / 0 → 0**. Chưa chạy QA native vì thay đổi nằm ở kiểm thử Playwright. Probe xóa dùng fixture có thao tác xóa pending, trình duyệt xác nhận luồng mở ghi chú và thông báo. Hai demo vault ở checkout chính sạch.
