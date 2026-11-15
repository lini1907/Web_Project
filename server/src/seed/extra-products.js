/**
 * Sản phẩm bổ sung cho bản v2 (ngoài 38 bản ghi kế thừa trong FarmTable/XML+Json, thư mục đó giữ nguyên để đối chiếu).
 * Giá, tồn kho, mô tả là DỮ LIỆU DEMO do nhóm soạn — không phải số liệu kinh doanh thật.
 *
 * Mỗi dòng: [key, tên, danh mục, đơn vị, giá (đ), nông trại, chứng nhận, mô tả, từ khóa ảnh (tiếng Anh, tìm trên Wikimedia Commons)]
 * Ảnh được lấy bằng `npm run images` (scripts/fetch-images.js) và lưu ở src/seed/data/product-images.json.
 */
export const EXTRA_FARM_META = {
  'Trang trại bò sữa Mộc Châu': {
    province: 'Sơn La',
    address: 'Thị trấn Nông trường Mộc Châu',
    certifications: ['VietGAP'],
    story: 'Đàn bò sữa chăn thả trên đồng cỏ cao nguyên, vắt và thanh trùng trong ngày.',
  },
};

const R = 'rau-cu';
const T = 'trai-cay';
const M = 'thit-thuy-san';
const E = 'trung-sua';

