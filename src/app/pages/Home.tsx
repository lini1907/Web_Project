import React, { useState } from "react";
import { Link } from "react-router";
import { Clock, ArrowRight, Lock, MapPin, CheckCircle, Star } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Home() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-0 py-4 flex flex-col gap-6 pb-12">
      
      {/* SECTION 3 — MAIN BANNER + SIDEBAR LAYOUT */}
      <section className="flex gap-4">
        {/* LEFT SIDEBAR — Category Menu */}
        <div className="w-[220px] bg-white border border-[#E5E7EB] rounded-[8px] overflow-hidden hidden md:flex flex-col flex-shrink-0">
          <div className="text-[14px] font-bold text-[#1F2937] py-3 px-4 bg-[#F0FAF3] border-b border-[#E5E7EB]">
            Danh mục sản phẩm
          </div>
          <div className="flex flex-col text-[13px] font-medium text-[#4B5563]">
            <Link to="/san-pham" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center gap-2">🥬 Rau lá xanh</Link>
            <Link to="/san-pham" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center gap-2">🥕 Củ quả</Link>
            <Link to="/san-pham" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center gap-2">🍅 Cà chua & ớt</Link>
            <Link to="/san-pham" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center gap-2">🍎 Trái cây tươi</Link>
            <Link to="/san-pham" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center gap-2">🌿 Thảo mộc & Herbs</Link>
            <Link to="/san-pham" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center gap-2">🥚 Trứng & Sữa tươi</Link>
            <Link to="/san-pham" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center gap-2">🍄 Nấm các loại</Link>
            <Link to="/giai-cuu" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center justify-between">
              <span className="flex items-center gap-2">♻️ Nông sản xấu mã</span>
              <span className="bg-[#D8F3DC] text-[#1B4332] text-[9px] font-bold px-1.5 py-0.5 rounded-sm">GIẢI CỨU</span>
            </Link>
            <Link to="/hop-bi-an" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center justify-between">
              <span className="flex items-center gap-2">🎁 Mystery Box</span>
              <span className="bg-purple-100 text-[#7C3AED] text-[9px] font-bold px-1.5 py-0.5 rounded-sm">BÍ ẨN</span>
            </Link>
            <Link to="/mua-chung" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center justify-between">
              <span className="flex items-center gap-2">👥 Đang mua chung</span>
              <span className="bg-orange-100 text-[#F97316] text-[9px] font-bold px-1.5 py-0.5 rounded-sm">HOT</span>
            </Link>
            <Link to="/nong-trai" className="px-4 py-2.5 hover:bg-[#F0FAF3] hover:text-[#40916C] transition-colors flex items-center gap-2">🏪 Cửa hàng nông trại</Link>
          </div>
        </div>

        {/* RIGHT — Banner Carousel */}
        <div className="flex-1 flex gap-4 overflow-hidden h-[280px]">
          <div className="relative flex-1 rounded-[8px] overflow-hidden group">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200" 
              alt="Banner" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
            <div className="absolute inset-y-0 left-0 p-8 flex flex-col justify-center text-white max-w-[400px]">
              <div className="bg-[#F97316] text-white text-[10px] font-bold px-2 py-1 rounded-sm w-max mb-3 flex items-center gap-1">
                ⚡ FLASH SALE kết thúc sau 02:14:35
              </div>
              <h2 className="text-[28px] font-bold leading-tight mb-2">Rau củ hữu cơ<br/>Giảm đến 50%</h2>
              <p className="text-[14px] text-white/90 mb-6">Nông sản tươi từ Đà Lạt, Lâm Đồng</p>
              <button className="bg-white text-[#40916C] font-bold px-6 py-2 rounded-[4px] w-max hover:bg-gray-100 transition-colors text-[14px]">
                Mua ngay
              </button>
            </div>
            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#40916C]"></div>
              <div className="w-2 h-2 rounded-full bg-white/50"></div>
              <div className="w-2 h-2 rounded-full bg-white/50"></div>
            </div>
          </div>
          
          <div className="hidden lg:flex flex-col gap-4 w-[280px] flex-shrink-0">
            <Link to="/san-pham" className="flex-1 rounded-[8px] bg-[#F97316] relative overflow-hidden flex flex-col items-center justify-center text-white group hover:opacity-95 transition-opacity">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
              <Clock className="w-8 h-8 mb-2" />
              <div className="font-bold text-[18px]">Flash Sale 12h</div>
              <div className="text-[12px] bg-white/20 px-2 py-1 rounded-sm mt-2">Đang diễn ra</div>
            </Link>
            <Link to="/hop-bi-an" className="flex-1 rounded-[8px] bg-[#7C3AED] relative overflow-hidden flex flex-col items-center justify-center text-white group hover:opacity-95 transition-opacity">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
              <span className="text-[32px] leading-none mb-1">🎁</span>
              <div className="font-bold text-[18px]">Mystery Box hôm nay</div>
              <div className="text-[12px] bg-white/20 px-2 py-1 rounded-sm mt-2">Bất ngờ & Tiết kiệm</div>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 4 — FLASH SALE BAR */}
      <section className="bg-white border-y border-[#E5E7EB] py-4 w-full relative left-1/2 -translate-x-1/2 w-screen">
        <div className="max-w-[1200px] mx-auto px-4 md:px-0">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-[20px] font-bold text-[#F97316] flex items-center gap-1">
                ⚡ FLASH SALE
              </h2>
              <div className="flex items-center gap-1.5 text-[14px] font-medium text-gray-600 hidden sm:flex">
                <span>Kết thúc sau:</span>
                <div className="flex gap-1">
                  <span className="bg-[#1F2937] text-white px-1.5 py-0.5 rounded-[2px] font-mono leading-none">01</span>
                  <span>:</span>
                  <span className="bg-[#1F2937] text-white px-1.5 py-0.5 rounded-[2px] font-mono leading-none">45</span>
                  <span>:</span>
                  <span className="bg-[#1F2937] text-white px-1.5 py-0.5 rounded-[2px] font-mono leading-none">23</span>
                </div>
              </div>
            </div>
            <Link to="/san-pham" className="text-[#40916C] text-[14px] font-medium hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-[170px] flex-shrink-0 flex flex-col gap-2 snap-start">
                <div className="relative aspect-square rounded-[8px] overflow-hidden bg-gray-100 border border-gray-100">
                  <div className="absolute top-0 right-0 bg-[#d4183d] text-white text-[12px] font-bold px-1.5 py-0.5 rounded-bl-[8px] z-10">
                    -45%
                  </div>
                  <ImageWithFallback 
                    src={`https://images.unsplash.com/photo-1524593166156-312f362cada0?auto=format&fit=crop&q=80&w=300&sig=${i}`} 
                    alt="Flash sale item" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-[14px] leading-[1.3] text-[#1F2937] line-clamp-2 h-[36px]">
                  Cà chua bi hữu cơ giống Nhật siêu ngọt
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-[#d4183d]">22.000đ</span>
                  <span className="text-[12px] text-gray-400 line-through">40.000đ</span>
                </div>
                <div className="w-full h-[14px] bg-red-100 rounded-full relative overflow-hidden flex items-center justify-center border border-red-200">
                  <div className="absolute left-0 top-0 bottom-0 bg-[#d4183d] w-[73%] rounded-full"></div>
                  <span className="relative z-10 text-[9px] font-bold text-white uppercase shadow-sm">Đã bán 73%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — 3 SPECIAL FEATURE MINI-BANNERS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/giai-cuu" className="bg-[#D8F3DC] rounded-[12px] p-4 flex items-center gap-4 h-[100px] md:h-[120px] group hover:-translate-y-1 transition-transform">
          <span className="text-[40px] md:text-[48px] leading-none">🥕</span>
          <div className="flex-1">
            <h3 className="text-[16px] font-bold text-[#1B4332] mb-1 group-hover:text-[#40916C] transition-colors">Nông sản xấu mã</h3>
            <p className="text-[12px] text-[#1B4332]/80 leading-tight">Giảm 30–50% — vẫn ngon như thường</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#1B4332]" />
        </Link>
        <Link to="/hop-bi-an" className="bg-[#EDE9FE] rounded-[12px] p-4 flex items-center gap-4 h-[100px] md:h-[120px] group hover:-translate-y-1 transition-transform">
          <span className="text-[40px] md:text-[48px] leading-none">🎁</span>
          <div className="flex-1">
            <h3 className="text-[16px] font-bold text-[#7C3AED] mb-1">Mystery Box hôm nay</h3>
            <p className="text-[12px] text-[#7C3AED]/80 leading-tight">Combo rau bí ẩn theo mùa siêu tiết kiệm</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#7C3AED]" />
        </Link>
        <Link to="/mua-chung" className="bg-[#FFEDD5] rounded-[12px] p-4 flex items-center gap-4 h-[100px] md:h-[120px] group hover:-translate-y-1 transition-transform">
          <span className="text-[40px] md:text-[48px] leading-none">👥</span>
          <div className="flex-1">
            <h3 className="text-[16px] font-bold text-[#F97316] mb-1">Mua chung giá sỉ</h3>
            <p className="text-[12px] text-[#F97316]/80 leading-tight">Đang gom: 14 phòng hoạt động</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#F97316]" />
        </Link>
      </section>

      {/* SECTION 6 — PRODUCT GRID */}
      <section className="bg-white p-4 md:p-6 rounded-[12px] border border-[#E5E7EB]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-[20px] font-bold text-[#1F2937]">Nông sản nổi bật</h2>
          <div className="flex overflow-x-auto no-scrollbar gap-2 w-full sm:w-auto">
            <button className="whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-semibold bg-[#40916C] text-white">Tất cả</button>
            <button className="whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#F8F3EC] text-[#4B5563] hover:bg-gray-200">Rau củ</button>
            <button className="whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#F8F3EC] text-[#4B5563] hover:bg-gray-200">Trái cây</button>
            <button className="whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#F8F3EC] text-[#4B5563] hover:bg-gray-200">Giải cứu</button>
            <button className="whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#F8F3EC] text-[#4B5563] hover:bg-gray-200">Mua chung</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          
          {/* Normal Product */}
          <div className="flex flex-col border border-transparent hover:border-[#40916C] rounded-[8px] p-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all bg-white group">
            <Link to="/san-pham/1" className="relative aspect-square rounded-[6px] overflow-hidden mb-3 bg-gray-50 border border-gray-100">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&q=80&w=400" 
                alt="Product" 
                className="w-full h-full object-cover"
              />
            </Link>
            <Link to="/san-pham/1" className="text-[14px] leading-tight text-[#1F2937] hover:text-[#40916C] line-clamp-2 h-[36px] mb-1 font-medium">Bắp cải xú xanh hữu cơ</Link>
            <div className="text-[12px] text-[#4B5563] mb-1 line-clamp-1">🏪 Nông trại Đà Lạt Xanh</div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 4.8 | Đã bán 234
            </div>
            <div className="mt-auto">
              <div className="font-bold text-[16px] text-[#40916C] mb-3">45.000đ<span className="text-[12px] font-normal text-gray-500">/kg</span></div>
              <button className="w-full h-[32px] border border-[#40916C] text-[#40916C] hover:bg-[#40916C] hover:text-white rounded-[6px] text-[13px] font-semibold transition-colors">
                Thêm vào giỏ
              </button>
            </div>
          </div>

          {/* Rescue Product */}
          <div className="flex flex-col border border-transparent hover:border-[#40916C] rounded-[8px] p-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all bg-white group">
            <Link to="/san-pham/2" className="relative aspect-square rounded-[6px] overflow-hidden mb-3 bg-gray-50 border border-gray-100">
              <div className="absolute top-1 left-1 z-10 bg-[#D8F3DC] text-[#1B4332] text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]">GIẢI CỨU</div>
              <div className="absolute top-1 right-1 z-10 bg-[#F97316] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]">-40%</div>
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=400" 
                alt="Product" 
                className="w-full h-full object-cover"
              />
            </Link>
            <Link to="/san-pham/2" className="text-[14px] leading-tight text-[#1F2937] hover:text-[#40916C] line-clamp-2 h-[36px] mb-1 font-medium">Cà rốt gãy nhỏ, xước vỏ</Link>
            <div className="text-[12px] text-[#4B5563] mb-1 line-clamp-1">🏪 HTX Đức Trọng</div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 4.5 | Đã bán 512
            </div>
            <div className="mt-auto">
              <div className="flex items-center gap-1 mb-3">
                <span className="font-bold text-[16px] text-[#d4183d]">24.000đ</span>
                <span className="text-[11px] text-gray-400 line-through">40.000đ</span>
              </div>
              <button className="w-full h-[32px] border border-[#d4183d] text-[#d4183d] hover:bg-[#d4183d] hover:text-white rounded-[6px] text-[13px] font-semibold transition-colors">
                Thêm vào giỏ
              </button>
            </div>
          </div>

          {/* Mystery Box Product */}
          <div className="flex flex-col border border-transparent hover:border-[#7C3AED] rounded-[8px] p-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all bg-white group">
            <Link to="/hop-bi-an" className="relative aspect-square rounded-[6px] overflow-hidden mb-3 bg-purple-50 border border-purple-100 flex items-center justify-center">
              <div className="absolute top-1 left-1 z-10 bg-[#7C3AED] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]">BÍ ẨN</div>
              <span className="text-[64px] group-hover:scale-110 transition-transform">📦</span>
            </Link>
            <Link to="/hop-bi-an" className="text-[14px] leading-tight text-[#1F2937] hover:text-[#7C3AED] line-clamp-2 h-[36px] mb-1 font-medium">Mystery Box Rau Mùa 3kg</Link>
            <div className="text-[12px] text-[#4B5563] mb-1 line-clamp-1 flex items-center gap-1"><Lock className="w-3 h-3" /> Nguyên liệu bất ngờ</div>
            <div className="text-[11px] font-bold text-[#F97316] mb-2">⚠️ Còn 5 hộp</div>
            <div className="mt-auto">
              <div className="font-bold text-[16px] text-[#7C3AED] mb-3">85.000đ<span className="text-[12px] font-normal text-gray-500">/hộp</span></div>
              <button className="w-full h-[32px] border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-[6px] text-[13px] font-semibold transition-colors">
                Mở hộp
              </button>
            </div>
          </div>

          {/* Group Buy Product */}
          <div className="flex flex-col border border-transparent hover:border-[#40916C] rounded-[8px] p-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all bg-white group">
            <Link to="/mua-chung" className="relative aspect-square rounded-[6px] overflow-hidden mb-3 bg-gray-50 border border-gray-100">
              <div className="absolute top-1 left-1 z-10 bg-[#F97316] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]">MUA CHUNG</div>
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1685504513848-df0dd6893cec?auto=format&fit=crop&q=80&w=400" 
                alt="Product" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-1.5 backdrop-blur-sm">
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#40916C] w-[60%]"></div>
                </div>
                <div className="text-[9px] font-bold text-center mt-0.5 text-[#1B4332]">Đã gom 6/10 kg</div>
              </div>
            </Link>
            <Link to="/mua-chung" className="text-[14px] leading-tight text-[#1F2937] hover:text-[#40916C] line-clamp-2 h-[36px] mb-1 font-medium">Cải xanh VietGAP</Link>
            <div className="text-[12px] text-[#4B5563] mb-1 line-clamp-1">🏪 Vườn rau 3 Miền</div>
            <div className="text-[11px] font-bold text-[#d4183d] mb-2">⏰ 14:23:07</div>
            <div className="mt-auto">
              <div className="flex items-center gap-1 mb-3">
                <span className="font-bold text-[16px] text-[#40916C]">35.000đ</span>
                <span className="text-[11px] text-gray-400 line-through">50.000đ</span>
              </div>
              <button className="w-full h-[32px] bg-[#F97316] hover:bg-[#ea580c] text-white rounded-[6px] text-[13px] font-semibold transition-colors">
                Tham gia
              </button>
            </div>
          </div>
          
          {/* Normal Product 2 */}
          <div className="flex flex-col border border-transparent hover:border-[#40916C] rounded-[8px] p-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all bg-white group hidden lg:flex">
            <Link to="/san-pham/3" className="relative aspect-square rounded-[6px] overflow-hidden mb-3 bg-gray-50 border border-gray-100">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=400" 
                alt="Product" 
                className="w-full h-full object-cover"
              />
            </Link>
            <Link to="/san-pham/3" className="text-[14px] leading-tight text-[#1F2937] hover:text-[#40916C] line-clamp-2 h-[36px] mb-1 font-medium">Chuối Laba Đà Lạt</Link>
            <div className="text-[12px] text-[#4B5563] mb-1 line-clamp-1">🏪 Nông trại Cậu Hai</div>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 4.9 | Đã bán 1.2k
            </div>
            <div className="mt-auto">
              <div className="font-bold text-[16px] text-[#40916C] mb-3">25.000đ<span className="text-[12px] font-normal text-gray-500">/kg</span></div>
              <button className="w-full h-[32px] border border-[#40916C] text-[#40916C] hover:bg-[#40916C] hover:text-white rounded-[6px] text-[13px] font-semibold transition-colors">
                Thêm vào giỏ
              </button>
            </div>
          </div>

        </div>
        
        <div className="flex justify-center mt-6">
          <button className="bg-white border border-gray-300 text-gray-700 px-8 py-2 rounded-[6px] font-medium text-[14px] hover:bg-gray-50 transition-colors">
            Xem thêm sản phẩm
          </button>
        </div>
      </section>

      {/* SECTION 7 — FARM SPOTLIGHT STRIP */}
      <section className="bg-white p-4 md:p-6 rounded-[12px] border border-[#E5E7EB]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[20px] font-bold text-[#1F2937]">Nông trại được kiểm duyệt</h2>
          <Link to="/nong-trai" className="text-[#40916C] text-[14px] font-medium hover:underline flex items-center gap-1">
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[240px] flex-shrink-0 bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all snap-start">
              <div className="h-[100px] w-full bg-gray-200 relative">
                <ImageWithFallback 
                  src={`https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=400&sig=${i}`} 
                  alt="Farm" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-4 pb-4 relative">
                <div className="w-[48px] h-[48px] rounded-full border-2 border-white bg-white overflow-hidden absolute -top-6 left-4 shadow-sm">
                  <ImageWithFallback 
                    src={`https://images.unsplash.com/photo-1529304344766-6b537de190f8?auto=format&fit=crop&q=80&w=100&sig=${i}`} 
                    alt="Farmer" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="pt-8">
                  <h3 className="font-bold text-[14px] text-[#1F2937] leading-tight mb-1">HTX Nông nghiệp Đức Trọng</h3>
                  <div className="flex items-center gap-1 text-[12px] text-gray-500 mb-2">
                    <MapPin className="w-3 h-3" /> Lâm Đồng
                  </div>
                  <div className="flex gap-2 text-[11px] font-medium text-[#40916C] mb-3">
                    <span className="bg-[#F0FAF3] px-1.5 py-0.5 rounded-sm">⭐ 4.9</span>
                    <span className="bg-[#F0FAF3] px-1.5 py-0.5 rounded-sm">🌿 Hữu cơ</span>
                    <span className="bg-[#F0FAF3] px-1.5 py-0.5 rounded-sm">✓ KYC</span>
                  </div>
                  <div className="text-[12px] text-gray-600 mb-3">127 sản phẩm</div>
                  <button className="w-full h-[32px] border border-[#40916C] text-[#40916C] hover:bg-[#40916C] hover:text-white rounded-[6px] text-[13px] font-semibold transition-colors">
                    Ghé thăm
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 8 — GROUP BUY LIVE SECTION */}
      <section className="bg-white p-4 md:p-6 rounded-[12px] border border-[#E5E7EB]">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-[20px] font-bold text-[#1F2937] flex items-center gap-2">
            🔴 Phòng mua chung đang hoạt động
          </h2>
          <span className="bg-red-100 text-red-600 text-[12px] font-bold px-2 py-0.5 rounded-full">14 phòng</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 p-3 border border-[#E5E7EB] rounded-[12px] bg-white hover:border-[#F97316] transition-colors">
              <div className="w-[80px] h-[80px] rounded-[8px] bg-gray-100 overflow-hidden flex-shrink-0">
                <ImageWithFallback 
                  src={`https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&q=80&w=200&sig=${i}`} 
                  alt="Product" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-[14px] text-[#1F2937] leading-tight mb-1 line-clamp-1">Táo đỏ New Zealand</h3>
                <p className="text-[11px] text-gray-500 mb-1">Nhập khẩu chính ngạch</p>
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="font-bold text-[14px] text-[#40916C]">65.000đ</span>
                  <span className="text-[11px] text-gray-400 line-through">90.000đ</span>
                </div>
                <div className="w-full mb-1">
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#40916C] w-[75%] rounded-full"></div>
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] font-medium">
                    <span className="text-[#40916C]">15/20 kg (75%)</span>
                    <span className="text-[#d4183d] font-bold">⏰ 04:12</span>
                  </div>
                </div>
                <button className="w-full h-[28px] mt-2 bg-[#F97316] hover:bg-[#ea580c] text-white rounded-[4px] text-[12px] font-bold transition-colors">
                  Tham gia ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 9 — RECENTLY VIEWED + RECOMMENDATIONS */}
      <section className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[30%] bg-white p-4 md:p-6 rounded-[12px] border border-[#E5E7EB]">
          <h2 className="text-[16px] font-bold text-[#1F2937] mb-4">Đã xem gần đây</h2>
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <Link to="/san-pham" key={i} className="flex gap-3 p-2 hover:bg-gray-50 rounded-[8px] transition-colors border border-transparent hover:border-gray-200">
                <div className="w-[60px] h-[60px] rounded-[6px] bg-gray-100 overflow-hidden flex-shrink-0">
                  <ImageWithFallback 
                    src={`https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=150&sig=${i}`} 
                    alt="Viewed item" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[#1F2937] line-clamp-2 leading-tight">Cà chua chín mọng hữu cơ</div>
                  <div className="text-[14px] font-bold text-[#40916C] mt-1">45.000đ</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="w-full lg:w-[70%] bg-white p-4 md:p-6 rounded-[12px] border border-[#E5E7EB]">
          <h2 className="text-[16px] font-bold text-[#1F2937] mb-4">Gợi ý cho bạn</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="flex flex-col group">
                <Link to="/san-pham" className="relative aspect-square rounded-[6px] overflow-hidden mb-2 bg-gray-50 border border-gray-100">
                  <ImageWithFallback 
                    src={`https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=250&sig=${i}`} 
                    alt="Suggested" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </Link>
                <Link to="/san-pham" className="text-[13px] leading-tight text-[#1F2937] hover:text-[#40916C] line-clamp-2 h-[34px] font-medium">Khoai tây vàng Đà Lạt xuất khẩu</Link>
                <div className="font-bold text-[14px] text-[#40916C] mt-1">32.000đ</div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}