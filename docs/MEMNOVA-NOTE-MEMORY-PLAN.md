# Memnova kế hoạch học thuộc trang ghi chú bằng mặt gợi nhớ

Ngày: 2026-10-18. Trạng thái: **thiết kế để triển khai, chưa thay đổi ứng dụng hoặc dữ liệu**. Source được đối chiếu tại `88ae677a` trên `main`.

Mục tiêu: app vẫn là ứng dụng ghi chú. Người dùng viết một bài, có thể dài một trang A4, trong một `.md`; chỉ khi chọn học thuộc thì trang đó trở thành một đơn vị học. Mặt trước là bài viết. Mặt sau chứa hình ảnh, chữ hoặc whiteboard để gợi nhớ bài viết, hoặc lấy nội dung từ một trang khác. Cây thư mục vẫn chỉ có một mục cho trang đó.

Đọc cùng [task chi tiết](MEMNOVA-NOTE-MEMORY-TASKS.md) và [sổ triển khai](MEMNOVA-NOTE-MEMORY-IMPLEMENTATION.md). Model thực thi phải đọc cả ba trước khi code. Plan này thay thế định hướng sản phẩm “trang chứa nhiều card mới” cho luồng mặc định sắp triển khai; không tuyên bố schema/ADR cũ đã được thay đổi, không vô hiệu hợp đồng bảo toàn dữ liệu cũ. Chỉ task tương ứng mới được sửa code. Các card SQLite hiện có phải tiếp tục truy cập được.

## 1. Phạm vi đã chốt

### 1.1 Bất biến nghiệp vụ

1. Trang Markdown mặc định là ghi chú thường; mở trang, thêm ảnh/canvas hoặc đặt trang trong folder không tự bật học.
2. Một trang được bật học có tối đa một liên kết tới card học của chính trang đó. ID ổn định, không dùng tên/path làm danh tính.
3. Mặt trước là nội dung chính của trang. Mặt sau là **gợi nhớ**, không mặc định diễn giải là đáp án cho một câu hỏi ngắn.
4. Mặt sau mặc định nằm trong cùng `.md`, sau marker cũ `<!-- FLASHCARD:BACK -->`. Whiteboard dùng tldraw có sẵn, lưu snapshot trong fenced block Markdown có sẵn.
5. Hai mặt là cách trình bày trong editor; không tạo hai mục trong cây thư mục. Không tự tạo folder canvas cho từng folder ghi chú.
6. SQLite giữ binding, lịch học, review, session và trạng thái phục hồi. Nội dung trang và cấu hình nguồn mặt sau có bản chính ở Markdown. Không có hai editor ghi hai bản nội dung độc lập.
7. Có thể chọn trang khác làm mặt sau. Liên kết nguồn không bật học cho nguồn, không nhân bản card, không tự chấm nguồn.
8. Properties người dùng chỉnh ở trang. Memory/schedule là dữ liệu hệ thống chỉ đọc trong UI. Metadata card cũ không tự xóa, tự gộp hoặc đổi kiểu.
9. Tắt học giữ bài, mặt sau, nguồn liên kết và lịch sử. Bật lại giữ card ID và schedule; không reset ngày đến hạn hoặc tự thưởng XP.
10. Mở trang, lật mặt, xem canvas, xem nguồn hoặc skip không phải một lần trả lời. Chỉ hành động tự đánh giá mới ghi review.
11. Không sửa thuật toán FSRS, tham số, fuzz, công thức XP, ý nghĩa rating 1–4, undo hoặc receipt replay trong đợt này.
12. Folder study chỉ lấy các trang đã bật học trong phạm vi đã chọn. Link thông thường không mở rộng hàng đợi. Một card ID chỉ xuất hiện theo quy tắc session hiện tại, không thêm bản sao do link.

### 1.2 Không làm trong đợt này

- Không canvas editor mới, dependency mới, cloud/collaboration, image occlusion, AI tạo mnemonic, tự đánh giá trí nhớ hoặc điểm “đã thuộc 100%”.
- Không lưu canvas thành file riêng; không tạo `.memnova/boards`, folder whiteboard theo từng folder, hoặc một app quản lý canvas độc lập.
- Không mở rộng Markdown để có nhiều card mới trong một trang; không tự tách bài dài thành câu hỏi.
- Không tự merge upstream, sửa toàn bộ hệ thống theme, chuyển nội dung sang SQLite BLOB, hoặc bỏ SQLite/history.
- Không xóa luồng card cũ khi vẫn có dữ liệu chưa chuyển. Không đổi mọi legacy card thành note card bằng suy đoán.
- Không thêm export bundle/copy toàn bộ Library ngoài cơ chế backup/restore hiện có. Copy một `.md` ngoài app vẫn có thể thiếu attachments; tài liệu phải nói rõ.

