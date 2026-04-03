'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, X, RefreshCw } from 'lucide-react';
import { Modal, Field, inputCls, inputSmCls } from '@/components/ui/Modal';
import { genProductCode, slugify } from '@/lib/utils';
import { productApi, categoryApi, type CategoryDto, type ProductSummaryDto, type CreateProductDto, type CreateProductVariantDto, type UpdateProductDto, type ProductDetailDto } from '@/lib/api';

// Types

type AttributeInput = {
  name: string;        // e.g. "Màu sắc"
  values: string[];    // e.g. ["Đỏ", "Xanh"]
};

type VariantRow = {
  id?: number;
  attributes: Record<string, string>; // tổ hợp đã gen, e.g. {Màu: "Đỏ", Size: "S"}
  sku: string;
  barcode: string;
  retailPrice: number;
  costPrice: number;
  initialStock: number;
};

// Helpers

function cartesian(attrs: AttributeInput[]): Record<string, string>[] {
  const filled = attrs.filter(a => a.name.trim() && a.values.some(v => v.trim()));
  if (!filled.length) return [{}];
  const [first, ...rest] = filled;
  const restProd = cartesian(rest);
  return first.values.filter(v => v.trim())
    .flatMap(v => restProd.map(combo => ({ [first.name]: v, ...combo })));
}

// SKU = productCode-SLUG1-SLUG2-...  (bỏ dấu, bỏ space, upper)
function buildSku(productCode: string, combo: Record<string, string>): string {
  const parts = Object.values(combo).map(slugify).filter(Boolean);
  return parts.length ? `${productCode}-${parts.join('-')}` : productCode;
}

// ProductModal

