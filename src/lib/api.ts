const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://localhost:7089';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? 
    document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] : null;

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...init,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
       document.cookie = 'token=; Max-Age=0; path=/';
       window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let msg = await res.text();
    try { msg = JSON.parse(msg).error || JSON.parse(msg).message || msg; } catch { }
    throw new Error(msg);
  }
  return res.json();
}

// Types (match backend DTOs)

export type ProductSummaryDto = {
  id: number;
  name: string;
  code: string;
  categoryName: string;
  imageUrl: string | null;
  variantCount: number;
  totalStock: number;
};

export type AttributeDetailDto = {
  name: string;
  values: string[];
};

export type VariantDetailDto = {
  id: number;
  sku: string;
  barcode?: string;
  retailPrice: number;
  costPrice: number;
  stockQuantity: number;
  attributes: Record<string, string>;
};

export type ProductDetailDto = {
  id: number;
  name: string;
  code: string;
  categoryId: number;
  categoryName: string;
  description?: string;
  isActive: boolean;
  imageUrl?: string;
  attributes: AttributeDetailDto[];
  variants: VariantDetailDto[];
};

export type CreateProductVariantDto = {
  sku: string;
  barcode?: string;
  retailPrice: number;
  costPrice: number;
  initialStock: number;
  attributes: Record<string, string>;
};

export type CreateProductDto = {
  name: string;
  code: string;
  categoryId: number;
  description?: string;
  variants: CreateProductVariantDto[];
};

export type ProductVariantDetail = {
  id: number;
  sku: string;
  barcode: string;
  retailPrice: number;
  salePrice?: number;
  effectivePrice: number;
  stockQuantity: number;
};

export type StockAdjustmentDto = {
  quantityAdded: number;
};

export type UpdateProductVariantDto = {
  id?: number;
  sku: string;
  barcode?: string;
  retailPrice: number;
  costPrice: number;
  initialStock: number;
  attributes: Record<string, string>;
};

export type UpdateProductDto = {
  name: string;
  code: string;
  categoryId: number;
  description?: string;
  isActive: boolean;
  attributes: { name: string; values: string[] }[];
  variants: UpdateProductVariantDto[];
};

// Products

export const productApi = {
  list: (search?: string) =>
    request<ProductSummaryDto[]>(`/api/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  getDetail: (id: number) => 
    request<ProductDetailDto>(`/api/products/${id}`),

  create: (dto: CreateProductDto, image?: File) => {
    const form = new FormData();
    form.append('requestJson', JSON.stringify(dto));
    if (image) form.append('image', image);
    return request<{ productId: number }>('/api/products', { method: 'POST', body: form });
  },

  update: (id: number, dto: UpdateProductDto, image?: File) => {
    const form = new FormData();
    form.append('requestJson', JSON.stringify(dto));
    if (image) form.append('image', image);
    return request<void>(`/api/products/${id}`, { method: 'PUT', body: form });
  },

  delete: (id: number) =>
    request<void>(`/api/products/${id}`, { method: 'DELETE' }),

  scanBarcode: (barcode: string) =>
    request<{ id: number; sku: string; barcode: string; retailPrice: number; effectivePrice: number; stockQuantity: number; productName: string }>(`/api/products/scan/${barcode}`),

  adjustStock: (variantId: number, dto: StockAdjustmentDto) =>
    request<void>(`/api/products/variants/${variantId}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }),

  listForPos: () =>
    request<ProductDetailDto[]>('/api/products/pos'),
};

// Categories

export type CategoryDto = { id: number; name: string };

export const categoryApi = {
  list: () => request<CategoryDto[]>('/api/categories'),
  create: (name: string) =>
    request<CategoryDto>('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
};

// Orders

export type CheckoutRequestDto = {
  shiftId: number;
  customerId?: string;
  paymentMethod: 'Cash' | 'BankTransfer';
  discountAmount?: number;
  lines: { productVariantId: number; quantity: number; overridePrice?: number }[];
};

export type OrderSummaryDto = {
  id: number;
  orderNumber: string;
  totalAmount: number;
  subTotal: number;
  discountAmount: number;
  status: string;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
};

export type OrderInvoiceDto = {
  id: number;
  orderNumber: string;
  totalAmount: number;
  subTotal: number;
  discountAmount: number;
  status: string;
  createdAt: string;
  orderLines: {
    productVariantId: number;
    quantity: number;
    unitPrice: number;
    productVariant?: {
      sku: string;
      product?: { name: string };
      attributes?: Record<string, string>;
    };
  }[];
  payments: { paymentMethod: string; status: string }[];
};

export const orderApi = {
  checkout: (dto: CheckoutRequestDto) =>
    request<{ orderId: number; orderNumber: string; txnRef?: string; totalAmount: number; status: string }>('/api/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }),

  getStatus: (orderId: number) =>
    request<{ orderId: number; status: string; paymentStatus: string; orderNumber: string; totalAmount: number }>(`/api/orders/${orderId}/status`),

  list: () => request<OrderSummaryDto[]>('/api/orders'),

  getInvoice: (orderId: number) => request<OrderInvoiceDto>(`/api/orders/${orderId}/invoice`),

  getFinance: (year?: number, month?: number) => {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? (now.getMonth() + 1);
    return request<FinanceSummaryDto>(`/api/orders/finance?year=${y}&month=${m}`);
  },
};

export type FinanceTransactionDto = {
  orderNumber: string;
  transactionReference?: string;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
  amount: number;
};

export type FinanceSummaryDto = {
  totalRevenue: number;
  totalCash: number;
  totalBankTransfer: number;
  totalOrders: number;
  transactions: FinanceTransactionDto[];
};

// Shifts

export type ShiftDto = {
  id: number;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  status: 'Open' | 'Closed';
  orderCount: number;
  totalRevenue: number;
};

export const shiftApi = {
  current: () => request<ShiftDto | null>('/api/shifts/current'),

  open: (startingCash: number) =>
    request<ShiftDto>('/api/shifts/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startingCash }),
    }),

  close: (shiftId: number, endingCash: number) =>
    request<ShiftDto>(`/api/shifts/${shiftId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endingCash }),
    }),

  history: () => request<ShiftDto[]>('/api/shifts/history'),
};

// Auth

export const authApi = {
  login: (dto: { username: string; password: string }) =>
    request<{ accessToken: string; username: string; fullName: string; role: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }),
};
