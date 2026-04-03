'use client';

import { useEffect, useState } from 'react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { usePosStore, Product } from '@/store/posStore';
import { productApi, ProductDetailDto } from '@/lib/api';
import { useShift } from '@/hooks/useShift';
import ProductGrid from '@/components/ProductGrid';
import CartPanel from '@/components/CartPanel';
import CheckoutPanel from '@/components/CheckoutPanel';

function mapDtoToProduct(dto: ProductDetailDto): Product {
  return {
    id: dto.id,
    name: dto.name,
    category: dto.categoryName,
    image: dto.imageUrl ?? null,
    attributes: dto.attributes.map(a => ({
      id: a.name,
      name: a.name,
      values: a.values.map(v => ({ id: v, value: v })),
    })),
    variants: dto.variants.map(v => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode ?? null,
      price: v.retailPrice,
      stock: v.stockQuantity,
      attributes: v.attributes,
    })),
  };
}

export default function Home() {
  const handleBarcodeScan = usePosStore((state) => state.handleBarcodeScan);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useShift(); // sync activeShiftId vào store

  useEffect(() => {
    productApi.listForPos()
      .then(data => setProducts(data.map(mapDtoToProduct)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useBarcodeScanner((barcode) => {
    handleBarcodeScan(barcode, products);
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-800 font-sans">
      <ProductGrid products={products} loading={loading} />
      <CartPanel />
      <CheckoutPanel />
    </div>
  );
}
