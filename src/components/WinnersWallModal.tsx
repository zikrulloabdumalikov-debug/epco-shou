import React, { useEffect, useState } from 'react';
import { PlayCircle, Trophy, Car, Gift, Ticket, Users } from 'lucide-react';
import { PastWinner, ShowMonth } from '../types';
import { useL, useLanguage, localizeMonth } from '../i18n/lang';
import { Sheet } from './Sheet';

interface WinnersWallModalProps {
  isOpen: boolean;
  winners: PastWinner[];
  show?: ShowMonth[];
  grandPrize?: string;
  onClose: () => void;
}

/** "01 Tashkent" -> "Tashkent" */
const regionName = (r: string) => String(r || '').replace(/^\d+\s*/, '');

export const isGrandPrize = (prize: string, grandPrize?: string) => {
  const p = String(prize || '').toLowerCase();
  return p.includes('damas') || (!!grandPrize && p === grandPrize.toLowerCase());
};

export const WinnersWallModal: React.FC<WinnersWallModalProps> = ({ isOpen, winners, show = [], grandPrize, onClose }) => {
  const L = useL();
  const language = useLanguage();
  const [month, setMonth] = useState(show[0]?.month || '');

  useEffect(() => {
    if (!show.some((m) => m.month === month)) setMonth(show[0]?.month || '');
  }, [show, month]);

  const current = show.find((m) => m.month === month);
  const grand = winners.filter((w) => isGrandPrize(w.prize, grandPrize));
  const others = winners.filter((w) => !isGrandPrize(w.prize, grandPrize));

  const videoButton = (url: string, light = false) => (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn w-full min-h-[44px] ${light ? 'bg-white text-[#FF0033]' : 'bg-[#FF0033] text-white'}`}
    >
      <PlayCircle size={20} />
      {L('Videoni ko\'rish', 'Смотреть видео')}
    </a>
  );

  return (
    <Sheet open={isOpen} onClose={onClose} title={L('G\'oliblar', 'Победители')}>
      {winners.length === 0 && show.length === 0 ? (
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
        <div className="space-y-5">
          {/* ── Bosh sovrin ── */}
          {grand.map((w) => (
            <div key={w.id} className="rounded-3xl bg-gradient-to-br from-[#0064FF] to-[#00308a] p-5 text-white space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="rounded-full bg-white/15 px-2.5 py-1 font-semibold">{localizeMonth(w.month, language)}</span>
                <span className="flex items-center gap-1 font-bold text-[#FFD166]">
                  <Car size={16} /> {L('Bosh sovrin', 'Главный приз')}
                </span>
              </div>
              <div>
                <div className="text-2xl font-extrabold">{w.winnerName}</div>
                <div className="text-white/75">{regionName(w.region)}</div>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2.5">
                <span className="font-bold">🚐 {w.prize}</span>
                {w.ticketCode && <span className="font-mono text-sm text-white/80">{w.ticketCode}</span>}
              </div>
              {w.videoUrl && videoButton(w.videoUrl, true)}
            </div>
          ))}

          {/* ── Boshqa sovg'alar ── */}
          {others.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-bold flex items-center gap-2">
                <Gift size={18} className="text-brand" /> {L('Sovg\'a yutganlar', 'Выиграли подарки')} · {others.length}
              </h3>
              <div className="rounded-2xl border border-line divide-y divide-line">
                {others.map((w) => (
                  <div key={w.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold">{w.winnerName}</div>
                        <div className="text-xs text-muted">
                          {regionName(w.region)} · {localizeMonth(w.month, language)}
                          {w.ticketCode && <span className="font-mono"> · {w.ticketCode}</span>}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-[#8a5a00]">🎁 {w.prize}</span>
                    </div>
                    {w.videoUrl && videoButton(w.videoUrl)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Super o'yin ishtirokchilari ── */}
          {current && (
            <section className="space-y-2">
              <h3 className="font-bold flex items-center gap-2">
                <Users size={18} className="text-brand" /> {L('Super o\'yin ishtirokchilari', 'Участники супер-игры')}
              </h3>
              {show.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {show.map((m) => (
                    <button
                      key={m.month}
                      onClick={() => setMonth(m.month)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                        m.month === month ? 'bg-brand text-white border-brand' : 'bg-surface text-muted border-line'
                      }`}
                    >
                      {localizeMonth(m.monthName, language)}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-brand-soft p-3">
                  <div className="text-xl font-extrabold text-brand-dark tabular-nums">{current.participants.length}</div>
                  <div className="text-xs text-muted">{L('nafar ishtirokchi', 'участников')}</div>
                </div>
                <div className="rounded-2xl bg-gold-soft p-3">
                  <div className="text-xl font-extrabold text-[#8a5a00] tabular-nums">{current.tickets}</div>
                  <div className="text-xs text-muted">{L('ta chipta', 'билетов')}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-line divide-y divide-line">
                {current.participants.map((p) => (
                  <div key={p.n} className={`flex items-center gap-3 px-3 py-2.5 ${p.isMe ? 'bg-brand-soft' : ''}`}>
                    <span className="w-6 text-sm text-muted tabular-nums">{p.n}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">
                        {p.name}
                        {p.isMe && <span className="ml-1.5 rounded-full bg-brand px-2 py-0.5 text-[11px] text-white">{L('Siz', 'Вы')}</span>}
                      </span>
                      <span className="block text-xs text-muted">
                        {regionName(p.region)} · <span className="font-mono">{p.code}</span>
                      </span>
                    </span>
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-gold-soft px-2 py-1 text-xs font-bold text-[#8a5a00] tabular-nums">
                      <Ticket size={13} /> {p.count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
};
