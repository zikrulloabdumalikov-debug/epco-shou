import React, { useState, useMemo, useEffect } from 'react';
import { ClientStats, PromoConfig } from '../types';
import { simulateAdditionalSpend } from '../utils/probability';
import { triggerHaptic } from '../utils/audio';
import { useL, money } from '../i18n/lang';

interface SimulatorCardProps {
  stats: ClientStats;
  config?: PromoConfig;
}

/** "Batafsil" ichidagi kalkulyator: yana qancha to'lasa nima o'zgaradi */
export const SimulatorCard: React.FC<SimulatorCardProps> = ({ stats, config }) => {
  const L = useL();
  const [amount, setAmount] = useState<number>(stats.gapToNextTicket > 0 ? stats.gapToNextTicket : 500);

  useEffect(() => {
    if (stats.gapToNextTicket > 0) setAmount(stats.gapToNextTicket);
  }, [stats.gapToNextTicket]);

  const result = useMemo(
    () =>
      simulateAdditionalSpend(
        stats.confirmedAmount,
        amount,
        stats.currentRank,
        stats.gapToNextRank,
        stats.gapToTop10,
        stats.gapToFirstPlace,
        config?.totalConfirmedTicketsPool || stats.tickets || 10,
        config?.totalShowWinners || 30,
        stats.activeParticipants || 10,
        config?.thresholds
      ),
    [stats, amount, config]
  );

  const tile = (value: string, label: string, accent?: boolean) => (
    <div className="rounded-2xl bg-page p-3 text-center">
      <div className={`text-xl font-extrabold tabular-nums ${accent ? 'text-brand' : ''}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-bold">{L('Agar yana to\'lasangiz', 'Если оплатите ещё')}</span>
          <span className="text-2xl font-extrabold text-brand tabular-nums">+{money(amount)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="5000"
          step="50"
          value={amount}
          onChange={(e) => {
            setAmount(Number(e.target.value));
            triggerHaptic(10);
          }}
          className="w-full mt-3 accent-[var(--color-brand)] h-2"
          aria-label={L('Qo\'shimcha to\'lov', 'Дополнительная оплата')}
        />
        <div className="flex justify-between text-xs text-muted tabular-nums mt-1">
          <span>$0</span>
          <span>$2,500</span>
          <span>$5,000</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tile(String(result.newTickets), L('jami bilet', 'всего билетов'), result.ticketDelta > 0)}
        {tile(`#${result.estimatedRank}`, L('reytingda', 'в рейтинге'), result.rankDelta > 0)}
        {tile(`${Math.round(result.newMetrics.percent)}%`, L('shouga chiqish', 'шанс на шоу'))}
      </div>

      {!stats.isDebtCleared && (
        <p className="text-sm text-bad">
          {L('Eslatma: qarz yopilmaguncha biletlar shouda qatnashmaydi.', 'Важно: пока долг не погашен, билеты не участвуют в шоу.')}
        </p>
      )}
    </div>
  );
};