## 2. Điểm xuất phát và phần tái sử dụng

| Source hiện tại | Kết luận cho triển khai |
|---|---|
| `src/utils/flashcardMarkdown.ts` | Có marker và splitter/joiner; hiện tìm substring và trim, chưa đủ để giữ nguyên hai mặt có code fence/indentation. Cần contract mới và regression trước khi dùng làm đường ghi chính. |
| `src/hooks/useFlashcardEditorFace.ts`, `src/components/Editor.tsx` | Có editor mặt trước/sau, nhưng bị `disableLegacy` khi learning ready. Không chỉ bỏ điều kiện này: hook cũ dựa `_fsrs_enabled`, chưa biết binding mới và flush canvas. |
| `src/components/FlashcardEditorTabs.tsx` | Có giao diện cũ; còn raw button, English hardcode và nhãn FSRS. Tái sử dụng ý tưởng, cập nhật shadcn/l10n khi chạm vào. |
| `src/components/TldrawWhiteboard.tsx`, `src/components/editorSchema.tsx` | Có canvas, chế độ read-only và fullscreen. Dùng lại, không thêm thư viện vẽ. |
| `src/utils/tldrawMarkdown.ts`, `src/utils/editorDurableMarkdown.ts` | Snapshot canvas đã đi qua đường lưu Markdown. Cần giữ định dạng và kiểm tra portable assets. |
| `src/components/learning/CardForm.tsx`, `PageFlashcards.tsx` | Form card SQLite và danh sách nhiều card là luồng tương thích; không dùng làm editor chính cho bài A4. |
| `src/components/learning/LearningStudyView.tsx` | Hiện dùng `card.front`, `card.back`/whole-page; ảnh property hiện ở front; reveal vẫn giữ front. Note study cần resolver và face state riêng. |
| `src-tauri/src/learning/pages.rs`, `page_identity.rs`, `page_content.rs` | Dùng lại UUID, kiểm soát path, serializing nguồn với migration. Không dùng frontend để ghi SQL. |
| `src-tauri/src/learning/reviews.rs`, `review_validation.rs`, `sessions.rs` | Giữ giao dịch review, idempotency, scope, undo; bổ sung kiểm chứng snapshot note/nguồn. |
| `src-tauri/src/learning/backup.rs`, `backup_files.rs` | Dùng verified backup và fresh-directory restore. Không giả định file mới trong `.memnova` được backup: metadata hiện có allowlist. |
| `src-tauri/src/git/learning_guard.rs`, `vault_watcher.rs` | `.memnova` bị loại khỏi Git/watcher. Mặt sau trong `.md` đi theo đường nội dung thông thường. |
| `src/lib/learning/propertyValues.ts`, `PagePropertyEditor.tsx` | Tái sử dụng property editor và bảo toàn unknown/opaque values; không dựng editor property thứ ba. |

Đã chạy trong lượt đánh giá trước kế hoạch: 28 test thuộc splitter, tldraw codec, durable Markdown và component whiteboard, đều pass trong 2,75s. Đây không phải baseline của triển khai mới. Báo cáo release `docs/baselines/2026-10-18-card-editor-review-fixes.md` là bằng chứng lịch sử, không được dùng thay kết quả M00/M25.

Ba rủi ro cần regression riêng: debounce canvas bị hủy khi unmount; snapshot lỗi rơi về bảng trắng; một luồng chèn ảnh lưu URL runtime vào snapshot. Chưa coi chúng là native bug đã tái hiện cho tới khi có RED hoặc bằng chứng runtime.

## 3. Hợp đồng nội dung Markdown

### 3.1 Metadata hệ thống phiên bản 1

Tên dưới đây là **đặc tả cho đợt triển khai**, chưa phải field hiện có:

```yaml
_memnova_page_id: <UUID hiện có hoặc được tạo qua pipeline an toàn>
_memnova_learning_version: 1
_memnova_learning_enabled: true
_memnova_back_kind: inline
```

Nguồn mặt sau liên kết dùng thêm:

```yaml
_memnova_back_kind: page
_memnova_back_page_id: <UUID của trang cùng Library>
_memnova_back_face: front
```

Quy tắc:

