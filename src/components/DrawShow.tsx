import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';
import { playTicketChime, playTap } from '../utils/audio';
import epcoLogo from '../assets/brand/epco-logo.png';

export interface DrawWinner {
  n: number;
  ticket: string;
  name: string;
  region: string;
  phone?: string;
  agent?: string;
}

interface DrawShowProps {
  monthName: string;
  winners: DrawWinner[];
  onClose: () => void;
}

/**
 * Jonli efir ekrani uchun: g'oliblar biletlari baraban aylangandek birma-bir ochiladi.
 * Natija serverda allaqachon tanlangan — bu faqat ko'rsatish.
 */
export const DrawShow: React.FC<DrawShowProps> = ({ monthName, winners, onClose }) => {
  const [revealed, setRevealed] = useState(0);
  const [rolling, setRolling] = useState('');
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    if (paused || revealed >= winners.length) return;
    // Baraban: 1.2 soniya davomida tasodifiy bilet raqamlari aylanadi, keyin haqiqiysi ochiladi
    const roll = setInterval(() => {
      const random = winners[Math.floor(Math.random() * winners.length)];
      setRolling(random.ticket);
      playTap();
    }, 90);
    const stop = setTimeout(() => {
      clearInterval(roll);
      setRolling('');
      setRevealed((r) => r + 1);
      playTicketChime();
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.3 }, colors: ['#0064FF', '#FFFFFF', '#F5A300'] });
    }, 1200);
    return () => {
      clearInterval(roll);
      clearTimeout(stop);
    };
  }, [paused, revealed, winners]);

  const current = revealed > 0 ? winners[revealed - 1] : null;
  const done = revealed >= winners.length;

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-b from-[#0064FF] to-[#00308a] text-white flex flex-col">
      <div className="flex items-center justify-between p-4">
        <div className="bg-white rounded-xl px-3 py-1.5">
          <img src={epcoLogo} alt="EPCO" className="h-6 w-auto" />
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center" aria-label="Yopish">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-sm uppercase tracking-[0.3em] text-white/70">{monthName} · Jonli shou</div>
        <div className="mt-2 text-lg text-white/80">
          {revealed} / {winners.length}
        </div>

        <div className="mt-6 min-h-[180px] flex flex-col items-center justify-center">
          {rolling ? (
            <div className="font-mono text-3xl sm:text-5xl font-bold opacity-70 tabular-nums">{rolling}</div>
          ) : current ? (
            <>
              <div className="font-mono text-3xl sm:text-5xl font-extrabold tabular-nums">{current.ticket}</div>
              <div className="mt-4 text-3xl sm:text-5xl font-extrabold">{current.name}</div>
              <div className="mt-2 text-xl text-white/80">{current.region}</div>
            </>
          ) : (
            <div className="text-2xl font-bold text-white/80">{winners.length} ta omadli bilet</div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          {!done && (
            <button onClick={() => setPaused(!paused)} className="btn bg-white text-brand min-w-[180px]">
              {paused ? (revealed === 0 ? '▶️ Boshlash' : '▶️ Davom etish') : '⏸ To\'xtatish'}
            </button>
          )}
          {!done && (
            <button onClick={() => setRevealed(winners.length)} className="btn bg-white/15 text-white">
              Hammasini ko'rsatish
            </button>
          )}
        </div>
      </div>

      {revealed > 0 && (
        <div className="max-h-[35vh] overflow-y-auto bg-black/20 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {winners.slice(0, revealed).map((w) => (
            <div key={w.n} className="flex justify-between gap-3">
              <span className="truncate">
                {w.n}. {w.name} <span className="text-white/60">· {w.region}</span>
              </span>
              <span className="font-mono text-white/80">{w.ticket}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
