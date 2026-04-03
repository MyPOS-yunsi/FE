import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProductAttributeValue = {
  id: string;
  value: string;
};

export type ProductAttribute = {
  id: string;
  name: string;
  values: ProductAttributeValue[];
};

export type ProductVariant = {
  id: number;
  sku: string;
  barcode: string | null;
  price: number;
  stock: number;
  attributes: Record<string, string>; // e.g., { "Màu sắc": "Đen", "Size": "L" }
};

export type Product = {
  id: number;
  name: string;
  category: string;
  image: string | null;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
};

export type CartItem = {
  variantId: number;
  productName: string;
  variantParams: string; // "Đen - L"
  price: number;
  quantity: number;
};

interface PosState {
  cart: CartItem[];
  discount: number;
  paymentMethod: string;
  searchTerm: string;
  selectedCategory: string;
  activeShiftId: number | null;

  // Actions
  addToCart: (product: Product, variant: ProductVariant) => void;
  removeFromCart: (variantId: number) => void;
  updateQuantity: (variantId: number, delta: number) => void;
  setDiscount: (amount: number) => void;
  setPaymentMethod: (method: string) => void;
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  setActiveShiftId: (id: number | null) => void;
  clearCart: () => void;
  handleBarcodeScan: (barcode: string, products: Product[]) => void;
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      cart: [],
      discount: 0,
      paymentMethod: 'cash',
      searchTerm: '',
      selectedCategory: 'all',
      activeShiftId: null,

      addToCart: (product, variant) => set((state) => {
        const existingInfo = state.cart.find((item) => item.variantId === variant.id);
        if (existingInfo) {
          return {
            cart: state.cart.map((item) =>
              item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item
            )
          };
        }

        const paramsArray = Object.values(variant.attributes);
        const variantParams = paramsArray.length > 0 ? paramsArray.join(' - ') : 'Mặc định';

        return {
          cart: [...state.cart, {
            variantId: variant.id,
            productName: product.name,
            variantParams: variantParams,
            price: variant.price,
            quantity: 1
          }]
        };
      }),

      removeFromCart: (variantId) => set((state) => ({
        cart: state.cart.filter((item) => item.variantId !== variantId)
      })),

      updateQuantity: (variantId, delta) => set((state) => ({
        cart: state.cart.map((item) => {
          if (item.variantId !== variantId) return item;
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        })
      })),

      setDiscount: (amount) => set({ discount: amount }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setActiveShiftId: (id) => set({ activeShiftId: id }),
      clearCart: () => set({ cart: [], discount: 0 }),
      handleBarcodeScan: (barcode: string, products: Product[]) => {
        for (const product of products) {
          const variant = product.variants.find(v => v.barcode === barcode);
          if (variant) {
            get().addToCart(product, variant);
            return;
          }
        }
        console.warn(`Variant with barcode ${barcode} not found!`);
      }
    }),
    {
      name: 'pos-storage',
    }
  )
);
