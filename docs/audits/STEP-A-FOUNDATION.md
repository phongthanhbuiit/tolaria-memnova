# Bước A — nền tảng giao diện, 17/11/2026

Phạm vi: F-023, F-025, F-030, F-031, chỉ phần nền tảng được giao trong APP-AUDIT-PLAN. Không sửa mã của bất kỳ màn hình nào, editor typography, luồng sản phẩm, handler, phím tắt hay dữ liệu. Các bước B–D vẫn cần dọn call site, CSS learning và nhãn dùng sai vai trò.

| Finding | Phần nền tảng đã thực hiện |
|---|---|
| F-023 | Sáu bậc chữ chrome + study trong `@theme inline`, dùng rem quy đổi theo root 14px hiện có và line-height không đơn vị. Shared UI dùng tên semantic. `cn` đăng ký các tên font-size với tailwind-merge, tránh mất cỡ chữ khi ghép màu. Regression RED 7/7 → GREEN 7/7. |
| F-025 | Tách các mức chữ sáng; primary/secondary và muted tương thích đạt ≥4.5:1 trên tám bề mặt cả hai theme. Muted tạm thời đọc được vì bước A chưa chuyển nhãn cũ ở từng màn sang secondary. Faint dành cho disabled/placeholder/trang trí; không đổi màu nhấn hay nền. |
| F-030 | Button/Select sm/md/lg và Input controlSize: tối thiểu 28/32/36px, chữ body; icon nút 16px, gap 6px. Giữ alias default/xs/icon-xs và data attributes hiện hữu. Input vẫn nhận native numeric size. Tabs giữ variant hiện hữu, chỉ chuẩn hóa kích thước nền. Control có thể cao thêm khi người dùng tăng text spacing. |
| F-031 | Radius 4/6/8/12px: badge/control/card-popover-menu/dialog. Không đổi bố cục màn hình. |

Hai lệnh nguyên văn SPEC §8, chạy từ gốc repository:

```bash
grep -rnE "text-\[[0-9.]+(px|rem)\]|fontSize:" src --include='*.tsx' --exclude='*.test.*' | wc -l
grep -rnE "\[data-slot=" src --include='*.css' | wc -l
```

| Lệnh | Trước | Sau |
|---|---:|---:|
| Chữ tuỳ ý / inline fontSize | 313 | 309 |
| CSS có `[data-slot=` | 63 | 63 |

Số thứ hai giữ nguyên có chủ ý: gỡ CSS ghi đè thuộc bước C/F-026, bị loại khỏi phạm vi lần này. Bước A khai báo nền tảng nên không thể giảm cả hai số sau mọi commit mà vẫn giữ đúng giới hạn bước. Bốn dòng giảm đều thuộc components/ui (Calendar, ActionTooltip).

## Commit và trạng thái bước A

| Finding | Commit | Trạng thái |
|---|---|---|
| F-023 | `ddbeb0d2` | fixed — nền tảng thang chữ |
| F-025 | `207e1294` | fixed — token màu chữ |
| F-030 | `f8991a15` | fixed — size/variant primitives |
| F-031 | `8dd9f931` | fixed — bo góc primitives |

Mỗi finding một commit mã nguồn. Bốn pre-commit cuối đều đạt lint/types và 4.936 test; không bypass hook. Phạm vi fixed là bước A; các màn hình và CSS learning vẫn chờ B–D. F-039 được ghi mới, chưa sửa.

## Bằng chứng và QA

Mẫu riêng [foundation.html](evidence/foundation.html) chỉ được Vite phục vụ khi mở URL trực tiếp, không được app import. Chạy `pnpm dev --port 5201`, rồi:

```bash
bash ~/.codex/skills/playwright/scripts/playwright_cli.sh -s=memnova-step-a open http://localhost:5201/docs/audits/evidence/foundation.html
bash ~/.codex/skills/playwright/scripts/playwright_cli.sh -s=memnova-step-a run-code "$(cat docs/audits/evidence/verify-foundation.js)"
```

- Ảnh mẫu: [sáng trước](evidence/step-A-light-before.png), [sáng sau](evidence/step-A-light-after.png), [tối trước](evidence/step-A-dark-before.png), [tối sau](evidence/step-A-dark-after.png). Các ảnh F-xxx-before/after là cùng mẫu sáng cho bốn finding nền tảng.
- [Số đo trình duyệt](evidence/step-A-measurements.json): đúng toàn bộ size/line-height/weight của SPEC; Button/Input/Select đồng cỡ 28/32/36; radius 4/6/8/12. 48 phép đo tương phản, thấp nhất 4.60:1. Kiểm tra chuột mở Dialog/Select, chọn option, Esc trả focus, bàn phím Select và chữ 200% kèm text spacing không bị cắt.
- Native debug QA: identifier `net.memnova.qa.foundation`, incognito webview, MEMNOVA_CONFIG_HOME và Library sao chép ở thư mục tạm ngoài source. Dùng computer-use mở Trang chủ/Cài đặt bằng chuột, theme sáng/tối, Esc và ⌘, để mở lại. [Ảnh sáng](evidence/step-A-native-light.png), [ảnh tối](evidence/step-A-native-dark.png). Không chạy thao tác nhập/chuyển đổi dữ liệu học. App QA đã đóng.

