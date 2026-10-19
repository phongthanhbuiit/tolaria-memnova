# Memnova — rà soát sau M25 và kế hoạch UX/UI

Ngày: 2026-10-19. Baseline: `77dd9d8211ebd4e8e3d385e2bf8a0670dc992cb9`.
Kế hoạch được chấp thuận để triển khai đầy đủ U00–U11. Bảng task là trạng thái hiện hành; findings và bằng chứng review bên dưới giữ nguyên như baseline lịch sử.

## 1. Kết luận và cách đọc báo cáo

M00–M25 hoàn thành phạm vi đã nghiệm thu. Không mở lại toàn bộ kế hoạch đó. Tuy nhiên, nghiệm thu chức năng không đồng nghĩa mọi bề mặt UX đã đồng bộ hoặc không còn lỗi. Lượt rà soát này tìm được hai lỗi P2 và một khoảng trống styling/QA cụ thể. Nên sửa U01–U02 trước khi làm các cải tiến thị giác.

Kiến trúc hiện tại phù hợp nghiệp vụ: note thường giữ nguyên; người dùng chủ động bật ghi nhớ; bài viết và gợi nhớ nằm trong cùng Markdown; mặt sau có thể tham chiếu note khác; lịch học độc lập; đọc/link không tự chấm điểm nguồn. Không có bằng chứng từ lượt này yêu cầu đổi schema, thuật toán hay chuyển nội dung vào SQLite.

Đây là review tập trung vào các đường đã nghiệm thu và bề mặt học/ghi chú, không phải kiểm toán mọi dòng của repository. Không tuyên bố “không còn lỗi dữ liệu” chỉ từ các test được chọn.

## 2. Findings có bằng chứng

### R01 — P2: JSON canvas xuất hiện trong preview danh sách note

- `src/utils/wikilinks.ts:495`: `extractSnippet` lọc từng dòng, bỏ fence nhưng giữ payload bên trong.
- `src-tauri/src/vault/parsing.rs:82` và `:150`: cùng kiểu xử lý ở native.
- Ảnh native M24 `native-parser-restart.png` đã được xem lại: hàng “Canvas memory QA” hiện `{"store":{"asset:...` trong snippet. Đây là ảnh nghiệm thu cũ ở source release hiện tại, không phải phiên native mới.
- Probe mới chạy trực tiếp hàm TS: đầu vào `# Canvas note`, đoạn `Visible prose.` và fence `tldraw` chứa JSON; mong đợi `Visible prose.`, thực tế `Visible prose. {"store":{"shape:private":{"typeName":"shape"}}}`. Test RED.
- Tác động: danh sách khó đọc, có thể đưa từ khóa cấu trúc canvas vào những bộ lọc dùng snippet. Không phải bằng chứng rò rỉ ra mạng hay mất dữ liệu.
- Sửa ở projection snippet, không sửa nội dung `.md`. Cần parity TS/Rust và dev adapter. Không xóa toàn bộ code block thông thường: test cũ có contract riêng.

### R02 — P2: lỗi tải đầu còn hiển thị sau đồng bộ nền thành công

- `src/components/learning/NoteLearningDashboard.tsx:55`: `refreshError` được set trong catch nhưng không có nhánh xóa khi snapshot mới đã tải thành công.
- `src/hooks/useLearningLibrary.ts:25`: load thành công cập nhật snapshot/clock và xóa `workspace.error`; không xóa error riêng của dashboard.
- Probe component: refresh lúc mount reject; refresh sau resolve, clock mới, rerender cùng dashboard; alert `temporary-read-failure` vẫn còn. Test RED.
- Phân biệt: reconnect có thể chuyển phase và remount dashboard nên không kết luận nút Retry luôn hỏng. Lỗi được chứng minh là stale alert sau background refresh trong cùng mount.
- `NoteLearningPanel` cũng lưu error cục bộ: kiểm tra riêng error tải và error thao tác; không xóa error ghi dữ liệu chỉ vì một background read thành công.

