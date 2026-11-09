# Kiểm thử FarmTable với người mua thực tế

Trạng thái: **chưa thực hiện với người tham gia thật**. Kiểm thử tự động và nhận xét của AI không được ghi thành kết quả người dùng.

## Cách tổ chức

Mời người thường mua thực phẩm cho gia đình, gồm cả người ít mua online. Dùng điện thoại của họ, dữ liệu demo và tài khoản thử. Nói rõ đây là bài kiểm tra giao diện; không thanh toán hay giao hàng thật. Xin đồng ý trước khi ghi âm hoặc quay màn hình; không thu mật khẩu, địa chỉ nhà thật hay dữ liệu thanh toán. Gán mã người tham gia thay cho tên.

Người điều phối chỉ đọc nhiệm vụ, không chỉ vị trí nút. Đề nghị người tham gia nói điều họ đang nghĩ. Ghi lại hành động thay vì suy đoán cảm xúc. Dừng nếu họ không muốn tiếp tục.

## Nhiệm vụ

1. **Tìm hàng:** tìm một loại rau bằng từ không dấu, lọc theo danh mục và giới hạn giá. Nói vì sao chọn sản phẩm đó.
2. **Hiểu sản phẩm:** nói rõ giá dành cho bao nhiêu hàng, tổng tiền nếu mua hai đơn vị, nguồn hàng và điều còn chưa biết trước khi mua.
3. **Đánh giá độ tin cậy:** tìm thông tin nông trại; nhận biết hồ sơ mẫu, thông tin nhà bán khai báo và chứng nhận chưa được xác minh. Không gợi ý câu trả lời.
4. **Mua hàng trên mobile:** thêm hàng, đổi số lượng, xem phí vận chuyển và đi tới bước thông tin nhận hàng. Dùng dữ liệu giả. Chỉ gửi đơn trong môi trường test riêng hoặc khi đơn demo đã được thống nhất; không gửi đơn thật.
5. **Khôi phục lỗi:** dùng môi trường kiểm thử tạo lỗi mạng, sản phẩm hết hàng hoặc giá thay đổi. Quan sát người mua có hiểu vấn đề và biết bước tiếp theo không.

## Ghi nhận

Với mỗi nhiệm vụ, ghi: thành công không trợ giúp / thành công có trợ giúp / chưa hoàn tất; thời gian; điểm ngập ngừng; lỗi; phát biểu nguyên văn ngắn; mức dễ thực hiện tự chấm 1–7. Không gộp thời gian của nhiệm vụ thất bại vào trung bình thành công.

Sau buổi thử hỏi: “Thông tin nào bạn còn thiếu để dám đặt hàng?”, “Chỗ nào khiến bạn không chắc mình vừa làm đúng?”, “Điều gì bạn sẽ thay đổi đầu tiên?”. Tránh câu dẫn như “Bạn có thấy giao diện xanh sạch không?”.

Dùng [usability-observations.csv](usability-observations.csv) để ghi dữ liệu. File chỉ có tiêu đề; không có kết quả người dùng được tạo sẵn.

## Cách quyết định sửa

Ưu tiên lỗi làm mua nhầm, hiểu nhầm chứng nhận, sai số lượng/giá hoặc không phục hồi được đơn. Sau đó xử lý điểm gây ngập ngừng lặp lại ở nhiều người. Mỗi thay đổi phải có vấn đề, bằng chứng quan sát, giải pháp và nhiệm vụ kiểm tra lại. Không dùng số người tham gia nhỏ để suy rộng thành tỷ lệ chuyển đổi toàn thị trường.

## Điều kiện sẵn sàng bán thật

- Ảnh thực tế đúng loại hàng/lô hàng, quyền sử dụng ảnh rõ ràng.
- Quy cách, bảo quản, vùng giao và thời gian dự kiến do nhà bán xác nhận.
- Chứng nhận có hồ sơ kiểm tra; nếu chưa kiểm tra thì không dùng biểu tượng đã xác thực.
- Kiểm thử người mua cho thấy họ hiểu tổng tiền và kết quả đặt hàng.
- Kiểm tra trình đọc màn hình, bàn phím và thiết bị thật; số đo hiệu năng thực địa được thu khi đã triển khai và có sự đồng ý phù hợp.
