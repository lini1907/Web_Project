import React from "react";
import { MapPin, Leaf, Star, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Link } from "react-router";

export function Farm() {
  const farms = [
    {
      id: 1,
      name: "Nông trại Đà Lạt Xanh",
      location: "Lâm Đồng",
      type: "Hữu cơ (Organic)",
      rating: 4.9,
      reviews: 128,
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      avatar: "https://images.unsplash.com/photo-1595878715977-2e8f8df18ea8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200",
      description: "Chuyên cung cấp các loại rau củ xứ lạnh trồng theo phương pháp hữu cơ 100%, không sử dụng phân bón hóa học và thuốc trừ sâu.",
      products: ["Cà chua bi", "Xà lách", "Súp lơ", "Dâu tây"]
    },
    {
      id: 2,
      name: "HTX Nông nghiệp Đức Trọng",
      location: "Lâm Đồng",
      type: "VietGAP",
      rating: 4.7,
      reviews: 85,
      image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      avatar: "https://images.unsplash.com/photo-1560493676-04071c5f467b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200",
      description: "Hợp tác xã với hơn 50 hộ nông dân liên kết, áp dụng công nghệ tưới nhỏ giọt và nhà màng đạt chuẩn VietGAP.",
      products: ["Ớt chuông", "Dưa leo", "Cà rốt", "Hành tây"]
    },
    {
      id: 3,
      name: "Miệt vườn Cô Ba",
      location: "Bến Tre",
      type: "Thuận tự nhiên",
      rating: 4.8,
      reviews: 210,
      image: "https://images.unsplash.com/photo-1581001479541-1f9e2b173bf3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      avatar: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200",
      description: "Vườn cây ăn trái hơn 20 năm tuổi, canh tác hoàn toàn thuận tự nhiên, để cỏ mọc và sử dụng phân bón ủ từ phế phẩm nông nghiệp.",
      products: ["Bưởi da xanh", "Sầu riêng", "Dừa sáp", "Chôm chôm"]
    },
    {
      id: 4,
      name: "Vườn rau Củ Chi",
      location: "TP. Hồ Chí Minh",
      type: "VietGAP",
      rating: 4.6,
      reviews: 56,
      image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      avatar: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200",
      description: "Trang trại thủy canh hiện đại ngay ngoại thành TP.HCM, cung cấp rau ăn lá tươi mới thu hoạch trong ngày.",
      products: ["Cải ngọt", "Cải bẹ xanh", "Mồng tơi", "Rau muống"]
    }
  ];

  return (
    <div className="bg-[#F0FDF4] min-h-screen pb-16">
      {/* Hero Section */}
      <div className="relative h-[320px] w-full bg-[#2D6A4F] overflow-hidden">
        <ImageWithFallback 
          src="https://images.unsplash.com/photo-1495908333438-5f6406e23351?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200" 
          alt="Nông trại đối tác" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4 text-center">
          <Leaf className="w-10 h-10 mb-4 text-green-300" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Mạng lưới Nông trại</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl">
            Làm quen với những người nông dân tâm huyết đằng sau mỗi sản phẩm trên bàn ăn của gia đình bạn.
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 -mt-10 relative z-10">
        {/* Search & Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {["Tất cả", "Lâm Đồng", "Tây Nam Bộ", "Đông Nam Bộ", "Tây Nguyên"].map((region, i) => (
              <button 
                key={region}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${i === 0 ? 'bg-[#1B4332] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                {region}
              </button>
            ))}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select className="bg-gray-50 border border-gray-200 text-sm text-[#1F2937] py-2 px-4 rounded-xl focus:outline-none focus:border-[#40916C]">
              <option>Chuẩn canh tác</option>
              <option>Hữu cơ (Organic)</option>
              <option>VietGAP</option>
              <option>Thuận tự nhiên</option>
            </select>
          </div>
        </div>

        {/* Farm List */}
        <div className="flex flex-col gap-6">
          {farms.map((farm) => (
            <div key={farm.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
              {/* Farm Image */}
              <div className="w-full md:w-[300px] h-[200px] md:h-auto rounded-2xl overflow-hidden shrink-0 relative">
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-[#1B4332] flex items-center gap-1 z-10 shadow-sm">
                  <Leaf className="w-3 h-3 text-[#40916C]" />
                  {farm.type}
                </div>
                <ImageWithFallback src={farm.image} alt={farm.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>

              {/* Farm Info */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1F2937] mb-2">{farm.name}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-[#40916C]" />
                        {farm.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-medium text-[#1F2937]">{farm.rating}</span>
                        <span>({farm.reviews} đánh giá)</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-green-100 hidden sm:block">
                    <ImageWithFallback src={farm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2 md:line-clamp-none">
                  {farm.description}
                </p>

                <div className="mb-6">
                  <span className="text-xs font-medium text-gray-500 mb-2 block">Sản phẩm tiêu biểu:</span>
                  <div className="flex flex-wrap gap-2">
                    {farm.products.map(prod => (
                      <span key={prod} className="bg-green-50 text-[#1B4332] text-xs font-medium px-2.5 py-1 rounded-md">
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex justify-end">
                  <Link to={`/nong-trai/${farm.id}`} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-sm font-bold transition-colors">
                    Thăm nông trại <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Load More */}
        <div className="mt-10 flex justify-center">
          <button className="px-6 py-3 border-2 border-[#1B4332] text-[#1B4332] rounded-xl font-bold hover:bg-[#1B4332] hover:text-white transition-colors">
            Xem thêm nông trại
          </button>
        </div>
      </div>
    </div>
  );
}
