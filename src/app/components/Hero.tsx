import React from "react";
import { Link } from "react-router";
import { CheckCircle, Truck, Headphones } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Hero() {
  return (
    <section className="w-full bg-[#F0FAF3] relative overflow-hidden">
      {/* Background Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#40916C 2px, transparent 2px)',
          backgroundSize: '32px 32px'
        }}
      ></div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-12 pb-16 md:py-24 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-12">
          
          <div className="flex-1 flex flex-col items-start gap-6">
            <div className="inline-flex items-center gap-2 text-[#40916C] font-semibold text-[12px] uppercase tracking-wider bg-white/60 px-3 py-1.5 rounded-full">
              <span>🌱</span> Nông sản sạch tươi mỗi ngày
            </div>
            
            <h1 className="text-[#1B4332] text-[40px] md:text-[48px] font-bold leading-[1.2]">
              Nông sản sạch<br/>
              Từ nông trại<br/>
              đến bàn ăn
            </h1>
            
            <p className="text-[#1F2937] text-[18px] max-w-[480px] leading-relaxed">
              Kết nối trực tiếp với nhà vườn, mua nông sản rõ nguồn gốc với mức giá hợp lý.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <Link to="/san-pham" className="flex items-center justify-center bg-[#40916C] hover:bg-[#2D6A4F] text-white h-[48px] px-8 rounded-[8px] font-semibold text-[16px] transition-colors focus:ring-[3px] focus:ring-[#40916C26] focus:outline-none">
                Mua ngay
              </Link>
              <Link to="/nong-trai" className="flex items-center justify-center bg-white hover:bg-gray-50 text-[#1B4332] border border-[#1B4332]/20 h-[48px] px-8 rounded-[8px] font-semibold text-[16px] transition-colors focus:ring-[3px] focus:ring-[#40916C26] focus:outline-none">
                Khám phá nông trại
              </Link>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 mt-8 pt-6 border-t border-[#40916C]/20 w-full text-[14px] text-[#4B5563] font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#40916C]" />
                100% nông sản sạch
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#40916C]" />
                Giao hàng nhanh
              </div>
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-[#40916C]" />
                Hỗ trợ 24/7
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full flex justify-center md:justify-end">
            <div className="relative w-full max-w-[500px] aspect-square rounded-[24px] overflow-hidden shadow-2xl">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1597362925123-77861d3fbac7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcmdhbmljJTIwZnJlc2glMjB2ZWdldGFibGUlMjBiYXNrZXR8ZW58MXx8fHwxNzgxNjYyNzY2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                alt="Colorful vegetable basket" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
