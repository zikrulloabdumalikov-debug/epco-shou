import React from 'react';
import { ClientStats, Language, PromoConfig } from '../types';
import { translations } from '../i18n';

interface ProbabilityCardProps {
  stats: ClientStats;
  config?: PromoConfig;
  language: Language;
  isLargeText?: boolean;
}

export const ProbabilityCard: React.FC<ProbabilityCardProps> = ({
  stats,
  config,
  language,
  isLargeText,
}) => {
  const t = translations[language];
  const totalWinnersK = config?.totalShowWinners || 30;
  const isDebtCleared = stats.isDebtCleared;
  const debtAmount = stats.debtAmount || 0;
  const probIfDebtCleared = stats.probIfDebtCleared ?? stats.probPercent;

  return (
    <div className="glass-card p-4 sm:p-5 relative overflow-hidden shadow-xl border border-white/15 space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div>
          <h3 className={`font-black text-white flex items-center gap-1.5 ${isLargeText ? 'text-lg' : 'text-base'}`}>
            <span>🎯</span> Jonli shouga taklif qilinish ehtimoli
          </h3>
          <p className="text-xs text-white/70 mt-0.5">
            Barcha aktual biletlar orasidan tasodifiy {totalWinnersK} ta bilet tanlanadi
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-black text-[#FFC933] bg-[#FFC933]/15 px-2.5 py-1 rounded-full border border-[#FFC933]/30 tracking-wider">
            K = {totalWinnersK} Ishtirokchi
          </span>
        </div>
      </div>

      {/* Debt Warning for Inactive Tickets */}
      {!isDebtCleared && (
        <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-xs text-rose-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <span className="text-base">⚠️</span>
            <span>Qarzingiz (${debtAmount}) sababli biletlaringiz hozircha nofaol</span>
          </div>
          <p className="text-[11px] text-rose-100/90 pl-6 leading-relaxed">
            Qarzni yopsangiz ehtimolingiz <strong className="text-emerald-300 font-black">{probIfDebtCleared}%</strong> bo'ladi!
          </p>
        </div>
      )}

      {/* 4 Probability Metric Views Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* 1. Exact Monthly Percentage */}
        <div className="bg-[#0B0F19]/80 rounded-xl p-3 border border-white/10 shadow-md flex flex-col justify-between">
          <div className="text-slate-300 font-semibold text-[11px] mb-1">
            {t.probView1Label}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black tabular-nums ${isDebtCleared ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isDebtCleared ? `${stats.probPercent}%` : '0%'}
            </span>
            <span className="text-[11px] text-slate-400">
              ({stats.activeTicketsCount} ta faol bilet)
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {isDebtCleared
              ? `Jami ${config?.totalConfirmedTicketsPool || stats.tickets} ta aktual bilet orasidan hisoblangan.`
              : `Qarz yopilgach: ${probIfDebtCleared}% ga aylanadi.`}
          </p>
        </div>

        {/* 2. Relative Ratio vs Average Participant */}
        <div className="bg-[#0B0F19]/80 rounded-xl p-3 border border-white/10 shadow-md flex flex-col justify-between">
          <div className="text-slate-300 font-semibold text-[11px] mb-1">
            {t.probView2Label}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-400 tabular-nums">
              {isDebtCleared && stats.probRelativeRatio > 0 ? `${stats.probRelativeRatio}x` : '—'}
            </span>
            <span className="text-xs text-white/90 font-medium">
              {t.probView2Suffix}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            O'rtacha faol ishtirokchi ({stats.activeParticipants || 1} ta usta) biletlariga nisbatan.
          </p>
        </div>

        {/* 3. Leap with +1 Ticket */}
        <div className="bg-[#0B0F19]/80 rounded-xl p-3 border border-white/10 shadow-md flex flex-col justify-between">
          <div className="text-slate-300 font-semibold text-[11px] mb-1">
            {t.probView3Label}
          </div>
          <div className="text-sm font-bold text-white">
            <span className="text-slate-400 tabular-nums">{stats.probPercent}%</span>
            <span className="mx-1 text-amber-400">→</span>
            <span className="text-emerald-400 tabular-nums text-base">
              {stats.probNextJump?.newProb ?? stats.probPercent}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="bg-emerald-500/20 text-emerald-400 font-bold text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 tabular-nums">
              ×{stats.probNextJump?.relativeMultiplier ?? 1} barobar
            </span>
            <span className="text-[10px] text-amber-400 font-semibold tabular-nums">
              (+{stats.probNextJump?.absolutePointDelta ?? 0}% pt)
            </span>
          </div>
        </div>

        {/* 4. Four-Month Streak Projection */}
        <div className="bg-[#0B0F19]/80 rounded-xl p-3 border border-white/10 shadow-md flex flex-col justify-between">
          <div className="text-slate-300 font-semibold text-[11px] mb-1">
            {t.probView4Label}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-amber-400 tabular-nums">
              {stats.probFourMonthStreak}%
            </span>
            <span className="text-[11px] text-emerald-300 font-medium">
              kamida 1 marta
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Formula: 1 − (1 − P(t))⁴ (4 oylik aksiya davomida).
          </p>
        </div>
      </div>
    </div>
  );
};