### R03 — P2: toolbar nguồn mặt sau nằm ngoài phạm vi style/QA chuẩn hóa

- `src/components/learning/NoteBackSource.tsx`: wrapper toolbar chỉ có border/padding/text; không có scope `.note-memory-nav`/`.note-memory-surface`.
- `src/components/editor-content/EditorContentLayout.tsx:560`: toolbar là sibling của face tabs, không nằm trong scope tabs.
- `src/components/learning/noteMemory.css:44` và `:82`: type scale, wrapping, coarse target áp dụng theo các scope trên. Toolbar không hưởng các rule đó; Button `sm` dùng kích thước mặc định riêng.
- `tests/fixtures/note-memory-layout.tsx`: surface `source` là **dialog chọn nguồn**, không phải toolbar. 378 tổ hợp cũ không chứng minh toolbar đã đồng bộ.
- Cần đo computed style thực tế trên toolbar trước sửa; chưa đo mới font/contrast toolbar, không gán một số pixel chưa kiểm chứng.

### R04 — cải tiến UX, không phải lỗi dữ liệu

- Editor có ba tầng: Content/Flashcards → Article/Mnemonic → nguồn. Toolbar nguồn còn xuất hiện ở mặt bài viết. Chữ “Flashcards” gây hiểu đây là nơi sửa hai mặt dù màn đó là điều khiển học.
- `NoteLearningDashboard` hiển thị ready dưới nhãn Active; chưa phân biệt trực quan đang đến hạn/chưa đến hạn. Status chủ yếu là chữ muted, mỗi note một khung lớn, thiếu path để phân biệt trùng tên.
- `NoteLearningPanel`: note draft có hướng dẫn nhưng chưa có CTA đi thẳng đến mặt gợi nhớ; Study disabled cần giải thích ngay gần hành động.
- `LearningStudyView`: đã có bốn màu viền cho Again/Hard/Good/Easy, có icon Reveal/Return. Close/Undo/Retry chưa nhất quán với các hành động lân cận. Thêm icon có chọn lọc, không cần icon cho mọi nút chấm điểm.
- Nhiều error đang đưa chuỗi kỹ thuật vào `<pre>` ngay giữa luồng chính; cần thông báo theo tình huống và chi tiết mở rộng khi cần.
- Properties đã có scope note editable và lịch/Legacy readonly; cần làm rõ bằng nhãn/nhóm, không tạo thêm bản sao properties của card mới.
- Width note, width block canvas và viewport học là ba phạm vi khác nhau; hiện đã có cơ chế width/fullscreen. Cần làm rõ và QA, không thêm setting trùng lặp.

### Những gì đã làm đúng, nên giữ

- shadcn Button/Dialog/Select/Switch; Phosphor icons; Inter và token màu hệ thống.
- Face tabs có roving focus/Arrow/Home/End; các vùng có status/alert; grade có text ngoài màu.
- Các control note-memory có scale 13px, target coarse 44px, reduced-motion; layout theo zoom.
- Source preview readonly, explicit Apply/Cancel; recovery giữ draft; review không làm thay đổi nguồn.
- SDK listener patch và opaque payload fix có regression riêng. Không nâng SDK hoặc xóa patch chỉ để chỉnh giao diện.

## 3. Bằng chứng mới và giới hạn

| Kiểm tra | Kết quả lượt này |
|---|---|
| Git trước review | HEAD 77dd9d82; working tree sạch |
| Vitest 8 file được chọn | 36/36 PASS; 5.95s |
| Probe R01/R02 | 2 RED đúng assertion mong đợi; 3 test đối chứng PASS; 3.20s |
| Playwright có chọn lọc, retries=0 | 2/2 PASS; 5.6s |
| 378 layout matrix / toàn bộ regression | Không chạy lại |
| Full coverage, Rust suite, Codacy | Không chạy lại; không sửa production code |
| CodeScene | NOT RUN, optional unavailable theo AGENTS/ADR0137 |
| Native interaction mới / VoiceOver / physical touch | NOT RUN |
| Localization | Không đổi UI copy trong lượt lập kế hoạch |
| PostHog | Không cần event cho review/tài liệu |

