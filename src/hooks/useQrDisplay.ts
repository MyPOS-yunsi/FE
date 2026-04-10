'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type QrDisplayStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported';

/**
 * Giao thức gửi đến iQR01SN – chưa có tài liệu chính thức.
 * Thử lần lượt các format phổ biến:
 *   FORMAT_RAW   : "<url>\r\n"           – đơn giản nhất, hầu hết thiết bị Trung Quốc
 *   FORMAT_FRAME : STX + "<url>" + ETX   – frame kiểu ESC/POS
 *   FORMAT_JSON  : JSON object           – một số thiết bị iPOS dùng JSON
 *
 * Đổi QR_PROTOCOL trong env nếu cần thử format khác.
 */
const QR_PROTOCOL = (process.env.NEXT_PUBLIC_QR_PROTOCOL ?? 'RAW') as 'RAW' | 'FRAME' | 'JSON';
const QR_BAUD = parseInt(process.env.NEXT_PUBLIC_QR_BAUD ?? '9600');

function buildPayload(content: string): Uint8Array {
  const encoder = new TextEncoder();
  switch (QR_PROTOCOL) {
    case 'FRAME':
      // STX (0x02) + data + ETX (0x03)
      return encoder.encode(`\x02${content}\x03`);
    case 'JSON':
      return encoder.encode(JSON.stringify({ type: 'QR', data: content }) + '\r\n');
    case 'RAW':
    default:
      return encoder.encode(`${content}\r\n`);
  }
}

export function useQrDisplay() {
  const [status, setStatus] = useState<QrDisplayStatus>('idle');
  const [error, setError] = useState<string>('');
  const portRef = useRef<SerialPort | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);

  // Kiểm tra trình duyệt có hỗ trợ Web Serial không
  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  const disconnect = useCallback(async () => {
    try {
      writerRef.current?.releaseLock();
      writerRef.current = null;
      await portRef.current?.close();
      portRef.current = null;
    } catch { /* ignore */ }
    setStatus('idle');
  }, []);

  // Thử kết nối port đã được cấp quyền từ lần trước (tự động)
  const autoConnect = useCallback(async () => {
    if (!isSupported) { setStatus('unsupported'); return; }
    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length === 0) return; // chưa có port nào được cấp quyền
      const port: SerialPort = ports[0];
      await port.open({ baudRate: QR_BAUD, dataBits: 8, stopBits: 1, parity: 'none' });
      portRef.current = port;
      writerRef.current = port.writable!.getWriter();
      setStatus('connected');
      setError('');
    } catch { /* không có port → im lặng */ }
  }, [isSupported]);

  // Người dùng bấm chọn port thủ công
  const requestPort = useCallback(async () => {
    if (!isSupported) { setStatus('unsupported'); return; }
    setStatus('connecting');
    try {
      const port: SerialPort = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: QR_BAUD, dataBits: 8, stopBits: 1, parity: 'none' });
      portRef.current = port;
      writerRef.current = port.writable!.getWriter();
      setStatus('connected');
      setError('');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Không thể kết nối màn hình QR');
    }
  }, [isSupported]);

  // Gửi QR content tới thiết bị
  const sendQr = useCallback(async (content: string): Promise<boolean> => {
    if (!writerRef.current) return false;
    try {
      const payload = buildPayload(content);
      await writerRef.current.write(payload);
      return true;
    } catch (e: any) {
      setStatus('error');
      setError('Lỗi ghi serial: ' + e?.message);
      return false;
    }
  }, []);

  // Auto-connect khi mount
  useEffect(() => {
    autoConnect();
    return () => { disconnect(); };
  }, []); // eslint-disable-line

  return { status, error, isSupported, requestPort, sendQr, disconnect };
}
