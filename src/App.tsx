/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Language, PrizeScope, BootstrapData } from './types';
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
import { MascotUstaMoy } from './components/MascotUstaMoy';
import { TicketsModal } from './components/TicketsModal';
import { RulesAndTrustModal } from './components/RulesAndTrustModal';
import { WinnersWallModal } from './components/WinnersWallModal';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { TicketVerifyPage } from './components/TicketVerifyPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoadingScreen } from './components/LoadingScreen';
import { OnboardingView } from './components/OnboardingView';

// Ochiq turgan ilova ma'lumotlarini shu oraliqda fonda yangilaydi
const AUTO_REFRESH_MS = 5 * 60 * 1000;

type Phase = 'loading' | 'login' | 'ready' | 'error';

function getVerifyTicketFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const verifyPrefix = `${import.meta.env.BASE_URL}verify/`;
  const path = window.location.pathname;
  if (path.startsWith(verifyPrefix)) {
    return decodeURIComponent(path.slice(verifyPrefix.length));
  }
  const hash = window.location.hash;
  if (hash.startsWith('#/verify/')) {
    return decodeURIComponent(hash.replace('#/verify/', ''));
  }
  return null;
}

export default function App() {
  const [verifyTicketNumber, setVerifyTicketNumber] = useState<string | null>(getVerifyTicketFromUrl);

  // App settings state
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [activeTab, setActiveTab] = useState<'home' | 'leaderboard'>('home');
  const [isLargeText, setIsLargeText] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());
  const [activeScope, setActiveScope] = useState<PrizeScope>('republic');

  // Data: oxirgi saqlangan nusxa darhol ko'rsatiladi, yangisi fonda keladi
  const [boot, setBoot] = useState<BootstrapData | null>(() => dataService.getCachedBootstrap());
  const [phase, setPhase] = useState<Phase>(() => (dataService.getCachedBootstrap() ? 'ready' : 'loading'));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [needPhoneLink, setNeedPhoneLink] = useState<{ message: string; botUrl: string } | null>(null);
  const lastRefreshRef = useRef(0);

  // Modals state
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isWinnersOpen, setIsWinnersOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const t = translations[language];
  const demoActive = isDemoMode();

  /**
   * Bitta so'rov bilan barcha ma'lumotni oladi. silent=true bo'lsa (fon yangilanishi)
   * xatolik ekranini ko'rsatmaydi — eski ma'lumot qoladi.
   */
  const refresh = useCallback(async (silent: boolean) => {
    lastRefreshRef.current = Date.now();
    const res = await dataService.loadBootstrap();
    if (res.success && res.data) {
      setBoot(res.data);
      setSyncFailed(false);
      setPhase('ready');
      return;
    }
    if (res.error?.code === 'UNAUTHORIZED') return; // epco-unauthorized hodisasi login'ga o'tkazadi
    if (silent) {
      setSyncFailed(true);
    } else {
      setErrorMessage(res.error?.message || 'Serverga ulanishda xatolik yuz berdi.');
      setPhase('error');
    }
  }, []);

  // Sessiya tugaganda (faqat server aniq UNAUTHORIZED desa)
  useEffect(() => {
    const handleUnauthorized = () => {
      setBoot(null);
      setPhase('login');
    };
    window.addEventListener('epco-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('epco-unauthorized', handleUnauthorized);
  }, []);

  // Birinchi ochilish
  useEffect(() => {
    const init = async () => {
      if (demoActive) {
        await refresh(false);
        return;
      }

      if (apiService.getToken()) {
        // Kesh bo'lsa ekran allaqachon ko'rinib turibdi — faqat fonda yangilaymiz
        await refresh(Boolean(dataService.getCachedBootstrap()));
        return;
      }

      if (apiService.isTelegramMiniApp()) {
        const res = await apiService.authTelegram();
        if (res.success && res.data?.token) {
          await refresh(false);
          return;
        }
        if (res.data?.status === 'NEED_PHONE_LINK') {
          setNeedPhoneLink({
            message: res.data.message || 'Telegram botimizda avval kontaktingizni ulashing.',
            botUrl: res.data.botUrl || '',
          });
        }
      }
      setPhase('login');
    };
    init();
  }, [demoActive, refresh]);

  // Ilova qayta ochilganda yoki uzoq ochiq turganda ma'lumotni yangilash
  useEffect(() => {
    if (demoActive) return;
    const maybeRefresh = () => {
      if (document.visibilityState === 'visible' && apiService.getToken() && Date.now() - lastRefreshRef.current > 60000) {
        refresh(true);
      }
    };
    const interval = setInterval(maybeRefresh, AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', maybeRefresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', maybeRefresh);
    };
  }, [demoActive, refresh]);

  // Login handler (token LoginModal'da Telegram kodi tasdiqlangandan keyin olinadi)
  const handleLogin = async (_phone: string, consent: boolean, token?: string) => {
    if (token) apiService.setToken(token);
    setNeedPhoneLink(null);
    setPhase('loading');
    // Reytingda ism faqat mijoz roziligi bilan ko'rsatiladi (server standarti — yashirin)
    await Promise.all([dataService.updateConsent(consent), refresh(false)]);
  };

  const handleLogout = async () => {
    await dataService.logout();
    setBoot(null);
    setActiveTab('home');
    setPhase('login');
  };

  const handleUpdateConsent = async (consent: boolean) => {
    const ok = await dataService.updateConsent(consent);
    if (ok && boot && boot.registered) {
      setBoot({ ...boot, user: { ...boot.user, isAnonymous: !consent } });
      refresh(true);
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    triggerHaptic(20);
  };

  const toggleTextSize = () => {
    setIsLargeText((prev) => !prev);
    triggerHaptic(20);
  };

  const toggleLanguage = () => {
    const next = language === 'uz' ? 'ru' : 'uz';
    setLanguage(next);
    setStoredLanguage(next);
    triggerHaptic(20);
  };

  // Ochiq bilet tekshiruvi sahifasi (/verify/:raqam)
  if (verifyTicketNumber) {
    return (
      <TicketVerifyPage
        initialTicketNumber={verifyTicketNumber}
        onBackToApp={() => {
          setVerifyTicketNumber(null);
          window.history.pushState({}, '', import.meta.env.BASE_URL);
        }}
      />
    );
  }

  // Telegram Mini App: raqam hali botga ulanmagan
  if (needPhoneLink && phase === 'login') {
    return (
      <div className="min-h-screen bg-[#06154A] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-[#0D183A] border border-amber-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="text-5xl">📲</div>
          <h2 className="text-xl font-black text-amber-300">Raqamingizni ulang</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Botda <b>/start</b> ni bosing va <b>«📲 Kontaktni ulashish»</b> tugmasi orqali raqamingizni yuboring. Keyin
            ilovani qayta oching.
          </p>
          <div className="pt-2 space-y-2">
            {needPhoneLink.botUrl && (
              <a
                href={needPhoneLink.botUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                ✈️ Botni ochish
              </a>
            )}
            <button onClick={() => setNeedPhoneLink(null)} className="w-full py-2.5 text-sm text-slate-400 hover:text-white">
              Telefon raqam bilan kirish
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return <LoadingScreen />;
  }

  if (phase === 'error' && !boot) {
    return (
      <div className="min-h-screen bg-[#06154A] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-[#0D183A] border border-rose-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="text-5xl">📡</div>
          <h2 className="text-xl font-black text-rose-300">Ulanib bo'lmadi</h2>
          <p className="text-sm text-slate-300 leading-relaxed">{errorMessage}</p>
          <button
            onClick={() => {
              setPhase('loading');
              refresh(false);
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-sm shadow-lg active:scale-95 transition-transform"
          >
            Qayta urinish 🔄
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'login' || !boot) {
    return (
      <div className="min-h-screen bg-ambient-mesh bg-[#06154A] text-slate-100 flex flex-col items-center justify-center p-4">
        <OfflineIndicator />
        <LoginModal isOpen={true} language={language} isLargeText={isLargeText} onLogin={handleLogin} />
      </div>
    );
  }

  // Bazada yo'q yangi mijoz: anketa va aloqa raqami
  if (!boot.registered) {
    return (
      <OnboardingView
        phone={boot.phone}
        supportPhone={boot.supportPhone}
        leadSubmitted={boot.leadSubmitted}
        config={boot.config}
        onLogout={handleLogout}
      />
    );
  }

  const { user, stats, config, tickets, winners } = boot;
  const leaderboardEntries = activeScope === 'region' ? boot.leaderboard.region : boot.leaderboard.republic;

  return (
    <div className={`min-h-screen bg-ambient-mesh text-slate-100 flex flex-col ${isLargeText ? 'text-lg' : 'text-base'}`}>
      <OfflineIndicator />

      {demoActive && (
        <div className="bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-widest text-center py-1 px-2 sticky top-0 z-50 shadow-md">
          ⚠️ {t.demoBanner}
        </div>
      )}

      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#080C14]/94 backdrop-blur-2xl border-b border-amber-500/20 px-4 py-2.5 pt-safe flex items-center justify-between gap-2 shadow-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-[#06154A] font-black shadow-[0_0_15px_rgba(245,158,11,0.45)]">
            E
          </div>
          <div className="font-black text-base tracking-tight whitespace-nowrap">
            EPCO <span className="text-amber-400">Shou</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <MascotUstaMoy language={language} activeTab={activeTab} isLargeText={isLargeText} />
          <button
            onClick={() => setIsRulesOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-base flex items-center justify-center"
            aria-label={t.rulesBtn}
            title={t.rulesBtn}
          >
            📜
          </button>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 font-black text-sm flex items-center justify-center"
            aria-label={t.profileBtn}
          >
            {(user.name || 'U').charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      {syncFailed && (
        <button
          onClick={() => refresh(true)}
          className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs py-1.5 px-3"
        >
          Ma'lumot yangilanmadi — oxirgi saqlangan holat ko'rsatilmoqda. Yangilash uchun bosing 🔄
        </button>
      )}

      <main className="flex-1 w-full max-w-lg mx-auto p-3.5 sm:p-5 pb-28 space-y-4">
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Salomlashish va qisqa holat */}
            <div className="flex items-center justify-between gap-3 bg-[#0E1424]/85 p-3 px-4 rounded-2xl border border-white/10">
              <div className="min-w-0">
                <div className="text-xs text-slate-400">Assalomu alaykum,</div>
                <div className="font-black text-white truncate">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user.region} · {config.currentMonthName}: {config.timeRemainingLabel}
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('leaderboard');
                  triggerHaptic(20);
                }}
                className="shrink-0 text-center px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/40"
              >
                <div className="text-[10px] text-amber-300/80 font-bold uppercase">Reyting</div>
                <div className="text-lg font-black text-amber-300 tabular-nums leading-none">#{stats.currentRank}</div>
              </button>
            </div>

            <OilFlaskWidget
              stats={stats}
              language={language}
              isLargeText={isLargeText}
              onOpenTicketsModal={() => setIsTicketsOpen(true)}
            />

            <ProbabilityCard stats={stats} config={config} language={language} isLargeText={isLargeText} />

            <GrandPrizeBanner
              stats={stats}
              language={language}
              isLargeText={isLargeText}
              onNavigateToLeaderboard={() => {
                setActiveTab('leaderboard');
                triggerHaptic(20);
              }}
            />

            <SimulatorCard stats={stats} config={config} language={language} isLargeText={isLargeText} />

            <button
              onClick={() => setIsWinnersOpen(true)}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              🏅 {t.winnersBtn}
            </button>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            entries={leaderboardEntries}
            stats={stats}
            user={user}
            language={language}
            isLargeText={isLargeText}
            activeScope={activeScope}
            onChangeScope={(scope) => {
              setActiveScope(scope);
              triggerHaptic(20);
            }}
          />
        )}
      </main>

      {/* Pastki menyu: Asosiy | Biletlarim | Reyting */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080C14]/94 backdrop-blur-2xl border-t border-amber-500/25 pb-safe shadow-[0_-10px_35px_rgba(0,0,0,0.85)]">
        <div className="max-w-md mx-auto grid grid-cols-3 items-center h-16 px-3 gap-1">
          {[
            { key: 'home', icon: '🏠', label: t.tabHome, onClick: () => setActiveTab('home'), active: activeTab === 'home' },
            {
              key: 'tickets',
              icon: '🎟️',
              label: `${t.ticketsBtn} (${stats.tickets})`,
              onClick: () => setIsTicketsOpen(true),
              active: false,
            },
            {
              key: 'leaderboard',
              icon: '🏆',
              label: t.tabLeaderboard,
              onClick: () => {
                setActiveTab('leaderboard');
                window.dispatchEvent(new CustomEvent('usta-moy-speak', { detail: { topic: 'leaderboard' } }));
              },
              active: activeTab === 'leaderboard',
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                tab.onClick();
                triggerHaptic(20);
              }}
              className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl transition-all relative ${
                tab.active ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs mt-0.5 tracking-tight font-bold">{tab.label}</span>
              {tab.active && (
                <span className="absolute bottom-1 w-6 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </nav>

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
        winners={winners}
        language={language}
        isLargeText={isLargeText}
        onClose={() => setIsWinnersOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        language={language}
        isLargeText={isLargeText}
        onClose={() => setIsProfileOpen(false)}
        onUpdateConsent={handleUpdateConsent}
        onLogout={handleLogout}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onToggleTextSize={toggleTextSize}
        onToggleLanguage={toggleLanguage}
      />
    </div>
  );
}
