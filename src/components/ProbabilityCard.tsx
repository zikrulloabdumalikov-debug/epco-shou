import React from 'react';
import { ClientStats, PromoConfig } from '../types';
import { useL, money } from '../i18n/lang';

interface ProbabilityCardProps {
  stats: ClientStats;
  config?: PromoConfig;
  isLargeText?: boolean;
}

export const ProbabilityCard: React.FC<ProbabilityCardProps> = ({ stats, config, isLargeText }) => {
  const L = useL();
  const K = config?.totalShowWinners || 30;
  const pool = config?.totalConfirmedTicketsPool || 0;
  const active = stats.activeTicketsCount || 0;
  const percent = stats.isDebtCleared ? stats.probPercent || 0 : 0;
  const nextPercent = stats.probNextJump?.newProb ?? percent;
  const everyoneInvited = pool > 0 && pool <= K;

  return (
    <section className="glass-card p-4 sm:p-5 rounded-3xl border border-white/15 space-y-4">
      <div>
        <h3 className={`font-black text-white ${isLargeText ? 'text-lg' : 'text-base'}`}>
          🎯 {L('Jonli shouga chiqish imkoniyati', 'Шанс попасть на шоу')}
        </h3>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          {L(
            `Oy oxirida barcha faol biletlar orasidan ${K} ta bilet tasodifiy tanlanadi va egalari jonli shouga taklif qilinadi.`,
            `В конце месяца среди всех активных билетов случайно выбирают ${K} билетов — их владельцев приглашают на шоу.`
          )}
        </p>
      </div>

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
            {L('Faol biletlaringiz:', 'Ваши активные билеты:')} <b className="text-white tabular-nums">{active}</b>
          </div>
          <div className="text-slate-300">
            {L('Barcha faol biletlar:', 'Всего активных билетов:')} <b className="text-white tabular-nums">{pool}</b>
          </div>
          {stats.isDebtCleared && (
            <div className="text-emerald-300">
              {L('Yana 1 bilet bilan:', 'С ещё 1 билетом:')} <b className="tabular-nums">{Math.round(nextPercent)}%</b>
            </div>
          )}
        </div>
      </div>

      {everyoneInvited && stats.isDebtCleared && active > 0 && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
          {L(
            `Hozircha faol biletlar ${K} tadan kam — har bir faol bilet egasi shouga taklif qilinadi. Bilet qo'shilgan sari raqobat oshadi.`,
            `Пока активных билетов меньше ${K} — приглашают каждого владельца активного билета. С ростом числа билетов конкуренция растёт.`
          )}
        </div>
      )}

      {!stats.isDebtCleared && (
        <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-sm text-rose-100 leading-relaxed">
          ⚠️{' '}
          {L(
            `Qarzingiz ${money(stats.debtAmount)} bo'lgani uchun ${stats.tickets} ta biletingiz hozircha nofaol. Qarzni yopsangiz, biletlar darhol faollashadi va imkoniyatingiz ${Math.round(stats.probIfDebtCleared || 0)}% bo'ladi.`,
            `Из-за долга ${money(stats.debtAmount)} ваши билеты (${stats.tickets}) пока неактивны. Погасите долг — билеты сразу активируются, и шанс составит ${Math.round(stats.probIfDebtCleared || 0)}%.`
          )}
        </div>
      )}
    </section>
  );
};
