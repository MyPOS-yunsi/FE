'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Clock, Loader2, Monitor, MonitorOff, Settings, X } from 'lucide-react';
import { orderApi } from '@/lib/api';
import { formatVnd } from '@/lib/utils';
import { useQrDisplay } from '@/hooks/useQrDisplay';

interface Props {
  orderId: number;
  orderNumber: string;
  txnRef: string;
  totalAmount: number;
  accountNumber: string;
  bankName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

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
  const [orderStatus, setOrderStatus] = useState<'waiting' | 'success' | 'timeout'>('waiting');
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const TIMEOUT_SECONDS = 300;

  // Màn hình QR COM (iQR01SN)
  const { status: comStatus, error: comError, isSupported, requestPort, sendQr } = useQrDisplay();
  const sentToDeviceRef = useRef(false);

  // QR URL để hiển thị trên màn hình (fallback)
  const qrUrl = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${encodeURIComponent(bankName)}&amount=${Math.round(totalAmount)}&des=${encodeURIComponent(txnRef)}&template=compact`;

  // Nội dung gửi tới thiết bị: URL đầy đủ để thiết bị encode thành QR
  const qrContent = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${encodeURIComponent(bankName)}&amount=${Math.round(totalAmount)}&des=${encodeURIComponent(txnRef)}`;

  // Khi kết nối COM thành công → gửi QR ngay (chỉ gửi 1 lần)
  useEffect(() => {
    if (comStatus === 'connected' && !sentToDeviceRef.current) {
      sentToDeviceRef.current = true;
      sendQr(qrContent);
    }
  }, [comStatus, qrContent, sendQr]);

  // Timer + polling
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= TIMEOUT_SECONDS) { setOrderStatus('timeout'); clearAll(); return prev; }
        return prev + 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const data = await orderApi.getStatus(orderId);
        if (data.paymentStatus === 'Success') {
          setOrderStatus('success');
          clearAll();
          setTimeout(onSuccess, 1500);
        }
      } catch { /* tiếp tục polling */ }
    }, 3000);

    return () => clearAll();
  }, [orderId]); // eslint-disable-line

  const clearAll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const remaining = TIMEOUT_SECONDS - elapsed;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  // ─── Success ───────────────────────────────────────────────────────────────
  if (orderStatus === 'success') {
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

  // ─── Timeout ───────────────────────────────────────────────────────────────
  if (orderStatus === 'timeout') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Clock className="w-16 h-16 text-slate-400" />
        <h2 className="text-xl font-bold text-slate-700">Hết thời gian chờ</h2>
        <p className="text-sm text-slate-400">Giao dịch chưa được xác nhận sau 5 phút</p>
        <button onClick={onCancel} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">Quay lại</button>
      </div>
    );
  }

  const deviceConnected = comStatus === 'connected';

  // ─── Waiting ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6">

      {/* Header */}
      <div className="w-full max-w-sm flex justify-between items-center mb-4">
        <div>
          <p className="text-xs text-slate-400 font-medium">Đơn hàng</p>
          <p className="font-bold text-slate-800">{orderNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Badge trạng thái màn hình COM */}
          {isSupported && (
            <button
              onClick={deviceConnected ? undefined : requestPort}
              title={deviceConnected ? `Màn hình QR đang kết nối${comError ? ' – ' + comError : ''}` : 'Kết nối màn hình QR (COM)'}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                deviceConnected
                  ? 'bg-emerald-100 text-emerald-700 cursor-default'
                  : comStatus === 'connecting'
                  ? 'bg-amber-100 text-amber-700 cursor-wait'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer'
              }`}
            >
              {deviceConnected ? (
                <><Monitor className="w-3.5 h-3.5" /> Màn hình KH</>
              ) : comStatus === 'connecting' ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang kết nối…</>
              ) : (
                <><MonitorOff className="w-3.5 h-3.5" /><Settings className="w-3 h-3" /> Chọn cổng COM</>
              )}
            </button>
          )}
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* QR — ẩn nếu đã gửi tới màn hình COM, hiện nếu fallback */}
      {deviceConnected ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 px-12 bg-emerald-50 border-2 border-emerald-200 rounded-2xl mb-4">
          <Monitor className="w-12 h-12 text-emerald-500" />
          <p className="font-bold text-emerald-700 text-center">QR đã hiển thị trên<br />màn hình khách hàng</p>
          <p className="text-xs text-emerald-500">Khách quét QR trên thiết bị iQR01SN</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-lg mb-4">
          <Image src={qrUrl} alt="QR Chuyển khoản" width={220} height={280} className="rounded-xl" unoptimized />
        </div>
      )}

      {/* Thông tin thanh toán */}
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
