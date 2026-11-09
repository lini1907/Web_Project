/**
 * Ánh xạ tên nông trại trong products.json (bản HTML cũ) -> hồ sơ nông trại và tài khoản vendor demo.
 * Bản cũ có 23 tên nông trại nhưng chỉ 4 vendor; mỗi nông trại ở đây thuộc một vendor demo riêng.
 * Hai bản ghi "Nhập khẩu"/"Nhập khẩu trực tiếp" bị loại khỏi seed vì trái với định vị farm-to-table.
 */
export const LEGACY_VENDOR_BY_FARM = {
  'Nông trại Đà Lạt Xanh': 'v1',
  'Vườn rau sạch Mộc Châu': 'v2',
};

export const EXCLUDED_FARMS = ['Nhập khẩu', 'Nhập khẩu trực tiếp'];

export const FARM_META = {
  'Nông trại Đà Lạt Xanh': { province: 'Lâm Đồng', address: 'Xã Xuân Thọ, TP. Đà Lạt', certifications: ['Hữu cơ', 'VietGAP'], story: 'Nhà màng 2 ha trên đồi Xuân Thọ, chuyên rau quả hữu cơ cung cấp cho bếp gia đình TP.HCM.' },
  'Vườn rau sạch Mộc Châu': { province: 'Sơn La', address: 'Xã Đông Sang, Mộc Châu', certifications: ['VietGAP'], story: 'Hợp tác 12 hộ trồng rau trên cao nguyên Mộc Châu, thu hoạch sáng sớm và vận chuyển lạnh trong ngày.' },
  'Dâu Tây Đà Lạt': { province: 'Lâm Đồng', address: 'Phường 12, TP. Đà Lạt', certifications: ['VietGAP'], story: 'Vườn dâu treo giàn công nghệ Hà Lan, hái theo đơn để quả đến tay người mua còn tươi.' },
  'Miệt vườn Miền Tây': { province: 'Vĩnh Long', address: 'Huyện Tam Bình', certifications: [], story: 'Vườn cam sành ba thế hệ bên sông Măng Thít.' },
  'HTX Nông nghiệp Đức Trọng': { province: 'Lâm Đồng', address: 'Huyện Đức Trọng', certifications: ['VietGAP'], story: 'Hợp tác xã 40 thành viên, gom rau củ tiêu chuẩn VietGAP và cả hàng xấu mã để giải cứu.' },
  'Trang trại nấm Việt': { province: 'TP. Hồ Chí Minh', address: 'Huyện Hóc Môn', certifications: [], story: 'Trại nấm trong nhà kiểm soát nhiệt độ, không dùng thuốc bảo vệ thực vật.' },
  'Trang trại CP': { province: 'Đồng Nai', address: 'Huyện Xuân Lộc', certifications: ['VietGAP'], story: 'Trang trại chăn nuôi khép kín, truy xuất nguồn gốc theo từng lô.' },
  'Trại gà ta Gò Công': { province: 'Tiền Giang', address: 'Thị xã Gò Công', certifications: [], story: 'Gà ta chạy bộ dưới vườn dừa, cho trứng tự nhiên mỗi ngày.' },
  'Hải sản Sông Tiền': { province: 'Tiền Giang', address: 'Huyện Cái Bè', certifications: ['ASC'], story: 'Bè cá trên sông Tiền, sơ chế ngay tại bè và cấp đông nhanh.' },
  'Nông trại Cậu Hai': { province: 'Lâm Đồng', address: 'Huyện Đơn Dương', certifications: [], story: 'Ruộng khoai tây và cà rốt của gia đình cậu Hai trên vùng đất đỏ bazan.' },
  'Các nông trại liên kết': { province: 'Lâm Đồng', address: 'Kho tổng FarmTable, Đức Trọng', certifications: [], story: 'Kho gom trái cây theo mùa từ nhiều nhà vườn liên kết, đóng hộp quà và Mystery Box.' },
  'Farm Cầu Đất': { province: 'Lâm Đồng', address: 'Xã Xuân Trường, Đà Lạt', certifications: ['VietGAP'], story: 'Nông trại cà chua và rau gia vị ở độ cao 1.600 m.' },
  'Nhà vườn cô Ba, Bến Tre': { province: 'Bến Tre', address: 'Huyện Chợ Lách', certifications: [], story: 'Vườn cam sành và bưởi da xanh của cô Ba bên sông Cổ Chiên.' },
  'Vườn rau chú Năm, Đức Trọng': { province: 'Lâm Đồng', address: 'Xã Hiệp Thạnh, Đức Trọng', certifications: ['VietGAP'], story: 'Vườn rau gia đình chú Năm, trồng dày vụ để quay vòng nhanh.' },
  'HTX Nông nghiệp Xanh': { province: 'Lâm Đồng', address: 'Huyện Lâm Hà', certifications: [], story: 'Hợp tác xã bảo quản táo và trái cây ôn đới trong kho lạnh.' },
  'Nông trại Sương Mai': { province: 'Lâm Đồng', address: 'Huyện Lạc Dương', certifications: [], story: 'Ruộng khoai lang mật trên đất đồi, thu hoạch thủ công.' },
  'Nông trại Mặt Trời': { province: 'Long An', address: 'Huyện Đức Hòa', certifications: ['VietGAP'], story: 'Nhà màng dưa lưới tưới nhỏ giọt, theo dõi độ ngọt từng lứa.' },
  'HTX Nấm Sạch': { province: 'Đồng Nai', address: 'Huyện Long Thành', certifications: [], story: 'Hợp tác xã trồng nấm trên giá thể mùn cưa tái chế.' },
  'Trang trại gà thả vườn Đồng Nai': { province: 'Đồng Nai', address: 'Huyện Định Quán', certifications: ['VietGAP'], story: 'Gà thả vườn dưới tán cây điều, ăn ngô và rau xanh.' },
  'HTX Thủy sản Cà Mau': { province: 'Cà Mau', address: 'Huyện Năm Căn', certifications: [], story: 'Tôm sinh thái nuôi dưới tán rừng ngập mặn Năm Căn.' },
  'Vườn bơ chú Sáu': { province: 'Đắk Lắk', address: 'Huyện Krông Pắc', certifications: [], story: 'Vườn bơ sáp 15 năm tuổi của chú Sáu, chín cây tự nhiên.' },
  // Hai vendor kế thừa từ vendors.json chưa có sản phẩm trong products.json
  'Trang trại hữu cơ Củ Chi': { province: 'TP. Hồ Chí Minh', address: 'Xã Phú Mỹ Hưng, Củ Chi', certifications: ['Hữu cơ'], story: 'Rau ăn lá hữu cơ ven đô, giao trong ngày cho nội thành.' },
  'Nông sản sạch Tam Đảo': { province: 'Vĩnh Phúc', address: 'Thị trấn Tam Đảo', certifications: [], story: 'Su su và rau rừng Tam Đảo (đang chờ duyệt).' },
};

/** Lý do giải cứu theo từ khóa tên sản phẩm. */
export function rescueReason(name) {
  if (/méo|lệch form|nứt/i.test(name)) return 'Hình thức không đạt chuẩn siêu thị';
  if (/trầy/i.test(name)) return 'Trầy vỏ khi vận chuyển';
  if (/gãy|size|lẫn size/i.test(name)) return 'Sai kích cỡ phân loại';
  return 'Dư cung cuối vụ';
}