Vitest gồm: NoteLearningPanel, NoteLearningDashboard, NoteBackSource, NoteRecoveryDialog, LearningStudyView, NoteMemoryEditorTabs, noteCloseFlush, durableMarkdownTokens.integration. Playwright chọn hai test `system type scale` và `coarse targets` trong `tests/integration/note-memory-layout.spec.ts`. Chúng kiểm tra fixture; không chứng minh toolbar nguồn hay toàn ứng dụng đã đạt contrast/touch.

Probe là test tạm phục vụ audit, đã xóa sau chạy; không để suite fail trong repository. Log: `/tmp/memnova-ux-review-probes.log` (artifact tạm, không bảo đảm tồn tại trên máy khác). U01/U02 phải đưa regression tương đương vào suite chính, chạy RED lại trước fix.

Số 4891 frontend /1239 Rust, coverage 87.33%/86.37% và 54 smoke là **bằng chứng lịch sử M25**, không phải lần chạy mới. Xem [M25](baselines/2026-10-19-note-memory-m25.md) và [ledger cũ](MEMNOVA-NOTE-MEMORY-IMPLEMENTATION.md).

Giữ nguyên các giới hạn M25: license production tldraw chưa xác minh cấu hình, non-macOS/signed installer/VoiceOver chưa nghiệm thu; force-kill không thuộc bảo đảm normal-close. U11 phải báo đúng các mục này, không xem thêm icon là đã giải quyết license.

Tham khảo accessibility: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Áp dụng phù hợp desktop app; không tự thêm URL routing, đổi typography/brand hoặc dependency theo checklist web.

## 4. Định hướng thiết kế đã chốt cho kế hoạch

Giữ visual language của app. Mục tiêu: nhìn vào biết đang sửa note, đang sửa gợi nhớ hay đang ôn tập; mỗi vùng chỉ có một hành động chính đang khả dụng.

| Thành phần | Quy tắc |
|---|---|
| Font | Inter hiện có; control 13/20px, caption 12/18px, section 14/21px, dialog title 16/24px; nội dung bài viết giữ editor typography |
| Kích thước | Control feature desktop tối thiểu 36px; coarse tối thiểu 44×44px; không ép toolbar toàn app thành 44px |
| Khoảng cách | Dùng thang 4/8/12/16/24; dialog footer nhất quán, content có vùng cuộn riêng |
| Primary | Token primary xanh hệ thống: bật học khi chưa bật; Study khi sẵn sàng; Apply khi cấu hình đã hợp lệ |
| Secondary | Outline cho thay đổi phụ; ghost cho Close/Back/Undo/Advanced; destructive chỉ khi thật sự phá hủy |
| Trạng thái | Ready/đến hạn: xanh; paused: trung tính + Pause; draft/pending: amber + icon; invalid: error + cảnh báo; luôn có text |
| Icon | Phosphor có sẵn, 16px utility; icon-only có accessible name + tooltip; decorative aria-hidden; không pha bộ icon khác |
| Icon đề xuất | BookOpen bài viết; PencilSimpleLine gợi nhớ; Brain bật học; Play ôn; Pause tạm dừng; LinkSimple nguồn; ArrowSquareOut mở nguồn; ArrowUUpLeft quay lại/undo; ArrowClockwise thử lại; X đóng |
| Màu | Tái sử dụng `--primary`, `--foreground`, `--muted-foreground`, `--border`, `--feedback-*`, `--accent-*`; không rải hex trong component |
| Contrast | Chữ thường ≥4.5:1; control boundary/focus cần thiết ≥3:1; đo light/dark và composited background thực tế |
| Motion | Không thêm lật 3D; feedback ngắn và tôn trọng reduced-motion; không animate canvas document |

