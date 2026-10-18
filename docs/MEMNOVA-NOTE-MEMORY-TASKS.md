# Memnova các task triển khai học thuộc trang ghi chú

Trạng thái: **chưa task nào được triển khai**. Hợp đồng bắt buộc: [plan nghiệp vụ và dữ liệu](MEMNOVA-NOTE-MEMORY-PLAN.md). Kết quả thực tế ghi vào [ledger](MEMNOVA-NOTE-MEMORY-IMPLEMENTATION.md). Đường dẫn file mới bên dưới là đề xuất vị trí, không phải khẳng định file đã tồn tại.

## 1. Cách thực thi

- Mỗi task là một đơn vị nghiệm thu; có thể nhiều commit TDD nhỏ nếu cần. Không gom toàn bộ thay đổi vào một commit lớn.
- Trước task: đọc dependency/evidence, kiểm tra working tree, baseline focused và CodeScene nếu đã cấu hình. Không đụng thay đổi không thuộc task.
- Các task đầu tạo nền tảng nhưng chưa expose UI chuyển đổi/binding mới cho người dùng. Chỉ mở luồng note memory mặc định ở M20 sau khi các phụ thuộc đã xong. Legacy path phải chạy được trong mọi checkpoint.
- Sau từng bug cycle chạy file test cụ thể, sau một module chạy related/module tests. Full release gate ở mỗi normal push theo hook, không mỗi lần gõ code. Xem mục 4 để chọn test.
- Definition of Done chung: implementation đúng scope; regression/behavioral test pass; lint/types; scan Codacy touched code; docs/ADR/l10n/telemetry liên quan; preserved data; verified commit/push; ledger có evidence thực. Các task docs-only được miễn code coverage/scan không liên quan, nhưng không được ghi là đã chạy.
- Mỗi báo cáo phải tách failure có sẵn, failure mới và NOT RUN. Nếu gate thất bại, sửa nguyên nhân trong scope hoặc báo blocker cụ thể; không hạ threshold/tắt hook.
- CodeScene theo AGENTS hiện hành của fork: optional khi không có quyền truy cập; không sửa AGENTS hoặc yêu cầu credentials lại cho từng task.

## 2. Thứ tự và phụ thuộc

Thực thi mặc định theo mã tăng dần. Bảng cho biết dependency thật, không yêu cầu chạy nhiều agent.

| Task | Kết quả | Phụ thuộc |
|---|---|---|
| M00 | Baseline, fixture và inventory hành vi | Không |
| M01 | Contract Markdown và codec frontend | M00 |
| M02 | Codec Rust và parity golden corpus | M01 |
| M03 | Schema additive, binding và journal models | M02 |
| M04 | Ghi file có expected source và recovery journal | M03 |
| M05 | Reconcile note sang binding/lifecycle | M04 |
| M06 | API note và guard đường ghi card cũ | M05 |
| M07 | Resolver study và validation nguồn | M06 |
| M08 | Backup/restore cho schema và operation mới | M07 |
| M09 | Preview conversion chỉ đọc | M08 |
| M10 | Apply/resume conversion bảo toàn dữ liệu | M09 |
| M11 | UI chọn dữ liệu và phục hồi conversion | M10 |
| M12 | Canvas flush trước đổi ngữ cảnh | M00 |
| M13 | Canvas lỗi không bị ghi đè | M12 |
| M14 | Canvas assets portable và restart | M13 |
| M15 | Editor hai mặt theo note | M06, M12, M13, M14 |
| M16 | Chọn nguồn mặt sau và preview | M07, M15 |
| M17 | Rename/move/clone/delete trong mô hình mới | M08, M15, M16 |
| M18 | Properties trang và metadata legacy | M11, M15 |
| M19 | Study hai mặt bài viết và gợi nhớ | M07, M15, M16 |
| M20 | Dashboard, folder scope và cutover UI | M11, M17, M18, M19 |
| M21 | Style, accessibility, localization audit | M20 |
| M22 | Integration và recovery failure matrix | M21 |
| M23 | Native QA và bảo toàn dữ liệu | M22 |
| M24 | Performance và kiểm tra tài nguyên | M23 |
| M25 | Release gates, docs và handoff | M24 |

## 3. Chi tiết task

### M00 Baseline và bộ dữ liệu tổng hợp

**Mục tiêu:** có bằng chứng trước thay đổi và fixture cho tất cả dạng dữ liệu, không dùng Library thật.

**Đọc:** AGENTS; docs/ARCHITECTURE.md và ABSTRACTIONS phần editor/learning; ADR-0137–0146 liên quan; baseline release gần nhất; `Editor.tsx`, `useFlashcardEditorFace`, `flashcardMarkdown`, `TldrawWhiteboard`, learning store và test helpers.

