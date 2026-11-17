# D4B — Inline style và độ đậm (F-032 / F-038)

Ngày18/11/2026, FIX/chế độ đêm. Baseline **63bbfbc3**, mã cuối **9de3e360**. Phạm vi: năm file F-032 được giao và font-weight ngoài nội dung editor cho F-038. Không đổi dữ liệu, hành vi, phím tắt, thứ tự hay key path của danh sách, UI copy, font family hoặc màu. Không sửa F-024/F-040 hay các regression R-08/R-09/R-10.

## Kết quả

- **F-032:** năm file **92→11** lần `style={{`; toàn src TSX không tính test **308→227**. 11 object còn lại gồm9 object động và2 delay animation giữ để bảo toàn cascade. Finding toàn app vẫn **partial**; không dọn các file ngoài năm file được giao.
- **F-038:** **44→0** khai báo weight ngoài400/500/600 trong chrome. Ngoài ra, hai vị trí strong của UpdateBanner và UA heading/strong của các trang release được đặt600. Chỉ giữ700 cho cú pháp/nội dung editor. Finding **fixed**, kèm giới hạn QA bên dưới.
- SPEC §8: typography **1→1** (ngoại lệ emoji icon đã ghi ở D4A); CSS `[data-slot=…]` **0→0**. Không thêm font-size literal, màu hex, `!important`, ghi đè data-slot hay dependency.

## Cổng an toàn và cách làm

Fetch/status/rev-list exit0, HEAD=origin/main=63bbfbc3, 0commit chưa push. Không có lệnh dừng trong log. Giữ nguyên AGENTS.md đang sửa và .agents/, APP-AUDIT-PLAN.md, DESIGN-SPEC.md, OVERNIGHT-RULES.md của người dùng ngoài index. Đọc CURRENT-STATE, ARCHITECTURE/ABSTRACTIONS, baseline library-writing, SPEC và findings trước khi sửa. Dùng Node24.12.0.

File thứ năm được chọn từ số đo hiện tại: TelemetryConsentDialog14, sau Pulse26/AiPanel20/AiMessage18; SidebarParts hiện14 (số18 trong finding là lịch sử). Welcome/StatusBarBadges đứng sau ở12. [Kiểm kê](evidence/D4B-inline-metrics.json).

Chuyển thuộc tính tĩnh sang tiện ích Tailwind tham chiếu biến màu sẵn có. Giữ chính xác giá trị pixel cũ ở các vị trí không có token tương đương; root14px nên không đổi `padding:12px` thành `p-3` một cách máy móc. Không tận dụng bước refactor để đổi spacing, radius, chiều cao hoặc màu sang thiết kế khác. Các phép tính kích thước/vị trí và màu do dữ liệu quyết định vẫn dùng inline. Không hoist object style tĩnh sang const để làm đẹp số grep.

## Số inline style từng file F-032

Đếm trực tiếp số lần `style={{`, phân biệt hoa/thường, trong mã nguồn không tính test. Cột thứ hai kiểm thêm các object của editorStyle/contentStyle để không che chúng khỏi số đếm.

| File | `style={{` trước→sau | Object của style/editorStyle/contentStyle trước→sau | Giữ lại |
|---|---:|---:|---|
| PulseView |26→1|26→1|Màu icon theo trạng thái file lúc chạy|
| AiPanelChrome |20→0|21→1|style của send-button vẫn qua hàm có background/color/cursor động; editorStyle120px/scroll được giữ theo contract composer|
| SidebarParts |14→7|14→7|Padding chọn theo compact/count, màu loại tuỳ biến, grid theo số workspace; style prop vẫn truyền xuyên để caller có thể override|
| AiMessage |18→3|18→3|Hai màu reference động; hai delay0,2s/0,4s giữ inline|
| TelemetryConsentDialog |14→0|15→0|Không còn object style; contentStyle đã chuyển vào contentClassName|
| **Tổng** |**92→11**|**94→12**|Không gọi các ngoại lệ tĩnh là giá trị động|

### Ngoại lệ bảo toàn giao diện

`.typing-dot` trong index.css dùng animation shorthand không nằm trong cascade layer. Khi thử chuyển delay sang utility, computed delay0,2s/0,4s trở thành0s và nhịp/chấm đổi opacity. Giữ đúng hai inline delay; không dùng `!` hoặc mở rộng sửa index.css ngoài năm file. Có comment tại StreamingIndicator. Đây là ngoại lệ tĩnh được ghi rõ, không phải giảm số bằng cách biến literal thành phép tính giả.

