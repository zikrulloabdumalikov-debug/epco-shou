import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { CheckCircle2, XCircle, Search, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useL } from '../i18n/lang';

interface TicketVerifyPageProps {
  initialTicketNumber?: string;
  onBackToApp?: () => void;
}

export const TicketVerifyPage: React.FC<TicketVerifyPageProps> = ({
  initialTicketNumber = '',
  onBackToApp,
}) => {
  const L = useL();
  const [ticketNumber, setTicketNumber] = useState(initialTicketNumber);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    ticketNumber?: string;
    month?: string;
    status?: string;
    ownerMasked?: string;
    message?: string;
  } | null>(null);

  const doVerify = async (num: string) => {
    const clean = num.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiService.verifyTicket(clean);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setResult({
          valid: false,
          ticketNumber: clean,
          message: res.error?.message || L('Bilet topilmadi', 'Билет не найден')
        });
      }
    } catch (err: any) {
      setResult({
        valid: false,
        ticketNumber: clean,
        message: err.message || L("Serverga ulanib bo'lmadi", 'Не удалось подключиться к серверу')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTicketNumber) {
      doVerify(initialTicketNumber);
    }
  }, [initialTicketNumber]);

  return (
    <div className="min-h-screen bg-[#06154A] text-white flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0D183A]/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative backdrop-blur-xl">
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {L('Ilovaga qaytish', 'Вернуться в приложение')}
          </button>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {L('Biletni tekshirish', 'Проверка билета')}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            {L("EPCO Katta Rozig'ish Shou — rasmiy bilet tekshiruvi",'EPCO Большое шоу — официальная проверка билетов')}
          </p>
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            doVerify(ticketNumber);
          }}
          className="space-y-3"
        >
          <div className="relative">
            <input
              type="text"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
              placeholder="EPCO-2610-ABC12-001"
              className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-[#081028] border border-white/15 focus:border-amber-400 text-white font-mono tracking-wider placeholder:text-slate-500 outline-none text-sm font-bold uppercase transition-all"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="submit"
            disabled={loading || !ticketNumber.trim()}
            className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            {loading ? L('Tekshirilmoqda...', 'Проверяем...') : L('Tekshirish', 'Проверить')}
          </button>
        </form>

        {/* Verification Result */}
        {result && (
          <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in duration-300">
            {result.valid ? (
              <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-4 text-emerald-100 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="font-black text-emerald-300 text-base">
                      {L('Bilet haqiqiy!', 'Билет подлинный!')}
                    </h3>
                    <p className="text-[11px] text-emerald-200/80">
                      {result.message}
                    </p>
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-3 font-mono text-xs space-y-1.5 border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{L('Bilet raqami:', 'Номер билета:')}</span>
                    <span className="font-bold text-amber-300">{result.ticketNumber}</span>
                  </div>
                  {result.month && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{L('Oy:', 'Месяц:')}</span>
                      <span className="text-white font-medium">{result.month}</span>
                    </div>
                  )}
                  {result.ownerMasked && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{L('Egasi:', 'Владелец:')}</span>
                      <span className="text-white font-medium">{result.ownerMasked}</span>
                    </div>
                  )}
                  {result.status && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{L('Holati:', 'Статус:')}</span>
                      <span className="font-bold text-emerald-400 uppercase">
                        {result.status === 'CONFIRMED' ? L('✓ Faol', '✓ Активен') : L('⏳ Nofaol (qarz)', '⏳ Неактивен (долг)')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-4 text-rose-100 space-y-2">
                <div className="flex items-center gap-3">
                  <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
                  <div>
                    <h3 className="font-black text-rose-300 text-base">
                      {L('Bilet topilmadi', 'Билет не найден')}
                    </h3>
                    <p className="text-[11px] text-rose-200/80">
                      {result.message || L('Bunday bilet topilmadi', 'Такой билет не найден')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