export const EXTRA_PRODUCTS = [
  // ---------- Rau củ ----------
  ['x-xa-lach', 'Xà lách thủy canh Đà Lạt', R, 'túi 500g', 35000, 'Nông trại Đà Lạt Xanh', ['Hữu cơ'], 'Xà lách lô lô trồng thủy canh trong nhà màng, lá giòn, không đất cát. Rửa nhẹ là dùng được cho salad và cuốn.', 'lettuce'],
  ['x-ot-chuong', 'Ớt chuông 3 màu Đà Lạt', R, 'kg', 85000, 'Farm Cầu Đất', ['VietGAP'], 'Ớt chuông đỏ, vàng, xanh trồng nhà kính ở độ cao 1.600 m. Thịt dày, ngọt, hợp xào, nướng và làm salad.', 'bell pepper'],
  ['x-bi-do', 'Bí đỏ hồ lô', R, 'kg', 28000, 'HTX Nông nghiệp Đức Trọng', ['VietGAP'], 'Bí đỏ hồ lô ruột vàng đậm, bở và ngọt. Dùng nấu canh, súp, hấp hoặc làm bánh.', 'pumpkin'],
  ['x-bi-ngoi', 'Bí ngòi xanh', R, 'kg', 32000, 'Vườn rau chú Năm, Đức Trọng', ['VietGAP'], 'Bí ngòi trái non, vỏ mỏng, ruột chắc. Xào tỏi, nướng hoặc thái sợi thay mì đều ngon.', 'zucchini'],
  ['x-cai-thao', 'Cải thảo Đà Lạt', R, 'kg', 22000, 'Vườn rau chú Năm, Đức Trọng', ['VietGAP'], 'Cải thảo cuốn chặt, bẹ trắng giòn. Hợp nấu lẩu, làm kim chi hoặc xào.', 'napa cabbage'],
  ['x-cu-den', 'Củ dền đỏ', R, 'kg', 30000, 'Nông trại Cậu Hai', [], 'Củ dền trồng trên đất đỏ bazan Đơn Dương, màu tím đậm. Nấu canh, ép nước hoặc luộc trộn salad.', 'beetroot'],
  ['x-hanh-tay', 'Hành tây Đà Lạt', R, 'kg', 26000, 'Nông trại Cậu Hai', [], 'Hành tây vỏ vàng, củ chắc, ít hăng. Dùng xào, nấu súp, làm hành phi.', 'onions'],
  ['x-dau-ha-lan', 'Đậu Hà Lan Mộc Châu', R, 'kg', 60000, 'Vườn rau sạch Mộc Châu', ['VietGAP'], 'Đậu Hà Lan ăn cả vỏ, hái non nên giòn ngọt. Xào thịt bò hoặc tôm.', 'snow peas'],
  ['x-cai-ngong', 'Cải ngồng Mộc Châu', R, 'kg', 30000, 'Vườn rau sạch Mộc Châu', ['VietGAP'], 'Cải ngồng hái lúc vừa trổ hoa, thân mềm ngọt. Luộc chấm kho quẹt hoặc xào tỏi.', 'choy sum'],
  ['x-mang-tay', 'Măng tây xanh', R, 'kg', 160000, 'Farm Cầu Đất', ['VietGAP'], 'Măng tây xanh cọng vừa, phần gốc mềm. Áp chảo bơ tỏi, nấu súp hoặc nướng.', 'asparagus'],
  ['x-rau-muong', 'Rau muống hữu cơ Củ Chi', R, 'bó 500g', 15000, 'Trang trại hữu cơ Củ Chi', ['Hữu cơ'], 'Rau muống trồng hữu cơ ven đô, cắt buổi sáng và giao trong ngày.', 'water spinach'],
  ['x-mong-toi', 'Mồng tơi hữu cơ Củ Chi', R, 'bó 500g', 16000, 'Trang trại hữu cơ Củ Chi', ['Hữu cơ'], 'Mồng tơi lá dày, non. Nấu canh cua, canh tôm giải nhiệt.', 'Basella alba'],
  ['x-cai-be-xanh', 'Cải bẹ xanh hữu cơ', R, 'kg', 28000, 'Trang trại hữu cơ Củ Chi', ['Hữu cơ'], 'Cải bẹ xanh vị hơi cay nhẹ, dùng nấu canh gừng, làm dưa cải hoặc cuốn thịt.', 'mustard greens'],
  ['x-kho-qua', 'Khổ qua (mướp đắng)', R, 'kg', 30000, 'Trang trại hữu cơ Củ Chi', ['Hữu cơ'], 'Khổ qua trái vừa, gai to, ít đắng. Nhồi thịt nấu canh hoặc xào trứng.', 'bitter melon'],
  ['x-nam-kim-cham', 'Nấm kim châm', R, 'gói 200g', 15000, 'Trang trại nấm Việt', [], 'Nấm kim châm trắng, thân dài đều, trồng trong phòng lạnh. Dùng nhúng lẩu, cuộn thịt nướng.', 'enoki'],
  ['x-nam-huong', 'Nấm hương tươi', R, 'kg', 220000, 'HTX Nấm Sạch', [], 'Nấm hương tươi mũ dày, thơm. Xào, nấu súp hoặc hầm gà.', 'shiitake'],
  ['x-nam-bao-ngu', 'Nấm bào ngư xám', R, 'kg', 70000, 'HTX Nấm Sạch', [], 'Nấm bào ngư trồng trên mùn cưa tái chế, tai mềm, ngọt. Xào sả ớt hoặc nấu lẩu.', 'oyster mushrooms'],
  ['x-bap-my', 'Bắp Mỹ ngọt', R, 'kg', 25000, 'Nông trại Mặt Trời', ['VietGAP'], 'Bắp Mỹ hạt vàng mọng, ăn sống cũng ngọt. Luộc, nướng hoặc làm súp.', 'sweet corn'],
  ['x-khoai-mon', 'Khoai môn sáp', R, 'kg', 45000, 'Nông trại Sương Mai', [], 'Khoai môn ruột tím vân, nấu lên dẻo sáp. Nấu canh, chè hoặc làm bánh.', 'taro'],
  ['x-gung', 'Gừng ta', R, 'kg', 55000, 'HTX Nông nghiệp Đức Trọng', ['VietGAP'], 'Gừng ta củ nhỏ, cay nồng. Dùng nấu ăn, pha trà gừng.', 'ginger root'],

  // ---------- Trái cây ----------
  ['x-thanh-long', 'Thanh long ruột đỏ Long An', T, 'kg', 40000, 'Nông trại Mặt Trời', ['VietGAP'], 'Thanh long ruột đỏ trái to, ruột đỏ tím, ngọt thanh. Ăn tươi hoặc xay sinh tố.', 'dragon fruit'],
  ['x-xoai-cat', 'Xoài cát Hòa Lộc', T, 'kg', 85000, 'Miệt vườn Miền Tây', [], 'Xoài cát Hòa Lộc chín cây, thịt vàng mịn, thơm. Ăn tươi hoặc làm sinh tố.', 'mango'],
  ['x-buoi-da-xanh', 'Bưởi da xanh Bến Tre', T, 'trái ~1,5kg', 75000, 'Nhà vườn cô Ba, Bến Tre', [], 'Bưởi da xanh múi hồng, ráo nước, ngọt không đắng. Bảo quản được 2–3 tuần.', 'pomelo'],
  ['x-chom-chom', 'Chôm chôm Java', T, 'kg', 45000, 'Miệt vườn Miền Tây', [], 'Chôm chôm Java cùi dày, tróc hạt, giòn ngọt.', 'rambutan'],
  ['x-mang-cut', 'Măng cụt Bến Tre', T, 'kg', 90000, 'Nhà vườn cô Ba, Bến Tre', [], 'Măng cụt vỏ tím, múi trắng ngà, vị chua ngọt cân bằng.', 'mangosteen'],
  ['x-sau-rieng', 'Sầu riêng Ri6 Đắk Lắk', T, 'kg', 120000, 'Vườn bơ chú Sáu', [], 'Sầu riêng Ri6 cơm vàng, hạt lép, béo và thơm. Bán theo trái, cân thực tế.', 'durian'],
  ['x-chanh-day', 'Chanh dây Lâm Đồng', T, 'kg', 35000, 'HTX Nông nghiệp Xanh', [], 'Chanh dây tím vỏ mỏng, nhiều nước. Pha nước, làm sốt hoặc kem.', 'passion fruit'],
  ['x-nhan', 'Nhãn xuồng cơm vàng', T, 'kg', 65000, 'Miệt vườn Miền Tây', [], 'Nhãn xuồng trái to, cơm dày, giòn và ngọt đậm.', 'longan'],
  ['x-vu-sua', 'Vú sữa Lò Rèn', T, 'kg', 60000, 'Nhà vườn cô Ba, Bến Tre', [], 'Vú sữa Lò Rèn vỏ mỏng, thịt trắng sữa, ngọt mát.', 'Chrysophyllum cainito'],
  ['x-oi', 'Ổi ruột hồng', T, 'kg', 30000, 'Nông trại Mặt Trời', ['VietGAP'], 'Ổi ruột hồng giòn, thơm, ít hạt. Ăn tươi hoặc ép nước.', 'guava'],
  ['x-dua-khom', 'Khóm (dứa) Long An', T, 'trái', 20000, 'Nông trại Mặt Trời', [], 'Khóm Bến Lức mắt nông, ngọt thơm. Ăn tươi, nấu canh chua hoặc xào.', 'pineapple'],
  ['x-dua-hau', 'Dưa hấu ruột đỏ Long An', T, 'kg', 18000, 'Nông trại Mặt Trời', [], 'Dưa hấu vỏ mỏng, ruột đỏ, cát và ngọt.', 'watermelon'],
  ['x-man-hau', 'Mận hậu Mộc Châu', T, 'kg', 50000, 'Vườn rau sạch Mộc Châu', [], 'Mận hậu chín đỏ tím, giòn, chua ngọt. Chỉ có vào mùa hè.', 'plums'],
  ['x-hong-gion', 'Hồng giòn Đà Lạt', T, 'kg', 55000, 'HTX Nông nghiệp Xanh', [], 'Hồng giòn không chát, ăn như táo. Bảo quản kho lạnh.', 'persimmon'],
  ['x-chanh-khong-hat', 'Chanh không hạt', T, 'kg', 30000, 'Miệt vườn Miền Tây', [], 'Chanh không hạt vỏ mỏng, nhiều nước, thơm.', 'lime fruit'],
  ['x-dua-xiem', 'Dừa xiêm Bến Tre', T, 'trái', 18000, 'Nhà vườn cô Ba, Bến Tre', [], 'Dừa xiêm xanh nước ngọt thanh, đã gọt sẵn phần vỏ ngoài.', 'coconut'],
  ['x-mit-thai', 'Mít Thái múi vàng', T, 'kg', 40000, 'Vườn bơ chú Sáu', [], 'Mít Thái múi dày, giòn, ngọt. Bán nguyên trái hoặc đã tách múi.', 'jackfruit'],
  ['x-bo-034', 'Bơ 034 Đắk Lắk', T, 'kg', 70000, 'Vườn bơ chú Sáu', [], 'Bơ 034 trái dài, cơm vàng dẻo, ít xơ. Ăn trực tiếp hoặc làm sinh tố.', 'avocado'],

  // ---------- Thịt & thủy sản ----------
  ['x-bo-than', 'Thăn bò nội', M, 'kg', 320000, 'Trang trại CP', ['VietGAP'], 'Thăn bò mềm, ít gân, phù hợp áp chảo, xào hoặc nấu phở.', 'beef steak'],
  ['x-nac-vai', 'Nạc vai heo sạch', M, 'kg', 140000, 'Trang trại CP', ['VietGAP'], 'Nạc vai có chút mỡ xen, mềm, hợp kho, nướng hoặc làm chả.', 'pork shoulder'],
  ['x-ca-loc', 'Cá lóc đồng', M, 'kg', 120000, 'Hải sản Sông Tiền', [], 'Cá lóc nuôi bè sông Tiền, thịt chắc, ngọt. Làm sạch theo yêu cầu.', 'Channa striata'],
  ['x-ca-dieu-hong', 'Cá diêu hồng', M, 'kg', 85000, 'Hải sản Sông Tiền', ['ASC'], 'Cá diêu hồng tươi, thịt trắng ít xương dăm. Hấp, chiên xù hoặc nấu canh chua.', 'tilapia'],
  ['x-muc-ong', 'Mực ống tươi', M, 'kg', 280000, 'HTX Thủy sản Cà Mau', [], 'Mực ống thân dày, giòn ngọt. Hấp gừng, nướng hoặc xào.', 'squid'],
  ['x-cua-bien', 'Cua biển Cà Mau', M, 'kg', 450000, 'HTX Thủy sản Cà Mau', [], 'Cua gạch, cua thịt nuôi dưới tán rừng ngập mặn. Giao còn sống.', 'mud crab'],
  ['x-ngheu', 'Nghêu Bến Tre', M, 'kg', 55000, 'HTX Thủy sản Cà Mau', [], 'Nghêu đã nhả cát, nấu canh, hấp sả hoặc làm nghêu me.', 'clams'],
  ['x-uc-ga', 'Ức gà thả vườn', M, 'kg', 110000, 'Trang trại gà thả vườn Đồng Nai', ['VietGAP'], 'Ức gà phi lê bỏ da, ít mỡ. Hợp chế độ ăn giàu đạm.', 'chicken breast'],
  ['x-dui-ga', 'Đùi gà góc tư', M, 'kg', 95000, 'Trang trại gà thả vườn Đồng Nai', ['VietGAP'], 'Đùi gà góc tư thịt chắc, da mỏng. Chiên nước mắm, nướng hoặc ram.', 'chicken legs'],

  // ---------- Trứng & sữa ----------
  ['x-trung-vit', 'Trứng vịt', E, 'vỉ 10 quả', 38000, 'Trại gà ta Gò Công', [], 'Trứng vịt chạy đồng, lòng đỏ to. Luộc, chiên hoặc làm bánh.', 'duck eggs'],
  ['x-trung-cut', 'Trứng cút', E, 'hộp 30 quả', 30000, 'Trại gà ta Gò Công', [], 'Trứng cút tươi, dùng luộc, kho thịt hoặc chiên.', 'quail eggs'],
  ['x-trung-ga-omega', 'Trứng gà ta ăn ngô', E, 'vỉ 10 quả', 45000, 'Trang trại gà thả vườn Đồng Nai', ['VietGAP'], 'Trứng gà ta nuôi bằng ngô và rau xanh, lòng đỏ cam đậm.', 'brown eggs'],
  ['x-sua-tuoi', 'Sữa tươi thanh trùng Mộc Châu', E, 'chai 1L', 42000, 'Trang trại bò sữa Mộc Châu', ['VietGAP'], 'Sữa bò tươi thanh trùng, không thêm đường. Bảo quản lạnh 2–6°C, dùng trong 7 ngày.', 'milk bottle'],
  ['x-sua-chua', 'Sữa chua tự nhiên', E, 'hộp 500g', 45000, 'Trang trại bò sữa Mộc Châu', ['VietGAP'], 'Sữa chua lên men tự nhiên, vị chua dịu, không chất bảo quản.', 'yogurt'],
  ['x-pho-mai', 'Phô mai tươi', E, 'hộp 200g', 65000, 'Trang trại bò sữa Mộc Châu', [], 'Phô mai tươi mềm, béo nhẹ. Ăn với bánh mì, salad hoặc trái cây.', 'cottage cheese'],
  ['x-bo-lat', 'Bơ lạt', E, 'khối 200g', 70000, 'Trang trại bò sữa Mộc Châu', [], 'Bơ lạt làm từ kem sữa tươi, dùng làm bánh, áp chảo.', 'butter'],
].map(([key, name, category, unit, price, farm, certifications, description, imageQuery]) => ({
  key,
  name,
  category,
  unit,
  price,
  farm,
  certifications,
  description,
  imageQuery,
}));

