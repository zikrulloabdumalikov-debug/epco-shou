import React, { useState, useMemo, useEffect } from 'react';
import { ClientStats, PromoConfig } from '../types';
import { simulateAdditionalSpend } from '../utils/probability';
import { triggerHaptic } from '../utils/audio';
import { useL, money } from '../i18n/lang';

interface SimulatorCardProps {
  stats: ClientStats;
  config?: PromoConfig;
  isLargeText?: boolean;
}

export const SimulatorCard: React.FC<SimulatorCardProps> = ({ stats, config, isLargeText }) => {
  const L = useL();
  const initialGap = stats.gapToNextTicket > 0 ? stats.gapToNextTicket : 500;
  const [sliderAmount, setSliderAmount] = useState<number>(initialGap);

  useEffect(() => {
    if (stats.gapToNextTicket > 0) {
      setSliderAmount(stats.gapToNextTicket);
    }
  }, [stats.gapToNextTicket]);

  const poolT = config?.totalConfirmedTicketsPool || stats.tickets || 10;
  const showWinnersK = config?.totalShowWinners || 30;

  const simResult = useMemo(
    () =>
      simulateAdditionalSpend(
        stats.confirmedAmount,
        sliderAmount,
        stats.currentRank,
        stats.gapToNextRank,
        stats.gapToTop10,
        stats.gapToFirstPlace,
        poolT,
        showWinnersK,
        stats.activeParticipants || 10,
        config?.thresholds
      ),
    [stats, sliderAmount, poolT, showWinnersK, config?.thresholds]
  );

  return (
    <section className="glass-card-gold p-4 sm:p-5 rounded-3xl border border-[#FFC933]/30 space-y-3">
      <div className="border-b border-white/10 pb-2">
        <h3 className={`font-black text-white ${isLargeText ? 'text-lg' : 'text-base'}`}>
          ⚡ {L('Hisoblagich', 'Калькулятор')}
        </h3>
        <p className="text-xs text-white/70 mt-0.5">
          {L('Yana qancha to\'lasangiz nima o\'zgaradi — suring va ko\'ring:', 'Что изменится, если оплатить ещё — двигайте ползунок:')}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-white/80">{L('Qo\'shimcha to\'lov:', 'Дополнительная оплата:')}</span>
          <span className="text-2xl font-black text-[#FFC933] tabular-nums">+{money(sliderAmount)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="5000"
          step="50"
          value={sliderAmount}
          onChange={(e) => {
            setSliderAmount(Number(e.target.value));
            triggerHaptic(15);
          }}
          className="w-full h-3 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#FFC933]"
        />
        <div className="flex justify-between text-[10px] text-white/50 font-bold tabular-nums">
          <span>+$0</span>
          <span>+$1,000</span>
          <span>+$2,500</span>
          <span>+$5,000</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-black/35 rounded-xl p-2.5 border border-white/10">
          <div className="text-[10px] text-white/60 font-semibold">{L('Jami biletlar', 'Всего билетов')}</div>
          <div className="text-xl font-black text-white mt-1 tabular-nums">{simResult.newTickets}</div>
          <div className="text-[10px] font-bold text-[#3DDC97] mt-0.5">
            {simResult.ticketDelta > 0 ? `+${simResult.ticketDelta} ${L('yangi', 'новых')}` : L('hozirgi', 'сейчас')}
          </div>
        </div>
        <div className="bg-black/35 rounded-xl p-2.5 border border-white/10">
          <div className="text-[10px] text-white/60 font-semibold">{L('Keyingi biletga', 'До билета')}</div>
          <div className="text-xl font-black text-[#3DDC97] mt-1 tabular-nums">{money(simResult.newGapToTicket)}</div>
          <div className="text-[10px] text-amber-300 font-semibold mt-0.5">{L('qoladi', 'останется')}</div>
        </div>
        <div className="bg-black/35 rounded-xl p-2.5 border border-white/10">
          <div className="text-[10px] text-white/60 font-semibold">{L('Reytingda', 'В рейтинге')}</div>
          <div className="text-xl font-black text-[#FFC933] mt-1 tabular-nums">#{simResult.estimatedRank}</div>
          <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">
            {simResult.rankDelta > 0 ? `▲ +${simResult.rankDelta}` : L('hozirgi', 'сейчас')}
          </div>
        </div>
      </div>

      <div className="bg-black/30 rounded-xl p-2.5 border border-white/10 text-xs text-center">
        <span className="text-slate-300">{L('Shouga chiqish imkoniyati:', 'Шанс попасть на шоу:')} </span>
        <span className="text-emerald-400 font-black text-sm tabular-nums">{Math.round(simResult.newMetrics.percent)}%</span>
      </div>

      {!stats.isDebtCleared && (
        <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/60 text-[11px] text-rose-200">
          ⚠️{' '}
          {L(
            `Hisobingizda ${money(stats.debtAmount)} qarz bor. Qarzni yopmaguningizcha biletlar shouda qatnashmaydi.`,
            `У вас долг ${money(stats.debtAmount)}. Пока долг не погашен, билеты не участвуют в шоу.`
          )}
        </div>
      )}
    </section>
  );
};
