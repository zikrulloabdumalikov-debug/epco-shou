import React from 'react';
import { ClientStats, PromoConfig } from '../types';
import { useL } from '../i18n/lang';

interface ProbabilityCardProps {
  stats: ClientStats;
  config?: PromoConfig;
}

/** "Batafsil" ichidagi blok: shouga chiqish imkoniyati qanday hisoblanadi */
export const ProbabilityCard: React.FC<ProbabilityCardProps> = ({ stats, config }) => {
  const L = useL();
  const K = config?.totalShowWinners || 30;
  const pool = config?.totalConfirmedTicketsPool || 0;
  const percent = stats.isDebtCleared ? stats.probPercent || 0 : 0;
  const nextPercent = stats.probNextJump?.newProb ?? percent;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-brand-soft)" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={stats.isDebtCleared ? 'var(--color-brand)' : 'var(--color-line)'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0, Math.min(100, percent)) * 0.974} 100`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tabular-nums">{Math.round(percent)}%</div>
        </div>
        <div className="text-[15px] leading-snug">
          <div className="font-bold">{L('Shouga chiqish imkoniyatingiz', 'Ваш шанс попасть на шоу')}</div>
          {stats.isDebtCleared ? (
            <div className="text-muted">
              {L(`Yana 1 bilet bilan — ${Math.round(nextPercent)}%`, `С ещё 1 билетом — ${Math.round(nextPercent)}%`)}
            </div>
          ) : (
            <div className="text-bad">
              {L(
                `Qarz yopilsa — ${Math.round(stats.probIfDebtCleared || 0)}%`,
                `После погашения долга — ${Math.round(stats.probIfDebtCleared || 0)}%`
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-page p-3">
          <div className="text-2xl font-extrabold tabular-nums">{stats.activeTicketsCount || 0}</div>
          <div className="text-xs text-muted">{L('sizning faol biletingiz', 'ваших активных билетов')}</div>
        </div>
        <div className="rounded-2xl bg-page p-3">
          <div className="text-2xl font-extrabold tabular-nums">{pool}</div>
          <div className="text-xs text-muted">{L('jami faol bilet', 'всего активных билетов')}</div>
        </div>
      </div>

      <p className="text-sm text-muted leading-relaxed">
        {L(
          `Oy oxirida barcha faol biletlar orasidan ${K} ta bilet tasodifiy tanlanadi va ularning egalari jonli shouga taklif qilinadi.`,
          `В конце месяца среди всех активных билетов случайно выбирают ${K}, их владельцев приглашают на шоу.`
        )}
        {pool > 0 && pool <= K
          ? ' ' + L(`Hozircha faol biletlar ${K} tadan kam — har bir egasi taklif qilinadi.`, `Сейчас активных билетов меньше ${K} — приглашают каждого.`)
          : ''}
      </p>
    </div>
  );
};