- `enabled` là boolean thật; kind là `inline|page`; face là `front|back`. Không coercion chuỗi, không suy đoán theo ảnh/marker/folder.
- Không có metadata version mới: note thường hoặc legacy, cần phân loại; không tự bật. Version mới hơn app hỗ trợ: vẫn đọc raw, khóa các thao tác học/ghi cấu hình không hiểu được.
- Page kind bắt buộc có UUID và face; inline không có hai field liên kết. Chuyển về inline bỏ đúng hai field do app sở hữu, giữ nguyên inline body từng được lưu.
- Giữ `_fsrs_*` cũ để phục hồi; sau chuyển đổi, các field đó không còn là lệnh điều khiển lịch học. UI không ghi schedule vào Markdown.
- Metadata trên là reserved, quản lý qua control hệ thống. Properties tự do không được sửa ID/version/source bằng cách thêm hoặc rename field. Giữ dữ liệu reserved cũ ở raw/read-only, không tự xóa.
- Writer chỉ patch những dòng hệ thống cần đổi. Không serialize lại toàn bộ frontmatter khiến YAML comment, alias, unknown nested value hoặc số lớn bị mất. Duplicate/malformed owned keys phải báo lỗi và không ghi.
- Không thay key `status` của người dùng để điều khiển lịch học.

### 3.2 Phân chia hai mặt

- Marker hợp lệ là dòng độc lập `<!-- FLASHCARD:BACK -->` ngoài frontmatter, fenced code và HTML comment khác; cho phép CRLF và khoảng trắng cuối dòng. V1 không coi marker thụt đầu dòng, nằm trong inline code/quote/list là dấu chia.
- Parser nhận biết fence backtick/tilde và độ dài fence; không split chuỗi marker nằm trong JSON tldraw, code sample hoặc frontmatter.
- Một marker hợp lệ: front là trước marker, back là sau marker. Không marker: full body là front, back rỗng. Nhiều marker hợp lệ: báo ambiguous, giữ toàn bộ raw; không tự cắt mất phần sau.
- TS và Rust dùng cùng corpus golden fixture. Mỗi fixture chỉ rõ byte ranges, line endings, diagnostics và source mode. Không viết hai regex khác hành vi.
- Duy trì một frontmatter ở đầu file. `---` trong back là nội dung, không phải metadata thứ hai.
- No-op open/save phải không ghi file. Khi chỉ sửa một mặt, mặt kia và metadata không liên quan giữ nguyên bytes. Không dùng `trimStart/trimEnd` để làm mất indentation, hard break hoặc trailing whitespace có nghĩa ở mặt không sửa.
- Có thể đổi representation nội bộ thành ranges để patch; không buộc BlockNote giữ nguyên bytes của chính vùng người dùng đang sửa. Raw mode cho phép sửa full document; khi quay lại rich phải parse/validate lại.
- Thêm mặt sau chưa cần bật học. Tắt học không xóa marker/back. Chỉ tạo marker qua hành động rõ ràng của người dùng.

### 3.3 Mặt sau liên kết

- `front`: dùng body mặt trước của trang đích, bỏ frontmatter; note thường dùng full body. Không lấy cả hai mặt.
- `back`: chỉ cho chọn phần back nội bộ của trang đích đã parse hợp lệ và đang dùng inline; không lần theo một linked back nữa. Target đang dùng linked back thì UI giải thích và không cho chọn back của target.
- Không cho owner chọn chính mình. Không đệ quy transclusion. A→B.front và B→A.front có thể tồn tại vì chỉ đọc một mặt tĩnh, không mở vòng lặp; A→B.back khi B.back là link phải bị chặn.
- UUID phải cùng Library, path phải là Markdown hợp lệ qua backend boundary. Rename/move giữ UUID, không lưu absolute path làm danh tính.
- Page đích không cần bật học. Lấy source không tạo review/session cho target. Trang nguồn người dùng sở hữu không tự bị ẩn trong cây thư mục.
- Link mode giữ nguyên inline back dự phòng trong owner `.md`; UI có hành động quay lại nội dung gợi nhớ đã lưu. Không hiển thị nhầm inline dự phòng khi source hỏng.
- Preview nguồn là read-only và ghi rõ tên/path/face. Muốn sửa nguồn dùng hành động mở nguồn riêng, flush owner trước, không âm thầm autosave vào target từ editor của owner.
- Target thiếu/xóa/ambiguous/không đọc được: trạng thái lỗi, retry/relink/skip; không ghi rating và không dùng bản cached cũ như nguồn hiện tại.

## 4. SQLite và ranh giới ghi

### 4.1 Mở rộng tối thiểu

M03 dùng version kế tiếp sau schema hiện tại (baseline là v4, dự kiến v5; kiểm tra lại khi bắt đầu). Không sửa lại nội dung migration v1–v4 đã phát hành. ADR mới phải giải thích phần supersede của ADR-0138/0142/0145; bảo toàn ADR-0140/0141/0146 nơi còn áp dụng.

Hai bảng mới trong phạm vi:

1. `note_card_bindings`: `page_id` PK/FK pages, `card_id` UNIQUE/FK cards, `source_hash`, `revision` không âm. Ràng buộc owner card phải đúng page được kiểm tra trong transaction; không cascade xóa lịch sử. Source hash là bytes owner được xác nhận sau reconcile.
2. `note_learning_operations`: durable journal cho thay đổi cấu hình/chuyển đổi/sync của note binding. Có operation UUID, owner page UUID khi đã có, kind, payload phiên bản, phase, created time. Payload chứa fingerprint trước/sau, intent đã xác thực, immutable conversion backup reference khi cần, và snapshot card cũ khi chuyển đổi. Kind chỉ gồm `configure`, `save`, `reconcile`, `convert`; phase gồm `prepared`, `file_written`, `applied`, `conflict`. Không JSON tùy ý từ frontend; kiểm tra Rust. Reconcile của external edit không ghi lại file; có thể đi từ prepared tới applied sau khi xác nhận hash hiện tại.

Không thêm bảng lịch học thứ hai. `cards.id` hiện có tiếp tục là khóa schedules/reviews/session queue. Card đã bind dùng nội dung được resolve từ Markdown, **không đọc `cards.front/back` làm bản chính**. Những cột nội dung/properties cũ được giữ làm compatibility snapshot cho card chuyển đổi; không ghi đè chúng để “đồng bộ”. Card note mới có thể có snapshot rỗng, chỉ được tạo/activate qua validator note riêng. Không nới validator legacy để chấp nhận card Q/A trống.

Binding revision/card content revision tăng khi nội dung/cấu hình note thay đổi thực sự, không mỗi lần đọc; schedule revision chỉ đổi theo hành động học hiện có. Reconcile không chấm điểm hoặc reset memory. Existing raw property JSON/hints giữ nguyên, kể cả số lớn/opaque values.

Journal của save thông thường được compact phần bytes tạm sau applied; giữ operation ID, intent hash, owner, before/after hashes và outcome đủ để exact retry. Không giữ một bản canvas lớn cho mỗi keystroke/autosave mãi mãi. Không compact pending/conflict hoặc immutable snapshots của conversion. Task storage phải test crash trước/sau compaction; phần journal không được xem như bản backup duy nhất của dữ liệu đã chuyển.

`getCard/updateCard/clone/changeStatus` legacy phải nhận diện binding và từ chối ghi bound card qua đường cũ, kèm mã lỗi/action mở note editor. Không gửi bound card rỗng vào UI legacy. Read model mới trả note summary/face readiness riêng. Không đổi payload lịch sử đã ghi.

### 4.2 Những trạng thái cần phân biệt

| Trạng thái | Editor | Vào note study |
|---|---|---|
| Note thường | Ghi chú bình thường | Không |
| Có mặt gợi nhớ, chưa bật học | Có thể sửa hai mặt | Không |
| Bật học, thiếu front/back hữu dụng | Giữ nội dung, báo chưa sẵn sàng | Không; trạng thái draft |
| Bật học, nội dung hợp lệ | Hai mặt và thông tin lịch học | Có khi đến hạn |
| Tắt học sau khi từng học | Giữ hai mặt/history | Không; suspended |
| Source/format lỗi | Giữ raw, chỉ khóa thao tác phụ thuộc | Không chấm; cho xử lý lỗi |
| Trang bị xóa | Lịch sử vẫn lưu | Không |

Library chưa hoàn tất setup/import legacy tiếp tục dùng flow setup/import đã có trước khi cho binding mới; không ghi tay `migrationState=ready` để né import. Ordinary notes vẫn đọc/sửa được theo guard hiện hành. Mất database của Library đã từng học là tình huống phục hồi, không phải Library mới trống. Khi chuyển một card active cùng mục tiêu học, giữ active bằng cấu hình enabled; draft/suspended không tự được bật vì conversion.

Canvas trống không tính là gợi nhớ hoàn chỉnh chỉ vì JSON không rỗng; codec cần nhận biết document có shape/nội dung. Trang có văn bản/ảnh hợp lệ và canvas trống vẫn sẵn sàng. Không kiểm tra network để tự suy luận đã học; media runtime lỗi phải có trạng thái hiển thị và chặn chấm nếu thiếu nội dung gợi nhớ cần thiết.

### 4.3 Hợp đồng save và reconcile

Không tuyên bố SQLite và filesystem có một transaction chung.