**Làm:** ghi HEAD/branch/toolchain; chạy focused tests editor faces/durable blocks/learning; kiểm tra các integration hiện có và cách chạy native isolated. Tạo fixture tổng hợp: note thường, bài A4 hai mặt, front/back CRLF, canvas có shapes, empty/invalid canvas, ảnh tên Unicode, note linked, một card đã sửa khác Markdown, nhiều card/page, opaque properties, review đã undo, session paused. Không tạo snapshot từ dữ liệu thật. Đo baseline production open/save ordinary note theo fixture và cách đo M24, giữ cấu hình để so lại; không đợi tới cuối đợt mới đo baseline.

**Nghiệm thu:** baseline có command/exit/duration; inventory source/schema/IDs; fixture manifest có file hash và table rows; test helper tái tạo fixture deterministic. Screenshot baseline editor/current study nếu môi trường hỗ trợ; nếu không ghi NOT RUN và M23 vẫn bắt buộc. `git status` demo fixtures sạch. Không đánh dấu đây là implementation của mô hình mới.

### M01 Contract và codec Markdown frontend

**Mục tiêu:** tách/patch hai mặt và owned metadata mà không mất vùng không sửa.

**Phạm vi:** `src/utils/flashcardMarkdown.ts`, helper codec mới nếu cần, tests và shared golden corpus dưới `tests/fixtures/note-memory/`. Tạo ADR mới theo số còn trống ở thời điểm code, ghi quyết định note-first/inline canvas/binding SQLite; không sửa ADR lịch sử. Codec cũ có thể giữ adapter cho legacy callers; không âm thầm áp parsing mới lên importer cũ.

**RED/behavior:** marker trong tldraw JSON/code/frontmatter/inline code không split; marker hợp lệ ngoài fence; nhiều marker diagnostics; no-op byte exact; sửa front không đổi back/metadata; indented code back; BOM/LF/CRLF; unknown properties/duplicate owned keys/version mới hơn. Toggle disabled không gọi removeFlashcardBack.

**Làm:** trả ranges/diagnostics thay vì chỉ trimmed strings; patch từng mặt/owned scalar keys; thêm cấu hình version1 trong plan. Ngăn field hệ thống bị tạo/rename từ generic properties. Không dùng parser Markdown UI để tự rewrite full source.

**Nghiệm thu:** golden corpus có expected raw ranges/metadata/diagnostics; codec thuần, không IPC/file write; toàn bộ legacy tests hiện có pass; documented compatibility rõ. Chưa expose tab/bật học mới.

### M02 Codec Rust và kiểm tra parity

**Mục tiêu:** backend tự kiểm tra đúng cùng format với frontend.

**Phạm vi:** parser mới trong `src-tauri/src/learning/` và tests; dùng `legacy_markdown`/`page_identity` làm tham khảo. Không sửa legacy schedule import thành thuật toán mới.

**Tests:** cùng golden corpus M01 ở Rust; UTF-8 multibyte offsets; malformed YAML/unknown version; marker fence dài; frontmatter được bỏ đúng ở view nhưng giữ ở source. Note thường có marker literal không tự active.

**Làm:** parser thuần đọc bytes UTF-8 và typed config; serializer patch owned fields giữ unrelated bytes; no coercion/unknown key deletion. Có diagnostic không đồng nghĩa tự sửa dữ liệu.

**Nghiệm thu:** cả hai suite parse/patch cho kết quả tương đương về nội dung/diagnostic; run existing migration preview tests để chứng minh không phá importer. Thêm docs abstraction, không IO mutation ở codec.

### M03 Schema binding và journal

**Mục tiêu:** thêm storage tối thiểu, không conversion nội dung tự động.

**Phạm vi:** `storage_metadata.rs`, `store.rs`, `mod.rs`, migration SQL mới, schema tests, IPC descriptors `LibraryDescriptor`/fixtures/backup version validators. Hai bảng theo plan; payload journal typed/versioned. ADR storage cùng commit.

**Tests trước:** upgrade v1/v2/v3/v4 → version mới giữ nguyên tất cả tables cũ/schedules/reviews/unknown property JSON; migration failure rollback; unique page/card bindings; owner mismatch; foreign-key integrity; future version fail closed; pre-upgrade backup thật được verify.

**Làm:** dùng backup-first upgrade đã có; không ALTER/reset schedules, không tự bind bất kỳ page; không nâng version trước transaction thành công. Giữ old-format backup đọc được. Các read-only preview không gọi Store::open làm upgrade ngầm.

**Nghiệm thu:** chỉ schema thêm; source bytes/mtime không đổi; bảng binding/journal rỗng sau upgrade; internal APIs gated khỏi UI cho tới M20. Không dùng v5 cố định nếu version đó đã có ở HEAD mới.

### M04 Save coordinator và phục hồi giữa file với SQLite

**Mục tiêu:** source ghi an toàn và retry không tạo mutation trùng.

**Phạm vi:** `learning/page_content.rs`, coordinator mới; `commands/vault/file_cmds.rs`, `vault/file.rs` chỉ khi cần expected-source plumbing; migration operation lock hiện có. Không thay semantics ordinary note autosave ngoài phần guard dùng chung đã test.

