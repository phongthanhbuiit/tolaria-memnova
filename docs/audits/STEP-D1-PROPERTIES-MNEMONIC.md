# FIX D1 — Properties và thanh sửa gợi nhớ

Ngày 17/11/2026. Baseline `b23296e9`. Chỉ xử lý F-013, F-014, F-035 và phần F-024/F-032 thuộc D1 theo DESIGN-SPEC §7. Các bước D2–D4 không thuộc đợt này.

## Phạm vi và hành vi

- Properties dùng `body` cho nhãn/giá trị, màu primary/secondary; thông tin và số liệu lịch ôn dùng `small`, tiêu đề nhóm học `body` 500. Bỏ font-size tùy ý, chiều cao cũ và bo góc số ở các module trực tiếp của D1; dùng API size/variant của UI.
- Bốn gợi ý thuộc tính rỗng thành lưới tự co (2×2 ở panel 280px với cỡ chữ thường), ba quan hệ rỗng thành hàng nhãn + nút thêm, bỏ khung nét đứt. Grid nhãn/giá trị có tối đa hai cột, co về một khi chữ lớn hoặc panel hẹp; nhãn gợi ý, quan hệ và metadata xuống dòng thay vì bị cắt mất. Giữ đủ từng hành động, không thêm menu, disclosure hoặc bước thao tác. Panel có inset 16px. Header Properties dùng giá trị gần nhất có trong SPEC: min-height 56px = 2 × control-sm; nút đóng/thu gọn 28px.
- Nút ôn giữ `default` khi đến hạn, dùng `outline` khi due nằm sau clock hiện có. Cả hai vẫn enabled theo cùng guard và gửi cùng scope ghi chú; không đổi lịch ôn, timer, locks hoặc dữ liệu. Baseline C đã có màu nhấn cho ghi chú đến hạn; D1 hoàn tất phân biệt ghi chú chưa đến hạn.
- `NoteMemoryEditorTabs` nhận nội dung nguồn qua children; `NoteBackSourceToolbar` có layout inline. Editor ghép hai thanh thành một, giữ nguyên điều kiện hiển thị và mọi callback. Không thêm role toolbar/focusgroup hoặc đổi Tab thành phím mũi tên.
- `AccentColorPicker` có API compact opt-in cho Tags trong Properties. Các caller ngoài D1 giữ mặc định cũ. Dialog chỉnh thẻ/chọn nguồn, các bề mặt quản lý thẻ và autocomplete dùng ở màn khác chưa được thiết kế lại trong D1.
- Không sửa article/editor content styles, mã phím tắt 1–4/Space/Esc, `data-note-grade`, codec, persistence, SQL/Rust hoặc engine lịch ôn. Đối chiếu JSX: 704 thuộc tính trên 27 file TSX handler/disabled/value/checked/aria/data/id khớp baseline, chuẩn hóa tên raw controls sang UI tương đương. [Biên bản máy](evidence/step-D1-contract.json).

## Commit và số đếm

Mỗi module component có một commit riêng, hai helper có commit riêng; mọi commit chạy hook bình thường trên main. Không dùng no-verify hoặc hạ gate. [Danh sách commit và số đếm](evidence/step-D1-counts.json). Thay đổi người dùng ở AGENTS.md được kiểm SHA-256 và giữ nguyên; skill/SPEC/PLAN chưa tracked không được stage.

| Lệnh SPEC §8 | Trước | Sau |
|---|---:|---:|
| `grep -rnE "text-\[[0-9.]+(px|rem)\]|fontSize:" src --include='*.tsx' --exclude='*.test.*' \| wc -l` | 307 | 232 |
| `grep -rnE "\[data-slot=" src --include='*.css' \| wc -l` | 0 | 0 |

Số thứ nhất giảm 75 dòng; các module D1 trực tiếp không còn match tùy ý. Các commit chỉ đổi text-xs/text-sm, .ts helper, layout hoặc API trình bày có số đếm không đổi vì grep không bao phủ các dạng đó. CSS data-slot đã bằng 0 từ bước C và giữ 0. Không đổi selector để né grep. 232 dòng còn lại thuộc các bề mặt ngoài D1; F-024/F-032 vẫn mở toàn cục.

## Ảnh trước/sau