AiPanelChrome đã có cùng class max-height/overflow nhưng composer còn explicit editorStyle; test hiện có kiểm cả contract này. Giữ editorStyle120px/auto/contain và assertion đó. Chuyển các static style khác; hàm composerSendButtonStyle chỉ còn background/color/cursor phụ thuộc trạng thái, không còn width/height/radius tĩnh.

SidebarCountPill chuyển padding/tabular numbers sang class, vẫn nhận style prop nguyên vẹn; giá trị caller có thể override như trước. Các test alignment vẫn kiểm padding của favorites/view/nav và các class token tương ứng của Types/pill. Không sửa helper runtime hay callback.

## F-038 — weight ngoài editor

| File | Vi phạm literal trước→sau | Thay đổi |
|---|---:|---|
| `src/components/WelcomeScreen.tsx` |1→0|700→600 ở tiêu đề|
| `src/components/FlashcardStudyView.tsx` |2→0|Chip và XP chrome bold/black→600, không đụng BlockNoteReadOnly|
| `src/components/DecksPage.tsx` |8→0|Bold/black→600|
| `src/components/HomePage.tsx` |31→0|Bold/black→600|
| `src/utils/releaseHistoryPage.ts` |1→0|Link700→600; heading/strong/b UA→600|
| `src/components/Editor.css` |1→0|Chỉ .note-icon-button__plus300→400 (chrome), không sửa nội dung editor|
| `UpdateBanner.tsx` |0→0 literal|Hai strong dùng font-semibold thay UA bolder700|
| `releaseDownloadPage.ts` |0→0 literal|UA heading/strong/b đặt600 trong trang xuất|

[44 khai báo trước/sau](evidence/D4B-weight-metrics.json). Các trang release là tài liệu riêng, không có editor: quy tắc heading/strong/b600 chỉ nằm trong CSS của trang được xuất. Không reset global ứng dụng. Ma trận Chromium/WebKit đo heading/strong/link trước700, sau600; [số đo](evidence/D4B-release-weights.txt). Nội dung/cú pháp editor vẫn được phép700: ba khai báo trong extensions/markdownHighlight.ts:16,17,22 giữ nguyên; EditorTheme và dữ liệu note không đổi. Icon Phosphor `weight="bold"` là nét SVG, không phải font-weight và không bị đổi.

## Commit theo file bề mặt

Một file production mỗi commit; hai commit SidebarParts/AiMessage kèm test liên quan vì bộ chọn/assertion presentation phải đi cùng phần chuyển từ inline sang class. Không gộp nhiều file bề mặt. Mỗi commit source đi qua hook bình thường.

- `465d8765` — refactor: move static Pulse styles to utilities (F-032)
- `e7d199d9` — refactor: move static AiPanelChrome styles to utilities (F-032)
- `ae283af0` — refactor: move static SidebarParts styles to utilities (F-032)
- `29c62a53` — refactor: move static AiMessage styles to utilities (F-032)
- `307256ab` — refactor: move static TelemetryConsentDialog styles to utilities (F-032)
- `e1fed99d` — fix: constrain HomePage.tsx chrome font weights (F-038)
- `ab3576c1` — fix: constrain DecksPage.tsx chrome font weights (F-038)
- `e1f8798e` — fix: constrain FlashcardStudyView.tsx chrome font weights (F-038)
- `6bcdce55` — fix: constrain WelcomeScreen.tsx chrome font weights (F-038)
- `922eac75` — fix: constrain UpdateBanner.tsx chrome font weights (F-038)
- `4708be33` — fix: constrain releaseHistoryPage.ts chrome font weights (F-038)
- `4e2800bc` — fix: constrain releaseDownloadPage.ts chrome font weights (F-038)
- `9de3e360` — fix: constrain Editor.css chrome font weights (F-038)

SPEC §8 ở mọi commit giữ1/0; đây là refactor inline và weight, không ép xoá ngoại lệ emoji hoặc mở rộng sang typography F-024 để giảm thêm grep.

## So ảnh và computed style