## Phân tích và các giới hạn

- Lint, TypeScript (`pnpm exec tsc -b`) và build đạt. `pnpm test` lần chạy lại: 491 file / 4.936 test đạt. Lần đầu có một lỗi timing của preload ở NoteList.rendering; file này chạy riêng lại đạt 58/58, full suite và coverage sau đó đều đạt. Không sửa màn hình hoặc test ngoài phạm vi để xử lý lần thất bại tạm thời này.
- `pnpm test:coverage`: 87,41% lines (83,64% statements, 75,63% branches, 85,23% functions), 4.936 test đạt. `cargo test --manifest-path src-tauri/Cargo.toml`: 1.240 unit test đạt, 3 ignored, integration/doc tests đạt. `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85`: 86,40% lines. Workflow regression `node --test scripts/precommit-checks.test.mjs` đạt.
- Core smoke đầu tiên: 53 passed + 1 flaky (6,2 phút), exit 0. Ca `wikilink-path-fix.spec.ts:65` thất bại khi chạy riêng không retry, và cũng thất bại với cùng triệu chứng trên checkout gốc `f78b8fb9` ở port riêng: sau Cmd+click, H1 đích rỗng thay vì “Manage Sponsorships”. Đây là lỗi đã tái hiện trên baseline; không sửa editor, fixture hoặc timeout trong bước A. Không coi lần chạy có retry này là smoke sạch hoặc đạt mục tiêu dưới 5 phút.

- Codacy Analysis CLI 0.24.0, auto config/SARIF ngoài source: ESLint9 0, Lizard 0, Trivy 0; Semgrep 75 cảnh báo props spreading có sẵn và Stylelint 127 cả baseline lẫn bản sửa, không analyzer error ở lượt phân tích cuối. Năm cảnh báo Minor hex trong chính nơi khai báo token màu thay cho năm cảnh báo cũ tương ứng; không thêm màu hex trong TSX. Không Critical/High mới. Mẫu QA và script kiểm chứng cũng được quét riêng: ESLint9/Semgrep/Lizard/Trivy đều 0 issue. Không upload source/kết quả hay dùng tài khoản Cloud. Lượt baseline đầu thiếu git metadata đã lỗi, được chạy lại sau khi khởi tạo repository tạm.
- CodeScene: not run (optional integration unavailable).
- Localization: no UI copy changes. Không dịch lại; `pnpm l10n:validate` đạt 18 catalog / 1.013 khóa. Copy tiếng Việt trong mẫu QA không được import vào sản phẩm.
- PostHog: no event needed because đây chỉ là chuẩn hóa trình bày, không có hành động người dùng mới.
- Refactoring: chỉ đăng ký token font-size trong helper `cn`, không đổi pipeline editor/storage. ADRs: none. Docs: ARCHITECTURE, CURRENT-STATE và biên bản này.
- Giữ root 14px để không thay đổi cả app. Các font mới dùng rem nên theo root nếu root đổi; browser default font-size vẫn chịu giới hạn root cố định có sẵn, nằm ngoài bước A.
- Modern Web Guidance: `css` yêu cầu custom properties thay giá trị rải rác; `color` yêu cầu chữ thường 4.5:1; `typography` yêu cầu rem, line-height không đơn vị và điều khiển không cắt chữ khi tăng spacing; `accessibility` yêu cầu focus-visible có outline hoạt động khi box-shadow bị hệ thống bỏ. Giữ Radix/shadcn và theme runtime đã cài, không thêm platform API hoặc polyfill.

Demo vault dirt checked: `git status --short -- demo-vault demo-vault-v2` rỗng. Các thay đổi có sẵn của AGENTS.md, skill audit, DESIGN-SPEC và APP-AUDIT-PLAN được giữ nguyên; FINDINGS chỉ cập nhật trạng thái bốn finding và ghi F-039.

## Commit nền tảng

| Finding | Commit |
|---|---|
| F-023 | `ddbeb0d2` |
| F-025 | `207e1294` |
| F-030 | `f8991a15` |
| F-031 | `8dd9f931` |

Các trạng thái `fixed` của bốn finding chỉ xác nhận phạm vi nền tảng bước A. Các màn hình và CSS learning chưa được migrate; bước B–D vẫn giữ nguyên kế hoạch.

## Kết quả pre-push cuối

`git push origin main` đã chạy hook bình thường trên `8dd9f931`. Workflow checks, lint, TypeScript/build và frontend coverage đều đạt: 491 file / 4.936 test, 87,41% lines (83,63% statements, 75,62% branches, 85,23% functions). Rust checks được hook bỏ qua vì không đổi Rust; các lệnh Rust đầy đủ đã chạy riêng và đạt như ghi ở trên. CodeScene không chạy do tích hợp tùy chọn chưa cấu hình.

Core smoke kết thúc **53 passed / 1 failed, 6,0 phút**; ca F-039 cũng thất bại ở retry. Hook chặn push, nên bốn commit mã nguồn và biên bản chỉ nằm ở local main, **chưa push**. [Log pre-push cuối](evidence/F-039-pre-push.txt). Không bypass hook, không hạ assertion/coverage/timeout. Không coi bước này là release-ready; cần xử lý F-039 trong phạm vi riêng rồi chạy lại pre-push.
