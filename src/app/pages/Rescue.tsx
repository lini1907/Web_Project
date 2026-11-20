import React from "react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Link } from "react-router";

export function Rescue() {
  const rescueItems = [
    {
      id: 1,
      name: "Cà rốt gãy/nhỏ",
      farm: "HTX Nông nghiệp Đức Trọng",
      price: "15.000đ",
      oldPrice: "30.000đ",
      image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=600",
      reason: "Sai kích cỡ chuẩn siêu thị"
    },
    {
      id: 2,
      name: "Khoai tây sứt sẹo",
      farm: "Nông trại Chú Sáu",
      price: "18.000đ",
      oldPrice: "35.000đ",
      image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600",
      reason: "Vỏ trầy xước trong quá trình thu hoạch"
    },
    {
      id: 3,
      name: "Cà chua bi chín không đều",
      farm: "Đà Lạt Xanh",
      price: "20.000đ",
      oldPrice: "45.000đ",
      image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600",
      reason: "Màu sắc không đồng đều"
    },
    {
      id: 4,
      name: "Bắp cải thủng lá ngoài",
      farm: "Vườn rau hữu cơ Mai Anh",
      price: "10.000đ",
      oldPrice: "25.000đ",
      image: "https://images.unsplash.com/photo-1596265371388-43edbaadab94?auto=format&fit=crop&q=80&w=600",
      reason: "Lá ngoài bị sâu cắn nhẹ, không xịt thuốc"
    }
  ];

  return (
    <div className="bg-[#FFF4ED] min-h-screen">
      {/* Banner */}
      <div className="relative h-[300px] w-full bg-[#F97316] overflow-hidden">
        <ImageWithFallback 
          src="https://images.unsplash.com/photo-1605852504285-055eeadcb41d?auto=format&fit=crop&q=80&w=1200" 
          alt="Giải cứu nông sản" 
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4 text-center">
          <span className="bg-white text-[#F97316] px-4 py-1 rounded-full text-sm font-bold uppercase mb-4 shadow-sm">
            Chiến dịch mỗi ngày
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-md">Giải Cứu Nông Sản Xấu Mã</h1>
          <p className="text-lg text-white/95 max-w-2xl font-medium">
            Vẻ ngoài không hoàn hảo nhưng chất lượng và hương vị vẫn tuyệt đối. 
            Cùng FarmTable giảm lãng phí thực phẩm và ủng hộ người nông dân!
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1F2937]">Nông sản cần giải cứu hôm nay</h2>
            <p className="text-gray-600 mt-1">Cập nhật lúc 06:00 sáng. Số lượng có hạn.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rescueItems.map((item) => (
            <div key={item.id} className="group flex flex-col bg-white rounded-[16px] p-4 shadow-sm hover:shadow-xl border border-orange-100 transition-all duration-300">
              <Link to={`/san-pham/${item.id}`} className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-orange-50 block">
                <div className="absolute top-2 left-2 z-10 bg-[#D8F3DC] text-[#1B4332] text-[12px] font-bold px-2 py-1 rounded-full uppercase shadow-sm">
                  Giải cứu
                </div>
                <div className="absolute top-2 right-2 z-10 bg-[#F97316] text-white text-[12px] font-bold px-2 py-1 rounded-full shadow-sm">
                  -{(100 - (parseInt(item.price.replace(/\D/g, '')) / parseInt(item.oldPrice.replace(/\D/g, '')) * 100)).toFixed(0)}%
                </div>
                <ImageWithFallback 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </Link>
              
              <div className="flex-1 flex flex-col">
                <Link to={`/san-pham/${item.id}`} className="hover:text-[#F97316] transition-colors">
                  <h3 className="font-semibold text-[18px] text-[#1F2937] leading-tight mb-1">{item.name}</h3>
                </Link>
                <p className="text-[14px] text-gray-500 mb-2">{item.farm}</p>
                
                <div className="bg-orange-50 text-orange-800 text-[12px] p-2 rounded-lg mb-4 border border-orange-100">
                  <span className="font-semibold">Lý do: </span>{item.reason}
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[20px] text-[#F97316]">{item.price}<span className="text-[14px] font-normal text-gray-500">/kg</span></span>
                    <span className="text-[14px] text-gray-400 line-through">{item.oldPrice}</span>
                  </div>
                  <button className="w-full h-[40px] bg-[#F97316] hover:bg-[#ea580c] text-white rounded-lg font-semibold text-[14px] transition-colors shadow-md shadow-orange-500/20">
                    Thêm vào giỏ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-orange-100/50 rounded-2xl p-8 border border-orange-200">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-[#1F2937] mb-4">Vì sao nên chọn nông sản xấu mã?</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="text-[#F97316] font-bold">✓</span> 
                  Chất lượng và hàm lượng dinh dưỡng hoàn toàn tương đương nông sản loại 1.
                </li>
                <li className="flex gap-3">
                  <span className="text-[#F97316] font-bold">✓</span> 
                  Giúp người nông dân không bị ép giá hoặc vứt bỏ mồ hôi công sức của mình.
                </li>
                <li className="flex gap-3">
                  <span className="text-[#F97316] font-bold">✓</span> 
                  Tiết kiệm đến 50% chi phí cho bữa ăn hàng ngày của gia đình bạn.
                </li>
                <li className="flex gap-3">
                  <span className="text-[#F97316] font-bold">✓</span> 
                  Góp phần bảo vệ môi trường, giảm phát thải khí nhà kính từ rác thải thực phẩm.
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/3 aspect-square rounded-2xl overflow-hidden shadow-lg border-4 border-white">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1508595165502-3e0e7a177fa9?auto=format&fit=crop&q=80&w=800" 
                alt="Nông dân thu hoạch" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}