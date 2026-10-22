import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { AlertTriangle, ChevronRight, Ticket } from 'lucide-react';
import { ClientStats } from '../types';
import { playTicketChime, triggerHaptic } from '../utils/audio';
import { useL, money } from '../i18n/lang';

interface HomeHeroProps {
  name: string;
  stats: ClientStats;
  timeLeft: string;
  onOpenTickets: () => void;
  onOpenLeaderboard: () => void;
}

/**
 * Bosh sahifaning yuragi: usta birinchi soniyada ikki narsani ko'radi —
 * nechta bileti bor va keyingisiga qancha qoldi.
 */
export const HomeHero: React.FC<HomeHeroProps> = ({ name, stats, timeLeft, onOpenTickets, onOpenLeaderboard }) => {
  const L = useL();
  const prevTickets = useRef(stats.tickets);

  // Yangi bilet qo'shilganda kichik bayram
  useEffect(() => {
    if (stats.tickets > prevTickets.current) {
      playTicketChime();
      triggerHaptic([60, 40, 80]);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.35 }, colors: ['#0064FF', '#FFFFFF', '#F5A300', '#12A35F'] });
    }
    prevTickets.current = stats.tickets;
  }, [stats.tickets]);

  const remainder = stats.currentMonthRemainder || 0;
  const progress = Math.min(100, Math.max(3, (remainder / 1000) * 100));
  const active = stats.isDebtCleared;

  return (
    <section className="hero p-5">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-white/75">{L('Assalomu alaykum,', 'Здравствуйте,')}</div>
          <div className="text-lg font-bold truncate">{name}</div>
        </div>
        <button
          onClick={onOpenLeaderboard}
          className="shrink-0 flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm font-bold"
        >
          #{stats.currentRank}
          <span className="font-medium text-white/75">{L('o\'rin', 'место')}</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <button onClick={onOpenTickets} className="relative z-10 mt-5 flex items-end gap-3 text-left">
        <span className="text-[84px] leading-[0.8] font-extrabold tracking-tight tabular-nums">{stats.tickets}</span>
        <span className="pb-1.5">
          <span className="flex items-center gap-1.5 text-lg font-bold">
            <Ticket size={20} />
            {L('bilet', 'билет')}
          </span>
          <span className={`text-sm font-semibold ${active ? 'text-white/80' : 'text-[#FFD7D3]'}`}>
            {active ? L('hammasi faol', 'все активны') : L('hozircha nofaol', 'пока неактивны')}
          </span>
        </span>
      </button>

      <div className="relative z-10 mt-6">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-white/80">{L('Keyingi biletgacha', 'До следующего билета')}</span>
          <span className="text-lg font-bold tabular-nums">{money(stats.gapToNextTicket)}</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full bg-white transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-white/70 tabular-nums">
          <span>
            {L('Shu oy to\'langan:', 'Оплачено в месяце:')} {money(stats.confirmedAmount)}
          </span>
          <span>{timeLeft}</span>
        </div>
      </div>

      {!active && (
        <div className="relative z-10 mt-4 flex gap-3 rounded-2xl bg-white p-3.5 text-ink">
          <AlertTriangle size={22} className="shrink-0 text-bad mt-0.5" />
          <div className="text-sm leading-snug">
            <div className="font-bold text-bad">
              {L('Qarz:', 'Долг:')} {money(stats.debtAmount)}
            </div>
            {L(
              'Qarz yopilishi bilan barcha biletlaringiz darhol faollashadi va shouda qatnashadi.',
              'Как только долг будет погашен, все билеты сразу станут активными и будут участвовать в шоу.'
            )}
          </div>
        </div>
      )}

      {active && stats.isMonthEndWarning && remainder > 0 && (
        <div className="relative z-10 mt-4 rounded-2xl bg-white/15 p-3 text-sm leading-snug">
          ⏳{' '}
          {L(
            `Oy oxirida ${money(remainder)} qoldiq nolga tushadi — biletga aylantirishga ulguring.`,
            `В конце месяца остаток ${money(remainder)} обнулится — успейте превратить его в билет.`
          )}
        </div>
      )}
    </section>
  );
};