**F-032: 20/20 tổ hợp (5bề mặt×2theme×2engine) có0 khác biệt computed style được đo.** Theo từng node DOM, đối chiếu kích thước, padding/margin/gap, flex/grid, màu/nền/viền/radius/shadow, chữ, overflow, cursor và delay. AST năm file bỏ riêng trình bày cho **0 thay đổi còn lại**: text, data/aria, event handlers và các hàm tính dữ liệu giữ nguyên. [Script AST](evidence/D4B-ast-invariant.cjs.txt), [kết quả AST](evidence/D4B-ast-invariant.txt), [ma trận](evidence/D4B-style-comparison.json).

**19/20 ảnh F-032 bit-exact**. Một ảnh Chromium AiMessage theme tối lệch đúng1pixel, tối đa1 mức trên kênh8bit; computed style vẫn bằng nhau. Đây là số thô, không mask hoặc sửa ảnh và không hạ assertion/tolerance để gọi20/20 bit-exact. Sai khác có thể do rasterization; không có khác biệt geometry/style được đo. [Lượt chẩn đoán](evidence/D4B-style-comparison-diagnostic.json) và ma trận cuối đều được giữ.

Các lần thử ban đầu bắt được header sidebar mất text-small do công cụ gộp class không nhận token của app, và animation delay bị shorthand unlayered ghi đè. Đã khôi phục token12/18 và delay trước khi commit. Không giữ thay đổi đó chỉ vì ứng dụng còn chạy.

### Native macOS

QA debug/incognito riêng: bundle net.memnova.qa.d4b, config /tmp/memnova-d4b/native/prefs, Library /tmp/memnova-d4b/native/Library. Consent/Welcome dùng bundle net.memnova.qa.d4b.consent, preferences rỗng riêng. Tái dùng executable debug D2 do Rust không đổi, window title nội bộ còn D2; renderer current source qua localhost:5201 bind127.0.0.1. Không dùng prefs/Library thật hoặc thay HOME.

20ảnh native gốc (Retina2880×1800, cửa sổ1440×900), 10ảnh ghép. Ngôn ngữvi; English trong consent/AI là copy hiện có. Chuột: Pulse→mở file list, AI panel, sidebar visibility popover, theme, consent→No thanks→Welcome. Cmd+Shift+L vẫn mở AI panel. Không gửi prompt AI, không cài agent, không mở/chỉnh note hay commit/push Library. App QA đã thoát.

| Native | Sáng | Tối |
|---|---|---|
|pulse|[Trước/sau](evidence/D4B-native-pulse-compare-light.png)|[Trước/sau](evidence/D4B-native-pulse-compare-dark.png)|
|ai|[Trước/sau](evidence/D4B-native-ai-compare-light.png)|[Trước/sau](evidence/D4B-native-ai-compare-dark.png)|
|sidebar|[Trước/sau](evidence/D4B-native-sidebar-compare-light.png)|[Trước/sau](evidence/D4B-native-sidebar-compare-dark.png)|
|consent|[Trước/sau](evidence/D4B-native-consent-compare-light.png)|[Trước/sau](evidence/D4B-native-consent-compare-dark.png)|
|welcome|[Trước/sau](evidence/D4B-native-welcome-compare-light.png)|[Trước/sau](evidence/D4B-native-welcome-compare-dark.png)|

Native kiểm trực quan và đường thao tác. Không gọi cửa sổ native bit-exact: clock/status/cursor và JPEG của công cụ có thể khác. Bằng chứng pixel lossless là fixture browser dưới đây. Welcome chỉ đổi weight theo F-038; overflow đã ghi R-10 vẫn giữ, không sửa bố cục.

### Component fixture Chromium / WebKit

Dùng production components với props QA và callback không ghi dữ liệu. Các legacy Home/Decks không còn route hiện hành vẫn được dựng trong fixture; AiMessage có user bubble, reference, reasoning, tool-use, response/actions, local marker và streaming dots. Đây là component QA, không giả nhận chat AI/native đã gửi prompt. Hai trang release được xuất trực tiếp bằng hàm gốc, JavaScript tắt để chỉ đối chiếu typography và không kích hoạt download/network. Không coi lượt đó là kiểm redirect/download chức năng.

