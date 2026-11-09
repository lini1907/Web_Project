# FarmTable — hướng dẫn giao diện

Cập nhật 09/11/2026. Đây là lượt tinh chỉnh hệ thống hiện hữu, giữ logo và các luồng mua hàng. Typography chuyển sang Nunito Sans theo yêu cầu thay font.

## Cảm giác cần tạo

Một cửa hàng nông sản dễ mua, sáng và đáng tin. Rau củ, tên hàng, giá và nguồn nông trại làm nội dung chính. Màu xanh hỗ trợ nhận diện; ảnh và thông tin thật tạo niềm tin.

## Màu và chữ

Các token dùng chung nằm trong `src/styles.css`:

| Vai trò | Token | Giá trị |
|---|---|---|
| Hành động chính | `--green-600` | `#245c37` |
| Xanh thương hiệu | `--green` | `#337448` |
| Chữ đậm, footer | `--green-dark` | `#173d27` |
| Nền nhấn nhẹ | `--green-light` | `#edf5e9` |
| Nền trang | `--bg` | `#f7faf5` |
| Mặt thẻ | `--surface` | `#ffffff` |

- Nunito Sans dùng nhất quán cho tiêu đề, nội dung, biểu mẫu, nút và giá. Body desktop 16px; mobile 15px, line-height 1.6.
- Tiêu đề trang dùng weight 800, section 700; nội dung 400–500, thao tác 600 và giá 700. Nét chữ mềm, dễ đọc và gần gũi với cửa hàng thực phẩm.
- Font được self-host trong `public/fonts/`, variable weight 400–800, gồm Latin, Latin Extended và tiếng Việt; `display=swap`. Giữ system sans làm fallback. Script `npm run fonts` trong server tải lại từ Google Fonts và lưu giấy phép OFL.
- Metadata quan trọng trên thẻ mobile khoảng 12–13px. Không giảm cỡ chữ để nhét thêm thông tin.
- Giá, số lượng và KPI dùng chữ số tabular.
- Xanh dùng chung cho các CTA cửa hàng, giải cứu, hộp bí ẩn và mua chung. Cam dành cho giảm giá/thời hạn; đỏ cho lỗi. Không tạo một màu thương hiệu mới cho từng chương trình.

## Bố cục và thao tác

- Container tối đa 1320px, gutter desktop 32px, tablet 24px, mobile 16px.
- Thẻ bo 14px; nút/input bo 8px. Thẻ chủ yếu dùng viền; bóng chỉ dành cho lớp nổi.
- Hình sản phẩm có tỷ lệ cố định, tên tối đa hai dòng, nguồn hàng, giá và nút mua cùng nhịp.
- Trang chủ chỉ trưng bày một nhóm bán chạy ngắn. Danh mục có lối vào riêng trên mobile. Mua chung trên mobile dùng một hàng cuộn ngang với phần thẻ kế tiếp lộ ra.
- Dưới 900px, hamburger mở/đóng danh mục chính. Escape đóng menu và trả focus. Nút icon có tên truy cập.
- Bảng rộng cuộn trong vùng riêng; không kéo rộng toàn trang. Gallery trong grid phải có `min-width: 0`.

## Icon, trạng thái và ảnh

- Dùng duy nhất sprite `public/icons.svg`: nét 1.65px, 20px mặc định. Icon cạnh nhãn đặt `aria-hidden="true"`.
- Không dùng emoji cho điều hướng, trạng thái, nút xóa, chứng nhận hoặc thông báo.
- Có trạng thái loading, empty, error kèm thử lại. Không dùng cùng `null` để biểu diễn cả loading và failure.
- Input lỗi có thông báo liên kết qua `aria-describedby` và `aria-invalid`; submit đưa focus vào trường cần sửa.
- Giảm chuyển động có chủ đích: bỏ zoom/animation xuất hiện, giữ thông tin tải và phản hồi trạng thái.
- Chỉ dùng ảnh đúng loại hàng, không tạo chứng nhận/ảnh nông trại giả. Ảnh hàng giải cứu nên thể hiện đúng tình trạng thực tế.
- Chưa có ảnh thật: ghi rõ ảnh minh họa. Ảnh fallback phải cho biết chưa có ảnh, không giả làm ảnh sản phẩm.
- Không tuyên bố giao trong ngày, số nông trại, hữu cơ hoặc giá trị hộp cao hơn giá bán nếu chưa có dữ liệu kiểm chứng.
- Avatar nông trại dùng chung component: ưu tiên avatar nhà bán chọn, ảnh nhà bán tải, rồi ảnh tham khảo có nguồn; thiếu ảnh hoặc lỗi tải thì hiển thị chữ viết tắt. Album dùng ảnh nhà bán cung cấp trước, không trộn ảnh tham khảo vào album đó.
- Ảnh canh tác từ Wikimedia Commons có chú thích địa điểm, tác giả và giấy phép. Với hồ sơ mẫu, ghi rõ đây là ảnh tham khảo, chưa xác nhận thuộc nhà bán. Không gọi ảnh tìm trên mạng là bằng chứng nông trại thật của nhà bán.

## Nguồn dữ liệu và mức tin cậy

- `isDemo` đánh dấu sản phẩm từ seed; không dùng số đánh giá mẫu làm social proof. Hồ sơ nông trại có sản phẩm seed được ghi rõ là hồ sơ mẫu.
- Chứng nhận là khai báo của nhà bán cho tới khi có bằng chứng xác minh. Không dùng dấu check để biểu diễn chứng nhận chưa kiểm tra.
- Ảnh seed được biên tập theo manifest `server/src/seed/data/storefront-media.json`. Thumbnail WebP 400px dùng trên danh sách, ảnh 960px trên chi tiết; nguồn/giấy phép được giữ. Không thay ảnh nhà bán tự cập nhật bằng ảnh seed.
- Bốn mục đang thiếu ảnh phù hợp dùng placeholder rõ ràng. Không dùng ảnh sai loại để làm đầy catalog.
- Quy cách, bảo quản và lịch giao là trường nhà bán có thể nhập. Khi trống, ghi rõ chưa được cung cấp; không tự tạo số ngày giao hoặc hạn bảo quản.
- Giá vận chuyển lấy từ API dùng cùng hằng số với checkout. Tổng tiền theo số lượng hiển thị trước khi thêm giỏ.
- Lỗi checkout hiển thị cạnh tổng tiền và nút đặt hàng; không lặp toast che nút. Giữ thông tin đã nhập khi giá thay đổi và giữ khóa idempotency khi kết quả mạng chưa rõ.
- Hiệu năng có budget initial bundle 450kB cảnh báo / 550kB lỗi; không coi số đo lab localhost là trải nghiệm thực địa.

## Tránh thiết kế đại trà

Không dùng gradient chữ, glassmorphism trang trí, nền chuyển động, bộ icon nhiều phong cách, badge vô nghĩa hoặc animation xuất hiện cho mọi section. Ưu tiên ảnh thật, tiếng Việt rõ, CTA cụ thể và khoảng cách đủ đọc.

Tham khảo xu hướng: [Shopify — ecommerce design 2026](https://www.shopify.com/blog/11863377-30-beautiful-and-creative-ecommerce-website-designs), [Shopify — UX trends](https://www.shopify.com/uk/blog/ux-design-trends). Chọn tính tự nhiên và khoảng thở phù hợp sản phẩm; không sao chép toàn bộ xu hướng.