**RED/behavior:** conflict trước persist không overwrite; mất response replay op; crash sau prepared, sau rename file, trước/giữa transaction; file hiện khác before/after → conflict giữ nguyên; error/quota/permission không trả success; source switch/rename trong flight không ghi nhầm owner.

**Làm:** immutable intent + expected hashes + staged atomic replace + transactional completion theo plan §4.3. Xây fault injection chỉ trong test. Chuẩn hóa outcome committed/pending/conflict. Recovery chỉ retry phần chưa commit. Compact bytes tạm của applied save theo plan, test retry/compaction không mất outcome; giữ conversion snapshots và pending/conflict. Không append payload từ frontend như SQL hoặc path tùy ý.

**Nghiệm thu:** restart process/reopen store khôi phục đúng; repeated resume không thêm card/revision; table/file manifest chứng minh chỉ vùng dự kiến đổi. Document giới hạn với external writer không tuân app lock; không tuyên bố distributed transaction.

### M05 Reconcile binding và lifecycle

**Mục tiêu:** `.md` điều khiển note-learning đúng trạng thái, lịch học giữ nguyên.

**Phạm vi:** note service mới, `pages.rs`, `page_content.rs`; dùng coordinator M04. Chỉ ghi source khi có intent explicit; sync không tự format lại note.

**Tests:** enable lần đầu tạo một card/binding; retry/concurrent enable vẫn một; disable/re-enable giữ memory; source rỗng/invalid/blank canvas không active; metadata mới qua external edit được reconcile; marker/legacy flag không auto-bind; UUID move/duplicate; enabled false không xóa back. Sửa back không chạm schedule/reviews/XP.

**Làm:** compute readiness và state transition; bound cards dùng dedicated validator, front/back SQLite chỉ snapshot tương thích. Hash/revision chỉ tăng nếu source khác. Pending recovery block đối tượng liên quan. Khi DB thiếu trong Library có dấu hiệu learning cũ, báo phục hồi, không âm thầm tạo “history trống” rồi coi thành công.

**Nghiệm thu:** state table của plan được test; source changes reconcile cả qua app save và watcher, nhưng session/grade vẫn re-read tại M07. Unknown metadata lỗi không bỏ qua để active.

### M06 Typed IPC và guard legacy mutations

**Mục tiêu:** frontend có một service note-memory và không còn đường ghi card snapshot cạnh tranh.

**Phạm vi:** `src-tauri/src/commands/learning.rs`, `learning_tests.rs`, `src/lib/learning/types.ts`, `client.ts`, browser mock tương ứng. Không cho SQL/arbitrary root qua IPC.

**Tests:** expected revision/op ID required; stale library UUID/owner bị chặn; operation fields lạ bị reject; errors không biến thành empty result; update/clone/status legacy đối với bound card bị chặn; legacy card chưa bind vẫn hoạt động. Retry đã commit trả receipt/outcome cũ.

**Làm:** typed note state/read/config/resolve/conversion operation contracts; discriminated legacy/note content. Giữ existing RateRequest optional-field backward compatibility, không tự sửa receipts cũ.

**Nghiệm thu:** types và command validation tests pass; mock mô phỏng contract và error states, không được dùng mock để tuyên bố persistence native đã qua. Docs kiến trúc/abstractions cập nhật.

### M07 Resolver mặt trước mặt sau và bảo vệ review

**Mục tiêu:** học đúng snapshot note, target face và media thực sự đã hiển thị.

**Phạm vi:** `study_source.rs`, `review_validation.rs`, `session_models.rs`, `sessions.rs`, `reviews.rs` và tests. Không thay `scheduler.ts`/engine calculations.

**Tests:** note front/back live từ file; source front không chứa back; target back inline được dùng; target linked-back bị chặn; self/source missing/duplicate ID; A↔B front không recurse; move đổi media base; thay owner/target/media khi đang học chặn new rating; exact replay trước validation; undone receipt không replay. Empty explicit scope không thành all-Library.

**Làm:** resolve content discriminant và fingerprints; note properties từ page, legacy metadata giữ semantics cũ. Local media dependencies thu thập qua codec có giới hạn/cache; hashing ở backend snapshot boundary, không mỗi React render. Dedupe canonical card ID trong queue; legacy queue chọn riêng ở M20.

**Nghiệm thu:** bất biến reviews/schedule/XP/undo hiện có pass; source fail không downgrade sang snapshot cũ. Preview nguồn không tạo session/review. Đường read-only không mutate file.

### M08 Backup restore với binding và journal mới

**Mục tiêu:** restore được cả hai mặt, canvas, images, history và trạng thái recovery.

**Phạm vi:** `backup.rs`, `backup_files.rs`, `backup_tests.rs`, verification/descriptor helpers; không mở rộng private allowlist tùy tiện vì plan không có canvas sidecar.

