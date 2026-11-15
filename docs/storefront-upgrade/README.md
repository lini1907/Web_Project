# Hoàn thiện trải nghiệm FarmTable

Ngày 09/11/2026. Mốc đã push trước khi bắt đầu lượt này: [`ab6cefe`](https://github.com/lini1907/Web_Project/commit/ab6cefe) trên `feat/v2-fullstack`. Các thay đổi dưới đây là lượt tiếp theo để đối chiếu với mốc đó.

## 1. Ảnh sản phẩm

- Rà soát 89 bản ghi seed và chọn lại ảnh minh họa. 85 bản ghi có ảnh được biên tập; 4 bản ghi chưa có ảnh đủ phù hợp chuyển sang placeholder rõ ràng: ba chỉ heo, cải bẹ xanh, thanh long ruột đỏ và cá diêu hồng.
- Thay các trường hợp ảnh món đã nấu, ảnh rùa đại diện cá và gallery tự động không phù hợp. Không dùng ảnh AI để giả làm hàng thật.
- Ảnh WebP có bản 400px cho danh sách và 960px cho chi tiết. Bỏ tải hàng loạt ảnh phụ không được biên tập của seed. Hero và ảnh hộp theo mùa cũng được phục vụ cục bộ.
- Nguồn, tác giả, giấy phép và thông tin đổi định dạng nằm trong [manifest](../../server/src/seed/data/storefront-media.json) và [credits](../../client/public/media/catalog/CREDITS.md). Ảnh CC BY-SA tiếp tục giữ điều kiện giấy phép gốc.
- Hiệu chỉnh chỉ áp dụng khi ảnh seed vẫn trùng ảnh gốc hoặc bản hiệu chỉnh; ảnh nhà bán tự thay được giữ nguyên. Không ghi đè giá, tồn kho hoặc đơn hàng trong database để sửa ảnh.

Ảnh minh họa xác định nhóm thực phẩm; không chứng minh giống, vùng trồng, tình trạng hàng giải cứu hay lô hàng thực tế. Muốn sẵn sàng bán thật vẫn cần bộ ảnh thực tế và quyền sử dụng do nhà bán cung cấp. Ánh sáng/cách chụp của ảnh stock chưa thay thế được bộ ảnh thương mại thống nhất.

## 2. Nguồn gốc và độ tin cậy

- Sản phẩm từ seed có `isDemo`; không dùng số sao/lượt bán mẫu làm bằng chứng xã hội trên thẻ hàng.
- Hồ sơ mẫu được ghi rõ. Chứng nhận được mô tả là **nhà bán khai báo, chưa được xác minh**, không còn dấu check gây hiểu nhầm đã được chứng nhận.
- Hồ sơ nông trại có địa phương, địa chỉ khai báo, nhà bán, tình trạng ảnh và phần giải thích chứng nhận. Khi không có ảnh thực tế thì hiện trạng thái thiếu ảnh, không ghép ảnh đồng ruộng giả vào hồ sơ.
- Bỏ hotline số giả. Không công bố số điện thoại riêng tư của người dùng như số hỗ trợ nếu chưa có dữ liệu liên hệ kinh doanh phù hợp.

## 3. Thông tin trước khi mua

- Trang sản phẩm có đơn vị bán, quy cách, nguồn hàng, tổng tiền theo số lượng, bảo quản và lịch giao.
- Nhà bán có thể nhập quy cách, hướng dẫn bảo quản và thông tin giao hàng; API kiểm tra và lưu các trường này. Khi chưa có nội dung, trang ghi rõ chưa được cung cấp, không tự đặt ngày giao hoặc hạn bảo quản.
- Phí giao hàng lấy từ API dùng cùng hằng số với tính tiền checkout. Tổng cuối cùng được kiểm tra lại ở server.
- Đồng hồ phía client khóa hành động khi hàng giải cứu vừa hết hạn trong lúc mở trang; server vẫn là nơi quyết định có mua được không.

## 4. Trạng thái và lỗi

- Một mục mua chung/nông trại/hộp bị lỗi không làm mất toàn bộ sản phẩm trên trang chủ. Có thông báo và thử lại.
- Danh sách nông trại dùng làm bộ lọc lỗi không chặn trang cửa hàng. Khoảng giá âm hoặc đảo ngược được giải thích ngay tại hai ô nhập.
- Request có timeout; phản hồi cũ không ghi đè sản phẩm/nông trại vừa chuyển sang.
- Checkout giữ địa chỉ đã nhập khi giá thay đổi; cập nhật tổng mới và yêu cầu người mua xem lại. Lỗi kết quả mạng chưa rõ giữ khóa idempotency để tránh tạo đơn trùng khi thử lại.
- Nút thêm giỏ/mua ngay được căn đều trên mobile; kiểm tra bổ sung ở 320/375/1440px không tràn ngang. Ảnh: [thông tin mua hàng](product-facts-mobile.png), [giao hàng và nguồn gốc](product-guidance-mobile.png), [lỗi checkout](checkout-network.png).
- Lỗi checkout hiển thị ngay cạnh tổng tiền; không lặp toast che nút đặt hàng. Field lỗi có liên kết trợ năng và vị trí focus.
- Input trên mobile dùng 16px để hạn chế Safari tự zoom khi nhập.

## 5. Kiểm chứng và hiệu năng

- **38/38 kiểm thử API/unit qua**, gồm phân quyền, tồn kho, giá đổi, idempotency và manifest ảnh. Chạy trên MongoDB test tách biệt; không reset database demo hiện tại.
- Bộ kiểm thử trình duyệt: [kết quả](browser-results.json), mã và hướng dẫn trong [qa](../../qa/README.md). Kiểm tra nhiều kích thước, trợ năng tự động, lỗi từng phần, hết hàng, hết hạn và checkout giả lập. Không gửi đơn mua thật trong kiểm thử trình duyệt.
- Số đo LCP/CLS/bytes trong JSON là một lượt **lab localhost**, không phải số đo thực địa hay chứng nhận hiệu năng trên điện thoại thật. Không tạo điểm Lighthouse hoặc kết quả INP giả.
- Font Nunito Sans variable được self-host với 3 subset, tổng khoảng 69kB WOFF2, có giấy phép OFL. Trong những trang công khai đã kiểm tra, font/ảnh/stylesheet không cần request sang host bên ngoài.
- Initial bundle khoảng 400kB trước nén; ước tính truyền nén khoảng 105kB theo build, không đồng nghĩa server đang truyền đúng số byte đó. Budget mới: cảnh báo 450kB, lỗi 550kB.
- Build trên máy ít bộ nhớ: `NG_BUILD_MAX_WORKERS=1`, `GOMAXPROCS=1`, `NODE_OPTIONS=--max-old-space-size=384 --max-semi-space-size=4`, sau đó `npm run build` trong client.

**Kiểm thử với người dùng thật chưa diễn ra.** Đã chuẩn bị [kịch bản](../usability-study.md) và [biểu ghi nhận trống](../usability-observations.csv). Cần người tham gia và sự đồng ý phù hợp để hoàn tất phần này; kiểm thử tự động không thay thế nó.

## Tái tạo và giới hạn

Trong server, chạy `npm run media` để tái tạo ảnh từ các lựa chọn biên tập; `npm run fonts` để tải lại font. File `.source` chỉ được cache trong `server/.cache/`, không đưa vào `public` hoặc Git. Không reset/seed lại database để xem các hiệu chỉnh.

Các đầu vào còn thiếu: bốn ảnh hàng đúng loại; ảnh nông trại và lô hàng thật; tài liệu chứng nhận có thể kiểm tra; lịch giao/quy cách/bảo quản nhà bán xác nhận; kết quả thử với người mua thực tế. Lượt này hoàn thiện phần triển khai, trạng thái thiếu dữ liệu và bộ kiểm chứng, không tuyên bố đã đạt “10/10” hoặc sẵn sàng bán thật.
