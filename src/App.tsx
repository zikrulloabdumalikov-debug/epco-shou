/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PrizeScope, BootstrapData } from './types';
import { dataService } from './services/dataService';
import { apiService } from './services/apiService';
import { isDemoMode } from './services/demoData';
import { isSoundEnabled, setSoundEnabled, triggerHaptic } from './utils/audio';
import { useL, useLanguage, setLanguage, localizeMonth } from './i18n/lang';

// Components
import { OilFlaskWidget } from './components/OilFlaskWidget';
import { GrandPrizeBanner } from './components/GrandPrizeBanner';
import { ProbabilityCard } from './components/ProbabilityCard';
import { SimulatorCard } from './components/SimulatorCard';
import { LeaderboardView } from './components/LeaderboardView';
import { TicketsModal } from './components/TicketsModal';
import { RulesAndTrustModal } from './components/RulesAndTrustModal';
import { WinnersWallModal } from './components/WinnersWallModal';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { TicketVerifyPage } from './components/TicketVerifyPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoadingScreen } from './components/LoadingScreen';
import { OnboardingView } from './components/OnboardingView';
import { AdminPanel } from './components/AdminPanel';

// Ochiq turgan ilova ma'lumotlarini shu oraliqda fonda yangilaydi
const AUTO_REFRESH_MS = 5 * 60 * 1000;

