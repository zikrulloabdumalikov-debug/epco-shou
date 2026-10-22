import React from 'react';
import { ClientStats, Language } from '../types';

interface GrandPrizeBannerProps {
  stats: ClientStats;
  language: Language;
  isLargeText?: boolean;
  onNavigateToLeaderboard: () => void;
}

const PRIZES = [
  { icon: '🚐', title: 'Chevrolet DAMAS', note: 'Bosh sovg\'a — jonli shouda', tone: 'border-amber-400/30 from-[#0F172A] to-[#1E293B]' },
  { icon: '📱', title: 'iPhone 18 Pro Max', note: 'Har oy qarzsiz 1-o\'ringa', tone: 'border-sky-400/30 from-[#0B1730] to-[#13284D]' },
  { icon: '💰', title: '$15,000 fond', note: 'Uskuna va sovg\'alar', tone: 'border-emerald-400/30 from-[#064E3B] to-[#047857]' },
];

export const GrandPrizeBanner: React.FC<GrandPrizeBannerProps> = ({ stats, onNavigateToLeaderboard }) => {
  return (
    <section className="glass-card p-4 rounded-3xl border border-white/10 space-y-3">
      <h3 className="font-black text-white text-base">🎁 Sovg'alar</h3>
      <div className="space-y-2">
        {PRIZES.map((prize) => (
          <div
            key={prize.title}
            className={`flex items-center gap-3 p-2.5 rounded-2xl border bg-gradient-to-br ${prize.tone}`}
          >
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
        <span>Reytingdagi o'rningiz: <b className="text-amber-400">#{stats.currentRank}</b></span>
        <span className="text-amber-400 font-bold">Ko'rish →</span>
      </button>
    </section>
  );
};
