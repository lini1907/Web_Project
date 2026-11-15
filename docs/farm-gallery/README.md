# Avatar và album nông trại

- Bỏ em dash ở ba slogan Giải cứu, Mystery Box và Mua chung; tiêu đề/meta trang chủ dùng dấu phân cách phù hợp.
- Avatar thống nhất ở trang chủ, danh sách, hồ sơ nông trại và kênh nhà bán. Có ảnh dự phòng và chữ viết tắt khi thiếu ảnh.
- 15 ảnh chụp thật, xuất WebP 200px/1200px. Nguồn và giấy phép: [CREDITS](../../client/public/media/farms/CREDITS.md). Manifest: `server/src/seed/data/farm-media.json`. Tái tạo bằng `npm run farm-media` trong server.
- Ảnh tìm qua web là ảnh tham khảo theo vùng hoặc mô hình canh tác, không xác nhận liên hệ với tên nhà bán trong dữ liệu mẫu. Chú thích công khai thể hiện sự khác biệt này.
- Nhà bán tải JPG/PNG/WebP qua API upload hiện có, tối đa 8 ảnh, 2MB/ảnh; chọn/xóa avatar. Ảnh do nhà bán cung cấp thay album tham khảo, không bị ghi đè bởi dữ liệu biên tập.

## Kiểm tra

- Production build thành công, initial bundle 401.94kB raw / 105.13kB transfer ước tính.
- 41/41 kiểm thử server đạt, gồm lưu/xóa avatar, dữ liệu ảnh công khai, giới hạn ảnh, URL không hợp lệ và quyền buyer.
- `qa/farm-gallery.cjs`: danh sách/chi tiết ở 320, 768 và 1440px không tràn ngang; avatar tải được; thumbnail chuyển ảnh; slogan không có em dash; avatar trên trang chủ.
- Luồng editor kiểm tra bằng request ghi giả lập: lỗi upload và thử lại, thêm URL, chọn avatar, xóa avatar đang chọn, lưu đúng payload. Không sửa hồ sơ trong DB thật khi chạy bài kiểm tra giao diện.
- Axe WCAG A/AA không phát hiện vi phạm ở hai trang nông trại 320px và editor 375px. Không có lỗi JavaScript trong bài chạy. Đây là kiểm thử tự động, chưa thay cho đánh giá của người dùng thật.
- Detector Impeccable trên 5 file Angular không báo phát hiện; chỉ kiểm tra regex, không thay thế quan sát ảnh chụp và Axe.

Kết quả: [results.json](results.json). Ảnh chụp: [desktop](farm-1440.png), [tablet](farm-768.png), [album mobile](farm-320.png), [editor mobile](vendor-375.png).
