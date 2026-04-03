'use client';

import { usePosStore, Product, ProductVariant } from '@/store/posStore';
import { Search, X, Check } from 'lucide-react';
import { useState, useMemo } from 'react';

const CATEGORIES = ['all', 'shirts', 'pants', 'accessories', 'shoes'];

export default function ProductGrid({ products, loading }: { products: Product[]; loading?: boolean }) {
  const { searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, addToCart } = usePosStore();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants.some(v => v.barcode?.includes(searchTerm));

    return matchCategory && matchSearch;
  });

  const handleProductClick = (product: Product) => {
    // Nếu SP không có nhánh thuộc tính nào (như "Mũ lưỡi trai") hoặc chỉ 1 variant => Pick thẳng
    if (!product.attributes || product.attributes.length === 0 || product.variants.length === 1) {
      addToCart(product, product.variants[0]);
    } else {
      // Có nhiều thuộc tính, yêu cầu chọn qua Popup
      setSelectedProduct(product);
      setSelectedOptions({});
    }
  };

  const handleOptionSelect = (attrName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [attrName]: value
    }));
  };

  // Xác định biến thể đang thoả mãn các Attributes user vừa bấm
  const matchingVariant = useMemo(() => {
    if (!selectedProduct) return null;

    // Yêu cầu user phải chọn đủ tất cả Option
    const isAllSelected = selectedProduct.attributes.every(attr => selectedOptions[attr.name] != null);
    if (!isAllSelected) return null;

    // Tìm ra cái nào khớp hoàn toàn với các lựa chọn
    return selectedProduct.variants.find(v => {
      return Object.keys(v.attributes).every(attrKey => v.attributes[attrKey] === selectedOptions[attrKey]);
    });
  }, [selectedProduct, selectedOptions]);

  const handleAddToCartModal = () => {
    if (selectedProduct && matchingVariant) {
      addToCart(selectedProduct, matchingVariant);
      setSelectedProduct(null); // Đóng pop-up
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 shadow-sm w-full md:w-1/2 lg:w-7/12 relative">
        {/* Top Header & Search */}
        <div className="p-4 bg-white border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Mặt hàng</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              autoFocus
              type="text"
              placeholder="Tìm theo Tên hoặc tít mã vạch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors capitalize ${selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid Lưới Sản Phẩm */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Đang tải sản phẩm...</div>
          ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const minPrice = Math.min(...p.variants.map(v => v.price));
              const maxPrice = Math.max(...p.variants.map(v => v.price));
              const priceString = minPrice === maxPrice
                ? `${minPrice.toLocaleString('vi-VN')} ₫`
                : `${minPrice.toLocaleString('vi-VN')} - ${maxPrice.toLocaleString('vi-VN')} ₫`;

              return (
                <button
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="group flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-300 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="h-32 w-full bg-slate-100 flex items-center justify-center p-2 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image ?? undefined} alt={p.name} className="max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" />
                    {p.attributes && p.attributes.length > 0 && (
                      <div className="absolute top-2 right-2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        Có biến thể
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-left w-full border-t border-slate-100">
                    <h3 className="font-semibold text-slate-800 line-clamp-2 text-sm h-10">{p.name}</h3>
                    <p className="text-blue-600 font-bold mt-2 text-sm">{priceString}</p>
                  </div>
                </button>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* Shopee-style Attributes Selection Modal */}
      {selectedProduct && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

            {/* Header Box */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-start">
              <div className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedProduct.image ?? undefined} alt="" className="w-20 h-20 bg-slate-100 rounded-lg object-contain" />
                <div>
                  <h3 className="font-bold text-lg text-slate-800 line-clamp-2">{selectedProduct.name}</h3>

                  {/* Hiển thị giá và tồn rỗng nếu chưa chọn đủ, hiển thị giá thật nếu đã chọn xong */}
                  {matchingVariant ? (
                    <>
                      <p className="text-blue-600 font-black text-xl">{matchingVariant.price.toLocaleString('vi-VN')} ₫</p>
                      <p className="text-sm text-slate-500">Kho: {matchingVariant.stock > 0 ? matchingVariant.stock : 'Hết hàng'}</p>
                    </>
                  ) : (
                    <p className="text-slate-500 italic mt-2">Vui lòng chọn phân loại hàng</p>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Box Chọn Thuộc tính */}
            <div className="p-4 overflow-y-auto space-y-5">
              {selectedProduct.attributes.map(attr => (
                <div key={attr.id} className="space-y-2">
                  <h4 className="font-semibold text-slate-700 capitalize">{attr.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map(val => {
                      const isSelected = selectedOptions[attr.name] === val.value;

                      return (
                        <button
                          key={val.id}
                          onClick={() => handleOptionSelect(attr.name, val.value)}
                          className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${isSelected
                              ? 'border-blue-600 text-blue-600 bg-blue-50'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                            }`}
                        >
                          {val.value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Button Block */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              {/* Logic chặn bấm nếu: Chưa khoanh đủ nhóm AND (Khoanh đủ nhưng Null do chưa sx DB) AND (Stock <= 0) */}
              <button
                onClick={handleAddToCartModal}
                disabled={!matchingVariant || matchingVariant.stock <= 0}
                className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${matchingVariant && matchingVariant.stock > 0
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {matchingVariant ? (
                  matchingVariant.stock > 0 ? (
                    <>Thêm Vào Giỏ Hàng <Check className="w-5 h-5" /> </>
                  ) : 'Hết Hàng'
                ) : 'Chưa Chọn Đủ Phân Loại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