88ảnh browser gốc +44cặp,1440×900 ở cả hai engine/theme. Native+browser tổng162PNG. Ảnh ghép chỉ đặt cạnh/thu nhỏ native, không retouch nội dung. [Fixture](evidence/D4B-visual-fixture.tsx.txt), [capture](evidence/D4B-browser-capture.cjs.txt), [release capture](evidence/D4B-release-capture.cjs.txt). Các script/fixture chạy ngoài tracked source; folder test-results/d4b-visual đã dọn. Lượt lint đầu bắt rule fast-refresh trên fixture; sửa export helper, rồi xoá fixture trước gate cuối. Lượt fixture release qua Vite bị cache vì thư mục bị watch-ignore; dừng hướng đó, dùng HTML xuất trực tiếp; không tăng timeout/retry hoặc sửa ứng dụng.

| Bề mặt | Chromium sáng | Chromium tối | WebKit sáng | WebKit tối |
|---|---|---|---|---|
|pulse|[So ảnh](evidence/D4B-chromium-pulse-compare-light.png)|[So ảnh](evidence/D4B-chromium-pulse-compare-dark.png)|[So ảnh](evidence/D4B-webkit-pulse-compare-light.png)|[So ảnh](evidence/D4B-webkit-pulse-compare-dark.png)|
|chrome|[So ảnh](evidence/D4B-chromium-chrome-compare-light.png)|[So ảnh](evidence/D4B-chromium-chrome-compare-dark.png)|[So ảnh](evidence/D4B-webkit-chrome-compare-light.png)|[So ảnh](evidence/D4B-webkit-chrome-compare-dark.png)|
|sidebar|[So ảnh](evidence/D4B-chromium-sidebar-compare-light.png)|[So ảnh](evidence/D4B-chromium-sidebar-compare-dark.png)|[So ảnh](evidence/D4B-webkit-sidebar-compare-light.png)|[So ảnh](evidence/D4B-webkit-sidebar-compare-dark.png)|
|message|[So ảnh](evidence/D4B-chromium-message-compare-light.png)|[So ảnh](evidence/D4B-chromium-message-compare-dark.png)|[So ảnh](evidence/D4B-webkit-message-compare-light.png)|[So ảnh](evidence/D4B-webkit-message-compare-dark.png)|
|consent|[So ảnh](evidence/D4B-chromium-consent-compare-light.png)|[So ảnh](evidence/D4B-chromium-consent-compare-dark.png)|[So ảnh](evidence/D4B-webkit-consent-compare-light.png)|[So ảnh](evidence/D4B-webkit-consent-compare-dark.png)|
|welcome|[So ảnh](evidence/D4B-chromium-welcome-compare-light.png)|[So ảnh](evidence/D4B-chromium-welcome-compare-dark.png)|[So ảnh](evidence/D4B-webkit-welcome-compare-light.png)|[So ảnh](evidence/D4B-webkit-welcome-compare-dark.png)|
|home|[So ảnh](evidence/D4B-chromium-home-compare-light.png)|[So ảnh](evidence/D4B-chromium-home-compare-dark.png)|[So ảnh](evidence/D4B-webkit-home-compare-light.png)|[So ảnh](evidence/D4B-webkit-home-compare-dark.png)|
|decks|[So ảnh](evidence/D4B-chromium-decks-compare-light.png)|[So ảnh](evidence/D4B-chromium-decks-compare-dark.png)|[So ảnh](evidence/D4B-webkit-decks-compare-light.png)|[So ảnh](evidence/D4B-webkit-decks-compare-dark.png)|
|update|[So ảnh](evidence/D4B-chromium-update-compare-light.png)|[So ảnh](evidence/D4B-chromium-update-compare-dark.png)|[So ảnh](evidence/D4B-webkit-update-compare-light.png)|[So ảnh](evidence/D4B-webkit-update-compare-dark.png)|
|release-history|[So ảnh](evidence/D4B-chromium-release-history-compare-light.png)|[So ảnh](evidence/D4B-chromium-release-history-compare-dark.png)|[So ảnh](evidence/D4B-webkit-release-history-compare-light.png)|[So ảnh](evidence/D4B-webkit-release-history-compare-dark.png)|
|release-download|[So ảnh](evidence/D4B-chromium-release-download-compare-light.png)|[So ảnh](evidence/D4B-chromium-release-download-compare-dark.png)|[So ảnh](evidence/D4B-webkit-release-download-compare-light.png)|[So ảnh](evidence/D4B-webkit-release-download-compare-dark.png)|

