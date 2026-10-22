import React, { useState, useMemo, useEffect } from 'react';
import { ClientStats, Language, PromoConfig } from '../types';
import { translations } from '../i18n';
import { simulateAdditionalSpend } from '../utils/probability';
import { triggerHaptic } from '../utils/audio';

interface SimulatorCardProps {
  stats: ClientStats;
  config?: PromoConfig;
  language: Language;
  isLargeText?: boolean;
}

export const SimulatorCard: React.FC<SimulatorCardProps> = ({
  stats,
  config,
  language,
  isLargeText,
}) => {
  const t = translations[language];
  const initialGap = stats.gapToNextTicket > 0 ? stats.gapToNextTicket : 500;
  const [sliderAmount, setSliderAmount] = useState<number>(initialGap);

  // Sync initial slider if stats update
  useEffect(() => {
    if (stats.gapToNextTicket > 0) {
      setSliderAmount(stats.gapToNextTicket);
    }
  }, [stats.gapToNextTicket]);

  const poolT = config?.totalConfirmedTicketsPool || stats.tickets || 10;
  const showWinnersK = config?.totalShowWinners || 30;

  const simResult = useMemo(() => {
    return simulateAdditionalSpend(
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
    );
  }, [stats, sliderAmount, poolT, showWinnersK, config?.thresholds]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderAmount(val);
    triggerHaptic(15);
  };

  return (
    <div className="glass-card-gold p-4 sm:p-5 relative overflow-hidden shadow-2xl border border-[#FFC933]/30 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div>
          <h3 className={`font-black text-white flex items-center gap-1.5 ${isLargeText ? 'text-lg' : 'text-base'}`}>
            <span>⚡</span> {t.simTitle}
          </h3>
          <p className="text-xs text-white/70 mt-0.5">{t.simSubtitle}</p>
        </div>
        <span className="text-xs font-black text-[#FFC933] bg-black/40 px-2.5 py-1 rounded-xl border border-[#FFC933]/40 uppercase tracking-wider">
          Hisoblagich
        </span>
      </div>

      {/* Slider Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-white/80">{t.simSliderLabel}</span>
          <span className="text-2xl font-black text-[#FFC933] tabular-nums">
            +${sliderAmount}
          </span>
        </div>

        {/* Big tactile slider */}
        <input
          type="range"
          min="0"
          max="5000"
          step="50"
          value={sliderAmount}
          onChange={handleSliderChange}
          className="w-full h-3 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#FFC933] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC933]"
        />

        <div className="flex justify-between text-[10px] text-white/50 font-bold tabular-nums">
          <span>+$0</span>
          <span>+$1,000</span>
          <span>+$2,500</span>
          <span>+$5,000</span>
        </div>
      </div>

      {/* Live Simulation Results Grid */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {/* New Tickets */}
        <div className="bg-black/35 rounded-xl p-2.5 border border-white/10 flex flex-col justify-between">
          <div className="text-[10px] text-white/60 font-semibold uppercase">
            Jami biletlar
          </div>
          <div className="text-xl font-black text-white mt-1 tabular-nums">
            {simResult.newTickets} ta
          </div>
          <div className="text-[10px] font-bold text-[#3DDC97] mt-0.5">
            {simResult.ticketDelta > 0 ? `+${simResult.ticketDelta} ta yangi!` : 'Hozirgi biletlar'}
          </div>
        </div>

        {/* Remainder to next ticket */}
        <div className="bg-black/35 rounded-xl p-2.5 border border-white/10 flex flex-col justify-between">
          <div className="text-[10px] text-white/60 font-semibold uppercase">
            Keyingi biletga
          </div>
          <div className="text-xl font-black text-[#3DDC97] mt-1 tabular-nums">
            ${simResult.newGapToTicket}
          </div>
          <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
            yetmaydi
          </div>
        </div>

        {/* Estimated Rank */}
        <div className="bg-black/35 rounded-xl p-2.5 border border-white/10 flex flex-col justify-between">
          <div className="text-[10px] text-white/60 font-semibold uppercase">
            Reytingdagi o'rin
          </div>
          <div className="text-xl font-black text-[#FFC933] mt-1 tabular-nums">
            {simResult.estimatedRank}-o'rin
          </div>
          <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">
            {simResult.rankDelta > 0 ? `▲ +${simResult.rankDelta} o'rin!` : 'Hozirgi o\'rin'}
          </div>
        </div>
      </div>

      {/* Estimated Probability Note */}
      <div className="bg-black/30 rounded-xl p-2.5 border border-white/10 text-xs text-center">
        <span className="text-slate-300">Shouga chiqish imkoniyati: </span>
        <span className="text-emerald-400 font-black text-sm tabular-nums">{Math.round(simResult.newMetrics.percent)}%</span>
      </div>

      {/* Simulator Guidance CTA */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => {
            triggerHaptic(25);
            window.dispatchEvent(
              new CustomEvent('usta-moy-speak', {
                detail: {
                  topic: 'simulator',
                  text: `Usta! Agar yana $${sliderAmount} to'lasangiz, jami ${simResult.newTickets} ta biletga ega bo'lasiz va shouga taklif qilinish ehtimolingiz ${simResult.newMetrics.percent}% ga yetadi! Lekin biletlar tirajda qatnashishi uchun qarzingizni $0 qilish shart.`,
                },
              })
            );
          }}
          className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-transform cursor-pointer"
        >
          <span>💡</span>
          <span>Usta Moy Maslahatini Olish (+${sliderAmount})</span>
        </button>

        {!stats.isDebtCleared && (
          <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/60 text-[11px] text-rose-200 flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              Eslatma: Hisobingizda ${stats.debtAmount} qarz bor. Qarzni yopsangiz biletlaringiz darhol aktivlashadi va ehtimolingiz {stats.probIfDebtCleared ?? simResult.newMetrics.percent}% bo'ladi!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
