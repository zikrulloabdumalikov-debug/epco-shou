import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Search, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/apiService';
import { useL } from '../i18n/lang';
import epcoLogo from '../assets/brand/epco-logo.png';

interface TicketVerifyPageProps {
  initialTicketNumber?: string;
  onBackToApp?: () => void;
}

interface VerifyResult {
  valid: boolean;
  ticketNumber?: string;
  month?: string;
  status?: string;
  ownerMasked?: string;
  message?: string;
}

/** Ochiq sahifa: QR-kodni skanerlagan har kim biletning haqiqiyligini ko'radi */
export const TicketVerifyPage: React.FC<TicketVerifyPageProps> = ({ initialTicketNumber = '', onBackToApp }) => {
  const L = useL();
  const [ticketNumber, setTicketNumber] = useState(initialTicketNumber);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verify = async (num: string) => {
    const clean = num.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setResult(null);
    const res = await apiService.verifyTicket(clean);
    setLoading(false);
    setResult(
      res.success && res.data
        ? res.data
        : { valid: false, ticketNumber: clean, message: res.error?.message || L('Serverga ulanib bo\'lmadi', 'Не удалось подключиться') }
    );
  };

  useEffect(() => {
    if (initialTicketNumber) verify(initialTicketNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTicketNumber]);

  const row = (label: string, value?: string) =>
    value ? (
      <div className="flex justify-between gap-3 py-2">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-right break-all">{value}</span>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm flex-1 flex flex-col justify-center gap-6 py-8">
        <div className="flex items-center justify-between">
          <img src={epcoLogo} alt="EPCO" className="h-9 w-auto" />
          {onBackToApp && (
            <button onClick={onBackToApp} className="icon-btn w-auto px-3 gap-1">
              <ArrowLeft size={16} /> {L('Ilova', 'Приложение')}
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <h1 className="text-[28px] font-extrabold">{L('Biletni tekshirish', 'Проверка билета')}</h1>
          <p className="text-muted">{L('EPCO Katta Rozig\'ish Shou — rasmiy tekshiruv', 'EPCO Большое шоу — официальная проверка')}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(ticketNumber);
          }}
          className="space-y-3"
        >
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
              placeholder="EPCO-2610-ABC12-001"
              className="field pl-12 font-mono font-semibold uppercase"
            />
          </div>
          <button type="submit" disabled={loading || !ticketNumber.trim()} className="btn btn-primary w-full">
            {loading ? L('Tekshirilmoqda...', 'Проверяем...') : L('Tekshirish', 'Проверить')}
          </button>
        </form>

        {result &&
          (result.valid ? (
            <div className="rounded-3xl bg-ok-soft p-5 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={32} className="text-ok shrink-0" />
                <div>
                  <div className="text-lg font-bold text-ok">{L('Bilet haqiqiy', 'Билет подлинный')}</div>
                  <div className="text-sm text-muted">{result.message}</div>
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 divide-y divide-line text-sm">
                {row(L('Raqam', 'Номер'), result.ticketNumber)}
                {row(L('Oy', 'Месяц'), result.month)}
                {row(L('Egasi', 'Владелец'), result.ownerMasked)}
                {row(L('Holati', 'Статус'), result.status === 'CONFIRMED' ? L('Faol', 'Активен') : L('Nofaol (qarz)', 'Неактивен (долг)'))}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-bad-soft p-5 flex items-center gap-3">
              <XCircle size={32} className="text-bad shrink-0" />
              <div>
                <div className="text-lg font-bold text-bad">{L('Bilet topilmadi', 'Билет не найден')}</div>
                <div className="text-sm text-muted">{result.message}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
