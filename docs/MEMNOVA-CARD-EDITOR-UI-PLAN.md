# Memnova — kế hoạch thống nhất giao diện Add/Edit Card

Trạng thái: **kế hoạch, chưa triển khai UI**. Điểm bắt đầu được đọc: `01db799b` trên main, working tree sạch. Kế hoạch N00–N17 đã hoàn thành; đây là đợt UI riêng, không mở lại schema/nghiệp vụ của đợt đó.

## 1. Kết quả rà soát

Đã đọc CardForm, PropertyEditor/PropertyValueEditor, CardMediaFields, VocabularyFields, SourcePagePicker/Preview, shadcn primitives, propertyPanelLayout và theme app. Đã xem lại ảnh QA của bản phát hành trước ở 480×800; chưa chạy một phiên native QA mới cho kế hoạch này.

| Vị trí | Bằng chứng hiện tại | Vấn đề cần xử lý |
|---|---|---|
| `src/index.css:14`, `src/components/ui/button.tsx:8` | Root 14px; Button dùng text-sm, các size theo rem | text-sm mặc định 0.875rem tương ứng khoảng 12.25px khi root thực tế là 14px. Không kết luận root sai: cần đo computed styles; không đổi font toàn app để sửa một form. |
| `src/components/ui/input.tsx`, `textarea.tsx` | text-base rồi md:text-sm | Chữ nhập thay đổi qua breakpoint, trong khi label/button vẫn text-sm; layout đổi kích thước có thể làm form thiếu nhất quán. |
| `src/components/propertyPanelLayout.ts` | Inspector có label/action 12px và icon slot riêng | App đã có ngôn ngữ compact, icon và semantic tokens để đối chiếu; form mới chưa dùng nhất quán. Inspector cũng không phải mẫu để sao chép mọi chi tiết sang dialog. |
| `src/components/learning/CardForm.tsx` | Nội dung, Status, IPA, preset, properties, media, memory nối thành một cột dài | Nhóm phụ cạnh tranh với câu hỏi/đáp án. IPA xuất hiện cả khi Basic còn giữ metadata tương thích; không được giải quyết bằng xóa dữ liệu. |
| `PropertyEditor.tsx`, `PropertyValueEditor.tsx` | Mỗi field luôn hiện input tên, Rename, Remove, type select; list lại thêm Remove | Nhiều control cùng trọng lượng, nhiều viền lồng nhau, khó phân biệt nhập giá trị và quản lý field. |
| `PropertyEditor.tsx` | Preview đổi kiểu có Button mặc định ghi Save | Cạnh tranh với Save toàn thẻ, dễ tạo cảm giác có hai lần lưu xuống dữ liệu. Đây thực tế chỉ là áp dụng vào draft. |
| `CardMediaFields.tsx` | Disclosure dùng ký tự +/−; choose-file là outline text-only | Thiếu hệ icon thống nhất với app, disclosure dễ bị hiểu nhầm là thêm/xóa media. |
| `SourcePagePreview.tsx` | Nút link mang tên trang mở preview | Cần làm rõ hành động Xem nguồn, tránh nhầm với đổi nguồn hoặc rời editor. |
| Footer CardForm | Đã có Save primary/Cancel outline và footer cố định | Giữ điểm tốt này; không đúng nếu nói tất cả nút hiện đều giống nhau. Vấn đề lớn hơn ở thao tác phụ và các panel phía trong. |

Nguồn tham khảo accessibility: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), đọc ngày 2026-10-18. Áp dụng icon có accessible name, focus rõ và nội dung không bị footer che; hợp đồng lưu/validation của Memnova có ưu tiên hơn khuyến nghị tổng quát. Không đổi quy tắc chặn Save với giá trị không hợp lệ chỉ để làm theo một checklist.

## 2. Phạm vi và bất biến

Mục tiêu: form học tập gọn, ưu tiên nội dung, dùng cùng phong cách với Inspector/dialog của Memnova. Giữ Inter/system fallback, màu semantic light/dark và thư viện Phosphor hiện có. Không thêm font, bộ icon hoặc dependency mới.

Trong phạm vi: Add/Edit Card, thành phần properties/media/source bên trong; kiểm tra ảnh hưởng của shared PropertyEditor lên Page properties. Không redesign Home/Study/Inspector toàn bộ.