| Bề mặt | Sáng | Tối |
|---|---|---|
| Properties native | [trước](evidence/F-013-before-light.png) / [sau](evidence/F-013-after-light.png) | [trước](evidence/F-013-before-dark.png) / [sau](evidence/F-013-after-dark.png) |
| Thanh sửa gợi nhớ native | [trước](evidence/F-035-before-light.png) / [sau](evidence/F-035-after-light.png) | [trước](evidence/F-035-before-dark.png) / [sau](evidence/F-035-after-dark.png) |
| Giá trị và chip Properties, renderer | [trước](evidence/step-D1-values-before-light.png) / [sau](evidence/step-D1-values-after-light.png) | [trước](evidence/step-D1-values-before-dark.png) / [sau](evidence/step-D1-values-after-dark.png) |
| Menu màu trạng thái, renderer | [trước](evidence/step-D1-status-before-light.png) / [sau](evidence/step-D1-status-after-light.png) | [trước](evidence/step-D1-status-before-dark.png) / [sau](evidence/step-D1-status-after-dark.png) |
| Composer thuộc tính, renderer | [trước](evidence/step-D1-composer-before-light.png) / [sau](evidence/step-D1-composer-after-light.png) | [trước](evidence/step-D1-composer-before-dark.png) / [sau](evidence/step-D1-composer-after-dark.png) |
| Chưa đến hạn, renderer | [trước](evidence/F-014-before-future-light.png) / [sau](evidence/F-014-after-future-light.png) | [trước](evidence/F-014-before-future-dark.png) / [sau](evidence/F-014-after-future-dark.png) |

Native dùng cùng cửa sổ 2620×1440 và Library sao chép, baseline trước khi sửa; ảnh sau được chụp lại trên mã cuối. Renderer Properties dùng cùng fixture Alpha Project, viewport 1280×900. Chip trạng thái chuyển 12px/24px/radius 6px → body 13px/control-sm 28px/radius-sm 4px; composer chuyển 12px/32px/radius 3,5px → body 13px/control-sm 28px/radius-md 6px. Ảnh chưa đến hạn dùng fixture note-memory-layout trên bản xuất b23296e9/port 41743 và mã cuối/port 5201; không dùng chúng làm bằng chứng filesystem hoặc native.

## QA và dữ liệu

- Native: bundle QA riêng `Memnova Properties D1 QA.app`, identifier `net.memnova.qa.propertiesD1`, incognito webview và `MEMNOVA_CONFIG_HOME` trong thư mục tạm; Library sao chép ngoài source, không dùng cấu hình người dùng. Binary debug từ bước C được tái sử dụng vì Rust không đổi, frontend live là mã D1. Tên accessibility của binary vẫn là “Memnova Study B QA”; menu/bundle và Library “Properties D1 QA” xác nhận đúng app QA.
- Chuột trước: mở ghi chú/Properties → sửa gợi nhớ → Chọn nguồn → tìm Reading 13 và chọn preview → Esc hủy → quay lại ghi chú. Mở composer thuộc tính, nhập draft `qa_draft_only=42`, Cancel; mở thêm quan hệ/tìm Reading 13, Esc hủy. Mở ôn bằng chuột → Space hiện bốn mức nhớ → Esc đóng; không chấm điểm. Focus trở lại Choose source / Review this note sau khi đóng dialog. App đã quit, xác nhận không còn trong inventory.
- Native Tab không đi qua controls với thiết lập WKWebView/macOS mặc định trong lần kiểm này; không thay thiết lập hệ thống và không coi đây là bằng chứng Tab đã pass. Thứ tự button và callbacks được giữ; test trình duyệt kiểm Enter, Escape và focus-visible.
- Playwright CLI: ảnh baseline dùng bản xuất `b23296e9`; ảnh sau dùng dev server hiện có port 5201. Thử menu trạng thái và composer rồi Cancel trên fixture tạm; không thay demo vault. [Ma trận 72 case](evidence/step-D1-layout-matrix.json) pass: Chromium 36 + WebKit 36, panel 240/280/500px, root font 14/21/28px, hai theme, bật/tắt giãn chữ (line-height 1,5; letter-spacing 0,12em; word-spacing 0,16em; paragraph 2em). Không cuộn ngang hoặc cắt nhãn gợi ý/quan hệ. [Script CLI để chạy lại](evidence/step-D1-layout-matrix.js).
- Dev console có cảnh báo daemon AI cục bộ port 9711 không chạy và favicon 404 trên cả baseline/current; không quy chúng thành lỗi D1 hoặc báo console sạch.

[Kiểm tra bảo toàn native](evidence/step-D1-native-verification.json): 254/254 Markdown khớp SHA-256; sessions 5→5, reviews 4→4, schedules 5→5 khớp từng hàng; integrity_check=ok, foreign_key_check rỗng. Kiểm lại file SQLite sau khi app quit, không còn WAL/SHM, bằng kết nối read-only immutable để không tạo sidecar.

## Kiểm tra phát hành

[Commands và kết quả máy](evidence/step-D1-checks.json). WebKit vẫn có finding baseline F-041; không coi bộ kiểm tra là pass toàn bộ.