**Tests:** backup mới ở idle; reject hoặc recover rõ pending note operation trước publish snapshot; backup cũ v1–v4 restore vào directory mới; checksum/media missing; note/source/canvas ảnh root mới; WAL consistency; binding integrity; journal payload version lỗi; library UUID mismatch.

**Làm:** inventory content và image bytes; signature source không cache theo absolute root sau restore. Pending operation không được backup thành trạng thái “healthy” mâu thuẫn; bounded recovery hoặc báo pending, không tự loop vô hạn.

**Nghiệm thu:** real filesystem + SQLite round-trip, old backup không bị sửa; nguồn Library không thay đổi bởi verify. Không coi Git là backup database.

### M09 Preview chuyển đổi chỉ đọc

**Mục tiêu:** phân loại từng trang/card và cho thấy lựa chọn trước khi ghi.

**Phạm vi:** conversion planner mới riêng với importer cũ; typed preview read route; synthetic fixtures M00.

**Tests:** đủ hàng trong plan §5.1; SHA/mtime/DB rows trước-sau preview bằng nhau; unopened Library không sinh `.memnova`; source changed tạo preview khác; nhiều cards không bị chọn theo thứ tự hoặc mtime; opaque properties được giữ nguyên representation.

**Làm:** output lý do, candidate IDs, source/card text diff, schedule/history summary, affected media/property summary; safe suggestion không áp dụng. Display-facing text dịch ở UI, backend dùng error codes. Schema cũ đọc read-only theo version hoặc báo cần bước upgrade explicit, không auto-upgrade trong preview.

**Nghiệm thu:** preview không tạo UUID persisted/backup/entry; phân biệt “có thể reuse lịch” với “user đã xác nhận cùng mục tiêu học”. Không claim equivalent dựa title→whole page.

### M10 Apply resume chuyển đổi

**Mục tiêu:** áp đúng lựa chọn, giữ dữ liệu và có thể tiếp tục sau crash.

**Phạm vi:** conversion runner, coordinator/journal M04; reuse verified backup API, binding M05. Không viết lại importer legacy hoặc schedule engine.

**Tests:** verified backup trước first mutation; stale preview rejected; cancelled selection no mutation; restart ở mọi checkpoint; repeated apply no extra cards/reviews; exact schedule/history for reused card; fresh schedule khi user chọn mục tiêu mới; multi-card survivors unchanged; properties/hints cũ xem được; active session phải được pause trước.

**Làm:** persist immutable plan/IDs/selected faces/reuse choice; preserve before snapshots và raw legacy properties trong durable journal/report. Những trang không chọn không ghi. Report done/conflict/skipped riêng; mỗi outcome có evidence reference.

**Nghiệm thu:** table-by-table và file manifest compare chứng minh chỉ intended source/binding/state/revision đổi; no dropped tables/rows/unknown fields. Resume nhận file neither-before-nor-after thì dừng trang đó, không force.

### M11 UI chuyển đổi và compatibility metadata

**Mục tiêu:** người dùng chọn cụ thể mà không cần hiểu SQL.

**Phạm vi:** learning conversion surface mới, dùng `LearningMigration`, `BackupPanel` và dialog primitives như pattern; không gắn conversion vào mỗi lần mở note.

**Tests:** preview/diff → chọn mặt → chọn reuse/new memory → xác nhận → apply; conflict/skip/multi-card; Cancel trước apply no write; lost response retry/resume; Library switch bỏ late result; committed refresh failed chỉ retry refresh. Keyboard focus không chấm study phía dưới.

**Làm:** giải thích bài/gợi nhớ được lấy từ đâu; dòng riêng “các thẻ cũ còn lại được giữ”; metadata legacy read-only có thể xem/copy, không merge properties. Các thao tác dữ liệu xung đột bắt buộc có selection, không dùng default ẩn. Entry point chưa là mặc định đến M20.

**Nghiệm thu:** UI copy đầy đủ locale, telemetry enum/count; browser flow đủ, native persistence sẽ kiểm M23. Không nói “đã chuyển tất cả” khi còn skipped/conflict.

### M12 Flush canvas trước khi đổi ngữ cảnh

**Mục tiêu:** nét vẽ cuối không mất khi lật/chuyển note ngay.

**Phạm vi:** `TldrawWhiteboard.tsx`, `editorSchema.tsx`, flush contract editor, `useEditorSave`/`useAppSave` nếu cần. Tái sử dụng autosave; helper nhỏ và keyed theo editor/board.

**RED:** fake timer vẽ → chưa tới 350ms → flush/lật/unmount; snapshot cuối phải tới serializer; nhiều board/note → không ghi nhầm; rejected file save giữ dirty và chặn navigation. Viết test hành vi không chỉ assert clearTimeout bị gọi.

**Làm:** register synchronous document-snapshot flush trước BlockNote serialization, await durable note save trước context teardown. Cleanup bỏ listener nhưng không phải cơ chế duy nhất để lưu. Không flush camera/selection vào document.

