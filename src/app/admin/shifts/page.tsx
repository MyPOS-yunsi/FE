'use client';

import { useState } from 'react';
import { Clock, Play, Square, History, TrendingUp, ShoppingBag, Banknote, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useShift } from '@/hooks/useShift';
import { shiftApi, ShiftDto } from '@/lib/api';
import { formatVnd, formatTimeUtc, calcShiftDuration } from '@/lib/utils';

// Modal

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Open Shift Modal

function OpenShiftModal({ onClose, onOpen }: { onClose: () => void; onOpen: (cash: number) => Promise<ShiftDto> }) {
  const [cash, setCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    const n = parseFloat(cash.replace(/\D/g, ''));
    if (isNaN(n) || n < 0) { setErr('Nhập số tiền hợp lệ'); return; }
    setLoading(true);
    try { await onOpen(n); onClose(); }
    catch (e: any) { setErr(e.message ?? 'Lỗi mở ca'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Vào ca làm việc" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-4">Nhập số tiền mặt đầu ca tại quầy để bắt đầu.</p>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Tiền mặt đầu ca</label>
      <div className="relative mb-4">
        <input
          type="number"
          min={0}
          value={cash}
          onChange={e => setCash(e.target.value)}
          placeholder="0"
          className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
      </div>
      {err && <p className="text-red-500 text-sm mb-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{err}</p>}
      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Play className="w-5 h-5" /> {loading ? 'Đang mở ca…' : 'Bắt đầu ca'}
      </button>
    </Modal>
  );
}

// Close Shift Modal

function CloseShiftModal({ shift, onClose, onClose2 }: { shift: ShiftDto; onClose: () => void; onClose2: (cash: number) => Promise<ShiftDto> }) {
  const [cash, setCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const expectedCash = shift.startingCash + shift.totalRevenue;

  const submit = async () => {
    const n = parseFloat(cash.replace(/\D/g, ''));
    if (isNaN(n) || n < 0) { setErr('Nhập số tiền hợp lệ'); return; }
    setLoading(true);
    try { await onClose2(n); onClose(); }
    catch (e: any) { setErr(e.message ?? 'Lỗi đóng ca'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Kết thúc ca làm việc" onClose={onClose}>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-600">Tiền đầu ca</span><span className="font-bold">{formatVnd(shift.startingCash)}</span></div>
        <div className="flex justify-between"><span className="text-slate-600">Doanh thu ca</span><span className="font-bold text-emerald-600">+ {formatVnd(shift.totalRevenue)}</span></div>
        <div className="flex justify-between pt-2 border-t border-amber-200"><span className="font-semibold text-slate-700">Kỳ vọng tại két</span><span className="font-black text-blue-700">{formatVnd(expectedCash)}</span></div>
      </div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Tiền mặt thực tế tại két</label>
      <div className="relative mb-4">
        <input
          type="number"
          min={0}
          value={cash}
          onChange={e => setCash(e.target.value)}
          placeholder="0"
          className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-400"
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
      </div>
      {cash && !isNaN(+cash) && (
        <div className={`text-sm font-semibold mb-3 ${+cash < expectedCash ? 'text-red-500' : 'text-emerald-600'}`}>
          {+cash < expectedCash
            ? `⚠ Thiếu ${formatVnd(expectedCash - +cash)}`
            : `✓ Thừa ${formatVnd(+cash - expectedCash)}`}
        </div>
      )}
      {err && <p className="text-red-500 text-sm mb-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{err}</p>}
      <button
        onClick={submit}
        disabled={loading}
        className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Square className="w-5 h-5 fill-white" /> {loading ? 'Đang đóng ca…' : 'Xác nhận kết ca'}
      </button>
    </Modal>
  );
}

// History Row

function HistoryRow({ s }: { s: ShiftDto }) {
  return (
    <div className="grid grid-cols-6 gap-4 py-3 px-4 text-sm text-slate-600 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <span className="font-mono text-slate-400">#{s.id}</span>
      <span>{formatTimeUtc(s.startTime)}</span>
      <span>{s.endTime ? formatTimeUtc(s.endTime) : '—'}</span>
      <span className="font-semibold text-slate-700">{formatVnd(s.startingCash)}</span>
      <span className="font-bold text-emerald-600">{formatVnd(s.totalRevenue)}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold w-fit ${s.status === 'Open' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
        {s.status === 'Open' ? 'Đang mở' : 'Đã đóng'}
      </span>
    </div>
  );
}

// Page

export default function ShiftsPage() {
  const { shift, loading, openShift, closeShift } = useShift();
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [history, setHistory] = useState<ShiftDto[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    if (historyLoaded) return;
    setHistoryLoading(true);
    const data = await shiftApi.history();
    setHistory(data);
    setHistoryLoaded(true);
    setHistoryLoading(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-black text-slate-800">Quản lý Ca làm việc</h1>

      {/* Current shift card */}
      <div className={`rounded-2xl border-2 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 transition-colors ${shift?.status === 'Open'
        ? 'bg-blue-50 border-blue-200'
        : 'bg-white border-slate-200'
        }`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${shift?.status === 'Open' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
          }`}>
          <Clock className="w-8 h-8" />
        </div>

        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="text-slate-400 animate-pulse">Đang tải…</p>
          ) : shift?.status === 'Open' ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Ca đang mở</span>
              </div>
              <h2 className="text-lg font-bold text-slate-800">Bắt đầu {formatTimeUtc(shift.startTime)}</h2>
              <p className="text-sm text-slate-500">Thời gian: {calcShiftDuration(shift.startTime)} · Tiền đầu ca: {formatVnd(shift.startingCash)}</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-700">Chưa có ca làm việc</h2>
              <p className="text-sm text-slate-400">Nhấn "Vào ca" để bắt đầu nhận đơn hàng.</p>
            </>
          )}
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            disabled={!!shift && shift.status === 'Open'}
            onClick={() => setShowOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all
              bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200
              disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" /> Vào ca
          </button>
          <button
            disabled={!shift || shift.status !== 'Open'}
            onClick={() => setShowClose(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all
              bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200
              disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Square className="w-4 h-4 fill-white" /> Kết ca
          </button>
        </div>
      </div>

      {/* Stats of current shift */}
      {shift?.status === 'Open' && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Đơn hàng', value: shift.orderCount.toString(), icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
            { label: 'Doanh thu ca', value: formatVnd(shift.totalRevenue), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Kỳ vọng két', value: formatVnd(shift.startingCash + shift.totalRevenue), icon: Banknote, color: 'text-amber-600 bg-amber-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-lg font-black text-slate-800">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={loadHistory}
          className="w-full flex items-center justify-between px-6 py-4 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2"><History className="w-5 h-5 text-slate-400" /> Lịch sử ca làm việc (30 ngày gần nhất)</span>
          <span className="text-xs text-slate-400">{historyLoaded ? `${history.length} ca` : 'Nhấn để tải'}</span>
        </button>

        {historyLoading && <p className="text-center py-6 text-slate-400 text-sm animate-pulse">Đang tải lịch sử…</p>}

        {historyLoaded && (
          history.length === 0
            ? <p className="text-center py-6 text-slate-400 text-sm">Chưa có ca nào</p>
            : (
              <div>
                <div className="grid grid-cols-6 gap-4 px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                  <span>Ca #</span><span>Bắt đầu</span><span>Kết thúc</span><span>Đầu ca</span><span>Doanh thu</span><span>Trạng thái</span>
                </div>
                {history.map(s => <HistoryRow key={s.id} s={s} />)}
              </div>
            )
        )}
      </div>

      {/* Modals */}
      {showOpen && (
        <OpenShiftModal onClose={() => setShowOpen(false)} onOpen={openShift} />
      )}
      {showClose && shift && shift.status === 'Open' && (
        <CloseShiftModal shift={shift} onClose={() => setShowClose(false)} onClose2={closeShift} />
      )}
    </div>
  );
}
