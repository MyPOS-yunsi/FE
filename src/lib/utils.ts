/**
 * Chuyển chuỗi có dấu/khoảng trắng thành slug dùng cho SKU.
 * VD: "Màu Đỏ Đậm" → "MauDoDam"
 */
export const slugify = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu kết hợp
    .replace(/đ/gi, 'd') // đặc biệt: đ/Đ
    .replace(/[^a-zA-Z0-9]/g, '') // bỏ space + ký tự đặc biệt
    .toUpperCase();

/**
 * EAN-13 generator theo chuẩn Việt Nam
 * 893 (VN) + companyCode + 6 số mặt hàng + 1 số kiểm tra
 */
export const genEan13 = (companyCode = '4896'): string => {
  const item = (Date.now() % 1_000_000).toString().padStart(6, '0');
  const digits = '893' + companyCode + item;
  let oddSum = 0, evenSum = 0;
  for (let i = 0; i < 12; i++) {
    const pos = 12 - i;
    const d = parseInt(digits[i]);
    if (pos % 2 === 1) oddSum += d; else evenSum += d;
  }
  const check = (10 - (oddSum * 3 + evenSum) % 10) % 10;
  return digits + check;
};

/** Tạo mã SP nội bộ tự động */
export const genProductCode = (): string =>
  `SP${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;

/** Format tiền Việt */
export const formatVnd = (amount: number): string => {
  return amount.toLocaleString('vi-VN') + ' ₫';
};

/** Parse chuẩn chuỗi UTC từ CSDL và Convert sang giờ địa phương (vi-VN) */
export const formatTimeUtc = (iso: string): string => {
  let dtStr = iso;
  if (!dtStr.endsWith('Z') && !dtStr.includes('+')) dtStr += 'Z';
  return new Date(dtStr).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

/** Tính khoảng thời gian giữa hai mốc (dành riêng cho Shift/Ca làm việc) */
export const calcShiftDuration = (start: string, end?: string): string => {
  let startStr = start;
  if (!startStr.endsWith('Z') && !startStr.includes('+')) startStr += 'Z';

  let endStr = end;
  if (endStr && !endStr.endsWith('Z') && !endStr.includes('+')) endStr += 'Z';

  const ms = new Date(endStr ?? new Date()).getTime() - new Date(startStr).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};
