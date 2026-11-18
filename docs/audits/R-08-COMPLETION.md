# R-08 (P1) — Tạo ghi chú và dán vào tiêu đề

## Khoanh vùng

Probe ban đầu của D3 ghi nhận baseline `707bac53` đạt 3/3 và cuối D3 đạt 1/3. Phiên này chạy ba ca trên từng commit từ `707bac53` đến `b95c7193`, kể cả hai đầu mút, với chính các spec của từng mốc. Dùng Chromium, Node 24.12.0, một worker, `--repeat-each=5 --retries=0`, Vite và worktree riêng. Mỗi lần Playwright tạo browser context mới. Ca Cmd+N cũ dùng dữ liệu demo/mock của worktree. Hai ca còn lại dùng bản sao Library tạm. [Kết quả từng lượt](evidence/R-08-playwright.txt).

| Commit | Cmd+N / metadata | Dán HTML vào H1 | New Note từ Home |
|---|---:|---:|---:|
| `707bac53` · baseline | 3/5 | 4/5 | 5/5 |
| `4878968e` · placeholder H1 | 4/5 | 4/5 | 4/5 |
| `6b1e6200` · breadcrumb | 1/5 | 4/5 | 4/5 |
| `247911cc` · chrome editor | 0/5 | 4/5 | 4/5 |
| `bbdaf558` · fixture R-06 | 1/5 | 5/5 | 5/5 |
| `652b29af` · fixture R-07 | 1/5 | 3/5 | 5/5 |
| `b95c7193` · cuối D3 | 2/5 | 2/5 | 5/5 |

### Dấu hiệu và cách sửa

- **Cmd+N.** Spec dùng sidebar vừa xuất hiện làm tín hiệu sẵn sàng. Trên baseline, 2/5 lượt không có breadcrumb sau phím tắt. Ở `6b1e6200`, spec chuyển assertion breadcrumb từ text sang thuộc tính filename cùng với thay đổi giao diện. Các lượt lỗi vẫn báo *element(s) not found*. Spec mới mở bản sao Library bằng helper hiện có, đợi hàng ghi chú fixture hiển thị rồi gửi phím tắt thật. Giữ assertion tên tệp, kiểu `Note` và sự vắng mặt của `status:` trong Raw.
- **Dán HTML vào H1.** Baseline chèn payload trước hậu tố `uard`, ngay tại vị trí click. `End` chuyển con trỏ phía trình duyệt, còn handler paste dùng selection của ProseMirror. Spec mới đợi selection thu gọn và tới cuối H1 trong editor model rồi mới dispatch payload HTML. Giữ kiểm tra thứ tự tiêu đề, nội dung Markdown sau lưu, khả năng gõ tiếp và lỗi runtime. Trình duyệt lập lịch phát `selectionchange`. Thao tác gọi tiếp trong test có thể xảy ra trước khi editor xử lý sự kiện. [W3C Selection API](https://www.w3.org/TR/selection-api/#selectionchange-event).
- **New Note từ Home.** Focus của vùng contenteditable có thể xuất hiện trước khi H1 nhận con trỏ. Ca gốc sinh tiêu đề `rdinary journal` và tên tệp `rdinary-journal.md`, trong khi ký tự `O` xuất hiện ở thân bài. Lần chạy riêng với spec gốc trên `707bac53` đạt 19/20 và tái hiện đúng dấu hiệu ở lượt 9. Luồng focus cũ đặt title ở bước kế tiếp, xem `src/hooks/editorFocusUtils.ts`. Spec mới đợi caret ở H1, kiểm tra tiêu đề sau gõ, rồi đợi caret vào đoạn văn sau Enter. Giữ kiểm tra đường dẫn tệp, nội dung thân bài và ghi chú thường chưa bật học.

Ma trận gồm 105 lượt. Cuối D3 có 9/15 lượt pass, so với 12/15 ở baseline. Cả ba dấu hiệu đều tái hiện trên baseline khi tính cả probe riêng của Home. Chuỗi kết quả không cho thấy điểm chuyển pass/fail đơn điệu để gán một commit gây lỗi. Bản sửa chỉ chạm Playwright và sử dụng selection mà handler thực sự đọc. Đây là bằng chứng cho độ ổn định của cách kiểm thử cùng các assertion nêu trên. Độ trễ focus khi gõ trước tín hiệu readiness trên macOS native chưa được đo.

## Nghiệm thu

Chromium trên `de0c85bb` với bản sửa test đạt **60/60** trong 8 phút 32 giây. Cmd+N **20/20**, paste H1 **20/20**, Home **20/20**. Playwright ghi 0 retry, 0 flaky và 0 failure. Không thêm sleep, timeout hoặc retry.

```sh
pnpm exec playwright test create-note-default-properties.spec.ts \
  new-note-heading-paste-regression.spec.ts new-note-immediate-editability.spec.ts \
  -g 'keyboard-created|first typing|New Note command from Home' \
  --retries=0 --repeat-each=20 --workers=1
```

Ca paste dùng clipboard event tổng hợp với HTML và plain text trong Playwright. Ca Home dùng desktop bridge fixture, còn ca phím tắt gửi phím vào renderer. QA native chưa chạy vì thay đổi nằm ở harness trình duyệt. Kiểm tra trên Library tạm. Demo vault trong checkout chính sạch.

## Cổng phát hành

- Commit kiểm thử `71ee87bb`. Pre-commit chạy 5/5 ca trong các spec đã sửa và 54/54 core smoke, không có lượt retry.
- Node 24.12.0. `pnpm lint`, `pnpm exec tsc -b` và `pnpm test` đều exit 0. Vitest 506 tệp, 5.041 ca.
- `cargo test` chạy serial, 1.241 unit + 1 integration pass, 3 ignored có sẵn. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1` exit 0, **86,41%** lines.
- Push commit test qua pre-push trong **9 phút 43 giây**. Build và `pnpm test:coverage` exit 0, frontend **87,84%** lines. Core smoke **54/54** trong 4,8 phút, 0 retry. Hook bỏ qua Rust vì thay đổi chỉ ở test Playwright. Lượt Rust thủ công nêu trên đã đạt.
- Codacy CLI 0.24.0 local. Lượt với exclusions chuẩn xác nhận phạm vi chỉ gồm `tests/**`. Lượt bổ sung chỉ quét các tệp thay đổi bằng cấu hình riêng ngoài repo, gồm ESLint9, Opengrep, Trivy và Lizard. Kết quả 0 → 0 issues, không có Critical/High mới.
- CodeScene: not run (optional integration unavailable).
- Localization: no UI copy changes. `pnpm l10n:validate` đạt 18 catalog và 1.100 khóa. PostHog: không cần event vì chỉ chỉnh kiểm thử. Refactoring và ADR: không có. Grep SPEC §8: 1 → 1 và 0 → 0.
