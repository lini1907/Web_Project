import React from "react";
import { Link } from "react-router";
import { Search, Heart, ShoppingCart, User, Bell, Menu, X, Package, Leaf, Flame, Users, Gift, Zap } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="w-full flex flex-col z-50">
      {/* SECTION 1 — TOP UTILITY BAR */}
      <div className="bg-[#1B4332] text-white h-[32px] w-full hidden md:block">
        <div className="max-w-[1200px] mx-auto px-4 h-full flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Miễn phí giao hàng cho đơn từ 200.000đ</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-300">Tải app</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-300">Theo dõi đơn hàng</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-300">Kết nối nhà vườn</a>
          </div>
        </div>
      </div>

      {/* SECTION 2 — NAVBAR */}
      <nav className="bg-white border-b border-[#E5E7EB] sticky top-0 md:relative z-40">
        <div className="max-w-[1200px] mx-auto px-4 h-[60px] flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 font-bold text-[#1B4332] text-[20px] flex items-center">
            FarmTable <Leaf className="w-5 h-5 ml-1 text-[#40916C]" fill="currentColor" />
          </Link>
          
          {/* Search bar */}
          <div className="flex-1 max-w-[600px] hidden md:flex items-center">
            <div className="flex w-full h-[40px] rounded-[8px] border-2 border-[#40916C] overflow-hidden bg-white">
              <input 
                type="text" 
                placeholder="Tìm rau củ, trái cây, nông trại..." 
                className="flex-1 h-full px-4 text-sm focus:outline-none"
              />
              <button className="bg-[#F97316] hover:bg-[#ea580c] text-white px-6 h-full font-medium text-sm transition-colors">
                Tìm kiếm
              </button>
            </div>
          </div>

          {/* Right icons row */}
          <div className="flex items-center gap-6 text-[#1F2937]">
            <button className="hidden md:flex flex-col items-center gap-0.5 hover:text-[#40916C]">
              <Bell className="w-5 h-5" />
              <span className="text-[10px]">Thông báo</span>
            </button>
            <button className="hidden md:flex flex-col items-center gap-0.5 hover:text-[#40916C]">
              <Heart className="w-5 h-5" />
              <span className="text-[10px]">Yêu thích</span>
            </button>
            <Link to="/gio-hang" className="flex flex-col items-center gap-0.5 hover:text-[#40916C] relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-[10px] hidden md:block">Giỏ hàng</span>
              <span className="absolute -top-1 right-0 md:right-1 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full flex items-center justify-center min-w-[16px] h-[16px]">
                3
              </span>
            </Link>
            <button className="hidden md:flex flex-col items-center gap-0.5 hover:text-[#40916C]">
              <User className="w-5 h-5" />
              <span className="text-[10px]">Đăng nhập</span>
            </button>
            <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex w-full h-[40px] rounded-[8px] border-2 border-[#40916C] overflow-hidden bg-white">
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              className="flex-1 h-full px-3 text-sm focus:outline-none"
            />
            <button className="bg-[#F97316] text-white px-4 h-full font-medium text-sm">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Category navigation bar */}
      <div className="bg-[#15803D] text-white h-[44px] hidden lg:block shadow-md">
        <div className="max-w-[1200px] mx-auto px-4 h-full flex items-center gap-6 text-[14px] font-medium whitespace-nowrap overflow-hidden">
          <Link to="/" className="hover:text-gray-200">Trang chủ</Link>
          <Link to="/san-pham" className="hover:text-gray-200">Rau củ</Link>
          <Link to="/san-pham" className="hover:text-gray-200">Trái cây</Link>
          <Link to="/san-pham" className="hover:text-gray-200">Thịt cá</Link>
          <Link to="/san-pham" className="hover:text-gray-200">Đặc sản</Link>
          <Link to="/giai-cuu" className="hover:text-orange-200 flex items-center gap-1.5">Giải cứu <Flame className="w-4 h-4" /></Link>
          <Link to="/mua-chung" className="hover:text-gray-200 flex items-center gap-1.5">Mua chung <Users className="w-4 h-4" /></Link>
          <Link to="/hop-bi-an" className="hover:text-purple-200 flex items-center gap-1.5">Mystery Box <Gift className="w-4 h-4" /></Link>
          <Link to="/nong-trai" className="hover:text-gray-200">Nông trại</Link>
          <Link to="/san-pham" className="hover:text-gray-200 flex items-center gap-1.5">Flash Sale <Zap className="w-4 h-4" /></Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden absolute top-[110px] left-0 w-full bg-white border-b border-[#E5E7EB] p-4 flex flex-col gap-3 shadow-lg z-50">
          <Link to="/" onClick={() => setIsOpen(false)} className="font-semibold text-[#1F2937]">Trang chủ</Link>
          <Link to="/san-pham" onClick={() => setIsOpen(false)} className="font-semibold text-[#1F2937]">Rau củ & Trái cây</Link>
          <Link to="/giai-cuu" onClick={() => setIsOpen(false)} className="font-semibold text-[#F97316] flex items-center gap-2">Giải cứu <Flame className="w-4 h-4" /></Link>
          <Link to="/mua-chung" onClick={() => setIsOpen(false)} className="font-semibold text-[#1F2937] flex items-center gap-2">Mua chung <Users className="w-4 h-4" /></Link>
          <Link to="/hop-bi-an" onClick={() => setIsOpen(false)} className="font-semibold text-[#7C3AED] flex items-center gap-2">Mystery Box <Gift className="w-4 h-4" /></Link>
          <Link to="/nong-trai" onClick={() => setIsOpen(false)} className="font-semibold text-[#1F2937]">Nông trại</Link>
        </div>
      )}
    </div>
  );
}