# Build và nghiệm thu bộ cài release

Source của bộ cài là 8e99c7f0 trên main. Build optimized release cho macOS Apple Silicon, version 0.1.0. Tệp giao có tên chứa commit để nhận diện đúng mã nguồn.

## Bộ cài

- DMG ở src-tauri/target/release/deliveries/Memnova-0.1.0-8e99c7f0-mac-arm64.dmg.
- SHA-256 DMG 3b10e238a899ebaa89e4878cc20968a26f6d51c8d1974187f19b4a53bb05485d.
- SHA-256 executable a79c60e6a858b65deb0ba175249db1e86f3c4aebeecc3fbe090de94fab27da5e.
- hdiutil verify đạt. Mount read-only, copy app từ DMG bằng ditto và codesign --verify --deep --strict đạt.
- Identifier net.memnova.app, Mach-O arm64, chữ ký ad hoc runtime, 59 sealed resources.
- Build mặc định ban đầu tạo bundle có chữ ký không hợp lệ. Lượt build lại với signingIdentity "-" đã sửa artifact và được xác minh từ chính DMG.
- Đây là bộ cài local ký ad hoc. Developer ID/notarization và updater signature cần cấu hình phát hành Apple riêng. Build này tắt createUpdaterArtifacts. Chưa tạo GitHub release mới.

Lệnh build đã dùng tại gốc repo.

```sh
pnpm tauri build --bundles app,dmg --config '{"bundle":{"createUpdaterArtifacts":false,"macOS":{"signingIdentity":"-"}}}'
```

## Phạm vi native QA

Preferences com.tolaria.app/com.laputa.app trước thử đều chưa tồn tại. Các thư mục WebKit/cache của định danh production có dữ liệu, nên bản app cài từ DMG được copy sang app QA, chỉ đổi CFBundleIdentifier rồi ký lại. So sánh executable sau khi gỡ chữ ký trên hai bản copy tạm xác nhận code payload giống nhau. Resources giữ nguyên ngoài plist và signature.

Bản QA dùng identifier riêng, sandbox chặn đọc/ghi dữ liệu production và chỉ cấp ghi cho Library thử, preferences do task tạo độc quyền và storage của QA. Không đổi HOME. Release vẫn bỏ qua MEMNOVA_CONFIG_HOME theo ADR-0143. Nghiệm thu toàn bộ luồng trên executable release trong định danh QA, còn bundle định danh production được xác minh mount/copy/chữ ký.

Thử với năm người mới còn cần người tham gia. Báo cáo này ghi kết quả kiểm thử kỹ thuật.


## Sửa lỗi phát hiện ở release

Candidate f3e4a5ca tái hiện lỗi sửa ghi chú, ôn, tạm dừng, về Home rồi Create backup báo note-editor-persistence-unavailable. Receipt thay cấu hình đã ghi file nhưng app autosave còn nguồn chờ khi editor unmount.

Commit 8e99c7f0 chỉ xác nhận lại lần lưu đó nếu get_note_content khớp chính xác nguồn chờ. Nhánh này đọc file và không ghi file. Nguồn khác vẫn yêu cầu canonical writer, lỗi đọc vẫn được truyền lên. Ba regression đã RED rồi GREEN, 46 test liên quan và bốn integration đạt. Ca Home backup xác nhận editor unmount, backup tạo/xác minh được và Markdown khớp snapshot.

Codacy CLI 0.24.0 quét source sửa với ESLint9, Opengrep, Trivy và Lizard. Baseline/final đều 0 finding và 0 analyzer error. Không Critical/High mới. ABSTRACTIONS được cập nhật. Không dependency/schema/ADR/UI copy mới. PostHog không cần event mới cho xử lý retry lưu đã commit. CodeScene: not run (optional integration unavailable).

cargo test --release đạt 1240 unit, 3 ignored, cùng các test khác của workspace. cargo llvm-cov --no-clean --fail-under-lines 85 đạt 86,40% lines. Một lượt doctest chạy chồng với build báo E0463, chạy tuần tự lại đã đạt. Rust source giữ nguyên trong commit sửa frontend.

Lượt test frontend trước sửa đạt 4921 test, 87,40% lines, smoke54/54 nhưng 5,6 phút khi chạy cùng compile. Lượt idle đo lại bị dừng khi native phát hiện lỗi backup để chuyển sang sửa lỗi và kiểm thử source mới. Kết quả gate source sửa được ghi bên dưới sau khi hoàn tất.


## Kết quả dữ liệu trên bản đã sửa

Release 8e99c7f0 đã đi qua tạo/sửa/lưu ghi chú thường, bật học, thêm gợi nhớ, ôn Good, đóng phiên, tạm dừng, về Home tạo backup, Verify và Restore vào thư mục mới. Ca native từng lỗi đã đạt, focus và source được kiểm tra lại.

Backup/restore khớp SHA-256 toàn bộ 89 tệp ngoài database, gồm 87 Markdown, một PNG tổng hợp và một view. Cả 13 bảng SQLite có cùng mọi hàng, gồm ba review, sáu schedule, sáu session và 25 operation. Hai database đều integrity_check=ok, foreign_key_check rỗng. Ghi chú restore mở lại giữ bài viết, gợi nhớ, trạng thái tạm dừng và một lượt ôn của trang vừa thử.

Gate source sửa đạt 4924 test frontend và 87,40% lines. Kết quả native được ghi trên source sửa, Rust tests/coverage áp dụng cùng Rust source của artifact.


Sau restore, lưu trích đoạn URL tạo ghi chú thường với đúng văn bản/liên kết và không tự bật học. Saved View hai ghi chú đến hạn mở đúng phiên, chấm một ghi chú tiến tới 1/2, đóng trả focus và còn một ghi chú đến hạn; bật Due filter hiện đúng một ghi chú.

App QA đã dừng. Preferences được tạo độc quyền đã xoá để khôi phục trạng thái chưa có trước thử, các storage QA đã dọn. Cả 28 tệp production được bảo vệ khớp hash trước/sau. Demo sạch.

Payload SHA-256 sau khi gỡ signature trên hai bản copy so sánh là 87c41d908c72dd48038a65b0fba1a3fc2956072cd150e7c55f41ceadeeb92f70. Năm PNG gốc được lưu và xem lại.

- [Ôn ghi chú](ui/2026-11-16-release-acceptance/note-review.png)
- [Backup đã xác minh](ui/2026-11-16-release-acceptance/backup-verified.png)
- [Mở lại bản restore](ui/2026-11-16-release-acceptance/restored.png)
- [Lưu trích đoạn](ui/2026-11-16-release-acceptance/capture.png)
- [Ôn Saved View](ui/2026-11-16-release-acceptance/view-study.png)

Localization không có thay đổi UI copy trong bản sửa lưu. Refactoring không cần thêm. Bản local này dùng để nghiệm thu kỹ thuật, thử năm người mới vẫn cần người tham gia.

Normal push `8e99c7f0` thành công sau hook 9 phút 46 giây. Gate cuối đạt 4924 test frontend, 87,40% lines, build/lint/types/workflow checks và core smoke 54/54 (Playwright hiển thị 5,0 phút). Locale validation đạt 18 catalog/1011 khóa. CodeScene được ghi not run vì tích hợp tùy chọn chưa cấu hình. Tài liệu và ảnh nghiệm thu được push sau source qua lane docs-only.
