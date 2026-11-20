import React from "react";
import { Link } from "react-router";
import { Star, Truck, ShieldCheck, ArrowLeft, Heart, ShoppingCart, Minus, Plus } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function ProductDetail() {
  return (
    <div className="bg-white min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="bg-[#F8F3EC] py-3">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex items-center gap-2 text-[14px] text-gray-500">
          <Link to="/" className="hover:text-[#40916C]">Trang chủ</Link>
          <span>/</span>
          <Link to="/san-pham" className="hover:text-[#40916C]">Sản phẩm</Link>
          <span>/</span>
          <span className="text-[#1B4332] font-semibold">Cà chua bi hữu cơ</span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 mt-8">
        <Link to="/san-pham" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#40916C] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Images */}
          <div className="flex flex-col gap-4">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1524593166156-312f362cada0?auto=format&fit=crop&q=80&w=800" 
                alt="Cà chua bi hữu cơ" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[#40916C] cursor-pointer bg-gray-50 transition-colors">
                  <ImageWithFallback 
                    src={`https://images.unsplash.com/photo-1524593166156-312f362cada0?auto=format&fit=crop&q=80&w=200&sig=${i}`} 
                    alt="Thumbnail" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="mb-2">
              <span className="bg-[#D8F3DC] text-[#1B4332] text-[12px] font-bold px-3 py-1 rounded-full uppercase">
                Hữu cơ
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Cà chua bi hữu cơ Đà Lạt</h1>
            <p className="text-gray-500 mb-4">Cung cấp bởi: <span className="font-semibold text-[#40916C]">Nông trại Đà Lạt Xanh</span></p>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex text-[#F59E0B]">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-5 h-5 fill-current" />)}
              </div>
              <span className="text-gray-500 text-sm">(124 đánh giá) • Đã bán 2.1k kg</span>
            </div>

            <div className="bg-[#F8F3EC] p-6 rounded-xl mb-6">
              <div className="text-3xl font-bold text-[#40916C] mb-1">
                45.000đ <span className="text-lg text-gray-500 font-normal">/kg</span>
              </div>
              <p className="text-sm text-[#F97316]">Khuyến mãi: Tặng 1 hộp rau mầm khi mua từ 3kg</p>
            </div>

            <p className="text-gray-600 leading-relaxed mb-8">
              Cà chua bi được trồng theo phương pháp hữu cơ, không sử dụng thuốc trừ sâu hóa học. Vị ngọt thanh, mọng nước, rất thích hợp làm salad hoặc ăn sống trực tiếp.
            </p>

            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center border border-gray-200 rounded-lg bg-white h-12">
                <button className="w-12 h-full flex items-center justify-center text-gray-600 hover:text-[#40916C] hover:bg-gray-50 rounded-l-lg transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium text-lg border-x border-gray-200">1</span>
                <button className="w-12 h-full flex items-center justify-center text-gray-600 hover:text-[#40916C] hover:bg-gray-50 rounded-r-lg transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="text-gray-500">
                Còn <span className="font-semibold text-gray-800">45kg</span> sẵn sàng giao
              </div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <button className="flex-1 h-14 bg-[#40916C] hover:bg-[#2D6A4F] text-white rounded-xl font-bold text-[16px] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#40916C]/20">
                <ShoppingCart className="w-5 h-5" /> Thêm vào giỏ
              </button>
              <button className="w-14 h-14 border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all bg-white">
                <Heart className="w-6 h-6" />
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F0FAF3] rounded-full flex items-center justify-center text-[#40916C] flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">Đổi trả 24h nếu hỏng</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F0FAF3] rounded-full flex items-center justify-center text-[#40916C] flex-shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">Giao trong 2h tại TP.HCM</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Description Tabs */}
        <div className="mt-16 border-t border-gray-100 pt-16">
          <div className="flex gap-8 border-b border-gray-200 mb-8 overflow-x-auto">
            <button className="pb-4 border-b-2 border-[#40916C] text-[#40916C] font-semibold whitespace-nowrap">Thông tin chi tiết</button>
            <button className="pb-4 border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium whitespace-nowrap">Nhà vườn</button>
            <button className="pb-4 border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium whitespace-nowrap">Đánh giá (124)</button>
          </div>
          <div className="prose max-w-none text-gray-600">
            <p>Cà chua bi hữu cơ được gieo trồng tại vùng đất Đà Lạt có khí hậu ôn hòa quanh năm. Quy trình trồng khép kín 100% không sử dụng phân bón hóa học hay thuốc bảo vệ thực vật.</p>
            <ul>
              <li><strong>Bảo quản:</strong> Ngăn mát tủ lạnh từ 3-5 ngày</li>
              <li><strong>Gợi ý chế biến:</strong> Ăn sống, làm salad, ép nước</li>
              <li><strong>Chứng nhận:</strong> VietGAP, GlobalGAP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
