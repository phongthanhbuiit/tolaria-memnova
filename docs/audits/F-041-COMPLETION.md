# F-041 — WebKit render error sau lưu ghi chú thường

17/11/2026 · HEAD trước sửa `3f0404ffb7f6cf6b1a2bbcfe36927d569d9cdc6e` · Node 24.19.0 · React 19.2.4 / react-virtuoso 4.18.5 / Playwright 1.58.2.

**P1**: WebKit là engine của WKWebView trong app macOS; màn lỗi chặn luồng chính lưu ghi chú → mở Command Palette. Chỉ xử lý F-041, không sửa F-040. Trạng thái: **fixed** (`:/^fix: F-041 stop WebKit note-list update feedback`), một commit duy nhất của finding. Push thật được xác minh ở cuối phiên; receipt local tại `/tmp/memnova-f041/push.log`, kiểm tra remote bằng `git ls-remote origin refs/heads/main`. Đây không phải bản cài release mới.

## Đo lại trên HEAD

Chạy test gốc ở `tests/integration/note-memory-workspace.spec.ts:124-147`, cả hai biến thể, mỗi biến thể 10 lần, một worker, không trace và không retry. **20/20 fail (100%): blank lines 10/10, no blank lines 10/10.** Lỗi xuất hiện ở `openCommandPalette`, sau khi assertion nội dung đã lưu xuống đĩa đạt. Log, snapshot đầy đủ và nguồn chẩn đoán được giữ trong [gói bằng chứng](evidence/F-041-checks.zip).

```sh
MEMNOVA_PLAYWRIGHT_WEBKIT=1 BASE_URL=http://localhost:41751 pnpm exec playwright test \
  --config playwright.integration.config.ts tests/integration/note-memory-workspace.spec.ts \
  --grep 'ordinary note editing retains' --retries=0 --repeat-each=10 \
  --output=/tmp/memnova-f041/first10
```

Các lần khởi động bằng pnpm 11 hoặc URL IPv4 không tới server IPv6 không chạy test, không tính là fail. Đợt đo trên HEAD dùng Node 24/pnpm 10. Trong đợt đo có chạy chẩn đoán bằng route instrumentation riêng, không thay đổi app/test gốc; đợt instrument không được cộng vào tỉ lệ trên.

Không đi nhánh “10/10 pass, đóng nhờ F-039”. Mốc `f78b8fb9` (4/4 fail) là baseline người dùng cung cấp; phiên này không đo lại mốc đó và không dùng nó làm số đo mới. F-039 `95176804` đã có trên HEAD nhưng F-041 vẫn tái hiện 20/20.

## Component và nguyên nhân gốc

Stack đầy đủ: [render + component stack](evidence/F-041-full-stack.txt), [ảnh trước](evidence/F-041-before.png). Chuỗi: `getRootForUpdatedFiber → forceStoreRerender → react-virtuoso` (publish props trong layout effect) `→ VirtualNoteList2 → ListView → NoteListLayout → MainApp`. Mã React tại vị trí ném lỗi là guard **Maximum update depth exceeded**; WebKit `Error.stack` trong overlay không kèm `message`.

`syncDisplayTitle` trong `useEditorSaveWithLinks.ts` gửi cập nhật tiêu đề/H1 bằng `startTransition`. `useVaultLoader.updateEntry` normalize lại metadata và tạo array/object mới mỗi lần updater được React phát lại. Dữ liệu này đi vào Virtuoso, nơi layout effect publish props vào store dùng `useSyncExternalStore`; snapshot mới gây render đồng bộ trong khi transition metadata vẫn được phát lại. Bằng chứng route instrumentation: hàng source liên tục đổi identity ở các mảng metadata, các hàng khác không đổi, thứ tự/kích thước không đổi; mẫu instrument `updateEntry` có hai lời gọi thực; các mẫu instrument Virtuoso riêng có hàng chục lần publish cùng thứ tự. Các mẫu này không phải một trace đồng bộ; đối chiếu mã xác định cơ chế replay. Đây là vòng phản hồi cập nhật, không phải resolver, nội dung marker hay timeout tải note.