Không dùng nền xanh/lục cho toàn bộ hàng; badge/icon nhấn nhẹ để bài viết và canvas vẫn là nội dung chính. Không thêm font, thư viện icon, theme mới hay dependency UI.

## 5. Task ledger và dependency

Mỗi task dưới đây đủ nhỏ để model triển khai riêng. Không suy ra DONE từ việc kế hoạch được viết xong.

| ID | Ưu tiên | Phụ thuộc | Đầu ra | Trạng thái |
|---|---|---|---|---|
| U00 | P1 quy trình | — | Baseline/screenshot và trạng thái chuẩn | VERIFIED_LOCAL — [baseline](baselines/2026-10-19-ux-u00.md) |
| U01 | P2 bug | U00 | Snippet sạch payload, parity TS/Rust | NOT_STARTED |
| U02 | P2 bug | U00 | Error refresh đúng vòng đời | NOT_STARTED |
| U03 | P2 | U01,U02 | Control/style/icon contract dùng chung trong feature | NOT_STARTED |
| U04 | P2 | U03 | Editor navigation, toolbar nguồn, width UX | NOT_STARTED |
| U05 | P2 | U04 | Note learning panel theo trạng thái | NOT_STARTED |
| U06 | P2 | U03,U05 | Dashboard rõ trạng thái/đến hạn | NOT_STARTED |
| U07 | P2 | U03,U04 | Study dialog/action hierarchy | NOT_STARTED |
| U08 | P2 | U03,U04 | Source/conversion/recovery dialogs | NOT_STARTED |
| U09 | P2 | U03,U05 | Properties scope và readonly clarity | NOT_STARTED |
| U10 | P2 | U04–U09 | Accessibility/layout/localization regression | NOT_STARTED |
| U11 | P1 release | U01–U10 | Native/data checks, release evidence, normal push | NOT_STARTED |

### U00 — khóa baseline và trạng thái trước khi sửa

- Đọc AGENTS hiện hành, ADR0137/0147/0148/0163/0164, ARCHITECTURE, ABSTRACTIONS, M25 và tài liệu này. Ghi HEAD, git dirt và dependency commits.
- Dùng Library QA riêng, không user Library. Fixture gồm ordinary, enabled draft, ready due, ready future, paused, source missing, pending recovery và Legacy; note trùng tên ở hai folder; bài A4, ảnh, canvas.
- Chụp editor/panel/dashboard/study/source/properties light/dark; đo toolbar nguồn + tabs + dialog buttons cùng app zoom. Ghi rõ native/browser/fixture.
- Chạy lại 36 baseline test chọn lọc và 2 browser test trên. Tạo `docs/baselines/<date>-ux-u00.md` với lệnh/exit/count, ảnh, các lỗi cũ R01/R02.
- DoD: trạng thái/repro/measurements đủ để so sánh; không chỉnh code trong task baseline. CodeScene unavailable ghi NOT RUN, không yêu cầu token lặp lại.

### U01 — snippet không hiển thị payload nội bộ

- Phạm vi: `src/utils/wikilinks.ts`, `src/utils/wikilinks.test.ts`, `src-tauri/src/vault/parsing.rs`; tìm các caller/dev adapters để cùng semantics. Tách helper nhỏ nếu cần, không trộn learning service vào vault parser.
- RED TS/Rust: prose + valid tldraw; canvas-only; hai canvas; LF/CRLF; fence có metadata width/id; fence dài/nested; ordinary code block giữ contract cũ. Repro tối thiểu: `# Canvas note\n\nVisible prose.\n\n```tldraw\n{"store":{}}\n```\n` phải cho `Visible prose.`.
- Chỉ bỏ payload durable fence trong snippet projection; heading fallback cũng không lấy dữ liệu từ fence. Invalid/unclosed fence không được làm mất prose bên ngoài; xác định boundary theo parser hiện có, không regex tham lam.
- Không tự cắt mọi note tại marker FLASHCARD:BACK. Nếu muốn front-only snippet, phải có nhận diện note-memory hợp lệ và test literal ordinary marker; tách riêng quyết định đó khỏi fix payload.
- Test focused: `pnpm exec vitest run src/utils/wikilinks.test.ts`; `cargo test --manifest-path src-tauri/Cargo.toml extract_snippet`. Browser note-list save/reopen và native reload để kiểm tra parity, file hashes không đổi do render.
- DoD: JSON không xuất hiện; code note bình thường và UTF-8 truncation không hồi quy; không sửa file/SQLite khi chỉ xem danh sách. Có RED/GREEN, Codacy và docs nếu thêm abstraction.

