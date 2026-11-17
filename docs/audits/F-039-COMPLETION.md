# F-039 — Cmd+click wikilink

17/11/2026 · baseline phiên này `d440a355` · Node 24.19.0 / pnpm 10.34.8 / Chromium Playwright 1.58.2.

**F-039: fixed** — commit `:/^fix: F-039 stabilize wikilink navigation during source saves` (Git revision duy nhất của finding; hash tuyệt đối: `git log -1 --format=%H -- docs/audits/F-039-COMPLETION.md`). Người dùng đã cho phép sửa nguyên nhân dùng chung với render error F-041 sau khi xem bằng chứng. Không sửa test, timeout hoặc trạng thái F-040/F-041.

## Nguyên nhân và bằng chứng

Test gốc không trace thất bại **10/10**, `--retries=0 --repeat-each=10`, một worker: [log](evidence/F-039-before-no-trace.txt). Một đợt bật snapshot trace lại đạt **10/10**: [log](evidence/F-039-before-with-snapshots.txt). Vì vậy bản thân tracing thay đổi timing; không dùng đợt có trace làm baseline sạch. Hai tệp app sửa có blob giống hệt giữa `f78b8fb9` và `d440a355`: [đối chiếu mã](evidence/F-039-source-hashes.json), phù hợp bằng chứng lỗi baseline có sẵn trước A–D1.

Trace nhẹ, tắt screenshot/snapshot nhưng giữ action log và video, tái hiện **3/3 fail**: [trace lần fail](evidence/F-039-failure-trace.zip), [video](evidence/F-039-failure.webm), [log](evidence/F-039-diagnostic-light.txt), [ảnh trước](evidence/F-039-before.png). Trong trace lần đầu, `call@132` resolve đúng `span[data-target="manage-sponsorships"]`, click tại `(683.08, 326.68)` hoàn tất ở 13107.156 ms. Assertion H1 bắt đầu ở 13108.705 ms rồi renderer không trả kết quả. Video còn hiển thị Grow Newsletter; chuỗi rỗng trong lỗi timeout không chứng minh H1 trên đĩa đã bị xóa hoặc resolver chọn Grow Newsletter.

Hai vấn đề identity ở đường cập nhật danh sách bị kích hoạt khi chèn link/lưu source đồng thời mở target:

- `hideWorkspaceMetadata` tạo lại object cho **mọi** entry có workspace sau mỗi metadata patch, dù chỉ source đổi. App dùng projection này cho cả editor và note list. [CPU profile](evidence/F-039-cpu.json.gz) có 1.955/2.514 samples (77,76%) trong React development `addObjectDiffToProperties`. Một lần debugger pause riêng ghi nhận `RawModeEditorSection`, `entries` có 9.039 phần tử đang bị deep-diff: [locals](evidence/F-039-profile-summary.json). Đây là render churn của app, không phải bằng chứng lỗi resolve/load nội dung target.
- Virtuoso mặc định lấy index làm key; khi source vừa lưu đổi thứ tự Modified và selection đổi sang target, wrapper hàng bị gán lại và nội dung có thể remount. Regression dùng **Virtuoso thật**, chỉ mock kích thước viewport qua API của thư viện, tái hiện RED: [row RED](evidence/F-039-row-red.txt). Regression projection cũng RED khi target không đổi bị tạo object mới: [identity RED](evidence/F-039-identity-red.txt).

Đối chứng Library nhỏ ban đầu đạt 10/10 nhưng khi mở rộng lên 30 lượt vẫn **29/30**, snapshot lỗi là `Maximum update depth exceeded → react-virtuoso → VirtualNoteList`: [log](evidence/F-039-intermediate-29-of-30.txt), [render error](evidence/F-039-intermediate-render-error.txt). Chỉ thêm key cũng chưa đủ: 29/30 khi chạy song song [log](evidence/F-039-key-only-parallel.txt). Các phương án này không được coi là bản sửa hoàn tất. Không giữ thay đổi thu nhỏ fixture trong bản cuối.

## Sửa và TDD

- Cache projection bỏ workspace bằng WeakMap theo entry bất biến: source mới được chiếu lại, target/những note không đổi giữ identity; không sửa entry gốc hoặc pipeline lưu. Cache không giữ entry đã được thu hồi.
- `computeItemKey` dùng đường dẫn note, giữ đúng DOM/row state qua reorder.
- Smoke giữ fixture lớn, Cmd+click, `@smoke` và H1 timeout 5 giây. Bỏ bốn sleep cố định; chờ H1 nguồn + filename, menu đóng, link xuất hiện; sau click xác nhận H1 đích + filename đang mở + nội dung đích.
- Hai regression RED → GREEN: [GREEN](evidence/F-039-regressions-green.txt). Test gốc chưa sửa chạy với app cuối cũng đạt 3/3 không retry: [log](evidence/F-039-original-test-after.txt).

## Nghiệm thu không retry

Mọi đợt trong bảng chạy Chromium, không trace, `--retries=0`. Hai job song song dùng server/output riêng; suite giữ worker mặc định 1.

