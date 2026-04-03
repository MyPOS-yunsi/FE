import { FileText, Eye } from 'lucide-react';

const ORDERS = [
  { id: 'ORD-1004', time: '14:32 02/04', method: 'Tiền mặt', total: '450,000', status: 'Hoàn thành' },
  { id: 'ORD-1003', time: '13:15 02/04', method: 'Chuyển khoản', total: '1,250,000', status: 'Hoàn thành' },
  { id: 'ORD-1002', time: '10:05 02/04', method: 'Chuyển khoản', total: '380,000', status: 'Đã hủy' },
];

export default function OrdersManager() {
  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Quản lý Đơn hàng</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-medium text-sm">
              <tr>
                <th className="p-4 border-b">Mã hóa đơn</th>
                <th className="p-4 border-b">Thời gian</th>
                <th className="p-4 border-b">Thanh toán</th>
                <th className="p-4 border-b">Tổng tiền</th>
                <th className="p-4 border-b">Trạng thái</th>
                <th className="p-4 border-b text-center">Xem</th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="p-4 font-bold text-blue-600 flex items-center gap-2"><FileText className="w-4 h-4"/> {o.id}</td>
                  <td className="p-4 text-slate-500">{o.time}</td>
                  <td className="p-4">{o.method}</td>
                  <td className="p-4 font-bold">{o.total} ₫</td>
                  <td className="p-4">
                     <span className={`px-3 py-1 rounded-full text-xs font-bold ${o.status === 'Đã hủy' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {o.status}
                     </span>
                  </td>
                  <td className="p-4 text-center">
                     <button className="text-slate-400 hover:text-slate-800"><Eye className="w-5 h-5 mx-auto"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
