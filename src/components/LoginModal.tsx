import React, { useState } from 'react';
import { triggerHaptic, playTicketChime } from '../utils/audio';
import { apiService } from '../services/apiService';
import { ADMIN_PHONE, ADMIN_PHONE_RAW } from '../services/mastersDb';
import { useL, useLanguage, setLanguage } from '../i18n/lang';

interface LoginModalProps {
  isOpen: boolean;
  isLargeText?: boolean;
  onLogin: (token: string) => Promise<void>;
}

const DEFAULT_BOT_URL = `https://t.me/${String((import.meta as any).env?.VITE_BOT_USERNAME || 'epcoaksiya_bot').replace('@', '')}`;

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, isLargeText, onLogin }) => {
  const L = useL();
  const language = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [botUrl, setBotUrl] = useState(DEFAULT_BOT_URL);

  // Kirish bosqichlari: telefon -> Telegram botdan kelgan 6 xonali kod; 'link' — raqam hali botga ulanmagan
  const [step, setStep] = useState<'input' | 'code' | 'link'>('input');

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (!digits.startsWith('998')) digits = '998' + digits;
    digits = digits.slice(0, 12);

    let formatted = '+998';
    if (digits.length > 3) formatted += ' (' + digits.substring(3, 5);
    if (digits.length >= 5) formatted += ') ' + digits.substring(5, 8);
    if (digits.length >= 8) formatted += '-' + digits.substring(8, 10);
    if (digits.length >= 10) formatted += '-' + digits.substring(10, 12);

    setPhoneNumber(formatted);
    if (step !== 'input') {
      setStep('input');
      setErrorMessage(null);
      setInfoMessage(null);
    }
  };

  const handleRequestCode = async () => {
    if (phoneNumber.replace(/\D/g, '').length < 12) {
      setErrorMessage(L('Telefon raqamini to\'liq kiriting', 'Введите номер телефона полностью'));
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    triggerHaptic(25);

    try {
      const res = await apiService.requestCode(phoneNumber);
      const status = res.data?.status;
      if (!res.success || !status) {
        const isNetwork = res.error?.code === 'NETWORK_ERROR' || res.error?.code === 'NO_ENDPOINT';
        setErrorMessage(
          isNetwork
            ? L('Serverga ulanib bo\'lmadi. Internetni tekshirib, qayta urining.', 'Не удалось подключиться. Проверьте интернет и попробуйте снова.')
            : res.error?.message || L('Kod yuborib bo\'lmadi.', 'Не удалось отправить код.')
        );
      } else if (status === 'CODE_SENT' || status === 'TOO_SOON') {
        setInfoMessage(
          status === 'TOO_SOON'
            ? L('Kod yaqinda yuborildi — Telegram botni tekshiring.', 'Код недавно отправлен — проверьте Telegram-бот.')
            : L('Kod Telegram botimizga yuborildi.', 'Код отправлен в наш Telegram-бот.')
        );
        setCode('');
        setStep('code');
        triggerHaptic([30, 40]);
      } else if (status === 'NEED_PHONE_LINK') {
        setBotUrl(res.data?.botUrl || DEFAULT_BOT_URL);
        setStep('link');
      } else {
        setErrorMessage(res.data?.message || L('Kod yuborib bo\'lmadi.', 'Не удалось отправить код.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setErrorMessage(null);
    triggerHaptic(35);
    try {
      const res = await apiService.verifyCode(phoneNumber, code);
      if (res.success && res.data?.token) {
        playTicketChime();
        setStep('input');
        setCode('');
        setInfoMessage(null);
        await onLogin(res.data.token);
      } else {
        setErrorMessage(res.error?.message || L('Kod noto\'g\'ri', 'Неверный код'));
        triggerHaptic(50);
      }
    } finally {
      setLoading(false);
    }
  };

  const backToInput = () => {
    setStep('input');
    setCode('');
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const primaryBtn =
    'w-full min-h-[50px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform disabled:opacity-50';
  const secondaryBtn = 'py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold text-xs disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-md bg-[#0D121F] rounded-3xl border border-amber-500/35 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-5 sm:p-6 text-white space-y-4">
        <div className="flex justify-end -mb-2">
          <button
            onClick={() => setLanguage(language === 'uz' ? 'ru' : 'uz')}
            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15"
          >
            {language === 'uz' ? 'Русский' : 'O\'zbekcha'}
          </button>
        </div>

        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center text-2xl">
            {step === 'code' ? '🔐' : step === 'link' ? '🤖' : '📱'}
          </div>
          <h3 className={`font-black ${isLargeText ? 'text-2xl' : 'text-xl'}`}>
            {step === 'code' ? L('Kodni kiriting', 'Введите код') : step === 'link' ? L('Botga ulaning', 'Подключите бота') : L('Tizimga kirish', 'Вход')}
          </h3>
          <p className="text-xs text-slate-300">
            {step === 'code'
              ? L('Telegram botimiz yuborgan 6 xonali kod', '6-значный код из нашего Telegram-бота')
              : step === 'link'
              ? L('Kod olish uchun raqamingizni botga bir marta ulang', 'Один раз привяжите номер к боту, чтобы получать код')
              : L('Telefon raqamingizni kiriting', 'Введите номер телефона')}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-medium text-center">{errorMessage}</div>
        )}
        {infoMessage && !errorMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs font-medium text-center">{infoMessage}</div>
        )}

        {step === 'input' && (
          <div className="space-y-3.5">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+998 (90) 123-45-67"
              autoFocus
              className="w-full min-h-[52px] px-4 rounded-xl bg-slate-950/90 border border-amber-400/50 text-white font-mono text-lg font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-[11px] text-slate-400">{L('Kod Telegram botimizga keladi.', 'Код придёт в наш Telegram-бот.')}</p>
            <button onClick={handleRequestCode} disabled={loading || phoneNumber.replace(/\D/g, '').length < 12} className={primaryBtn}>
              {loading ? L('Yuborilmoqda...', 'Отправляем...') : L('Telegram orqali kod olish →', 'Получить код в Telegram →')}
            </button>
            <div className="pt-2 border-t border-white/10 text-center space-y-1">
              <p className="text-[11px] text-slate-400">{L('Savollar bo\'yicha:', 'По вопросам:')}</p>
              <a href={`tel:${ADMIN_PHONE_RAW}`} className="text-sm font-black text-amber-400">📞 {ADMIN_PHONE}</a>
            </div>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-3.5">
            <div className="text-center text-xs text-slate-300">
              {L('Raqam:', 'Номер:')} <strong className="font-mono text-white">{phoneNumber}</strong>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerifyCode();
              }}
              placeholder="••••••"
              autoFocus
              className="w-full min-h-[56px] px-4 rounded-xl bg-slate-950/90 border border-amber-400/50 text-white text-center font-mono text-3xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button onClick={handleVerifyCode} disabled={loading || code.length !== 6} className={primaryBtn}>
              {loading ? L('Tekshirilmoqda...', 'Проверяем...') : L('Kirish →', 'Войти →')}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={handleRequestCode} disabled={loading} className={secondaryBtn}>
                🔁 {L('Qayta yuborish', 'Отправить снова')}
              </button>
              <button type="button" onClick={backToInput} disabled={loading} className={secondaryBtn}>
                ✏️ {L('Raqamni o\'zgartirish', 'Изменить номер')}
              </button>
            </div>
          </div>
        )}

        {step === 'link' && (
          <div className="space-y-3.5">
            <ol className="p-3 bg-slate-900/90 rounded-2xl border border-amber-400/40 text-sm text-slate-200 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>{L('Telegram botimizni oching', 'Откройте наш Telegram-бот')}</li>
              <li>
                <b>/start</b> → <b>«📲 Kontaktni ulashish»</b>
              </li>
              <li>{L('Shu yerga qaytib «Kod olish» ni bosing', 'Вернитесь сюда и нажмите «Получить код»')}</li>
            </ol>
            <a
              href={botUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-sm flex items-center justify-center gap-2"
            >
              🤖 {L('Telegram botni ochish', 'Открыть Telegram-бот')}
            </a>
            <button onClick={handleRequestCode} disabled={loading} className={primaryBtn}>
              {loading ? L('Yuborilmoqda...', 'Отправляем...') : L('Ulashdim — Kod olish →', 'Готово — получить код →')}
            </button>
            <button type="button" onClick={backToInput} disabled={loading} className={`w-full ${secondaryBtn}`}>
              ✏️ {L('Raqamni o\'zgartirish', 'Изменить номер')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
