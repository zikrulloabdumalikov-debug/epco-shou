import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { triggerHaptic, playTicketChime } from '../utils/audio';
import { apiService } from '../services/apiService';
import { ADMIN_PHONE, ADMIN_PHONE_RAW } from '../services/mastersDb';
import { useL, useLanguage, setLanguage } from '../i18n/lang';
import epcoLogo from '../assets/brand/epco-logo.png';

interface LoginModalProps {
  isLargeText?: boolean;
  onLogin: (token: string) => Promise<void>;
}

const DEFAULT_BOT_URL = `https://t.me/${String((import.meta as any).env?.VITE_BOT_USERNAME || 'epcoaksiya_bot').replace('@', '')}`;

/** Kirish: telefon raqami → Telegram botga kelgan 6 xonali kod */
export const LoginModal: React.FC<LoginModalProps> = ({ isLargeText, onLogin }) => {
  const L = useL();
  const language = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [botUrl, setBotUrl] = useState(DEFAULT_BOT_URL);
  // 'link' — raqam hali botga ulanmagan
  const [step, setStep] = useState<'input' | 'code' | 'link'>('input');

  const phoneComplete = phoneNumber.replace(/\D/g, '').length >= 12;

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
    if (!phoneComplete) {
      setErrorMessage(L('Telefon raqamini to\'liq kiriting', 'Введите номер полностью'));
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
        const network = res.error?.code === 'NETWORK_ERROR' || res.error?.code === 'NO_ENDPOINT';
        setErrorMessage(
          network
            ? L('Serverga ulanib bo\'lmadi. Internetni tekshiring.', 'Не удалось подключиться. Проверьте интернет.')
            : res.error?.message || L('Kod yuborib bo\'lmadi.', 'Не удалось отправить код.')
        );
      } else if (status === 'CODE_SENT' || status === 'TOO_SOON') {
        setInfoMessage(
          status === 'TOO_SOON'
            ? L('Kod yaqinda yuborildi — Telegram botni tekshiring.', 'Код недавно отправлен — проверьте бота.')
            : L('Kod Telegram botimizga yuborildi.', 'Код отправлен в Telegram-бот.')
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

  const title = step === 'code' ? L('Kodni kiriting', 'Введите код') : step === 'link' ? L('Botga ulaning', 'Подключите бота') : L('Xush kelibsiz!', 'Добро пожаловать!');
  const subtitle =
    step === 'code'
      ? L('Telegram botimiz yuborgan 6 xonali kod', '6-значный код из нашего Telegram-бота')
      : step === 'link'
      ? L('Kod olish uchun raqamingizni botga bir marta ulang', 'Один раз привяжите номер к боту')
      : L('EPCO Katta Rozig\'ish Shou\'ga kirish uchun telefon raqamingizni kiriting', 'Введите номер телефона, чтобы войти в EPCO Шоу');

  return (
    <div className="min-h-screen w-full bg-surface flex flex-col items-center px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm flex-1 flex flex-col justify-center gap-6 py-8">
        <div className="flex items-center justify-between">
          <img src={epcoLogo} alt="EPCO" className="h-9 w-auto" />
          <button onClick={() => setLanguage(language === 'uz' ? 'ru' : 'uz')} className="icon-btn w-auto px-3">
            {language === 'uz' ? 'Русский' : 'O\'zbekcha'}
          </button>
        </div>

        <div className="space-y-1.5">
          <h1 className={`font-extrabold text-ink ${isLargeText ? 'text-3xl' : 'text-[28px]'}`}>{title}</h1>
          <p className="text-muted">{subtitle}</p>
        </div>

        {errorMessage && <div className="p-3.5 rounded-2xl bg-bad-soft text-bad text-sm font-medium">{errorMessage}</div>}
        {infoMessage && !errorMessage && <div className="p-3.5 rounded-2xl bg-ok-soft text-ok text-sm font-medium">{infoMessage}</div>}

        {step === 'input' && (
          <div className="space-y-3">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
              placeholder="+998 (90) 123-45-67"
              autoFocus
              className="field text-lg font-semibold tracking-wide tabular-nums"
            />
            <button onClick={handleRequestCode} disabled={loading || !phoneComplete} className="btn btn-primary w-full">
              <Send size={18} />
              {loading ? L('Yuborilmoqda...', 'Отправляем...') : L('Telegram orqali kod olish', 'Получить код в Telegram')}
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-3">
            <div className="text-sm text-muted">
              {L('Raqam:', 'Номер:')} <strong className="text-ink tabular-nums">{phoneNumber}</strong>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
              placeholder="••••••"
              autoFocus
              className="field min-h-[64px] text-center text-3xl font-bold tracking-[0.5em] tabular-nums"
            />
            <button onClick={handleVerifyCode} disabled={loading || code.length !== 6} className="btn btn-primary w-full">
              {loading ? L('Tekshirilmoqda...', 'Проверяем...') : L('Kirish', 'Войти')}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleRequestCode} disabled={loading} className="btn btn-soft min-h-[44px] text-sm px-3">
                {L('Qayta yuborish', 'Отправить снова')}
              </button>
              <button onClick={backToInput} disabled={loading} className="btn btn-soft min-h-[44px] text-sm px-3">
                {L('Raqamni o\'zgartirish', 'Изменить номер')}
              </button>
            </div>
          </div>
        )}

        {step === 'link' && (
          <div className="space-y-3">
            <ol className="p-4 rounded-2xl bg-page space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>{L('Telegram botimizni oching', 'Откройте наш Telegram-бот')}</li>
              <li>
                <b>/start</b> → <b>«📲 Kontaktni ulashish»</b>
              </li>
              <li>{L('Shu yerga qaytib, kodni so\'rang', 'Вернитесь и запросите код')}</li>
            </ol>
            <a href={botUrl} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#229ED9] text-white">
              <Send size={18} />
              {L('Telegram botni ochish', 'Открыть Telegram-бот')}
            </a>
            <button onClick={handleRequestCode} disabled={loading} className="btn btn-primary w-full">
              {loading ? L('Yuborilmoqda...', 'Отправляем...') : L('Ulashdim — kod olish', 'Готово — получить код')}
            </button>
            <button onClick={backToInput} disabled={loading} className="btn btn-ghost w-full min-h-[44px] text-sm">
              {L('Raqamni o\'zgartirish', 'Изменить номер')}
            </button>
          </div>
        )}
      </div>

      <div className="pb-4 text-center text-sm text-muted">
        {L('Savollar bo\'yicha:', 'По вопросам:')}{' '}
        <a href={`tel:${ADMIN_PHONE_RAW}`} className="font-bold text-brand">
          {ADMIN_PHONE}
        </a>
      </div>
    </div>
  );
};
