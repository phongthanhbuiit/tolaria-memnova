# E1 — Function & copy

Ngày 18/11/2026 · FIX / chế độ đêm · baseline `286fffae` · Node **24.12.0**. Phạm vi: F-001, F-003, F-004, F-017, F-022 và các sót R-01 được chỉ định. Không sửa F-040 hoặc mô hình lưu trữ.

## Cổng an toàn và commit

`git fetch origin && git status --short && git rev-list --count origin/main..HEAD`: **0** commit chưa push khi bắt đầu. Không có `DỪNG HÀNG ĐỢI`. Giữ nguyên AGENTS.md đang sửa và các tài liệu/skill untracked của người dùng; không stage chúng. Hash AGENTS.md được đối chiếu sau khi hoàn tất mã nguồn.

Mỗi finding có một commit riêng, qua hook bình thường:

| Finding | Commit | Thay đổi |
|---|---|---|
| F-001 P1 | `3ce2c128` | Loại đường dẫn `.memnova` khỏi index catalog học, số đến hạn và scope học dẫn xuất. |
| F-003 P1 | `1a262b64` | Dịch nhãn Type/Status/Date/URL/Icon/Belongs to/Related to/Has ở Properties, placeholder và Relationships. |
| F-017 P2 | `5ef69069` | Dịch nhãn loại mặc định; dùng “Chưa sắp xếp” nhất quán cho Inbox tiếng Việt. |
| F-004 P1 | `e8dfc0c2` | Phân biệt “Đưa vào lịch ôn” với “Ôn ngay”, cập nhật hướng dẫn Home. |
| F-022 P3 | `b8351fef` | “Lịch ôn”; “Chỉnh sửa thuộc tính” đúng đích mở trình chỉnh sửa. |
| R-01 bổ sung | `ebec147f` | History/tooltip qua i18n; ba formatter bắt buộc nhận locale tường minh. |
| R-12 test chặn gate | `e2721566` | Đi qua menu overflow và nút Edit mnemonic hiện hành, giữ toàn bộ assertion dữ liệu. |

Để giữ đúng ranh giới commit, các bổ sung kiểm thử được gom lại trên main trong worktree sạch. Hook từ chối detached HEAD đã được tôn trọng; các commit cuối cùng đều được tạo trên main với hook hoạt động. Không stage/ghi đè file người dùng; không dùng `--no-verify`.

## F-001 — nguyên nhân và bảo toàn dữ liệu

Bộ quét vault và tìm kiếm Rust đã bỏ thư mục ẩn. Lỗi nằm ở `useNoteCatalog`: snapshot học giữ các page đã retired để bảo toàn lịch sử, nhưng index danh sách chỉ loại trạng thái ordinary. Vì vậy row deleted/retained vẫn hiện, có thể tìm theo tiêu đề/path và làm tăng số đếm.

`isPublicNotePath` chỉ áp dụng cho dữ liệu dẫn xuất ở catalog, số đến hạn và scope thư mục. Không xóa page/card/binding, không sửa SQLite/storage/sync pipeline, không đọc lại hay ghi file retired trong mã sửa. Khóa danh sách theo path và ảo hóa từ F-039 giữ nguyên. Các hàng thường, thứ tự và dữ liệu nguồn không đổi.

Native QA dùng bản debug riêng identifier `net.memnova.qa.e1`, profile `/tmp/memnova-e1/native/prefs` và Library `/tmp/memnova-e1/native/Library`; không dùng HOME, cấu hình thật hoặc `~/Laputa`. Runner có tên cửa sổ lịch sử “Memnova D2 1440 QA”/display name D4B; Rust production không đổi, chỉ thêm test. Hai Vite checkout lần lượt phục vụ baseline và mã E1 cho cùng runner WKWebView.

Fixture được chuẩn bị một lần trước đối chiếu: thêm một page retired và **một file sentinel mới trong Library QA**, không đụng file retired có sẵn. Sau đó không sửa/xóa/di chuyển sentinel:

- `.memnova/retired/e9a408d0-65fe-4d8e-b6fb-9c3457996834.md`
- SHA-256 trước/sau: `e8a49f0aa03e41beffe94c40f9f088a6646aee9f22353cf8c063629b64a0e1a4`.
- Baseline native: **6** hàng, có E1 retired sentinel; tìm catalog “E1 retired” trả **1** hàng nội bộ.
- Sau sửa: **5** hàng người dùng, **2** đến hạn như cũ; catalog không trả sentinel. All Notes vẫn **89**, Inbox **85**, section Note **6**, Responsibility **2**.
- Quick Open bằng ⌘P tìm đúng tiêu đề sentinel: không có ghi chú phù hợp; không kích hoạt tạo ghi chú.
- Tìm nội dung toàn Library bằng ⌘⇧F: `E1-retired-search-sentinel` không có kết quả. Đối chứng `ordinary` trả **20** kết quả, chứng minh tìm kiếm vẫn hoạt động.
- Rust integration: scan chỉ có file thường, search không trả sentinel, đọc byte trước/sau bằng nhau. Test catalog kiểm cả available=false và available=true, số hàng, search, study scope và snapshot bất biến.

[Chi tiết hash và bảng dữ liệu](evidence/E1-data-preservation.json): **259 Markdown** và **2 SQLite backup** không đổi byte, không thêm/mất file trong tập kiểm kê Markdown/SQLite ở giai đoạn QA. [Manifest trước](evidence/E1-file-hashes-before.json), [sau](evidence/E1-file-hashes-after.json). SQLite runtime đổi byte do mở/đóng phiên ôn, nên không gọi toàn bộ DB byte-identical. Cards, schedules, reviews, definitions, bindings, decks, imports và metadata đều giữ nguyên; page control được thêm trước QA (bản snapshot kiểm tra có 11→12 page), sessions vẫn 5 hàng nhưng cập nhật phiên. Sentinel/page retired vẫn tồn tại.

## Copy và hành vi

- Chỉ dịch nhãn hệ thống đã nhận diện. Khóa frontmatter, giá trị Status, tên loại/thuộc tính tự đặt và tên thư mục thật được giữ nguyên; không dịch/đổi tên thư mục `Library` hoặc `views`. Với tên thuộc tính tùy chỉnh, giữ cách humanize sẵn có, không áp bản dịch hệ thống.
- Sidebar giữ type ID, custom sidebarLabel, tùy chọn hiện tên loại chính xác và thứ tự: sort như trước rồi mới áp nhãn dịch.
- Công tắc vẫn gọi setNoteEnabled; nút ôn vẫn requestStudy đúng một page. Native click “Ôn ngay” mở **UX verification, 1/1**, đóng ở tiến độ 0, không chấm điểm. “Chỉnh sửa thuộc tính” vẫn mở cùng editor; QA hủy mà không lưu.
- Lịch ôn vẫn chỉ đọc. Dịch nhãn không biến schedule thành trường chỉnh sửa.
- History và title `Xem thay đổi của {hash}` theo locale; commit message/hash của người dùng giữ nguyên. Native AX xác nhận heading “Lịch sử” và Help “Xem thay đổi của 9a53468”; heading nằm dưới phần Properties có thể cần cuộn. Test kiểm callback vẫn nhận full hash.
- `relativeDate`, `formatSubtitle`, `formatSearchSubtitle` không còn default locale en. Production call sites đã truyền locale; 13 lời gọi trong test cũ được làm tường minh en, giữ nguyên kỳ vọng định dạng.

**Localization:** dịch trực tiếp, không có tích hợp Lara khả dụng; 18 catalog gồm đủ 16 target của lara.yaml và catalog be-Latn hiện hữu. Source **1.042→1.061** khóa, bảo toàn `{hash}` và các placeholder. Không chèn English fallback vào bản dịch. Chỉ vi đổi cách gọi Inbox, source “Inbox” và các bản dịch đúng nghĩa ở locale khác được giữ.

## TDD và kiểm tra

[Log RED/GREEN](evidence/E1-red-green.txt).