| Đợt trên bản cuối | Kết quả |
|---|---|
| Riêng, trước suite: `--repeat-each=30` | 30/30, 0 fail — [log](evidence/F-039-30-before-suite.txt) |
| Lặp 30 lượt đồng thời core smoke | 30/30, 0 fail — [log](evidence/F-039-30-parallel.txt) |
| Core smoke đồng thời | 54/54, 0 fail — [log](evidence/F-039-parallel-smoke.txt) |
| Riêng, sau suite: `--repeat-each=30` | 30/30, 0 fail — [log](evidence/F-039-30-after-suite.txt) |

Lệnh lặp: `pnpm exec playwright test -c playwright.smoke.config.ts tests/smoke/wikilink-path-fix.spec.ts --project=chromium --retries=0 --repeat-each=30`. Job song song đặt `BASE_URL=http://127.0.0.1:41746`; core suite dùng `pnpm playwright:smoke --retries=0`. Output/log tách dưới `/tmp/memnova-f039/`.

## Native và bảo toàn dữ liệu

QA macOS trên bundle riêng `net.memnova.qa.f039`, `MEMNOVA_CONFIG_HOME`/Library riêng, incognito kế thừa từ binary debug QA đã xác minh; frontend live hiện tại ở localhost:5201: [cấu hình](evidence/F-039-native-config.json). Chuột mở source rồi Cmd+click wikilink cho đúng H1 Manage Sponsorships, filename và body; Cmd+Left/Right quay lại/đi tới. [Ảnh sau](evidence/F-039-after.png), [AX](evidence/F-039-native-after.txt). Link native chuẩn bị qua raw editor; insertion tự động được kiểm bằng Chromium. Đây không phải kiểm thử bản cài release mới.

254 Markdown có sẵn trong bản sao Library không đổi byte; sessions 5→5, reviews 4→4, schedules 5→5 khớp từng hàng; SQLite integrity `ok`, foreign key check rỗng. Chỉ hai note QA của task được thêm/sửa: [đối chiếu](evidence/F-039-native-preservation.json). Không dùng vault cá nhân hoặc thay HOME/preferences thật.

## Release gates và commit

Full check suite trên Node 24 pass: [lệnh/exit code/thời gian](evidence/F-039-release-checks.json), [log đầy đủ](evidence/F-039-release-checks.zip). Không tăng timeout/retry, không skip/fixme, không bỏ tag hoặc bypass hook.

| Lệnh | Kết quả |
|---|---|
| `pnpm lint` / `pnpm exec tsc -b` | Exit 0 / 0 |
| `pnpm test` | 500 files, 4.976 tests pass |
| `pnpm test:coverage` | 4.976 tests pass; 87,46% dòng, gate ≥70% |
| `cargo test --manifest-path src-tauri/Cargo.toml` | 1.240 unit chính pass, 3 ignored có sẵn; integration pass |
| `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85` | Exit 0; 86,40% dòng |
| `pnpm l10n:validate` | 18 catalog, 1.028 English keys |

Pre-commit chạy changed-file lint, types, **349 related tests** và **cả hai** browser test trong file wikilink; pass ngay lần đầu. `core.hooksPath=.husky/_`; CodeScene không cấu hình. `git push --dry-run origin main` chạy pre-push nguyên trạng: lint/build/coverage pass, **54/54 smoke trong 4,8 phút, 0 flaky**, toàn hook 9 phút 20 giây — [receipt dry-run](evidence/F-039-pre-push-dry-run.txt). Remote vẫn ở `d440a355` sau dry-run, chưa coi đó là push thật. Mã app/test giữ nguyên sau đợt 90/90; amend chỉ chốt tài liệu trong cùng một commit finding.

Push main: `git push origin main`, tiếp tục qua hook nguyên trạng; [receipt local của lần push thật](/tmp/memnova-f039/push.log). Đối chiếu remote bằng `git ls-remote origin refs/heads/main`; hash commit cuối cũng được báo trong kết quả chat.

- Codacy CLI 0.24.0: ESLint9, Semgrep/Opengrep, Trivy không có issue; hai Medium Lizard về số tham số EntityView/ListView có nguyên ở baseline. Không có Critical/High mới; không có analyzer error: [before](evidence/F-039-codacy-before.txt), [after](evidence/F-039-codacy-after.txt), [summary](evidence/F-039-codacy-summary.json). Giữ exclusions của `.codacy.yaml`; các test không được báo là đã được Codacy phân tích.
- CodeScene: not run (optional integration unavailable).
- Localization: no UI copy changes. PostHog: no event needed because sửa identity/render race, không thêm hành động người dùng.
- Refactoring: helper projection nhỏ và key hàng, không đổi storage/IPC/data model; ADRs: none.
- SPEC §8: typography 232→232, CSS `data-slot` 0→0 — [số đếm](evidence/F-039-spec-counts.json); không đổi visual tokens/layout.
- Demo vault dirt checked: rỗng. Docs: ABSTRACTIONS, CURRENT-STATE, FINDINGS và biên bản/bằng chứng F-039.

## Modern Web Guidance

Đã tra `js`, `dynamic-sort`, `move-dom-element-without-losing-state`. Áp dụng identity của hàng theo “Reorder the existing DOM nodes into the new order. Do not recreate them.” Việc di chuyển DOM thuộc React/Virtuoso; dùng API key của thư viện, không gọi `moveBefore()` lên DOM do React quản lý hoặc thêm API chưa hỗ trợ Safari. Không thêm animation, copy hay polyfill; không chạy legacy scan.
