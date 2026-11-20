import React from "react";
import { Link } from "react-router";
import { Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function Cart() {
  return (
    <div className="bg-[#F8F3EC] min-h-screen py-12">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        <h1 className="text-3xl font-bold text-[#1B4332] mb-8">Giỏ hàng của bạn</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items List */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#1F2937]">4 sản phẩm</h2>
              <button className="text-sm text-red-500 hover:underline">Xóa tất cả</button>
            </div>
            
            <div className="divide-y divide-gray-100">
              {/* Item 1 */}
              <div className="p-6 flex gap-4 md:gap-6 items-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1524593166156-312f362cada0?auto=format&fit=crop&q=80&w=200" 
                    alt="Cà chua" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1F2937] text-lg">Cà chua bi hữu cơ</h3>
                  <p className="text-sm text-gray-500 mb-2">Nông trại Đà Lạt Xanh</p>
                  <div className="font-bold text-[#40916C]">45.000đ</div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex items-center bg-[#F8F3EC] rounded-lg border border-gray-200">
                    <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#40916C]">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium text-sm">1</span>
                    <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#40916C]">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Item 2 */}
              <div className="p-6 flex gap-4 md:gap-6 items-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=200" 
                    alt="Cà rốt" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-[#D8F3DC] text-[#1B4332] text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-[#1B4332]/10">Giải cứu</span>
                    <h3 className="font-semibold text-[#1F2937] text-lg">Cà rốt xấu mã</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">HTX Nông nghiệp Đức Trọng</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F97316]">24.000đ</span>
                    <span className="text-sm text-gray-400 line-through">40.000đ</span>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex items-center bg-[#F8F3EC] rounded-lg border border-gray-200">
                    <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#40916C]">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium text-sm">2</span>
                    <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#40916C]">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Item 3 */}
              <div className="p-6 flex gap-4 md:gap-6 items-center bg-purple-50/30">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-purple-100 flex-shrink-0 border border-purple-200">
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1656543802898-41c8c46683a7?auto=format&fit=crop&q=80&w=200" 
                    alt="Mystery Box" 
                    className="w-full h-full object-cover p-2"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-[#7C3AED] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Bí ẩn</span>
                    <h3 className="font-semibold text-[#1F2937] text-lg">Mystery Box Rau Lá</h3>
                  </div>
                  <p className="text-sm text-[#7C3AED] mb-2 font-medium">Bất ngờ thú vị 🌿</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1F2937]">85.000đ</span>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex items-center bg-white rounded-lg border border-purple-200">
                    <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#7C3AED]">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium text-sm">1</span>
                    <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#7C3AED]">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <Link to="/san-pham" className="text-[#40916C] font-semibold flex items-center gap-2 hover:underline">
                <ArrowRight className="w-4 h-4 rotate-180" /> Tiếp tục mua sắm
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-[#1F2937] mb-6">Tổng đơn hàng</h2>
              
              <div className="space-y-4 mb-6 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span className="font-medium text-[#1F2937]">178.000đ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Khuyến mãi (Giải cứu)</span>
                  <span className="font-medium text-[#F97316]">-16.000đ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí giao hàng</span>
                  <span className="font-medium text-[#1F2937]">0đ</span>
                </div>
                <div className="bg-green-50 text-[#40916C] p-2 rounded-lg text-xs font-medium text-center border border-green-100">
                  Chúc mừng! Đơn hàng của bạn được miễn phí giao hàng.
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Tổng cộng</span>
                  <span className="font-bold text-2xl text-[#1B4332]">162.000đ</span>
                </div>
                <p className="text-xs text-gray-500 text-right mt-1">(Đã bao gồm VAT nếu có)</p>
              </div>

              <button className="w-full h-12 bg-[#40916C] hover:bg-[#2D6A4F] text-white rounded-xl font-bold text-[16px] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#40916C]/20">
                Thanh toán <ArrowRight className="w-5 h-5" />
              </button>
              
              <div className="mt-4 flex gap-2 justify-center text-xs text-gray-400">
                <span>✓ Cam kết chất lượng</span>
                <span>•</span>
                <span>✓ Đổi trả 24h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}