### U02 — trạng thái lỗi tải đúng vòng đời

- Phạm vi: NoteLearningDashboard và tests; `useLearningLibrary` chỉ nếu cần tín hiệu snapshot thành công rõ ràng. Kiểm tra NoteLearningPanel tương tự, không trộn lỗi refresh với lỗi mutation.
- RED: refresh đầu fail, cùng mount nhận snapshot mới thành công (clock cập nhật), alert cũ biến mất; lỗi mới vẫn hiện; response cũ sau đổi Library/unmount không cập nhật UI; Retry thành công/fail được kiểm tra qua wrapper thực.
- Gắn lỗi read với lần đọc/generation tương ứng hoặc dùng nguồn read-state duy nhất; không xóa tất cả error trên mọi render, không che lỗi save/recovery.
- Retry disable khi pending, failure được bắt; không gọi reconnect/refresh lặp vô hạn. Giữ lịch/canvas/source nguyên trạng.
- Test focused: NoteLearningDashboard, NoteLearningPanel, useLearningLibrary; thêm integration lỗi đọc tạm thời → snapshot mới → banner biến mất.
- DoD: hai đường recovery nền và Retry đều đúng; không có unhandled promise/loop; báo lỗi mutation không bị nuốt.

### U03 — chuẩn hóa control và trạng thái thị giác

- Phạm vi: `noteMemory.css`, `cardEditor.css`, `cardEditorStyles.ts`, `EditorIconButton.tsx`; reuse shadcn hiện có. Không chỉnh Button toàn app khi chỉ cần scope feature.
- Tạo class/variant feature rõ nghĩa cho utility button, status badge, action row nếu thật sự được dùng nhiều nơi; tránh wrapper framework tổng quát.
- Thêm scope cho toolbar nguồn; giữ icon size/wrapping/target như contract mục 4. Hợp nhất rule trùng, không selector ảnh hưởng nội dung BlockNote/tldraw.
- Icon-only cần tooltip + localized aria-label; button có chữ không bắt buộc tooltip. Không set aria-label khác nhãn hiển thị gây lệch voice control.
- Kiểm tra desktop/coarse, light/dark, focus-visible, reduced-motion. CSS thuần không bắt buộc TDD; behavior mới phải có regression.
- DoD: bảng computed-style cùng loại control nhất quán; portal không mất style; không đổi editor text/serialized data. Thêm toolbar vào fixture để test thực sự bao phủ R03.

### U04 — editor: hai mặt rõ ràng, toolbar theo ngữ cảnh

- Phạm vi: EditorContentLayout, NoteMemoryEditorTabs, NoteBackSource, Editor.css và tests liên quan.
- Với note-memory, tên tab quản lý học phải thể hiện “Ghi nhớ”/“Memorization”; Legacy giữ tên thẻ cũ. Thêm key riêng, không đổi global `learning.cards` ảnh hưởng Legacy.
- Giữ tầng Content/management để tránh đổi navigation sâu; Article/Mnemonic vẫn là hai mặt trong Content. Toolbar chọn nguồn chỉ hiện khi mặt Mnemonic được chọn; trạng thái link vẫn rõ khi vào mặt sau.
- Giữ một primary per vùng, source title/path rút gọn hợp lý, đầy đủ khi focus/tooltip; source missing có Retry/Open/Choose phù hợp, không mở source nếu unavailable.
- Width: giữ setting note normal/wide hiện có áp dụng hai mặt; canvas block resize độc lập; fullscreen chỉ thay viewport. Không thêm column SQLite hoặc lưu camera do thay bố cục.
- Regression: mouse/tab/arrows/restore focus; switch face flush; source apply/cancel; raw/diff không hiện toolbar sai; pause không mất back; width hai mặt và fullscreen exit giữ giá trị.
- DoD: ít thanh điều khiển thừa khi đọc bài; không giảm khoảng nội dung A4; không đổi source/history khi chuyển mặt; source lựa chọn vẫn explicit.

