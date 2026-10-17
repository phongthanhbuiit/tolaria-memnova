# Kế hoạch properties và liên kết bài nguồn Memnova

Ngày: 2026-10-18. Trạng thái: kế hoạch để triển khai, chưa phải tính năng đã hoàn thành.
Baseline đã push: `3a64cca0`. Kế hoạch này bổ sung cho A01–G02, không mở lại hoặc tự đánh dấu hoàn thành các task cũ. Đọc cùng `AGENTS.md`, ADR-0138/0140/0141/0142/0144 và `docs/MEMNOVA-IMPLEMENTATION.md`.

Mục tiêu: người dùng viết Markdown bình thường, tạo nhiều thẻ học, chọn một bài khác làm đáp án và tự quản lý properties của trang/thẻ. Bảo toàn dữ liệu và lịch học quan trọng hơn việc đồng nhất hình thức dữ liệu cũ. Chỉ thực hiện task được chỉ định; không tự triển khai toàn kế hoạch trong một lượt.

## 1. Quyết định sản phẩm

### Trang, thẻ và bài nguồn

- Mọi trang vẫn là file Markdown bình thường. Trang có thể không có thẻ, có nhiều thẻ hoặc được thẻ khác tham chiếu. Không tạo một định dạng file flashcard mới.
- Mỗi thẻ có đúng một trang chứa, dùng `cards.page_id` hiện có. Trang chứa quyết định vị trí quản lý và phạm vi bộ ôn; không đổi chủ sở hữu khi chọn bài nguồn khác.
- Đáp án có ba lựa chọn trong UI: **Tự nhập**, **Trang hiện tại**, **Chọn bài khác**. Backend vẫn có hai mode `inline` và `page`; page có tham chiếu tùy chọn.
- `[[Bài A]]` trong nội dung chỉ là liên kết đọc. Không tự tạo thẻ, nhập tất cả thẻ của bài đó vào bộ ôn, hoặc tự lấy nội dung làm đáp án.
- Một bài nguồn có thể phục vụ nhiều thẻ; mỗi thẻ vẫn có lịch ôn riêng. Không có đệ quy chèn toàn bộ nội dung các trang được liên kết.
- V1 chỉ cho chọn nguồn trong cùng Library. Không liên kết database giữa các Library hoặc đồng bộ cloud.

Ví dụ: `Kiến thức HTTP.md` chứa bài học; `Ôn phỏng vấn.md` chứa ba thẻ. Hai thẻ có đáp án ngắn riêng; thẻ thứ ba có câu hỏi “Trình bày toàn bộ HTTP” và chọn `Kiến thức HTTP.md` làm đáp án. Đổi tên bài HTTP không đổi danh tính thẻ hoặc lịch ôn. Sửa bài HTTP cập nhật đáp án live; không tự reset tiến độ.

### Properties

| Nhóm | Ví dụ | Nguồn dữ liệu | Cho sửa |
|---|---|---|---|
| Trang | tags, chủ đề, nguồn, tác giả, độ ưu tiên | Markdown frontmatter | Có, bằng pipeline lưu trang hiện có |
| Thẻ | từ loại, level, IPA, audio, image, synonyms, trường tự đặt | SQLite `properties_json` | Có, qua API thẻ có revision |
| Hệ thống | UUID, owner/source ID, revision, schedule, review history | Cột/bảng hệ thống | Chỉ đọc trong UI, không đi qua editor properties |

