# FIX F-002 — Ngày theo ngôn ngữ giao diện

17/11/2026 · baseline `38c00bb5` · chỉ F-002. Một commit sửa finding; tham chiếu bằng subject `fix: localize note dates for selected UI language` để cả báo cáo và finding nằm cùng commit.

## Thay đổi

`dateDisplay` dùng Intl.DateTimeFormat theo `getLocaleDateLocale()` hiện có thay bảng tên tháng tiếng Anh; cache formatter theo AppLocale. Định dạng friendly theo ngôn ngữ, còn lựa chọn US/European/ISO giữ nguyên thứ tự số. Timestamp vẫn lấy ngày lịch local; ngày chỉ có year/month/day được dựng và định dạng với UTC, không bị lệch ngày theo múi giờ.

AppPreferencesProvider mang locale hiệu lực tới hàng ghi chú, chip ngày và tìm kiếm (cả cửa sổ chính/AI); các ô thuộc tính và thông tin ghi chú truyền locale đang có vào cùng formatter. Nhãn Created lấy từ key `noteList.sort.created` đã dịch đủ trong catalog, không thêm chuỗi cứng hoặc key mới. Các ngày cũ/tương lai ở Pulse cũng nhận locale hiện có. Không sửa bố cục, token, thứ tự/ngày nào được hiện, parser, định dạng ISO nhập liệu, Markdown hoặc lịch ôn. Các finding khác giữ trạng thái hiện có.

Phần sửa được chia thành formatter, đường truyền locale và các consumer của formatter để kiểm từng phần; tất cả thuộc cùng F-002. Không thêm dependency hoặc mô hình lưu trữ.

## Bằng chứng native

| Theme | Trước | Sau |
|---|---|---|
| Sáng | [ảnh](evidence/F-002-before-light.png) | [ảnh](evidence/F-002-after-light.png) |
| Tối | [ảnh](evidence/F-002-before-dark.png) | [ảnh](evidence/F-002-after-dark.png) |

Bundle `Memnova Dates F002 QA.app`, identifier `net.memnova.qa.datesF002`, incognito webview, Library và MEMNOVA_CONFIG_HOME riêng trong thư mục tạm. Tái sử dụng debug binary QA vì Rust không đổi; frontend live là mã sửa F-002. Binary kế thừa tên accessibility “Memnova Study B QA” / window “Memnova Foundation QA”; menu và Library “Dates F002 QA” xác nhận đúng bản QA.

- Trước sửa: Tất cả ghi chú, UI Việt nhưng hàng ngày hiện November / Created.
- Sau sửa: dùng chuột mở Settings, chọn English và Save → ngày trong cùng danh sách cập nhật sang tiếng Anh. Cmd+K → Vietnamese → Enter → cập nhật sang tiếng Việt ngay, không mở lại Library. Chuột mở Mục lục → Thông tin hiển thị ngày và nhãn Đã tạo tiếng Việt. Đối chiếu sáng/tối cùng ghi chú; Cmd+Q, xác nhận app đã thoát trong inventory.
- WKWebView/ICU hiển thị “ngày 16 tháng 11, 2026”, Node/Chromium hiển thị “16 tháng 11, 2026”; cùng ngày/tháng/năm và đúng ngôn ngữ. Không ép mọi engine dùng chuỗi hardcode giống nhau.
- [Kiểm bảo toàn dữ liệu](evidence/F-002-native-verification.json): 254/254 Markdown khớp SHA-256; sessions 5→5, reviews 4→4, schedules 5→5 khớp từng hàng; SQLite integrity_check ok, foreign_key_check rỗng. Không dùng thư viện cá nhân hoặc sửa demo vault.

## Kiểm tra

- TDD: hai regression test RED với tháng/Created tiếng Anh; sau sửa GREEN. Thêm kiểm tra Search subtitle và ô ngày giữ ISO khi hiển thị tiếng Việt; 150 test liên quan pass. Không sửa assertion hành vi hoặc timeout của test cũ.
- Lint, TypeScript build, Vite build pass. Frontend coverage: 492 file / **4.946 test pass**, **87,42% lines**, 83,65% statements, 75,66% branches, 85,24% functions (gate ≥70%). `pnpm test` pass cùng 492 file / 4.946 test; hook pre-commit pass lint/types và 94 file / 1.207 test liên quan. Hook pre-push cũng pass lint/build/full coverage; core smoke bị F-039 chặn như dưới.
- Formatter pass dưới TZ=America/Los_Angeles và TZ=Asia/Ho_Chi_Minh (4 test mỗi lượt); ngày ISO và ngày lịch timestamp local không đổi ngày.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` pass 1.240 test, 3 ignored, integration/docs pass. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1` pass **86,40% lines** (gate ≥85%).
- Codacy Analysis CLI 0.24.0: ESLint9/Trivy 0; Semgrep 6 warning props-spreading, Lizard 16 Medium, cùng số lượng mỗi rule với baseline; không quan sát thấy Critical/High mới. **Giới hạn:** Opengrep 1.26.0 có cùng lỗi parse PulseView.tsx ở baseline và current, file đó không được Opengrep phân tích. Thay đổi ở đó chỉ truyền locale vào hàm date hiện có, đã đọc diff và kiểm bằng lint/types/tests. Không báo scan sạch; CLI exit 1 vì warning/lỗi analyzer. [Chi tiết](evidence/F-002-codacy-summary.json). Giữ project exclusions cho unit test và tests/**; không upload source/results.
- CodeScene: not run (optional integration unavailable).
- Localization: tái sử dụng bản dịch `noteList.sort.created` hiện có, catalog không đổi; không cần dịch lại. `pnpm l10n:validate` pass 18 catalog × 1.013 key.
- PostHog: no event needed because chỉ sửa cách hiển thị ngày/nhãn, không có hành động mới. Refactoring: truyền locale qua abstraction hiện có, không thêm pipeline. ADRs: none. Docs: CURRENT-STATE, ARCHITECTURE, ABSTRACTIONS, FINDINGS và báo cáo này.
- Demo vault dirt checked: `git status --short -- demo-vault demo-vault-v2` rỗng; AGENTS.md của người dùng giữ nguyên SHA-256. Không stage skill/PLAN/SPEC đang untracked.
- Push: đã chạy `git push origin main` với hook bình thường. Lint/build và 4.946 test/coverage pass; smoke **53 passed / 1 failed, 0 flaky, 5,5 phút**. Ca Cmd+click wikilink F-039 thất bại cả retry, đã tái hiện baseline ở các bước trước. Hook trả exit 1; origin/main chưa cập nhật. [Log](evidence/F-002-pre-push.txt). F-002 đã commit local, chưa đạt điều kiện push của AGENTS; không sửa F-039/F-040/F-041 ngoài phạm vi hoặc bypass hook.

Hai lệnh SPEC §8 giữ **232→232** và **0→0**. Đây là sửa locale, không phải đợt dọn typography; không thêm font-size/height/radius hoặc CSS data-slot.

## Tham chiếu nền tảng

Tôi tra Modern Web Guidance bằng “format localized dates” và “Intl date formatting”, đọc guide js; không có quy tắc Intl formatter phù hợp cần áp dụng từ guide này. Dùng API Intl sẵn có, đối chiếu [MDN DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat): locale phải được chỉ định và timeZone phải tường minh khi định dạng calendar parts. Không thêm Temporal/polyfill hoặc chạy legacy scan.
