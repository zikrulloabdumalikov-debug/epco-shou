import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, ProductCategory, CartItem, Language, ClientStats } from '../types';
import { translations } from '../i18n';
import { findSmartUpsell } from '../utils/probability';
import { playDropSound, triggerHaptic } from '../utils/audio';

const CanisterFallbackSvg: React.FC<{ className?: string }> = ({ className = 'w-16 h-20' }) => (
  <svg viewBox="0 0 100 120" className={className}>
    <rect x="25" y="8" width="20" height="12" rx="3" fill="#D97706" stroke="#FEF08A" strokeWidth="2" />
    <path
      d="M 20 20 L 15 35 C 13 38 13 42 13 48 L 13 110 C 13 115 17 118 22 118 L 88 118 C 93 118 97 115 97 110 L 97 40 C 97 34 93 30 88 30 C 88 22 84 15 76 12 C 70 8 60 7 45 7 C 32 7 24 10 22 14 L 22 20 Z"
      fill="#1E293B"
      stroke="#F59E0B"
      strokeWidth="2.5"
    />
    <rect x="28" y="48" width="54" height="48" rx="6" fill="#0D183A" stroke="#FBBF24" strokeWidth="1.5" />
    <text x="55" y="74" fill="#FEF08A" fontSize="9" fontWeight="900" textAnchor="middle">EPCO</text>
    <text x="55" y="86" fill="#FFFFFF" fontSize="7" fontWeight="700" textAnchor="middle">OIL</text>
  </svg>
);

interface StoreViewProps {
  products: Product[];
  stats: ClientStats;
  cart: CartItem[];
  language: Language;
  isLargeText?: boolean;
  onAddToCart: (product: Product, quantity?: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onOpenCartModal: () => void;
}

interface GhostTransition {
  id: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  targetX: number;
  targetY: number;
  product: Product;
}

export const StoreView: React.FC<StoreViewProps> = ({
  products,
  stats,
  cart,
  language,
  isLargeText,
  onAddToCart,
  onOpenCartModal,
}) => {
  const t = translations[language];
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');

  // Drag-and-drop pointer tracking
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDropZone, setIsOverDropZone] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Ghost-image transition states
  const [activeGhosts, setActiveGhosts] = useState<GhostTransition[]>([]);
  const [basketBounced, setBasketBounced] = useState(false);

  // References to track positions of grid cards and bottom cart bar
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  // Cart summary
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Next ticket calculation
  const projectedTotal = stats.confirmedAmount + cartTotal;
  const currentTickets = stats.tickets;
  const projectedTickets = Math.floor(projectedTotal / 1000);
  const potentialNewTickets = projectedTickets - currentTickets;
  const currentGap = 1000 - (projectedTotal % 1000);

  // Smart Upsell suggestion
  const smartSuggestion = useMemo(() => {
    return findSmartUpsell(currentGap, products);
  }, [currentGap, products]);

  // Projected rank jump
  const projectedRank = useMemo(() => {
    if (cartTotal >= stats.gapToFirstPlace) return 1;
    if (cartTotal >= stats.gapToTop10 && stats.currentRank > 10) return 9;
    if (cartTotal >= stats.gapToNextRank) return Math.max(1, stats.currentRank - 1);
    return stats.currentRank;
  }, [cartTotal, stats]);

  // Helper to trigger basket bounce and haptic 'tak' feedback
  const triggerBasketImpact = () => {
    setBasketBounced(true);
    playDropSound(); // Triggers synthesized mechanical 'tak' sound & navigator.vibrate([30, 20])
    setTimeout(() => setBasketBounced(false), 450);
  };

  // Launch transition of ghost-image from grid card to bottom-fixed cart bar
  const launchGhostTransition = (product: Product, overrideStart?: { x: number; y: number; w: number; h: number }) => {
    let startX = window.innerWidth / 2 - 40;
    let startY = window.innerHeight / 2 - 40;
    let startWidth = 80;
    let startHeight = 80;

    if (overrideStart) {
      startX = overrideStart.x;
      startY = overrideStart.y;
      startWidth = overrideStart.w;
      startHeight = overrideStart.h;
    } else {
      const cardEl = cardRefs.current[product.id];
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        startX = rect.left;
        startY = rect.top;
        startWidth = rect.width;
        startHeight = rect.height;
      }
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight - 80;
    if (dropZoneRef.current) {
      const dropRect = dropZoneRef.current.getBoundingClientRect();
      targetX = dropRect.left + dropRect.width / 2;
      targetY = dropRect.top + dropRect.height / 2;
    }

    const ghostId = 'ghost_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newGhost: GhostTransition = {
      id: ghostId,
      startX,
      startY,
      startWidth,
      startHeight,
      targetX,
      targetY,
      product,
    };