Không đổi Rust/SQL/schema/SDK/FSRS/XP/import/backup. Không đổi cách page values ở Markdown, card values ở SQLite, owner/source UUID, vocabulary aliases/arrays, hints, revision hoặc retry. Không autosave, thêm shortcut, thêm màn hình preview toàn thẻ, kéo-thả field, bulk edit, xóa thẻ trong form hay thiết kế schema manager.

Phải giữ:

- Một CardDraft và một luồng Save; dữ liệu chưa Save không được ghi qua API. Import file vẫn dùng pipeline hiện có, không đổi semantics copy-file/cancel trong đợt UI.
- Cancel trả về dữ liệu trước khi mở form. Không thêm dirty-close dialog trong phạm vi này; không nới các chốt busy/Escape/outside-click hiện có.
- Opaque/null/unsafe integer/mismatched hints vẫn thấy được, read-only; rename/remove/convert không làm mất dữ liệu. Type conversion vẫn preview và áp dụng tường minh.
- Đổi preset/answer mode, đóng/mở section và mở source preview không mất draft hoặc editor state đang nhập dở. Không đổi React key của cả CardForm để reset UI.
- Pending IPC, Library/owner đổi, response thất lạc, save thành công nhưng refresh lỗi vẫn theo contract đã kiểm thử; không biến Retry refresh thành create/update lần nữa.
- Shared component phải giữ trải nghiệm PagePropertyEditor và không tạo đường ghi mới.

## 3. Đặc tả UI đã chọn

### Typography và kích thước

Đây là target cho **form học tập**, phải đo computed styles ở U00 trước khi code. Dùng một module style nhỏ trong learning (ví dụ `cardEditorStyles.ts`) và áp dụng class scoped; không thêm design-system framework. Không sửa `:root`, global Button/Input/Textarea/Dialog để ép cả app theo form.

| Vai trò | Target computed CSS |
|---|---|
| Dialog title | 16px / 22px, weight 600, căn trái cả cửa sổ hẹp |
| Section title | 13px / 18px, weight 600 |
| Label | 12px / 18px, weight 500 |
| Input/select/button text | 13px / 20px; button weight 500, input 400 |
| Question/answer text | 14px / 21px, weight 400 |
| Help/path/readonly metadata | 12px / 18px, màu semantic muted; không giảm xuống 10–11px |
| Control thường | Cao 32px, khoảng cách trong ngang 10–12px |
| Footer action | Cao 36px; Save và Cancel cùng chiều cao |
| Icon action / disclosure | Hit target ít nhất 32×32px; glyph 16px; với pointer coarse tăng hit target đến 44px |

Tailwind h-8/size-4 dùng rem nên không mặc định tương đương 32px/16px với root 14px. Dùng dimension rõ trong lớp scoped hoặc token hiện có đáp ứng đúng phép đo. Không rải text-[13px]/h-[32px] tùy tiện qua mọi file. Duy trì focus ring shadcn, không dùng !important để thắng specificity. Kiểm tra portal menu/calendar/tooltip vì chúng không kế thừa selector của dialog theo DOM.

### Bố cục

Dialog một cột chính, target max-width 720px, chừa 16px mỗi cạnh ở cửa sổ hẹp; không sidebar thứ hai. Trên màn hình nhỏ giữ header và footer không co, body min-height:0 scroll; không có thanh cuộn ngang. Giữ chiều cao khoảng 90dvh, kiểm tra thêm 480×640. Khoảng cách giữa section 20px, giữa label/control 6px, trong nhóm field 12px.

```text
Edit card
Mỗi thẻ có lịch ôn riêng
────────────────────────────────────────
Card type [Basic      v]  Status [Active v]

Question
[ Nội dung câu hỏi                      ]

Answer source [Inline / This / Other   v]
[ Inline answer hoặc selected-source row]

v Vocabulary              (khi vocabulary)
v Properties (3)                  [+ Add]
  [type icon] priority  [0]           [...]
  [type icon] remembered [switch]     [...]
> Media                    [image/audio]
> Review information       (read-only)
────────────────────────────────────────
                    [Cancel] [icon Save]
```

