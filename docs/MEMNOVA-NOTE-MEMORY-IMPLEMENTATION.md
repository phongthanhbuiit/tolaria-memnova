# Memnova sổ triển khai học thuộc trang ghi chú

Plan: [nghiệp vụ và dữ liệu](MEMNOVA-NOTE-MEMORY-PLAN.md). Task: [M00 đến M25](MEMNOVA-NOTE-MEMORY-TASKS.md).

Ngày lập: 2026-10-18. Baseline source đối chiếu: `88ae677a`. **Đây là bàn giao kế hoạch, không phải báo cáo đã triển khai. Tất cả task dưới đây chưa bắt đầu.** Task M00 phải lấy HEAD/toolchain/baseline mới khi thực thi.

| Task | Trạng thái | Commit đã push | Bằng chứng và giới hạn |
|---|---|---|---|
| M00 | NOT_STARTED | — | — |
| M01 | NOT_STARTED | — | — |
| M02 | NOT_STARTED | — | — |
| M03 | NOT_STARTED | — | — |
| M04 | NOT_STARTED | — | — |
| M05 | NOT_STARTED | — | — |
| M06 | NOT_STARTED | — | — |
| M07 | NOT_STARTED | — | — |
| M08 | NOT_STARTED | — | — |
| M09 | NOT_STARTED | — | — |
| M10 | NOT_STARTED | — | — |
| M11 | NOT_STARTED | — | — |
| M12 | NOT_STARTED | — | — |
| M13 | NOT_STARTED | — | — |
| M14 | NOT_STARTED | — | — |
| M15 | NOT_STARTED | — | — |
| M16 | NOT_STARTED | — | — |
| M17 | NOT_STARTED | — | — |
| M18 | NOT_STARTED | — | — |
| M19 | NOT_STARTED | — | — |
| M20 | NOT_STARTED | — | — |
| M21 | NOT_STARTED | — | — |
| M22 | NOT_STARTED | — | — |
| M23 | NOT_STARTED | — | — |
| M24 | NOT_STARTED | — | — |
| M25 | NOT_STARTED | — | — |

Trạng thái dùng: NOT_STARTED, IN_PROGRESS, BLOCKED_WITH_EVIDENCE, DONE. Không có trạng thái “DONE nhưng chưa test/push”. Ghi dependency bằng commit/evidence thực, không chỉ dựa số thứ tự hoặc câu trả lời trước.

## Mẫu ghi kết quả mỗi task

```text
Task:
Starting HEAD và dependency commits:
Working tree trước task:
Phạm vi thực hiện và contract được giữ:
Baseline command / exit / số test / thời gian:
Regression RED (với bug) và GREEN:
Các test module/legacy/integration/native đã chạy:
File/table preservation evidence và mutation dự kiến:
CodeScene before/after hoặc NOT RUN kèm lý do:
Codacy tools, paths, new/baseline severity và Medium disposition:
Localization keys/targets/method/validation hoặc no UI copy changes:
PostHog events/safe fields hoặc lý do không cần event:
ADR/docs cập nhật:
Coverage/release hook kết quả thực:
Evidence artifact paths và screenshots đã xem:
Giới hạn / NOT RUN / lỗi có sẵn:
Commit và normal push thành công:
Demo dirt và owned QA process cleanup:
Task kế tiếp đủ dependency:
```

## Bằng chứng của lượt lập kế hoạch

- Chỉ tạo ba tài liệu này; không thay application code, schema, dependency, hook hoặc Library dữ liệu.
- Source đọc: parser hai mặt, editor/flush, tldraw snapshot/assets, note properties, SQLite card/source/session/backup/migration và AGENTS hiện hành.
- 28 test splitter/durable Markdown/whiteboard pass ở lượt đánh giá ngay trước kế hoạch; không dùng kết quả đó để đánh dấu M00 hoặc task implementation DONE.
- CodeScene: NOT RUN, docs-only; integration tùy chọn không được dùng để ngăn lập kế hoạch. Codacy/coverage/native/l10n runtime: không chạy lại cho tài liệu này; không có UI copy hoặc production behavior thay đổi.
- Kiểm tra cấu trúc tài liệu: PASS, đủ 26 task với mục tiêu/nghiệm thu và 26 trạng thái NOT_STARTED; dependency graph không vòng lặp; đủ 12 integration cases; local document/source links tồn tại; code fences cân bằng và không trailing whitespace.
- Kết quả kiểm tra cấu trúc tài liệu và commit/push của lượt lập kế hoạch được báo ở phần bàn giao; không tự điền SHA chưa tồn tại.