### U05 — panel quản lý học theo trạng thái

- Phạm vi: NoteLearningPanel, PageFlashcards và tests. Nếu cần navigation tới mnemonic, truyền callback theo đường editor hiện có; không global event tùy tiện.
- Ordinary: lời giải thích ngắn + Enable primary. Enabled draft: badge/hướng dẫn + CTA “Thêm gợi nhớ” vào đúng editor face. Ready: Study primary, Pause secondary. Paused: Resume primary, giải thích giữ lịch. Pending/invalid: hành động recovery tương ứng, không Study.
- Move các thao tác conversion/Legacy/backup vào vùng phụ rõ nghĩa; recovery đang pending phải nổi bật, không giấu trong menu.
- Đang xử lý: label/loading feedback, disable double submit; thành công thông báo status ngắn. Disabled Study có lý do nhìn thấy được, không chỉ tooltip trên disabled button.
- Regression mỗi trạng thái; bật/tắt không xóa canvas/schedule; CTA chỉ điều hướng không tự ghi/chấm điểm; source linked không tự enable nguồn.
- DoD: user biết bước kế tiếp trong từng trạng thái; “đã thuộc” vẫn là grade hoặc Pause, không thêm cờ mastered/schema mới.

### U06 — dashboard dễ quét và phân biệt đến hạn

- Phạm vi: NoteLearningDashboard, noteWorkspace (chỉ projection), tests.
- Hàng gọn gồm tên, path phụ khi cần, badge trạng thái và due text từ schedule hiện có; due/future phân biệt với trạng thái ready. Dùng Intl, không hardcode format ngày.
- Một Study primary cho scope folder; hiện số đến hạn; giữ include-subfolders và không kéo linked sources vào scope. Giữ Legacy lane tách biệt.
- Empty state phân biệt không có note học và không có note đến hạn; CTA hướng dẫn mở note/bật học, không tạo note tự động.
- Precompute map pageId→page thay `.find` cho mỗi row nếu sửa rendering. Giữ content-visibility hiện có; chỉ thêm virtualization bằng dependency sẵn có khi đo cho thấy cần, không tự mở thêm performance project.
- Không thêm search/filter/sort mới trong task này; có thể ghi backlog sau nếu user muốn.
- Test due/future/paused/draft/pending/invalid, trùng tên, folder empty, 1000 rows, long locale. Click row chỉ mở đúng note.
- DoD: status hiểu được không cần đoán màu; due count/queue đúng; performance không xấu hơn baseline quá 20% trong cùng fixture/môi trường.

### U07 — màn ôn tập, phân cấp hành động và focus

- Phạm vi: LearningStudyView, LearningStudyFaces, useStudyFaces, noteMemory.css và tests.
- Header tên note + progress + Close nhất quán; footer Reveal primary trước reveal; Return secondary, bốn grade cân bằng sau reveal; Undo ghost có icon. Không làm Good lớn hơn để gây thiên lệch rating.
- Giữ màu đỏ/cam/lục/xanh cho grade, text/shortcut/interval luôn đọc được; không dựa vào màu để phân biệt. Label button không bị ngắt nghĩa khi zoom.
- Chốt reading measure cho A4; mnemonic canvas có không gian phù hợp, không sửa persisted width/camera vì layout học. Chỉ chỉnh CSS hiển thị trong scope Study.
- Keyboard 1–4 không cướp input/canvas controls; Space/Enter đúng focus; Escape đóng theo hiện trạng; focus quay về nơi gọi. Source error/answer not ready không cho grade.
- Regression grade/undo/wait/resume, missing source, long article, canvas readonly, media, double click. Mouse primary path trước keyboard.
- DoD: readonly study hashes không đổi; linked source không tăng reps/reviews; grade vẫn chỉ một mutation; progress và error accessible.

