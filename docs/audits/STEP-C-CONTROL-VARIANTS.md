# Bước C — bỏ CSS chọn nội bộ component, 17/11/2026

Phạm vi FIX: **F-026** theo DESIGN-SPEC. Commit mã nguồn: `a2428886`. Không sửa scheduler, hook phiên học, pipeline lưu, copy, dependency hoặc schema. Thực hiện thành ba phần nhỏ: API UI opt-in → call site learning → bỏ selector CSS. Mỗi phần được kiểm tra trước khi chạy suite cuối; toàn bộ finding nằm trong một commit mã nguồn.

## Kết quả

- Bỏ 57 dòng selector trong `learning/noteMemory.css` và `learning/cardEditor.css`. CSS còn lại chỉ giữ bố cục/trạng thái riêng của tính năng, không chọn nội bộ shared primitives.
- Bỏ nốt hai luật cùng loại trong `Editor.css` để đạt tiêu chí grep toàn `src/**/*.css = 0`. Bốn call site breadcrumb dùng `Button` variant/size `toolbar`; giữ auto width/height, padding 0, radius 0 và hover trong suốt. Đây là phần chuyển quyền sở hữu style, không phải đợt thiết kế breadcrumb D3. Dùng mức cao tối thiểu gần nhất `sm` 28px và chiều rộng nội dung vốn có.
- `Button`, `Input`, `Textarea`, `SelectTrigger`/`SelectItem`, `TabsTrigger`, `DropdownMenuItem` có layout `responsive` opt-in: wrapping và vùng chạm 44px trên coarse pointer. Size sm/md/lg dùng token 28/32/36px. `Switch size="responsive"` sở hữu track/thumb và vùng chạm trước đây nằm trong CSS learning.
- `DialogContent size` sở hữu khung 440/560/640px và 1000px cho so sánh, gồm bù app zoom và giới hạn viewport. Form dùng 560px; preview readonly 640px; conversion/recovery hai cột dùng 1000px. `DialogHeader variant="panel"` có lề 24px, description `caption` dùng token small. Dialog không chọn size và controls không chọn layout mới giữ mặc định cũ.
- `NoteAutocomplete` truyền tùy chọn trình bày tới Input và kết quả Button; không sửa lọc, selection, phím tắt hoặc focus. Các API persistence và toàn bộ handler ở owner giữ nguyên. Nút primary của panel trở lại style `default` do primitive cung cấp sau khi bỏ luật làm nó xám; không triển khai các mục D1 khác hoặc đánh dấu F-014 đã xong.

## Số đếm SPEC §8

```bash
grep -rnE "text-\[[0-9.]+(px|rem)\]|fontSize:" src --include='*.tsx' --exclude='*.test.*' | wc -l
grep -rnE "\[data-slot=" src --include='*.css' | wc -l
```

| Lệnh | Trước (`28963157`) | Sau |
|---|---:|---:|
| Chữ tùy ý / inline fontSize | 307 | 307 |
| CSS có `[data-slot=` | 59 | **0** |

Có thể kiểm thêm bằng `grep -rFn '[data-slot=' src --include='*.css'` — không có kết quả. Không chuyển selector sang `[role]`, tên thuộc tính khác hay CSS feature mới để né grep. Style reusable được primitive sở hữu và caller chọn bằng props. Dọn typography call site còn lại thuộc bước D nên số thứ nhất giữ nguyên.

## Bằng chứng trình duyệt

16 ảnh trước và 16 ảnh sau, cùng fixture `tests/fixtures/note-memory-layout.html`, tiếng Việt, 1100×800, theme sáng/tối. Các bề mặt: panel, conversion, recovery, source, toolbar, inspector, dashboard, tabs.

| Bề mặt | Sáng trước/sau | Tối trước/sau |
|---|---|---|
| Panel | [trước](evidence/step-C-light-panel-before.png) / [sau](evidence/step-C-light-panel-after.png) | [trước](evidence/step-C-dark-panel-before.png) / [sau](evidence/step-C-dark-panel-after.png) |
| Chuyển đổi | [trước](evidence/step-C-light-conversion-before.png) / [sau](evidence/step-C-light-conversion-after.png) | [trước](evidence/step-C-dark-conversion-before.png) / [sau](evidence/step-C-dark-conversion-after.png) |
| Chọn nguồn | [trước](evidence/step-C-light-source-before.png) / [sau](evidence/step-C-light-source-after.png) | [trước](evidence/step-C-dark-source-before.png) / [sau](evidence/step-C-dark-source-after.png) |