- Properties trang và thẻ độc lập. Không có kế thừa, đồng bộ hai chiều, tự ghi đè hay tự chuyển toàn bộ properties trang vào thẻ mới.
- Bản sao metadata do importer cũ tạo ra phải được giữ nguyên. Không tự xóa vì nhìn giống properties trang.
- Người dùng tự đặt tên, thêm, sửa, xóa và đổi tên trường trong phạm vi một trang/thẻ. Đổi tên một trường không đổi cùng tên trường ở những trang khác.
- Kiểu hỗ trợ cho trường mới: text, number hữu hạn, boolean, date dạng `YYYY-MM-DD`, list text và liên kết trang đơn/nhiều. Không có công thức, tính toán phụ thuộc hay builder schema toàn Library.
- Trống, `0`, `false`, danh sách rỗng, `null` và không có key là các trạng thái khác nhau. Xóa trường là thao tác riêng, không suy ra từ giá trị falsy.
- Object lồng nhau/mảng hỗn hợp từ dữ liệu cũ: hiển thị dạng chỉ đọc trong mục dữ liệu bổ sung, giữ nguyên khi lưu các trường khác. Không biến chúng thành chuỗi `[object Object]` hoặc tự làm phẳng.
- Basic/Vocabulary là preset cách trình bày các key hiện có, không phải hai hệ lưu trữ. Đổi preset không xóa properties. Không render cùng key hai lần ở preset và danh sách tùy chỉnh.
- Properties tự tạo không tự xuất hiện ở mặt trước khi học. Giữ chính sách hiện tại cho trường từ vựng đã biết; không đưa đáp án/quan hệ ra trước khi Reveal. Không thêm tính năng cấu hình mặt hiển thị trong giai đoạn này.

### Giao diện

- Trang có tab Nội dung/Flashcards và Properties của trang như hiện tại; nhãn phân biệt rõ với Properties của thẻ.
- Form thẻ: câu hỏi → loại đáp án → nội dung/chọn bài nguồn → trạng thái → preset và properties → media mở rộng. Giữ footer Lưu/Hủy cố định và phần nội dung cuộn.
- Bài nguồn được chọn phải hiện tên, vị trí và nút mở bài. Có trạng thái không còn tìm thấy; không âm thầm chuyển sang đáp án trống.
- Properties dùng chung primitive/editor nhỏ, nhưng adapter đọc/ghi trang và thẻ riêng. Không copy nguyên `DynamicPropertiesPanel` sang form thẻ vì component đó đang gắn với frontmatter/Type/workspace.
- Thùng rác chỉ xem và khôi phục về Draft. Không cho chuyển sang Suspended/Active hoặc chỉnh sửa để vòng qua Restore. Clone từ Trash không nằm trong phạm vi này.
- Backup là danh sách bền vững đọc từ đĩa, không chỉ một ID trong React state. Khôi phục luôn xác minh lại và tạo thư mục mới.

## 2. Hợp đồng dữ liệu bắt buộc

### Tham chiếu bài nguồn

Thêm `cards.answer_page_id TEXT NULL REFERENCES pages(id)` và index tương ứng bằng migration mới. Không đổi nghĩa `page_id`.

| Mode | answer_page_id | Hành vi |
|---|---|---|
| inline | null | Dùng `back` của thẻ |
| page | null | Dùng trang chứa thẻ, tương thích hành vi cũ |
| page | UUID | Dùng trang có UUID đó trong cùng Library |

Khi chuyển inline, UI có thể giữ lựa chọn nguồn trong draft chưa lưu, nhưng payload lưu có answer_page_id=null. Chuyển mode không xóa `back`. Đổi nguồn/mode tăng card revision, không sửa schedule hoặc review history. Clone giữ câu hỏi/đáp án/properties/nguồn nhưng có ID và lịch mới, trạng thái Draft.

`StudyItem.page` hiện đang được dùng cho nhiều vai trò. Phải tách rõ trang chứa và bài đáp án trong DTO; không đổi lén ý nghĩa trường cũ. Markdown/media của câu hỏi và properties thẻ resolve theo trang chứa; Markdown/media của đáp án tham chiếu resolve theo bài nguồn. Inline answer resolve theo trang chứa.

- Trang nguồn đổi tên/di chuyển: theo UUID. Xóa rồi tạo file cùng tên với UUID mới: không tự nối lại.
- Nguồn mất/hỏng: thẻ còn nguyên, hiện lỗi có Reload/Skip và cách mở form chọn nguồn khác. Không cho chấm điểm khi đáp án chưa đọc/render được; không tăng review/XP. Không tự đổi trạng thái hoặc reset lịch.
- Session giữ danh tính thẻ; snapshot câu hỏi/đáp án đã hiển thị được bảo vệ bằng fingerprint và revisions. Nguồn sửa giữa lúc Reveal và Rate: từ chối ghi mới với thông báo tải lại, không chấm trên nội dung người dùng chưa xem.
- Xác minh replay của một rating đã commit theo receipt gốc trước khi kiểm tra nội dung hiện tại. Đáp án thay đổi sau commit không được khiến retry ghi thêm review hoặc reschedule lần hai.
- Duy trì tương thích với receipt/session lưu trước nâng cấp. Không viết lại lịch sử để thêm source giả. Kiểm tra đường mở phiên cũ, reload, retry request cũ và Undo; không đổi điều kiện Undo hiện hành ngoài điều cần thiết để đọc phiên cũ.

