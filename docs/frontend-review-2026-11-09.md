# Rà soát frontend FarmTable

Ngày 09/11/2026 · nhánh `feat/v2-fullstack` · mốc trước chỉnh sửa: `1046aca`.

**Cập nhật typography theo yêu cầu tiếp theo:** thay Be Vietnam Pro/Lora bằng Nunito Sans cho toàn giao diện; tiêu đề 700–800, nội dung 400–500. Build thành công, kiểm tra font tiếng Việt tải thật và không tràn ngang trên trang chủ/cửa hàng/Mystery Box/đăng nhập ở 375px và 1440px. Bằng chứng: [font-check.json](ui-review/font-check.json), [desktop font mới](ui-review/font-home-1440.png), [mobile font mới](ui-review/font-home-375.png). Các ảnh `desktop.png`/`mobile.png` bên dưới thuộc lượt đánh giá trước khi đổi font.

## Đánh giá

**Trước: 7/10. Sau tinh chỉnh: khoảng 8,2/10.** Đây là đánh giá thiết kế chủ quan, không phải số đo chuyển đổi hoặc chứng nhận WCAG. Một lượt đánh giá hình ảnh và một lượt kiểm tra kỹ thuật được thực hiện độc lập trước khi tổng hợp.

| Tiêu chí ban đầu | Điểm | Nhận xét |
|---|---:|---|
| Nhận diện nông sản xanh | 7,5/10 | Đã có logo và xanh đậm; Mystery Box tím và mua chung cam tách rời thương hiệu |
| Bố cục, phân cấp | 7/10 | Desktop rõ; trang chủ mobile dài, các nhóm hàng gần như đồng trọng lượng |
| Typography | 6,5/10 | Font hỗ trợ tiếng Việt tốt; metadata/badge mobile có chỗ chỉ 9–11px |
| Màu và icon | 6/10 | SVG, emoji và ký tự biểu tượng dùng lẫn nhau |
| Mobile | 6,5/10 | Header nhiều tầng; danh mục mua hàng mất khi sidebar ẩn |
| Nội dung, độ tin cậy | 6/10 | Một số ảnh không đúng tên hàng; mô tả có lời hứa không được dữ liệu chứng minh |
| Chức năng nhìn thấy | 8/10 | Có lọc hàng, giỏ, tài khoản và dashboard; thiếu vài trạng thái lỗi/phản hồi |

Điểm mạnh được giữ: cấu trúc mua hàng quen thuộc, giá/đơn vị rõ, liên kết nguồn nông trại, thông tin tồn kho và hành động mua có chức năng thật.

## Các vấn đề đã xử lý

| Mức | Vấn đề | Cách sửa |
|---|---|---|
| P1 | Checkout quay tải mãi khi refresh giỏ lỗi | Tách lỗi khỏi loading, có thử lại và khôi phục dữ liệu |
| P2 | Chi tiết sản phẩm bị tràn ngang trên mobile | Giới hạn kích thước tối thiểu của gallery trong grid |
| P2 | Bảng nguyên liệu hộp nhà bán kéo rộng trang | Bao bảng trong vùng cuộn có thể focus và có nhãn |
| P2 | Màu chương trình không thống nhất | Đưa Mystery Box/mua chung về hệ xanh; màu giá và trạng thái vẫn có vai trò riêng |
| P2 | Emoji lẫn SVG trên nhiều trang | Mở rộng sprite chung, cập nhật trạng thái rỗng/lỗi, chứng nhận, vị trí, nút xóa/tải ảnh và dashboard |
| P2 | Menu tài khoản khó dùng bằng bàn phím/mobile | Nhãn truy cập rõ, Escape và click ngoài để đóng, trả focus về nút mở |
| P2 | Hamburger không đóng menu thực sự | Menu mobile có trạng thái đóng/mở nhất quán và nhãn tương ứng |
| P2 | Bộ lọc/trạng thái chiến dịch có thể bị response cũ ghi đè | Chỉ chấp nhận response của yêu cầu mới nhất ở danh sách cửa hàng/mua chung |
| P2 | Chữ phụ và nút mobile nhỏ | Tăng cỡ chữ nội dung quan trọng, vùng bấm và điều chỉnh header |
| P2 | Lỗi form không được liên kết cho trình đọc màn hình | Liên kết error/input ở login, đăng ký, checkout; focus trường sai khi submit; xử lý riêng mật khẩu không khớp |
| P2 | Trang chủ thiếu danh mục trên mobile, nhiều khối dài | Thêm danh mục, giảm nhóm bán chạy từ 10 xuống 5, đưa mua chung vào hàng cuộn trên điện thoại |
| P2 | Ảnh hộp bị làm mờ và dấu hỏi che hàng | Hiện ảnh rõ, dùng nhãn thành phần bất ngờ theo mùa |
| P2 | Hứa số nông trại/giao trong ngày chưa có căn cứ | Đổi hero sang nội dung kết nối nhà vườn và thanh toán COD |
| P2 | Hứa giá trị hộp luôn cao hơn giá bán nhưng dữ liệu mâu thuẫn | Hộp rau 99.000đ có khoảng 90.000–120.000đ; bỏ lời hứa cao hơn, chỉ mô tả khoảng ước tính |
| P3 | Một số giá gạch bỏ không đủ tương phản | Đổi sang màu chữ phụ dùng chung |
| P3 | Liên kết inline chỉ khác màu | Thêm gạch chân ở breadcrumb, ghi chú và đoạn văn |
| P3 | Gallery dùng tab semantics chưa đầy đủ | Dùng nhóm nút có `aria-pressed`, giữ chuyển ảnh bằng bàn phím |
| P3 | Toast chỉ đóng bằng click vào khối | Thêm nút đóng có tên truy cập và focus |
| P3 | Tiến độ mua chung chỉ có hình ảnh | Bổ sung giá trị/nhãn progressbar |
| P3 | Reduced motion tắt mọi thứ bằng 0.01ms | Tắt hiệu ứng không cần thiết theo thành phần |

