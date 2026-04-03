'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Edit, Trash, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { productApi, type ProductSummaryDto, type CreateProductDto, type CreateProductVariantDto } from '@/lib/api';
import { ProductModal } from '@/components/admin/ProductModal';
import { useDebounce } from '@/hooks/useDebounce';
import { slugify } from '@/lib/utils';

export default function ProductsManager() {
  const [products, setProducts] = useState<ProductSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<CreateProductDto[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [modalProduct, setModalProduct] = useState<ProductSummaryDto | null | undefined>(undefined);

  const fetchProducts = async (q: string) => {
    setLoading(true); setError(null);
    try {
      setProducts(await productApi.list(q));
    } catch (err: any) {
      setError(err.message ?? 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(''); }, []); // eslint-disable-line
  useEffect(() => {
    if (!debouncedSearch) return;
    fetchProducts(debouncedSearch);
  }, [debouncedSearch]); // eslint-disable-line

  const handleDelete = async (p: ProductSummaryDto) => {
    if (!confirm(`Xóa "${p.name}"? Không thể hoàn tác.`)) return;
    try { await productApi.delete(p.id); fetchProducts(search); }
    catch (e: any) { alert('Lỗi: ' + e.message); }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(6);
      const map = new Map<string, CreateProductDto>();
      rows.forEach((row) => {
        const code = row[0]?.toString()?.trim();
        const name = row[1]?.toString()?.trim();
        if (!code || !name) return;
        const variantName = row[3]?.toString()?.trim() ?? '';
        const variantSlug = slugify(variantName);
        const variant: CreateProductVariantDto = {
          sku: row[5]?.toString()?.trim() ?? (variantSlug ? `${code}-${variantSlug}` : code),
          barcode: row[7]?.toString()?.trim() || undefined,
          retailPrice: parseInt(row[6]?.toString().replace(/\D/g, '') ?? '0') || 0,
          costPrice: Math.round((parseInt(row[6]?.toString().replace(/\D/g, '') ?? '0') || 0) * 0.7),
          initialStock: parseInt(row[8]?.toString() ?? '0') || 0,
          attributes: variantName ? { 'Phân loại': variantName } : {},
        };
        if (map.has(code)) map.get(code)!.variants.push(variant);
        else map.set(code, { name, code, categoryId: 1, variants: [variant] });
      });
      setPendingImport(Array.from(map.values()));
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async () => {
    if (!pendingImport) return;
    setImporting(true);
    let success = 0, failed = 0;
    for (const dto of pendingImport) {
      try { await productApi.create(dto); success++; } catch { failed++; }
    }
    alert(`Nhập: ${success} thành công, ${failed} thất bại.`);
    setPendingImport(null); setImporting(false); fetchProducts(search);
  };

  return (
    <>
      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(undefined)}
          onSaved={() => fetchProducts(search)}
        />
      )}

      <div className="p-8 h-full flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Sản phẩm</h1>
          <div className="flex gap-3">
            <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleExcelUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2">
              <Upload className="w-5 h-5" /> Nhập Excel
            </button>
            <button onClick={() => setModalProduct(null)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" /> Thêm mới
            </button>
          </div>
        </div>

        {pendingImport && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Xem trước: {pendingImport.length} sản phẩm từ Excel
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setPendingImport(null)} className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm font-medium">Hủy</button>
                <button onClick={handleBulkImport} disabled={importing} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold disabled:opacity-60">
                  {importing ? 'Đang nhập...' : `Xác nhận nhập ${pendingImport.length} SP`}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-sm text-left">
                <thead><tr className="text-amber-700 text-xs">
                  <th className="p-2">Mã SP</th><th className="p-2">Tên</th><th className="p-2">Biến thể</th><th className="p-2">Tổng tồn</th>
                </tr></thead>
                <tbody>{pendingImport.map((p, i) => (
                  <tr key={i} className="border-t border-amber-100">
                    <td className="p-2 font-mono text-xs">{p.code}</td>
                    <td className="p-2 font-medium">{p.name}</td>
                    <td className="p-2">{p.variants.length}</td>
                    <td className="p-2">{p.variants.reduce((s: number, v: CreateProductVariantDto) => s + v.initialStock, 0)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" placeholder="Tìm theo tên hoặc mã SP..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={() => fetchProducts(search)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
              <RefreshCw className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-400">{products.length} sản phẩm</span>
          </div>

          {error && (
            <div className="p-6 text-center text-red-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">{error}</p>
              <button onClick={() => fetchProducts(search)} className="mt-2 text-sm underline">Thử lại</button>
            </div>
          )}
          {loading && !error && <div className="flex-1 flex items-center justify-center text-slate-400">Đang tải...</div>}
          {!loading && !error && (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 text-slate-600 font-medium text-sm">
                  <tr>
                    <th className="p-4 border-b">Ảnh</th>
                    <th className="p-4 border-b">Mã SP</th>
                    <th className="p-4 border-b">Tên sản phẩm</th>
                    <th className="p-4 border-b">Danh mục</th>
                    <th className="p-4 border-b">Biến thể</th>
                    <th className="p-4 border-b">Tồn kho</th>
                    <th className="p-4 border-b text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-100">
                      <td className="p-4">
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-slate-100" />
                          : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xs">N/A</div>}
                      </td>
                      <td className="p-4 font-mono text-sm text-slate-500">{p.code}</td>
                      <td className="p-4 font-bold text-slate-800 max-w-xs truncate" title={p.name}>{p.name}</td>
                      <td className="p-4 text-slate-600">{p.categoryName}</td>
                      <td className="p-4"><span className="bg-slate-200 px-2 py-1 rounded text-xs font-bold text-slate-700">{p.variantCount} loại</span></td>
                      <td className="p-4">
                        {p.totalStock > 0
                          ? <span className="text-emerald-600 font-bold">{p.totalStock}</span>
                          : <span className="text-red-500 font-bold">Hết hàng</span>}
                      </td>
                      <td className="p-4 flex gap-2 justify-center">
                        <button onClick={() => setModalProduct(p)} className="p-2 text-blue-500 hover:bg-blue-100 rounded"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p)} className="p-2 text-red-500 hover:bg-red-100 rounded"><Trash className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={7} className="text-center p-10 text-slate-400">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