[React mô tả việc restart transition khi snapshot external store đổi](https://react.dev/reference/react/useSyncExternalStore). F-039 giữ identity các note **không đổi** và key theo path qua reorder, nhưng source **đang đổi metadata** vẫn có object mới; memo mặc định theo reference không chặn vòng này.

Sửa tối thiểu ở `NoteListViews.tsx`: virtualizer so sánh danh sách path theo thứ tự và ref; hàng lấy entry/callback hiện tại qua renderer context theo path. Metadata thay đổi cập nhật nội dung hàng mà không republish cùng thứ tự; insert/remove/filter/reorder vẫn tới Virtuoso. Giữ `startTransition`, normalization, key path và pipeline lưu. Unit dùng Virtuoso thật xác nhận metadata mới hiển thị trên cùng DOM node và regression F-039 về reorder vẫn đạt.

## RED → GREEN và QA

- Test mới “saving an ordinary note keeps the note list and Command Palette usable” **RED** trước sửa, cùng render error khi mở Palette; **GREEN** sau sửa. Không marker vẫn tái hiện, nên marker không phải điều kiện gốc.
- Hai ca marker cũ giữ nguyên toàn bộ assertion, timeout, fixture, shortcut; chỉ thêm test ở cuối file. Không retry/skip/timeout tăng và không `--no-verify`.
- Sau sửa: đợt đầu **30/30 pass** (10 lần × hai marker + một regression mới), không retry. Đợt bổ sung **40/40 pass** (`--repeat-each=20`, chỉ hai ca marker); tổng marker **60/60 (30 lần/ca), 0 fail**. Lane WebKit workspace/study/properties **10/10 pass**, không retry. [Kết quả máy và phiên bản](evidence/F-041-results.json).
- Native QA riêng `net.memnova.qa.f041`, preferences `/tmp/memnova-f041/native/prefs`, bản sao `demo-vault-v2` tại `/tmp/memnova-f041/native/Library`, incognito. Dùng bản sao binary debug Foundation đã xác minh từ F-039, frontend hiện tại qua localhost:5201; không phải build release mới. Chuột mở All Notes → note thường, sửa → File/Save → View/Command Palette đạt; sửa tiếp → Cmd+S → Cmd+K đạt. [Ảnh sáng](evidence/F-041-after.png), [ảnh tối](evidence/F-041-after-dark.png), [AX chuột](evidence/F-041-native-mouse-palette.txt), [AX bàn phím](evidence/F-041-native-keyboard-palette.txt). Marker còn trên đĩa, không bật learning; không dùng vault/preferences cá nhân. [Bảo toàn](evidence/F-041-native-preservation.json): 32 Markdown có sẵn và 13 bảng SQLite khớp; integrity `ok`, foreign-key check rỗng. Fixture này chưa có schedule/review nên không coi là nghiệm thu lịch sử học native có dữ liệu.

## Release gates

Các lệnh cuối đạt gate: [receipt](evidence/F-041-release-checks.json), [log và artifact](evidence/F-041-checks.zip). Các lượt bị dừng hoặc có lỗi không được coi là pass. Lượt tranh tài nguyên có timeout ở App/mock learning; kiểm riêng hai file đạt 44/44. Lượt một worker chạy đủ 501 file / 4.997 test pass nhưng có một unhandled Radix FocusScope Event sau teardown ở PropertyEditor, nên exit 1. Rust coverage song song gặp timeout probe stdin Codex; chạy tuần tự giữ nguyên test đạt exit 0, 86,40% dòng. Không sửa hoặc bỏ qua các test ngoài F-041. Lượt `pnpm test` cuối dùng mặc định 4 worker sau khi stress browser kết thúc: 501 file / 4.997 test pass, **exit 0, không unhandled error**; coverage một worker cũng sạch.

| Lệnh | Kết quả cuối |
|---|---|
| `pnpm lint` / `pnpm exec tsc -b` | Exit 0 / 0 |
| `pnpm test` | 501 file, 4.997 test pass, exit 0 |
| `pnpm test:coverage` | 4.997 pass; **87,48% dòng**, gate ≥70%, exit 0 |
| `cargo test --manifest-path src-tauri/Cargo.toml` | 1.240 unit chính + integration pass; 3 ignored có sẵn |
| `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1` | **86,40% dòng**, exit 0 |
| `pnpm l10n:validate` | 18 catalog / 1.028 key, exit 0 |

Hooks hoạt động qua `core.hooksPath=.husky/_`; không bypass. Pre-commit trên mã app pass ngay lần đầu: changed-file lint, incremental types, **43 file / 350 related unit** và **5/5 integration WebKit**, không flaky. Amend sau đó chỉ chốt tài liệu/bằng chứng, các blob code/test giữ nguyên. Receipt commit local: `/tmp/memnova-f041/commit.log`; pre-push tiếp tục kiểm build/coverage/core smoke và CodeScene khi cấu hình. Push chỉ được coi là xong khi lệnh thật thành công.

- Codacy CLI 0.24.0: ESLint9, Semgrep/Opengrep, Trivy đều 0 issue; Lizard có hai Medium parameter-count (EntityView/ListView) giống baseline, không phải lỗi bảo mật mới. Không có Critical/High mới hoặc lỗi analyzer trong lượt quét cuối. [So sánh](evidence/F-041-codacy-summary.json). Auto config/SARIF ở `/tmp/memnova-f041`, giữ exclusions; test được kiểm bằng lint/test runner, không tuyên bố Codacy đã quét test bị exclude.
- CodeScene: not run (optional integration unavailable).
- Localization: no UI copy changes; `pnpm l10n:validate` pass, 18 catalog / 1.028 key.
- PostHog: no event needed because sửa render feedback, không thêm hành động người dùng.
- Refactoring: renderer context theo path trong component hiện có; không cần refactor thêm để qua CodeScene. ADRs: none. Docs: ABSTRACTIONS, CURRENT-STATE, FINDINGS và biên bản này.
- SPEC §8: typography 232→232, CSS `data-slot` 0→0. Áp dụng `interface-design` chỉ để giữ token/trạng thái hiện có; không đổi layout/typography/style.
- Demo vault dirt checked: `git status --short -- demo-vault demo-vault-v2` rỗng. Thay đổi người dùng trong AGENTS/.agents/audit plan/design spec được giữ ngoài commit.

## Modern Web Guidance

Đã tra “preserve state reordering list”, đọc `dynamic-sort`. Giữ identity theo “Reorder the existing DOM nodes into the new order. Do not recreate them.” React/Virtuoso sở hữu DOM; dùng key path/context và comparator, không gọi `moveBefore()` (Safari chưa hỗ trợ) trực tiếp lên DOM của React, không thêm animation/polyfill.
