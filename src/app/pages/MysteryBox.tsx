import React from "react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Link } from "react-router";

export function MysteryBox() {
  const boxes = [
    {
      id: 1,
      name: "Mystery Box Rau Lá",
      desc: "3kg rau ăn lá theo mùa từ các nông trại Đà Lạt. Đảm bảo tươi ngon và bất ngờ!",
      price: "85.000đ",
      value: "120.000đ",
      left: 12,
      image: "https://images.unsplash.com/photo-1656543802898-41c8c46683a7?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: 2,
      name: "Mystery Box Trái Cây",
      desc: "5kg trái cây đa dạng vùng miền. Cung cấp đủ vitamin cho cả tuần.",
      price: "150.000đ",
      value: "220.000đ",
      left: 5,
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: 3,
      name: "Mystery Box Tổng Hợp",
      desc: "Hộp lớn 7kg bao gồm rau củ, trái cây và gia vị. Phù hợp gia đình 4 người.",
      price: "250.000đ",
      value: "350.000đ",
      left: 20,
      image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=800"
    }
  ];

  return (
    <div className="bg-[#FAF5FF] min-h-screen">
      {/* Banner */}
      <div className="relative h-[280px] w-full bg-[#5B21B6] overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }}></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4 text-center">
          <span className="bg-[#7C3AED] text-white px-4 py-1 rounded-full text-sm font-bold uppercase mb-4 shadow-sm border border-purple-400">
            Hộp Quà Bất Ngờ
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-md">Mystery Box</h1>
          <p className="text-lg text-purple-100 max-w-2xl">
            Tiết kiệm chi phí, khám phá nông sản mới mỗi tuần với những chiếc hộp bí ẩn chứa đầy sự bất ngờ tươi ngon.
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#1F2937] mb-4">Chọn hộp bí ẩn của bạn</h2>
          <p className="text-gray-600 max-w-xl mx-auto">Mỗi hộp là một sự kết hợp ngẫu nhiên của các nông sản đạt chuẩn chất lượng từ mạng lưới nông trại đối tác của FarmTable.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {boxes.map(box => (
            <div key={box.id} className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-100 relative group overflow-hidden hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-6 bg-purple-100/50">
                <div className="absolute top-3 right-3 z-10 bg-white text-[#7C3AED] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Còn {box.left} hộp
                </div>
                <ImageWithFallback 
                  src={box.image} 
                  alt={box.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
              </div>

              <div className="flex flex-col h-[calc(100%-200px)]">
                <h3 className="text-xl font-bold text-[#1F2937] mb-2">{box.name}</h3>
                <p className="text-sm text-gray-600 mb-6 flex-1">{box.desc}</p>
                
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Giá trị thực: <span className="line-through">{box.value}</span></div>
                    <div className="text-2xl font-bold text-[#7C3AED]">{box.price}</div>
                  </div>
                </div>

                <Link to="/gio-hang" className="w-full block text-center py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold transition-colors shadow-lg shadow-purple-500/20">
                  Thêm vào giỏ
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-20 bg-white rounded-3xl p-8 md:p-12 border border-purple-100">
          <h2 className="text-2xl font-bold text-center text-[#1F2937] mb-10">Mystery Box hoạt động thế nào?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-16 h-16 bg-purple-100 text-[#7C3AED] text-2xl font-bold rounded-2xl flex items-center justify-center mx-auto mb-4">1</div>
              <h3 className="font-bold text-[#1F2937] mb-2">Bạn chọn kích cỡ</h3>
              <p className="text-sm text-gray-600">Chọn loại hộp (rau, trái cây, tổng hợp) và ngân sách phù hợp.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-purple-100 text-[#7C3AED] text-2xl font-bold rounded-2xl flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className="font-bold text-[#1F2937] mb-2">FarmTable lựa chọn</h3>
              <p className="text-sm text-gray-600">Chúng tôi gom những nông sản tươi ngon nhất vừa thu hoạch trong ngày.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-purple-100 text-[#7C3AED] text-2xl font-bold rounded-2xl flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className="font-bold text-[#1F2937] mb-2">Nhận sự bất ngờ</h3>
              <p className="text-sm text-gray-600">Giao hàng tận nơi với mức giá luôn thấp hơn giá trị thực của nông sản.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}