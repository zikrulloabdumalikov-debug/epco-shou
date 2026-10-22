import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Ticket, Language, ClientStats } from '../types';
import { translations } from '../i18n';

interface TicketsModalProps {
  isOpen: boolean;
  tickets: Ticket[];
  stats?: ClientStats;
  language: Language;
  isLargeText?: boolean;
  onClose: () => void;
}

const TicketQR: React.FC<{ qrUrl: string; ticketNumber: string; active: boolean }> = ({
  qrUrl,
  ticketNumber,
  active,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = qrUrl.startsWith('http') ? qrUrl : `${origin}${import.meta.env.BASE_URL}verify/${encodeURIComponent(ticketNumber)}`;

    QRCode.toDataURL(fullUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: active ? '#06154A' : '#7F1D1D',
        light: '#FFFFFF',
      },
    })
      .then((res) => {
        if (isMounted) setDataUrl(res);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [qrUrl, ticketNumber, active]);

  return (
    <div className="flex flex-col items-center bg-white p-1.5 rounded-xl shrink-0 shadow-md">
      {dataUrl ? (
        <img src={dataUrl} alt={`QR ${ticketNumber}`} className="w-14 h-14 object-contain rounded" />
      ) : (
        <div className="w-14 h-14 bg-slate-200 animate-pulse rounded" />
      )}
      <span className="text-[7.5px] font-bold text-slate-800 mt-0.5">
        {active ? 'QR Tasdiq' : 'Qarz Blok'}
      </span>
    </div>
  );
};

export const TicketsModal: React.FC<TicketsModalProps> = ({
  isOpen,
  tickets,
  stats,
  language,
  isLargeText,
  onClose,
}) => {
  const t = translations[language];

  if (!isOpen) return null;

  const isDebtCleared = stats ? stats.isDebtCleared : true;
  const debtAmount = stats ? stats.debtAmount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0D121F] rounded-3xl border border-amber-500/35 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-5 max-h-[85vh] flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎟️</span>
            <div>
              <h3 className={`font-black ${isLargeText ? 'text-xl' : 'text-lg'}`}>
                {t.ticketsBtn} ({tickets.length} ta)
              </h3>
              <p className="text-[11px] text-slate-400">
                Jonli shou uchun rasmiy tasdiqlangan biletlar
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

        {/* Debt Status Warning / Success in Tickets View */}
        <div className="pt-3">
          {isDebtCleared ? (
            <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-200">
              <span className="text-lg">🛡️</span>
              <div className="min-w-0">
                <span className="font-extrabold block text-emerald-300">
                  Qarz yo'q ($0) — Barcha biletlar AKTUAL!
                </span>
                <span className="text-[10px] text-emerald-200/80 block">
                  Barcha {tickets.length} ta biletingiz Damas va $15,000 bosh sovrin o'yinida to'liq qatnashadi.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/70 flex items-center gap-2 text-xs text-rose-200 animate-pulse">
              <span className="text-lg">⚠️</span>
              <div className="min-w-0">
                <span className="font-extrabold block text-rose-300">
                  Diqqat: Qarz ${debtAmount} mavjud (Biletlar nofaol)
                </span>
                <span className="text-[10px] text-rose-200/90 block leading-tight">
                  Aksiya qoidasiga ko'ra, tirajda qatnashish uchun qarzingizni $0 qilish shart. Qarz to'langach biletlar avtomatik faollashadi!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-white/60 text-xs">
              <p>Hozircha hisobingizda biletlar mavjud emas.</p>
              <p className="mt-1 text-[11px] text-[#FFC933]">
                Har $1,000 to'langan summaga 1 ta bilet taqdim etiladi!
              </p>
            </div>
          ) : (
            tickets.map((ticket, idx) => {
              const active = isDebtCleared && ticket.status !== 'pending_debt';
              return (
                <div
                  key={ticket.id}
                  className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg transition-all ${
                    active
                      ? 'bg-gradient-to-r from-amber-500/20 via-yellow-600/15 to-transparent border-amber-400/50'
                      : 'bg-gradient-to-r from-rose-950/30 via-slate-900/60 to-transparent border-rose-500/40 opacity-85'
                  }`}
                >
                  {/* Status Ribbon */}
                  <div
                    className={`absolute top-0 right-0 font-black text-[9px] px-2.5 py-0.5 rounded-bl-xl uppercase tracking-wider ${
                      active ? 'bg-amber-400 text-black' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {active ? `Bilet #${idx + 1}` : `Kutilmoqda #${idx + 1}`}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {t.ticketNumber}
                      </span>
                      <div className={`font-mono font-black text-base tracking-wider ${active ? 'text-amber-300' : 'text-slate-300'}`}>
                        {ticket.ticketNumber}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Sana: {ticket.dateIssued}
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 ${
                          active
                            ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40'
                            : 'text-rose-300 bg-rose-500/20 border border-rose-500/40'
                        }`}
                      >
                        {active ? '✓ AKTUAL · Tirajga tasdiqlangan' : '⏳ KUTILMOQDA · Qarz yopilgach faollashadi'}
                      </div>
                    </div>

                    {/* Real QR Code using qrcode npm package */}
                    <TicketQR
                      qrUrl={ticket.qrCodeUrl || `/verify/${ticket.ticketNumber}`}
                      ticketNumber={ticket.ticketNumber}
                      active={active}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
