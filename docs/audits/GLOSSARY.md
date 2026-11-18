# Thuật ngữ tiếng Việt của Memnova

| Khái niệm | Thuật ngữ UI |
|---|---|
| Note hoặc page trong mô hình ghi chú | Ghi chú |
| Review theo lịch | Ôn tập trong danh từ, ôn trong cụm hành động |
| Tính năng note memory | Ghi nhớ |
| Mnemonic | Gợi nhớ |
| Flashcard | Thẻ |

## F-007 — Đối chiếu vi.json

Baseline `68dc3bb8` → commit F-007 `25fdd409`. Bảng gồm **201 key**, với **28 giá trị đổi**. Lấy hợp các giá trị trước/sau chứa thuật ngữ tiếng Việt hoặc cách gọi cũ, các giá trị đối chiếu có thuật ngữ nguồn tiếng Anh, và mọi giá trị đã sửa. Giữ **Trang chủ** cho Home, dùng **gợi nhớ** cho nội dung hỗ trợ nhớ và giữ cách dịch **kiểm tra** khi review mang nghĩa xem xét. Các mục thẻ dùng cho tag cũng được liệt kê để kiểm ngữ cảnh. Số lượng key và placeholder giữ nguyên.

| Key trong vi.json | Trước | Sau |
|---|---|---|
| `learning.libraryWritingHelp` | Viết như bình thường. Khi muốn học một ghi chú, mở Thuộc tính và bật “Đưa vào lịch ôn”. | Viết như bình thường. Khi muốn ôn một ghi chú, mở Thuộc tính và bật “Đưa vào lịch ôn”. |
| `capture.open` | Mở ghi chú | Mở ghi chú |
| `capture.description` | Lưu trích đoạn và nguồn vào một ghi chú mới. | Lưu trích đoạn và nguồn vào một ghi chú mới. |
| `capture.noteSource` | Ghi chú nguồn: {title} | Ghi chú nguồn: {title} |
| `learning.noteMemory.studyViewDue` | Ôn ghi chú đến hạn ({n}) | Ôn ghi chú đến hạn ({n}) |
| `command.group.note` | Ghi chú | Ghi chú |
| `command.navigation.searchNotes` | Tìm ghi chú | Tìm ghi chú |
| `command.navigation.goAllNotes` | Đi tới tất cả ghi chú | Đi tới tất cả ghi chú |
| `command.navigation.showOpenNotes` | Hiển thị ghi chú đang mở | Hiển thị ghi chú đang mở |
| `command.navigation.showArchivedNotes` | Hiển thị ghi chú đã lưu trữ | Hiển thị ghi chú đã lưu trữ |
| `command.note.newNote` | Ghi chú mới | Ghi chú mới |
| `command.note.newNoteInCurrentFolder` | Tạo ghi chú mới trong thư mục hiện tại | Tạo ghi chú mới trong thư mục hiện tại |
| `command.note.saveNote` | Lưu ghi chú | Lưu ghi chú |
| `command.note.findInNote` | Tìm trong ghi chú | Tìm trong ghi chú |
| `command.note.replaceInNote` | Thay thế trong ghi chú | Thay thế trong ghi chú |
| `command.note.deleteNote` | Xóa ghi chú | Xóa ghi chú |
| `command.note.archiveNote` | Lưu trữ ghi chú | Lưu trữ ghi chú |
| `command.note.unarchiveNote` | Bỏ lưu trữ ghi chú | Bỏ lưu trữ ghi chú |
| `command.note.restoreDeleted` | Khôi phục ghi chú đã xóa | Khôi phục ghi chú đã xóa |
| `command.note.setIcon` | Đặt biểu tượng ghi chú | Đặt biểu tượng ghi chú |
| `command.note.removeIcon` | Xóa biểu tượng ghi chú | Xóa biểu tượng ghi chú |
| `command.note.changeType` | Đổi loại ghi chú… | Đổi loại ghi chú… |
| `command.note.moveToFolder` | Di chuyển ghi chú vào thư mục… | Di chuyển ghi chú vào thư mục… |
| `command.note.exportPdf` | Xuất ghi chú dưới dạng PDF | Xuất ghi chú dưới dạng PDF |
| `command.view.editorNoteList` | Trình soạn thảo + danh sách ghi chú | Trình soạn thảo + danh sách ghi chú |
| `command.view.noteWidthNormal` | Sử dụng độ rộng ghi chú bình thường | Sử dụng độ rộng ghi chú bình thường |
| `command.view.noteWidthWide` | Sử dụng độ rộng ghi chú rộng | Sử dụng độ rộng ghi chú rộng |
| `command.view.defaultNoteWidthNormal` | Dùng chiều rộng ghi chú chuẩn theo mặc định | Dùng chiều rộng ghi chú chuẩn theo mặc định |
| `command.view.defaultNoteWidthWide` | Dùng chiều rộng ghi chú rộng theo mặc định | Dùng chiều rộng ghi chú rộng theo mặc định |
| `command.view.leftLayout` | Dùng bố cục ghi chú căn trái | Dùng bố cục ghi chú căn trái |
| `command.view.centerLayout` | Dùng bố cục ghi chú căn giữa | Dùng bố cục ghi chú căn giữa |
| `settings.workspaces.labelTooltip` | Tên viết tắt xuất hiện trên ghi chú, kết quả tìm kiếm, đường dẫn điều hướng và nhãn thư viện. | Tên viết tắt xuất hiện trên ghi chú, kết quả tìm kiếm, đường dẫn điều hướng và nhãn thư viện. |
| `settings.titles.description` | Chọn xem Tolaria có tự động đồng bộ tên tệp của ghi chú chưa đặt tên từ tiêu đề H1 đầu tiên hay không. | Chọn xem Tolaria có tự động đồng bộ tên tệp của ghi chú chưa đặt tên từ tiêu đề H1 đầu tiên hay không. |
| `settings.titles.autoRename` | Tự đổi tên ghi chú chưa đặt tên từ H1 đầu tiên | Tự đổi tên ghi chú chưa đặt tên từ H1 đầu tiên |
| `settings.titles.autoRenameDescription` | Khi bật, Tolaria sẽ đổi tên tệp ghi chú chưa đặt tên ngay khi H1 đầu tiên trở thành tiêu đề thật. Tắt tùy chọn này nếu bạn muốn giữ nguyên tên tệp cho đến khi tự đổi thủ công từ thanh breadcrumb. | Khi bật, Tolaria sẽ đổi tên tệp ghi chú chưa đặt tên ngay khi H1 đầu tiên trở thành tiêu đề thật. Tắt tùy chọn này nếu bạn muốn giữ nguyên tên tệp cho đến khi tự đổi thủ công từ thanh breadcrumb. |
| `settings.noteWidth.default` | Chiều rộng ghi chú mặc định | Chiều rộng ghi chú mặc định |
| `settings.noteWidth.defaultDescription` | Chọn độ rộng trình soạn thảo định dạng cho các ghi chú không có độ rộng ghi chú được chỉ định rõ ràng. | Chọn độ rộng trình soạn thảo định dạng cho các ghi chú không có độ rộng ghi chú được chỉ định rõ ràng. |
| `settings.vaultContent.hideGitignoredDescription` | Giữ các tệp kho được tạo sinh và chỉ dùng cục bộ ra khỏi ghi chú, tìm kiếm, mở nhanh và danh sách thư mục. | Giữ các tệp kho được tạo sinh và chỉ dùng cục bộ ra khỏi ghi chú, tìm kiếm, mở nhanh và danh sách thư mục. |
| `settings.allNotesVisibility.title` | Hiển thị trong Tất cả ghi chú | Hiển thị trong Tất cả ghi chú |
| `settings.allNotesVisibility.description` | Chọn loại tệp ngoài Markdown sẽ xuất hiện trong Tất cả ghi chú. Các tệp vẫn hiển thị trong thư mục tương ứng khi duyệt. | Chọn loại tệp ngoài Markdown sẽ xuất hiện trong Tất cả ghi chú. Các tệp vẫn hiển thị trong thư mục tương ứng khi duyệt. |
| `settings.allNotesVisibility.pdfsDescription` | Hiển thị các tệp PDF trong All Notes. Khi duyệt thư mục, các tệp PDF vẫn được hiển thị trong thư mục tương ứng. | Hiển thị các tệp PDF trong All Notes. Khi duyệt thư mục, các tệp PDF vẫn được hiển thị trong thư mục tương ứng. |
| `settings.allNotesVisibility.imagesDescription` | Hiển thị các tệp hình ảnh phổ biến trong All Notes. Khi duyệt thư mục, các tệp này vẫn được hiển thị trong thư mục tương ứng. | Hiển thị các tệp hình ảnh phổ biến trong All Notes. Khi duyệt thư mục, các tệp này vẫn được hiển thị trong thư mục tương ứng. |
| `settings.allNotesVisibility.unsupportedDescription` | Hiển thị các tệp không phải Markdown khác không có chế độ xem trước trong ứng dụng trong mục Tất cả ghi chú. Khi duyệt thư mục, các tệp này vẫn hiển thị trong thư mục tương ứng. | Hiển thị các tệp không phải Markdown khác không có chế độ xem trước trong ứng dụng trong mục Tất cả ghi chú. Khi duyệt thư mục, các tệp này vẫn hiển thị trong thư mục tương ứng. |
| `settings.aiProviders.description` | Thêm các mô hình cục bộ hoặc được hỗ trợ bởi API. Các mục tiêu này hiện có thể trả lời từ ngữ cảnh ghi chú; việc chỉnh sửa dựa trên công cụ vẫn thuộc về các tác tử cục bộ. | Thêm các mô hình cục bộ hoặc được hỗ trợ bởi API. Các mục tiêu này hiện có thể trả lời từ ngữ cảnh ghi chú; việc chỉnh sửa dựa trên công cụ vẫn thuộc về các tác tử cục bộ. |
| `settings.workflow.explicit` | Sắp xếp ghi chú rõ ràng | Sắp xếp ghi chú rõ ràng |
| `settings.workflow.explicitDescription` | Khi bật, phần Chưa sắp xếp sẽ hiển thị các ghi chú chưa được sắp xếp và có một công tắc để đánh dấu ghi chú đã được sắp xếp. | Khi bật, phần Chưa sắp xếp sẽ hiển thị các ghi chú chưa được sắp xếp và có một công tắc để đánh dấu ghi chú đã được sắp xếp. |
| `settings.workflow.autoAdvanceDescription` | Khi bật, việc đánh dấu một ghi chú trong Chưa sắp xếp là đã sắp xếp sẽ mở ngay ghi chú tiếp theo đang hiển thị. | Khi bật, việc đánh dấu một ghi chú trong Chưa sắp xếp là đã sắp xếp sẽ mở ngay ghi chú tiếp theo đang hiển thị. |
| `settings.privacy.description` | Dữ liệu ẩn danh giúp chúng tôi sửa lỗi và cải thiện Tolaria. Không bao giờ gửi nội dung kho, tiêu đề ghi chú hay đường dẫn tệp. | Dữ liệu ẩn danh giúp chúng tôi sửa lỗi và cải thiện Tolaria. Không bao giờ gửi nội dung kho, tiêu đề ghi chú hay đường dẫn tệp. |
| `customize.templatePlaceholder` | Mẫu Markdown cho ghi chú mới thuộc loại này… | Mẫu Markdown cho ghi chú mới thuộc loại này… |
| `ai.panel.mode.chatDescription` | Chế độ trò chuyện có thể sử dụng ngữ cảnh ghi chú, nhưng không có quyền truy cập các công cụ ghi vào vault hoặc quyền truy cập shell. | Chế độ trò chuyện có thể sử dụng ngữ cảnh ghi chú, nhưng không có quyền truy cập các công cụ ghi vào vault hoặc quyền truy cập shell. |
| `ai.panel.empty.noContextTitle` | Mở ghi chú rồi đặt câu hỏi cho {agent} | Mở ghi chú rồi đặt câu hỏi cho {agent} |
| `ai.panel.empty.noContextDescription` | AI sẽ dùng ghi chú đang mở làm ngữ cảnh | AI sẽ dùng ghi chú đang mở làm ngữ cảnh |
| `save.error.invalidPath` | Không lưu được vì đường dẫn ghi chú không hợp lệ trên nền tảng này. Đổi tên hoặc di chuyển ghi chú rồi thử lại. | Không lưu được vì đường dẫn ghi chú không hợp lệ trên nền tảng này. Đổi tên hoặc di chuyển ghi chú rồi thử lại. |
| `sidebar.nav.allNotes` | Tất cả ghi chú | Tất cả ghi chú |
| `sidebar.action.renameType` | Đổi tên loại ghi chú… | Đổi tên loại ghi chú… |
| `sidebar.action.deleteType` | Xóa loại ghi chú | Xóa loại ghi chú |
| `noteList.title.notes` | Ghi chú | Ghi chú |
| `noteList.searchPlaceholder` | Tìm ghi chú... | Tìm ghi chú... |
| `noteList.searchAction` | Tìm ghi chú | Tìm ghi chú |
| `noteList.quickOpenCreate` | Tạo ghi chú "{title}" | Tạo ghi chú "{title}" |
| `noteList.createNote` | Tạo ghi chú mới | Tạo ghi chú mới |
| `noteList.empty.noArchived` | Không có ghi chú đã lưu trữ | Không có ghi chú đã lưu trữ |
| `noteList.empty.noMatching` | Không có ghi chú phù hợp | Không có ghi chú phù hợp |
| `noteList.empty.allOrganized` | Tất cả ghi chú đã được sắp xếp | Tất cả ghi chú đã được sắp xếp |
| `noteList.empty.noNotes` | Không tìm thấy ghi chú nào | Không tìm thấy ghi chú nào |
| `noteList.properties.customizeAllColumns` | Tùy chỉnh các cột của Tất cả ghi chú | Tùy chỉnh các cột của Tất cả ghi chú |
| `noteList.properties.showInNoteList` | Hiển thị trong danh sách ghi chú | Hiển thị trong danh sách ghi chú |
| `noteList.properties.searchLabel` | Tìm thuộc tính danh sách ghi chú | Tìm thuộc tính danh sách ghi chú |
| `noteList.changes.restoreNote` | Khôi phục ghi chú | Khôi phục ghi chú |
| `editor.empty.selectNote` | Chọn một ghi chú để bắt đầu chỉnh sửa | Chọn một ghi chú để bắt đầu chỉnh sửa |
| `editor.toolbar.noteWidthNormal` | Chuyển sang độ rộng ghi chú bình thường | Chuyển sang độ rộng ghi chú bình thường |
| `editor.toolbar.noteWidthWide` | Chuyển sang độ rộng ghi chú rộng | Chuyển sang độ rộng ghi chú rộng |
| `editor.toolbar.centerLayout` | Chuyển sang bố cục ghi chú căn giữa | Chuyển sang bố cục ghi chú căn giữa |
| `editor.toolbar.leftLayout` | Chuyển sang bố cục ghi chú căn trái | Chuyển sang bố cục ghi chú căn trái |
| `editor.toolbar.markUnorganized` | Đặt ghi chú là chưa sắp xếp | Đặt ghi chú là chưa sắp xếp |
| `editor.toolbar.markOrganized` | Đặt ghi chú là đã sắp xếp | Đặt ghi chú là đã sắp xếp |
| `editor.toolbar.openNeighborhood` | Mở vùng lân cận của ghi chú | Mở vùng lân cận của ghi chú |
| `editor.toolbar.restoreArchived` | Khôi phục ghi chú đã lưu trữ này | Khôi phục ghi chú đã lưu trữ này |
| `editor.toolbar.archive` | Lưu trữ ghi chú này | Lưu trữ ghi chú này |
| `editor.toolbar.delete` | Xóa ghi chú này | Xóa ghi chú này |
| `editor.toolbar.copyNoteDeepLink` | Sao chép liên kết sâu của ghi chú | Sao chép liên kết sâu của ghi chú |
| `editor.toolbar.exportPdf` | Xuất ghi chú dưới dạng PDF | Xuất ghi chú dưới dạng PDF |
| `editor.toolbar.moreActions` | Thêm hành động ghi chú | Thêm hành động ghi chú |
| `editor.exportPdf.unavailable` | Mở ghi chú Markdown trước khi xuất PDF. | Mở ghi chú Markdown trước khi xuất PDF. |
| `tableOfContents.empty` | Không có tiêu đề trong ghi chú này | Không có tiêu đề trong ghi chú này |
| `tableOfContents.emptyNoNote` | Chưa chọn ghi chú nào | Chưa chọn ghi chú nào |
| `editor.banner.conflict` | Ghi chú này có xung đột hợp nhất | Ghi chú này có xung đột hợp nhất |
| `inspector.empty.noNoteSelected` | Chưa chọn ghi chú nào | Chưa chọn ghi chú nào |
| `inspector.empty.noProperties` | Ghi chú này vẫn chưa có thuộc tính | Ghi chú này vẫn chưa có thuộc tính |
| `inspector.relationship.noteTitle` | Tiêu đề ghi chú | Tiêu đề ghi chú |
| `update.releaseNotes` | Ghi chú phát hành | Ghi chú phát hành |
| `workspace.manager.description` | Chỉnh sửa thông tin nhận dạng của kho và chọn vị trí mặc định cho các ghi chú mới. | Chỉnh sửa thông tin nhận dạng của kho và chọn vị trí mặc định cho các ghi chú mới. |
| `decks.empty_search` | Không tìm thấy bộ thẻ phù hợp. | Không tìm thấy bộ thẻ phù hợp. |
| `decks.filter.done` | Đã ôn đủ | Đã ôn đủ |
| `decks.search_placeholder` | Tìm bộ thẻ… | Tìm bộ thẻ… |
| `sidebar.nav.home` | Trang chủ | Trang chủ |
| `sidebar.nav.decks` | Ôn tập | Ôn tập |
| `home.subtitle` | Thư viện và tiến độ học tập của bạn. | Thư viện và tiến độ học tập của bạn. |
| `home.due_cards` | {n} thẻ đến hạn hôm nay | {n} thẻ đến hạn hôm nay |
| `home.all_caught_up` | Đã ôn xong! | Đã ôn xong! |
| `home.streak_advice` | Ôn ngay để duy trì chuỗi ngày học. | Ôn ngay để duy trì chuỗi ngày học. |
| `home.all_reviewed_advice` | Bạn đã hoàn thành lịch ôn hôm nay. | Bạn đã hoàn thành lịch ôn hôm nay. |
| `home.start_review` | Bắt đầu ôn | Bắt đầu ôn |
| `home.view_decks` | Xem bộ thẻ | Xem bộ thẻ |
| `home.reviewed` | Đã ôn | Đã ôn |
| `home.heatmap_desc` | Hoạt động ôn tập trong 6 tháng qua | Hoạt động ôn tập trong 6 tháng qua |
| `home.heatmap_tooltip` | {date}: {n} lượt ôn | {date}: {n} lượt ôn |
| `home.daily_goal_reviews` | {n} lượt ôn | {n} lượt ôn |
| `decks.title` | Bộ thẻ | Bộ thẻ |
| `decks.subtitle` | Quản lý và học các bài trong thư viện | Quản lý và học các bài trong thư viện |
| `decks.cards_count` | {n} thẻ | {n} thẻ |
| `decks.empty` | Chưa có bộ thẻ. Hãy thêm thẻ vào một bài học. | Chưa có bộ thẻ. Hãy thêm thẻ vào một bài học. |
| `decks.study_deck` | Học bộ thẻ | Học bộ thẻ |
| `learning.cards` | Thẻ ghi nhớ | Thẻ |
| `learning.pageAnswer` | Dùng toàn bộ trang làm câu trả lời | Dùng toàn bộ ghi chú làm câu trả lời |
| `learning.addCard` | Thêm thẻ | Thêm thẻ |
| `learning.prepareHelp` | Ứng dụng tạo và kiểm tra bản sao lưu trước khi nhập bài và dữ liệu học cũ. Lịch ôn hiện tại được giữ nguyên. | Ứng dụng tạo và kiểm tra bản sao lưu trước khi nhập ghi chú và dữ liệu học cũ. Lịch ôn hiện tại được giữ nguyên. |
| `learning.empty` | Chưa có thẻ. Hãy thêm câu hỏi để bắt đầu. | Chưa có thẻ. Hãy thêm câu hỏi để bắt đầu. |
| `learning.questionHelp` | Mỗi thẻ có lịch ôn riêng. | Mỗi thẻ có lịch ôn riêng. |
| `welcome.subtitle` | Biến từng trang bài học thành kiến thức lâu dài. | Biến ghi chú học tập thành kiến thức lâu dài. |
| `welcome.createHelp` | Lưu bài học và tiến độ ôn tập trong một thư mục trên thiết bị này. | Lưu bài học và tiến độ ôn tập trong một thư mục trên thiết bị này. |
| `learning.cardType` | Loại thẻ | Loại thẻ |
| `learning.editCard` | Sửa thẻ | Sửa thẻ |
| `learning.wholePage` | Câu trả lời là toàn bộ trang | Câu trả lời là toàn bộ ghi chú |
| `learning.answerCurrent` | Dùng trang hiện tại | Dùng ghi chú hiện tại |
| `learning.answerOther` | Chọn bài khác | Chọn ghi chú khác |
| `learning.sourcePage` | Trang đáp án | Ghi chú chứa đáp án |
| `learning.sourceUnavailable` | Trang đáp án không còn khả dụng. Hãy chọn bài khác hoặc khôi phục nguồn. | Ghi chú chứa đáp án không còn khả dụng. Hãy chọn ghi chú khác hoặc khôi phục nguồn. |
| `properties.kind.tags` | Thẻ | Thẻ |
| `properties.kind.page` | Liên kết trang | Liên kết ghi chú |
| `properties.kind.list-page` | Các liên kết trang | Các liên kết ghi chú |
| `properties.card` | Thuộc tính của thẻ | Thuộc tính của thẻ |
| `properties.pageChanged` | Trang đã thay đổi. Mở lại thuộc tính trước khi lưu. | Ghi chú đã thay đổi. Mở lại thuộc tính trước khi lưu. |
| `properties.memory` | Lịch ôn | Lịch ôn |
| `properties.due` | Lần ôn tiếp theo | Lần ôn tiếp theo |
| `properties.reps` | Lượt ôn | Lượt ôn |
| `properties.invalidValue` | Nhập giá trị hợp lệ hoặc chọn trang trước khi lưu. | Nhập giá trị hợp lệ hoặc chọn ghi chú trước khi lưu. |
| `learning.noteMemory.title` | Chuyển đổi học thuộc trang | Chuyển đổi sang Ghi nhớ |
| `learning.noteMemory.help` | Chọn bài viết, gợi nhớ và lịch sử học. Các thẻ cũ khác vẫn được giữ. | Chọn bài viết, gợi nhớ và lịch sử ôn tập. Các thẻ cũ khác vẫn được giữ. |
| `learning.noteMemory.mnemonic` | Gợi nhớ | Gợi nhớ |
| `learning.noteMemory.showMnemonic` | Xem gợi nhớ | Xem gợi nhớ |
| `learning.noteMemory.mnemonicSource` | Nguồn gợi nhớ | Nguồn gợi nhớ |
| `learning.noteMemory.history` | Lịch sử học | Lịch sử ôn tập |
| `learning.noteMemory.fromNote` | Từ ghi chú | Từ ghi chú |
| `learning.noteMemory.oldCard` | Thẻ cũ {n} | Thẻ cũ {n} |
| `learning.noteMemory.keepHistory` | Giữ lịch học cũ | Giữ lịch ôn cũ |
| `learning.noteMemory.freshHistory` | Bắt đầu lịch mới; giữ thẻ cũ | Bắt đầu lịch ôn mới và giữ thẻ cũ |
| `learning.noteMemory.sameGoal` | Thẻ này tương ứng cùng nội dung cần ghi nhớ | Thẻ này có cùng nội dung cần học |
| `learning.noteMemory.apply` | Chuyển đổi ghi chú | Chuyển đổi ghi chú |
| `learning.noteMemory.currentNote` | Ghi chú hiện tại | Ghi chú hiện tại |
| `learning.noteMemory.legacyData` | Dữ liệu thẻ trước chuyển đổi | Dữ liệu thẻ trước chuyển đổi |
| `learning.noteMemory.empty` | Không có ghi chú cần chuyển đổi. | Không có ghi chú cần chuyển đổi. |
| `learning.noteMemory.keptCards` | Số thẻ cũ được giữ: {count} | Số thẻ cũ được giữ: {count} |
| `learning.noteMemory.converted` | Đã chuyển đổi ghi chú | Đã chuyển đổi ghi chú |
| `learning.noteMemory.reviewSource` | Kiểm tra nguồn hoặc tạm dừng phiên học của trang trước khi chuyển đổi. | Kiểm tra nguồn hoặc tạm dừng phiên ôn của ghi chú trước khi chuyển đổi. |
| `learning.noteMemory.missingMnemonic` | Chưa có gợi nhớ. Hãy thêm trong trình soạn ghi chú. | Chưa có gợi nhớ. Hãy thêm trong trình soạn ghi chú. |
| `editor.noteMemory.noteTab` | Ghi chú | Ghi chú |
| `editor.noteMemory.mnemonicTab` | Gợi nhớ | Gợi nhớ |
| `editor.noteMemory.studyTab` | Ôn tập | Ôn tập |
| `editor.noteMemory.addMnemonic` | Thêm gợi nhớ | Thêm gợi nhớ |
| `editor.noteMemory.mnemonicHelp` | Thêm chữ hoặc hình ảnh để gợi nhớ bài viết. | Thêm chữ hoặc hình ảnh để gợi nhớ bài viết. |
| `editor.noteMemory.localMnemonic` | Gợi nhớ trong ghi chú | Gợi nhớ trong ghi chú |
| `editor.noteMemory.backUnavailable` | Chỉ có thể dùng mặt bài viết. Nguồn chưa có gợi nhớ cục bộ hoặc mặt gợi nhớ của nguồn đang liên kết tới ghi chú khác. | Chỉ có thể dùng mặt bài viết. Nguồn chưa có gợi nhớ cục bộ hoặc mặt gợi nhớ của nguồn đang liên kết tới ghi chú khác. |
| `editor.noteMemory.useLocal` | Dùng gợi nhớ trong ghi chú | Dùng gợi nhớ trong ghi chú |
| `editor.noteMemory.deleteConfirmation` | Xóa vĩnh viễn các ghi chú đã chọn và mặt gợi nhớ bên trong? Ghi chú nguồn liên kết và tệp đính kèm ngoài các tệp đã chọn được giữ lại. Không thể hoàn tác. | Xóa vĩnh viễn các ghi chú đã chọn và mặt gợi nhớ bên trong? Ghi chú nguồn liên kết và tệp đính kèm ngoài các tệp đã chọn được giữ lại. Không thể hoàn tác. |
| `editor.noteMemory.deleteFolderConfirmation` | Xóa vĩnh viễn thư mục này, các thư mục con, ghi chú, mặt gợi nhớ bên trong và tệp khác? Nguồn liên kết ngoài thư mục được giữ lại. Không thể hoàn tác. | Xóa vĩnh viễn thư mục này, các thư mục con, ghi chú, mặt gợi nhớ bên trong và tệp khác? Nguồn liên kết ngoài thư mục được giữ lại. Không thể hoàn tác. |
| `properties.noNoteMemory` | Ghi chú này chưa có lịch ôn tập. | Ghi chú này chưa có lịch ôn tập. |
| `learning.noteMemory.notes` | Ghi nhớ trang | Ghi nhớ |
| `learning.noteMemory.legacyCards` | Thẻ cũ | Thẻ cũ |
| `learning.noteMemory.enable` | Bật học thuộc | Bật Ghi nhớ |
| `learning.noteMemory.disable` | Tạm dừng học thuộc | Tạm dừng Ghi nhớ |
| `learning.noteMemory.ordinaryHelp` | Đây vẫn là ghi chú thông thường cho đến khi bạn bật học thuộc. | Đây vẫn là ghi chú thông thường cho đến khi bạn bật Ghi nhớ. |
| `learning.noteMemory.enabledHelp` | Bài viết là mặt trước. Thêm chữ hoặc hình ảnh vào mặt gợi nhớ. | Bài viết là mặt trước. Thêm chữ hoặc hình ảnh vào mặt gợi nhớ. |
| `learning.noteMemory.prepareNote` | Chuẩn bị ghi chú này | Chuẩn bị ghi chú này |
| `editor.whiteboard.noVocabulary` | Không tìm thấy ghi chú từ vựng | Không tìm thấy ghi chú từ vựng |
| `learning.noteMemory.management` | Ghi nhớ | Ghi nhớ |
| `learning.noteMemory.pausedHelp` | Gợi nhớ và lịch sử ôn tập vẫn được giữ. Tiếp tục khi bạn muốn học lại. | Gợi nhớ và lịch sử ôn tập vẫn được giữ. Tiếp tục khi bạn muốn ôn lại. |
| `learning.noteMemory.noDue` | Không có ghi chú đến hạn trong thư mục này. | Không có ghi chú đến hạn trong thư mục này. |
| `learning.noteMemory.emptyHelp` | Mở một ghi chú và bật ghi nhớ để thêm vào đây. | Mở một ghi chú và bật Ghi nhớ để thêm ghi chú vào đây. |
| `properties.spacedRepetition` | Đưa vào lịch ôn | Đưa vào lịch ôn |
| `properties.noteMemoryHelp` | Thuộc tính tùy chỉnh không đánh dấu ghi chú đã thuộc và không thay đổi lịch ôn tập. | Thuộc tính tùy chỉnh không đánh dấu ghi chú đã thuộc và không thay đổi lịch ôn tập. |
| `editor.noteMemory.backToNote` | Quay lại ghi chú | Quay lại ghi chú |
| `editor.noteMemory.editMnemonic` | Sửa gợi nhớ | Sửa gợi nhớ |
| `learning.noteMemory.studyThisNote` | Ôn ngay | Ôn ngay |
| `editor.schedule.nextReview` | FSRS: ngày ôn tập tiếp theo | FSRS: ngày ôn tập tiếp theo |
| `editor.schedule.reviewDeck` | Ôn bộ thẻ | Ôn bộ thẻ |
| `editor.schedule.reviewDeckHelp` | Ôn bộ thẻ — học tất cả ghi chú đến hạn trong bộ này | Ôn tất cả ghi chú đến hạn trong bộ thẻ này |
| `editor.schedule.options` | Tùy chọn lịch ôn | Tùy chọn lịch ôn |
| `editor.schedule.thisNote` | Chỉ ghi chú này | Chỉ ghi chú này |
| `editor.schedule.thisNoteHelp` | Bật FSRS cho ghi chú này | Bật FSRS cho ghi chú này |
| `editor.schedule.asDeck` | Lên lịch cho bộ thẻ | Lên lịch cho bộ thẻ |
| `editor.schedule.asDeckHelp` | Bật FSRS cho mọi ghi chú thành viên | Bật FSRS cho mọi ghi chú thành viên |
| `editor.schedule.reviewNoteHelp` | Lên lịch ôn ghi chú theo phương pháp lặp lại ngắt quãng | Lên lịch ôn ghi chú theo phương pháp lặp lại ngắt quãng |
| `editor.schedule.reviewNote` | Lên lịch ôn tập | Lên lịch ôn tập |
| `sidebar.builtIn.Note` | Ghi chú | Ghi chú |
| `a11y.closeTagsMenu` | Đóng menu thẻ | Đóng menu thẻ |
| `a11y.organizeSelection` | Sắp xếp ghi chú đã chọn | Sắp xếp ghi chú đã chọn |
| `a11y.archiveSelection` | Lưu trữ ghi chú đã chọn | Lưu trữ ghi chú đã chọn |
| `a11y.unarchiveSelection` | Bỏ lưu trữ ghi chú đã chọn | Bỏ lưu trữ ghi chú đã chọn |
| `a11y.deleteSelection` | Xóa vĩnh viễn ghi chú đã chọn | Xóa vĩnh viễn ghi chú đã chọn |
| `a11y.addTag` | Thêm thẻ | Thêm thẻ |
