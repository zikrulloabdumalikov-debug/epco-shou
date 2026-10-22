/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Home, ScrollText, Ticket, Trophy, Medal, Wrench, WifiOff, Send, RefreshCw } from 'lucide-react';
import { PrizeScope, BootstrapData } from './types';
import { dataService } from './services/dataService';
import { apiService } from './services/apiService';
import { isDemoMode } from './services/demoData';
import { isSoundEnabled, setSoundEnabled, triggerHaptic } from './utils/audio';
import { useL, useLanguage, setLanguage } from './i18n/lang';
import epcoLogo from './assets/brand/epco-logo.png';

import { HomeHero } from './components/HomeHero';
import { PrizeCard } from './components/PrizeCard';
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
  if (path.startsWith(verifyPrefix)) return decodeURIComponent(path.slice(verifyPrefix.length));
  const hash = window.location.hash;
  if (hash.startsWith('#/verify/')) return decodeURIComponent(hash.replace('#/verify/', ''));
  return null;
}

/** Oddiy markazlashgan holat ekrani (xato, botga ulanish) */
const StatusScreen: React.FC<{ icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }> = ({ icon, title, text, children }) => (
  <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
    <div className="w-16 h-16 rounded-full bg-brand-soft text-brand flex items-center justify-center">{icon}</div>
    <h2 className="mt-5 text-2xl font-extrabold">{title}</h2>
    <p className="mt-2 max-w-sm text-muted leading-relaxed">{text}</p>
    <div className="mt-6 w-full max-w-sm space-y-2">{children}</div>
  </div>
);