- Card type và Status thành hàng thiết lập hai cột khi đủ rộng, xếp dọc khi hẹp. Card type vẫn do draft hiện có quản lý; di chuyển control khỏi VocabularyFields thay vì render hai nơi. Không mất card_type lạ/không tương thích đang hiển thị generic read-only.
- Question và Answer luôn là phần chính. Không chuyển sang tabs khiến người dùng phải nhớ trạng thái ở tab khác.
- Inline giữ textarea. Whole-page/current-source hiện một summary có icon trang, title/path và nút Xem nguồn rõ nghĩa. Other-source giữ autocomplete theo path và UUID; không tạo luồng chọn nguồn thứ hai.
- Vocabulary mở khi đang chọn preset tương ứng. IPA đặt cùng nhóm vocabulary khi phù hợp; Basic vẫn có nơi hiển thị/sửa metadata IPA tương thích đã tồn tại, không tự xóa hoặc tạo field khi đổi bố cục.
- Properties: mở mặc định nếu có field; nếu rỗng hiện header và Add. Add mở composer, focus input tên. Không tự cuộn khi người dùng đang nhập chỉ vì count thay đổi.
- Media: mở mặc định khi có path hoặc lỗi cần sửa, còn lại thu gọn. Không tự đóng sau khi chọn file. Existing unsupported media vẫn được bảo toàn và hiển thị generic như contract hiện tại.
- Review information thu gọn, có nhãn read-only rõ; dùng dl/text, không dùng input disabled giả như có thể chỉnh schedule.
- Sections không unmount các editor có local state khi thu gọn; nội dung ẩn không được nằm trong tab order. Dùng primitive đã có với forceMount/hidden phù hợp hoặc giữ state ở owner. Cấm dùng conditional render làm mất số đang nhập dở, tên đang đổi hay conversion preview. Source preview đang mở phải tiếp tục giữ draft và focus return.

### Phân cấp thao tác và icon

| Hành động | Style | Icon / ý nghĩa |
|---|---|---|
| Lưu cả thẻ | default/primary, chỉ một nút như vậy | FloppyDisk; khi busy dùng CircleNotch và nhãn Saving… |
| Cancel toàn form | ghost/neutral, cùng kích thước với Save | Có thể không icon; không cần thêm X chỉ để trang trí |
| Thêm property/item | ghost + text; vị trí sát danh sách | Plus |
| Mở/đóng section | ghost, full row, aria-expanded | CaretDown xoay; không dùng +/− như thêm/xóa |
| Xem nguồn | ghost + text rõ nghĩa | Eye; title/path của nguồn vẫn nhìn thấy |
| Chọn ảnh/audio | outline/neutral + text | ImageSquare / MusicNotes |
| Quản lý field | ghost icon button luôn có thể truy cập | DotsThreeVertical mở menu |
| Rename field | menu item, rồi inline input + Apply/Cancel | PencilSimple; không ghi tên mới khi blur |
| Change type | menu mở selector và preview hiện có | Swap; chỉ lossless conversion như trước |
| Áp dụng đổi kiểu vào draft | secondary/outline; nhãn “Apply type” | Check; không dùng Save primary |
| Remove field/item | menu destructive text hoặc ghost icon có tooltip | Trash/X; không dùng filled-red cho mọi hàng |
| Date/value controls | outline vì là giá trị, không CTA | CalendarBlank nếu control date |

Dùng `@phosphor-icons/react` hiện có; xác minh export trước import, thống nhất weight regular. Ưu tiên mapping type icon hiện có (`DISPLAY_MODE_ICONS`) nếu phù hợp, không sao chép một mapping lệch giữa Page và Card. Icon trang trí aria-hidden; icon-only cần accessible name có tên field, Tooltip dùng cho giải thích chứ không thay aria-label. Không nhét icon vào mọi nút nếu không giúp phân biệt hành động. Không dùng màu đơn lẻ để báo lỗi/destructive/readonly.

### Properties gọn và có chủ đích

Hàng mặc định chỉ có type icon/name, value editor và menu quản lý. Không render input tên + Rename thường trực cho tất cả field. Tên dài wrap/truncate có cách đọc đầy đủ; value giữ min-width:0. Ở màn hình hẹp cho tên ở hàng trên, value ở dưới; không ép tất cả vào một hàng.