Giới hạn: native AI là trạng thái empty/composer; message/tool states được kiểm ở browser fixture. Không có route native legacy Home/Decks/FlashcardStudyView; hai thay đổi weight chrome trong Flashcard được rà diff và test liên quan, không giả nhận đã mở native. Không đánh giá lại toàn bộ rare states hoặc zoom/reflow trong bước này.

## Tests và gates

- TDD: CSS/style thuần thuộc ngoại lệ AGENTS. Lượt related đầu302pass/7fail vì test đọc inline style cũ; không có lỗi callback/data. Giữ editorStyle và test scrolling nguyên trạng. AiMessage chỉ đổi bộ chọn background sang class tương đương; Sidebar kiểm cả style của caller và class padding/gap của Types/pill, giữ kiểm màu/nhãn/trạng thái. Related GREEN282/282, các hook per-file cũng pass. Browser computed/pixel bổ sung chứng minh cùng giá trị, không chỉ assertion class. Không tăng timeout/retry/skip hoặc giảm coverage.
- `pnpm lint`, `pnpm exec tsc -b`, `pnpm test`: exit0; **504file/5007test pass** trên Node24.12.0. `pnpm l10n:validate`:18catalog/1042English keys pass.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1`:1240unit+1integration pass,3ignored có sẵn; `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1`: **86,40%lines**, exit0. Không đổi Rust.
- Pre-push lint/build/frontend coverage/curated: **exit0**; frontend **504file/5007test**, **87,50%lines** ≥70%; **54/54 core smoke trong4,5phút**, không retry ở lượt này. Push main `63bbfbc3→9de3e360` thành công, hook bình thường **8m3s**. Rust không đổi nên hook tự bỏ qua, đã chạy độc lập86,40%lines ≥85% ở trên. [Log hook đầy đủ](evidence/D4B-push-source.txt). Commit docs cuối được push bằng hook bình thường.
- Codacy MCP không khả dụng; dùng CLI0.24.0 local, auto config/SARIF ngoài tracked source, exclusions của dự án giữ nguyên, không upload. ESLint9 và Trivy0issue; Semgrep3→3; Lizard30→29; Stylelint112→112 baseline. Tổng **145→144**, không Critical/High mới. Semgrep/Opengrep không parse PulseView cả trước/sau,1analyzererror/fileNotAnalyzed mỗi lượt; không gọi analyzer đó PASS. [Tóm tắt](evidence/D4B-codacy-summary.json). Các warning Stylelint/complexity có sẵn không được sửa ngoài phạm vi hoặc bị suppress.
- CodeScene: not run (optional integration unavailable); không có PAT/project ID, không đưa điểm giả và không dùng Lizard thay CodeScene.
- Localization: no UI copy changes; không cần Lara, validator pass. PostHog: no event needed because chỉ style/weight, không có user action mới.
- Refactoring: chuyển style sang utility theo yêu cầu, không thêm component/hook/model/API/dependency; không cần ADR hoặc thay ARCHITECTURE/ABSTRACTIONS. Docs: CURRENT-STATE, FINDINGS, báo cáo này và log đêm.
- Data preservation: **258Markdown+3SQLite giống từng byte/hash**, không thêm/mất/sửa; [hash](evidence/D4B-data-hashes.json). Không tuyên bố query/integrity DB mới. Demo-vault và demo-vault-v2 status rỗng.

## Quyết định đêm

Không hỏi hoặc chờ duyệt. Giữ2delay inline do cascade và editorStyle scrolling contract thay vì mở rộng index.css/WikilinkChatInput hoặc dùng `!`; ghi rõ chúng là ngoại lệ tĩnh. F-032 toàn app vẫn partial, F-038 đã xử lý weight chrome; không dùng số grep nhỏ hơn để đóng nhầm finding rộng. Không sửa layout Welcome/R-10 hoặc browser regression ngoài phạm vi. Giữ các file hướng dẫn của người dùng ngoài index.

### Modern Web Guidance

- **`css`**: Tôi chuyển giá trị trình bày tĩnh sang utility/token theo “DO NOT specify nontrivial styling values inline”, giữ CSS variables của theme. Tôi kiểm cascade thực tế và giữ delay/scrolling contract cần thiết; không thêm layer, reset global, `!important` hoặc tính năng CSS mới chỉ để ép số inline về0.