1. Flush canvas → flush BlockNote → lấy full document mới nhất → thực hiện note save qua owner path/Library generation đã khóa đúng.
2. Intent nhận expected fingerprint/revision. Rust kiểm tra lại source, UUID, schema và nguồn link. Backend tự tính bytes/hashes, không tin frontend.
3. Các thao tác phối hợp file/binding ghi journal `prepared` trước khi đổi file. File được ghi qua temp file cùng filesystem và atomic replace, kiểm tra expected source ngay trước ghi. App mutex ngăn writer trong app đè nhau; không hứa khóa được mọi editor ngoài app.
4. Sau file write, cập nhật binding/card state và journal trong SQLite transaction. Mất response phải replay đúng operation UUID; không tạo card thứ hai.
5. Khởi động/retry: file khớp before thì tiếp tục; khớp after thì hoàn tất phần DB; khác cả hai thì conflict, giữ file và cả intent, không overwrite. Không fallback về nội dung rỗng.
6. Autosave nội dung ordinary note vẫn dùng pipeline hiện có. Note bound bổ sung reconcile và guard fingerprint; không dựng một autosave khác chỉ cho mặt sau. Dirty buffer/external change dùng conflict UX hiện có, không last-write-wins vô điều kiện.
7. External edit thay đổi note mới: đọc lại và reconcile. Nếu có cấu hình bật học nhưng chưa có binding, tạo binding idempotent khi nguồn hợp lệ. Note legacy không được tự bind chỉ vì marker hoặc `_fsrs_enabled`.
8. Mọi entry point start/resume/get-current/rate phải resolve nguồn hiện tại, không chỉ dựa watcher/cache. Invalid source không được grade. Source changes invalidate snapshot đang hiển thị.
9. Giữ receipt replay trước kiểm tra nguồn cho request đã commit. Chỉ new review mới bị chặn bởi hash mới; retry không bị biến thành rating thứ hai.
10. App đóng/chuyển Library/chuyển note/lật editor/đổi raw/rename phải await flush hoặc chặn điều hướng và giữ draft khi lỗi. Không chỉ gọi callback rồi unmount ngay.

API mới nằm trong typed `learning_command`/client hiện có: đọc trạng thái note, cập nhật cấu hình học, resolve faces/preview, preview/apply/resume chuyển đổi. Tên operation cụ thể chốt trong task, không API SQL hoặc arbitrary filesystem path. `expected` và `operationId` bắt buộc cho mutation. Chuẩn hóa lỗi phân biệt conflict, source missing, unsupported format, recovery pending và committed-but-refresh-failed.

### 4.4 Study và tính nhất quán

- Thêm read model discriminated cho study content: `legacyCard` hoặc `noteMemory`. Note item trả front/back Markdown, source path/face, note properties và fingerprints từ resolver; legacy giữ nguyên hành vi.
- Note front/back không lấy ảnh gợi nhớ từ property `image` rồi hiện ở front. Ảnh gợi nhớ nằm trong body back/canvas. Properties `image/audio` của ghi chú không tự được phát/hiển thị; chỉ media thực sự trong mặt tương ứng mới render.
- Dùng parser/renderer hiện có, read-only trong study. Mount nguồn cần thiết sau khi lật; không tự phát audio mặt chưa thấy. Canvas cho pan/zoom/fullscreen nhưng không sửa dữ liệu trong study.
- Chấm note phải ràng buộc owner bytes/path, target bytes/path/face khi linked, content/schedule/session revisions. Nếu local attachment được thay bytes trong lúc học, signature nguồn media liên quan phải đổi hoặc item phải invalidated trước grade; không hash toàn Library mỗi render.
- Chỉ thu thập dependency local thực sự dùng ở mặt được hiển thị, có giới hạn kích thước/số lượng và cache invalidation đúng. Remote URL không được coi là nội dung đã xác minh; network lỗi hiển thị rõ, không giả vờ load thành công.
- Giữ backend validation kết quả scheduler hiện có, exact pending rating intent, undo, waiting/relearning, timezone và XP. Không tăng reps cho việc xem nguồn.

## 5. Chuyển dữ liệu an toàn

### 5.1 Không tự chọn bản đúng bằng thời gian sửa

Hiện có thể cùng tồn tại bản Markdown cũ và card SQLite đã sửa sau migration. Không mặc định Markdown mới hơn/đúng hơn, không lấy mtime làm quyết định. Preview đọc cả hai, lịch sử và checkpoint liên quan; không tạo DB, ID, file hoặc reset trạng thái chỉ để preview.