| Phần | RED trước sửa | GREEN tập trung |
|---|---|---|
| F-001 | 3 fail / 16: row retired và scope bị lộ | 16/16; Rust sentinel; Quick Open 15/15 |
| F-003 | 1 fail / 94: nhãn vi còn English | 100/100 |
| F-017 | 1 fail / 121: tên loại chưa dịch; thêm RED heading lệch tên Inbox | 121/121; 91/91 sau bổ sung heading |
| F-004 | 1 fail / 11: chưa phân biệt hai thao tác | 11/11; 40 legacy-toggle tests vẫn kiểm đúng callback/trạng thái |
| F-022 | 2 fail / 7: tên lịch và action editor | 11/11 |
| R-01 | 1 fail / 5: heading/tooltip chưa dịch | 32/32; tsc -b pass |

R-12 là precondition cũ chặn pre-commit sau khi cập nhật nhãn trong smoke: tại 1280×800 mở Properties, nút đổi độ rộng đã ở menu overflow; tab Mnemonic đã được thay bằng Edit mnemonic. Baseline độc lập `286fffae` cũng fail ở cùng locator nút độ rộng với **--retries=0**. Test đi đúng menu/nút hiện hành qua **1/1 trong 8,7s**, giữ mọi assertion YAML opaque, hai mặt, width và save. Không tăng timeout, thêm retry/skip hay sửa app cho R-12. Lượt hook cũ đã tự dùng retry #1/#2 theo config có sẵn và vẫn fail; lượt đối chiếu và GREEN tường minh không retry. Không che việc đó bằng báo “mọi lượt đều no-retry”.

| Cổng | Kết quả cuối |
|---|---|
| Node / lint / types / build | Node 24.12.0; pnpm lint, tsc -b và build exit 0. |
| Frontend | pnpm test: **504 file / 5.018 test pass**. test:coverage của hook cuối cũng 5.018/5.018; **87,50% lines** ≥70%. |
| Rust tests | **1.241 unit + 1 integration pass**, 3 ignored có sẵn, không thêm ignore. |
| Rust coverage | Lệnh đầy đủ `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85 -- --test-threads=1`: **86,41% lines**, exit 0. Hook hiện hữu loại lib/main/menu: **87,42%**, exit 0. |
| Rust lint | cargo clippy -D warnings và cargo fmt --check pass. |
| Browser | Pre-commit F-004: **19/19** integration; F-022: **2/2** integration + **1/1** property smoke. Core pre-push: **54/54**, **4,5 phút**, không dùng retry trong lượt cuối. |
| Localization | pnpm l10n:validate exit 0, 18 catalog / 1.061 English keys. |
| Codacy | CLI 0.24.0 local, project exclusions giữ nguyên: **19→19**, **0 mới**, không Critical/High mới; ESLint9/Trivy 0; Semgrep 2 props-spreading và Lizard 17 complexity có sẵn. Analyzer không lỗi; CLI exit 1 vì baseline warnings, không gọi là 0-issue pass. Medium có sẵn, không nhạy cảm bảo mật, không mở refactor ngoài scope. [Summary](evidence/E1-codacy-summary.json), [baseline SARIF](evidence/E1-codacy-before.sarif), [final SARIF](evidence/E1-codacy-after.sarif). |
| CodeScene | **not run (optional integration unavailable)**; không điểm giả, không đổi ratchet hoặc thay bằng Lizard. |
| SPEC §8 | Grep nguyên văn **1→1**, **0→0**; match fontSize duy nhất là NoteTitleIcon động đã có/được giải trình ở D4A, không sửa typography trong E1. Tất cả file UI chạm ở E1 không thêm match. |
| Dữ liệu / repo | Hash Markdown/retired và bảng học giữ nguyên như trên; demo-vault và demo-vault-v2 không có dirt. AGENTS.md đang sửa giữ nguyên hash; tài liệu/skill private không stage. |
| Push mã | **ebec147f**, `git push origin main` exit 0 qua toàn bộ hook **9m06s**; origin/main khớp. |

[Log push đầy đủ](evidence/E1-prepush-source.txt), [kiểm bổ sung](evidence/E1-release-checks.txt). Lượt push trước đã chủ động dừng trước khi công bố để sửa fixture selection cho đúng kiểu; không dùng kết quả dang dở làm bằng chứng release. Fixture mới dùng `{kind: 'filter', filter: 'all'}`, assertion giữ nguyên; đã qua hook và coverage toàn bộ lượt cuối.

