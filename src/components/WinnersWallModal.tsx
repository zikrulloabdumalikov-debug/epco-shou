import React from 'react';
import { PastWinner } from '../types';
import { useL, useLanguage, localizeMonth } from '../i18n/lang';

interface WinnersWallModalProps {
  isOpen: boolean;
  winners: PastWinner[];
  grandPrize?: string;
  isLargeText?: boolean;
  onClose: () => void;
}

export const WinnersWallModal: React.FC<WinnersWallModalProps> = ({ isOpen, winners, grandPrize, isLargeText, onClose }) => {
  const L = useL();
  const language = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0D121F] rounded-3xl border border-amber-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-5 max-h-[85vh] flex flex-col text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className={`font-black ${isLargeText ? 'text-xl' : 'text-lg'}`}>🏅 {L('G\'oliblar', 'Победители')}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label={L('Yopish', 'Закрыть')}>
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
          {winners.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="text-5xl">🎉</div>
              <h4 className="text-base font-black text-amber-300">{L('Birinchi shou tez orada!', 'Первое шоу совсем скоро!')}</h4>
              <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
                {L(
                  `Har $1,000 to'lovga 1 ta bilet oling va qarzingizni yoping — ${grandPrize || 'Chevrolet DAMAS'} va boshqa sovg'alar o'ynaladi.`,
                  `Получайте 1 билет за каждые $1,000 и погасите долг — разыгрываются ${grandPrize || 'Chevrolet DAMAS'} и другие призы.`
                )}
              </p>
            </div>
          ) : (
            winners.map((winner) => (
              <div key={winner.id} className="glass-card-gold p-3 rounded-2xl border border-[#FFC933]/40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold text-[#FFC933] bg-black/40 px-2 py-0.5 rounded-full">
                    {localizeMonth(winner.month, language)}
                  </span>
                  {winner.region && <span className="text-[11px] text-white/60">{winner.region}</span>}
                </div>
                <h4 className="font-extrabold text-base text-white">{winner.winnerName}</h4>
                <div className="text-sm text-emerald-300 font-semibold">🎁 {winner.prize}</div>
                {winner.videoUrl && (
                  <a
                    href={winner.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm"
                  >
                    ▶️ {L('Videoni ko\'rish', 'Смотреть видео')}
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 pt-3">
          <button onClick={onClose} className="w-full min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm">
            {L('Yopish', 'Закрыть')}
          </button>
        </div>
      </div>
    </div>
  );
};
