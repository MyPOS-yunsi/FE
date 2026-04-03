import { TrendingUp, FileSpreadsheet } from 'lucide-react';

export default function FinanceManager() {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Sổ quỹ & Giao dịch</h1>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5"/> Xuất báo cáo Excel
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex flex-center items-center justify-center">
               <TrendingUp className="w-6 h-6"/>
            </div>
            <div>
               <p className="text-sm font-medium text-slate-500">Tổng doanh thu tháng này</p>
               <h2 className="text-3xl font-black text-slate-800">124,500,000 ₫</h2>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-medium text-sm">
              <tr>
                <th className="p-4 border-b">Mã GD / Tham chiếu</th>
                <th className="p-4 border-b">Ngày giờ</th>
                <th className="p-4 border-b">Loại GD</th>
                <th className="p-4 border-b">Chi tiết</th>
                <th className="p-4 border-b text-right">Số tiền (+/-)</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3].map(i => (
                <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-500">TXN-00{9-i}</td>
                  <td className="p-4">1{i}:30 02/04/2026</td>
                  <td className="p-4"><span className="bg-blue-100 text-blue-600 font-bold px-2 py-1 rounded text-xs">Bán hàng</span></td>
                  <td className="p-4 text-slate-600">Thanh toán đơn hàng ORD-100{i}</td>
                  <td className="p-4 text-right font-bold text-emerald-600">+ {(i*450000).toLocaleString('vi-VN')} ₫</td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