### Giá trị và kiểu properties

Giá trị trang vẫn ở Markdown; giá trị thẻ vẫn ở properties_json. Không tạo bản sao thứ hai của giá trị trang trong SQLite.

Để kiểu người dùng chọn tồn tại qua khởi động/backup, thêm hai bảng metadata UI trong migration riêng:

- `page_property_definitions(page_id, key, value_kind, item_kind)`; FK pages, khóa chính (page_id,key).
- `card_property_definitions(card_id, key, value_kind, item_kind)`; FK cards, khóa chính (card_id,key).

Metadata này chỉ mô tả editor, không phải nguồn giá trị và không ép kiểu khi đọc. Kind thiếu → suy luận an toàn từ giá trị. Kind không khớp do Markdown được sửa ngoài app → báo không khớp/hiển thị bảo toàn; không tự convert hoặc ghi đè. Không seed định nghĩa cho mọi field cũ khi migration.

- `value_kind`: text, number, boolean, date, list, page. `item_kind` chỉ dùng cho list: text hoặc page. Validate whitelist ở Rust.
- Page values giữ biểu diễn frontmatter/wikilink hiện tại và dùng cơ chế rename/link hiện có. Card page-reference mới dùng đối tượng `{pageId: UUID, label?: string}` (hoặc mảng các đối tượng đó), chỉ được diễn giải là reference khi định nghĩa kiểu tương ứng. Object khác vẫn opaque.
- Quan hệ vocabulary cũ dạng chuỗi wikilink, mảng chuỗi, alias hoặc text tự do đều phải đọc được và bảo toàn. Không chạy bulk convert; không tự resolve một tiêu đề mơ hồ sang một UUID. Khi người dùng sửa quan hệ cũ, chỉ thay đổi phần được chọn, giữ dữ liệu còn lại.
- Key mới trim khoảng trắng ở hai đầu, không rỗng; từ chối trùng key và tên dành riêng cho hệ thống. ADR N01 phải ghi tập key/prefix chính xác dùng chung TS/Rust, bao gồm `_memnova*`, `_fsrs*` và metadata nội bộ hiện có. Không xóa/đổi tên tự động các key cũ bị trùng quy tắc mới. Trạng thái user `Status` của trang không phải lifecycle status của thẻ.
- Đổi tên key và đổi kiểu là hai thao tác riêng. Đổi kiểu phải có preview và xác nhận nếu có nguy cơ mất thông tin; không convert ngầm qua `Number('')` hoặc `Boolean('false')`. Nếu chưa thể chuyển an toàn thì từ chối, giữ giá trị cũ.
- Card values/definitions/revision ghi trong một transaction. Với trang, không hứa transaction nguyên tử giữa filesystem và SQLite: flush và lưu Markdown bằng pipeline hiện có; lưu hint sau khi giá trị thành công. Nếu hint thất bại, báo “giá trị đã lưu, kiểu hiển thị chưa lưu”, cho retry hint; reload vẫn đọc được giá trị bằng inference. Không ghi lại Markdown lần hai chỉ để retry hint.
- Mỗi lần mở/chuyển Library, hủy bỏ kết quả async thuộc Library/owner cũ. Các lỗi đã sửa ở useLearningStudy/CardForm là invariant phải giữ.

### Version và backup

Dự kiến schema v3 cho nguồn đáp án, v4 cho định nghĩa properties. N00 phải kiểm tra version thực tế; nếu repository đã tiến xa hơn thì cấp version kế tiếp, không reuse version. Migration có transaction, foreign_keys/integrity check, backup verified trước nâng cấp; không reset database.