    setActiveGhosts((prev) => [...prev, newGhost]);

    // Right when ghost lands into cart bar (around 480ms), trigger impact & haptic
    setTimeout(() => {
      triggerBasketImpact();
      onAddToCart(product, 1);
    }, 450);

    // Clean up ghost after animation completes
    setTimeout(() => {
      setActiveGhosts((prev) => prev.filter((g) => g.id !== ghostId));
    }, 600);
  };

  // Click on '+' button or card action
  const handleCardClickAdd = (product: Product, quantity: number = 1) => {
    triggerHaptic(20);
    launchGhostTransition(product);
    if (quantity > 1) {
      onAddToCart(product, quantity - 1);
    }
  };

  // Pointer Drag-and-Drop Handlers
  const handlePointerDown = (e: React.PointerEvent, product: Product) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggedProduct(product);
    setIsDragging(true);
    setIsOverDropZone(false);
    setDragPosition({ x: e.clientX, y: e.clientY });
    triggerHaptic(20);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragPosition({ x: e.clientX, y: e.clientY });

    if (dropZoneRef.current) {
      const rect = dropZoneRef.current.getBoundingClientRect();
      const inX = e.clientX >= rect.left - 25 && e.clientX <= rect.right + 25;
      const inY = e.clientY >= rect.top - 25 && e.clientY <= rect.bottom + 25;
      if (inX && inY !== isOverDropZone) {
        setIsOverDropZone(inX && inY);
        if (inX && inY) triggerHaptic(15);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !draggedProduct) {
      setIsDragging(false);
      setIsOverDropZone(false);
      setDraggedProduct(null);
      return;
    }

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore capture release error
    }

    // Check if released over bottom cart bar
    if (dropZoneRef.current) {
      const rect = dropZoneRef.current.getBoundingClientRect();
      const inX = e.clientX >= rect.left - 25 && e.clientX <= rect.right + 25;
      const inY = e.clientY >= rect.top - 25 && e.clientY <= rect.bottom + 25;

      if (inX && inY) {
        triggerHaptic(20);
        // Launch smooth drop transition right from current pointer release coordinates
        launchGhostTransition(draggedProduct, {
          x: e.clientX - 45,
          y: e.clientY - 45,
          w: 90,
          h: 90,
        });
      }
    }

    setIsDragging(false);
    setIsOverDropZone(false);
    setDraggedProduct(null);
  };

  return (
    <div className="space-y-4 pb-36 relative">
      {/* Title & Instructions */}
      <div>
        <h2 className={`font-black text-white ${isLargeText ? 'text-2xl' : 'text-xl'}`}>
          {t.storeTitle}
        </h2>
        <p className="text-xs text-white/70 mt-0.5">
          {t.storeSubtitle}
        </p>
      </div>

      {/* Categories Horizontal Shelf Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-[#0E1424]/80 text-slate-300 hover:text-white border border-white/5'
          }`}
        >
          {t.catAll}
        </button>
        <button
          onClick={() => setSelectedCategory('oils')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'oils'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-[#0E1424]/80 text-slate-300 hover:text-white border border-white/5'
          }`}
        >
          🛢️ {t.catOils}
        </button>
        <button
          onClick={() => setSelectedCategory('filters')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'filters'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-[#0E1424]/80 text-slate-300 hover:text-white border border-white/5'
          }`}
        >
          ⚙️ {t.catFilters}
        </button>
        <button
          onClick={() => setSelectedCategory('antifreeze')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'antifreeze'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-[#0E1424]/80 text-slate-300 hover:text-white border border-white/5'
          }`}
        >
          ❄️ {t.catAntifreeze}
        </button>
        <button
          onClick={() => setSelectedCategory('transmission')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'transmission'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-[#0E1424]/80 text-slate-300 hover:text-white border border-white/5'
          }`}
        >
          🔄 {t.catTransmission}
        </button>
        <button
          onClick={() => setSelectedCategory('special')}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'special'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-[#0E1424]/80 text-slate-300 hover:text-white border border-white/5'
          }`}
        >
          🧪 {t.catSpecial}
        </button>
      </div>

      {/* Product Grid: Each Product Card Wrapped in motion.div with hover and tap scale effects */}
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              ref={(el) => {
                cardRefs.current[product.id] = el;
              }}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              className="glass-card p-3 rounded-2xl border border-white/15 flex flex-col justify-between relative group hover:border-[#FFC933]/50 transition-colors shadow-lg cursor-pointer"
            >
              {/* Product Badge */}
              {product.badge && (
                <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-amber-500 to-[#FF9F1C] text-[#06154A] font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow">
                  {product.badge}
                </div>
              )}

              {/* Draggable Product Image Area */}
              <div
                onPointerDown={(e) => handlePointerDown(e, product)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-36 bg-black/40 rounded-xl overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center border border-white/10 select-none touch-none"
                title="Rasmni ushlab savatga tashlang"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `${import.meta.env.BASE_URL}icon.svg`;
                    }}
                  />
                ) : (
                  <CanisterFallbackSvg className="w-16 h-20 filter drop-shadow-[0_4px_10px_rgba(245,158,11,0.4)] pointer-events-none" />
                )}

                {/* Drag hint overlay tag */}
                <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-xs text-[10px] text-white/90 px-2 py-0.5 rounded-lg border border-white/20 pointer-events-none flex items-center gap-1">
                  <span>✋</span>
                  <span>Sudrab tashlang</span>
                </div>
              </div>

              {/* Product Details */}
              <div className="mt-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-white/60 mb-0.5">
                    <span>{product.brand}</span>
                    <span className="font-semibold text-amber-200">{product.volume}</span>
                  </div>
                  <h3 className={`font-bold text-white leading-tight ${isLargeText ? 'text-base' : 'text-sm'}`}>
                    {product.name}
                  </h3>
                  <p className="text-[11px] text-white/60 line-clamp-2 mt-1">
                    {product.description}
                  </p>
                </div>

                {/* Price and Add '+' Button */}
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-white/50 block">Narxi (dona):</span>
                    <span className="text-xl font-black text-[#FFC933] tabular-nums">
                      ${product.price}
                    </span>
                  </div>

                  {/* Big Tap Button with spring click */}
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClickAdd(product, 1);
                    }}
                    className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] font-black text-sm flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(245,158,11,0.3)] active:shadow-inner cursor-pointer"
                    aria-label={`${product.name} savatga qo'shish`}
                  >
                    <span className="text-lg leading-none">+</span>
                    <span>{t.addToCart}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Pointer Active Dragging Ghost */}
      <AnimatePresence>
        {isDragging && draggedProduct && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: -4 }}
            animate={{
              scale: isOverDropZone ? 0.95 : 1.15,
              opacity: 1,
              rotate: isOverDropZone ? 0 : 6,
              boxShadow: isOverDropZone
                ? '0 0 35px rgba(61, 220, 151, 0.85)'
                : '0 12px 35px rgba(255, 201, 51, 0.75)',
            }}
            exit={{ scale: 0.2, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            style={{
              position: 'fixed',
              left: dragPosition.x - 48,
              top: dragPosition.y - 48,
              pointerEvents: 'none',
              zIndex: 99999,
            }}
            className={`w-24 h-24 rounded-2xl glass-card-gold p-1.5 backdrop-blur-lg border-2 ${
              isOverDropZone ? 'border-[#3DDC97] bg-emerald-950/80' : 'border-[#FFC933] bg-[#06154A]/90'
            } flex flex-col items-center justify-center`}
          >
            <img
              src={draggedProduct.image}
              alt="Dragging"
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/85 text-[10px] font-black text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/50 shadow-md">
              ${draggedProduct.price} · Savatga!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ghost-Image Transition Animation from Grid to Bottom Cart Bar */}
      <AnimatePresence>
        {activeGhosts.map((ghost) => (
          <motion.div
            key={ghost.id}
            initial={{
              left: ghost.startX,
              top: ghost.startY,
              width: ghost.startWidth,
              height: Math.min(ghost.startHeight, 180),
              opacity: 0.95,
              scale: 1,
              rotate: 0,
              borderRadius: '20px',
            }}
            animate={{
              left: ghost.targetX - 25,
              top: ghost.targetY - 25,
              width: 50,
              height: 50,
              opacity: [0.95, 0.9, 0.5, 0],
              scale: [1, 0.85, 0.5, 0.15],
              rotate: [0, -6, 12, 24],
              borderRadius: '24px',
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.52,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: 'fixed',
              pointerEvents: 'none',
              zIndex: 99990,
            }}
            className="overflow-hidden glass-card-gold border-2 border-[#FFC933] shadow-[0_10px_35px_rgba(255,201,51,0.7)] flex items-center justify-center"
          >
            <img
              src={ghost.product.image}
              alt={ghost.product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-1">
              <span className="text-[10px] font-black text-amber-300 truncate">
                ${ghost.product.price}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Persistent Bottom Cart Bar & Drop Target with Elastic Bounce */}
      <div className="fixed bottom-16 left-0 right-0 z-30 p-2 sm:p-3 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto space-y-1.5">
          {/* Smart Upsell Box above Cart */}
          {smartSuggestion && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card-gold p-2 px-3 rounded-xl border border-[#FFC933]/70 text-white shadow-xl flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">💡</span>
                <span className="truncate">
                  {t.smartUpsellPrefix}{' '}
                  <strong className="text-[#FFC933]">
                    {smartSuggestion.quantity} ta {smartSuggestion.product.name}
                  </strong>{' '}
                  {t.smartUpsellSuffix}
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.04 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClickAdd(smartSuggestion.product, smartSuggestion.quantity);
                }}
                className="shrink-0 ml-2 px-2.5 py-1 rounded-lg bg-[#FFC933] text-[#06154A] font-extrabold text-[11px] shadow hover:bg-amber-400 cursor-pointer"
              >
                + Qo'shish (${smartSuggestion.totalCost})
              </motion.button>
            </motion.div>
          )}

          {/* Persistent Cart & Drop Zone Container with Elastic Bounce */}
          <motion.div
            ref={dropZoneRef}
            onClick={onOpenCartModal}
            animate={{
              scale: basketBounced ? [1, 1.08, 0.96, 1] : isOverDropZone ? 1.05 : 1,
              borderColor: isOverDropZone
                ? 'rgba(61, 220, 151, 1)'
                : isDragging
                ? 'rgba(255, 201, 51, 0.9)'
                : 'rgba(255, 201, 51, 0.6)',
            }}
            transition={{
              scale: { duration: 0.38, ease: 'easeOut' },
              borderColor: { duration: 0.15 },
            }}
            className={`rounded-2xl p-3 sm:p-4 text-white shadow-2xl border transition-all duration-300 cursor-pointer ${
              isDragging
                ? isOverDropZone
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 shadow-[0_0_30px_rgba(61,220,151,0.6)]'
                  : 'bg-gradient-to-r from-amber-700/80 via-yellow-600/80 to-amber-800/80 shadow-[0_0_20px_rgba(255,201,51,0.4)]'
                : 'glass-card-gold'
            }`}
          >
            {isDragging ? (
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="flex items-center justify-center gap-2 text-center py-1"
              >
                <span className="text-2xl animate-bounce">📥</span>
                <span className="font-black text-sm sm:text-base text-white uppercase tracking-wide">
                  {isOverDropZone ? 'Qo\'yib yuboring (Savatga qo\'shish!)' : t.dropZoneLabel}
                </span>
              </motion.div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/20 flex items-center justify-center text-lg relative">
                    🛒
                    {cartItemsCount > 0 && (
                      <motion.span
                        key={cartItemsCount}
                        initial={{ scale: 1.6 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#FF4D63] text-white font-extrabold text-[10px] flex items-center justify-center border border-white"
                      >
                        {cartItemsCount}
                      </motion.span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-extrabold text-sm sm:text-base text-white">
                        {t.cartTotal}: ${cartTotal}
                      </span>
                      {potentialNewTickets > 0 && (
                        <span className="text-xs font-black text-[#3DDC97] bg-[#3DDC97]/20 px-1.5 py-0.2 rounded border border-[#3DDC97]/40">
                          +{potentialNewTickets} bilet!
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/70">
                      {projectedRank < stats.currentRank ? (
                        <span className="text-emerald-300 font-bold">
                          🎉 Bu zakaz sizni {projectedRank}-o'ringa olib chiqadi!
                        </span>
                      ) : (
                        <span>Keyingi biletga: ${currentGap} qoldi</span>
                      )}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCartModal();
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFC933] to-[#FF9F1C] text-[#06154A] font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-transform"
                >
                  {t.checkoutBtn} →
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