/** Từ khóa ảnh bổ sung cho 38 sản phẩm kế thừa (theo id trong products.json) để mỗi sản phẩm có tối thiểu 5 ảnh. */
export const LEGACY_IMAGE_QUERIES = {
  1: 'cherry tomatoes', 2: 'spinach', 3: 'strawberries', 4: 'oranges', 5: 'broccoli', 6: 'Pleurotus eryngii',
  7: 'pork', 8: 'chicken eggs', 9: 'Fuji apple', 10: 'carrots', 11: 'Pangasius', 12: 'potatoes',
  14: 'tomatoes', 15: 'oranges', 16: 'cauliflower', 17: 'apples', 18: 'sweet potato', 19: 'Pangasius',
  20: 'cantaloupe', 21: 'Pleurotus eryngii', 22: 'chicken eggs', 23: 'cucumber', 24: 'cabbage', 25: 'Nashi pear',
  26: 'oranges', 27: 'bananas', 28: 'strawberries', 29: 'fruit basket', 30: 'Penaeus monodon', 31: 'chicken meat',
  32: 'barbecue meat', 33: 'pork belly', 34: 'salmon fillet', 35: 'Macrobrachium rosenbergii', 36: 'pork chop',
  37: 'fish fillet', 38: 'avocado',
};