Chỉ task N06/N11 được mở rộng schema như mô tả. `LearningClient.connect`, descriptor, importer, browser mocks, manifest và restore verification phải hiểu version được hỗ trợ. Backup version cũ còn restore được rồi nâng cấp bản phục hồi; version tương lai không được mở ghi hoặc dựng database rỗng thay thế. Original Library và backup không bị sửa khi restore.

## 3. Task nhỏ và thứ tự thực hiện

Tất cả task bắt đầu ở trạng thái **TODO**. Chỉ đổi thành DONE sau khi test/gates phù hợp và push bình thường thành công. Không coi bảng dưới là bằng chứng dependency đã xong; kiểm tra commit và báo cáo của task phụ thuộc.

### N00 Kiểm tra baseline và tạo ledger

Phụ thuộc: không. Phạm vi: read-only audit và tài liệu.

- Đọc AGENTS/ADR/baseline mới nhất, git status, schema version, pending migration, API/tests. Ghi commit gốc và các thay đổi người dùng đang có.
- Chạy test module học, properties hiện tại và Rust learning tests. Dùng bản sao fixture, không mở Library thật để test.
- Tạo `docs/MEMNOVA-PROPERTIES-AND-SOURCES-IMPLEMENTATION.md` với đủ N00–N17, dependency, commit và evidence. Không sửa ledger cũ để giả định phạm vi mới đã hoàn thành.
- Xác minh bốn probe ở thư mục evidence ngày 18/10 vẫn tái hiện lỗi. Ghi CodeScene available/not run theo AGENTS, không yêu cầu token nếu không có.

Nghiệm thu: có baseline tái lập, trạng thái schema/dependencies rõ; không sửa runtime.

### N01 Chốt hợp đồng và ADR

Phụ thuộc: N00. Phạm vi: tài liệu/fixtures hợp đồng, chưa thay storage.

- Viết ADR mới về source reference và properties, chốt DTO TS/Rust, reserved-key list, validation limits theo convention hiện tại, error codes, ownership và payload compatibility.
- Chốt ba loại đáp án và policy source mất/thay đổi, media resolution, clone, Trash, revision và replay cũ.
- Chốt representation cho field mới và legacy round-trip; các điểm section 2 là quyết định của kế hoạch, không giao model tự lựa chọn framework/storage khác.
- Ghi wireframe form/trang/backup; dùng components hiện có. ADR mới supersede đúng phần liên quan, không chỉnh ADR cũ.

Nghiệm thu: từng enum/field/null/default và hành vi lỗi có bảng rõ; không còn TODO kiến trúc ở hợp đồng trước khi N06/N10 bắt đầu.

### N02 Sửa mất quan hệ vocabulary

Phụ thuộc: N00. Files chính: `src/lib/learning/vocabulary.ts`, `VocabularyFields.tsx`, `WikilinkPropertyField.tsx`, tests.

- Đưa probe mất mảng thành regression test trước khi sửa. Hỗ trợ string, array, alias, dấu phẩy trong title và unknown values mà không làm mất raw data.
- Add/remove chỉ sửa đúng quan hệ; khi không nhận diện được giá trị phải bảo toàn và chặn chỉnh sửa phá hủy, không coi là rỗng.
- Không đổi schema và không bulk normalize dữ liệu cũ.

Nghiệm thu: mảng A,B thêm C vẫn giữ A,B; bỏ B giữ A và metadata khác; save không sửa schedule; basic/vocabulary toggle không xóa dữ liệu; string/alias tests cũ còn qua.

### N03 Thống nhất Trash và Restore

Phụ thuộc: N00. Files chính: `PageFlashcards.tsx`, `CardForm.tsx`, Rust card operations/validation.

- Regression cho Trash → Suspended bypass và form nhận status không có option.
- UI thẻ Trash chỉ xem/Restore. Backend chặn đổi thẻ Trash sang Active/Suspended hoặc cập nhật nội dung qua đường generic; Restore chỉ về Draft.
- Giữ stale revision guard, toàn bộ history và schedule. Không thêm xóa vật lý.

Nghiệm thu: UI và API đều không bypass Restore; khôi phục rồi sửa/activate bình thường; không hiện thẻ Trash trong study queue.

### N04 API liệt kê và xác minh backup

Phụ thuộc: N00. Files chính: Rust `backup.rs`, `backup_files.rs`, command dispatcher, `client.ts`, types/tests.