- Menu Rename mở input tên với Apply/Cancel rõ; giữ propertyKey/validateKey/reservedKeys và error hiện có. Apply chỉ đổi draft, không gọi API.
- Change type có preview giá trị trước/sau, nhãn Apply type; preview/error không bị section collapse làm mất. Không thêm coercion mới.
- Add composer chỉ mở khi cần: name, kind, Add/Cancel. Lỗi duplicate/reserved vẫn inline, focus đúng field. Bấm Cancel composer không đóng CardForm.
- List: Add item ở cuối; Remove item là action cục bộ có accessible name gồm field và vị trí. Không dùng cùng nhãn Save cho thao tác cục bộ.
- Unknown/read-only: có nhãn rõ và nội dung raw được bảo toàn, không giả vờ đổi kiểu được. Không hide metadata chỉ để form trông sạch.
- Quyết định compact row áp dụng cho shared PropertyEditor ở cả Page và Card; tính năng lưu/hints/partial retry của Page không đổi. Không thêm prop mode phức tạp chỉ để nhân đôi giao diện.

## 4. Task để giao model triển khai

Mỗi task có commit riêng, không dồn cả đợt vào một commit. Dependency được kiểm tra bằng ledger/commit/evidence. Nếu chỉ giao một mã task thì dừng sau mã đó. Không tự mở rộng nhiệm vụ sang tất cả task còn lại.

### U00 — Baseline và chốt phép đo

Phụ thuộc: N00–N17 đã DONE, report release tồn tại.

- Đọc AGENTS, ADR-0145/0146, ARCHITECTURE/ABSTRACTIONS và plan này. Kiểm tra git status, giữ thay đổi người dùng.
- Chạy focused learning tests để có baseline mới. Tạo ledger U00–U08, ghi exact SHA/commands; không gọi kết quả release cũ là test vừa chạy.
- Dùng disposable Library/preference riêng. Chụp Add/Edit Basic/Vocabulary hiện tại light/dark ở 1280×900, 768×800, 480×800; đo computed font/line-height/weight/control height, so với Inspector và một dialog app.
- Kiểm tra theme, browser zoom/OS scale; ghi sai khác thực tế. Target bên trên là thiết kế chủ động, không tuyên bố mọi khác biệt hiện tại là bug.
- Ghi CodeScene before nếu có, nếu thiếu ghi not run theo AGENTS. Không yêu cầu token để làm UI.

Nghiệm thu: bảng before/target, ảnh gốc, focused baseline, ledger; chưa sửa production code.

### U01 — Style contract scoped cho learning editor

Phụ thuộc: U00.

- Tạo module class nhỏ dùng chung cho vai trò title/label/control/body/helper/action, tận dụng semantic tokens. Không thêm global override hoặc CSS framework.
- Áp dụng typography/kích thước lên CardForm và các control con cần thiết, gồm portal selectors. Đổi breakpoint không làm text field nhảy cỡ chữ.
- Không sửa logic property/save. Không sửa primitive toàn app. Nếu thực sự cần đổi shared primitive thì dừng và ghi đề xuất riêng vì blast radius rộng.

Nghiệm thu: computed styles đạt target ở các kích thước, light/dark; không regression ở Page properties. Pure CSS không cần unit test mock className; dùng browser measurement/ảnh có assertion.

### U02 — Hierarchy button và icon

Phụ thuộc: U01.

- Áp dụng bảng action; Save toàn thẻ là primary duy nhất. Conversion Save đổi thành Apply type, local Add là secondary/ghost. Disclosure dùng caret.
- Icon Phosphor đúng vai trò, size/weight thống nhất; tooltip/aria-label cho icon-only. Spinner/nhãn Saving không làm footer nhảy rộng.
- Giữ exact retry, savedRefreshFailed và pending disable contracts; không chỉ đổi mọi button sang cùng một variant.
- Localization mọi copy/tooltip mới. Không thêm analytics event cho thay đổi thẩm mỹ này.

Nghiệm thu: bản đồ actions đối chiếu đầy đủ; keyboard/focus/disabled states và conversion-vs-save được test theo hành vi.

### U03 — Bố cục form và grouping

Phụ thuộc: U01,U02.