**Nghiệm thu:** tests cho Cmd+S, raw switch, close tab, rename, Library switch; read-only no write. Scoped regression và existing editor save tests pass. Không nới raw mode save guard.

### M13 Bảo vệ snapshot canvas lỗi

**Mục tiêu:** dữ liệu không đọc được không bị thay thành bảng trắng rồi ghi đè.

**Phạm vi:** snapshot parsing/loading state trong whiteboard, error UI/locale, renderer readiness.

**RED:** invalid JSON/unsupported snapshot/loadSnapshot throw giữ original raw; thao tác mở/đóng không onSnapshotChange empty; read-only source lỗi không phát onReady success; board mới rỗng vẫn mở được.

**Làm:** phân biệt empty mới và corrupt existing; error state có xem/copy raw, retry/recovery qua bản backup. Không thêm nút destructive reset tự động. Renderer báo status loading/ready/error tới parent, không dựa chỉ React mount.

**Nghiệm thu:** invalid snapshot round-trip giữ bytes cho đến khi người dùng sửa có chủ đích; lỗi board này không làm hỏng board khác. Keyboard/fullscreen error state không mất focus.

### M14 Tài nguyên canvas portable

**Mục tiêu:** ảnh vẫn hiện khi đóng/mở app hoặc chuyển/restore Library.

**Phạm vi:** `TldrawWhiteboard.tsx`, `vaultAttachments.ts`, asset adapter phù hợp API tldraw đang cài, attachment commands hiện có, codec snapshot nếu cần. Đọc package source/types phiên bản cài trước khi dùng API; không nâng tldraw vì tiện.

**Tests:** file picker/paste/drop/Vocab Image; tên Unicode/space; render runtime asset URL nhưng serialized path portable; ephemeral blob không là nguồn duy nhất; missing/foreign-library/path traversal rejected; old asset URL giữ nếu chưa chuyển được; move root/restart/restore real bytes. Image import late result không vào note khác.

**Làm:** dùng attachment pipeline và local ID/path resolution, preserve legacy snapshots; adapter resolve chỉ khi render. Nếu asset cần migrate, có explicit report/backup không âm thầm xóa dữ liệu. Không download arbitrary remote URL; báo nguồn online chưa portable khi thực sự gặp.

**Nghiệm thu:** serialized document không còn URL máy hiện tại đối với asset mới nhập; không thay format các board không chạm; broken media không biến thành success. No attachment GC trong task.

### M15 Editor Bài viết và Gợi nhớ

**Mục tiêu:** soạn bài dài và mặt gợi nhớ ngay trong editor chính.

**Phạm vi:** `Editor.tsx`, `useFlashcardEditorFace.ts`, `FlashcardEditorTabs.tsx`, layout editor liên quan, note state hook/service mới. Không chỉ bật lại legacy `_fsrs_enabled` UI.

**Tests:** note thường không bị split bởi marker literal; opted-in/retained-back note có đúng tab; front edit giữ back raw và ngược lại; raw mode full document; no-op no write; face switch sau typing/canvas giữ changes; external edit conflict; dirty save fail không navigate; delayed generation không ghi note khác.

**Làm:** use typed note state; canonical document và face projection duy nhất; owned source/config save qua M04–M06; restore front khi mở note khác. Thêm chèn ảnh/whiteboard bằng existing actions; respect current note width, fullscreen canvas. Hidden face không còn trong tab/accessibility order.

**Nghiệm thu:** một mục cây thư mục; một pipeline autosave; shadcn tabs/buttons và l10n; back rỗng có hướng dẫn tạo gợi nhớ, không tự tạo canvas khi chỉ mở. Note chưa bật học có thể giữ/sửa back mà không queue.

### M16 Nguồn mặt sau liên kết

**Mục tiêu:** chọn nguồn tường minh và không sửa nguồn ngoài ý muốn.

**Phạm vi:** `SourcePagePicker`, `SourcePagePreview`, editor back toolbar và client resolver. Reuse autocomplete thay vì select danh sách riêng.

**Tests:** inline→link→inline giữ local back; source front/back selection; page without back; linked-back-of-linked blocked; self blocked; rename target follows UUID; missing target no fallback; source picker Cancel no write; failed save giữ draft; preview keyboard không trigger rating.

**Làm:** source preview read-only, tên/path/face rõ; open source flushes owner; regular target remains in tree và không được enable. Nếu target bật học, preview không có grade hoặc tăng reps. Copy text từ source thành local back không phải tính năng task này.

**Nghiệm thu:** external target edits invalidate study source; user có thể relink/return inline mà không xóa source. Không lần theo link body để auto-load toàn graph.

### M17 Rename move clone delete và identity

**Mục tiêu:** thao tác ghi chú không làm lệch bài, gợi nhớ hoặc lịch học.

