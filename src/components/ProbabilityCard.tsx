import React from 'react';
import { ClientStats, Language, PromoConfig } from '../types';

interface ProbabilityCardProps {
  stats: ClientStats;
  config?: PromoConfig;
  language: Language;
  isLargeText?: boolean;
}

const money = (n: number) => `$${Math.round(n || 0).toLocaleString('en-US')}`;

export const ProbabilityCard: React.FC<ProbabilityCardProps> = ({ stats, config, isLargeText }) => {
  const K = config?.totalShowWinners || 30;
  const pool = config?.totalConfirmedTicketsPool || 0;
  const active = stats.activeTicketsCount || 0;
  const percent = stats.isDebtCleared ? stats.probPercent || 0 : 0;
  const nextPercent = stats.probNextJump?.newProb ?? percent;
  const everyoneInvited = pool > 0 && pool <= K;

  return (
    <section className="glass-card p-4 sm:p-5 rounded-3xl border border-white/15 space-y-4">
      <div>
        <h3 className={`font-black text-white ${isLargeText ? 'text-lg' : 'text-base'}`}>🎯 Jonli shouga chiqish imkoniyati</h3>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          Oy oxirida barcha faol biletlar orasidan <b className="text-white">{K} ta bilet</b> tasodifiy tanlanadi va egalari jonli
          shouga taklif qilinadi.
        </p>
      </div>

      {/* Asosiy ko'rsatkich */}
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={stats.isDebtCleared ? '#34D399' : '#64748B'}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0, Math.min(100, percent)) * 0.974} 100`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-black tabular-nums ${stats.isDebtCleared ? 'text-emerald-300' : 'text-slate-400'}`}>
              {Math.round(percent)}%
            </span>
          </div>
        </div>
        <div className="space-y-1.5 text-sm min-w-0">
          <div>
            Faol biletlaringiz: <b className="text-white tabular-nums">{active} ta</b>
          </div>
          <div className="text-slate-300">
            Barcha faol biletlar: <b className="text-white tabular-nums">{pool} ta</b>
          </div>
          {stats.isDebtCleared && (
            <div className="text-emerald-300">
              Yana 1 bilet bilan: <b className="tabular-nums">{Math.round(nextPercent)}%</b>
            </div>
          )}
        </div>
      </div>

      {everyoneInvited && stats.isDebtCleared && active > 0 && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
          Hozircha faol biletlar {K} tadan kam — har bir faol bilet egasi shouga taklif qilinadi. Bilet qo'shilgan sari
          raqobat oshadi.
        </div>
      )}

      {!stats.isDebtCleared && (
        <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-sm text-rose-100 leading-relaxed">
          ⚠️ Qarzingiz <b>{money(stats.debtAmount)}</b> bo'lgani uchun {stats.tickets} ta biletingiz hozircha
          <b> nofaol</b>. Qarzni yopsangiz, biletlar darhol faollashadi va imkoniyatingiz{' '}
          <b className="text-emerald-300">{Math.round(stats.probIfDebtCleared || 0)}%</b> bo'ladi.
        </div>
      )}
    </section>
  );
};