`F-026-before.png` / `F-026-after.png` là cặp conversion sáng. [Script chụp lại bản sau](evidence/capture-controls.js) dùng Playwright CLI với server hiện có port 5201; mẫu renderer không phải bằng chứng SQLite/native.

Chromium: **24/24**, không retry (3,2 phút), gồm `memnova-card-editor`, `note-memory-layout`, `note-memory-study`, `note-memory-workspace`. Đã kiểm ma trận 486 tổ hợp cửa sổ/zoom/theme/locale, coarse targets, tương phản, reduced motion, focus trở lại khi đóng chooser/conversion/recovery, 1000 note và keyboard navigation. Editor giữ draft khi thu gọn, Cancel, Save, chuyển kiểu, nguồn và metadata; study giữ readonly canvas, readiness và Space/phím số. Hai ca menu/conversion chạy lại sau khi chốt min-height menu: 2/2 pass (21,2 giây), không retry.

WebKit: **8/8**, không retry (1,5 phút), gồm toàn bộ `memnova-card-editor` và `note-memory-study`, trên form 560px cuối cùng. Các test hành vi hiện có không bị hạ assertion, tăng timeout hay thay mock để vượt gate.

## Native và dữ liệu

Ban đầu CUA báo máy khóa dù người dùng nhìn thấy desktop. Reset phiên vẫn báo lỗi; sau khi người dùng tắt/mở lại, lần kết nối tiếp theo hoạt động. Chưa xác định nguyên nhân công cụ; **native QA cuối đã thực hiện được**, không dùng kết quả trình duyệt thay cho xác minh native.

App riêng `Memnova Controls C QA.app`, identifier `net.memnova.qa.controlsC`, incognito webview, preferences và Library sao chép trong thư mục tạm ngoài source. Binary debug dùng lại từ QA nền tảng vì Rust không đổi, frontend hiện tại qua Vite. Window title Foundation QA và tên app AX Study B QA còn từ bản sao; thanh menu/Library hiển thị Controls C QA. Không dùng Library thật hoặc demo-vault để ghi dữ liệu thử.

Thao tác bằng chuột trước:

1. Mở UX verification và Properties. Tắt/bật học, xác nhận nút Study ẩn/hiện và lịch giữ nguyên.
2. Mở Page properties, tạo draft `qa_draft_only` kiểu số, nhập 42, thu gọn/mở lại vẫn giữ 42. Hủy dialog; mở lại có 0 thuộc tính. Không Save draft thử.
3. Mở Sửa gợi nhớ → Chọn nguồn → tìm Reading 13 → chọn kết quả bằng chuột. Chọn mặt Article bằng bàn phím, xem preview readonly. Esc hủy và focus về Chọn nguồn; không áp dụng nguồn.
4. Đổi theme qua status bar, kiểm form tối, mở phiên ôn, Space mở gợi nhớ, Esc đóng và focus về Ôn ghi chú này. Không chấm thêm review. App QA đã đóng.

Ảnh native: [panel sáng](evidence/step-C-native-light-panel-after.png), [panel tối](evidence/step-C-native-dark-panel-after.png), [form sáng](evidence/step-C-native-light-form-after.png), [form tối](evidence/step-C-native-dark-form-after.png), [source](evidence/step-C-native-light-source-after.png), [study](evidence/step-C-native-dark-study-after.png).

[Kết quả bảo toàn](evidence/step-C-native-verification.json): **254/254 Markdown khớp SHA-256**, schedules/reviews khớp từng hàng với bản sao trước QA; sessions 5 → 5, reviews 4 → 4, `integrity_check = ok`, `foreign_key_check` rỗng. Mtime của note được bật/tắt học đổi theo thao tác thật; nội dung cuối khớp byte.

## Check suite và phân tích