**Phạm vi:** existing note/folder lifecycle hooks/commands, `pages.rs`, clone preparation, binding guards. Không viết lại toàn bộ file manager.

**Tests:** đổi title/filename/folder giữ page/card ID/schedule; duplicate note tạo ID mới, không nhận history cũ; inline canvas duplicate không dùng chung mutable store; linked clone giữ target UUID, không sửa target; duplicate copied UUID báo conflict; xóa owner loại khỏi study nhưng giữ history; xóa target báo missing ở owner; ordinary folder copy/delete vẫn semantics hiện có.

**Làm:** dùng UUID path update và flush coordinator; trước destructive delete nêu nội dung hai mặt của note sẽ bị xóa, không gọi đó là reversible trash nếu file API hiện xóa thật. Không cascade xóa ảnh dùng chung hoặc page nguồn. Restore backup giữ binding/history.

**Nghiệm thu:** real filesystem lifecycle tests; generic card clone không bypass note identity; linked source references dùng đúng base path sau move. Nếu sự thay đổi cần refactor rộng ngoài note learning, ghi task follow-up thay vì tự redesign.

### M18 Properties một trang và dữ liệu tương thích

**Mục tiêu:** user hiểu properties thuộc trang, memory thuộc hệ thống; dữ liệu card cũ không mất.

**Phạm vi:** Inspector, PagePropertyTools/Editor, property snapshot/writer guards, legacy detail surface M11; giữ generic property controls đã sửa.

**Tests:** add/rename/remove/convert property note không đổi back/canvas/raw unknown fields; system fields reserved; status custom không suspend; huge integer/null/nested/list aliases giữ nguyên; hint-only retry không ghi Markdown lại; legacy metadata vẫn đọc/copy được sau binding.

**Làm:** UI note chỉ có một nhóm properties editable. Read-only memory panel dùng schedule thật. Metadata cũ riêng có nhãn “dữ liệu thẻ trước chuyển đổi”, không display như properties đang có hiệu lực. Không tự import image/audio vào mặt gợi nhớ.

**Nghiệm thu:** shared property conversion/focus regressions ở bản `9991efc2` vẫn pass; chưa chuyển card legacy vẫn sửa properties như cũ. No schema builder/required-property rules mới.

### M19 Study bài và gợi nhớ

**Mục tiêu:** hỗ trợ đọc bài, lật che bài, nhìn gợi nhớ, đối chiếu và tự đánh giá.

**Phạm vi:** `LearningStudyView`, `useLearningStudy`, `BlockNoteReadOnly` renderer status, media readiness. Legacy branch giữ Q/A cũ.

**Tests:** note front lấy live file; lật unmount/hide front khỏi màn hình và accessibility tree; back canvas read-only; return front không chấm; hidden image/audio không leak; source/media error block new rating; pointer actions trước keyboard; 1–4/space không chạy trong canvas/input/dialog; reload cùng text nhưng hash mới render ack lại; retry/undo/relearning/session resume giữ behavior.

**Làm:** face state theo complete study snapshot; chấm chỉ sau back ready, cho quay về bài đối chiếu; không tự rating. Giữ scroll/camera session-only trong cùng lượt. Media gợi nhớ không lấy từ property image ở front. Open target study phải có hành động rõ và giữ phiên owner, không preview thành review.

**Nghiệm thu:** schedule adapter untouched; grade payload bound to displayed snapshot; legacy test suite vẫn pass. Không trình bày “đã thuộc toàn bộ bài” chỉ vì user trả lời Good.

### M20 Dashboard folder scope và mở luồng mới

**Mục tiêu:** note memory thành trải nghiệm mặc định, legacy không biến mất.

**Phạm vi:** learning workspace hooks/context, Dashboard, note toolbar/Inspector integration, `pageScope`/folder study, PageFlashcards routing.

**Tests:** folder có ordinary/enabled/disabled/invalid notes → queue đúng; nested folders theo lựa chọn scope hiện hành; arbitrary links không kéo target vào queue; bound card không có ở legacy; unbound legacy vẫn xem/sửa/học/restore được; due counts hai lane không trùng; restore/reconnect không tự conversion hoặc show all ready; Library chưa import vẫn đi qua setup/preview cũ, không force ready; missing DB không thành fresh Library; UI create legacy mới được gỡ nhưng importer và old recovery không vỡ.

**Làm:** hiển thị note lane và “Thẻ cũ” có counts/entry chuyển đổi; bật mới qua note, không thêm card độc lập; entry migration/recovery accessible. Capability gate mở khi schema/API/editor sẵn sàng, không remote flag phụ thuộc mạng.

**Nghiệm thu:** người dùng mở app vẫn ghi chú được mà không phải chuyển tất cả dữ liệu; no auto-enable across folder. Không đánh dấu completed Library khi còn conversion conflicts.

### M21 Style accessibility và copy cuối

**Mục tiêu:** surfaces mới đồng bộ hệ thống và dùng được trong cửa sổ nhỏ.

