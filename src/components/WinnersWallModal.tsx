import React from 'react';
import { PlayCircle, Trophy } from 'lucide-react';
import { PastWinner } from '../types';
import { useL, useLanguage, localizeMonth } from '../i18n/lang';
import { Sheet } from './Sheet';

interface WinnersWallModalProps {
  isOpen: boolean;
  winners: PastWinner[];
  grandPrize?: string;
  onClose: () => void;
}

export const WinnersWallModal: React.FC<WinnersWallModalProps> = ({ isOpen, winners, grandPrize, onClose }) => {
  const L = useL();
  const language = useLanguage();

  return (
    <Sheet open={isOpen} onClose={onClose} title={L('G\'oliblar', 'Победители')}>
      {winners.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-brand-soft text-brand flex items-center justify-center">
            <Trophy size={26} />
          </div>
          <div className="text-lg font-bold">{L('Birinchi shou tez orada!', 'Первое шоу совсем скоро!')}</div>
          <p className="text-muted max-w-xs mx-auto">
            {L(
              `Qarzingizni yoping va bilet to'plang — ${grandPrize || 'Chevrolet DAMAS'} sizniki bo'lishi mumkin.`,
              `Погасите долг и копите билеты — ${grandPrize || 'Chevrolet DAMAS'} может стать вашим.`
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {winners.map((w) => (
            <div key={w.id} className="rounded-2xl border border-line p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand-dark">{localizeMonth(w.month, language)}</span>
                <span className="text-muted">{w.region}</span>
              </div>
              <div className="text-lg font-bold">{w.winnerName}</div>
              <div className="text-[15px] text-muted">🎁 {w.prize}</div>
              {w.videoUrl && (
                <a href={w.videoUrl} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#FF0033] text-white min-h-[46px]">
                  <PlayCircle size={20} />
                  {L('Videoni ko\'rish', 'Смотреть видео')}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
};
