'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Clock,
  LineChart,
  Receipt,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const MENU_ITEMS = [
  { name: 'Tổng quan', path: '/admin', icon: LayoutDashboard },
  { name: 'Sản phẩm', path: '/admin/products', icon: Package },
  { name: 'Đơn hàng', path: '/admin/orders', icon: Receipt },
  { name: 'Ca làm việc', path: '/admin/shifts', icon: Clock },
  { name: 'Doanh thu', path: '/admin/finance', icon: LineChart },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/';
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="w-64 h-screen bg-slate-900 text-slate-300 flex flex-col shadow-xl">
      <div className="p-6">
        <h1 className="text-2xl font-black text-white tracking-wider">MY<span className="text-blue-500">POS</span> ADMIN</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/20'
                : 'hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Về màn POS</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