- Thêm list backups và verify một backup được chọn bằng ID, không nhận arbitrary path từ UI.
- Danh sách dựa trên manifest ở đĩa, có thời gian/số file/dung lượng và trạng thái unreadable/invalid/unchecked; một bản hỏng không làm toàn danh sách thất bại.
- List không giả vờ verified và không hash mọi file trên mỗi render; verify khi chọn/restore, restore luôn kiểm tra lại.
- Kiểm tra symlink, traversal, manifest sai Library, thư mục tạm/incomplete. Không thêm xóa backup hay retention tự động.

Nghiệm thu: restart vẫn list đúng bản cũ, invalid entry được báo, restore không dùng bản không hợp lệ; các fixture backup hiện có vẫn qua. Không đổi schema.

### N05 Giao diện khôi phục backup bền vững

Phụ thuộc: N04. Files chính: `LearningDashboard.tsx`, component backup riêng nếu cần, locales/integration tests.

- Danh sách backup trong Advanced, chọn bản, kiểm tra, khôi phục sang Library mới; loading/error/empty/retry rõ ràng.
- Tách state theo Library; response chậm từ A không xuất hiện ở B. Thao tác điều hướng hoặc remount không làm mất khả năng tìm backup.
- Regression sau create → unmount/remount → chọn backup cũ → restore.

Nghiệm thu: browser integration và native fixture đều chọn lại backup đã có; không cần tạo backup mới để hiện Restore. Giữ nguyên dữ liệu nguồn.

### N06 Migration tham chiếu nguồn và card API

Phụ thuộc: N01,N05. Files chính: `store.rs`, migrations/schema, `models.rs`, `cards.rs`, commands, `types.ts`, `client.ts`, mocks.

- Migration v3 và answer_page_id theo section 2, index/FK, supported-version checks.
- Create/update/clone nhận/giữ source đúng Library; page mode null tương đương hành vi cũ; inline reject hoặc canonicalize source theo hợp đồng N01.
- Registry ensurePage của nguồn mới vẫn dùng quy trình UUID/backup hiện có, không tự ghi ID trong read-only preview.
- Chưa đưa lựa chọn nguồn vào UI.

Nghiệm thu: upgrade database cũ bảo toàn counts/IDs/properties/schedules/history/paused sessions; chạy hai lần không đổi; lỗi giữa migration rollback; future-version fail closed; clone giữ source nhưng fresh schedule.

### N07 Đọc bài nguồn và vòng đời liên kết

Phụ thuộc: N06. Files chính: `study_source.rs`, `pages.rs`, `page_content.rs`, `session_models.rs`.

- Trả riêng owner page và answer page, đọc live body theo UUID, giữ fingerprint/version cần thiết.
- Rename/move nguồn không làm đứt tham chiếu. Mất file, duplicate UUID, thay file cùng tên, nguồn malformed phải cho lỗi phân biệt.
- Không fetch nội dung các wikilink bên trong nguồn; không tạo quan hệ đệ quy.

Nghiệm thu: thẻ ở B tham chiếu A hiển thị A; rename A vẫn đúng; tạo A mới cùng path không chiếm danh tính A cũ; nguồn trở lại cùng ID có thể reload; không mất thẻ/lịch.

### N08 Bảo vệ rating và resume với nguồn tham chiếu

Phụ thuộc: N07. Files chính: `reviews.rs`, `review_validation.rs`, sessions, `useLearningStudy.ts`, tests.

- Gắn kiểm tra source snapshot mới vào write transaction; giữ revision và exact receipt replay.
- Viết test nguồn đổi trước Rate; lỗi response sau commit rồi nguồn đổi; Undo; paused session từ schema cũ; retry request/receipt cũ.
- Không thay thuật toán FSRS, công thức XP, khoảng ôn hoặc semantics phạm vi deck.

Nghiệm thu: stale source không ghi; replay không double review/XP; resume trước/sau nâng cấp dùng đúng thẻ; mất nguồn không chấm điểm được; Undo bảo toàn luật hiện tại.

### N09 Chọn bài nguồn và render đáp án