type Phase = 'loading' | 'login' | 'ready' | 'error';
type Tab = 'home' | 'leaderboard' | 'admin';

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
  const L = useL();
  const language = useLanguage();
  const [verifyTicketNumber, setVerifyTicketNumber] = useState<string | null>(getVerifyTicketFromUrl);

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isLargeText, setIsLargeText] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());
  const [activeScope, setActiveScope] = useState<PrizeScope>('republic');

  // Oxirgi saqlangan nusxa darhol ko'rsatiladi, yangisi fonda keladi
  const [boot, setBoot] = useState<BootstrapData | null>(() => dataService.getCachedBootstrap());
  const [phase, setPhase] = useState<Phase>(() => (dataService.getCachedBootstrap() ? 'ready' : 'loading'));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [needPhoneLink, setNeedPhoneLink] = useState<{ botUrl: string } | null>(null);
  const lastRefreshRef = useRef(0);

  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isWinnersOpen, setIsWinnersOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      setErrorMessage(res.error?.message || null);
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
          setNeedPhoneLink({ botUrl: res.data.botUrl || '' });
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

  const handleLogin = async (token: string) => {
    apiService.setToken(token);
    setNeedPhoneLink(null);
    setPhase('loading');
    await refresh(false);
  };

  const handleLogout = async () => {
    await dataService.logout();
    setBoot(null);
    setActiveTab('home');
    setPhase('login');
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    triggerHaptic(20);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'uz' ? 'ru' : 'uz');
    triggerHaptic(20);
  };

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
          <h2 className="text-xl font-black text-amber-300">{L('Raqamingizni ulang', 'Привяжите номер')}</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {L(
              'Botda /start ni bosing va «📲 Kontaktni ulashish» tugmasi orqali raqamingizni yuboring. Keyin ilovani qayta oching.',
              'Нажмите /start в боте и отправьте номер кнопкой «📲 Kontaktni ulashish». Затем откройте приложение снова.'
            )}
          </p>
          {needPhoneLink.botUrl && (
            <a
              href={needPhoneLink.botUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-sm flex items-center justify-center"
            >
              ✈️ {L('Botni ochish', 'Открыть бота')}
            </a>
          )}
          <button onClick={() => setNeedPhoneLink(null)} className="w-full py-2.5 text-sm text-slate-400 hover:text-white">
            {L('Telefon raqam bilan kirish', 'Войти по номеру телефона')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') return <LoadingScreen />;

  if (phase === 'error' && !boot) {
    return (
      <div className="min-h-screen bg-[#06154A] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-[#0D183A] border border-rose-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="text-5xl">📡</div>
          <h2 className="text-xl font-black text-rose-300">{L('Ulanib bo\'lmadi', 'Не удалось подключиться')}</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {errorMessage || L('Internetni tekshirib, qayta urinib ko\'ring.', 'Проверьте интернет и попробуйте снова.')}
          </p>
          <button
            onClick={() => {
              setPhase('loading');
              refresh(false);
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-sm"
          >
            {L('Qayta urinish 🔄', 'Повторить 🔄')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'login' || !boot) {
    return (
      <div className="min-h-screen bg-ambient-mesh bg-[#06154A] text-slate-100 flex flex-col items-center justify-center p-4">
        <OfflineIndicator />
        <LoginModal isOpen={true} isLargeText={isLargeText} onLogin={handleLogin} />
      </div>
    );
  }

  // Bazada yo'q admin — faqat admin panel
  if (!boot.registered && boot.isAdmin) {
    return (
      <div className="min-h-screen bg-ambient-mesh text-slate-100">
        <header className="sticky top-0 z-40 bg-[#080C14]/94 backdrop-blur-2xl border-b border-amber-500/20 px-4 py-3 flex items-center justify-between">
          <div className="font-black">EPCO <span className="text-amber-400">Shou</span></div>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white">{L('Chiqish', 'Выйти')}</button>
        </header>
        <main className="max-w-lg mx-auto p-4 pb-10">
          <AdminPanel currentMonth={boot.config.currentMonthName} />
        </main>
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
  const timeLeft = stats.isLastDayOfMonth
    ? L(`${stats.hoursRemainingInMonth} soat qoldi`, `осталось ${stats.hoursRemainingInMonth} ч`)
    : L(`${stats.daysRemainingInMonth} kun qoldi`, `осталось ${stats.daysRemainingInMonth} дн.`);

  const tabs: { key: string; icon: string; label: string; onClick: () => void; active: boolean }[] = [
    { key: 'home', icon: '🏠', label: L('Asosiy', 'Главная'), onClick: () => setActiveTab('home'), active: activeTab === 'home' },
    { key: 'tickets', icon: '🎟️', label: `${L('Biletlar', 'Билеты')} (${stats.tickets})`, onClick: () => setIsTicketsOpen(true), active: false },
    { key: 'leaderboard', icon: '🏆', label: L('Reyting', 'Рейтинг'), onClick: () => setActiveTab('leaderboard'), active: activeTab === 'leaderboard' },
  ];
  if (boot.isAdmin) {
    tabs.push({ key: 'admin', icon: '🛠', label: 'Admin', onClick: () => setActiveTab('admin'), active: activeTab === 'admin' });
  }

  return (
    <div className={`min-h-screen bg-ambient-mesh text-slate-100 flex flex-col ${isLargeText ? 'text-lg' : 'text-base'}`}>
      <OfflineIndicator />

      {demoActive && (
        <div className="bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-widest text-center py-1 px-2 sticky top-0 z-50">
          ⚠️ {L('Demo rejim — haqiqiy ma\'lumot emas', 'Демо-режим — не настоящие данные')}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#080C14]/94 backdrop-blur-2xl border-b border-amber-500/20 px-4 py-2.5 pt-safe flex items-center justify-between gap-2 shadow-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-[#06154A] font-black">
            E
          </div>
          <div className="font-black text-base tracking-tight whitespace-nowrap">
            EPCO <span className="text-amber-400">Shou</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleLanguage}
            className="h-9 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-black"
            aria-label={L('Tilni almashtirish', 'Сменить язык')}
          >
            {language === 'uz' ? 'RU' : 'UZ'}
          </button>
          <button
            onClick={() => setIsRulesOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-base flex items-center justify-center"
            aria-label={L('Qoidalar', 'Правила')}
          >
            📜
          </button>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 font-black text-sm flex items-center justify-center"
            aria-label={L('Profil', 'Профиль')}
          >
            {(user.name || 'U').charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      {syncFailed && (
        <button onClick={() => refresh(true)} className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs py-1.5 px-3">
          {L(
            'Ma\'lumot yangilanmadi — oxirgi saqlangan holat ko\'rsatilmoqda. Yangilash uchun bosing 🔄',
            'Данные не обновились — показано последнее сохранённое. Нажмите, чтобы обновить 🔄'
          )}
        </button>
      )}

      <main className="flex-1 w-full max-w-lg mx-auto p-3.5 sm:p-5 pb-28 space-y-4">
        {activeTab === 'home' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 bg-[#0E1424]/85 p-3 px-4 rounded-2xl border border-white/10">
              <div className="min-w-0">
                <div className="text-xs text-slate-400">{L('Assalomu alaykum,', 'Здравствуйте,')}</div>
                <div className="font-black text-white truncate">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user.region} · {localizeMonth(config.currentMonthName, language)}: {timeLeft}
                </div>
              </div>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className="shrink-0 text-center px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/40"
              >
                <div className="text-[10px] text-amber-300/80 font-bold uppercase">{L('Reyting', 'Рейтинг')}</div>
                <div className="text-lg font-black text-amber-300 tabular-nums leading-none">#{stats.currentRank}</div>
              </button>
            </div>

            {config.liveUrl && (
              <a
                href={config.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black shadow-[0_8px_30px_rgba(220,38,38,0.35)]"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                {L('Jonli efir / videoni ko\'rish', 'Смотреть прямой эфир / видео')}
              </a>
            )}

            <OilFlaskWidget stats={stats} language={language} isLargeText={isLargeText} onOpenTicketsModal={() => setIsTicketsOpen(true)} />
            <ProbabilityCard stats={stats} config={config} isLargeText={isLargeText} />
            <GrandPrizeBanner stats={stats} config={config} onNavigateToLeaderboard={() => setActiveTab('leaderboard')} />
            <SimulatorCard stats={stats} config={config} isLargeText={isLargeText} />

            <button
              onClick={() => setIsWinnersOpen(true)}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              🏅 {L('G\'oliblar', 'Победители')}
              {winners.length > 0 ? ` (${winners.length})` : ''}
            </button>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            entries={leaderboardEntries}
            stats={stats}
            user={user}
            isLargeText={isLargeText}
            activeScope={activeScope}
            onChangeScope={(scope) => {
              setActiveScope(scope);
              triggerHaptic(20);
            }}
          />
        )}

        {activeTab === 'admin' && boot.isAdmin && <AdminPanel currentMonth={config.currentMonthName} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080C14]/94 backdrop-blur-2xl border-t border-amber-500/25 pb-safe">
        <div className={`max-w-md mx-auto grid ${tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} items-center h-16 px-3 gap-1`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                tab.onClick();
                triggerHaptic(20);
              }}
              className={`flex flex-col items-center justify-center min-h-[48px] rounded-xl relative ${
                tab.active ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs mt-0.5 tracking-tight font-bold">{tab.label}</span>
              {tab.active && <span className="absolute bottom-1 w-6 h-1 rounded-full bg-amber-400" />}
            </button>
          ))}
        </div>
      </nav>

      <TicketsModal isOpen={isTicketsOpen} tickets={tickets} stats={stats} isLargeText={isLargeText} onClose={() => setIsTicketsOpen(false)} />
      <RulesAndTrustModal isOpen={isRulesOpen} config={config} isLargeText={isLargeText} onClose={() => setIsRulesOpen(false)} />
      <WinnersWallModal
        isOpen={isWinnersOpen}
        winners={winners}
        grandPrize={config.grandPrize}
        isLargeText={isLargeText}
        onClose={() => setIsWinnersOpen(false)}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        isLargeText={isLargeText}
        onClose={() => setIsProfileOpen(false)}
        onLogout={handleLogout}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onToggleTextSize={() => setIsLargeText((prev) => !prev)}
        onToggleLanguage={toggleLanguage}
      />
    </div>
  );
}