export function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: ProductSummaryDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = product !== null;

  // Categories
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [loadingDetail, setLoadingDetail] = useState(isEdit);
  const [detail, setDetail] = useState<ProductDetailDto | null>(null);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => { });
    if (product) {
      productApi.getDetail(product.id).then(d => {
        setDetail(d);
        setCode(d.code);
        setName(d.name);
        setDescription(d.description ?? '');
        setCategoryId(d.categoryId);
        setIsActive(d.isActive);
        // Populate attrs từ data đã có
        if (d.attributes.length > 0) {
          setAttrs(d.attributes.map(a => ({ name: a.name, values: a.values })));
        }
        // Seed overrides từ variant hiện tại để hiển thị đúng giá/tồn kho
        const initOverrides: Record<string, Partial<VariantRow>> = {};
        d.variants.forEach(v => {
          const key = JSON.stringify(v.attributes);
          initOverrides[key] = {
            sku: v.sku,
            barcode: v.barcode ?? '',
            retailPrice: v.retailPrice,
            costPrice: v.costPrice,
            initialStock: v.stockQuantity,
          };
        });
        setVariantOverrides(initOverrides);
        setLoadingDetail(false);
      }).catch(() => setLoadingDetail(false));
    }
  }, [product]);

  // Basic info
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [image, setImage] = useState<File | null>(null);

  // Attributes
  const [attrs, setAttrs] = useState<AttributeInput[]>([{ name: '', values: [''] }]);

  // Overrides cho từng variant (user chỉnh tay)
  const [variantOverrides, setVariantOverrides] = useState<Record<string, Partial<VariantRow>>>({});

  // Bulk-apply inputs (header row)
  const [bulkRetail, setBulkRetail] = useState('');
  const [bulkCost, setBulkCost] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  // Compute variants from cartesian product
  const generatedVariants = useMemo<VariantRow[]>(() => {
    const skuPrefix = code.trim() || 'CODE';
    return cartesian(attrs).map(combo => {
      const key = JSON.stringify(combo);
      return {
        attributes: combo,
        sku: buildSku(skuPrefix, combo),
        barcode: '',
        retailPrice: 0,
        costPrice: 0,
        initialStock: 0,
        ...variantOverrides[key],
      };
    });
  }, [attrs, code, variantOverrides]); // eslint-disable-line

  const updateOverride = (key: string, patch: Partial<VariantRow>) =>
    setVariantOverrides(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // Bulk apply all
  const applyBulk = () => {
    const patch: Partial<VariantRow> = {};
    if (bulkRetail !== '') patch.retailPrice = +bulkRetail;
    if (bulkCost !== '') patch.costPrice = +bulkCost;
    if (bulkStock !== '') patch.initialStock = +bulkStock;
    const next: Record<string, Partial<VariantRow>> = {};
    generatedVariants.forEach(v => {
      const key = JSON.stringify(v.attributes);
      next[key] = { ...variantOverrides[key], ...patch };
    });
    setVariantOverrides(next);
    setBulkRetail(''); setBulkCost(''); setBulkStock('');
  };

  // Attr helpers
  const addAttr = () => setAttrs(a => [...a, { name: '', values: [''] }]);
  const removeAttr = (i: number) => setAttrs(a => a.filter((_, idx) => idx !== i));
  const updateAttrName = (i: number, val: string) =>
    setAttrs(a => a.map((at, idx) => idx === i ? { ...at, name: val } : at));
  const addValue = (i: number) =>
    setAttrs(a => a.map((at, idx) => idx === i ? { ...at, values: [...at.values, ''] } : at));
  const removeValue = (i: number, vi: number) =>
    setAttrs(a => a.map((at, idx) => idx === i ? { ...at, values: at.values.filter((_, j) => j !== vi) } : at));
  const updateValue = (i: number, vi: number, val: string) =>
    setAttrs(a => a.map((at, idx) => idx === i ? { ...at, values: at.values.map((v, j) => j === vi ? val : v) } : at));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const applyBulkEdit = () => {
    const patch: Partial<VariantRow> = {};
    if (bulkRetail !== '') patch.retailPrice = +bulkRetail;
    if (bulkCost !== '') patch.costPrice = +bulkCost;
    if (bulkStock !== '') patch.initialStock = +bulkStock;
    const next: Record<string, Partial<VariantRow>> = {};
    (isEdit && detail ? detail.variants : generatedVariants).forEach(v => {
      const key = JSON.stringify(v.attributes);
      next[key] = { ...variantOverrides[key], ...patch };
    });
    setVariantOverrides(next);
    setBulkRetail(''); setBulkCost(''); setBulkStock('');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) { setError('Tên và Mã SP là bắt buộc'); return; }

    // Xử lý category mới hoặc đã có
    let resolvedCategoryId: number;
    if (showNewCategory) {
      if (!newCategoryName.trim()) { setError('Tên danh mục mới là bắt buộc'); return; }
      try {
        const created = await categoryApi.create(newCategoryName.trim());
        resolvedCategoryId = created.id;
        setCategories(prev => [...prev, created]);
      } catch { setError('Không thể tạo danh mục mới'); return; }
    } else {
      if (!categoryId) { setError('Vui lòng chọn danh mục'); return; }
      resolvedCategoryId = categoryId as number;
    }

    setSaving(true); setError('');
    try {
      const activeAttrs = attrs
        .map(a => ({ name: a.name.trim(), values: a.values.map(v => v.trim()).filter(v => v) }))
        .filter(a => a.name && a.values.length > 0);

      if (isEdit && detail) {
        // Lấy data từ generatedVariants (đã phản ánh thay đổi sau khi sửa thuộc tính)
        const updateVariants = generatedVariants.map(v => {
          // Lấy ID (nếu SKU đã tồn tại từ trước để backend overwrite)
          const oldVariant = detail.variants.find(old => old.sku === v.sku);
          return {
            id: oldVariant?.id,
            sku: v.sku,
            barcode: v.barcode || '',
            retailPrice: v.retailPrice,
            costPrice: v.costPrice,
            initialStock: v.initialStock,
            attributes: v.attributes
          };
        });
        await productApi.update(product!.id, { name, code, categoryId: resolvedCategoryId, description, isActive, attributes: activeAttrs, variants: updateVariants } satisfies UpdateProductDto, image ?? undefined);
      } else {
        const dto: CreateProductDto = {
          name, code, categoryId: resolvedCategoryId, description,
          variants: generatedVariants.map(v => ({
            sku: v.sku,
            barcode: v.barcode || undefined,
            retailPrice: v.retailPrice,
            costPrice: v.costPrice,
            initialStock: v.initialStock,
            attributes: v.attributes,
          } satisfies CreateProductVariantDto)),
        };
        await productApi.create(dto, image ?? undefined);
      }
      onSaved(); onClose();
    } catch (e: any) {
      setError(e.message ?? 'Lỗi không xác định');
    } finally { setSaving(false); }
  };

  const footer = (
    <div className="flex gap-3">
      <button onClick={onClose} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium">Hủy</button>
      <button onClick={handleSubmit} disabled={saving}
        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-60">
        {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : `Tạo sản phẩm (${generatedVariants.length} biến thể)`}
      </button>
    </div>
  );

  return (
    <Modal title={isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'} onClose={onClose} footer={footer} size="xl">
      {loadingDetail ? (
        <div className="py-10 text-center text-slate-500 text-sm">Đang tải dữ liệu...</div>
      ) : (
        <>
          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên sản phẩm" required>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Mã SP (Dùng làm tiền tố SKU)" required>
              <input
                value={code}
                onChange={e => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                placeholder="VD: A7, T11"
                className={`${inputCls} font-mono`}
                readOnly={isEdit}
              />
              {!isEdit && (
                <p className="text-xs text-slate-400 mt-1">
                  SKU: <span className="font-mono text-blue-600">{code || 'CODE'}-MAUDO-S</span>
                </p>
              )}
            </Field>
          </div>

          {/* Category */}
          <Field label="Danh mục" required>
            <div className="flex gap-2">
              {!showNewCategory ? (
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(+e.target.value || '')}
                  className={`${inputCls} flex-1`}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Tên danh mục mới"
                  className={`${inputCls} flex-1`}
                />
              )}
              <button
                type="button"
                onClick={() => { setShowNewCategory(v => !v); setNewCategoryName(''); setCategoryId(''); }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap font-medium"
              >
                {showNewCategory ? 'Chọn có sẵn' : '+ Danh mục mới'}
              </button>
            </div>
          </Field>

          <Field label="Mô tả">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls} />
          </Field>

          <Field label="Ảnh sản phẩm">
            <input type="file" accept="image/*" onChange={e => setImage(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium" />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-medium text-slate-700">Đang kinh doanh</span>
          </label>

          {/* Attribute builder + Variants - dùng chung cho cả create và edit */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-700 text-sm">Thuộc tính sản phẩm</h3>
              <button onClick={addAttr} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Plus className="w-3.5 h-3.5" /> Thêm thuộc tính
              </button>
            </div>
            {attrs.map((attr, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                <div className="flex gap-2 items-center">
                  <input value={attr.name} onChange={e => updateAttrName(i, e.target.value)}
                    placeholder="Tên thuộc tính (VD: Màu sắc, Size)"
                    className={`${inputSmCls} flex-1 font-medium`} />
                  {attrs.length > 1 && (
                    <button onClick={() => removeAttr(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {attr.values.map((val, vi) => (
                    <div key={vi} className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                      <input value={val} onChange={e => updateValue(i, vi, e.target.value)}
                        placeholder="Giá trị" className="text-xs outline-none w-20 bg-transparent" />
                      {attr.values.length > 1 && (
                        <button onClick={() => removeValue(i, vi)} className="text-slate-300 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addValue(i)}
                    className="text-xs text-blue-500 hover:underline px-2 py-1 border border-dashed border-blue-300 rounded-lg bg-white">
                    + Thêm giá trị
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Generated/Editable variants */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-700 text-sm">Biến thể ({generatedVariants.length})</h3>
              <button onClick={() => setVariantOverrides({})}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
            {generatedVariants.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nhập thuộc tính để tạo biến thể.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                    <tr>
                      {attrs.filter(a => a.name.trim()).map(a => (
                        <th key={a.name} className="px-3 py-2 text-left border-b">{a.name}</th>
                      ))}
                      <th className="px-3 py-2 text-left border-b">SKU</th>
                      <th className="px-3 py-2 text-left border-b">Mã vạch</th>
                      <th className="px-2 py-1 border-b">
                        <div className="text-slate-500 mb-0.5">Giá bán</div>
                        <input type="number" value={bulkRetail} onChange={e => setBulkRetail(e.target.value)}
                          placeholder="Tất cả"
                          className="border border-slate-200 rounded px-1.5 py-0.5 w-20 focus:outline-none focus:border-blue-400" />
                      </th>
                      <th className="px-2 py-1 border-b">
                        <div className="text-slate-500 mb-0.5">Giá vốn</div>
                        <input type="number" value={bulkCost} onChange={e => setBulkCost(e.target.value)}
                          placeholder="Tất cả"
                          className="border border-slate-200 rounded px-1.5 py-0.5 w-20 focus:outline-none focus:border-blue-400" />
                      </th>
                      <th className="px-2 py-1 border-b">
                        <div className="text-slate-500 mb-0.5">Tồn kho</div>
                        <input type="number" value={bulkStock} onChange={e => setBulkStock(e.target.value)}
                          placeholder="Tất cả"
                          className="border border-slate-200 rounded px-1.5 py-0.5 w-16 focus:outline-none focus:border-blue-400" />
                      </th>
                      <th className="px-2 py-1 border-b">
                        <button onClick={applyBulk}
                          className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold hover:bg-blue-700 mt-3 block">
                          Áp dụng
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedVariants.map((v, idx) => {
                      const key = JSON.stringify(v.attributes);
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          {attrs.filter(a => a.name.trim()).map(a => (
                            <td key={a.name} className="px-3 py-1.5">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{v.attributes[a.name]}</span>
                            </td>
                          ))}
                          <td className="px-2 py-1">
                            <input value={v.sku} onChange={e => updateOverride(key, { sku: e.target.value })}
                              className="border border-slate-200 rounded px-2 py-1 w-32 font-mono text-xs focus:outline-none focus:border-blue-400" />
                          </td>
                          <td className="px-2 py-1">
                            <input value={v.barcode} onChange={e => updateOverride(key, { barcode: e.target.value })}
                              placeholder="(tự gen)"
                              className="border border-slate-200 rounded px-2 py-1 w-28 font-mono text-xs focus:outline-none focus:border-blue-400" />
                          </td>
                          <td className="px-2 py-1">
                            <input type="number" value={v.retailPrice} onChange={e => updateOverride(key, { retailPrice: +e.target.value })}
                              className="border border-slate-200 rounded px-2 py-1 w-24 text-xs focus:outline-none focus:border-blue-400" />
                          </td>
                          <td className="px-2 py-1">
                            <input type="number" value={v.costPrice} onChange={e => updateOverride(key, { costPrice: +e.target.value })}
                              className="border border-slate-200 rounded px-2 py-1 w-24 text-xs focus:outline-none focus:border-blue-400" />
                          </td>
                          <td className="px-2 py-1">
                            <input type="number" value={v.initialStock} onChange={e => updateOverride(key, { initialStock: +e.target.value })}
                              className="border border-slate-200 rounded px-2 py-1 w-20 text-xs focus:outline-none focus:border-blue-400" />
                          </td>
                          <td></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </>
      )}
    </Modal>
  );
}