Phụ thuộc: N08. Files chính: `CardForm.tsx`, `LearningStudyView.tsx`, note picker, locales/tests.

- Ba lựa chọn đáp án bằng shadcn; picker reuse NoteAutocomplete có phân biệt title trùng bằng path và UUID, chỉ cùng Library.
- Hiện source title/path, mở nguồn; không gửi ID qua text field không kiểm tra.
- Front/back media base theo section 2; thay mode rồi quay lại không mất inline draft. Chặn Rate đến khi đáp án nguồn render xong.

Nghiệm thu: test nguồn khác trang, hai bài cùng title, rename, missing source, media tương đối, mode toggle, keyboard/mouse và cửa sổ hẹp. Native QA bắt buộc cho path/media persistence.

### N10 Model và editor contract cho properties

Phụ thuộc: N01,N02. Files chính: module pure mới dưới `src/lib/learning/` hoặc utility properties chung.

- Type/value adapters, safe inference, validators, rename/remove operations và mapping preset. Không UI khổng lồ hoặc thư viện form mới.
- Test round-trip: text Unicode, số 0, false, null, empty string/list, date timezone-independent, nested object, arrays, alias, duplicate/reserved key, conversion từ chối.
- Adapter page và card có giao diện field giống nhau nhưng wire representation riêng theo hợp đồng; không ép frontend type thành storage truth.

Nghiệm thu: module tests không cần Tauri/browser; tất cả unknown values còn nguyên khi đổi field khác. Chưa migration hoặc UI.

### N11 Migration định nghĩa properties

Phụ thuộc: N06,N10. Files chính: storage migrations/models/tests.

- Schema v4 thêm hai bảng metadata định nghĩa UI theo section 2; whitelist kind, FK, uniqueness, no bulk inferred records.
- Nâng cấp descriptor/connect/backup restore support cùng commit. Giá trị Markdown/properties_json hiện có không được rewrite.

Nghiệm thu: v1/v2→v3→v4 và v3→v4, reopen/no-op, partial-failure, future-version, restore backup cũ. Snapshot đối chiếu values/schedules/history trước/sau bằng fixture assertions.

### N12 API ghi properties có revision và phục hồi

Phụ thuộc: N11. Files chính: card store, property definitions store, page save adapter, client/types/mocks.

- Card form save ghi cả values và definitions nguyên tử, giữ expected revision; không thêm nhiều writer ghi schedule.
- Page definitions dùng page UUID và owner generation. Markdown ghi qua editor/save pipeline; retry lỗi hint không lặp write nội dung.
- Rename/remove key cập nhật definition tương ứng. External Markdown edit khiến hint không khớp phải đọc an toàn, không tự sửa file.
- Clone giữ card definitions; trash/restore giữ definitions; backup chứa definitions tự nhiên trong SQLite.

Nghiệm thu: failure injection, stale save hai form, lost response, Library switch và rename conflict không làm mất dữ liệu. Không claim transaction nguyên tử filesystem+SQLite.

### N13 Component editor properties dùng chung

Phụ thuộc: N10. Files chính: các primitive nhỏ dưới components, tái sử dụng `PropertyValueCells`, `AddPropertyForm`, shadcn.

- Field list với label/value/type, add/rename/delete; number/boolean/date/list/page editors có accessible labels.
- Date dùng Calendar+Popover, không native date input. Page picker có mục tiêu xác định, không dùng title làm identity cho card reference mới.
- Dữ liệu không hỗ trợ hiện read-only, không có ô trống đánh lừa. Bảo vệ draft khi Cancel/Escape, disabled/busy và lỗi field rõ.
- Không đổi toàn bộ Inspector trong task này.

Nghiệm thu: component tests từng kiểu/keyboard/focus; không double-render preset key; conversion có nguy cơ mất dữ liệu không chạy ngầm; no UI copy hardcode.

### N14 Gắn properties tự do vào form thẻ

Phụ thuộc: N12,N13. Files chính: `CardForm`, `VocabularyFields`, new editor adapter.

- Preset vocabulary và custom fields dùng chung draft; lưu một lần, không auto-save từng key vào thẻ khi modal chưa Save.
- Unknown/imported values được giữ; metadata/type definitions không ghi đè `page_id`, source, revisions hay schedule.
- Liên kết trang kiểu mới mở bằng UUID; legacy title chỉ resolve khi duy nhất, mơ hồ thì yêu cầu chọn rõ, không tự đoán.

