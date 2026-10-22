import React from 'react';
import { ClientStats, Language } from '../types';
import { translations } from '../i18n';

interface GrandPrizeBannerProps {
  stats: ClientStats;
  language: Language;
  isLargeText?: boolean;
  onNavigateToLeaderboard: () => void;
}

export const GrandPrizeBanner: React.FC<GrandPrizeBannerProps> = ({
  stats,
  language,
  isLargeText: _isLargeText,
  onNavigateToLeaderboard,
}) => {
  const t = translations[language];

  return (
    <div
      onClick={onNavigateToLeaderboard}
      className="glass-card p-3 sm:p-3.5 rounded-2xl border border-white/10 text-white shadow-xl cursor-pointer active:scale-[0.99] transition-transform space-y-2.5"
      role="button"
      tabIndex={0}
      aria-label="Aksiyaning Bosh Sovrini: Chevrolet DAMAS"
    >
      {/* 2 Main Grand Show Prizes */}
      <div className="grid grid-cols-2 gap-2">
        {/* Prize 1: Chevrolet Damas */}
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-xl p-2.5 border border-amber-400/30 flex items-center gap-2.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0">
            🚗
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-black text-amber-400 block tracking-tight">
              Bosh Sovg'a
            </span>
            <h4 className="text-xs sm:text-sm font-black text-white truncate">
              Chevrolet DAMAS
            </h4>
            <span className="text-[10px] text-slate-300 block truncate">
              Jonli efirda o'ynaladi
            </span>
          </div>
        </div>

        {/* Prize 2: $15,000 Prize Pool */}
        <div className="bg-gradient-to-br from-[#064E3B] to-[#047857] rounded-xl p-2.5 border border-emerald-400/30 flex items-center gap-2.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-2xl shrink-0">
            💰
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-black text-emerald-300 block tracking-tight">
              Yutuq Fondi
            </span>
            <h4 className="text-xs sm:text-sm font-black text-white truncate">
              $15,000 Fond
            </h4>
            <span className="text-[10px] text-emerald-200 block truncate">
              Uskunalar va sovg'alar
            </span>
          </div>
        </div>
      </div>

      {/* Trust & Lottery Notice */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-amber-300 font-bold text-[11px] truncate">
            🎟️ Har $1,000 xarid = 1 ta bilet! DAMAS yutish imkoniyati!
          </span>
        </div>

        <span className="shrink-0 text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1">
          Biletlarim: <strong className="text-amber-400">{stats.tickets} ta</strong> →
        </span>
      </div>
    </div>
  );
};

