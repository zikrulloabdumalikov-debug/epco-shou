import React from 'react';
import { ClientStats, PromoConfig } from '../types';
import { useL } from '../i18n/lang';

interface GrandPrizeBannerProps {
  stats: ClientStats;
  config: PromoConfig;
  onNavigateToLeaderboard: () => void;
}

export const GrandPrizeBanner: React.FC<GrandPrizeBannerProps> = ({ stats, config, onNavigateToLeaderboard }) => {
  const L = useL();
  const prizes = [
    {
      icon: '🚐',
      title: config.grandPrize || 'Chevrolet DAMAS',
      note: L('Bosh sovg\'a — jonli shouda o\'ynaladi', 'Главный приз — разыгрывается в прямом эфире'),
      tone: 'border-amber-400/30 from-[#0F172A] to-[#1E293B]',
    },
    {
      icon: '🎁',
      title: L('Turli sovg\'alar va pul mukofotlari', 'Подарки и денежные призы'),
      note: L(config.prizesText || '', config.prizesTextRu || config.prizesText || ''),
      tone: 'border-emerald-400/30 from-[#064E3B] to-[#047857]',
    },
  ];

  return (
    <section className="glass-card p-4 rounded-3xl border border-white/10 space-y-3">
      <h3 className="font-black text-white text-base">🎁 {L('Sovg\'alar', 'Призы')}</h3>
      <div className="space-y-2">
        {prizes.map((prize) => (
          <div key={prize.icon} className={`flex items-center gap-3 p-2.5 rounded-2xl border bg-gradient-to-br ${prize.tone}`}>
            <div className="w-11 h-11 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-2xl">{prize.icon}</div>
            <div className="min-w-0">
              <div className="font-black text-white text-sm">{prize.title}</div>
              <div className="text-xs text-slate-300">{prize.note}</div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onNavigateToLeaderboard}
        className="w-full flex items-center justify-between text-sm pt-2 border-t border-white/10 text-slate-300 hover:text-white"
      >
        <span>
          {L('Reytingdagi o\'rningiz:', 'Ваше место в рейтинге:')} <b className="text-amber-400">#{stats.currentRank}</b>
        </span>
        <span className="text-amber-400 font-bold">{L('Ko\'rish →', 'Смотреть →')}</span>
      </button>
    </section>
  );
};