export default function App() {
  const L = useL();
  const language = useLanguage();
  const [verifyTicketNumber, setVerifyTicketNumber] = useState<string | null>(getVerifyTicketFromUrl);

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isLargeText, setIsLargeText] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());
  const [activeScope, setActiveScope] = useState<PrizeScope>('republic');
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        if (res.data?.status === 'NEED_PHONE_LINK') setNeedPhoneLink({ botUrl: res.data.botUrl || '' });
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
    setSoundOn(!soundOn);
    setSoundEnabled(!soundOn);
    triggerHaptic(20);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'uz' ? 'ru' : 'uz');
    triggerHaptic(20);
  };

  const goTo = (tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
    triggerHaptic(15);
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

  if (needPhoneLink && phase === 'login') {
    return (
      <StatusScreen
        icon={<Send size={28} />}
        title={L('Raqamingizni ulang', 'Привяжите номер')}
        text={L(
          'Botda /start ni bosing va «📲 Kontaktni ulashish» tugmasi orqali raqamingizni yuboring. Keyin ilovani qayta oching.',
          'Нажмите /start в боте и отправьте номер кнопкой «📲 Kontaktni ulashish». Затем откройте приложение снова.'
        )}
      >
        {needPhoneLink.botUrl && (
          <a href={needPhoneLink.botUrl} target="_blank" rel="noreferrer" className="btn w-full bg-[#229ED9] text-white">
            <Send size={18} /> {L('Botni ochish', 'Открыть бота')}
          </a>
        )}
        <button onClick={() => setNeedPhoneLink(null)} className="btn btn-ghost w-full">
          {L('Telefon raqam bilan kirish', 'Войти по номеру телефона')}
        </button>
      </StatusScreen>
    );
  }

  if (phase === 'loading') return <LoadingScreen />;

  if (phase === 'error' && !boot) {
    return (
      <StatusScreen
        icon={<WifiOff size={28} />}
        title={L('Ulanib bo\'lmadi', 'Не удалось подключиться')}
        text={errorMessage || L('Internetni tekshirib, qayta urinib ko\'ring.', 'Проверьте интернет и попробуйте снова.')}
      >
        <button
          onClick={() => {
            setPhase('loading');
            refresh(false);
          }}
          className="btn btn-primary w-full"
        >
          <RefreshCw size={18} /> {L('Qayta urinish', 'Повторить')}
        </button>
      </StatusScreen>
    );
  }

  if (phase === 'login' || !boot) {
    return (
      <>
        <OfflineIndicator />
        <LoginModal isLargeText={isLargeText} onLogin={handleLogin} />
      </>
    );
  }

  const header = (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-line pt-safe">
      <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between gap-2">
        <img src={epcoLogo} alt="EPCO" className="h-7 w-auto" />
        <div className="flex items-center gap-2">
          <button onClick={toggleLanguage} className="icon-btn" aria-label={L('Tilni almashtirish', 'Сменить язык')}>
            {language === 'uz' ? 'RU' : 'UZ'}
          </button>
          {boot.registered && (
            <>
              <button onClick={() => setIsRulesOpen(true)} className="icon-btn" aria-label={L('Qoidalar', 'Правила')}>
                <ScrollText size={19} />
              </button>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="w-10 h-10 rounded-full bg-brand text-white font-bold flex items-center justify-center"
                aria-label={L('Profil', 'Профиль')}
              >
                {(boot.user.name || 'U').charAt(0).toUpperCase()}
              </button>
            </>
          )}
          {!boot.registered && (
            <button onClick={handleLogout} className="icon-btn w-auto px-3">
              {L('Chiqish', 'Выйти')}
            </button>
          )}
        </div>
      </div>
    </header>
  );

  // Bazada yo'q admin — faqat admin panel
  if (!boot.registered && boot.isAdmin) {
    return (
      <div className="min-h-screen bg-page">
        {header}
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
    ? L(`oy tugashiga ${stats.hoursRemainingInMonth} soat`, `до конца месяца ${stats.hoursRemainingInMonth} ч`)
    : L(`oy tugashiga ${stats.daysRemainingInMonth} kun`, `до конца месяца ${stats.daysRemainingInMonth} дн.`);

  const tabs: { key: string; icon: React.ReactNode; label: string; onClick: () => void; active: boolean }[] = [
    { key: 'home', icon: <Home size={22} />, label: L('Asosiy', 'Главная'), onClick: () => goTo('home'), active: activeTab === 'home' },
    { key: 'tickets', icon: <Ticket size={22} />, label: L('Biletlar', 'Билеты'), onClick: () => setIsTicketsOpen(true), active: false },
    { key: 'leaderboard', icon: <Trophy size={22} />, label: L('Reyting', 'Рейтинг'), onClick: () => goTo('leaderboard'), active: activeTab === 'leaderboard' },
  ];
  if (boot.isAdmin) {
    tabs.push({ key: 'admin', icon: <Wrench size={22} />, label: 'Admin', onClick: () => goTo('admin'), active: activeTab === 'admin' });
  }

  const quickAction = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button onClick={onClick} className="card flex flex-col items-center justify-center gap-1.5 py-3.5 active:scale-[0.98] transition-transform">
      <span className="w-10 h-10 rounded-2xl bg-brand-soft text-brand flex items-center justify-center">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );

  return (
    <div className={`min-h-screen bg-page flex flex-col ${isLargeText ? 'text-[17px]' : 'text-[15px]'}`}>
      <OfflineIndicator />
      {demoActive && (
        <div className="bg-gold text-white text-xs font-bold text-center py-1">
          {L('Demo rejim — haqiqiy ma\'lumot emas', 'Демо-режим — не настоящие данные')}
        </div>
      )}
      {header}

      {syncFailed && (
        <button onClick={() => refresh(true)} className="w-full bg-gold-soft text-[#8a5a00] text-sm py-2 px-4">
          {L('Ma\'lumot yangilanmadi — yangilash uchun bosing', 'Данные не обновились — нажмите, чтобы обновить')}
        </button>
      )}

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-4 pb-28 space-y-4">
        {activeTab === 'home' && (
          <>
            <HomeHero
              name={user.name}
              stats={stats}
              timeLeft={timeLeft}
              onOpenTickets={() => setIsTicketsOpen(true)}
              onOpenLeaderboard={() => goTo('leaderboard')}
            />

            <div className="grid grid-cols-3 gap-3">
              {quickAction(<Ticket size={20} />, L('Biletlarim', 'Мои билеты'), () => setIsTicketsOpen(true))}
              {quickAction(<Trophy size={20} />, L('Reyting', 'Рейтинг'), () => goTo('leaderboard'))}
              {quickAction(<Medal size={20} />, L('G\'oliblar', 'Победители'), () => setIsWinnersOpen(true))}
            </div>

            <PrizeCard stats={stats} config={config} />

            <section className="card overflow-hidden">
              <button onClick={() => setDetailsOpen(!detailsOpen)} className="w-full flex items-center justify-between px-4 py-4 text-left">
                <span>
                  <span className="block font-bold">{L('Batafsil hisob-kitob', 'Подробный расчёт')}</span>
                  <span className="block text-sm text-muted">{L('Shouga chiqish imkoniyati va kalkulyator', 'Шанс на шоу и калькулятор')}</span>
                </span>
                <ChevronDown size={22} className={`text-muted transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
              </button>
              {detailsOpen && (
                <div className="px-4 pb-5 space-y-6 border-t border-line pt-4">
                  <ProbabilityCard stats={stats} config={config} />
                  <SimulatorCard stats={stats} config={config} />
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            entries={leaderboardEntries}
            stats={stats}
            user={user}
            activeScope={activeScope}
            onChangeScope={(scope) => {
              setActiveScope(scope);
              triggerHaptic(15);
            }}
          />
        )}

        {activeTab === 'admin' && boot.isAdmin && <AdminPanel currentMonth={config.currentMonthName} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-line pb-safe">
        <div className={`max-w-lg mx-auto grid ${tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} h-16 px-2`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                tab.onClick();
                triggerHaptic(15);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 ${tab.active ? 'text-brand' : 'text-muted'}`}
            >
              {tab.icon}
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <TicketsModal isOpen={isTicketsOpen} tickets={tickets} stats={stats} onClose={() => setIsTicketsOpen(false)} />
      <RulesAndTrustModal isOpen={isRulesOpen} config={config} onClose={() => setIsRulesOpen(false)} />
      <WinnersWallModal isOpen={isWinnersOpen} winners={winners} grandPrize={config.grandPrize} onClose={() => setIsWinnersOpen(false)} />
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