| Dữ liệu | Quyết định mặc định |
|---|---|
| Note thường, không card | Giữ nguyên; chỉ tạo binding khi user bật học hoặc có cấu hình version mới hợp lệ do user nhập |
| Legacy `.md` có hai mặt, chưa SQLite cutover | Dùng importer backup-first cũ để giữ history, sau đó preview chuyển binding mới; không tự lật cờ ready |
| Một card cũ inline có cùng hai mặt với Markdown | Đề xuất reuse card ID/schedule; user xác nhận conversion preview |
| Card SQLite và Markdown khác nội dung | Conflict: giữ cả hai, cho xem diff và chọn bản; không ghi tới khi lựa chọn cụ thể |
| Card cũ dùng title→whole-page | Không mặc định tương đương bài→gợi nhớ; cần xác nhận ý nghĩa học và chọn mặt sau |
| Nhiều card trên cùng page | Không gộp schedules. Chọn tối đa một card làm note binding; các card còn lại giữ nguyên trong luồng cũ, hoặc hoãn toàn trang |
| Card cũ trashed | Không tự restore/activate/reuse; giữ luồng phục hồi cũ |
| Nguồn thiếu, UUID trùng, malformed YAML/marker | Không chuyển trang đó, giữ bản cũ và báo lỗi riêng |
| Properties card/page khác nhau | Không merge tự động. Note properties giữ nguyên; card properties/hints cũ lưu và xem được trong chi tiết tương thích |

Mỗi conversion cho chọn rõ: giữ bài/mặt sau từ Markdown; dùng nội dung card SQLite cho mặt tương ứng; hoặc hoãn. Nếu chọn thay bài hiện có bằng card text, preview phải thể hiện thay đổi và backup của cả hai trước ghi. Không tự copy `properties.image` sang back vì lịch sử có thể dùng ảnh đó ở front; cần hành động chèn media rõ ràng trong editor sau conversion.

Reuse lịch học chỉ khi user xác nhận card đó đại diện cùng mục tiêu học. Nếu mục tiêu khác, tạo card note với schedule mới và giữ card cũ/history riêng. Không gắn lịch cũ sang mục tiêu mới bằng heuristic. Không bịa lịch sử từ reps, không gộp reviews nhiều card.

### 5.2 Conversion có thể tiếp tục sau lỗi

- Version upgrade của DB và conversion nội dung là hai bước khác nhau. Schema upgrade additive có verified backup; không tự rewrite `.md`.
- Conversion có immutable plan fingerprint, selection cụ thể, UUID sinh một lần, verified backup ID, byte trước/sau và snapshots legacy. Lưu journal trong DB để current-state backup giữ được checkpoint.
- Apply revalidate toàn bộ nguồn/card revision của trang ngay trước tác động. Không xử lý một bản preview đã stale. Bounded batches; phát hiện external edits thì chỉ báo conflict, không xóa thay đổi.
- Resume idempotent ở mọi điểm giữa journal, file write và transaction. Trước khi finalize, kiểm tra nội dung, UUID, count/history/schedule và media hashes theo manifest.
- Không tự hủy active session chứa card đang chuyển. Yêu cầu pause/end bằng UI và giữ session receipt/history; conversion pending block các writer/grade của đối tượng liên quan.
- Source legacy snapshots và report nằm trong storage đã được backup. Không dọn snapshots ở đợt này. Restore luôn ra directory mới, không đè Library đang dùng.
- Nếu phải quay lại bản app cũ, restore **backup trước upgrade** vào Library mới và mở bằng bản tương thích; không hạ `user_version`, xóa bảng hoặc ghi đè Library đang có chỉnh sửa sau conversion. Tắt entry point mới cũng không được khiến bound card quay sang đọc snapshot SQL cũ như nội dung hiện tại.

### 5.3 Cùng tồn tại trong giai đoạn chuyển

- Luồng mặc định mới là note memory. Luồng “Thẻ cũ” vẫn xem/sửa/học được các card **chưa bind**, kèm số lượng còn lại; không ẩn dữ liệu vì UI mới chỉ hỗ trợ một card/trang.
- Card đã bind không xuất hiện thêm như card legacy: cùng ID chỉ có một đường điều khiển.
- Queue note và queue legacy chọn tường minh; dashboard có số đến hạn riêng, không cộng trùng hoặc silently bỏ card chưa chuyển.
- Card chưa chuyển giữ semantics media/property/source cũ và validation cũ. Không áp kiểu front/back mới cho legacy card.
- Không cho tạo thêm card SQLite độc lập qua UI mới sau khi cutover hoàn tất; khả năng chỉnh/sửa/restore dữ liệu cũ còn nguyên. Nếu API legacy create cần cho importer/tests, giữ nội bộ có gate rõ, không phá importer.

## 6. UX của trang và phiên học

### 6.1 Soạn ghi chú