- Chuyển Card type/Status vào nhóm thiết lập, nội dung lên trước, IPA/vocabulary vào nhóm hợp lý, thống nhất section layout.
- Media/Properties/Review information disclosure như đặc tả; footer/header cố định, body scroll. Giữ editor state khi collapse/reopen; không key-remount CardForm.
- Add/Edit cùng shell; không mất field legacy hoặc nhân đôi preset fields.

Nghiệm thu: Basic trống gọn; Vocabulary dài, Basic còn metadata legacy, nguồn khác và properties nhiều vẫn thao tác được. Regression trước sửa nếu phát hiện mất draft/focus/state.

### U04 — Compact properties và contextual actions

Phụ thuộc: U02,U03.

- Thay tên-field input thường trực bằng label/menu, inline rename khi yêu cầu; dùng existing pure operations/validation.
- Add composer, conversion preview và list actions theo đặc tả. Không tăng số API calls; Apply type/Rename/Add chỉ sửa draft.
- Shared PropertyEditor đồng bộ ở Page và Card. Giữ partial-write/hint-only retry, opacity/read-only và số nguyên không an toàn.

Nghiệm thu: add/edit/rename/remove/convert/cancel/list/reference đều đúng; page no-op Save vẫn zero write. Tests dùng role/accessible name và client spies, không snapshot nguyên cây JSX hoặc asserts mỗi class.

### U05 — Source, media và read-only information

Phụ thuộc: U03,U04.

- Source summary rõ title/path/Preview; sửa không gian và icon của picker đang có, giữ UUID/path selection và preview không tạo session.
- Media auto-expand phù hợp, chọn file/loading/error rõ, preview không làm footer đổi vị trí. Không sửa copy/import/resolver hay chuyển nơi lưu media.
- Memory dl gọn, date hợp lệ/không hợp lệ và readonly rõ ràng.

Nghiệm thu: nested preview đóng trả focus đúng trigger; Space/1–4 trong preview không grade lớp dưới; media path/unknown data không mất khi đóng section; file picker cancel không làm kẹt busy.

### U06 — Accessibility, responsive, localization

Phụ thuộc: U02–U05.

- Label liên kết control, aria-expanded/controls, icon names, focus order và focus return; folded content không focus được. Error liên kết field/aria-invalid khi biết field lỗi; không tự đoán field lỗi từ backend text.
- Mouse path trước rồi Tab/Shift+Tab/Enter/Space/Escape. Busy không đóng nhầm form; tooltip không chặn input; menu/calendar không bị clip và không bị parent shortcut ăn phím.
- Light/dark; 1280×900, 768×800, 480×800, 480×640; zoom 125%/150%; chuỗi dài, Unicode, tiếng Việt và một locale dài (ví dụ Đức). Ở zoom có thể reflow, không cố giữ chiều cao cố định làm clip chữ.
- Respect reduced-motion; transition chỉ color/opacity/transform theo mục đích. Nếu shared Button còn transition-all, bỏ animation không cần thiết bằng scoped class ở form; không sửa global trong task này.
- Copy mới vào en.json và đủ 18 targets; Lara nếu có, manual translation khi thiếu theo AGENTS; l10n:validate. Không hard-code tooltip/copy trong component.

Nghiệm thu: ma trận QA có actual pass/fail + ảnh. Không tuyên bố contrast/zoom pass nếu chưa đo/chạy; ghi riêng giới hạn.

### U07 — Regression integration và native QA

Phụ thuộc: U06.

- Chạy focused unit/component tests và 7 learning/property integration hiện có; cập nhật selector chỉ khi accessible UI có thay đổi chủ động.
- Bổ sung tối đa vài integration hành vi cho menu rename → Apply type → Save/Cancel; collapse giữ draft số/tên/preview; footer không che control đang focus. Không thêm mọi tổ hợp viewport thành E2E dài.
- Browser computed styles: text/control/primary action hierarchy; ảnh screenshot animations disabled và phải assert đúng resolved theme trước capture. Kiểm ảnh bằng mắt, không chỉ lưu file.
- Native isolated fixture: Edit card có metadata/source/media → đổi draft → cancel không ghi; mở lại → sửa và save → restart vẫn giữ dữ liệu. Source preview/file picker/calendar thực sự hoạt động; table/IDs/revision/memory không tự reset. Page hints/Markdown adapter vẫn đúng sau shared UI change.
- Test data phải là synthetic/disposable. Dọn process và demo dirt; không dùng user Library.

