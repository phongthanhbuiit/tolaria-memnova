# Kiểm toán task Memnova — 2026-10-19

Kết luận: kế hoạch chưa hoàn thành. Có code đã triển khai và kiểm tra thật; đồng thời còn thiếu tích hợp sản phẩm. Không dùng số task hoặc tổng số test để suy ra phần trăm hoàn thiện nghiệp vụ. Lần rà soát này không sửa production code, không chạy lại cả release suite và không tạo một kế hoạch tính năng mới.

## Trạng thái Git và kiểm chứng

- Local HEAD: `fa3934f410309f81cf1bbacaca61a0970d244237` (M19).
- Remote main: `c8c71603095dbd0d322ff48a1347bd9c6cbaf655`, xác minh mới bằng `git ls-remote origin refs/heads/main`; một commit local chưa push.
- M20 có code/test chưa commit. `git diff --stat` không bao gồm file untracked; đã kiểm tra cả `git status --short`, gồm module Rust workspace/catalog và browser model mới.
- `pnpm exec tsc -b`: exit0, log `/tmp/memnova-task-audit-current-types.log`.
- Focused Vitest:48tests/8files pass,4.01s. Bao gồm useLearningLibrary, LearningStudyView, useLearningStudy.recovery, verifiedNoteMedia, noteMediaReadiness, learning-note-workspace, learning-note-study, LearningClient. Log `/tmp/memnova-task-audit-current-focused.log`.
- `cargo test --manifest-path src-tauri/Cargo.toml learning::`:205tests pass,5.43s; không đếm các binary/filter có0tests là bằng chứng mới. Log `/tmp/memnova-task-audit-current-rust.log`.
- Public workspace IPC: đã đối chiếu log hiện có `/tmp/memnova-m20-workspace-ipc-green.log`,1test pass0.07s. Đây là log của lượt triển khai, không phải chạy lại trong audit này.
- `git diff --check`: exit0. Demo fixture dirt: rỗng.
- Full coverage/build/smoke/integration/native và Codacy cho M20: chưa kiểm chứng trong lượt audit này. CodeScene: NOT RUN; không có công cụ MCP khả dụng, không suy ra score. Báo cáo này không thay release gate.

## Đối chiếu task với code sử dụng thực tế

| Task | Checkpoint hiện có | Phần còn phải đóng |
|---|---|---|
| M00 | Baseline/fixture đã push | M24 phải đo lại cùng phương pháp; không có speedup nào được chứng minh ở working tree mới |
| M01–M04 | Codec/parity/schema/journal đã push | M22/M23 phải xác minh tích hợp cuối, đặc biệt crash/concurrent writer; không mở lại schema |
| M05 | Lifecycle backend đã push | Tiêu chí watcher reconcile chưa được nối trong app; phải kiểm lại sau M20, không coi backend tests là watcher QA |
| M06–M10 | IPC/resolve/backup/preview/apply backend đã push | Entry và trải nghiệm người dùng vẫn phụ thuộc M20; native toàn luồng thuộc M23 |
| M11 | Conversion/recovery component và tests đã push | Component chưa được mount ở entry của app. Staging này có ghi trong task; không có nghĩa conversion đã accessible |
| M12–M14 | Canvas flush/invalid snapshot/media đã push | M23 kiểm thao tác cuối trước quit/restart trên code cuối; checkpoint subset không thay thế |
| M15–M17 | Editor/source picker/file lifecycle đã push | Native tích hợp cuối, source move/missing và clone độc lập cần M22/M23 |
| M18 | Active editor properties và native write guards đã push | Inactive configured-note/bulk properties chưa có workspace coordinator. Hiện generic native write bị chặn có chủ đích; chưa phải workflow hoàn chỉnh |
| M19 | Commit local fa3934f4, focused tests và component browser pass | Chưa normal push; có lỗi integration cũ ở Add card đã tái hiện trên pushed HEAD, chưa giải quyết; native cuối còn thiếu |
| M20 | Backend workspace/lanes/capability và browser model đang làm | Hook/context/dashboard/default routing, explicit enable/disable, legacy entry, folder scopes, conversion/recovery entry, inactive writes, refresh và recovery trước Store-open |
| M21 | Chưa bắt đầu | Style/a11y/locales/width/zoom/light-dark matrix của luồng đã nối xong |
| M22 | Chưa bắt đầu nghiệm thu đầy đủ | I01–I12, lỗi integration Add card, recovery/fault/concurrency cases. Các regression rải rác hiện có không đồng nghĩa matrix đã hoàn tất |
| M23 | Chưa bắt đầu nghiệm thu đầy đủ | Native end-to-end trên binary cuối và disposable Library; SQLite/file/media evidence |
| M24 | Chưa bắt đầu | Production timing >=20samples/case,1000notes, canvas100/1000shapes,20switches/resource cleanup |
| M25 | Chưa bắt đầu | Release gates, security/coverage/locales/docs, verified push và tree sạch sau mọi sửa đổi cuối |