### U08 — dialogs và thông báo lỗi nhất quán

- Phạm vi: NoteBackSourceDialog, SourceSelectionPreview, NoteConversionDialog/Choices/Preview, NoteRecoveryDialog/useNoteRecovery.
- Footer: Cancel/Close secondary, Apply primary khi hợp lệ; Retry/Keep disk mô tả rõ kết quả, không đổi default resolution. Thêm icon cho nhóm hành động phục vụ nhận diện.
- Source dialog giữ preview readonly, chọn mặt explicit, cảnh báo việc đăng ký nguồn trước Apply; không auto chọn mặt hay enable nguồn.
- Recovery chọn draft hiển thị note/path thay vì chỉ “Draft 1” khi dữ liệu read-view đã có; không nới API/schema chỉ để thêm label. Pending nổi bật, retained phân nhóm phụ.
- Message lỗi theo enum/code đã có: mô tả và bước khắc phục; technical details trong disclosure có Copy. Unknown error fallback vẫn giữ chẩn đoán; không đưa note text/path vào analytics.
- Regression stale preview, partial registration, pending retry, failed refresh sau commit, clipboard failure; đóng/mở dialog reset lỗi UI cũ nhưng giữ dữ liệu draft thật.
- DoD: không đổi CAS/journal/idempotence; Apply/Cancel/recovery còn nguyên bảo vệ dữ liệu; focus/scroll footer dùng được ở 480px/150%.

### U09 — properties: phân biệt editable và readonly

- Phạm vi: NoteMemoryInspector, NoteLegacyDetails, PagePropertyTools/Editor và inspector integration.
- Nhóm “Thuộc tính ghi chú” editable; “Lịch học” readonly; “Dữ liệu thẻ cũ” collapsible readonly. Icon lịch/khóa thông tin khi cần, không khiến người dùng nghĩ toàn bộ YAML bị khóa.
- Due/reps/lapses hiển thị Intl/tabular-nums; explanatory text ngắn rằng custom property không đánh dấu đã thuộc và không sửa thuật toán lịch.
- Giữ copy Legacy metadata, opaque values; không cho edit owned `_memnova_*` hoặc nhân đôi source properties vào owner.
- Regression Boolean/number/string/array, YAML anchors/null/large integers, readonly owned keys, source linked, narrow inspector; file diff chỉ đúng user edit.
- DoD: note properties vẫn tự do theo editor hiện có; không phát sinh card-properties mới cho mỗi mặt.

### U10 — QA tích hợp UX, accessibility và localization

- Phụ thuộc U04–U09. Mở rộng fixture có toolbar nguồn **và editor composition**, không chỉ components rời; screenshot baseline light/dark/en/vi/long German.
- Matrix kích thước 480/768/1280, app zoom 100/125/150%; có narrow editor khi sidebar/properties mở. Test cả nội dung dài, empty, disabled, busy, error.
- Đo control alignment/font/overflow, focus, text contrast và target. Grade/status colors đo riêng; test cũ chỉ primary/caption không đủ cho bảng màu mới.
- Mouse/tab/arrows/Escape, focus restoration, coarse emulation, reduced-motion. VoiceOver/physical touch nếu thực chạy, nếu không ghi NOT RUN.
- Chạy `pnpm l10n:translate` khi có credentials; nếu thiếu, dịch affected keys đủ target theo AGENTS, `pnpm l10n:validate`; không copy English cho mọi locale.
- Test cosmetics trong integration/regression, không gắn @smoke. Không tăng full core smoke vượt 5 phút.
- DoD: screenshot được người thực hiện xem, không chỉ tạo; mọi failure có disposition; không suy ra “đẹp” chỉ từ zero overflow.

