import React, { useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Filter, ChevronDown, Check, Star } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Shop() {
  const [activeSort, setActiveSort] = useState("Mới nhất");
  const [priceRange, setPriceRange] = useState(500000);

  const products = [
    { id: 1, name: "Cà chua bi hữu cơ", farm: "Nông trại Đà Lạt Xanh", price: 45000, oldPrice: null, unit: "kg", image: "https://images.unsplash.com/photo-1524593166156-312f362cada0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", tags: ["Hữu cơ"] },
    { id: 2, name: "Cải bó xôi VietGAP", farm: "Vườn rau sạch Mộc Châu", price: 35000, oldPrice: 45000, unit: "kg", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", tags: ["VietGAP", "Khuyến mãi"] },
    { id: 3, name: "Dâu tây New Zealand", farm: "Dâu Tây Đà Lạt", price: 180000, oldPrice: 200000, unit: "hộp 500g", image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", tags: ["Bán chạy"] },
    { id: 4, name: "Cam sành Vĩnh Long", farm: "Miệt vườn Miền Tây", price: 25000, oldPrice: null, unit: "kg", image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", tags: [] },
    { id: 5, name: "Súp lơ xanh", farm: "Nông trại Đức Trọng", price: 40000, oldPrice: null, unit: "bắp", image: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", tags: ["VietGAP"] },
    { id: 6, name: "Nấm đùi gà", farm: "Trang trại nấm Việt", price: 65000, oldPrice: null, unit: "500g", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", tags: [] },
    { id: 7, name: "Thịt heo sạch CP", farm: "Trang trại CP", price: 120000, oldPrice: 140000, unit: "kg", image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", tags: ["Khuyến mãi"] },
    { id: 8, name: "Trứng gà thả vườn", farm: "Trại gà ta Gò Công", price: 45000, oldPrice: null, unit: "chục", image: "https://images.unsplash.com/photo-1598965675045-45c5e72c7d05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", tags: ["Hữu cơ"] },
    { id: 9, name: "Táo Fuji Nam Phi", farm: "Nhập khẩu", price: 85000, oldPrice: null, unit: "kg", image: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", tags: ["Bán chạy"] },
  ];

  return (
    <div className="bg-[#F0FDF4] min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="max-w-[1200px] mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-[#40916C]">Trang chủ</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-[#1F2937] font-medium">Tất cả sản phẩm</span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-[280px] shrink-0">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 font-bold text-lg text-[#1B4332] mb-6">
              <Filter className="w-5 h-5" />
              Bộ lọc sản phẩm
            </div>

            {/* Categories */}
            <div className="mb-8">
              <h3 className="font-bold text-[#1F2937] mb-4">Danh mục</h3>
              <div className="space-y-3">
                {["Rau củ quả", "Trái cây", "Thịt & Thủy sản", "Trứng & Sữa", "Thực phẩm khô", "Đồ uống"].map((cat, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${i === 0 ? 'bg-[#40916C] border-[#40916C]' : 'border-gray-300 group-hover:border-[#40916C]'}`}>
                      {i === 0 && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={`text-sm ${i === 0 ? 'text-[#40916C] font-medium' : 'text-gray-600 group-hover:text-[#40916C]'}`}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-8">
              <h3 className="font-bold text-[#1F2937] mb-4">Mức giá</h3>
              <div className="space-y-4">
                <input 
                  type="range" 
                  min="0" 
                  max="1000000" 
                  step="50000"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#40916C]"
                />
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>0đ</span>
                  <span className="font-medium text-[#40916C]">{priceRange.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>

            {/* Certifications */}
            <div className="mb-8">
              <h3 className="font-bold text-[#1F2937] mb-4">Chứng nhận</h3>
              <div className="space-y-3">
                {["Chuẩn VietGAP", "Hữu cơ (Organic)", "GlobalGAP", "Canh tác thuận tự nhiên"].map((cert, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center transition-colors group-hover:border-[#40916C]">
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-[#40916C]">{cert}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <button className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#1F2937] rounded-xl font-medium text-sm transition-colors">
              Xóa bộ lọc
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Top Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm">Hiển thị <span className="font-bold text-[#1F2937]">1-9</span> trên <span className="font-bold text-[#1F2937]">124</span> sản phẩm</p>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-sm text-gray-500 whitespace-nowrap">Sắp xếp:</span>
              <div className="relative w-full sm:w-[180px]">
                <select className="w-full appearance-none bg-gray-50 border border-gray-200 text-sm text-[#1F2937] py-2 px-4 rounded-xl pr-10 focus:outline-none focus:border-[#40916C] cursor-pointer">
                  <option>Mới nhất</option>
                  <option>Bán chạy nhất</option>
                  <option>Giá: Thấp đến Cao</option>
                  <option>Giá: Cao đến Thấp</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Active Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E6F4EA] text-[#1B4332] text-xs font-medium rounded-full">
              Rau củ quả
              <button className="hover:text-red-500 ml-1">&times;</button>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E6F4EA] text-[#1B4332] text-xs font-medium rounded-full">
              Dưới 500k
              <button className="hover:text-red-500 ml-1">&times;</button>
            </span>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <div key={product.id} className="group flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1">
                <Link to={`/san-pham/${product.id}`} className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-gray-50 block">
                  {product.tags.map(tag => (
                    tag === "Khuyến mãi" ? (
                      <div key={tag} className="absolute top-2 right-2 z-10 bg-[#F97316] text-white text-xs font-bold px-2 py-1 rounded-full">
                        Sale
                      </div>
                    ) : tag === "Hữu cơ" ? (
                      <div key={tag} className="absolute top-2 left-2 z-10 bg-[#40916C] text-white text-xs font-bold px-2 py-1 rounded-full">
                        Organic
                      </div>
                    ) : null
                  ))}
                  <ImageWithFallback 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-500">4.9 (120)</span>
                  </div>
                  <Link to={`/san-pham/${product.id}`} className="hover:text-[#40916C]">
                    <h3 className="font-bold text-[#1F2937] leading-tight mb-1 transition-colors line-clamp-2">{product.name}</h3>
                  </Link>
                  <p className="text-xs text-gray-500 mb-3">{product.farm}</p>
                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-[#40916C]">{product.price.toLocaleString('vi-VN')}đ<span className="text-xs text-gray-500 font-normal">/{product.unit}</span></span>
                      </div>
                      {product.oldPrice && (
                        <span className="text-xs text-gray-400 line-through">{product.oldPrice.toLocaleString('vi-VN')}đ</span>
                      )}
                    </div>
                  </div>
                  <button className="w-full mt-4 py-2.5 bg-[#E6F4EA] text-[#1B4332] hover:bg-[#40916C] hover:text-white rounded-xl font-bold text-sm transition-colors">
                    Thêm vào giỏ
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-12 flex justify-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#40916C] text-white font-bold shadow-md shadow-green-500/20">
              1
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
              2
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
              3
            </button>
            <span className="w-10 h-10 flex items-center justify-center text-gray-500">...</span>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
