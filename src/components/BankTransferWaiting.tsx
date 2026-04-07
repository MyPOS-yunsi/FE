'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Clock, Loader2, X } from 'lucide-react';
import { orderApi } from '@/lib/api';
import { formatVnd } from '@/lib/utils';

interface Props {
  orderId: number;
  orderNumber: string;
  txnRef: string;
  totalAmount: number;
  accountNumber: string; // Số tài khoản ngân hàng
  bankName: string;      // Tên ngân hàng theo SePay (vd: "BIDV", "Vietcombank")
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Màn hình chờ chuyển khoản:
 *  - Hiển thị QR qua qr.sepay.vn (hỗ trợ VA cho BIDV)
 *  - Polling /api/orders/{id}/status mỗi 3s
 *  - Khi paymentStatus = "Success" → gọi onSuccess
 */
export default function BankTransferWaiting({
  orderId,
  orderNumber,
  txnRef,
  totalAmount,
  accountNumber,
  bankName,
  onSuccess,
  onCancel,
}: Props) {
  const [status, setStatus] = useState<'waiting' | 'success' | 'timeout'>('waiting');
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const TIMEOUT_SECONDS = 300; // 5 phút timeout

  // Dùng qr.sepay.vn – hỗ trợ VA (tài khoản ảo) với BIDV và các ngân hàng khác
  const qrUrl = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${encodeURIComponent(bankName)}&amount=${Math.round(totalAmount)}&des=${encodeURIComponent(txnRef)}&template=compact`;

  useEffect(() => {
    // Đếm thời gian chờ
    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= TIMEOUT_SECONDS) {
          setStatus('timeout');
          clearAllIntervals();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    // Polling trạng thái đơn hàng mỗi 3 giây
    pollRef.current = setInterval(async () => {
      try {
        const data = await orderApi.getStatus(orderId);
        if (data.paymentStatus === 'Success') {
          setStatus('success');
          clearAllIntervals();
          setTimeout(onSuccess, 1500); // Delay 1.5s để hiện trạng thái success
        }
      } catch {
        // Network error – tiếp tục polling
      }
    }, 3000);

    return () => clearAllIntervals();
  }, [orderId]);

  const clearAllIntervals = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const remaining = TIMEOUT_SECONDS - elapsed;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 bg-emerald-50 flex flex-col items-center justify-center gap-4">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-14 h-14 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-black text-emerald-700">Thanh toán thành công!</h2>
        <p className="text-slate-500">{orderNumber}</p>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Clock className="w-16 h-16 text-slate-400" />
        <h2 className="text-xl font-bold text-slate-700">Hết thời gian chờ</h2>
        <p className="text-sm text-slate-400">Giao dịch chưa được xác nhận sau 5 phút</p>
        <button onClick={onCancel} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="w-full max-w-sm flex justify-between items-center mb-6">
        <div>
          <p className="text-xs text-slate-400 font-medium">Đơn hàng</p>
          <p className="font-bold text-slate-800">{orderNumber}</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* QR Code */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-lg mb-4">
        <Image
          src={qrUrl}
          alt="QR Chuyển khoản"
          width={220}
          height={280}
          className="rounded-xl"
          unoptimized
        />
      </div>

      {/* Info */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Số tiền</span>
          <span className="font-black text-blue-700 text-lg">{formatVnd(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Nội dung CK</span>
          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded select-all">{txnRef}</span>
        </div>
      </div>

      {/* Polling indicator */}
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Đang chờ xác nhận… {mm}:{ss}</span>
      </div>
    </div>
  );
}
