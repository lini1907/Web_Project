import React from "react";
import { CheckCircle, Leaf, MapPin } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function FarmStory() {
  return (
    <section className="bg-[#F8F3EC] py-[64px]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center gap-12">
          
          <div className="w-full md:w-[500px] aspect-[4/3] md:aspect-square rounded-[16px] overflow-hidden shadow-lg flex-shrink-0">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1529304344766-6b537de190f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwdmVnZXRhYmxlJTIwZmFybSUyMGZhcm1lcnxlbnwxfHx8fDE3ODE2NjI3Njl8MA&ixlib=rb-4.1.0&q=80&w=1080" 
              alt="Farmer in the field" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 flex flex-col items-start gap-4">
            <div className="inline-flex items-center gap-1.5 text-[#8B6F47] font-semibold text-[14px]">
              <CheckCircle className="w-4 h-4" /> Nhà vườn được kiểm duyệt
            </div>
            
            <h2 className="text-[32px] font-bold text-[#1B4332] leading-tight">
              Chú Trần Văn Sáu<br/>
              Hợp tác xã Đức Trọng, Lâm Đồng
            </h2>
            
            <p className="text-[18px] text-[#4B5563] italic border-l-4 border-[#40916C] pl-4 py-1 my-4">
              "Chúng tôi canh tác theo chuẩn organic từ 2008. Mỗi lô hàng đều có chứng nhận đầy đủ, rau được thu hoạch lúc tờ mờ sáng để giữ trọn vị ngọt tự nhiên đến tay khách hàng."
            </p>
            
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 bg-white border border-[#D8F3DC] text-[#1B4332] px-3 py-1.5 rounded-full text-[14px] font-medium shadow-sm">
                <CheckCircle className="w-4 h-4 text-[#40916C]" /> KYC đã xác minh
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-[#D8F3DC] text-[#1B4332] px-3 py-1.5 rounded-full text-[14px] font-medium shadow-sm">
                <Leaf className="w-4 h-4 text-[#40916C]" /> Canh tác hữu cơ
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-[#D8F3DC] text-[#1B4332] px-3 py-1.5 rounded-full text-[14px] font-medium shadow-sm">
                <MapPin className="w-4 h-4 text-[#40916C]" /> Lâm Đồng
              </span>
            </div>
            
            <button className="mt-6 h-[48px] px-8 border-2 border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white rounded-[8px] font-semibold text-[16px] transition-colors">
              Xem nông trại
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
