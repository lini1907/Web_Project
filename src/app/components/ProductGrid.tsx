import React, { useState } from "react";
import { Link } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const TABS = ["Tất cả", "Rau củ", "Trái cây", "Herbs", "Giải cứu"];

export function ProductGrid() {
  const [activeTab, setActiveTab] = useState("Tất cả");

  return (
    <section className="bg-white py-[64px]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        <h2 className="text-[32px] font-semibold text-[#1B4332] mb-8">
          Nông sản nổi bật hôm nay
        </h2>
        
        {/* Filter Tabs */}
        <div className="flex overflow-x-auto pb-4 mb-8 gap-2 no-scrollbar">
          {TABS.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-6 py-2 rounded-full font-semibold text-[16px] transition-colors
                ${activeTab === tab 
                  ? "bg-[#1B4332] text-white" 
                  : "bg-[#F8F3EC] text-[#4B5563] hover:bg-gray-200"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card Type A — Normal Product */}
          <div className="group flex flex-col bg-white rounded-[12px] p-4 shadow-[0_4px_16px_0_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-[0_8px_24px_0_rgba(0,0,0,0.1)] transition-all">
            <Link to="/san-pham/1" className="relative aspect-square rounded-[10px] overflow-hidden mb-4 bg-gray-50 block">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1524593166156-312f362cada0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGNoZXJyeSUyMHRvbWF0b2VzfGVufDF8fHx8MTc4MTY2Mjc3Mnww&ixlib=rb-4.1.0&q=80&w=1080" 
                alt="Cà chua bi hữu cơ" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </Link>
            <div className="flex-1 flex flex-col">
              <Link to="/san-pham/1" className="hover:text-[#40916C]">
                <h3 className="font-semibold text-[18px] text-[#1F2937] leading-tight mb-1 transition-colors">Cà chua bi hữu cơ</h3>
              </Link>
              <p className="text-[14px] text-[#4B5563] mb-3">Nông trại Đà Lạt Xanh</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="font-bold text-[18px] text-[#40916C]">45.000đ<span className="text-[14px] text-gray-500 font-normal">/kg</span></span>
              </div>
              <button className="w-full mt-4 h-[40px] bg-[#40916C] hover:bg-[#2D6A4F] text-white rounded-[8px] font-semibold text-[14px] transition-colors">
                Thêm vào giỏ
              </button>
            </div>
          </div>

          {/* Card Type B — Imperfect */}
          <div className="group flex flex-col bg-white rounded-[12px] p-4 shadow-[0_4px_16px_0_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-[0_8px_24px_0_rgba(0,0,0,0.1)] transition-all">
            <Link to="/san-pham/2" className="relative aspect-square rounded-[10px] overflow-hidden mb-4 bg-gray-50 block">
              <div className="absolute top-2 left-2 z-10 bg-[#D8F3DC] text-[#1B4332] text-[12px] font-bold px-2 py-1 rounded-full uppercase">
                Giải cứu
              </div>
              <div className="absolute top-2 right-2 z-10 bg-[#F97316] text-white text-[12px] font-bold px-2 py-1 rounded-full">
                -40%
              </div>
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1Z2x5JTIwY2Fycm90cyUyMGZyZXNofGVufDF8fHx8MTc4MTY2Mjc3NXww&ixlib=rb-4.1.0&q=80&w=1080" 
                alt="Cà rốt xấu mã" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </Link>
            <div className="flex-1 flex flex-col">
              <Link to="/san-pham/2" className="hover:text-[#40916C]">
                <h3 className="font-semibold text-[18px] text-[#1F2937] leading-tight mb-1 transition-colors">Cà rốt xấu mã</h3>
              </Link>
              <p className="text-[14px] text-[#4B5563] mb-3">HTX Nông nghiệp Đức Trọng</p>
              <div className="mt-auto flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[18px] text-[#F97316]">24.000đ<span className="text-[14px] font-normal">/kg</span></span>
                  <span className="text-[14px] text-gray-400 line-through">40.000đ</span>
                </div>
              </div>
              <button className="w-full mt-4 h-[40px] bg-[#40916C] hover:bg-[#2D6A4F] text-white rounded-[8px] font-semibold text-[14px] transition-colors">
                Thêm vào giỏ
              </button>
            </div>
          </div>

          {/* Card Type C — Mystery Box */}
          <div className="group flex flex-col bg-white rounded-[12px] p-4 shadow-[0_4px_16px_0_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-[0_8px_24px_0_rgba(0,0,0,0.1)] transition-all">
            <div className="relative aspect-square rounded-[10px] overflow-hidden mb-4 bg-purple-50">
              <div className="absolute top-2 left-2 z-10 bg-[#7C3AED] text-white text-[12px] font-bold px-2 py-1 rounded-full uppercase">
                Bí ẩn
              </div>
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1656543802898-41c8c46683a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXJkYm9hcmQlMjBib3glMjBjbG9zZWR8ZW58MXx8fHwxNzgxNjYyNzc4fDA&ixlib=rb-4.1.0&q=80&w=1080" 
                alt="Combo Rau Lá Mùa Hè" 
                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <h3 className="font-semibold text-[18px] text-[#1F2937] leading-tight mb-1">Combo Rau Lá Mùa Hè 3kg</h3>
              <p className="text-[14px] text-[#7C3AED] mb-2 font-medium">Thành phần bí ẩn theo mùa 🌿</p>
              <div className="mt-auto">
                <span className="text-[12px] font-semibold text-[#F97316] bg-orange-50 px-2 py-1 rounded flex items-center w-max mb-2">
                  ⚠ Còn 5 hộp
                </span>
                <span className="font-bold text-[18px] text-[#1F2937]">85.000đ<span className="text-[14px] text-gray-500 font-normal">/hộp</span></span>
              </div>
              <button className="w-full mt-4 h-[40px] border-2 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-[8px] font-semibold text-[14px] transition-colors">
                Mở hộp bí ẩn
              </button>
            </div>
          </div>

          {/* Card Type D — Group Buy */}
          <div className="group flex flex-col bg-white rounded-[12px] p-4 shadow-[0_4px_16px_0_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-[0_8px_24px_0_rgba(0,0,0,0.1)] transition-all">
            <div className="relative aspect-square rounded-[10px] overflow-hidden mb-4 bg-gray-50">
              <div className="absolute top-2 left-2 z-10 bg-[#F97316] text-white text-[12px] font-bold px-2 py-1 rounded-full uppercase">
                Mua chung
              </div>
              <div className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur text-red-600 text-[12px] font-bold px-2 py-1 rounded-full shadow-sm">
                14:23:07 ⏰
              </div>
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1685504513848-df0dd6893cec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaXhlZCUyMGxlYWZ5JTIwZ3JlZW5zJTIwZnJlc2h8ZW58MXx8fHwxNzgxNjYyNzgxfDA&ixlib=rb-4.1.0&q=80&w=1080" 
                alt="Rau xanh các loại" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Progress bar overlay at bottom of image */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur p-2">
                <div className="flex justify-between text-[10px] text-[#1B4332] font-bold mb-1">
                  <span>Đã gom 6/10 kg</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#40916C] w-[60%] rounded-full shadow-[0_0_8px_#40916C80] animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <h3 className="font-semibold text-[18px] text-[#1F2937] leading-tight mb-1">Cải xanh VietGAP</h3>
              <p className="text-[14px] text-[#4B5563] mb-3">Nông trại Rau sạch 3 Miền</p>
              <div className="mt-auto flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[18px] text-[#1B4332]">35.000đ<span className="text-[12px] text-[#F97316] ml-1 font-semibold">(giá sỉ)</span></span>
                </div>
                <span className="text-[14px] text-gray-400 line-through">50.000đ/kg</span>
              </div>
              <button className="w-full mt-4 h-[40px] bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-[8px] font-semibold text-[14px] transition-colors">
                Tham gia gom
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
