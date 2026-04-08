import { formatVnd } from './utils';

export type ReceiptData = {
  orderNumber: string;
  printedAt: string;
  subTotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  lines: {
    productName: string;
    variantParams?: string;
    quantity: number;
    price: number;
  }[];
};

export function buildReceiptHtml(receipt: ReceiptData): string {
  const lines = receipt.lines.map(item => `
    <div style="margin-bottom:6px">
      <div style="font-weight:bold;word-break:break-word">${item.productName}</div>
      ${item.variantParams ? `<div style="font-size:11px;font-style:italic">(${item.variantParams})</div>` : ''}
      <table style="width:100%;border-collapse:collapse"><tbody><tr>
        <td>${item.quantity} x ${formatVnd(item.price)}</td>
        <td style="text-align:right">${formatVnd(item.quantity * item.price)}</td>
      </tr></tbody></table>
    </div>`).join('');

  const discountRow = receipt.discount > 0
    ? `<tr><td>Giảm giá:</td><td style="text-align:right">-${formatVnd(receipt.discount)}</td></tr>` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HoaDon_${receipt.orderNumber}</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; margin: 0; padding: 0; width: 72mm; }
    </style></head><body>
    <div style="text-align:center;margin-bottom:6px">
      <div style="font-size:16px;font-weight:bold">MY POS STORE</div>
      <div style="font-size:11px">Mã ĐH: ${receipt.orderNumber}</div>
      <div style="font-size:11px">${receipt.printedAt}</div>
    </div>
    <div style="border-top:1px dashed #000;margin:5px 0"></div>
    ${lines}
    <div style="border-top:1px dashed #000;margin:5px 0"></div>
    <table style="width:100%;border-collapse:collapse"><tbody>
      <tr><td>Tạm tính:</td><td style="text-align:right">${formatVnd(receipt.subTotal)}</td></tr>
      ${discountRow}
      <tr style="font-weight:bold;font-size:14px">
        <td style="padding-top:3px">TỔNG CỘNG:</td>
        <td style="text-align:right;padding-top:3px">${formatVnd(receipt.total)}</td>
      </tr>
    </tbody></table>
    <div style="font-size:11px;margin-top:4px">Thanh toán: ${receipt.paymentMethod}</div>
    <div style="border-top:1px dashed #000;margin:5px 0"></div>
    <div style="text-align:center;font-size:11px">Cảm ơn quý khách và hẹn gặp lại!</div>
  </body></html>`;
}

export function openReceiptWindow(html: string): void {
  const win = window.open('', '_blank', 'width=400,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}

export function downloadReceiptAsHtml(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}