PostHog: không event mới vì đây là sửa hiển thị/copy và lọc metadata, không thêm hành động người dùng; instrumentation toggle/study đang có giữ nguyên. Refactoring: chỉ helper display/visibility nhỏ trong phạm vi; không refactor để giả đạt điểm. ADR/dependency/component/hook/model mới: **không**. Docs: ABSTRACTIONS cập nhật chính sách catalog trong commit F-001; CURRENT-STATE, FINDINGS, báo cáo, log và evidence được cập nhật. Không sửa APP-AUDIT-PLAN/DESIGN-SPEC/OVERNIGHT-RULES của người dùng.


## Ảnh native

1440×900 logical, ảnh Retina, tiếng Việt sáng/tối. Các tấm so sánh ghép ảnh native thật; không dựng lại UI. Cột trái baseline, phải E1. Nút/sidebar có cùng dữ liệu nhưng navigation/selection/search đã được thực hiện để QA. Copy dài có thể xuống dòng theo component hiện hữu; không thay kích thước/layout.

| Finding | Sáng | Tối |
|---|---|---|
| F-001 | [Trước/sau](evidence/F-001-compare.png) | [Trước/sau](evidence/F-001-dark-compare.png) |
| F-003 | [Trước/sau](evidence/F-003-compare.png) | [Trước/sau](evidence/F-003-dark-compare.png) |
| F-004 | [Trước/sau](evidence/F-004-compare.png) | [Trước/sau](evidence/F-004-dark-compare.png) |
| F-017 | [Trước/sau](evidence/F-017-compare.png) | [Trước/sau](evidence/F-017-dark-compare.png) |
| F-022 | [Trước/sau](evidence/F-022-compare.png) | [Trước/sau](evidence/F-022-dark-compare.png) |

Bổ sung: [tìm catalog baseline](evidence/F-001-search-before.png), [sau sửa](evidence/F-001-search-after.png), [Quick Open](evidence/F-001-quick-open-after.png), [tìm nội dung](evidence/F-001-content-search-after.png), [đối chứng dương](evidence/F-001-content-search-control.png), [phiên ôn 1/1](evidence/F-004-review-after.png), [editor thuộc tính](evidence/F-022-editor-after.png), [English sáng](evidence/E1-en-light-after.png), [English tối](evidence/E1-en-dark-after.png). R-01 có ảnh cuộn tới heading History: [sáng](evidence/R-01-E1-compare.png), [tối](evidence/R-01-E1-dark-compare.png); [AX baseline](evidence/E1-history-before-ax.txt) và [AX sau sửa](evidence/E1-history-after-ax.txt) ghi cả tooltip/Help theo hash.

## Câu hỏi cho người dùng — lựa chọn đêm

Không hỏi/chờ duyệt. F-004 có thể dùng cặp “Bật ôn định kỳ / Ôn ghi chú này” hoặc “Đưa vào lịch ôn / Ôn ngay”; đã chọn cặp thứ hai để phân biệt cấu hình lâu dài với hành động tức thời, không đổi lịch/handler. Help Home trích đúng nhãn công tắc.

Giữ nguyên tên thư mục thật `Library`, `views` theo chỉ dẫn mới, dù finding cũ đề xuất ẩn/đổi tên views. Chỉ đổi nhãn synthetic/built-in; không sửa tên file hoặc lưu tên loại dịch vào dữ liệu. Tùy chọn hiện tên loại chính xác vẫn được tôn trọng. Hai copy mới phát hiện ngoài finding gốc được ghi R-11 (open), không mở rộng đêm này: Save trong editor thuộc tính vi và accessible name Close quick open. Đây không phải tuyên bố toàn app đã sạch mọi English.

## Modern Web Guidance

- **`accessibility`**: Tôi giữ liên kết Label/Switch và lấy tên từ cùng bản dịch với chữ hiển thị, đồng thời phân biệt cấu hình lịch với mở phiên ôn, theo “Don't reuse an accessible name across controls with different effects in the same view.” Không thêm API nền tảng mới hoặc thay component shadcn đang hoạt động.
