import React from "react";
import { Carrot, Package, Users } from "lucide-react";
import { Link } from "react-router";

export function Features() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-8 py-16 md:py-[64px]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card A — "Nông Sản Xấu Mã" */}
        <div className="bg-white rounded-[16px] p-6 shadow-[0_4px_16px_0_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col items-start gap-4 hover:-translate-y-1 transition-transform duration-300">
          <div className="bg-[#D8F3DC] text-[#1B4332] text-[12px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Giải cứu
          </div>
          <div className="w-12 h-12 bg-[#F0FAF3] rounded-full flex items-center justify-center text-[#40916C]">
            <Carrot className="w-6 h-6" />
          </div>
          <h3 className="text-[#1B4332] text-[24px] font-semibold leading-tight mt-2">
            Nông sản xấu mã<br/>Giảm 30–50%
          </h3>
          <p className="text-[#4B5563] text-[16px] flex-1">
            Hình thức không hoàn hảo, chất lượng vẫn đảm bảo. Cùng nhau giảm lãng phí thực phẩm.
          </p>
          <Link to="/giai-cuu" className="w-full mt-4 flex items-center justify-center h-[44px] rounded-[8px] font-semibold text-[16px] text-[#40916C] border-2 border-[#40916C] hover:bg-[#40916C] hover:text-white transition-colors">
            Xem sản phẩm
          </Link>
        </div>

        {/* Card B — "Hộp Quà Bí Ẩn" */}
        <div className="bg-white rounded-[16px] p-6 shadow-[0_4px_16px_0_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col items-start gap-4 hover:-translate-y-1 transition-transform duration-300">
          <div className="bg-[#7C3AED] text-white text-[12px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Bí ẩn
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-[#7C3AED]">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-[#1B4332] text-[24px] font-semibold leading-tight mt-2">
            Mystery Box<br/>Combo bất ngờ
          </h3>
          <p className="text-[#4B5563] text-[16px] flex-1">
            Hộp rau củ ngẫu nhiên theo mùa — bất ngờ thú vị, tiết kiệm tối đa.
          </p>
          <Link to="/hop-bi-an" className="w-full mt-4 flex items-center justify-center h-[44px] rounded-[8px] font-semibold text-[16px] text-[#7C3AED] border-2 border-[#7C3AED] hover:bg-[#7C3AED] hover:text-white transition-colors">
            Khám phá hộp
          </Link>
        </div>

        {/* Card C — "Mua Chung" */}
        <div className="bg-white rounded-[16px] p-6 shadow-[0_4px_16px_0_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col items-start gap-4 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex w-full justify-between items-start">
            <div className="bg-[#F97316] text-white text-[12px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Đang gom
            </div>
            <div className="text-red-500 font-bold text-[14px]">
              Còn 14:23:07
            </div>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#F97316]">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-[#1B4332] text-[24px] font-semibold leading-tight mt-2">
            Mua Chung<br/>Giá sỉ ưu đãi
          </h3>
          <p className="text-[#4B5563] text-[16px]">
            Cùng hàng xóm gom đơn 24h để đạt giá sỉ từ nhà vườn, không cần qua đại lý.
          </p>
          
          <div className="w-full mt-2">
            <div className="flex justify-between text-[12px] text-[#4B5563] mb-1 font-medium">
              <span>Đã gom 6/10 kg</span>
              <span>60%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#40916C] w-[60%] rounded-full shadow-[0_0_8px_#40916C80] animate-pulse"></div>
            </div>
          </div>

          <Link to="/mua-chung" className="w-full mt-auto flex items-center justify-center h-[44px] rounded-[8px] font-semibold text-[16px] bg-[#40916C] hover:bg-[#2D6A4F] text-white transition-colors">
            Tham gia phòng
          </Link>
        </div>

      </div>
    </section>
  );
}