- Note thường: editor hiện tại, một hành động “Bật học thuộc”. Không hiện memory form cho mọi file.
- Khi bật: tab “Bài viết” và “Gợi nhớ”, nguồn mặt sau, nút “Học trang này”, lịch học read-only. Không nhãn kỹ thuật FSRS/SQL/source hash ở luồng bình thường.
- Mặt gợi nhớ inline: cùng BlockNote schema và slash menu; nút chèn ảnh và tạo bảng gợi nhớ dùng pipeline hiện có. Canvas có fullscreen hiện có, không modal lồng nhiều lớp.
- Mặt linked: source row có tên/path/face, preview read-only, đổi nguồn, mở nguồn, quay lại inline đã lưu. Thay source không xóa nội dung inline hoặc target.
- Editor chính dùng width người dùng đã chọn trong app. Bài A4 không bị ép vào CardForm 720px. Canvas mở rộng dùng workspace/fullscreen, không đổi chiều rộng mọi ghi chú.
- Properties duy nhất ở Inspector/PagePropertyEditor. Chi tiết metadata legacy có nhãn rõ và không bị copy tự động vào trang. Toggle học hoặc đổi nguồn không chạm properties tự do khác.
- Autosave theo note, có trạng thái đang lưu/lỗi. Không dùng nút Cancel toàn trang giả vờ hoàn tác những thay đổi đã autosave. Dialog lựa chọn nguồn/conversion có draft riêng và Cancel thật sự không mutation.
- Tắt học chỉ suspend, vẫn mở/sửa gợi nhớ cũ; xóa mặt gợi nhớ là thao tác riêng có xác nhận nội dung cụ thể và không nằm trong toggle.

### 6.2 Học thuộc

1. Mở bài/front để đọc. Có thể lật sang gợi nhớ.
2. Khi lật: chỉ mặt gợi nhớ hiển thị, bài chính bị che; giúp user thử trình bày lại bài. Không append back bên dưới bài đang mở như hiện tại.
3. Có nút trở lại bài để đối chiếu, không ghi review. Giữ scroll/camera trong lượt hiện tại; đổi item không mang state sang card khác.
4. Sau khi back đã resolve/render thành công, cho tự đánh giá 1–4 theo engine hiện có. Không tự suy luận “thuộc” vì user đã nhìn hình hoặc mở lại front.
5. Mỗi review thuộc note/card hiện tại. Link tham khảo hoặc preview target không chấm target. Mở học target là một hành động riêng, pause/return phiên hiện tại đúng trạng thái.

Không thêm scratchpad để vẽ lại từ trí nhớ trong đợt này. Canvas trong study read-only; chỉnh sửa canvas thuộc editor. Không có cờ “đã thuộc vĩnh viễn” thay thế lịch ôn.

### 6.3 Style và accessibility

Reuse shadcn, Phosphor và semantic tokens; giữ editor theme. Mọi copy mới ở `en.json` và tất cả locale của `lara.yaml`. Scope style vào surfaces mới, không sửa global primitive để ép kích thước.

Keyboard tabs/focus/ARIA, Escape/fullscreen, Cmd+S, source dialog focus return; touch target tối thiểu 44px khi coarse; reduced motion; zoom 100/125/150%; 480×640, 768×900, 1280×900; light/dark; English/Vietnamese/German. Pointer path là đường QA đầu tiên. Shortcut study không được chạy khi đang nhập text, mở picker, dialog hoặc tương tác canvas.

## 7. Whiteboard và media phải bền vững

- Flush registry nhỏ theo editor/board ID, không global singleton lẫn Library. Flush đồng bộ snapshot document trước khi serializer chạy, sau đó await file save. Effect cleanup không phải điểm lưu duy nhất.
- Canvas snapshot lỗi: error state có raw recovery/export, không biến thành empty rồi autosave. Dữ liệu cũ bị lỗi vẫn được giữ byte; không xác nhận renderer ready như thể bảng trắng hợp lệ.
- Lưu document snapshot, không camera/tool/selection. Switching board nhanh không gửi late callback vào note khác. Read-only không viết.
- Asset lưu path tương đối/ID ổn định trong Library; convert sang Tauri URL chỉ khi render. Không serialize `blob:` hoặc absolute `asset://` của máy hiện tại làm nguồn duy nhất.
- Chuẩn hóa import từ file picker, paste/drop và Vocab Image đang có. URL cũ giải được thì đề xuất migrate nhỏ có backup; không xóa nguồn không giải được. Không tự tải URL bên ngoài hoặc embed network resources.
- Ảnh trong attachments không tự xóa khi Cancel hoặc xóa một shape nếu chưa xác định ownership/references. Đợt này không làm garbage collector. Không hứa copy một `.md` là mang theo toàn bộ ảnh.
- Test restart, clone, move Library, restore thư mục khác, fullscreen/zoom, JSON snapshot lớn. Không thêm canvas sidecar storage chỉ để né lỗi portable asset.

## 8. Tiêu chí hoàn thành và bằng chứng