Nghiệm thu: tạo/sửa/xóa/rename/custom field, đổi preset, close/reopen, retry refresh, array regression N02 đều qua; clone giữ properties và definitions nhưng lịch mới.

### N15 Gắn editor vào properties trang

Phụ thuộc: N12,N13. Files chính: `DynamicPropertiesPanel`, `usePropertyPanelState`, page metadata adapter, tests.

- Reuse primitive nhỏ, giữ Type/workspace/relationship UI và placeholders hiện có. Không thay toàn bộ hệ Inspector.
- Cho chọn/giữ kiểu qua metadata definitions, giá trị vẫn Markdown. Trang chưa đăng ký học vẫn dùng properties hiện có; chỉ ensurePage khi cần lưu definition trong Library đã Ready, theo quy trình an toàn hiện có, không tự tạo card/migration hàng loạt. Trước Ready, sửa giá trị trang vẫn hoạt động bằng pipeline cũ; không buộc người dùng migrate chỉ để sửa ghi chú. Metadata kiểu mới chỉ bật sau khi Library sẵn sàng, với giải thích rõ trong UI.
- Trang sửa ngoài app: unknown/mismatched values đọc an toàn. Nhãn “Properties của trang” không làm người dùng tưởng đang sửa card.

Nghiệm thu: no-op không rewrite Markdown; ngày/số/boolean/list đúng; không mất comments/formatting ngoài hành vi writer hiện có; loại bỏ giả định parser hỗ trợ nested types mà chưa test; failure ở hint giữ giá trị đã lưu. Card props không đổi khi page props đổi.

### N16 Hoàn thiện UI và thông tin chỉ đọc

Phụ thuộc: N09,N14,N15.

- Gom media vào phần mở rộng; tận dụng attachment pipeline hiện có cho chọn file, preview ảnh/nghe audio và lỗi file không tồn tại. Không tạo upload server/media storage mới.
- Hiện source summary, custom properties và lịch ôn chỉ đọc cần thiết (due/reps/lapses), phân biệt rõ properties và system data. Không thêm editor lịch ôn/reset lịch.
- Kiểm tra light/dark, 480×800, chuỗi dài, translated labels, focus, mouse trước rồi keyboard. Không dùng màu đơn lẻ để phân biệt trạng thái.
- Không thêm editor mặt hiển thị cho custom fields; không vô tình tiết lộ answer-only vocabulary trước Reveal.

Nghiệm thu: actions luôn truy cập được, không tràn ngang, lỗi media có nội dung rõ, source/status/field labels nhất quán; native QA trên fixture.

### N17 Kiểm chứng và bàn giao release

Phụ thuộc: N03,N05,N08,N16; đối chiếu ledger để bảo đảm tất cả task trước đã DONE.

- Full lint/types/build, frontend coverage ≥70%, Rust coverage ≥85%, core smoke dưới 5 phút, integration cho luồng mới; không gắn mọi test mới vào smoke.
- Native fixture: mở DB cũ, backup trước migration, nâng cấp, tạo card B→source A, thêm properties mọi kiểu, restart, rename/move/delete/restore A, rating/replay/Undo, chọn backup cũ và restore vào thư mục mới.
- Kiểm integrity/FK, counts, stable IDs và lịch sử; không dùng số lượng test thay bằng chứng dữ liệu đúng. Test đường hỏng: migration interruption, malformed metadata, corrupted backup, delayed IPC, stale card/source, missing media.
- Codacy changed-code/dependency nếu có thay đổi dependency; phân biệt baseline. CodeScene theo AGENTS, không fabricate. L10n mọi target và placeholder validation. Telemetry chỉ enum/count, không field names, values, note title/body/path.
- Tài liệu/ledger/release evidence và normal commit/push main. Kiểm remote SHA, working tree và demo fixture dirt; dọn app/dev server do agent tạo.

Nghiệm thu: có báo cáo ghi commands, kết quả/coverage, before/after khả dụng, phần chưa kiểm chứng và commit push. Chỉ đánh dấu kế hoạch hoàn thành sau bước này.

