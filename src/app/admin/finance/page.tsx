'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Banknote, QrCode, FileSpreadsheet } from 'lucide-react';
import { orderApi, FinanceSummaryDto, FinanceTransactionDto } from '@/lib/api';
import { formatVnd } from '@/lib/utils';

const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const METHOD_LABELS: Record<string, string> = { Cash: 'Tiền mặt', BankTransfer: 'Chuyển khoản' };

function exportExcel(transactions: FinanceTransactionDto[], month: number, year: number) {
  const header = ['Mã đơn hàng', 'Mã tham chiếu GD', 'Thời gian', 'Phương thức', 'Trạng thái', 'Số tiền (VND)'];
  const rows = transactions.map(t => [
    t.orderNumber,
    t.transactionReference ?? '',
    new Date(t.createdAt).toLocaleString('vi-VN'),
    METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod,
    t.paymentStatus,
    t.amount.toString(),
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\r\n');
  // UTF-8 BOM để Excel mở tiếng Việt đúng
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DoanhThu_${month.toString().padStart(2,'0')}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinanceManager() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<FinanceSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    orderApi.getFinance(year, month)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, month]);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Sổ quỹ &amp; Giao dịch</h1>
        <div className="flex items-center gap-3">
          {/* Bộ lọc tháng/năm */}
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => data && exportExcel(data.transactions, month, year)}
            disabled={!data || data.transactions.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

      {/* Stats cards */}
      {data && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-sm text-slate-500 font-medium">Tổng doanh thu</span>
            </div>
            <div className="text-2xl font-black text-slate-800">{formatVnd(data.totalRevenue)}</div>
            <div className="text-xs text-slate-400 mt-1">{data.totalOrders} đơn hoàn thành</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
              <span className="text-sm text-slate-500 font-medium">Tiền mặt</span>
            </div>
            <div className="text-2xl font-black text-slate-800">{formatVnd(data.totalCash)}</div>
            <div className="text-xs text-slate-400 mt-1">
              {data.totalRevenue > 0 ? Math.round(data.totalCash / data.totalRevenue * 100) : 0}% tổng thu
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <span className="text-sm text-slate-500 font-medium">Chuyển khoản</span>
            </div>
            <div className="text-2xl font-black text-slate-800">{formatVnd(data.totalBankTransfer)}</div>
            <div className="text-xs text-slate-400 mt-1">
              {data.totalRevenue > 0 ? Math.round(data.totalBankTransfer / data.totalRevenue * 100) : 0}% tổng thu
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
            {data.transactions.length === 0 ? (
              <p className="text-slate-400 text-sm text-center">Không có giao dịch trong tháng này</p>
            ) : (
              <div className="text-center">
                <div className="text-3xl font-black text-slate-800">{data.transactions.length}</div>
                <div className="text-sm text-slate-400 mt-1">Giao dịch</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-auto">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Đang tải dữ liệu...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-medium text-sm sticky top-0">
              <tr>
                <th className="p-4 border-b">Mã đơn hàng</th>
                <th className="p-4 border-b">Mã tham chiếu GD</th>
                <th className="p-4 border-b">Ngày giờ</th>
                <th className="p-4 border-b">Loại GD</th>
                <th className="p-4 border-b text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {data?.transactions.map((t, i) => (
                <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="p-4 font-bold text-blue-600">{t.orderNumber}</td>
                  <td className="p-4 font-mono text-xs text-slate-400">{t.transactionReference ?? '—'}</td>
                  <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      t.paymentMethod === 'Cash' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-emerald-600">+ {formatVnd(t.amount)}</td>
                </tr>
              ))}
              {(data?.transactions.length === 0) && (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400">Không có giao dịch trong tháng được chọn.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