**Phạm vi:** scoped layout/style của surfaces mới; global tokens/primitive không đổi nếu không có regression chứng minh cần. Không redesign toàn app.

**Checks:** widths 480/768/1280, height640; zoom100/125/150; light/dark; English/Vietnamese/German; all locale key parity; coarse44px; reduced-motion; no horizontal overflow; primary action phân biệt utility action; icons có accessible name; tab/arrow/Escape/Cmd+S; screen-reader behavior nếu có tool.

**Làm:** thống nhất “Bài viết/Gợi nhớ/Bật học thuộc”, không lẫn “Answer” ở note lane; layout giữ width user và canvas fullscreen. Translate toàn bộ targets bằng Lara nếu available, nếu không manual đúng AGENTS. Check placeholders/names.

**Nghiệm thu:** screenshots thực tế được xem; computed styles/contrast/focus evidence; không fake screen-reader pass từ axe hoặc DOM assertions. Không thêm cosmetic test vào curated smoke.

### M22 Integration và fault matrix

**Mục tiêu:** chứng minh end-to-end contract giữa renderer, IPC, files và database.

**Phạm vi:** test/helper/fixture; production fix chỉ khi failure được regression rồi ghi rõ task liên quan cần reverify. Browser mocked tests không thay Rust/real-file tests.

**Bắt buộc:** các nhóm I01–I12 ở mục 5; create/enable/edit/back/restart/review; linked source+properties; conversion mixed/conflict/retry; early canvas context switches; backup root move; native command tests real filesystem. Golden corpus/corruption/identity độc lập với UI.

**Nghiệm thu:** evidence command/exit/duration và artifact folder; zero retries để pass hoặc flake được xử lý; touched preservation assertions không chỉ screenshot. Core smoke chỉ thêm nếu bảo vệ note save/open/navigation core; giữ <5 phút, còn lại integration/regression.

### M23 Native QA trên Library tổng hợp

**Mục tiêu:** xác minh Tauri/WebKit, lưu file/SQLite và media thật.

**Phạm vi:** QA-only config ngoài repo, MEMNOVA_CONFIG_HOME debug tuyệt đối, identifier/incognito riêng; không đổi HOME hoặc đụng Library thật. Rebuild native backend vì schema/IPC đã đổi; không dùng binary cũ để claim pass.

**Kịch bản:** mouse enable note A4 → sửa hai mặt → chèn ảnh → vẽ/freehand/text → đổi mặt ngay → Cmd+S/đổi note → quit/restart; linked source move/missing; conversion cancel/apply/conflict/resume; disable/re-enable; clone; backup/restore root mới; grade/undo real DB. Keyboard follow-up sau mouse path.

**Bằng chứng:** screenshot xem trực tiếp, file/table before-after manifest, schema/integrity/FKs, persisted snapshot/media hashes; source/history không đổi ngoài expected fields. Đo đường vẽ cuối và invalid board recovery, không chỉ board có hiện.

**Nghiệm thu:** app/Vite owned processes được đóng, demo dirt sạch; test notes ngoài fixture không có. Touch hardware/screen reader không có thì NOT RUN, không gán kết quả mô phỏng thành thực máy.

### M24 Performance và vòng đời tài nguyên

**Mục tiêu:** việc thêm mặt gợi nhớ không làm ghi chú thường nặng lên hoặc tốn hash toàn Library.

**Phạm vi:** đo trước, chỉ tối ưu vùng có bottleneck bằng chứng; không nâng dependency/bundle architecture tự phát.

**Fixture đo:** note A4 khoảng 5–10KB text; back 3 ảnh local đã resize, canvas100 và1000 shapes; Library tổng hợp 1000 note, 100 note enabled. Công bố kích thước ảnh/snapshot và phần cứng, chạy production build cho timing. Không coi fixture này là giới hạn sản phẩm.

**Chỉ tiêu:** ordinary note open/save không regression p95 quá20% so với baseline cùng máy sau warm-up; ít nhất20 lượt đo mỗi case; không tăng DB rows/history khi pan/zoom/read; thao tác board không gây write/hash trên mỗi pointer event; không rescan toàn Library mỗi keystroke. Nếu baseline quá nhiễu thì ghi chưa kết luận, đo lại có kiểm soát, không bịa speedup.

**Nghiệm thu:** không leak listeners/timers/object URLs khi đổi20 notes/Library; no lost last stroke dù debounce. Nếu sửa production code, rerun affected M22/M23 trước M25, không dựa QA cũ.

### M25 Release và bàn giao

**Mục tiêu:** phát hành có bằng chứng, không còn implementation task pending.

**Làm:** rà invariants và matrix; cập nhật ARCHITECTURE/ABSTRACTIONS/GETTING-STARTED/ADRs mới và hướng dẫn user; báo migration limitations, legacy lane và backup nghĩa gì. Full frontend và Rust gates theo AGENTS, Codacy tất cả touched/new code, l10n, build, core smoke, integrations; normal verified commit/push main. Tách advisories baseline/new; không silence rules.