### U11 — nghiệm thu và release có giới hạn rõ

- Chạy full mandatory checks/hook theo AGENTS, frontend ≥70%, Rust ≥85%; không nới exclusion/threshold. Tách số mới khỏi M25 cũ.
- Codacy touched files, baseline/new findings và Medium disposition; CodeScene khi configured, unavailable ghi NOT RUN; không tự hạ thresholds.
- Native QA disposable Library: ordinary → enable → edit article/back → source link/cancel → save/reopen → study/grade/undo → pause/resume; pending recovery, conversion, props và width. File/table hash chứng minh expected mutation.
- Last stroke → normal quit/reopen và canvas unmount cleanup regression vẫn pass; không tự chạy toàn performance matrix mỗi CSS commit, nhưng release kiểm tra đường bị thay đổi.
- Tldraw production notice: xác minh cấu hình license nếu có quyền/cấu hình; nếu chưa có, báo rõ release deployment limitation, không ẩn watermark hay mua/đăng ký thay user.
- Cập nhật guide, architecture/abstractions nếu component/hook mới; báo cáo `docs/baselines/<date>-ux-u11.md` ghi từng task/commit/tests/native/limitations.
- Commit/push main bằng hook bình thường. Sau push xác minh remote SHA, clean tree/demo fixtures, dừng QA processes của task. Chỉ khi đó task release DONE.

## 6. Quy trình để model nhỏ không chạy vòng lặp

1. Chỉ nhận task có dependency DONE hoặc VERIFIED_LOCAL được ghi rõ cùng commit trong batch được phép; không coi prose “đã làm” là bằng chứng.
2. Mỗi bug viết regression RED, fix tối thiểu, GREEN. Chạy file/module liên quan trong vòng sửa, không full suite sau từng dòng CSS.
3. Dùng `pnpm test:related <source>` hoặc `pnpm exec vitest run <test-file> -t '<case>'`; Rust filter theo module/test. Test 0 cases không phải PASS chứng minh behavior.
4. Chạy `node scripts/precommit-checks.mjs --plan` sau staging để biết hook chọn gì; không sửa hooks để né kiểm tra.
5. Commit theo AGENTS. Nếu gom release theo batch, ledger phải ghi VERIFIED_LOCAL đến khi normal push thành công; không gọi DONE sớm. Không chạy full suite đồng thời với sửa file hoặc browser tests và lint tranh `test-results`.
6. Khi gate pass và không có source change tiếp, không chạy lại vì muốn thêm một receipt; docs-only hooks có lane riêng. Evidence ghi trực tiếp, không sửa lịch sử M25 để che lỗi mới.

Mẫu giao việc:

> Đọc AGENTS.md và docs/MEMNOVA-UX-UI-REVIEW-PLAN.md. Thực hiện Uxx, xác minh dependency commits và baseline. Giữ contract Markdown/SQLite/source/FSRS/Legacy. Viết regression RED trước fix; chạy focused tests khi phát triển và release gates theo AGENTS. Không thêm schema/dependency/feature ngoài task. Ghi bằng chứng, giới hạn NOT RUN, cập nhật trạng thái đúng; commit/push bình thường khi đến mốc release, không bỏ hook.

Mẫu kết quả mỗi task: HEAD/dependencies; phạm vi; baseline; RED/GREEN; source/data mutation; tests count/time; ảnh đã xem; Codacy; CodeScene hoặc NOT RUN; localization; analytics; ADR/docs; commit/push; dirt/process cleanup; việc còn lại. Không tự tạo Todoist/nhắn người khác.

## 7. Ngoài phạm vi đợt này

Không đổi schema5, FSRS/XP, cơ chế backup/journal, hidden canvas folders, sidecar back file, lưu toàn note vào SQLite; không merge upstream toàn bộ; không redesign navigation toàn app; không thêm “mastered” flag, clone UI, theme/font/icon pack mới. Các đề xuất đó cần đánh giá riêng nếu user yêu cầu.