## Khoảng trống đã xác nhận từ source

1. [useLearningLibrary.ts](../../src/hooks/useLearningLibrary.ts) vẫn gọi `client.syncPages()` và chỉ tải legacy `listCards`. [LearningClient](../../src/lib/learning/client.ts) đã có `supportsNoteMemory`/`syncNoteWorkspace`, nhưng hook chưa tiêu thụ chúng. Backend/API có không đồng nghĩa Dashboard đã có note lane.
2. [App.tsx](../../src/App.tsx) `requestStudy` vẫn gửi scope chỉ có pageIds; `reviewCount` vẫn tính từ legacy card list. UI chưa gửi lane notes và chưa có hai bộ counts riêng.
3. [EditorContentLayout.tsx](../../src/components/editor-content/EditorContentLayout.tsx) vẫn mount PageFlashcards. [PageFlashcards.tsx](../../src/components/learning/PageFlashcards.tsx) tự `ensurePage` lúc mở, còn Add card và Clone card. Đây là luồng cũ, chưa phải opt-in một trang = một flashcard. Không được bỏ đường xem/sửa/học/restore legacy khi thay entry mặc định.
4. [NoteConversionDialog](../../src/components/learning/NoteConversionDialog.tsx) chỉ được import bởi tests; NoteRecoveryDialog được mount bên trong component này. Không có entry từ App/Dashboard/PageFlashcards. Không nói người dùng đã truy cập được recovery.
5. [frontmatterOps.ts](../../src/hooks/frontmatterOps.ts) thử registered editor writer rồi rơi về generic native command. [useNoteMemoryEditorFace.ts](../../src/hooks/useNoteMemoryEditorFace.ts) chỉ đăng ký writer cho managed editor đang mount. Native guard chặn inactive configured-note writes; cần nối cùng coordinator cho workspace, không gỡ guard để làm nút có vẻ hoạt động.
6. [pageScope.ts](../../src/lib/learning/pageScope.ts) hiện dùng `collectDeckMembers`, chưa phải folder scope của note lane. App source refresh hiện theo path/title, không phải bằng chứng cập nhật learning state ngay khi nội dung/nguồn ngoài app đổi.
7. [store.rs](../../src-tauri/src/learning/store.rs) chặn thiếu DB trước Store-open; UI backup hiện phụ thuộc connected client. Cần entry recovery phù hợp, không tạo DB/history trắng để vượt lỗi. Case DB còn nhưng manifest mất cần regression M22 trước khi khẳng định an toàn.

Các nghi vấn về stale journal, malformed payload, Markdown code/media parsing, raw configuration removal và native last-stroke đã được ghi để thử ở M22/M23. Chưa có regression trong audit này thì không gọi chúng là lỗi đã xác nhận hoặc đã sửa.

## Vì sao tiến độ nhìn như lặp

Task đầu tập trung nền dữ liệu và có chủ đích chưa đổi entry mặc định trước M20. Tuy vậy báo cáo trước thường nêu số tests/commit mà chưa nói rõ người dùng đã dùng được hành động nào. Bảng ledger còn chứa chữ pending cũ trong row DONE và các audit lịch sử dùng thì hiện tại. Vì vậy người đọc dễ hiểu mức hoàn thiện cao hơn trạng thái app thực tế.

Full push trước mất9m51s, trong đó54smoke mất4.7m; native QA cũng tìm được regression thật cần rebuild. Đây giải thích một phần thời gian, không giải thích thay cho phần M20 chưa code xong. Lượt audit này dùng tests nhỏ4.01s/5.43s và đọc code consumers; không chạy lại10phút gate chỉ để kiểm tra trạng thái.

## Thứ tự tiếp tục, không mở thêm phạm vi

1. Đóng M20 theo các entry/action còn thiếu bên trên, bằng regression cho note thường/enabled/disabled/invalid và legacy. Trước khi đánh dấu xong phải dùng luồng app thực tế, không chỉ gọi API từ test.
2. Sau khi entry ổn định mới làm M21. Không polish toàn app hoặc thêm feature để trì hoãn tích hợp.
3. Chạy M22 đầy đủ; sửa lỗi có RED trước, giữ dữ liệu và kiểm lại các task bị ảnh hưởng. Giải quyết lỗi Add card đã biết trong bối cảnh routing mới, không xóa test để giấu lỗi.
4. Native M23 sau source cuối; performance M24 theo baseline. Nếu tối ưu làm đổi production code, chạy lại các kiểm chứng bị ảnh hưởng.
5. M25 mới có thể kết luận hoàn thành: đầy đủ gates, normal push main thành công, remote đúng SHA, tree/demo sạch. Không có ước lượng phần trăm hoặc ETA giả từ số task.
