# Bước B — trình bày màn ôn, 17/11/2026

Phạm vi FIX: F-027, F-028, F-029, F-034, F-015, F-016 theo DESIGN-SPEC §6. Chỉ sửa trình bày hai màn ôn, không đổi scheduler, hook phiên học, lưu dữ liệu, XP hay phím tắt. Các màn learning khác và CSS chung còn lại thuộc bước C.

| Finding | Kết quả | Commit mã nguồn |
|---|---|---|
| F-029 | `GradeButtons` dùng chung; hai owner giữ preview, readiness, khóa chấm, callback và XP | `def6ee51` |
| F-027 | Dialog 640px; header/body/footer thẳng mép 24px; header 56px, title một dòng 16/24, progress 2px; một vùng nhớ 18/28 tối thiểu 240px; reveal 40px; hành động phụ ở dưới | `62053c7a`, `96754f2a` |
| F-028 / F-015 | Outline trung tính 1px, cao 56px, dot 8px, phím 11/16 và khoảng ôn 12/18; 2×2 dưới 520px; hover 8%/40% | `87129845` |
| F-034 | Hoàn thành/chờ dùng display 20/28 và body-lg 14/22; một nút Close chính, giữ undo khi có | `3a1ff145` |
| F-016 | Current/total, bỏ review count ở header; đơn vị khoảng ôn đầy đủ; dùng “Back to note” đã có bản dịch | `60445d20` |

Các lần tách nhỏ F-027 cùng một finding; không gộp finding khác vào commit. F-015 là triệu chứng được SPEC thay bằng F-028. Các commit đều qua Git hooks bình thường.

## Số đếm SPEC §8

```bash
grep -rnE "text-\[[0-9.]+(px|rem)\]|fontSize:" src --include='*.tsx' --exclude='*.test.*' | wc -l
grep -rnE "\[data-slot=" src --include='*.css' | wc -l
```

| Lệnh | Trước B (`abb7826f`) | Sau B |
|---|---:|---:|
| Chữ tuỳ ý / inline fontSize | 309 | 307 |
| CSS có `[data-slot=` | 63 | 59 |

Hai dòng chữ tuỳ ý ở nhãn grade Legacy được thay bằng token. Bốn dòng CSS study ghi đè shared primitives được bỏ. Số không đổi ở các commit sau được ghi rõ trong commit body; không dọn các màn ngoài phạm vi chỉ để giảm số.

## Ảnh và kiểm tra trình bày

So sánh cùng fixture thật `tests/fixtures/note-memory-layout.html`, tiếng Việt, 1100×800, cùng nội dung canvas và đợi renderer sẵn sàng:

| Theme | Trước | Sau |
|---|---|---|
| Sáng | [before](evidence/step-B-light-before.png) | [after](evidence/step-B-light-after.png) |
| Tối | [before](evidence/step-B-dark-before.png) | [after](evidence/step-B-dark-after.png) |

Các ảnh `F-xxx-before.png` / `F-xxx-after.png` dùng cùng so sánh sáng này cho các finding cùng màn. Viền xanh khi gợi nhớ nhận focus là outline bàn phím, không phải một hộp nội dung thứ hai. Giữ nguyên bề mặt riêng của hình Excalidraw và trạng thái readonly của nó.

Mẫu [study.html](evidence/study.html) chỉ được Vite phục vụ khi truy cập trực tiếp, không được app import. Mẫu dùng `LearningStudyView` thật với dữ liệu giả, không phải bằng chứng về SQLite hay lịch ôn. Chạy lại phép đo:

```bash
bash ~/.codex/skills/playwright/scripts/playwright_cli.sh -s=memnova-step-b open http://localhost:5201/docs/audits/evidence/study.html
bash ~/.codex/skills/playwright/scripts/playwright_cli.sh -s=memnova-step-b run-code "$(cat docs/audits/evidence/verify-study.js)"
```

- [16 bộ số đo](evidence/step-B-measurements.json): hai theme × 480/519/520/1100px × nội dung ngắn/dài. Tiêu đề 200 ký tự vẫn một dòng; title/copy/grade thẳng mép; header 56px, progress 2px, chữ 18/28; grade đúng 56px/1px. Nội dung dài cuộn, vị trí header/footer giữ nguyên. Chạy đầu phép đo chặt hơn phát hiện grade 94px ở 520px; sửa padding theo bước 4px gần nhất để giữ bốn cột và đầy đủ nhãn, không hạ cỡ chữ.
- Ảnh bổ sung hai theme: `step-B-{light,dark}-{short,long,completed,waiting}-after.png`; mỗi trạng thái cuối có đúng một Close, chữ tiêu đề 20px. Space/1–4/Esc và reduced motion đạt. Script QA đợi reveal enabled trước khi gửi phím; không thay kiểm tra sản phẩm để vượt qua thời điểm renderer chưa sẵn sàng.
- Playwright Chromium: 20/20 test hiện có trong `note-memory-layout`, `note-memory-study`, `note-memory-workspace`, `saved-view-study` đạt, không retry (1,8 phút). Bao gồm ma trận 486 tổ hợp layout/zoom/theme/locale, contrast chữ và biên grade, readonly canvas, nguồn ảnh chưa xác minh chặn chấm, Legacy Space/phím số và phiên Saved View giữ ID.
- Playwright WebKit: 3/3 `note-memory-study` đạt, không retry (6,4 giây).

## Native và bảo toàn dữ liệu

App debug QA riêng `Memnova Study B QA.app`, bundle identifier `net.memnova.qa.studyB`; dùng bản sao binary debug đã có từ QA nền tảng (Rust không đổi), frontend hiện tại qua Vite. Window vẫn mang tên Foundation QA từ binary đó. Incognito webview và `MEMNOVA_CONFIG_HOME` riêng; Library sao chép ngoài repository. Không dùng Library thật hoặc demo-vault làm nơi ghi lượt thử.