- TDD F-014: case tương lai RED vì vẫn default; sau sửa 10/10 test NoteLearningPanel GREEN, giữ kiểm tra dispatch scope. TDD F-035: Choose source không xuất hiện ở component cũ; sau thêm slot 3/3 GREEN. CSS/layout áp dụng ngoại lệ TDD của AGENTS.
- Chỉ cập nhật các assertion trình bày cũ bắt buộc 12px, chip 24px/6px, nhãn opacity 40% và hàng xếp dọc. Không bỏ assertion thao tác, thay timeout, giảm coverage hoặc sửa test hành vi để cho qua.
- Frontend: `pnpm lint`, `pnpm exec tsc -b`, `pnpm test` (492 file, 4.942 test), `pnpm test:coverage` và `pnpm build` pass. Coverage cuối: **87,41% lines**, 83,64% statements, 75,65% branches, 85,23% functions (gate ≥70%). Một lượt chạy đồng thời Rust gặp lại race startup App “New Note” đã ghi ở bước C; chạy riêng App 37/37 rồi chạy full coverage khi không chạy Rust đã pass, không sửa test hoặc timeout. Thay đổi cuối chỉ giữ alias màu secondary tương đương, được kiểm lại bởi hook pre-push
- Rust: `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1` pass (1.240 test, 3 ignored; integration/docs pass); `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1` pass **86,40% lines** (gate ≥85%)
- Playwright: 21/21 Chromium; WebKit 7 passed / 2 failed trong các spec hiện có `note-memory-workspace`, `note-memory-study`, `memnova-properties`; Chromium chạy thêm `note-memory-layout`. Dùng `--retries=0`, không sửa spec. Lượt đầu layout test không tìm được caption sau khi đổi tên class; giữ lại alias `text-muted-foreground` vốn trỏ tới `--text-secondary` từ bước A, rồi toàn bộ 21 ca Chromium cuối pass. Không đổi màu thực tế hoặc assertion để qua test. WebKit gặp render error react-virtuoso ở hai case ghi chú thường trước Command Palette; chạy lại mã cuối vẫn 2 failed, baseline b23296e9 có 1 failed / 1 passed với cùng stack. Ghi F-041, không sửa note list/editor ngoài D1; không coi WebKit là pass toàn bộ. [Log baseline](evidence/F-041-webkit-baseline.txt), [log current](evidence/F-041-webkit-current.txt), [recheck](evidence/F-041-webkit-recheck.txt). Không thêm smoke cho thay đổi thẩm mỹ
- Codacy Analysis CLI 0.24.0: ESLint9 0, Trivy 0; Semgrep 15 warning props-spreading và Lizard 37 warning Medium, cùng số lượng từng rule với baseline. CLI exit 1 vì các warning, không có analyzer error; **không có Critical/High mới**. Đã xem các cảnh báo Medium về số tham số/độ dài/complexity: thay đổi chỉ API trình bày, không thêm đường IO hoặc xử lý dữ liệu; không tách pipeline hoặc tắt rule để hạ điểm. [Tổng hợp đối chiếu](evidence/step-D1-codacy-summary.json). Auto config và SARIF nằm ngoài source, so với cùng danh sách file tại b23296e9; không upload source/results.
- CodeScene: not run (optional integration unavailable).
- Localization: no UI copy changes; `pnpm l10n:validate` pass 18 catalog × 1.013 key; không cần dịch lại.
- PostHog: no event needed because chỉ đổi trình bày, không có hành động mới; instrumentation hiện có giữ nguyên.
- Refactoring: tách style qua API controls và slot trình bày có sẵn; không thêm pipeline lưu hoặc core abstraction. ADRs: none. Docs: CURRENT-STATE, ARCHITECTURE, ABSTRACTIONS, FINDINGS và biên bản này.
- Demo vault dirt checked: `git status --short -- demo-vault demo-vault-v2` rỗng.
- Push: sẽ chạy `git push origin main` với hook bình thường; kết quả trả về được ghi riêng sau lần chạy. F-039/F-040 đang mở từ baseline, không sửa ngoài D1 hoặc bypass hook

## Modern Web Guidance

Tôi áp dụng typography: dùng thang rem của app và min-height thay chiều cao cố định trên nội dung chữ ("Let the content set the height"). Tôi áp dụng css-layout: “Reach for intrinsic sizing”, dùng auto-fit/minmax/rem/fr để grid co theo nội dung mà không đổi DOM order. Đã kiểm toolbar guidance: hàng hành động hiện có giữ Tab tự nhiên; thêm single-tab-stop/focusgroup sẽ đổi hợp đồng bàn phím nên không áp dụng trong đợt chỉ trình bày này. Giữ Radix/shadcn và hỗ trợ Chromium/WebKit hiện có, không thêm API nền tảng hoặc polyfill mới. Không chạy legacy-scan ngoài phạm vi.
