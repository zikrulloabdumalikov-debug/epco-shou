import React from 'react';
import { PastWinner, Language } from '../types';
import { translations } from '../i18n';

interface WinnersWallModalProps {
  isOpen: boolean;
  winners: PastWinner[];
  language: Language;
  isLargeText?: boolean;
  onClose: () => void;
}

export const WinnersWallModal: React.FC<WinnersWallModalProps> = ({
  isOpen,
  winners,
  language,
  isLargeText,
  onClose,
}) => {
  const t = translations[language];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0D121F] rounded-3xl border border-amber-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-5 max-h-[85vh] flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <h3 className={`font-black ${isLargeText ? 'text-xl' : 'text-lg'}`}>
                {t.pastWinnersTitle}
              </h3>
              <p className="text-[11px] text-white/60">
                Aksiyamizning rasmiy g'olibi bo'lgan ustalar va do'konlar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
          {winners.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/20">
                🎉
              </div>
              <h4 className="text-base font-black text-amber-300">
                Birinchi shou tez orada!
              </h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Birinchi oy tiraji yaqinlashmoqda. Har $1,000 to'lov evaziga 1 ta bilet oling va qarzingizni $0 qilib Damas hamda $15,000 bosh sovrin tirajida qatnashing!
              </p>
            </div>
          ) : (
            winners.map((winner) => (
              <div
                key={winner.id}
                className="glass-card-gold p-3 rounded-2xl border border-[#FFC933]/40 flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-[#FFC933] bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                    {winner.month}
                  </span>
                  <h4 className="font-extrabold text-sm text-white truncate">
                    {winner.winnerName}
                  </h4>
                  <div className="text-[11px] text-emerald-300 font-semibold">
                    🎁 {winner.prize}
                  </div>
                  <div className="text-[10px] text-white/60">
                    {winner.region} · {winner.ticketsHeld} ta bilet bilan yutgan
                  </div>
                </div>

                {/* Video Handover Link */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/20 flex items-center justify-center text-xl shadow">
                    🎬
                  </div>
                  <span className="text-[9px] font-bold text-[#FFC933] underline">
                    Video ko'rish
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-3">
          <button
            onClick={onClose}
            className="w-full min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
