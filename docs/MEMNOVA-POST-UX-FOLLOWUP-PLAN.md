# Memnova — review sau U11 và kế hoạch khắc phục

Ngày: 2026-10-19. Baseline source/release: `504067453d124e879d99d70ae1099ba42534a199`.
Phạm vi lượt này: review code, chạy probe và lập kế hoạch; **chưa sửa runtime**.

**Cập nhật 14/11/2026.** Xem [bảng điểm và thứ tự thực hiện hiện tại](#danh-gia-2026-11-14). Phần 1–5 ghi lại đợt tháng 10.

## 1. Kết luận nghiệm thu

U00–U11 đã triển khai, có commit và release receipt. Giữ nguyên trạng thái lịch sử đó; không xem DONE là chứng minh không còn defect. Mở follow-up riêng R00–R06 dưới đây. Không mở lại M00–M25 hay thiết kế storage.

- U01: snippet projection có TS/Rust/shared corpus và Vite adapter; đọc lại code, test wikilinks pass.
- U02: load success/error cùng generation/read sequence; client epoch giữ callback reconnect cũ không chiếm read mới. Focused regression pass.
- U03–U09: components/status/error helpers, icon/theme tokens, scoped control sizes, panel/list/study/dialog/properties đã có. Không thấy lý do làm lại toàn giao diện từ đầu qua phạm vi đọc này.
- U10: layout/focus/native evidence ở báo cáo cũ; không chạy lại screenshot matrix/VoiceOver trong lượt review này.
- U11: release đã push. Coverage 87.31% frontend, 86.38% Rust không thêm exclusion là **số lịch sử**, không phải đo lại hôm nay trong lượt này.
- Phát hiện mới: helper nạp document tạo Undo entry có thể phục hồi nội dung trước khi nạp. Hai probe thật RED. Cần sửa trước khi coi editor ổn định cho dùng rộng rãi.

## 2. Finding và độ chắc chắn

### F01 — P1: Undo có thể đảo ngược việc nạp/chuyển document

Vị trí: `src/hooks/editorContentSwapApply.ts:33–61`, đặc biệt `replaceBlocks` dòng45; fallback `setContent` dòng53 và `applyHtmlStateToEditor` dòng78 cũng cần kiểm tra trong fix.

`src/components/Editor.tsx:230` tạo editor dùng lại; `useEditorTabSwap` gọi helper để nạp note, `useEditorProjection` vô hiệu hóa cache theo face nhưng không quản lý history. `suppressChangeRef` chỉ chặn app change pipeline, không chặn history của BlockNote/ProseMirror.

Probe chạy BlockNote thật, mount DOM, gọi chính helper production:

1. Editor trống → nạp “Existing A4 article” → Undo: document thành paragraph trống.
2. Editor chứa “Article A” → nạp “Article B” → Undo: document chứa A, không còn B.

Cả hai assertion trước Undo pass, sau Undo fail. **2/2 RED**, 0.956s toàn lượt, 70ms test body. Log local `/tmp/memnova-post-ux-undo-probe.log`. Probe đầy đủ ở phụ lục; file test tạm đã xóa để không để suite chính fail.

Đã xác minh ở helper với editor thật; chưa tái hiện end-to-end save sai xuống đĩa trong lượt này. Cross-face và persisted overwrite là rủi ro cần R01/R02 kiểm chứng, không ghi như đã xảy ra với dữ liệu người dùng. Quan sát native U11 “Undo về trống, Redo phục hồi” phù hợp triệu chứng nhưng không thay thế repro end-to-end.

`git diff 572acb13 HEAD -- src/hooks/editorContentSwapApply.ts src/hooks/useEditorProjection.ts` rỗng: các helper này không được sửa trong batch UX U00–U11. Không gán lỗi là regression do thay icon/style. Các test tab-swap hiện mock replaceBlocks nên không đo history thật.

### F02 — P2: smoke budget không có khoảng dự phòng

Receipt U11 ghi final core phase299.801815s so với gate300s; lượt trước302.67s có teardown failure đã sửa. Đây là rủi ro độ ổn định/thời gian, không phải assertion runtime mới fail. Cấu hình `playwright.smoke.config.ts` workers1/retries1 và Vite dev server. Không được tăng retries, bỏ test hoặc nới gate để làm số đẹp. Phải profile trước tối ưu.

### F03 — khoảng trống QA, chưa phải lỗi đã xác nhận

- VoiceOver, touch vật lý, Windows/Linux, signed installer chưa kiểm chứng. Không cần khóa phát triển macOS vì các nền tảng ngoài target.
- Virtual list có keyboard navigation nhưng chưa có chứng cứ VoiceOver khi range mount/unmount, focus bị lọc/đổi row, hoặc quay từ note về danh sách.
- License production tldraw chưa được xác minh; native có notice. Không kết luận đã đủ điều kiện phát hành signed build.
- Không thấy defect mới có bằng chứng ở schema, scheduler, properties hoặc linked-source independence trong phạm vi review này. Đây không phải kiểm toán toàn repository.

UI review tham chiếu [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), áp dụng phù hợp desktop app, không yêu cầu thêm router/URL state hay design system khác.

## 3. Ledger và dependency

| Task | Ưu tiên | Phụ thuộc | Trạng thái |
|---|---|---|---|
| R00 — baseline và tái hiện helper | P1 | U11 | DONE — review đã push `878951f8` |
| R01 — history isolation và regression thật | P1 | R00 | F01 FIXED — `2d8e7a35`/`87836291`/`8bc9f3ad`; ma trận mở rộng xem receipt |
| R02 — tích hợp/native và bảo toàn dữ liệu | P1 | R01 | VERIFIED_FOR_F01 — browser/native/snapshot; không gọi toàn bộ matrix DONE |
| R03 — giảm thời gian smoke có đo lường | P2 | R02 | TODO |
| R04 — accessibility và focus danh sách động | P2 | R02 | TODO |
| R05 — kiểm tra cấu hình phát hành | Release | R02 | TODO, theo target phát hành |
| R06 — release follow-up và receipt | P1 | R01–R04; R05 nếu phát hành production | TODO |

F01 và hai lỗi trực tiếp phát hiện trong raw/menu đã sửa và push normal tại source/test `d1613fac`; xem [nghiệm thu fix Undo](baselines/2026-10-19-editor-undo.md). Không tái triển khai các fix đó như task chưa làm. Same-document Undo/Redo, face/raw isolation, untitled auto-rename và native menu đã kiểm chứng; mọi kiểu rename giữ history, last-stroke native mới và matrix rộng chưa được nhận là DONE. R03/R04/R05 và release toàn bộ scope R06 vẫn là follow-up riêng; yêu cầu lượt này là sửa lỗi đã tái hiện và push, không tuyên bố đã triển khai trọn R01–R06.

### R01 — sửa history mà giữ nguyên thao tác chỉnh sửa

Files bắt đầu đọc: `Editor.tsx`, `editorContentSwapApply.ts`, `useEditorTabSwap.ts`, `useEditorProjection.ts`, `editorTiptapSelection.ts`, `useRawModeWithFlush` và resources/flush hiện có. Đọc source installed BlockNote history/state manager trước chọn API.

1. Đưa hai probe phụ lục thành regression chính thức, chạy RED trên baseline; không mock undo/replaceBlocks. Thêm edit A rồi switch B rồi Undo để bắt **history cũ trước load**, không chỉ transaction load.
2. Xác định identity gồm Library/document/face; phân biệt đổi identity, reload nội dung từ ngoài, rename cùng document và rerender không đổi nội dung.
3. Dùng API history/editor lifecycle phù hợp phiên bản đã cài để bảo đảm load/swap không là thao tác Undo và không mang history từ note/mặt khác. Chỉ `addToHistory:false` chưa đủ nếu history của document trước còn tồn tại. Không mặc định patch dependency hoặc remount toàn app.
4. Giữ Undo/Redo cho edit trong cùng document. Rerender, refresh không đổi source, save và đổi width không được tự xóa history. Rename phải giữ document identity. Raw↔rich/external reload phải có ranh giới history rõ để không phục hồi snapshot cũ sai mặt.
5. Kiểm tra cả blank, parsed, cached, empty-heading, HTML fallback. Không dùng serialize→parse lossy chỉ để reset history.
6. Thêm test article↔mnemonic và A→B→A; paste/edit/undo/redo; reload; rename; same-path khác Library; raw exit; canvas flush/unmount. Mở rộng test theo rủi ro thật, không một test cho mọi hàm wrapper.

DoD: các regression RED→GREEN; chỉnh một mặt không đưa content mặt/note khác vào; same-document Undo/Redo vẫn hoạt động. App-action Undo và Study Undo không đổi. Nếu cần core abstraction mới, ADR mới và docs cùng commit. Focused tests trước; chưa gọi release DONE.

### R02 — xác minh end-to-end và đĩa

1. Dùng disposable fixture với A/B khác nội dung, note hai mặt, ảnh/canvas và YAML opaque. Snapshot bytes + SQLite trước thao tác.
2. Browser: mở A chưa edit → Undo; edit A → B → Undo; đổi mặt → Undo; raw↔rich; Save/reopen. Dùng editor thật, assertion nội dung và file, không chỉ số lần gọi mock.
3. Native macOS isolated identifier/config: mouse mở note trước, sau đó CmdZ/CmdShiftZ, menu Undo/Redo, CmdS; lặp A/B và front/back. Đợi apply/flush xong trước đánh giá, không dùng sleep tùy ý thay readiness.
4. Phân biệt Undo nội dung, Undo app-action và Undo review. Kiểm tra linked source vẫn readonly và không bị grade/activate từ owner.
5. Normal quit ngay sau last stroke rồi reopen; so sánh source bytes không đụng, YAML, media, schedules/reviews/bindings. Không thử trên Library thật.

DoD: không có nội dung khác note/mặt sau Undo+save; chỉ expected edit đổi file; schema/schedule giữ nguyên. Nếu browser pass/native fail, giữ task mở với exact repro. Test core note save có thể @smoke theo AGENTS; ca dài còn lại ở regression, không tăng core lane vô tội vạ.

### R03 — smoke có khoảng dự phòng

1. Lấy JSON durations/retries và wall-clock gồm startup/teardown; chạy trên máy không có full test khác tranh CPU. Tách chi phí server, fixture copy, thao tác và cleanup.
2. Tối ưu đúng bottleneck: bỏ fixed wait khi đã có readiness, giảm setup lặp mà giữ fixture isolation, đóng page/writer trước cleanup. Không dùng một Library mutable chung cho tests.
3. Không tự sửa gate/hook hoặc tăng workers trước khi chứng minh isolation; không bỏ assertion/test/tag chỉ để đạt budget. Giữ nguyên release commands; thay đổi config lớn cần giải thích riêng.
4. Đo trước/sau cùng môi trường. Mục tiêu kỹ thuật ≤240s để có dư địa; gate bắt buộc vẫn <300s. Chạy ba lượt cuối retries0 khi đã tối ưu, ghi min/median/max và failures, không chọn một lượt tốt nhất.

DoD: đủ core coverage, không teardown race, mọi lượt đo cuối <300s; nếu chưa ≤240s phải ghi phần thiếu và bottleneck. Trong vòng sửa chỉ chạy test/file liên quan; full lane ở mốc nghiệm thu, không lặp vô hạn.

### R04 — accessibility/focus danh sách động, sửa khi có repro

Files: `NoteMemoryList.tsx`, `NoteLearningDashboard.tsx`, `useLearningDialogFocus.ts`, `noteMemory.css` và regression layout/workspace.

1. Test 0/1/50/51/1000 rows; unavailable rows; Home/End/arrows/Tab/ShiftTab vào/ra list; đổi folder khi row đang focus; refresh/reorder/remove focused row; quay từ note về list. Pending focus phải theo đúng item, không nhảy sang note khác sau đổi dữ liệu.
2. VoiceOver macOS: tên/chức năng control, vị trí item trong virtual list, focus modal và announcement loading/error/status. Không tự coi aria attributes tồn tại là VoiceOver pass.
3. Nếu có lỗi, viết regression trước sửa logic; dùng semantic HTML/ARIA đúng vai trò, shadcn hiện có. Không thêm icon/màu chỉ để tăng trang trí. Fix layout thuần CSS không bắt buộc TDD.
4. Kiểm tra light/dark, en/vi/de, narrow160/200/480, zoom125/150%, reduced motion và coarse emulation chỉ vùng bị tác động.

DoD: bằng chứng mouse/keyboard + kết quả VoiceOver thực chạy hoặc NOT RUN với lý do; mọi bug tìm được có disposition. Không tự xây lại toàn sidebar/editor. Mọi UI copy thay đổi dịch đủ18catalogs và validate.

### R05 — readiness của bản phát hành

1. Kiểm tra config license tldraw qua code/build env mà không in secret. Không mua/đăng ký/che notice. Nếu chưa cấu hình, ghi thiếu điều kiện production cụ thể.
2. Chỉ test OS/package thuộc target release thực tế; macOS debug QA không thay signed installer. Kiểm tra mở Library, edit/save, canvas, link, study trên artifact dự định phát hành.
3. CodeScene nếu có auth; thiếu ghi NOT RUN theo AGENTS/ADR0137. Không bắt user cung cấp token để tiếp tục bug fix.

DoD: bảng target/result/artifact rõ ràng. Có thể hoàn thành code follow-up khi production deployment còn blocked bởi config bên ngoài; không gọi deployment READY.

### R06 — nghiệm thu, tránh vòng lặp

- Chạy normal pre-commit/pre-push; full lint/types/build/frontend tests+coverage, Rust checks khi applicable theo AGENTS; không nới threshold/exclusion.
- Codacy touched-code so baseline, xử lý Critical/High mới và disposition Medium. Localization validate; no UI copy changes thì ghi rõ. Không event mới cho history fix nếu chỉ là bug fix; tránh PII.
- Cập nhật docs history contract, report theo task/commit/RED-GREEN/native/file hashes/limitations. Không sửa receipt U11 để che finding mới.
- Normal push main, verify remote SHA, clean tree/demo fixtures, dừng processes sở hữu. Docs-only receipt dùng lane hiện có; không chạy lại full gates sau đó chỉ để có thêm log.
- Kết thúc khi tasks thuộc scope pass hoặc có external limitation rõ. Failure mới phải fix hoặc báo BLOCKED có bằng chứng, không tuyên bố “không còn lỗi”.

## 4. Bằng chứng lượt review này

Baseline working tree sạch; source HEAD50406745. Đọc AGENTS, plan U00–U11, receipt U11, architecture/abstractions phần editor/learning, ADR0144/0147 và code được dẫn ở trên.

Command focused:

```sh
pnpm exec vitest run src/hooks/useEditorTabSwap.test.ts src/hooks/useEditorTabSwap.selection.test.ts src/hooks/useLearningLibrary.noteWorkspace.test.ts src/components/learning/NoteLearningDashboard.test.tsx src/components/learning/NoteLearningPanel.test.tsx src/components/learning/NoteMemoryStatus.test.tsx src/components/learning/useLearningDialogFocus.test.ts src/utils/wikilinks.test.ts
```

Kết quả **144 tests/8files PASS,4.46s**. Log `/tmp/memnova-post-ux-focused.log`. Tách biệt với **2probe RED**, không cộng thành suite pass. Không chạy lại full coverage/build/native/Playwright/Codacy trong lượt docs-only review; số U11 chỉ là lịch sử. CodeScene NOT RUN, optional unavailable. Localization: no UI copy changes. PostHog: no event needed, docs/review only. Không thay đổi runtime/dependency/schema/hook/fixtures hoặc dữ liệu người dùng.

## 5. Prompt giao model thực hiện

> Đọc AGENTS.md và docs/MEMNOVA-POST-UX-FOLLOWUP-PLAN.md. Thực hiện lần lượt R01–R06 với dependency trong ledger, không mở lại U00–U11. Ưu tiên F01; đưa probe thành regression chính thức và chạy RED trước fix. Dùng editor thật để kiểm tra history; không coi mock replaceBlocks là đủ. Giữ nguyên Markdown hai mặt/linked UUID, properties, SQLite schema5, lịch học và dữ liệu cũ. Trong vòng sửa chạy focused tests; release qua hooks bình thường, không bỏ kiểm tra. Mỗi task ghi commit, tests, native/data evidence và NOT RUN thật. Chỉ sửa UI khi có defect/tác vụ cụ thể; không tự redesign hay merge upstream. Dừng khi scope hoàn tất và report external deployment limitations riêng.

<a id="danh-gia-2026-11-14"></a>

## 6. Đánh giá Memnova ngày 14/11/2026

**7,7/10** cho người dùng desktop muốn viết Markdown và ôn tập ngay trên ghi chú, với macOS là nền tảng chính. Trọng số ưu tiên tác vụ học và khả năng lấy lại dữ liệu. Các điểm là nhận định sản phẩm trên mã nguồn `259c6f4a`, kết quả kiểm thử bên dưới và hồ sơ nghiệm thu. Chưa có khảo sát người dùng mới hoặc tỷ lệ hoàn thành tác vụ ngoài thực tế.

| Tiêu chí | Trọng số | Điểm /10 | Căn cứ và phần còn thiếu |
|---|---:|---:|---|
| Viết ghi chú và ôn tập | 25% | 9 | Từ ghi chú thường có thể bật ghi nhớ, viết mặt gợi nhớ, lưu, tự chấm rồi tạm dừng. Ca workspace kiểm tra cả nội dung trên đĩa và việc giữ nguyên trang nguồn. Cần đo người mới có tự tìm được luồng này hay không. |
| Bảo toàn và khôi phục dữ liệu | 25% | 9 | 8 ca Rust kiểm tra khôi phục cả hai mặt, media và lịch sử, từ chối backup hỏng, tương thích schema cũ. Nghiệm thu native trước đây có so hash tệp và bản ghi lịch ôn sau Undo. Phạm vi đóng bình thường theo ADR-0163. |
| Giao diện, bàn phím và khả năng tiếp cận | 15% | 7 | Nút Học nổi bật, trạng thái có chữ, kiểm tra tương phản và danh sách 1.000 mục đạt. Nút Thử lại bị bỏ qua khi Tab. VoiceOver và đổi thứ tự mục đang focus còn cần kiểm tra. |
| Bắt đầu sử dụng và tài liệu công khai | 15% | 5 | Màn chào ưu tiên tạo/mở Library cục bộ. README và hướng dẫn công khai dẫn theo luồng Tolaria cũ. Từ trang Git, người đọc thiếu chỉ dẫn giữ lịch học khi sao lưu. |
| Hiệu năng và độ tin cậy của kiểm thử | 10% | 8 | Có phép đo p95 và kiểm tra qua nhiều kích thước cửa sổ. Bản web dùng cho QA hiển thị sai năm. Lần chạy core gần nhất còn khoảng 26 giây trước ngưỡng 300 giây. |
| Sẵn sàng phát hành tới người dùng mới | 10% | 6 | Có bằng chứng native macOS debug. Trong hồ sơ đã đọc, việc cài artifact có chữ ký và cấu hình tldraw production cho bản Memnova dự kiến phát hành còn mở. Cần đối chiếu kênh tải và nền tảng hứa hỗ trợ. |

**Cách tính.** Tổng điểm từng hàng nhân trọng số bằng 7,70. Điểm tối đa cần cả kết quả tác vụ và bằng chứng trên môi trường đích. Chỉ có điểm phát hành phản ánh mức tin cậy vào bộ cài. CodeScene là phép đo riêng. [Hồ sơ native và release gần nhất](baselines/2026-10-19-editor-undo.md) · [Phép đo hiệu năng M24, dùng số ở mục “Final parser correction”](baselines/2026-10-19-note-memory-m24.md)

### Ba phát hiện cần hành động

1. **P1 · Hướng dẫn sao lưu thiếu phần lịch học.** Trang kết nối Git giới thiệu remote cho mục đích backup. Trong Memnova, thao tác Git của app loại dữ liệu học riêng tư. Người khôi phục chỉ từ Git có thể lấy lại Markdown nhưng thiếu lịch ôn và lịch sử. Đây là sai lệch hướng dẫn đã xác minh, chưa ghi nhận sự cố mất dữ liệu người dùng. Trang First Launch còn đặt mẫu Getting Started lên đầu, trong khi màn chào đặt mẫu dưới Advanced. Badge stable ở đầu README lấy phiên bản từ repo upstream. [Hướng dẫn Git](../site/guides/connect-a-git-remote.md) · [First Launch](../site/start/first-launch.md) · [README](../README.md) · [Quy tắc Git của Library](adr/0143-local-library-defaults-and-isolated-native-qa.md) · [Hướng dẫn nghiệp vụ đúng](MEMNOVA-NOTE-MEMORY-GUIDE.md)
2. **P2 · Bàn phím bỏ qua nút Thử lại sau lỗi tải mẫu.** Dùng renderer thật với bridge Chromium giả lập lỗi tải ở lần đầu, mở Advanced → Download sample Library. Retry hiện và enabled. Từ Create, tám lần Tab lặp hai vòng Open → Advanced → Download → Create. Shift+Tab lặp ngược, cũng bỏ qua Retry. Handler chặn Tab và dùng mảng ref thiếu nút vừa hiện. Smoke hiện tại click Retry bằng chuột. Người dùng bàn phím vẫn có thể quay lại thao tác tải mẫu chính. [Handler bàn phím và mảng ref](../src/components/WelcomeScreen.tsx#L304) · [Ca hiện tại](../tests/smoke/getting-started-template.spec.ts)
3. **P2 · Danh sách note trên bản web QA hiển thị năm 58839.** Ảnh ở cuối ca bật học → ôn → tạm dừng cho thấy ngày “November 17, 58839”. Adapter Vite trả `mtimeMs/birthtimeMs`, formatter nhận Unix giây rồi nhân 1.000. Rust trả giây. Script serve-demo cũng xuất mili giây. Lỗi quan sát trên renderer dùng Vite và fixture. Chưa thấy bằng chứng ngày sai trên native hoặc lịch FSRS bị thay đổi. [Adapter Vite](../vite.config.ts#L363) · [Adapter demo](../scripts/serve-demo.mjs#L152) · [Formatter](../src/utils/noteListHelpers.ts#L40) · [Đối chiếu Rust](../src-tauri/src/vault/file.rs#L14)

### Kế hoạch triển khai bổ sung

Ước lượng theo ngày công cho một người quen mã nguồn, chưa tính thời gian tuyển người dùng thử hoặc chờ bộ cài. Có thể bắt đầu A, B, C độc lập. R03–R06 giữ mã task đang dùng. F01 Undo đã sửa có bằng chứng riêng.

| Thứ tự | Việc cần làm | Điều kiện nghiệm thu |
|---|---|---|
| A · P1 · 0,5–1 ngày | Sửa README, First Launch, trang Git và liên kết từ mục cài đặt. Dẫn từ tạo Library tới viết một note, bật ghi nhớ, thêm gợi nhớ và ôn lần đầu. Chỉ nơi tạo, kiểm tra và khôi phục backup qua Home → Advanced → Backup history. Phân biệt nguồn gốc Tolaria với phiên bản và kênh cài Memnova. | Build site thành công. Một người làm theo bản hướng dẫn trên Library dùng thử, chấm một lượt, tạo và verify backup rồi restore vào thư mục mới. Đối chiếu cả hai mặt, media, lịch sử và ngày đến hạn. Từng cam kết về bộ cài có artifact tương ứng hoặc nêu rõ trạng thái. |
| B · P2 · 0,5 ngày | Mở rộng ca lỗi tải mẫu với Tab/Shift+Tab trước khi sửa. Ưu tiên để Tab dùng thứ tự DOM, giữ điều hướng mũi tên, Enter/Space và điểm focus ban đầu theo hành vi sản phẩm. Kiểm tra cả khi offline hoặc đang tải. | Ca ban đầu thất bại đúng ở Retry. Sau sửa, bàn phím đến được Retry từ hai hướng, Enter chỉ gửi một lần thử, chuột vẫn hoạt động. Xác nhận lại trên macOS WKWebView với Library cách ly. |
| C · P2 · 0,5 ngày | Đối chiếu hợp đồng timestamp của VaultEntry, sửa ranh giới trả dữ liệu của Vite và demo. Thêm fixture có thời điểm cố định, gồm trường hợp thiếu ngày. | Cùng một file hiển thị cùng ngày theo locale/múi giờ đã chọn trên hai adapter và đường native. Thứ tự Modified đúng. Kiểm tra lại ảnh danh sách trong ca workspace. Giữ nguyên đơn vị của scheduler. |
| D · R04 · 1 ngày | Kiểm tra danh sách 50/51 và 1.000 ghi chú ở ranh giới bật ảo hóa, sau lọc/xóa/đổi thứ tự và khi quay từ note. Bảng hiện dùng chỉ số cho pending focus. Chỉ thay logic sau khi tái hiện nhảy focus sai. Thực hiện lượt VoiceOver trên macOS. | Ghi item được focus và được đọc trước/sau, đường ra khỏi danh sách, focus sau đóng hộp thoại. Khắc phục lỗi tái hiện được, đính kèm ca hồi quy. [Danh sách](../src/components/learning/NoteMemoryList.tsx#L26) |
| E · R03 · 0,5–1 ngày | Đo startup, thao tác và teardown trên cùng máy. Tối ưu phần tốn thời gian nhất. | Ba lượt core với retries=0. Báo min/median/max, mỗi lượt <300 giây, mục tiêu ≤240 giây. Giữ nguyên assertions và phạm vi core. |
| F · R05 → R06 · 1–2 ngày kể từ khi có artifact | Trên các nền tảng thực sự dự định phân phối, đối chiếu phiên bản, nhà phát hành, chữ ký và cấu hình canvas. Cài mới và thử ghi → học → backup → restore. Tổng hợp các gate của repo theo phạm vi thay đổi. | Mỗi target có phiên bản/artifact, kết quả và lỗi mở. Xác nhận các chỉ dẫn tải của A dẫn đúng bản. Chấm lại sáu tiêu chí trên cùng trọng số sau A–F. |

Sau A/B, có thể kiểm tra điểm onboarding với 5 người lần đầu dùng Memnova. Mục tiêu đề xuất là ít nhất 4/5 người tự tạo note, thêm gợi nhớ và hoàn thành lượt ôn đầu trong 5 phút. Ghi riêng bước họ cần trợ giúp và liệu họ tìm được cách giữ lịch học khi đổi máy. Đây là mục tiêu cho vòng đánh giá tiếp theo.

### Bằng chứng của lượt chấm điểm

- **14/11, Chromium:** `pnpm exec playwright test --config playwright.integration.config.ts tests/integration/note-memory-workspace.spec.ts tests/integration/note-memory-layout.spec.ts --retries=0` đạt **16/16** trong **1,6 phút**. Đã xem ảnh dashboard và panel trên viewport 480 px ở zoom 150% tiếng Đức, cùng ảnh workspace sau khi tạm dừng. Probe Retry riêng ghi lại thứ tự focus và ảnh `/tmp/memnova-audit-20261114-retry.png`. Bộ ảnh Playwright ở `/tmp/memnova-audit-20261114-pw/` trên máy review.
- **14/11, logic:** 17/17 Vitest ở NoteLearningDashboard, NoteLearningPanel, useLearningDialogFocus và useLearningLibrary.noteWorkspace. `cargo test --manifest-path src-tauri/Cargo.toml --lib learning::note_backup_tests` đạt 8/8. `pnpm l10n:validate` đạt 18 catalog, 990 khóa gốc. Tài liệu Modern Web Guidance đã đối chiếu về focus, tên điều khiển và thao tác bàn phím.
- **Số lịch sử ngày 19/10:** frontend 87,37% line coverage, Rust 86,38%, core smoke 54/54 trong 274,30 giây. Chưa chạy lại full coverage, full smoke, native, VoiceOver hay signed installer trong lượt docs-only này. Lần cuối có Codacy trên mã sửa Undo ghi nhận không có Critical/High mới. Lượt này không có mã thay đổi để quét.
- **Phạm vi thay đổi:** bổ sung đánh giá và kế hoạch vào tài liệu này. CodeScene: not run (optional integration unavailable). Localization: no UI copy changes. PostHog: không cần event cho review. Refactor và ADR mới: không có.

### Tiến độ thực hiện ngày 14/11/2026

- **A, B, C đã sửa trong mã nguồn.** README và hướng dẫn công khai chỉ rõ Library cục bộ, luồng học một note, backup giữ lịch ôn và nguồn Tolaria. Vòng Tab trên màn chào đi đến Retry khi tải mẫu lỗi, rồi Enter thực hiện lại. Vite và serve-demo trả timestamp Unix giây theo hợp đồng Rust. Ca browser của B/C đã RED trước sửa và GREEN sau sửa. `pnpm docs:build`, 37 Vitest, hai ca Playwright tập trung, lint và TypeScript pass. Codacy CLI đã chạy ESLint9, Opengrep, Trivy và Lizard trên file code được chọn. Không có Critical/High mới; 5 cảnh báo Lizard mức Medium thuộc hàm WelcomeScreen đã vượt ngưỡng trước đợt này.
- **D, E, F còn mở.** Chưa có lượt VoiceOver và ca danh sách thay đổi khi focus đang chờ. Chưa đo ba lượt core smoke theo R03. Chưa nghiệm thu installer có chữ ký và license canvas production. Cần giữ các điều kiện này trong lần đánh giá phát hành tiếp theo. Bài hướng dẫn A đã build, nhưng bước người mới tự làm và đối chiếu restore trên installer đích chưa được thực hiện.
- **Gate phát hành của A–C:** normal commit `d538fb4b` và push `main` thành công. Pre-commit đạt 4.931/4.931 Vitest, 1.240/1.240 Rust unit, 3/3 ca workspace, 1/1 ca Retry và docs build. Pre-push đạt lint, types, build, frontend coverage **87,37% lines**, Rust coverage **87,39% lines**, core smoke **54/54 trong 4,9 phút** và 9/9 workflow checks. R03 còn mở vì mới một lượt, sát ngưỡng 5 phút và chưa đo bottleneck. Demo vault sạch. Localization: không thêm UI copy, 18 catalog/990 khóa đã validate. PostHog: không thêm event vì các sửa đổi khôi phục hành vi đang có và sửa adapter QA. ADR và refactor lớn: không có. CodeScene: not run (optional integration unavailable). Native WKWebView, VoiceOver, installer có chữ ký và restore theo hướng dẫn công khai chưa được chạy trong đợt này.

## Phụ lục — probe tái lập F01

Tạo tạm `src/hooks/reviewUndoProbe.test.ts`, chạy `pnpm exec vitest run src/hooks/reviewUndoProbe.test.ts`. Đây là evidence RED; khi R01 bắt đầu hãy đưa vào suite regression phù hợp và sửa để GREEN, không commit một suite cố ý fail.

```ts
import { BlockNoteEditor } from '@blocknote/core'
import { expect, it } from 'vitest'
import { applyBlocksToEditor } from './editorContentSwapApply'

it('loading an existing article must not create an undo step that empties it', () => {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const editor = BlockNoteEditor.create()
  editor.mount(mount)
  try {
    applyBlocksToEditor({ editor, blocks: [{ type: 'paragraph', content: 'Existing A4 article' }], suppressChangeRef: { current: false }, editorContentPathRef: { current: null }, targetPath: '/fixture/article.md', scrollTop: 0 })
    expect(JSON.stringify(editor.document)).toContain('Existing A4 article')
    editor.undo()
    expect(JSON.stringify(editor.document)).toContain('Existing A4 article')
  } finally { editor.unmount(); mount.remove() }
})

it('switching to another note must not allow undo to restore the previous note into it', () => {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const editor = BlockNoteEditor.create({ initialContent: [{ type: 'paragraph', content: 'Article A' }] })
  editor.mount(mount)
  try {
    applyBlocksToEditor({ editor, blocks: [{ type: 'paragraph', content: 'Article B' }], suppressChangeRef: { current: false }, editorContentPathRef: { current: '/fixture/a.md' }, targetPath: '/fixture/b.md', scrollTop: 0 })
    expect(JSON.stringify(editor.document)).toContain('Article B')
    editor.undo()
    expect(JSON.stringify(editor.document)).toContain('Article B')
  } finally { editor.unmount(); mount.remove() }
})
```