Phải hoàn tất tất cả M00–M25 trong [task chi tiết](MEMNOVA-NOTE-MEMORY-TASKS.md), mỗi task có evidence và commit trong [ledger](MEMNOVA-NOTE-MEMORY-IMPLEMENTATION.md). Không đánh dấu DONE dựa trên “code có vẻ đúng”.

Acceptance trọng tâm:

- Note thường giữ bytes/mtime khi chỉ đọc, không có binding/review tự sinh.
- Bật một trang A4, thêm ảnh/canvas vào back, save/restart và học được đúng hai mặt. Cây thư mục không có mục back/canvas mới.
- Lật/đổi note ngay sau nét vẽ giữ nét cuối. Invalid snapshot không bị thay bảng trắng. Restore ảnh/canvas hoạt động ở root mới.
- Note source link không tự bật/chấm target; đổi tên target vẫn đúng; missing/cycle/unsupported back face không gây fallback sai hoặc recursion.
- Tắt/bật học giữ card ID, schedule/history. Clone có page/card identity mới và schedule mới; chuyển folder không reset. Clone linked source giữ link, không clone target ngầm.
- Preview migration không ghi; conflict có lựa chọn; resume giữ exact IDs/schedules/reviews/unknown values; legacy cards còn truy cập được; không tạo queue trùng.
- Sửa source giữa lượt học chặn new rating; exact retry của review đã commit vẫn replay đúng. Undo không ghi đè schedule đã đổi.
- Toàn bộ native QA dùng Library tổng hợp, preferences/identifier riêng. Không dùng dữ liệu người dùng thật làm fixture.

Release: normal hooks, lint/types/build, frontend coverage ≥70% theo config hiện hành, Rust line coverage ≥85%, core smoke <5 phút, integration riêng, Codacy không mới Critical/High; Medium được xử lý/giải thích. CodeScene dùng nếu đã cấu hình, nếu không ghi **NOT RUN** theo AGENTS hiện hành; không xin credentials lại hoặc hạ threshold. Không thay hook để giảm gate.

PostHog dùng event hành động có ý nghĩa: `note_learning_enabled`, `note_learning_disabled`, `note_memory_source_changed`, `note_memory_conversion_completed`, `note_memory_conversion_failed`. Metadata chỉ enum/kind/count/error category; không page/card UUID, path, title, text, URL, ảnh hoặc snapshot. Trước khi thêm kiểm tra event hiện có để tránh nhân đôi. Lật/typing không phát event riêng nếu tạo noise; dùng review event hiện có.

Tài liệu kiến trúc cập nhật cùng code tương ứng; ADR mới cùng commit đầu tiên của thay đổi cấu trúc, không sửa ADR lịch sử. Native + browser screenshot phải được xem thực tế. Ghi rõ chưa chạy khi thiếu khả năng QA; không dùng browser mock để tuyên bố SQLite/native pass.

## 9. Cách giao task cho model triển khai

```text
Đọc AGENTS.md hiện hành và ba tài liệu MEMNOVA-NOTE-MEMORY trong docs/.
Chỉ triển khai task Mxx sau khi kiểm tra dependency trong ledger và commit thực tế.
Không xem task DONE chỉ vì một câu trong chat; đọc evidence, chạy baseline phù hợp.
Tuân thủ hợp đồng nội dung, trạng thái, migration và phạm vi của plan.
Bug phải có regression RED trước fix; code mới có behavioral tests đúng acceptance.
Không đổi FSRS/XP, thêm dependency, tự tạo canvas folder, gộp/xóa card hay tự chọn bản dữ liệu đúng.
Cập nhật docs/l10n/telemetry liên quan trong task; chạy Codacy và verified hooks.
Commit/push main theo AGENTS.md, không bỏ qua hook.
Ghi command, kết quả, thời gian, giới hạn, commit vào ledger; chỉ DONE sau push thành công.
Dừng sau task này và báo rõ task tiếp theo đủ dependency.
```

Khi user giao toàn bộ đợt, model có thể tiếp tục từ dependency đã commit và test ở trạng thái VERIFIED_LOCAL, push các cụm theo task document để tránh lặp full gate cho từng bước nền tảng. VERIFIED_LOCAL không phải DONE; chỉ DONE sau normal push thành công. Mỗi task vẫn cần checkpoint riêng, không sửa source trong lúc hook/test đang chạy. Không yêu cầu user xác nhận lại các quyết định đã chốt trong tài liệu. Lựa chọn **dữ liệu thực tế xung đột** phải được trình bày bằng UI conversion; không tự quyết vì đã được giao code. Khi code khác baseline đến mức không áp dụng được contract, ghi điều khác biệt và sửa plan tường minh trước khi mở rộng phạm vi.
