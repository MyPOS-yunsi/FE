'use client';

import { usePosStore } from '@/store/posStore';
import { orderApi } from '@/lib/api';
import { Banknote, QrCode, LogOut, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { formatVnd } from '@/lib/utils';
import BankTransferWaiting from './BankTransferWaiting';

// Cấu hình tài khoản ngân hàng – lấy từ env hoặc config
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME ?? 'BIDV';
const ACCOUNT_NUMBER = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? '';

interface PendingOrder {
  orderId: number;
  orderNumber: string;
  txnRef: string;
  totalAmount: number;
}

export default function CheckoutPanel() {
  const { cart, discount, paymentMethod, setPaymentMethod, clearCart, setDiscount, activeShiftId } = usePosStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{
    orderNumber: string;
    printedAt: string;
    subTotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    lines: { productName: string; variantParams: string; quantity: number; price: number }[];
  } | null>(null);

  const router = useRouter();

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/';
    localStorage.removeItem('user');
    router.push('/login');
  };

  const subTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = Math.max(0, subTotal - discount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!activeShiftId) {
      setError('Chưa có ca làm việc. Vui lòng vào ca trước khi thanh toán.');
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const result = await orderApi.checkout({
        shiftId: activeShiftId,
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : 'BankTransfer',
        discountAmount: discount || undefined,
        lines: cart.map(item => ({
          productVariantId: item.variantId,
          quantity: item.quantity,
          overridePrice: item.price
        })),
      });

      if (paymentMethod === 'transfer' && result.txnRef) {
        setPendingOrder({
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          txnRef: result.txnRef,
          totalAmount: result.totalAmount,
        });
      } else {
        // Tiền mặt: lưu receipt, clear giỏ và hiện modal
        const receipt = {
          orderNumber: result.orderNumber,
          printedAt: new Date().toLocaleString('vi-VN'),
          subTotal,
          discount,
          total,
          paymentMethod: 'Tiền mặt',
          lines: cart.map(item => ({ productName: item.productName, variantParams: item.variantParams, quantity: item.quantity, price: item.price })),
        };
        setLastReceipt(receipt);
        clearCart();
        setShowSuccessModal(true);
      }
    } catch (e: any) {
      setError(e.message ?? 'Lỗi khi tạo đơn');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferSuccess = () => {
    // Chuyển khoản thành công: lưu receipt và hiện modal
    if (pendingOrder) {
      const receipt = {
        orderNumber: pendingOrder.orderNumber,
        printedAt: new Date().toLocaleString('vi-VN'),
        subTotal,
        discount,
        total: pendingOrder.totalAmount,
        paymentMethod: 'Chuyển khoản',
        lines: cart.map(item => ({ productName: item.productName, variantParams: item.variantParams, quantity: item.quantity, price: item.price })),
      };
      setLastReceipt(receipt);
      clearCart();
      setPendingOrder(null);
      setShowSuccessModal(true);
    }
  };

  // Màn hình chờ chuyển khoản (full-screen overlay)
  if (pendingOrder) {
    return (
      <BankTransferWaiting
        orderId={pendingOrder.orderId}
        orderNumber={pendingOrder.orderNumber}
        txnRef={pendingOrder.txnRef}
        totalAmount={pendingOrder.totalAmount}
        accountNumber={ACCOUNT_NUMBER}
        bankName={BANK_NAME}
        onSuccess={handleTransferSuccess}
        onCancel={() => setPendingOrder(null)}
      />
    );
  }

  const buildReceiptHtml = () => {
    if (!lastReceipt) return '';
    const lines = lastReceipt.lines.map(item => `
      <div style="margin-bottom:6px">
        <div style="font-weight:bold;word-break:break-word">${item.productName}</div>
        ${item.variantParams ? `<div style="font-size:11px;font-style:italic">(${item.variantParams})</div>` : ''}
        <table style="width:100%;border-collapse:collapse"><tbody><tr>
          <td>${item.quantity} x ${formatVnd(item.price)}</td>
          <td style="text-align:right">${formatVnd(item.quantity * item.price)}</td>
        </tr></tbody></table>
      </div>`).join('');
    const discount = lastReceipt.discount > 0
      ? `<tr><td>Giảm giá:</td><td style="text-align:right">-${formatVnd(lastReceipt.discount)}</td></tr>` : '';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HoaDon_${lastReceipt.orderNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; margin: 0; padding: 0; width: 72mm; }
      </style></head><body>
      <div style="text-align:center;margin-bottom:6px">
        <div style="font-size:16px;font-weight:bold">MY POS STORE</div>
        <div style="font-size:11px">Mã ĐH: ${lastReceipt.orderNumber}</div>
        <div style="font-size:11px">${lastReceipt.printedAt}</div>
      </div>
      <div style="border-top:1px dashed #000;margin:5px 0"></div>
      ${lines}
      <div style="border-top:1px dashed #000;margin:5px 0"></div>
      <table style="width:100%;border-collapse:collapse"><tbody>
        <tr><td>Tạm tính:</td><td style="text-align:right">${formatVnd(lastReceipt.subTotal)}</td></tr>
        ${discount}
        <tr style="font-weight:bold;font-size:14px">
          <td style="padding-top:3px">TỔNG CỘNG:</td>
          <td style="text-align:right;padding-top:3px">${formatVnd(lastReceipt.total)}</td>
        </tr>
      </tbody></table>
      <div style="font-size:11px;margin-top:4px">Thanh toán: ${lastReceipt.paymentMethod}</div>
      <div style="border-top:1px dashed #000;margin:5px 0"></div>
      <div style="text-align:center;font-size:11px">Cảm ơn quý khách và hẹn gặp lại!</div>
    </body></html>`;
  };

  const handlePrint = () => {
    const html = buildReceiptHtml();
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  const handleDownloadPdf = () => {
    // Mở tab mới chỉ có nội dung hóa đơn, trình duyệt tự xử lý Save as PDF
    const html = buildReceiptHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full md:w-1/4 lg:w-3/12 shadow-md z-10">
      <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center z-20 relative">
        <h2 className="text-xl font-bold text-slate-800">Thanh toán</h2>
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Trang quản trị">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Đăng xuất">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">

        {/* Cost Summary */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
          <div className="flex justify-between text-slate-600 font-medium">
            <span>Tạm tính</span>
            <span>{formatVnd(subTotal)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-600 font-medium">
            <span>Giảm giá</span>
            <input
              type="number"
              value={discount || ''}
              onChange={(e) => setDiscount(Number(e.target.value))}
              placeholder="0"
              className="w-24 text-right px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
            <span className="text-lg font-bold text-slate-800">Thành tiền</span>
            <span className="text-3xl font-black text-blue-700">
              {formatVnd(total)}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">Phương thức thanh toán</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${paymentMethod === 'cash'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                }`}
            >
              <Banknote className="w-8 h-8 mb-2" />
              <span className="font-bold">Tiền mặt</span>
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${paymentMethod === 'transfer'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                }`}
            >
              <QrCode className="w-8 h-8 mb-2" />
              <span className="font-bold">Chuyển khoản</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <div className="p-4 bg-white border-t border-slate-200 space-y-2">
        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        <button
          disabled={cart.length === 0 || isProcessing || !activeShiftId}
          onClick={handleCheckout}
          className={`w-full py-5 rounded-2xl font-black text-2xl flex items-center justify-center gap-3 transition-transform active:scale-[0.98] ${cart.length === 0 || !activeShiftId
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg focus:ring-4 focus:ring-blue-300'
            }`}
        >
          {isProcessing ? 'Đang xử lý...' : `THANH TOÁN`}
        </button>
      </div>

      {showSuccessModal && lastReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col z-20">
            <div className="bg-emerald-500 p-6 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
                <Banknote className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">Thanh Toán Xong!</h2>
              <p className="opacity-90">{lastReceipt.orderNumber}</p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <button
                onClick={handlePrint}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors"
              >
                In Hóa Đơn
              </button>
              <button
                onClick={handleDownloadPdf}
                className="w-full py-3 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold text-lg transition-colors"
              >
                Tải File PDF
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setLastReceipt(null);
                }}
                className="w-full py-3 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill ẩn trong DOM chỉ dùng cho @media print (nút In Hóa Đơn) */}
      {lastReceipt && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: 9998 }}>
          <div id="receipt-print-content" className="receipt-print"
            style={{ width: '80mm', background: 'white', padding: '4mm', fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#000', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold' }}>MY POS STORE</div>
              <div style={{ fontSize: 11 }}>Mã ĐH: {lastReceipt.orderNumber}</div>
              <div style={{ fontSize: 11 }}>{lastReceipt.printedAt}</div>
            </div>
            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
            {lastReceipt.lines.map((item, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 'bold', wordBreak: 'break-word' }}>{item.productName}</div>
                {item.variantParams && <div style={{ fontSize: 11, fontStyle: 'italic' }}>({item.variantParams})</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                  <td>{item.quantity} x {formatVnd(item.price)}</td>
                  <td style={{ textAlign: 'right' }}>{formatVnd(item.quantity * item.price)}</td>
                </tr></tbody></table>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
              <tr><td>Tạm tính:</td><td style={{ textAlign: 'right' }}>{formatVnd(lastReceipt.subTotal)}</td></tr>
              {lastReceipt.discount > 0 && <tr><td>Giảm giá:</td><td style={{ textAlign: 'right' }}>-{formatVnd(lastReceipt.discount)}</td></tr>}
              <tr style={{ fontWeight: 'bold', fontSize: 14 }}><td>TỔNG CỘNG:</td><td style={{ textAlign: 'right' }}>{formatVnd(lastReceipt.total)}</td></tr>
            </tbody></table>
            <div style={{ fontSize: 11, marginTop: 4 }}>Thanh toán: {lastReceipt.paymentMethod}</div>
            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />
            <div style={{ textAlign: 'center', fontSize: 11 }}>Cảm ơn quý khách và hẹn gặp lại!</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