## Những phần chưa thể coi là hoàn tất để bán thật

1. **Ảnh catalog cần biên tập lại.** Lỗi rõ ràng ban đầu gồm ảnh rùa dưới nước dùng cho “Cá basa tươi sống” và ảnh món gà chế biến dùng cho “Ức gà thả vườn”. Đính chính: sản phẩm “Dưa lưới nứt vỏ giải cứu” đã bị đọc nhầm thành “Dâu” trong nhận xét ảnh trước đó; hình quả dưa phù hợp với loại hàng này. Ảnh cam trầy vẫn chỉ là minh họa; nhiều hàng giải cứu chưa có ảnh thể hiện tình trạng thực tế. Lượt nâng cấp tiếp theo đã biên tập lại ảnh và lưu nguồn trong [storefront-upgrade](storefront-upgrade/README.md); ảnh lô hàng thật vẫn cần nhà bán bổ sung.
2. **Nguồn gốc/chứng nhận.** Các nhãn VietGAP/hữu cơ và câu chuyện nông trại đang dựa trên dữ liệu demo. Cần giấy tờ/đường dẫn kiểm chứng nếu bán thật. Nông trại hiện chủ yếu dùng avatar chữ cái; nên bổ sung ảnh nhà vườn thật khi có dữ liệu.
3. **Đánh giá/lượt bán/hotline vẫn là demo.** Đã giữ thông tin giải thích, không tạo testimonial hoặc số liệu xã hội mới.
4. **Ảnh/font bên ngoài.** Giao diện vẫn phụ thuộc Unsplash, Wikimedia và Google Fonts. Cần lưu trữ ảnh có quyền sử dụng, tối ưu kích thước và quản lý font khi triển khai production.
5. **Biểu mẫu quản trị chuyên sâu.** Lượt này sửa hệ thống hiển thị và các luồng người mua trọng yếu; chưa khẳng định mọi nhánh lỗi của tất cả biểu mẫu nhà bán/quản trị đã đạt WCAG. Chưa thử bằng trình đọc màn hình thật hoặc thiết bị vật lý.
6. **Luồng thanh toán thật.** Chỉ COD có chức năng; các cổng khác vẫn được ghi rõ chưa hỗ trợ. Kiểm tra giao diện không gửi đơn mua mới hoặc thực hiện thay đổi quản trị.

## Kiểm chứng và bằng chứng

Kết quả máy được lưu trong [ui-review/results.json](ui-review/results.json). Các ảnh đại diện: [desktop](ui-review/desktop.png), [mobile](ui-review/mobile.png), [Mystery Box](ui-review/mystery.png).

Kết quả cuối: **26 đường dẫn, 54 tổ hợp trang/viewport; không tràn ngang, không lỗi JavaScript; không còn vi phạm Axe A/AA trong các màn hình đã quét sau kiểm tra bổ sung.** Tám kiểm tra tương tác đã qua. Bảng KPI được kiểm tra bổ sung sau khi thêm vùng focus; bằng chứng trong [final-delta.json](ui-review/final-delta.json). Log thô của lượt chạy trước bổ sung nằm trong [browser-run.json](ui-review/browser-run.json).

Một lần chụp chi tiết sản phẩm còn 8 request ảnh bên ngoài chưa hoàn tất sau 12 giây; không tính chúng là ảnh tải lỗi đã kết thúc. Cần xử lý lưu trữ ảnh khi triển khai thực tế. Một lượt build gặp thiếu bộ nhớ máy; build cuối đã thành công khi giới hạn worker bằng `NG_BUILD_MAX_WORKERS=2` và `GOMAXPROCS=2`.

- Production build: `cd client; npm run build`.
- Kiểm tra trình duyệt Edge headless, viewport giả lập 375/768/900/1440px; kiểm tra toàn trang với người mua, nhà bán và quản trị.
- Kiểm tra menu, Escape/focus, bộ lọc/URL, validation, giỏ khách có sản phẩm, checkout lỗi mạng và thử lại. Không tạo tài khoản hoặc gửi đơn hàng trong bài kiểm tra.
- Axe kiểm tra nhóm quy tắc WCAG A/AA có thể tự động hóa. Kết quả không thay thế kiểm tra WCAG thủ công.
- Impeccable source detector trả `[]`; các lỗi Angular template và lỗi nội dung vẫn được kiểm tra riêng.

## Hướng hiện đại được chọn

Dùng ảnh thực phẩm rõ, bảng màu tự nhiên, chữ dễ đọc và khoảng thở. Phù hợp với hướng trở về tự nhiên và sản phẩm được ưu tiên trong [Shopify: thiết kế ecommerce 2026](https://www.shopify.com/blog/11863377-30-beautiful-and-creative-ecommerce-website-designs) và [Shopify: xu hướng UX](https://www.shopify.com/uk/blog/ux-design-trends). Không dùng glass, gradient chữ, ảnh giả làm nông trại thật, animation hàng loạt hoặc tuyên bố xanh/sạch thiếu bằng chứng.

Quy tắc duy trì giao diện: [client/DESIGN.md](../client/DESIGN.md).

Questions skipped: Người dùng đã yêu cầu tự chọn hướng sửa và thực hiện; không cần thêm vòng duyệt thiết kế.
