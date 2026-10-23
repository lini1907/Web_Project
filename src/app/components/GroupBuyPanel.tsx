import React from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function GroupBuyPanel() {
  const campaigns = [
    {
      id: 1,
      name: "Táo đỏ New Zealand",
      farm: "Nhập khẩu chính ngạch",
      price: "65.000đ",
      oldPrice: "90.000đ",
      target: 20,
      current: 15,
      timeLeft: "04:12:30",
      image: "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWQlMjBhcHBsZXMlMjBmcmVzaHxlbnwxfHx8fDE3ODE1OTI4Mjd8MA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 2,
      name: "Khoai lang mật Tà Nung",
      farm: "Nông trại Chú Sáu",
      price: "25.000đ",
      oldPrice: "40.000đ",
      target: 50,
      current: 42,
      timeLeft: "12:05:15",
      image: "https://images.unsplash.com/photo-1730815048561-45df6f7f331d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzd2VldCUyMHBvdGF0b2VzJTIwZnJlc2h8ZW58MXx8fHwxNzgxNjYyNzg3fDA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      id: 3,
      name: "Cam sành Vĩnh Long",
      farm: "Vườn cam Hai lúa",
      price: "15.000đ",
      oldPrice: "25.000đ",
      target: 100,
      current: 24,
      timeLeft: "21:45:00",
      image: "https://images.unsplash.com/photo-1593278684776-62f6e2dc7604?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMG9yYW5nZXMlMjBiYXNrZXR8ZW58MXx8fHwxNzgxNjYyNzg5fDA&ixlib=rb-4.1.0&q=80&w=1080"
    }
  ];

  return (
    <section className="bg-white py-[64px]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        <h2 className="text-[32px] font-semibold text-[#1B4332] mb-8 flex items-center gap-3">
          Phòng mua chung đang hoạt động
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </h2>
        
        <div className="flex overflow-x-auto pb-6 gap-6 no-scrollbar snap-x">
          {campaigns.map(item => {
            const progress = (item.current / item.target) * 100;
            return (
              <div key={item.id} className="snap-start flex-shrink-0 w-[360px] bg-white border border-[#E5E7EB] rounded-[12px] p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-[100px] h-[100px] rounded-[8px] overflow-hidden bg-gray-50 flex-shrink-0">
                  <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 flex flex-col">
                  <h3 className="font-semibold text-[16px] text-[#1F2937] leading-tight mb-1">{item.name}</h3>
                  <p className="text-[12px] text-[#4B5563] mb-2">{item.farm}</p>
                  
                  <div className="w-full mb-2">
                    <div className="flex justify-between text-[11px] text-[#4B5563] font-medium mb-1">
                      <span>Đã gom {item.current}/{item.target} kg</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#40916C] rounded-full shadow-[0_0_8px_#40916C80] animate-pulse" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between mt-auto">
                    <div>
                      <div className="text-red-500 font-bold text-[12px] mb-0.5">{item.timeLeft} ⏰</div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[14px] text-[#1B4332]">{item.price}</span>
                        <span className="text-[11px] text-gray-400 line-through">{item.oldPrice}</span>
                      </div>
                    </div>
                    <button className="bg-[#40916C] hover:bg-[#2D6A4F] text-white text-[12px] font-semibold px-4 py-1.5 rounded-[6px] transition-colors">
                      Tham gia
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
