import React, { useState } from "react";
import { Link } from "react-router";
import { Users, Clock, ChevronRight, Info, TrendingUp, CheckCircle } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function GroupBuy() {
  const [activeTab, setActiveTab] = useState("Đang diễn ra");

  const activeDeals = [
    {
      id: 1,
      name: "Cải bó xôi Đà Lạt VietGAP",
      farm: "Vườn rau chú Năm, Đức Trọng",
      retailPrice: 45000,
      groupPrice: 28000,
      totalNeeded: 50,
      currentCount: 35,
      unit: "kg",
      endTime: "04:23:15",
      image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      status: "active"
    },
    {
      id: 2,
      name: "Nho mẫu đơn Mộc Châu",
      farm: "HTX Nông nghiệp Xanh",
      retailPrice: 250000,
      groupPrice: 180000,
      totalNeeded: 20,
      currentCount: 18,
      unit: "hộp 500g",
      endTime: "01:15:30",
      image: "https://images.unsplash.com/photo-1596365548074-ce44bd83deaa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      status: "hot"
    },
    {
      id: 3,
      name: "Sầu riêng Ri6 vườn nhà",
      farm: "Nhà vườn cô Ba, Bến Tre",
      retailPrice: 120000,
      groupPrice: 85000,
      totalNeeded: 100,
      currentCount: 42,
      unit: "kg",
      endTime: "12:45:00",
      image: "https://images.unsplash.com/photo-1528825871115-3581a5387919?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      status: "active"
    },
    {
      id: 4,
      name: "Cà chua Cherry Thủy Canh",
      farm: "Farm Cầu Đất",
      retailPrice: 65000,
      groupPrice: 42000,
      totalNeeded: 30,
      currentCount: 30,
      unit: "kg",
      endTime: "00:00:00",
      image: "https://images.unsplash.com/photo-1524593166156-312f362cada0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      status: "success"
    }
  ];

  return (
    <div className="bg-[#F0FDF4] min-h-screen pb-16">
      {/* Hero Banner */}
      <div className="relative h-[280px] w-full bg-[#1B4332] overflow-hidden">
        <ImageWithFallback 
          src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80&w=1200" 
          alt="Group Buy" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Users className="w-4 h-4" />
            Cộng đồng mua sỉ FarmTable
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Mua Chung - Giá Sỉ</h1>
          <p className="text-lg text-white/90 max-w-2xl">
            Gom đơn trực tiếp từ nhà vườn, cắt giảm khâu trung gian để nhận giá cực tốt cho nông sản tươi mới mỗi ngày.
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 -mt-8 relative z-10">
        {/* Stats Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Người đang tham gia</p>
              <p className="text-2xl font-bold text-[#1F2937]">1,284</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-[#40916C]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Tiết kiệm trung bình</p>
              <p className="text-2xl font-bold text-[#1F2937]">35%</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Phiên đã thành công</p>
              <p className="text-2xl font-bold text-[#1F2937]">856</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-bold text-[#1B4332] mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Cách thức hoạt động
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="font-bold text-[#40916C] mb-1">1. Chọn sản phẩm</div>
              <p className="text-gray-600">Tìm sản phẩm đang mở bán gom chung từ các nông trại.</p>
            </div>
            <div>
              <div className="font-bold text-[#40916C] mb-1">2. Đặt cọc</div>
              <p className="text-gray-600">Thanh toán cọc 20% để giữ chỗ và xác nhận tham gia.</p>
            </div>
            <div>
              <div className="font-bold text-[#40916C] mb-1">3. Chờ gom đủ đơn</div>
              <p className="text-gray-600">Khi đủ số lượng, nhà vườn sẽ tiến hành thu hoạch ngay.</p>
            </div>
            <div>
              <div className="font-bold text-[#40916C] mb-1">4. Nhận hàng tươi</div>
              <p className="text-gray-600">Giao đến tận tay bạn trong vòng 24h sau thu hoạch.</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-8">
          {["Đang diễn ra", "Sắp mở bán", "Đã hoàn thành"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-medium transition-colors relative ${activeTab === tab ? 'text-[#40916C]' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#40916C] rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>

        {/* Deal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeDeals.map(deal => {
            const progress = (deal.currentCount / deal.totalNeeded) * 100;
            return (
              <div key={deal.id} className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col ${deal.status === 'success' ? 'opacity-75' : ''}`}>
                <div className="flex gap-4 mb-4">
                  <div className="w-[100px] h-[100px] shrink-0 rounded-xl overflow-hidden relative">
                    {deal.status === 'hot' && (
                      <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg z-10">
                        HOT
                      </div>
                    )}
                    {deal.status === 'success' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <div className="bg-[#40916C] text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Thành công
                        </div>
                      </div>
                    )}
                    <ImageWithFallback src={deal.image} alt={deal.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#1F2937] leading-tight mb-1">{deal.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{deal.farm}</p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-[#F97316]">{deal.groupPrice.toLocaleString('vi-VN')}đ</span>
                      <span className="text-xs text-gray-500 font-medium">/{deal.unit}</span>
                    </div>
                    <p className="text-xs text-gray-400 line-through">Giá lẻ: {deal.retailPrice.toLocaleString('vi-VN')}đ</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-auto">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-[#1B4332]">Đã gom: {deal.currentCount}/{deal.totalNeeded} {deal.unit}</span>
                    <span className="text-gray-500">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div 
                      className={`h-full rounded-full ${deal.status === 'success' ? 'bg-[#40916C]' : 'bg-[#F97316]'}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5" />
                      {deal.status === 'success' ? 'Đã chốt sổ' : `Còn ${deal.endTime}`}
                    </div>
                    
                    <button 
                      disabled={deal.status === 'success'}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                        deal.status === 'success' 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1B4332] hover:bg-[#2D6A4F] text-white'
                      }`}
                    >
                      {deal.status === 'success' ? 'Xem chi tiết' : 'Tham gia ngay'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
