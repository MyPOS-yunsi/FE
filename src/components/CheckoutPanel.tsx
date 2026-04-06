'use client';

import { usePosStore } from '@/store/posStore';
import { orderApi } from '@/lib/api';
import { Banknote, QrCode, LogOut, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatVnd } from '@/lib/utils';
import BankTransferWaiting from './BankTransferWaiting';

// Cấu hình tài khoản ngân hàng – lấy từ env hoặc config
const BANK_BIN = process.env.NEXT_PUBLIC_BANK_BIN ?? '970436'; // VCB mặc định
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

  // Dùng state lưu mã ngẫu nhiên và thời gian để fix lỗi Hydration Mismatch
  const [receiptCode, setReceiptCode] = useState('');
  const [receiptTime, setReceiptTime] = useState('');

  const router = useRouter();

  useEffect(() => {
    // Chỉ khởi tạo trên client
    setReceiptCode(`ORD-${Math.floor(Math.random() * 10000)}`);
    setReceiptTime(new Date().toLocaleString('vi-VN'));
  }, [cart]); // Mỗi khi giỏ hàng đổi, update lại phiếu

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
        // Chuyển sang màn hình chờ chuyển khoản
        setPendingOrder({
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          txnRef: result.txnRef,
          totalAmount: result.totalAmount,
        });
      } else {
        // Tiền mặt: in bill ngay
        window.print();
        clearCart();
      }
    } catch (e: any) {
      setError(e.message ?? 'Lỗi khi tạo đơn');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferSuccess = () => {
    window.print();
    clearCart();
    setPendingOrder(null);
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
        bankBin={BANK_BIN}
        onSuccess={handleTransferSuccess}
        onCancel={() => setPendingOrder(null)}
      />
    );
  }

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

      {/* Printable Receipt Area */}
      <div className="hidden receipt-print bg-white p-2 text-black text-center">
        <h2 className="text-xl font-bold mb-2">MY POS STORE</h2>
        <p className="text-xs mb-4">Mã ĐH: {receiptCode}<br />{receiptTime}</p>
        <hr className="border-dashed border-black my-2" />
        <div className="text-left w-full">
          {cart.map(item => (
            <div key={item.variantId} className="mb-2">
              <div className="break-words font-semibold">{item.productName}</div>
              <div className="break-words text-[10px] mb-1 italic">({item.variantParams})</div>
              <div className="flex justify-between">
                <span>{item.quantity} x {formatVnd(item.price)}</span>
                <span>{formatVnd(item.quantity * item.price)}</span>
              </div>
            </div>
          ))}
        </div>
        <hr className="border-dashed border-black my-2" />
        <div className="flex justify-between font-bold text-sm">
          <span>TỔNG CỘNG:</span>
          <span>{formatVnd(total)}</span>
        </div>
        <p className="mt-6 text-xs text-center">Cảm ơn quý khách và hẹn gặp lại!</p>
      </div>
    </div>
  );
}