## 4. Ranh giới và kiểm thử cho model triển khai

Không thêm: sync/cloud, AI, cloze, image occlusion, inheritance properties, formula, template marketplace, global schema manager, cross-Library links, automatic schedule reset, physical deletion, bulk upstream merge hoặc dependency mới nếu task không yêu cầu. Không dùng properties_json làm nơi cất source identity hoặc system schedule để né migration.

Task có thay đổi schema chỉ được làm đúng migration N06/N11 đã ghi. Thấy phạm vi phải mở rộng: ghi phát hiện và đề xuất điều chỉnh, không lén đổi contract khi đang viết UI. Nếu bug ở ngoài task, ghi riêng; lỗi bảo toàn dữ liệu nằm trên đường task phải được xử lý trước khi giao.

Trong vòng lặp sửa nhỏ:

```bash
pnpm exec vitest run <test-file> -t '<behavior>'
pnpm test:related <source-file>
pnpm test:learning
pnpm test:workflow
cargo test --manifest-path src-tauri/Cargo.toml learning:: -- --test-threads=1
```

Đây là feedback commands, không thay release gate. Test pure value logic không cần render app; component tests mock boundary; Rust tests dùng temp Library/SQLite; integration kiểm flow; native xác minh persistence/media thật. Không dùng sleeps cố định để test race. Full coverage ở pre-push; shared/schema/IPC changes cố ý chạy rộng hơn. Không skip hook hoặc giảm ngưỡng để tiết kiệm thời gian.

Mỗi bug: test RED tái hiện → fix nhỏ → GREEN → refactor nếu cần → evidence/commit. Không commit probe cố tình fail như một test release. N00 có thể copy probe từ evidence để dùng làm regression, kiểm tra imports trước.

## 5. Prompt giao một task cho model nhỏ

```text
Đọc AGENTS.md, docs/MEMNOVA-PROPERTIES-AND-SOURCES-PLAN.md và ledger liên quan.
Chỉ thực hiện task Nxx. Trước khi sửa code, xác minh từng dependency bằng commit
và evidence đã push; không chỉ dựa vào dấu DONE.

Giữ hợp đồng ở phần 1–2. Chỉ đổi schema nếu task N06/N11 yêu cầu. Không đổi FSRS,
không merge upstream, không thêm dependency/tính năng ngoài task. Không dùng
Library thật làm fixture. Bảo toàn metadata không nhận diện, source IDs và history.

Chạy baseline phù hợp; CodeScene theo AGENTS hiện tại, thiếu công cụ ghi not run.
Với bug, tạo regression RED trước. Chạy targeted tests lúc phát triển; hoàn thành
normal hooks, Codacy, localization, docs/ADR/ledger và QA phù hợp trước bàn giao.
Commit/push main không bỏ hook. Báo chính xác cái gì đã chạy và cái gì chưa kiểm
chứng, kèm commit/evidence. Không tự bắt đầu task tiếp theo. Nếu dependency chưa
hoàn tất, báo dependency cụ thể; không ghi code workaround để vượt qua.
```

## 6. Điểm bắt đầu và bằng chứng hiện có

- Baseline `3a64cca0`, review ngày 18/10: 35 learning tests qua trong 5,16 giây.
- Bốn probe trong 2,63 giây tái hiện ba lỗi: array display/loss, Trash bypass và backup UI mất sau remount. Đây là kết quả fail có chủ đích của review, không phải release tests đang fail trong main.
- Evidence ngoài repo: `/Users/thompson/.codex/visualizations/2026/10/17/01a14956-0bf8-7ca0-81d1-04a1d0fd992a/properties-review-2026-10-18/`.
- Release trước: `docs/baselines/2026-10-17-review-recovery.md`. Không dùng coverage/native QA của release đó làm bằng chứng cho code sẽ viết trong kế hoạch mới.
- Thứ tự chạy gợi ý cho một model tại một thời điểm: N00 → N01 → N02 → N03 → N04 → N05 → N06 → N07 → N08 → N09 → N10 → N11 → N12 → N13 → N14 → N15 → N16 → N17. Mỗi task phải tạo checkpoint reviewable, không dồn vào một commit khổng lồ.
