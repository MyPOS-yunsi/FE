'use client';

import { useEffect, useState } from 'react';
import { FileText, Eye, Printer, Download, X, ChevronDown, ChevronUp } from 'lucide-react';
import { orderApi, OrderSummaryDto, OrderInvoiceDto } from '@/lib/api';
import { formatVnd } from '@/lib/utils';
import { buildReceiptHtml, openReceiptWindow, downloadReceiptAsHtml } from '@/lib/receipt';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  Completed: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-600' },
  Processing: { label: 'Đang xử lý', cls: 'bg-blue-100 text-blue-600' },
  Cancelled: { label: 'Đã hủy', cls: 'bg-red-100 text-red-600' },
  Draft: { label: 'Nháp', cls: 'bg-slate-100 text-slate-500' },
};

const METHOD_LABELS: Record<string, string> = { Cash: 'Tiền mặt', BankTransfer: 'Chuyển khoản' };

function toReceiptData(inv: OrderInvoiceDto) {
  const payMethod = inv.payments[0]?.paymentMethod ?? 'Cash';
  return {
    orderNumber: inv.orderNumber,
    printedAt: new Date(inv.createdAt).toLocaleString('vi-VN'),
    subTotal: inv.subTotal,
    discount: inv.discountAmount,
    total: inv.totalAmount,
    paymentMethod: METHOD_LABELS[payMethod] ?? payMethod,
    lines: inv.orderLines.map(l => ({
      productName: l.productVariant?.product?.name ?? `SKU: ${l.productVariant?.sku ?? l.productVariantId}`,
      variantParams: l.productVariant?.attributes
        ? Object.values(l.productVariant.attributes).join(', ')
        : undefined,
      quantity: l.quantity,
      price: l.unitPrice,
    })),
  };
}

function InvoiceModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const [inv, setInv] = useState<OrderInvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getInvoice(orderId).then(setInv).finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => { if (!inv) return; openReceiptWindow(buildReceiptHtml(toReceiptData(inv))); };
  const handlePdf = () => { if (!inv) return; downloadReceiptAsHtml(buildReceiptHtml(toReceiptData(inv))); };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Chi tiết đơn hàng
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {loading && <div className="p-12 text-center text-slate-400">Đang tải...</div>}

        {!loading && !inv && <div className="p-12 text-center text-red-500">Không tìm thấy hóa đơn.</div>}

        {!loading && inv && (() => {
          const status = STATUS_LABELS[inv.status] ?? { label: inv.status, cls: 'bg-slate-100 text-slate-500' };
          const payMethod = METHOD_LABELS[inv.payments[0]?.paymentMethod ?? ''] ?? inv.payments[0]?.paymentMethod;
          return (
            <>
              <div className="p-6 space-y-4">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-400">Mã ĐH</span><div className="font-bold text-blue-700">{inv.orderNumber}</div></div>
                  <div><span className="text-slate-400">Thời gian</span><div className="font-medium">{new Date(inv.createdAt).toLocaleString('vi-VN')}</div></div>
                  <div><span className="text-slate-400">Thanh toán</span><div className="font-medium">{payMethod}</div></div>
                  <div><span className="text-slate-400">Trạng thái</span><div><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${status.cls}`}>{status.label}</span></div></div>
                </div>

                {/* Lines */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left">Sản phẩm</th>
                        <th className="px-3 py-2 text-right">SL</th>
                        <th className="px-3 py-2 text-right">Đơn giá</th>
                        <th className="px-3 py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.orderLines.map((l, i) => {
                        const name = l.productVariant?.product?.name ?? `SKU: ${l.productVariant?.sku ?? l.productVariantId}`;
                        const attrs = l.productVariant?.attributes ? Object.values(l.productVariant.attributes).join(', ') : null;
                        return (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              <div className="font-medium">{name}</div>
                              {attrs && <div className="text-xs text-slate-400">{attrs}</div>}
                            </td>
                            <td className="px-3 py-2 text-right">{l.quantity}</td>
                            <td className="px-3 py-2 text-right">{formatVnd(l.unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatVnd(l.quantity * l.unitPrice)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-slate-500"><span>Tạm tính</span><span>{formatVnd(inv.subTotal)}</span></div>
                  {inv.discountAmount > 0 && <div className="flex justify-between text-slate-500"><span>Giảm giá</span><span>-{formatVnd(inv.discountAmount)}</span></div>}
                  <div className="flex justify-between text-lg font-black text-slate-800 border-t border-slate-200 pt-2 mt-2">
                    <span>TỔNG CỘNG</span><span className="text-blue-700">{formatVnd(inv.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
                <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors">
                  <Printer className="w-4 h-4" /> In Hóa Đơn
                </button>
                <button onClick={handlePdf} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold text-sm transition-colors">
                  <Download className="w-4 h-4" /> Tải PDF
                </button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

export default function OrdersManager() {
  const [orders, setOrders] = useState<OrderSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    orderApi.list()
      .then(data => setOrders(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...orders].sort((a, b) => {
    const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortAsc ? cmp : -cmp;
  });

  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Quản lý Đơn hàng</h1>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-auto">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Đang tải dữ liệu...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-medium text-sm sticky top-0">
              <tr>
                <th className="p-4 border-b">Mã hóa đơn</th>
                <th className="p-4 border-b cursor-pointer select-none" onClick={() => setSortAsc(p => !p)}>
                  <span className="flex items-center gap-1">
                    Thời gian {sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </span>
                </th>
                <th className="p-4 border-b">Thanh toán</th>
                <th className="p-4 border-b">Tổng tiền</th>
                <th className="p-4 border-b">Trạng thái</th>
                <th className="p-4 border-b text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(o => {
                const s = STATUS_LABELS[o.status] ?? { label: o.status, cls: 'bg-slate-100 text-slate-500' };
                return (
                  <tr key={o.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="p-4 font-bold text-blue-600 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> {o.orderNumber}
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4">{METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod}</td>
                    <td className="p-4 font-bold">{formatVnd(o.totalAmount)}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${s.cls}`}>{s.label}</span></td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedId(o.id)}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                        title="Xem chi tiết & in hóa đơn"
                      >
                        <Eye className="w-5 h-5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && !loading && (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400">Chưa có đơn hàng nào.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedId !== null && <InvoiceModal orderId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
