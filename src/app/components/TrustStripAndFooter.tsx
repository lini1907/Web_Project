import React from "react";
import { Link } from "react-router";
import { Facebook, Instagram, MessageCircle, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1B4332] text-white pt-12 pb-0 mt-8">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          
          {/* Column 1 */}
          <div className="lg:col-span-1">
            <div className="font-bold text-[20px] mb-3 flex items-center gap-1">
              FarmTable <span className="text-xl">🌿</span>
            </div>
            <p className="text-gray-300 text-[12px] mb-4 leading-relaxed">
              Mua sắm nông sản sạch trực tiếp từ nhà vườn với giá tốt nhất mỗi ngày.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#40916C] transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#40916C] transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#40916C] transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#40916C] transition-colors">
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          {/* Column 2 */}
          <div>
            <h4 className="font-bold text-[14px] mb-4 uppercase tracking-wider text-gray-200">Về FarmTable</h4>
            <ul className="flex flex-col gap-2 text-[13px] text-gray-300">
              <li><Link to="/nong-trai" className="hover:text-white transition-colors">Giới thiệu</Link></li>
              <li><Link to="/nong-trai" className="hover:text-white transition-colors">Nhà vườn</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Tuyển dụng</a></li>
            </ul>
          </div>
          
          {/* Column 3 */}
          <div>
            <h4 className="font-bold text-[14px] mb-4 uppercase tracking-wider text-gray-200">Hỗ trợ</h4>
            <ul className="flex flex-col gap-2 text-[13px] text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">Liên hệ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Chính sách đổi trả</a></li>
              <li><a href="#" className="hover:text-white transition-colors">CSKH</a></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h4 className="font-bold text-[14px] mb-4 uppercase tracking-wider text-gray-200">Sản phẩm</h4>
            <ul className="flex flex-col gap-2 text-[13px] text-gray-300">
              <li><Link to="/san-pham" className="hover:text-white transition-colors">Rau củ</Link></li>
              <li><Link to="/san-pham" className="hover:text-white transition-colors">Trái cây</Link></li>
              <li><Link to="/giai-cuu" className="hover:text-white transition-colors">Giải cứu</Link></li>
              <li><Link to="/hop-bi-an" className="hover:text-white transition-colors">Mystery Box</Link></li>
            </ul>
          </div>
          
          {/* Column 5 */}
          <div>
            <h4 className="font-bold text-[14px] mb-4 uppercase tracking-wider text-gray-200">Tải ứng dụng</h4>
            <div className="flex gap-3">
              <div className="bg-white p-1 rounded-[4px] flex-shrink-0">
                <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-gray-400 text-[10px]">
                  QR
                </div>
              </div>
              <div className="flex flex-col gap-2 justify-center">
                <div className="bg-gray-800 border border-gray-600 px-2 py-1 rounded-[4px] text-[10px] text-center w-[100px] cursor-pointer hover:bg-gray-700">App Store</div>
                <div className="bg-gray-800 border border-gray-600 px-2 py-1 rounded-[4px] text-[10px] text-center w-[100px] cursor-pointer hover:bg-gray-700">Google Play</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#0f2d1e] py-4">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-gray-400">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span>© 2025 FarmTable — Kết nối Nông trại & Bàn ăn</span>
            <span className="hidden md:inline">|</span>
            <a href="#" className="hover:text-white">Chính sách</a>
            <span className="hidden md:inline">|</span>
            <a href="#" className="hover:text-white">Điều khoản</a>
            <span className="hidden md:inline">|</span>
            <a href="#" className="hover:text-white">Bảo mật</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span>🇻🇳</span> Việt Nam
            </div>
            <span>|</span>
            <span>VND</span>
          </div>
        </div>
      </div>
    </footer>
  );
}