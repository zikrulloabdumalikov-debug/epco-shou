import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Ticket, ClientStats } from '../types';
import { useL, money } from '../i18n/lang';

interface TicketsModalProps {
  isOpen: boolean;
  tickets: Ticket[];
  stats?: ClientStats;
  isLargeText?: boolean;
  onClose: () => void;
}

const TicketQR: React.FC<{ ticketNumber: string; active: boolean }> = ({ ticketNumber, active }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const fullUrl = `${window.location.origin}${import.meta.env.BASE_URL}verify/${encodeURIComponent(ticketNumber)}`;
    QRCode.toDataURL(fullUrl, { width: 180, margin: 1, color: { dark: active ? '#06154A' : '#7F1D1D', light: '#FFFFFF' } })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [ticketNumber, active]);

  return (
    <div className="bg-white p-1.5 rounded-xl shrink-0 shadow-md">
      {dataUrl ? (
        <img src={dataUrl} alt={`QR ${ticketNumber}`} className="w-16 h-16 object-contain rounded" />
      ) : (
        <div className="w-16 h-16 bg-slate-200 animate-pulse rounded" />
      )}
    </div>
  );
};

export const TicketsModal: React.FC<TicketsModalProps> = ({ isOpen, tickets, stats, isLargeText, onClose }) => {
  const L = useL();
  if (!isOpen) return null;

  const isDebtCleared = stats ? stats.isDebtCleared : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-md bg-[#0D121F] rounded-3xl border border-amber-500/35 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-5 max-h-[85vh] flex flex-col text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className={`font-black ${isLargeText ? 'text-xl' : 'text-lg'}`}>
              🎟️ {L('Biletlarim', 'Мои билеты')} ({tickets.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              {L('QR-kod orqali har kim biletni tekshira oladi', 'Любой может проверить билет по QR-коду')}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label={L('Yopish', 'Закрыть')}>
            ✕
          </button>
        </div>

        <div className="pt-3">
          {isDebtCleared ? (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-xs text-emerald-200">
              🛡️ <b className="text-emerald-300">{L('Qarz yo\'q — barcha biletlar faol', 'Долгов нет — все билеты активны')}</b>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/70 text-xs text-rose-200 leading-relaxed">
              ⚠️{' '}
              <b className="text-rose-300">
                {L(`Qarz: ${money(stats?.debtAmount)} — biletlar nofaol.`, `Долг: ${money(stats?.debtAmount)} — билеты неактивны.`)}
              </b>{' '}
              {L('Qarz to\'langach biletlar avtomatik faollashadi.', 'После погашения долга билеты активируются автоматически.')}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-white/70 text-sm space-y-1">
              <p>{L('Hozircha biletlaringiz yo\'q.', 'Пока у вас нет билетов.')}</p>
              <p className="text-xs text-[#FFC933]">{L('Har $1,000 to\'lovga 1 ta bilet beriladi', 'За каждые $1,000 оплаты — 1 билет')}</p>
            </div>
          ) : (
            tickets.map((ticket, idx) => {
              const active = isDebtCleared && ticket.status !== 'pending_debt';
              return (
                <div
                  key={ticket.id}
                  className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
                    active
                      ? 'bg-gradient-to-r from-amber-500/20 via-yellow-600/10 to-transparent border-amber-400/50'
                      : 'bg-gradient-to-r from-rose-950/30 via-slate-900/60 to-transparent border-rose-500/40'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {L('Bilet', 'Билет')} #{idx + 1}
                    </span>
                    <div className={`font-mono font-black text-sm tracking-wider break-all ${active ? 'text-amber-300' : 'text-slate-300'}`}>
                      {ticket.ticketNumber}
                    </div>
                    <div
                      className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        active ? 'text-emerald-300 bg-emerald-500/20' : 'text-rose-300 bg-rose-500/20'
                      }`}
                    >
                      {active ? L('✓ Faol', '✓ Активен') : L('⏳ Qarz yopilgach faollashadi', '⏳ Активируется после погашения долга')}
                    </div>
                  </div>
                  <TicketQR ticketNumber={ticket.ticketNumber} active={active} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
