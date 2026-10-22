import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Ticket, ClientStats } from '../types';
import { useL, money } from '../i18n/lang';
import { Sheet } from './Sheet';

interface TicketsModalProps {
  isOpen: boolean;
  tickets: Ticket[];
  stats?: ClientStats;
  onClose: () => void;
}

const TicketQR: React.FC<{ ticketNumber: string; active: boolean }> = ({ ticketNumber, active }) => {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let mounted = true;
    const url = `${window.location.origin}${import.meta.env.BASE_URL}verify/${encodeURIComponent(ticketNumber)}`;
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: active ? '#0048C2' : '#9AA7BD', light: '#FFFFFF' } })
      .then((d) => mounted && setDataUrl(d))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [ticketNumber, active]);

  return dataUrl ? (
    <img src={dataUrl} alt={`QR ${ticketNumber}`} className="w-16 h-16 shrink-0 rounded-lg" />
  ) : (
    <div className="w-16 h-16 shrink-0 rounded-lg bg-page animate-pulse" />
  );
};

export const TicketsModal: React.FC<TicketsModalProps> = ({ isOpen, tickets, stats, onClose }) => {
  const L = useL();
  const active = stats ? stats.isDebtCleared : true;

  return (
    <Sheet open={isOpen} onClose={onClose} title={`${L('Biletlarim', 'Мои билеты')} · ${tickets.length}`}>
      <div className="space-y-3">
        <div className={`rounded-2xl p-3.5 text-sm font-semibold ${active ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
          {active
            ? L('Qarz yo\'q — barcha biletlar faol', 'Долгов нет — все билеты активны')
            : L(
                `Qarz ${money(stats?.debtAmount)} — biletlar to'langach faollashadi`,
                `Долг ${money(stats?.debtAmount)} — билеты активируются после оплаты`
              )}
        </div>

        {tickets.length === 0 ? (
          <div className="py-10 text-center text-muted">
            <div className="text-lg font-semibold text-ink">{L('Hozircha bilet yo\'q', 'Пока нет билетов')}</div>
            {L('Har $1,000 to\'lovga 1 ta bilet beriladi', 'За каждые $1,000 — 1 билет')}
          </div>
        ) : (
          tickets.map((ticket, i) => {
            const on = active && ticket.status !== 'pending_debt';
            return (
              <div key={ticket.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <div className={`w-1.5 self-stretch rounded-full ${on ? 'bg-brand' : 'bg-line'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">
                    {L('Bilet', 'Билет')} №{i + 1}
                  </div>
                  <div className="font-mono font-bold break-all">{ticket.ticketNumber}</div>
                  <div className={`text-xs font-semibold ${on ? 'text-ok' : 'text-bad'}`}>
                    {on ? L('Faol', 'Активен') : L('Nofaol (qarz)', 'Неактивен (долг)')}
                  </div>
                </div>
                <TicketQR ticketNumber={ticket.ticketNumber} active={on} />
              </div>
            );
          })
        )}
        <p className="text-xs text-muted text-center">{L('QR-kod orqali har kim biletni tekshira oladi', 'Любой может проверить билет по QR-коду')}</p>
      </div>
    </Sheet>
  );
};