Dùng computer-use bằng chuột: Tất cả ghi chú → UX verification → Properties → Ôn ghi chú này → Xem gợi nhớ → Quay lại ghi chú → mở gợi nhớ → Nhớ được → Hoàn tác. Esc đóng và trả focus về Ôn ghi chú này. Đổi theme qua nút status bar, mở lại, Space mở gợi nhớ, phím 3 chấm, Hoàn tác rồi đóng app QA. [Ảnh native sáng](evidence/step-B-native-light-after.png), [ảnh native tối](evidence/step-B-native-dark-after.png).

254/254 tệp Markdown khớp SHA-256 trước/sau. SQLite `integrity_check = ok`, `foreign_key_check` rỗng; sessions vẫn 5, reviews 2 → 4, hai review mới rating 3 đều có `undone_at`. Kiểm tra xác nhận lượt chấm/hoàn tác qua backend thật; không suy diễn từ fixture trình duyệt.

## Test, phân tích và phạm vi

- TDD: 22 test study ban đầu đạt. Ba test behavioral mới cho GradeButtons RED trước khi tạo component → 25 test liên quan GREEN. Kiểm tra callback cả bốn mức, disabled guard, dữ liệu/aria/test ID. CSS/layout áp dụng ngoại lệ TDD của AGENTS.
- Theo SPEC và phản hồi người dùng chọn Back to note, chỉ sửa **ba literal copy** trong test hiện có: `in 1 min.` → `in 1 minute`, hai selector `Return to article` → `Back to note`. Hai assertion unit đã RED với copy cũ rồi GREEN. Không bỏ/hạ assertion, đổi timeout, mock scheduler hay sửa test để che lỗi hành vi.
- Frontend release checks: `pnpm lint`, `pnpm exec tsc -b`, `pnpm build`, `pnpm test`, `pnpm test:coverage` đều đạt. Test và coverage: 492 file / 4.939 test; **87,41% lines** (83,64% statements, 75,62% branches, 85,23% functions).
- Rust: `cargo test --manifest-path src-tauri/Cargo.toml` đạt (1.240 unit, 3 ignored, các integration/doc test đạt). `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85` đạt **86,40% lines**.
- Codacy Analysis CLI 0.24.0, auto config/SARIF ngoài source, không upload: ESLint9 0, Trivy 0, Stylelint 0; Semgrep 2 warning props spreading (baseline 1); Lizard 9 Medium (baseline 10). Warning mới GradeButtons chỉ spread kiểu đóng gồm `aria-label`/`data-testid` do owner cung cấp, không nhận dữ liệu bên ngoài, không override callback/disabled. Các warning Lizard là độ dài/nhánh của owner cũ và script kiểm tra layout; không phải lỗi bảo mật. Parser gộp callback/nested function khiến số NLOC không tương đương kích thước function thực. Đã review, không silence rule hay đổi code chỉ để làm đẹp điểm. **Không có Critical/High mới**, không analyzer error lượt cuối.
- CodeScene: not run (optional integration unavailable).
- Localization: dùng lại `editor.noteMemory.backToNote` có sẵn trong mọi locale; Intl long/unit formatting dịch đơn vị theo locale; không thêm catalog key. `pnpm l10n:validate` đạt 18 catalog / 1.013 khóa.
- PostHog: no event needed because chỉ thay trình bày và copy, không có hành động mới. Event/XP của owner cũ được giữ nguyên.
- Refactoring: GradeButtons dùng chung, không tách hoặc đổi storage/scheduler/editor pipeline. ADRs: none. Docs: ARCHITECTURE, ABSTRACTIONS, CURRENT-STATE, FINDINGS và biên bản này.
- Demo vault dirt checked: `git status --short -- demo-vault demo-vault-v2` rỗng. Giữ nguyên thay đổi người dùng ở AGENTS.md và các file skill/SPEC/PLAN chưa được theo dõi.

## Modern Web Guidance

Đã tìm và đọc `dialog`, `css-layout`, `color` trước khi sửa. Dùng CSS grid `minmax(0, 1fr)` và vùng body `overflow-y: auto`, giữ header/footer ở ngoài vùng cuộn. Biên nút dùng hỗn hợp hai token trung tính hiện có để đạt 3:1 (border chung quá nhạt), chữ vẫn theo token đạt 4.5:1; forced-colors dùng màu hệ thống. Giữ Dialog Radix/shadcn theo hợp đồng sản phẩm và test, không thay bằng native dialog hoặc thêm polyfill. WebKit và native debug đã kiểm tra giao diện thực tế.

## Trạng thái push

`git push origin main` trên `715aa8b5` chạy hook bình thường: workflow regression, lint, build và coverage đều đạt (492 file / 4.939 test; 87,41% lines). Rust được hook bỏ qua vì không có thay đổi Rust; hai lệnh đầy đủ đã chạy riêng và đạt như trên. Core smoke kết thúc **53 passed / 1 failed trong 6,0 phút**, ca F-039 thất bại cả retry, H1 nhận chuỗi rỗng thay vì “Manage Sponsorships”. [Trích log pre-push](evidence/step-B-pre-push.txt).

Hook chặn push; các commit A/B vẫn chỉ ở local main, **chưa push và chưa release-ready**. F-039 đã được chứng minh lỗi baseline ở bước A; không sửa wikilink, fixture, timeout hoặc bypass hook trong bước B. Cần xử lý F-039 riêng rồi chạy lại pre-push. Biên bản/evidence cuối được amend qua pre-commit bình thường; mã sản phẩm không đổi sau lượt pre-push này.
