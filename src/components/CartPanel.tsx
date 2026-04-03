'use client';

import { usePosStore } from '@/store/posStore';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatVnd } from '@/lib/utils';

export default function CartPanel() {
  const { cart, updateQuantity, removeFromCart, clearCart } = usePosStore();

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-sm w-full md:w-1/4 lg:w-3/12">
      {/* Header */}
      <div className="p-4 bg-slate-800 text-white flex justify-between items-center whitespace-nowrap">
        <h2 className="text-xl font-bold">Giỏ hàng</h2>
        <span className="bg-slate-700 px-3 py-1 rounded-full text-sm font-medium">
          {cart.reduce((acc, item) => acc + item.quantity, 0)} items
        </span>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto bg-white p-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">🛒</span>
            </div>
            <p className="font-medium">Chưa có sản phẩm nào</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {cart.map((item) => (
              <li
                key={item.variantId}
                className="bg-white border text-black border-slate-100 shadow-sm rounded-lg p-3 flex flex-col gap-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col pr-2">
                    <span className="font-semibold text-slate-800 line-clamp-2 text-sm">
                      {item.productName}
                    </span>
                    <span className="text-xs text-blue-600 bg-blue-50 w-fit px-1.5 py-0.5 rounded mt-0.5">
                      {item.variantParams}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.variantId)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.variantId, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm active:scale-95 text-slate-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-4 text-center font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.variantId, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm active:scale-95 text-slate-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="font-bold text-blue-700">
                    {formatVnd(item.price * item.quantity)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cart Actions */}
      {cart.length > 0 && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 gap-2 flex flex-col">
          <button
            onClick={clearCart}
            className="w-full py-2.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Hủy đơn (Clear)
          </button>
        </div>
      )}
    </div>
  );
}
