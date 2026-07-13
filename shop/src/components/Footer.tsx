import React, { useState, useEffect } from 'react';
import { shopService } from '../services/shopService';
import { 
  Phone, 
  Mail, 
  ExternalLink, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Truck, 
  RotateCcw
} from 'lucide-react';

export const Footer = () => {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    shopService.getSettings()
      .then(res => setSettings(res.data))
      .catch(err => console.error(err));
  }, []);

  const storeName = settings?.storeName || 'SaaS Web Store';
  const phone = settings?.contact?.phone || '0987.654.321';
  const email = settings?.contact?.email || 'support@saasstore.com';
  const facebook = settings?.contact?.facebook || '#';
  const branches = settings?.addresses || [];

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
      
      {/* Policy highlights section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-b dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-primary dark:text-indigo-400 rounded-full"><Truck size={24}/></div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Giao hàng toàn quốc</h4>
            <p className="text-xs text-gray-400 mt-0.5">Thời gian vận chuyển nhanh chóng, phí ship cực rẻ</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-primary dark:text-indigo-400 rounded-full"><ShieldCheck size={24}/></div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Cam kết chính hãng</h4>
            <p className="text-xs text-gray-400 mt-0.5">Sản phẩm phân phối chính hãng 100% từ nhà máy</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-primary dark:text-indigo-400 rounded-full"><RotateCcw size={24}/></div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Đổi trả dễ dàng</h4>
            <p className="text-xs text-gray-400 mt-0.5">Đổi mới trong vòng 7 ngày nếu phát sinh lỗi từ NSX</p>
          </div>
        </div>
      </div>

      {/* Main footer layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* About & Contacts */}
        <div className="space-y-4">
          <h3 className="text-base font-black text-primary uppercase tracking-wide">{storeName}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">Hệ thống phân phối và bán lẻ sản phẩm chính hãng hàng đầu Việt Nam. Tích hợp trực quan, mua sắm dễ dàng.</p>
          <div className="space-y-2.5 pt-2 text-xs">
            <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-primary transition-colors"><Phone size={14}/> Hotline: <b>{phone}</b></a>
            <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-primary transition-colors"><Mail size={14}/> Hỗ trợ: {email}</a>
            <a href={facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors"><ExternalLink size={14}/> Theo dõi Facebook Fanpage</a>
          </div>
        </div>

        {/* Branch listing (configured in store settings) */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Hệ thống chi nhánh</h4>
          {branches.length === 0 ? (
            <p className="text-xs text-gray-400">Đang cập nhật chi nhánh...</p>
          ) : (
            <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
              {branches.map((br: any, idx: number) => (
                <div key={idx} className="space-y-1 text-xs">
                  <p className="font-bold text-gray-850 dark:text-gray-200 flex items-center gap-1"><MapPin size={12} className="text-primary"/> {br.branchName}</p>
                  <p className="text-gray-400 pl-4">{br.address}</p>
                  {br.openingHours && <p className="text-gray-400 pl-4 flex items-center gap-1"><Clock size={10}/> {br.openingHours}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Policies & Links */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Chính sách & Hỗ trợ</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#" className="hover:text-primary transition-colors">Điều khoản dịch vụ</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Chính sách bảo mật thông tin</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Chính sách vận chuyển & Kiểm hàng</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Chính sách bảo hành & Đổi trả</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Chính sách thành viên tích lũy điểm</a></li>
          </ul>
        </div>

      </div>

      {/* Copy-rights */}
      <div className="bg-gray-50 dark:bg-gray-900 py-4 text-center border-t dark:border-gray-700">
        <p className="text-[10px] text-gray-400 font-semibold">&copy; {new Date().getFullYear()} {storeName}. Developed in pair with Antigravity AI.</p>
      </div>

    </footer>
  );
};
export default Footer;
