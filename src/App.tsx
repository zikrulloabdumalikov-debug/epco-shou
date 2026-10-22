/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Language,
  PrizeScope,
  User,
  PromoConfig,
  ClientStats,
  LeaderboardEntry,
  Ticket,
  PastWinner,
  Product,
  CartItem
} from './types';
import { translations, getStoredLanguage, setStoredLanguage } from './i18n';
import { dataService } from './services/dataService';
import { apiService } from './services/apiService';
import { isDemoMode } from './services/demoData';
import { isSoundEnabled, setSoundEnabled, triggerHaptic } from './utils/audio';

// Components
import { OilFlaskWidget } from './components/OilFlaskWidget';
import { GrandPrizeBanner } from './components/GrandPrizeBanner';
import { ProbabilityCard } from './components/ProbabilityCard';
import { SimulatorCard } from './components/SimulatorCard';
import { LeaderboardView } from './components/LeaderboardView';
import { StoreView } from './components/StoreView';
import { MascotUstaMoy } from './components/MascotUstaMoy';
import { TicketsModal } from './components/TicketsModal';
import { RulesAndTrustModal } from './components/RulesAndTrustModal';
import { WinnersWallModal } from './components/WinnersWallModal';
import { CartModal } from './components/CartModal';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { TicketVerifyPage } from './components/TicketVerifyPage';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // Direct Public Ticket Verification Route (/verify/:ticketNumber)
  const [verifyTicketNumber, setVerifyTicketNumber] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const verifyPrefix = `${import.meta.env.BASE_URL}verify/`;
      const path = window.location.pathname;
      if (path.startsWith(verifyPrefix)) {
        return decodeURIComponent(path.slice(verifyPrefix.length));
      }
      const hash = window.location.hash;
      if (hash.startsWith('#/verify/')) {
        return decodeURIComponent(hash.replace('#/verify/', ''));
      }
    }
    return null;
  });

  // App settings state
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [activeTab, setActiveTab] = useState<'home' | 'store' | 'leaderboard'>('home');
  const [isLargeText, setIsLargeText] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());

  // Data state
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<PromoConfig | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeScope, setActiveScope] = useState<PrizeScope>('republic');

  // Network & Auth state
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [needPhoneLink, setNeedPhoneLink] = useState<{ message: string; botUrl: string } | null>(null);

  // Modals state
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isWinnersOpen, setIsWinnersOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const t = translations[language];
  const demoActive = isDemoMode();

  // Listen for unauthorized event from apiService
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStats(null);
      setIsLoginOpen(true);
    };
    window.addEventListener('epco-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('epco-unauthorized', handleUnauthorized);
    };
  }, []);

  // Load app data once authenticated
  const loadData = useCallback(async () => {
    setNetworkError(null);
    try {
      const [meData, boardData, ticketsData, winnersData, catalogData] = await Promise.all([
        dataService.getMe(),
        dataService.getLeaderboard(activeScope),
        dataService.getTickets(),
        dataService.getPastWinners(),
        dataService.getCatalog(),
      ]);

      setUser(meData.user);
      setConfig(meData.config);
      setStats(meData.stats);
      setLeaderboardEntries(boardData.entries);
      setTickets(ticketsData);
      setPastWinners(winnersData);
      setCatalog(catalogData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setNetworkError(err.message || 'Serverga ulanishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  }, [activeScope]);

  // Initial authentication flow
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);

      // Demo mode bypasses network auth
      if (demoActive) {
        await loadData();
        return;
      }

      // Check Telegram Mini App auto-auth
      if (apiService.isTelegramMiniApp()) {
        try {
          const res = await apiService.authTelegram();
          if (res.success && res.data?.token) {
            await loadData();
            return;
          } else if (res.data?.status === 'NEED_PHONE_LINK') {
            const botUsername = (import.meta as any).env?.VITE_BOT_USERNAME || 'epco_aksiyabot';
            setNeedPhoneLink({
              message: res.data.message || 'Telegram botimizda avval kontaktingizni ulashing.',
              botUrl: `https://t.me/${botUsername.replace('@', '')}`,
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Telegram auth error', e);
        }
      }

      // Browser / PWA: check existing stored token
      const existingToken = apiService.getToken();
      if (existingToken) {
        try {
          const meRes = await apiService.getMe();
          if (meRes.success && meRes.data) {
            setUser(meRes.data.user);
            setConfig(meRes.data.config);
            setStats(meRes.data.stats);
            await loadData();
            return;
          } else {
            apiService.setToken(null);
            setIsLoginOpen(true);
            setLoading(false);
            return;
          }
        } catch {
          // If offline, check cache
          const cachedUser = apiService.getCachedUser();
          if (cachedUser) {
            await loadData();
            return;
          }
          apiService.setToken(null);
          setIsLoginOpen(true);
          setLoading(false);
          return;
        }
      }

      // No token -> show login
      setLoading(false);
      setIsLoginOpen(true);
    };

    initAuth();
  }, [demoActive, loadData]);

  // Scope change handler for leaderboard (Reloads only leaderboard, NOT full loadData)
  const handleScopeChange = async (scope: PrizeScope) => {
    setActiveScope(scope);
    triggerHaptic(20);
    try {
      const boardData = await dataService.getLeaderboard(scope, scope === 'region' ? user?.region : undefined);
      setLeaderboardEntries(boardData.entries);
    } catch (err) {
      console.error('Failed to change scope:', err);
    }
  };

  // Login handler
  const handleLogin = async (phone: string, consent: boolean, token?: string) => {
    if (token) {
      apiService.setToken(token);
    }
    setIsLoginOpen(false);
    setNeedPhoneLink(null);
    setLoading(true);
    try {
      await loadData();
    } catch (e) {
      console.warn('loadData failed on login, using loginDirect fallback:', e);
      try {
        const fallbackData = await apiService.loginDirect(phone, token);
        setUser(fallbackData.user);
        setStats(fallbackData.stats);
        setConfig(fallbackData.config);
      } catch (fErr) {
        console.error('Login fallback error:', fErr);
      } finally {
        setLoading(false);
      }
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await dataService.logout();
    setUser(null);
    setStats(null);
    setIsLoginOpen(true);
  };

  // Privacy consent toggle handler
  const handleUpdateConsent = async (consent: boolean) => {
    const ok = await dataService.updateConsent(consent);
    if (ok && user) {
      setUser({ ...user, isAnonymous: !consent });
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const next = item.quantity + delta;
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Upsell from simulator -> switch to Store tab and add item
  const handleAddToCartAndOpenStore = (product: Product, quantity: number) => {
    handleAddToCart(product, quantity);
    setActiveTab('store');
    setIsCartOpen(true);
  };

  // Checkout order submission
  const handleSubmitOrder = async () => {
    if (!cart.length) return;
    const items = cart.map((i) => ({ productId: i.product.id, quantity: i.quantity }));
    const res = await apiService.createOrder(items);
    if (res.success) {
      setCart([]);
      return {
        orderNumber: res.data?.orderNumber,
        message: res.data?.message || 'Buyurtma agentga muvaffaqiyatli yetkazildi!',
      };
    } else {
      throw new Error(res.error?.message || 'Buyurtmani yuborishda xatolik yuz berdi');
    }
  };

  // Sound toggle
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    triggerHaptic(20);
  };

  // Text size toggle
  const toggleTextSize = () => {
    setIsLargeText((prev) => !prev);
    triggerHaptic(20);
  };

  // Language toggle
  const toggleLanguage = () => {
    const next = language === 'uz' ? 'ru' : 'uz';
    setLanguage(next);
    setStoredLanguage(next);
    triggerHaptic(20);
  };

  // Public Ticket Verification View
  if (verifyTicketNumber) {
    return (
      <TicketVerifyPage
        initialTicketNumber={verifyTicketNumber}
        onBackToApp={() => {
          setVerifyTicketNumber(null);
          if (typeof window !== 'undefined' && window.history) {
            window.history.pushState({}, '', '/');
          }
        }}
      />
    );
  }

  // Need Phone Link in Telegram Screen
  if (needPhoneLink) {
    return (
      <div className="min-h-screen bg-[#06154A] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-[#0D183A] border border-amber-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/20">
            📲
          </div>
          <h2 className="text-xl font-black text-amber-300">
            Kontaktni Ulashish Zarur
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {needPhoneLink.message}
          </p>
          <div className="pt-2 space-y-2">
            <a
              href={needPhoneLink.botUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              <span>✈️ Telegram Botni Ochish</span>
            </a>
            <button
              onClick={() => {
                setNeedPhoneLink(null);
                setIsLoginOpen(true);
              }}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white"
            >
              Boshqa usulda kirish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Friendly Network Error Screen
  if (networkError && !stats) {
    return (
      <div className="min-h-screen bg-[#06154A] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-[#0D183A] border border-rose-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-3xl mx-auto">
            📡
          </div>
          <h2 className="text-xl font-black text-rose-300">
            Tarmoqqa Ulanishda Xatolik
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {networkError}
          </p>
          <button
            onClick={loadData}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
          >
            Qayta urinish 🔄
          </button>
        </div>
      </div>
    );
  }

  // Loading Screen (During initial auth check or manual refresh)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#06154A] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mb-4 shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
        <h2 className="text-base font-bold text-amber-300 tracking-wider">
          EPCO Shou yuklanmoqda...
        </h2>
      </div>
    );
  }

  // Not authenticated -> Show Login Screen immediately
  if (!user) {
    return (
      <div className="min-h-screen bg-ambient-mesh bg-[#06154A] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-black">
        <OfflineIndicator />
        <LoginModal
          isOpen={true}
          language={language}
          isLargeText={isLargeText}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  // Logged in, but waiting for stats or config
  if (!stats || !config) {
    return (
      <div className="min-h-screen bg-[#06154A] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mb-4 shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
        <h2 className="text-base font-bold text-amber-300 tracking-wider">
          Ma'lumotlar yuklanmoqda...
        </h2>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-ambient-mesh text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black ${
        isLargeText ? 'text-lg' : 'text-base'
      }`}
    >
      <OfflineIndicator />

      {/* Persistent DEMO REJIM Banner if VITE_DEMO is true */}
      {demoActive && (
        <div className="bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-widest text-center py-1 px-2 sticky top-0 z-50 shadow-md">
          ⚠️ {t.demoBanner}
        </div>
      )}

      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#080C14]/94 backdrop-blur-2xl border-b border-amber-500/20 px-3.5 sm:px-6 py-2.5 pt-safe flex items-center justify-between gap-2 shadow-2xl">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-[#06154A] font-black text-sm shadow-[0_0_15px_rgba(245,158,11,0.45)]">
            E
          </div>
          <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
            EPCO
          </span>
          <span className="text-[10px] font-bold text-amber-400 uppercase px-1.5 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/30 tracking-widest hidden xs:inline">
            SHOU
          </span>
        </div>

        {/* Mascot & Quick Modals Links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <MascotUstaMoy
            language={language}
            activeTab={activeTab}
            isLargeText={isLargeText}
          />

          <button
            onClick={() => setIsRulesOpen(true)}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition whitespace-nowrap cursor-pointer"
          >
            {t.rulesBtn}
          </button>
          <button
            onClick={() => setIsWinnersOpen(true)}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition whitespace-nowrap hidden sm:inline cursor-pointer"
          >
            {t.winnersBtn}
          </button>
        </div>

        {/* Actions: Sound, A+, Lang, PWA */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={toggleSound}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-colors cursor-pointer ${
              soundOn ? 'bg-amber-400 text-[#06154A]' : 'bg-white/10 text-white/60 hover:text-white'
            }`}
            title={soundOn ? t.soundOn : t.soundOff}
            aria-label="Sound Toggle"
          >
            {soundOn ? '🔊' : '🔇'}
          </button>

          <button
            onClick={toggleTextSize}
            className={`h-9 px-2 rounded-xl text-xs font-black transition-colors cursor-pointer ${
              isLargeText ? 'bg-amber-400 text-[#06154A]' : 'bg-white/10 text-white/80 hover:text-white'
            }`}
            title={isLargeText ? t.textSizeNormal : t.textSizeToggle}
            aria-label="Text Size Toggle"
          >
            A+
          </button>

          <button
            onClick={toggleLanguage}
            className="h-9 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
            title="Tilni o'zgartirish"
          >
            {language.toUpperCase()}
          </button>

          <PWAInstallButton language={language} />
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-lg mx-auto p-3.5 sm:p-5 pb-28 space-y-4">
        {/* Tab 1: Bosh sahifa (Home) */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* User Greeting & Profile button */}
            <div className="flex items-center justify-between text-xs text-slate-300 bg-[#0E1424]/85 p-2.5 px-3 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)] shrink-0 animate-pulse" />
                <div className="truncate">
                  <span className="font-bold text-white block truncate">
                    {user.isAnonymous ? t.anonymousUser : user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block truncate">
                    {user.phone} · {user.region}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="text-[11px] text-amber-400 font-bold hover:underline shrink-0 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 cursor-pointer flex items-center gap-1"
              >
                <span>⚙️</span>
                <span>{t.profileBtn}</span>
              </button>
            </div>

            {/* Grand Prize Chevrolet DAMAS Banner */}
            <GrandPrizeBanner
              stats={stats}
              language={language}
              isLargeText={isLargeText}
              onNavigateToLeaderboard={() => {
                setActiveTab('leaderboard');
                triggerHaptic(20);
              }}
            />

            {/* Central Moy Kanistrasi Widget */}
            <OilFlaskWidget
              stats={stats}
              language={language}
              isLargeText={isLargeText}
              onOpenTicketsModal={() => setIsTicketsOpen(true)}
            />

            {/* Real-time Probability Card */}
            <ProbabilityCard
              stats={stats}
              config={config}
              language={language}
              isLargeText={isLargeText}
            />

            {/* Aksiya Kalkulyatori & Simulyator */}
            <SimulatorCard
              stats={stats}
              config={config}
              catalog={catalog}
              language={language}
              isLargeText={isLargeText}
              onAddToCartAndOpenStore={handleAddToCartAndOpenStore}
            />
          </div>
        )}

        {/* Tab 2: Do'kon (Store) */}
        {activeTab === 'store' && (
          <div className="animate-in fade-in duration-200">
            <StoreView
              products={catalog}
              stats={stats}
              cart={cart}
              language={language}
              isLargeText={isLargeText}
              onAddToCart={handleAddToCart}
              onRemoveFromCart={handleRemoveFromCart}
              onOpenCartModal={() => setIsCartOpen(true)}
            />
          </div>
        )}

        {/* Tab 3: Reyting (Leaderboard) */}
        {activeTab === 'leaderboard' && (
          <div className="animate-in fade-in duration-200">
            <LeaderboardView
              entries={leaderboardEntries}
              stats={stats}
              user={user}
              language={language}
              isLargeText={isLargeText}
              activeScope={activeScope}
              onChangeScope={handleScopeChange}
            />
          </div>
        )}
      </main>

      {/* Fixed Bottom Tab Bar: 3 Tabs (🏠 Bosh sahifa | 🛒 Do'kon | 🏆 Reyting) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080C14]/94 backdrop-blur-2xl border-t border-amber-500/25 pb-safe shadow-[0_-10px_35px_rgba(0,0,0,0.85)]">
        <div className="max-w-md mx-auto grid grid-cols-3 items-center h-16 px-3 gap-1">
          {/* Tab 1: Bosh sahifa */}
          <button
            onClick={() => {
              setActiveTab('home');
              triggerHaptic(20);
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'home'
                ? 'text-amber-400 font-black scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-0.5 tracking-tight font-bold">{t.tabHome}</span>
            {activeTab === 'home' && (
              <span className="absolute bottom-1 w-6 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            )}
          </button>

          {/* Tab 2: Do'kon */}
          <button
            onClick={() => {
              setActiveTab('store');
              triggerHaptic(20);
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'store'
                ? 'text-amber-400 font-black scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <span className="text-xl">🛒</span>
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-white">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            <span className="text-xs mt-0.5 tracking-tight font-bold">{t.tabStore}</span>
            {activeTab === 'store' && (
              <span className="absolute bottom-1 w-6 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            )}
          </button>

          {/* Tab 3: Reyting */}
          <button
            onClick={() => {
              setActiveTab('leaderboard');
              triggerHaptic(20);
              window.dispatchEvent(
                new CustomEvent('usta-moy-speak', { detail: { topic: 'leaderboard' } })
              );
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'text-amber-400 font-black scale-105'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-xl">🏆</span>
            <span className="text-xs mt-0.5 tracking-tight font-bold">{t.tabLeaderboard}</span>
            {activeTab === 'leaderboard' && (
              <span className="absolute bottom-1 w-6 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            )}
          </button>
        </div>
      </nav>

      {/* Modals */}
      <TicketsModal
        isOpen={isTicketsOpen}
        tickets={tickets}
        stats={stats}
        language={language}
        isLargeText={isLargeText}
        onClose={() => setIsTicketsOpen(false)}
      />

      <RulesAndTrustModal
        isOpen={isRulesOpen}
        config={config}
        language={language}
        isLargeText={isLargeText}
        onClose={() => setIsRulesOpen(false)}
      />

      <WinnersWallModal
        isOpen={isWinnersOpen}
        winners={pastWinners}
        language={language}
        isLargeText={isLargeText}
        onClose={() => setIsWinnersOpen(false)}
      />

      <CartModal
        isOpen={isCartOpen}
        cart={cart}
        stats={stats}
        language={language}
        isLargeText={isLargeText}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onSubmitOrder={handleSubmitOrder}
      />

      <LoginModal
        isOpen={isLoginOpen}
        language={language}
        isLargeText={isLargeText}
        onLogin={handleLogin}
        onClose={() => {
          if (user) setIsLoginOpen(false);
        }}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        language={language}
        isLargeText={isLargeText}
        onClose={() => setIsProfileOpen(false)}
        onUpdateConsent={handleUpdateConsent}
        onLogout={handleLogout}
      />
    </div>
  );
}
