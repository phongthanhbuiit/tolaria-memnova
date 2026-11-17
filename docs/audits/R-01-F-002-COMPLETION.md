# R-01 — hoàn tất F-002

17/11/2026 · baseline `7fb7dc5a` · mã cuối `9c951e78` · chỉ F-002.

**F-002: fixed (`9c951e78`).** Sáu mục sửa và tiêu chí locale/QA/coverage đã đạt. Push mã nguồn đã thành công qua hook nguyên trạng; **F-039 vẫn flaky**, không được coi là smoke sạch. Các finding khác giữ nguyên kết luận.

## Sáu commit và bằng chứng TDD

| Mục | Trước → sau | Commit | Test RED → GREEN |
|---|---|---|---|
| 1. Hợp đồng formatter | Bốn formatter có locale mặc định `en` → locale bắt buộc, TypeScript kiểm mọi caller. Caller production vốn đã truyền locale từ fix đầu; không thêm fallback ở tầng khác. Caller test được truyền `en` tường minh. | `7f74d212` | [RED type contract](evidence/R-01-1-red.txt), [GREEN](evidence/R-01-1-green.txt). `dateDisplay.test-d.ts` kiểm cả bốn tuple tham số bắt buộc; `dateDisplay.test.ts`: 7 ca, có en/vi/ru, ISO/date parts/local midnight và định dạng số. |
| 2. Calendar | DayPicker mặc định Anh và tháng theo locale hệ điều hành → mapping AppLocale duy nhất tại `calendarLocale.ts`, dùng locale date-fns có sẵn được DayPicker mở rộng với aria-label. Properties, AddPropertyForm, learning editor truyền locale; caller khác lấy locale hiệu lực từ context. | `24f29701` | [RED](evidence/R-01-2-red.txt), [GREEN](evidence/R-01-2-green.txt). 4 ca với DayPicker thật: en/vi/ru, tháng/aria, chọn ngày và đổi locale ngay trên lịch đang mở. Ba consumer Properties được render lại trong sweep. |
| 3. Bộ lọc ngày | `MMMM d, yyyy`/`MMM d, yyyy`, title/aria/preview/hint tiếng Anh → formatter chung với locale hiệu lực và 6 key catalog. Dòng lưu `format(day, 'yyyy-MM-dd')` giữ nguyên. | `3b45d975` | [RED](evidence/R-01-3-red.txt), [GREEN](evidence/R-01-3-green.txt); [RED placeholder](evidence/R-01-3-placeholder-red.txt), [GREEN](evidence/R-01-3-placeholder-green.txt). 4 ca en/vi/ru và đổi locale; chọn ngày trả ISO, parser tương đối cũ vẫn được test. Chỉ cập nhật hai assertion title ngày trong FilterBuilder. |
| 4. Git history | today/yesterday/Nd/Nmo ago cứng → Intl.RelativeTimeFormat theo locale, tự chia dạng ngày/tháng và số nhiều. Giữ ngưỡng cũ và callback mở diff. | `21e8148e` | [RED](evidence/R-01-4-red.txt), [GREEN](evidence/R-01-4-green.txt). 4 ca en/vi/ru với 0/1/2/5 ngày, 1/2/5 tháng, đổi locale và click diff. 69 test liên quan pass. |
| 5. relativeDate | just now/Nm/Nh/Nd ago cứng → Intl.RelativeTimeFormat cùng locale với nhánh ngày tuyệt đối. Giữ các ngưỡng và nhánh tương lai/cũ. | `b42fba81` | [RED](evidence/R-01-5-red.txt), [GREEN](evidence/R-01-5-green.txt). 4 ca en/vi/ru, null, tương lai, ngày cũ và chính xác ranh giới 60/3.600/86.400/604.800 giây. |
| 6. Subtitle/Search | N words/Empty/link(s), en-US và số nhiều bằng `=== 1` → helper chung, Intl.PluralRules, số theo locale và 9 key catalog. | `9c951e78` | [RED](evidence/R-01-6-red.txt), [GREEN](evidence/R-01-6-green.txt). 8 ca en/vi/ru/pl cho cả hai formatter, số 1/2/5/21, phân cách 1.234/1,234/1 234 và Empty; entry không bị sửa. Thêm sweep 8 bề mặt thật. |