- Pre-commit bình thường: lint/types và 492 file / **4.939 test** pass. Không bypass Git hook. Đây là CSS/layout và API trình bày, áp dụng ngoại lệ TDD của AGENTS.
- Một test breadcrumb cũ đọc CSS source và bắt buộc selector bị cấm tồn tại. Lượt đầu RED đúng vì selector đã bỏ; thay bằng kiểm tra nút được render vẫn có auto width/height, padding/radius 0 và hover trong suốt. 18 test breadcrumb/autocomplete liên quan GREEN. Không sửa assertion hành vi khác. [Đối chiếu JSX](evidence/step-C-contract.json) ghi 763 thuộc tính handler/disabled/value/checked/aria/data/id giữ nguyên biểu thức nguồn qua 40 file; size/variant props thay đổi có chủ ý để chọn style.
- `pnpm lint`, `pnpm exec tsc -b`, `pnpm build` đạt. `pnpm test:coverage` chạy lại đạt 492 file / 4.939 test, **87,41% lines** (83,64% statements, 75,64% branches, 85,24% functions). Lần coverage đầu có test `App > shows keyboard shortcut hints` không chờ thấy New Note đúng hạn; file App chạy lại **37/37** pass, không sửa App hoặc test đó. Không coi lượt đầu là đạt; dùng kết quả coverage chạy lại bên dưới.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1`: **1.240 unit pass, 3 ignored**, integration/doc tests pass. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1`: **86,40% lines**. Lượt Rust đầu chạy song song với các suite khác bị timeout test stdin probe của Codex CLI; test đó chạy riêng rồi full suite tuần tự đều đạt, không sửa Rust/test/timeout.
- Codacy Analysis CLI 0.24.0 với auto config/SARIF ngoài source: ESLint9 0, Trivy 0; Semgrep 47 cảnh báo props spreading, Lizard 46 Medium, Stylelint 112 — số cảnh báo bằng baseline. Không Critical/High mới, không analyzer error. Đã review Medium: owner/picker cũ vẫn giữ trách nhiệm; NoteAutocomplete thêm một prop trình bày (Lizard đếm 12 → 13 tham số destructured), không thêm nhánh tương tác hoặc quyền ghi. Không silence rule, không upload source/results.
- CodeScene: not run (optional integration unavailable).
- Localization: no UI copy changes. `pnpm l10n:validate` đạt 18 catalog / 1.013 khóa; không cần dịch catalog.
- PostHog: no event needed because chỉ chuyển quyền sở hữu style; không có hành động mới. Telemetry hiện có được giữ nguyên.
- Refactoring: chỉ đưa style reusable vào UI variants và chuyển props. ADRs: none (không thêm dependency hay core abstraction). Docs: ARCHITECTURE, ABSTRACTIONS, CURRENT-STATE, FINDINGS và biên bản này.
- Demo vault dirt checked: `git status --short -- demo-vault demo-vault-v2` rỗng. Giữ nguyên thay đổi người dùng ở AGENTS.md và skill/SPEC/PLAN chưa tracked.

## Modern Web Guidance

Đã tìm/đọc `css`, `form-factor-adaptation`, `accessibility` trước khi sửa. Áp dụng component-owned tokens/variants thay ancestor overmatching, min-height để nhãn dài có thể lớn lên, coarse targets 44px và outline focus. Giữ Radix/shadcn theo hợp đồng framework, không thay nền tảng dialog/focus hoặc thêm polyfill. Các API CSS mới dùng cho component đã được kiểm cả Chromium và WebKit; không chạy legacy-scan ngoài phạm vi.

## Push

`git push origin main` trên `dc29bf7d` chạy hook bình thường. Workflow checks, lint/build và frontend coverage đạt: 492 file / 4.939 test, 87,41% lines. Rust được hook bỏ qua do không thay đổi Rust; các lệnh đầy đủ đã chạy riêng và đạt như trên.

Core smoke: **52 passed / 1 flaky / 1 failed, 5,6 phút**. F-039 thất bại cả retry: lượt đầu vẫn thấy “Grow Newsletter”, retry H1 rỗng thay vì “Manage Sponsorships”. Ca keyboard delete/Quick Open chờ Note B thất bại lượt đầu, qua retry; ghi mới F-040, chưa kết luận nguyên nhân hoặc đây là regression của F-026. [Log pre-push](evidence/step-C-pre-push.txt). Ca delete chạy riêng lại 3/3 pass không retry trên bản cuối và 3/3 pass trên baseline `f78b8fb9`; chưa tái hiện ngoài lane đầy đủ.

Hook chặn push bởi F-039: commit F-026 và bằng chứng vẫn ở local main, **chưa push, chưa release-ready**. Không sửa ngoài scope, không hạ assertion hoặc bypass hook. Biên bản cuối được amend qua pre-commit bình thường; mã sản phẩm giữ nguyên sau lượt pre-push này. CodeScene không chạy, không được tính là pass.
