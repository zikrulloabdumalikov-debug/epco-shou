import React, { useState } from 'react';
import { CartItem, Language, ClientStats } from '../types';
import { translations } from '../i18n';
import { playSuccessFanfare, triggerHaptic } from '../utils/audio';

interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  stats: ClientStats;
  language: Language;
  isLargeText?: boolean;
  onClose: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onClearCart: () => void;
  onSubmitOrder: () => Promise<{ orderNumber?: string; message?: string } | void>;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  stats,
  language,
  isLargeText,
  onClose,
  onUpdateQuantity,
  onClearCart,
  onSubmitOrder,
}) => {
  const t = translations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderInfo, setOrderInfo] = useState<{ orderNumber?: string; message?: string } | null>(null);

  if (!isOpen) return null;

  const totalSum = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const projectedTotal = stats.confirmedAmount + totalSum;
  const potentialNewTickets = Math.floor(projectedTotal / 1000) - stats.tickets;

  const handleCheckout = async () => {
    if (!cart.length) return;
    setIsSubmitting(true);
    triggerHaptic(40);

    try {
      const res = await onSubmitOrder();
      playSuccessFanfare();
      if (res) {
        setOrderInfo(res);
      }
      setOrderCompleted(true);
    } catch (err: any) {
      console.error('Checkout error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0D121F] rounded-t-3xl sm:rounded-3xl border border-amber-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-5 max-h-[90vh] flex flex-col text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h3 className={`font-black ${isLargeText ? 'text-xl' : 'text-lg'}`}>
              {t.cartBarTitle} ({cart.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 no-scrollbar">
          {orderCompleted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#3DDC97]/20 border-2 border-[#3DDC97] flex items-center justify-center mx-auto text-3xl">
                ✓
              </div>
              <h4 className="text-xl font-black text-white">
                {t.orderPlacedSuccess}
              </h4>
              {orderInfo?.orderNumber && (
                <div className="text-sm font-mono text-amber-300 font-bold">
                  Buyurtma raqami: #{orderInfo.orderNumber}
                </div>
              )}
              <p className="text-xs text-white/80 max-w-sm mx-auto leading-relaxed">
                {orderInfo?.message || t.orderPlacedMessage}
              </p>

              <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl text-xs text-amber-200 text-left">
                ℹ️ <strong>Menejer eslatmasi:</strong> Zakaz yetkazib berilib to'langach, biletlar balansingizga avtomatik qo'shiladi.
              </div>

              <button
                onClick={onClose}
                className="mt-4 min-h-[48px] w-full rounded-xl bg-gradient-to-r from-[#FFC933] to-[#FF9F1C] text-[#06154A] font-extrabold text-sm shadow-lg active:scale-95 transition-transform"
              >
                {t.closeBtn}
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-10 text-white/60 text-sm">
              <p>{t.cartEmpty}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `${import.meta.env.BASE_URL}icon.svg`;
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-amber-400/30 flex items-center justify-center text-xl shrink-0">
                        🛢️
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                        {item.product.name}
                      </h4>
                      <div className="text-[11px] text-[#FFC933] font-semibold tabular-nums">
                        ${item.product.price} × {item.quantity} = ${item.product.price * item.quantity}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, -1)}
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center font-bold text-base text-white"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-black text-sm tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, 1)}
                      className="w-9 h-9 rounded-xl bg-[#FFC933] hover:bg-amber-400 active:scale-95 flex items-center justify-center font-bold text-base text-[#06154A]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {!orderCompleted && cart.length > 0 && (
          <div className="border-t border-white/10 pt-3 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">{t.cartTotal}:</span>
              <span className="text-2xl font-black text-[#FFC933] tabular-nums">
                ${totalSum}
              </span>
            </div>

            {potentialNewTickets > 0 && (
              <div className="p-2.5 rounded-xl bg-[#3DDC97]/15 border border-[#3DDC97]/40 text-xs text-white flex items-center justify-between">
                <span>Kutilayotgan yangi biletlar:</span>
                <span className="font-black text-[#3DDC97] text-sm tabular-nums">
                  +{potentialNewTickets} ta
                </span>
              </div>
            )}

            <div className="text-[11px] text-white/50 leading-tight">
              {t.pendingNotice}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClearCart}
                className="min-h-[48px] px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-xs font-semibold"
              >
                Tozalash
              </button>
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-[#FFC933] to-[#FF9F1C] text-[#06154A] font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-transform"
              >
                {isSubmitting ? 'Yuborilmoqda...' : `${t.confirmOrder} ($${totalSum})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