Mỗi mục là một commit riêng, subject có `R-01/F-002`. Tất cả commit dùng hook bình thường. Chỉ các assertion cũ thuộc ngày trong FilterBuilder, GitHistoryPanel và relativeDate được cập nhật; không sửa test F-039/F-040/F-041, assertion khác hoặc timeout.

## Lệnh, exit code và coverage

Các lệnh frontend/Git/Codacy chạy với `PATH` ưu tiên Node **24.19.0**, pnpm **10.27.0**. Shell ban đầu là Node 18; wrapper pnpm mặc định của môi trường định gọi runtime khác và dừng trước khi chạy test (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Đã dùng pnpm cài sẵn dưới NVM với `env node` trỏ Node 24; không cài lại dependency/đổi lockfile. Tất cả bằng chứng release bên dưới là Node 24.

| Lệnh đã chạy | Exit | Kết quả / log |
|---|---:|---|
| `pnpm exec vitest run --typecheck.only --typecheck.tsconfig /tmp/R-01-typecheck.json src/utils/dateDisplay.test-d.ts` | RED 1 → GREEN 0 | [Cấu hình kiểm kiểu](evidence/R-01-typecheck-config.json), bằng chứng mục 1. `pnpm exec tsc -b` cũng kiểm file hợp đồng này. |
| `pnpm exec vitest run` với file test mục 2–6 trong bảng trên | RED 1 → GREEN 0 | Các log RED/GREEN theo từng mục. Mục 6 sweep kiểm cả chữ hiển thị, `title`, `aria-label`, **placeholder**; không bỏ qua ví dụ tiếng Anh. |
| `TZ=America/Los_Angeles pnpm exec vitest run --maxWorkers=1 "${R01_TEST_FILES[@]}"` | 0 | [32/32 test, 7 file](evidence/R-01-timezone-la.txt), không lệch ngày. |
| `TZ=Asia/Ho_Chi_Minh pnpm exec vitest run --maxWorkers=1 "${R01_TEST_FILES[@]}"` | 0 | [32/32 test, 7 file](evidence/R-01-timezone-hcm.txt), không lệch ngày. |
| `pnpm lint` | 0 | [Log](evidence/R-01-lint.txt). |
| `pnpm exec tsc -b` | 0 | [Log](evidence/R-01-types.txt); không có caller production thiếu locale sau khi bỏ default. |
| `pnpm test` | 0 | [498 file / 4.974 test pass](evidence/R-01-test.txt). |
| `pnpm test:coverage` | 0 | [498 file / 4.974 test; **87,46% lines**](evidence/R-01-coverage.txt), 83,69% statements, 75,75% branches, 85,31% functions. Gate ≥70% đạt. |
| `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` | 0 | [1.240 unit pass, 3 ignored; integration/docs pass](evidence/R-01-rust-test.txt). Root không có Cargo.toml nên dùng manifest của app. |
| `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1` | 0 | [**86,40% lines**](evidence/R-01-rust-coverage.txt); gate ≥85% đạt. Không đổi Rust. |
| `pnpm l10n:validate` | 0 | [18 catalog / 1.028 key](evidence/R-01-l10n.txt). |
| `pnpm dlx @codacy/analysis-cli@0.24.0 init --auto --config-file /tmp/R-01-codacy.json` | 0 | [Auto config ngoài source](evidence/R-01-codacy-init.txt), giữ exclusions từ `.codacy.yaml`. |
| Codacy `analyze` baseline/current với 4 analyzer, lệnh dưới đây | 1 / 1 | Warning có sẵn; không có lỗi analyzer, không có Critical/High mới. [Baseline](evidence/R-01-codacy-base.txt), [current](evidence/R-01-codacy-final.txt), [đối chiếu rule và hash file](evidence/R-01-codacy-summary.json). |
| Hai grep SPEC §8 | 0 / 0 | **232 → 232**, **0 → 0** trên cả sáu commit; không thêm typography, token, cỡ điều khiển, bố cục hoặc CSS data-slot. |
| `git status --short -- demo-vault demo-vault-v2` | 0 | Output rỗng; không dùng Library cá nhân. |
| `git push origin main` (mã `9c951e78`) | 0 | [Log đầy đủ](evidence/R-01-pre-push.txt): lint/build/coverage pass, **53 passed / 1 flaky**, 4,9 phút core smoke; tổng hook 8 phút 18 giây. F-039 fail lượt đầu, pass retry cấu hình sẵn. Remote đã nhận `f78b8fb9..9c951e78`. |

Danh sách test đầy đủ dùng trong hai lệnh TZ:

```sh
R01_TEST_FILES=(
  src/utils/dateDisplay.test.ts
  src/components/ui/calendar.locale.test.tsx
  src/components/filter-builder/DateValueInput.locale.test.tsx
  src/components/inspector/GitHistoryPanel.locale.test.tsx
  src/utils/noteListHelpers.relative.test.ts
  src/utils/noteListHelpers.counts.test.ts
  src/components/localizedDates.sweep.test.tsx
)
```

Các lượt ghi log chạy bảy đường dẫn tường minh, tương đương mảng trên. [Danh sách lệnh và exit code đầy đủ](evidence/R-01-commands.json). Test ISO/date-only dùng ngày 1/1 và timestamp lúc nửa đêm local; test Calendar/filter chọn ngày và so callback Date/ISO trong cả hai TZ.

Lệnh Codacy (baseline dùng `/tmp/R-01-base`, chỉ bỏ file mapping mới chưa tồn tại):

```sh
pnpm dlx @codacy/analysis-cli@0.24.0 analyze . \
  --config-file /tmp/R-01-codacy.json \
  --files src/utils/dateDisplay.ts src/lib/calendarLocale.ts \
  src/components/ui/calendar.tsx src/components/PropertyValueCells.tsx \
  src/components/AddPropertyForm.tsx src/components/learning/PropertyValueEditor.tsx \
  src/components/filter-builder/DateValueInput.tsx \
  src/components/inspector/GitHistoryPanel.tsx src/utils/noteListHelpers.ts \
  --tool ESLint9 --tool Semgrep --tool Lizard --tool Trivy \
  --output-format sarif --output /tmp/R-01-final.sarif
```

ESLint9 và Trivy: 0 issue. Opengrep/Semgrep: 13 warning props-spreading; Lizard: 3 NLOC Medium + 1 CCN Medium, cùng rule/count với baseline. Đã xem các warning có sẵn, không thấy lỗi mới ở nhánh locale hoặc đường nhập/lưu. Không upload source/results hay kết nối tài khoản. Lượt baseline chuẩn bị đầu tiên exit 2 do archive chưa có `.git`; đã khởi tạo Git **trong thư mục so sánh tạm**, chạy lại đầy đủ, không dùng kết quả lượt lỗi làm bằng chứng.

## Kết quả push và giới hạn release gate

Đã chạy `git push origin main` trên Node 24, **exit 0**. Khác dự đoán ban đầu, hook hiện có cho qua khi ca F-039 pass ở retry: lượt đầu Cmd+click còn ở H1 “Grow Newsletter”; retry pass. Không đổi cấu hình retry, assertion, timeout hoặc hook; không dùng `--no-verify`. Vì vậy đây là **push thành công có flaky**, không phải bằng chứng F-039 đã được sửa hoặc core smoke ổn định không retry. F-039/F-040/F-041 giữ nguyên kết luận trong FINDINGS. Các gate frontend và Rust ở bảng trên đã chạy riêng với exit 0; hook còn chạy lại frontend build/coverage. Rust trong hook được bỏ qua theo cơ chế change detection vì Rust không đổi, không thay thế hai lệnh Rust đã chạy riêng.

Báo cáo/bằng chứng và trạng thái finding được commit sau lượt push mã nguồn để ghi kết quả thực tế. Push tài liệu cuối được ghi trong `R-01-docs-push.txt`; hook docs-only nguyên trạng vẫn được thực thi.

## QA native: chuột trước, bàn phím sau

App QA riêng, bundle `net.memnova.qa.r01`, `MEMNOVA_CONFIG_HOME` và Library riêng. Binary debug QA kế thừa cấu hình Tauri `net.memnova.qa.foundation`, `incognito: true`, live frontend `http://localhost:5201`. Cả các section `__TEXT` (code, string và constant) khớp binary/cấu hình QA gốc; không suy đoán incognito từ tên app. [Cấu hình và hash section](evidence/R-01-native-configuration.json). Tên accessibility kế thừa “Memnova Study B QA” / window “Memnova Foundation QA”; menu “Memnova R01 QA” và Library “R-01 Dates QA” xác nhận phiên QA. Không dùng `net.memnova.app`, HOME hoặc preferences thật.

- Chuột: mở note → Properties → Date; mở dropdown tháng, đọc nhãn tháng/thứ/năm và accessibility labels. Git history được mở cùng Properties, cuộn bằng chuột tới mốc “Hôm kia” / “2 days ago”. Git fixture tạo local, không có remote.
- Chuột: Edit → Find in Vault → nhập Reading; subtitle đổi ngày, Created/Đã tạo, từ và liên kết theo locale.
- Chuột: context menu Saved View → Edit View → before → mở Calendar; chọn ngày 19 → ô nhập trả `2026-11-19`, preview/title/aria cùng ngày. Bộ lọc chỉ được QA trên bản nháp; thay đổi thử của `views/capture-qa.yml` được khôi phục từ bản fixture đầu.
- Chuột: Settings → Language → English → Save, rồi đổi lại Vietnamese trong cùng phiên, không mở lại Library cho lần đổi ngôn ngữ; đối chiếu cả sáng và tối. Có khởi động lại riêng lúc chuẩn bị Git fixture, trước ma trận ngôn ngữ.
- Bàn phím sau đường chuột: Esc đóng Calendar/dropdown; `osascript` Cmd+Shift+F mở Search từ editor, Esc đóng Search. Không dùng osascript để giả định editor đã nhập được. Cmd+Q thoát QA, inventory sau đó không còn bundle QA chạy.
- [AX snapshots thực tế](evidence/R-01-native-AX.txt) kèm ảnh bên dưới. Đây là QA targeted của F-002, không phải chứng nhận toàn app/VoiceOver.

| Bề mặt | Việt sáng | Việt tối | Anh sáng | Anh tối |
|---|---|---|---|---|
| Properties Calendar | [ảnh](evidence/R-01-properties-vi-light.png) | [ảnh](evidence/R-01-properties-vi-dark.png) | [ảnh](evidence/R-01-properties-en-light.png) | [ảnh](evidence/R-01-properties-en-dark.png) |
| Bộ lọc ngày | [ảnh](evidence/R-01-filter-vi-light.png) | [ảnh](evidence/R-01-filter-vi-dark.png) | [ảnh](evidence/R-01-filter-en-light.png) | [ảnh](evidence/R-01-filter-en-dark.png) |
| Git history | [ảnh](evidence/R-01-history-vi-light.png) | [ảnh](evidence/R-01-history-vi-dark.png) | [ảnh](evidence/R-01-history-en-light.png) | [ảnh](evidence/R-01-history-en-dark.png) |
| Search | [ảnh](evidence/R-01-search-vi-light.png) | [ảnh](evidence/R-01-search-vi-dark.png) | [ảnh](evidence/R-01-search-en-light.png) | [ảnh](evidence/R-01-search-en-dark.png) |

Trước sửa: [sáng](evidence/R-01-before-light.png), [tối](evidence/R-01-before-dark.png). Thêm: [dropdown tháng Việt](evidence/R-01-months-vi-dark.png), [preview Việt](evidence/R-01-preview-vi-dark.png).

[Kiểm bảo toàn dữ liệu sau QA](evidence/R-01-native-verification.json): 254/254 Markdown khớp SHA-256; sessions 5→5, reviews 4→4, schedules 5→5 khớp từng hàng; integrity_check ok, foreign_key_check rỗng, Saved Views khôi phục đúng fixture. Không sửa parser/frontmatter/ISO nhập liệu/sort/lịch ôn. Các thay đổi nguồn không chạm pipeline lưu.

## Localization, code health và giới hạn

- **Localization:** dịch tay 15 key mới vào toàn bộ 16 target `lara.yaml`, thêm catalog be-Latn hiện có; không có Lara credential. [Danh sách key/catalog và kiểm placeholder](evidence/R-01-localization.json). Giữ nguyên `{date}`/`{count}`. Calendar dùng dữ liệu dịch date-fns/DayPicker đã cài, không thêm dependency.
- **CodeScene: not run (optional integration unavailable).** Không tự tạo điểm hoặc hạ ratchet. Các hook cũng ghi rõ không cấu hình token/project.
- **PostHog: no event needed because** đây là sửa hiển thị ngày/số, không thêm hành động người dùng; event riêng sẽ tạo nhiễu.
- **Refactoring:** chỉ gom phần đếm subtitle bị lặp vào helper dùng chung và mapping Calendar locale một chỗ. Không đổi abstraction lưu dữ liệu. **ADRs:** none.
- **Docs:** `ABSTRACTIONS.md` mô tả Calendar locale; `CURRENT-STATE.md`, phần F-002 của FINDINGS và báo cáo này ghi trạng thái mới. Không stage thay đổi có sẵn của người dùng ở AGENTS.md, `.agents/`, APP-AUDIT-PLAN hoặc DESIGN-SPEC.
- **Giới hạn engine:** Node/Chromium có thể hiện “16 tháng 11, 2026”, WKWebView hiện “ngày 16 tháng 11, 2026”; cùng ngày và locale. Không hardcode ICU để làm chuỗi giống nhau. date-fns không có lịch Belarus Latin riêng: be-Latn dùng locale Belarus có sẵn; bản dịch copy mới vẫn là Latin. Native chỉ kiểm en/vi, unit có ru/pl như yêu cầu.
- **Giới hạn scope:** các nhãn chrome tiếng Anh khác như History/Edit View/Search footer nằm ngoài R-01, không tuyên bố đã dịch toàn app. Không sửa F-039/F-040/F-041. Kết quả release/push được ghi đúng theo hook, không thay assertion, timeout hay dùng `--no-verify`.

## Đối chiếu Modern Web Guidance

Đã search “format localized dates”, “date picker input”, “label interactive controls”; đọc `capture-location-agnostic-data`, `support-global-calendar-systems`, `js`, `accessibility`. CLI npx thành công; `pnpx` không có trong shell. Không chạy legacy-scan hoặc lấy guide CSS không liên quan.

- **accessibility:** tôi giữ accessible name riêng đã dịch cho nút icon thay vì dựa vào tooltip/title (“Don't use `title` as a naming mechanism”). Calendar truyền cả locale có ARIA translations; unit kiểm role/name và native AX kiểm tháng/thứ/dropdown/ngày.
- Các guide Temporal ghi “Unsupported in: Safari.” Việc đổi parser/mô hình ngày hoặc thêm polyfill trái ràng buộc R-01; giữ Date/Intl và date-fns hiện có, đối chiếu ranh giới TZ. Guide `js` không có quy tắc Intl formatter cần chuyển API trong phạm vi này. Không áp dụng calendar mới hoặc thay shared controls đang hoạt động.

Đối chiếu API theo [DayPicker v9 localization/PropsBase](https://daypicker.dev/v9/api/interfaces/PropsBase) và code dependency đã cài (DayPicker 9.13.2, date-fns 4.1); [ECMA-402](https://www.ecma-international.org/wp-content/uploads/ECMA-402.pdf) cho RelativeTimeFormat/PluralRules. Không đổi ngưỡng thời gian theo một lịch tính mới.