**Nghiệm thu:** frontend coverage≥70%, Rust lines≥85%; no new Critical/High; smoke<5min; native evidence sau lần sửa cuối liên quan; git remote SHA khớp local, working tree và demo sạch. CodeScene NOT RUN nếu unavailable. Ledger M00–M25 có proof, không để row DONE với evidence “chưa chạy”.

**Bàn giao:** release report có commit range, schema version, conversion/rollback hướng dẫn, known limitations, test duration, evidence paths. Không mở PR hoặc bypass hook. Chỉ kết luận xong nghiệp vụ khi cả ordinary notes, enabled note memory và legacy preservation được xác minh.

## 4. Test nhanh theo task

Các lệnh bên dưới chọn phạm vi, không thay release gate. Không chạy cả suite sau mọi thay đổi nhỏ. Thay tên file/test mới theo implementation thực tế và kiểm tra output thực sự có test chạy.

```bash
# Codec hiện có và codec mới liên quan
pnpm exec vitest run src/utils/flashcardMarkdown.test.ts src/utils/tldrawMarkdown.test.ts src/utils/editorDurableMarkdown.test.ts

# Một test/case đang sửa
pnpm exec vitest run <file.test.tsx> -t '<tên hành vi>'
pnpm test:related <source-file>

# Module learning sau một cụm thay đổi
pnpm test:learning

# Rust filter theo module/test; luôn kiểm tra số test không bằng 0
cargo test --manifest-path src-tauri/Cargo.toml learning:: -- --nocapture
cargo test --manifest-path src-tauri/Cargo.toml <test_name>

# Integration mới chạy riêng config integration, không tự gắn @smoke
pnpm exec playwright test --config playwright.integration.config.ts <spec-path>

# Staged-path selection của hook
node scripts/precommit-checks.mjs --plan

# Kiểm tra types/copy khi có thay đổi tương ứng
pnpm exec tsc -b
pnpm l10n:validate
```

`pnpm test:changed` có thể chọn 0 test ở clean tree; không dùng output đó làm chứng cứ coverage. Khi đổi shared schema/IPC/renderer, chạy các suite phụ thuộc gồm legacy, không chỉ test mới. Review Codacy dùng CLI/MCP theo AGENTS; quét đúng tất cả file changed so với starting commit, kể cả staged, không scan rỗng rồi ghi PASS.

## 5. Ma trận nghiệm thu tích hợp

| Mã | Kịch bản | Điều phải chứng minh |
|---|---|---|
| I01 | Note thường đọc/sửa/đổi folder | Không learning binding/queue/review tự sinh; frontmatter/body giữ như note thông thường |
| I02 | Enable note A4 và tạo back ảnh+canvas | Một note trong tree, front/back đúng, metadata đúng, một card ID, save/restart giữ nội dung |
| I03 | Gõ/vẽ rồi lật ngay, raw switch, đổi note, quit | Nét cuối và nội dung mới nhất tồn tại; lỗi save giữ draft, không điều hướng rồi mất |
| I04 | Back inline↔linked, target front/back | Inline giữ nguyên; đúng source face/base media; target không auto-enable/review; no recursion |
| I05 | Properties typed và opaque | Không mất raw values/arrays/aliases/số lớn; không ảnh hưởng back; legacy metadata có nơi xem |
| I06 | Migrate một card cùng/khác nội dung | Chọn bản explicit; giữ card ID/schedule nếu reuse; không overwite conflict; snapshots recoverable |
| I07 | Multi-card/missing/trashed/legacy whole-page | Không gộp history hoặc bỏ survivors; legacy lane còn đầy đủ; không giả equivalent |
| I08 | Crash/retry/concurrent writer | Source trước/sau đúng; stale intent rejected; op/card/review không duplicate; external changes được giữ |
| I09 | Study flip/rate/undo/relearn | Che mặt đúng; source/media ready; rating explicit; fingerprints check; unchanged scheduler/XP |
| I10 | Rename/move/clone/delete | Identity đúng; source link không hỏng vì rename; clone fresh memory; delete không cascade target/media |
| I11 | Backup/restore root mới và old versions | Markdown/canvas/media/bindings/reviews/history match; no absolute-path dependency; integrity/FKs pass |
| I12 | UI/theme/locale/zoom/touch/focus | Main editor width, fullscreen, no clipped controls; accessible names; no keyboard grade leak |

Bằng chứng bảo toàn dữ liệu phải so cả **giá trị và sự vắng mặt của mutation**: IDs, cardinality, schedules/reviews/sessions/profile, raw property JSON/hints, file hashes, file mtimes khi no-op. Với mutation dự kiến, liệt kê đúng fields được phép đổi. Chỉ kiểm `integrity_check=ok` chưa chứng minh không mất dữ liệu nghiệp vụ.
