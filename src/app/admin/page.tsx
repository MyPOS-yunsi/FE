import { Banknote, ShoppingBag, Users, TrendingUp } from 'lucide-react';

const STATS = [
  { title: 'Doanh thu hôm nay', value: '14,500,000 ₫', trend: '+15%', color: 'text-emerald-600', icon: Banknote },
  { title: 'Đơn hàng', value: '84', trend: '+5%', color: 'text-blue-600', icon: ShoppingBag },
  { title: 'Khách hàng mới', value: '12', trend: '-2%', color: 'text-amber-500', icon: Users },
  { title: 'Lợi nhuận gộp', value: '4,200,000 ₫', trend: '+20%', color: 'text-purple-600', icon: TrendingUp },
];

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Tổng quan hệ thống</h1>
          <p className="text-slate-500 mt-1">Báo cáo hoạt động kinh doanh ngày {new Date().toLocaleDateString('vi-VN')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        {STATS.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-2">{stat.value}</h3>
              <span className={`text-sm font-bold mt-1 inline-block ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.trend} so với hôm qua
              </span>
            </div>
            <div className={`p-4 rounded-full bg-slate-50 ${stat.color}`}>
              <stat.icon className="w-8 h-8" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Mock Chart Area */}
        <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96 flex flex-col">
          <h3 className="font-bold text-lg text-slate-800 border-b pb-4 mb-4">Biểu đồ doanh thu tuần</h3>
          <div className="flex-1 flex items-end justify-between gap-2 pt-4">
             {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                <div key={i} className="w-full bg-blue-100 rounded-t-md relative flex items-end">
                    <div style={{ height: `${h}%` }} className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"></div>
                </div>
             ))}
          </div>
          <div className="flex justify-between text-slate-400 text-sm mt-4 font-medium px-2">
             <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
          </div>
        </div>

        {/* Top Products */}
        <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="font-bold text-lg text-slate-800 border-b pb-4 mb-4">Sản phẩm bán chạy</h3>
           <div className="space-y-4">
              {[
                { name: 'Áo Polo Nâu', qty: 45, price: '250k' },
                { name: 'Quần Jeans L', qty: 38, price: '450k' },
                { name: 'T-Shirt Trắng M', qty: 20, price: '150k' },
              ].map((p, i) => (
                 <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                    <div>
                        <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.price}</p>
                    </div>
                    <span className="font-black text-blue-600">{p.qty}</span>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