Nghiệm thu: integration/native evidence; các lỗi trên đường UI đã có RED→GREEN khi phù hợp. Những thứ chỉ test qua mock phải được ghi đúng là mock.

### U08 — Release, docs và handoff

Phụ thuộc: U00–U07 DONE/verified theo ledger, toàn bộ code đã commit và không còn known regression trong phạm vi.

- Codacy mọi touched code files, fix Critical/High mới; review Medium thực chất. CodeScene before/after khi có hoặc not run đúng AGENTS.
- Full lint/types/build/frontend coverage ≥70%; Rust check theo pre-push và AGENTS (không sửa Rust không có nghĩa được bỏ qua hook). 54 curated smoke vẫn dưới 5 phút; không thêm tag smoke cho các test cosmetic.
- Ghi docs/refactor/localization/PostHog: không event mới cho thay đổi bố cục; giữ nguyên các event nghiệp vụ hiện có và metadata an toàn.
- Cập nhật docs architecture/abstractions nếu tách component mới; không cần ADR cho styling/composition, nhưng không sửa ADR cũ.
- Normal commit/push main, không --no-verify, không sửa hook/coverage threshold để pass. Kiểm HEAD = remote, working tree sạch, demo dirt trống; ledger và release report có ảnh/commands/kết quả thực.

Nghiệm thu cuối: giao diện thống nhất theo đặc tả và bằng chứng QA, contract dữ liệu N00–N17 vẫn giữ nguyên. Không đánh dấu DONE chỉ vì code build được.

## 5. Ma trận regression tối thiểu

| Nhóm | Tình huống bắt buộc |
|---|---|
| Add/Edit | Basic mới; Edit card đã active; Vocabulary; Basic còn metadata vocabulary; Cancel; reopen |
| Answer | Inline/current/other; chuyển qua lại giữ inline draft; same-title paths; source missing; preview nested và focus return |
| Properties | 0/false/empty string; date; text/page lists; comma/Unicode; raw opaque/null/unsafe integer; reserved/duplicate key; incompatible kind |
| Local actions | Rename/Apply/Cancel; convert preview/Apply/Cancel; remove field/item; collapse/reopen giữ pending state; không gọi API trước Save |
| Async | Source/media busy; Library đổi; create response lost/retry; update response lost/retry; save succeeded/refresh failed; Page hint-only retry |
| Media/memory | Path dài; image/audio tồn tại/missing; file picker cancel/error; due invalid; counts readonly |
| Layout | Light/dark × desktop/narrow; tiếng Việt/Đức; zoom; footer không clip; menu/calendar/tooltip portal |
| Input | Mouse, keyboard, focus-visible, screen-reader names; no accidental grade/submit từ nested control |

Lưu ý: root14px → rem chỉ là phép đọc source. U00 phải đo browser/native; unit jsdom không chứng minh computed CSS, contrast hoặc native file picker. Báo cáo release cũ (4,576 frontend tests, 85.82% Rust lines) chỉ là mốc tham khảo, không thay kết quả của đợt UI mới.

## 6. Prompt giao model nhỏ

```text
Đọc AGENTS.md và docs/MEMNOVA-CARD-EDITOR-UI-PLAN.md.
Chỉ triển khai Uxx, xác minh dependencies qua ledger/commit/evidence rồi mới sửa.
Giữ nguyên dữ liệu, schema, API và retry contracts của N00–N17.
Dùng shadcn/Phosphor/theme hiện có, style scoped; không sửa global primitives.
Với bug: regression RED trước rồi GREEN. CSS thuần kiểm bằng browser/ảnh.
Chạy focused tests trong vòng lặp; normal hook quyết định release, không bypass.
Hoàn thành localization/Codacy/docs/QA liên quan; ghi rõ mục chưa chạy.
Commit/push main theo AGENTS; báo file, commands, ảnh và SHA thực tế.
Dừng sau Uxx, không tự làm task tiếp theo.
```

Nếu giao cả đợt, thay dòng “Chỉ triển khai Uxx” bằng “Triển khai tuần tự U00–U08; mỗi task một checkpoint, xác minh dependency, chỉ báo hoàn tất sau U08”. Không dùng hai chỉ dẫn dừng/tiếp tục mâu thuẫn trong cùng prompt.
