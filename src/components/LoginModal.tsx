import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../i18n';
import { triggerHaptic, playTicketChime } from '../utils/audio';
import { apiService } from '../services/apiService';
import { ADMIN_PHONE, ADMIN_PHONE_RAW } from '../services/mastersDb';

interface LoginModalProps {
  isOpen: boolean;
  language: Language;
  isLargeText?: boolean;
  onLogin: (phone: string, consent: boolean, token?: string) => Promise<void>;
  onClose?: () => void;
}

const DEFAULT_BOT_URL = `https://t.me/${String((import.meta as any).env?.VITE_BOT_USERNAME || 'epcoaksiya_bot').replace('@', '')}`;

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  language,
  isLargeText,
  onLogin,
  onClose,
}) => {
  const t = translations[language];
  const [phoneNumber, setPhoneNumber] = useState('+998');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [botUrl, setBotUrl] = useState(DEFAULT_BOT_URL);

  // Kirish bosqichlari: telefon -> Telegram botdan kelgan 6 xonali kod
  // 'link' — raqam hali botga ulanmagan, 'not_found' — jadvalda yo'q
  const [step, setStep] = useState<'input' | 'code' | 'link' | 'not_found'>('input');

  if (!isOpen) return null;

  // Format phone number with +998 mask
  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (!digits.startsWith('998')) {
      digits = '998' + digits;
    }
    digits = digits.slice(0, 12); // 998 + 9 digits

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

  // 1-Qadam: Telegram bot orqali kod so'rash
  const handleRequestCode = async () => {
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (cleanDigits.length < 12) {
      setErrorMessage('Telefon raqamini to\'liq kiriting (+998 XX XXX-XX-XX).');
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
        setErrorMessage(isNetwork
          ? 'Serverga ulanib bo\'lmadi. Internetni tekshirib, qayta urining.'
          : res.error?.message || 'Kod yuborib bo\'lmadi. Iltimos qayta urining.');
      } else if (status === 'CODE_SENT' || status === 'TOO_SOON') {
        setInfoMessage(res.data?.message || 'Tasdiqlash kodi Telegram botingizga yuborildi.');
        setCode('');
        setStep('code');
        triggerHaptic([30, 40]);
      } else if (status === 'NEED_PHONE_LINK') {
        setBotUrl(res.data?.botUrl || DEFAULT_BOT_URL);
        setStep('link');
      } else if (status === 'NOT_FOUND') {
        setStep('not_found');
        triggerHaptic(50);
      } else {
        setErrorMessage(res.data?.message || 'Kod yuborib bo\'lmadi. Iltimos qayta urining.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Tarmoq xatosi. Iltimos qayta urining.');
    } finally {
      setLoading(false);
    }
  };

  // 2-Qadam: kodni tekshirish va kirish
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
        await onLogin(phoneNumber, consent, res.data.token);
      } else {
        setErrorMessage(res.error?.message || 'Tasdiqlash kodi noto\'g\'ri.');
        triggerHaptic(50);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Kirishda xatolik yuz berdi.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0D121F] rounded-3xl border border-amber-500/35 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-5 sm:p-6 text-white space-y-4">
        {/* Header */}
        <div className="text-center space-y-1.5 relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-0 top-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-400/20 border border-amber-400 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            {step === 'code' ? '🔐' : step === 'link' ? '🤖' : step === 'not_found' ? '⚠️' : '📱'}
          </div>
          <h3 className={`font-black text-white ${isLargeText ? 'text-2xl' : 'text-xl'}`}>
            {step === 'code'
              ? 'Kodni Kiriting'
              : step === 'link'
              ? 'Botga Ulaning'
              : step === 'not_found'
              ? 'Mijoz Topilmadi'
              : 'Tizimga Kirish'}
          </h3>
          <p className="text-xs text-slate-300">
            {step === 'code'
              ? 'Telegram botimiz yuborgan 6 xonali kodni kiriting'
              : step === 'link'
              ? 'Kod olish uchun raqamingizni Telegram botga bir marta ulang'
              : 'Telefon raqamingizni kiriting'}
          </p>
        </div>

        {/* Error / info message */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-medium leading-relaxed text-center">
            {errorMessage}
          </div>
        )}
        {infoMessage && !errorMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs font-medium leading-relaxed text-center">
            {infoMessage}
          </div>
        )}

        {/* 1. TELEFON KIRITISH BOSQICHI */}
        {step === 'input' && (
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Telefon raqamingiz:
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+998 (90) 123-45-67"
                autoFocus
                className="w-full min-h-[48px] px-4 rounded-xl bg-slate-950/90 border border-amber-400/50 text-white font-mono text-lg font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
              />
              <span className="text-[10px] text-slate-400 block">
                Faqat O'zbekiston raqamlari (+998). Kod Telegram botimizga keladi.
              </span>
            </div>

            {/* Privacy consent checkbox */}
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="consentCheck"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-400 focus:ring-0 cursor-pointer accent-amber-400"
              />
              <label htmlFor="consentCheck" className="text-xs text-slate-300 cursor-pointer select-none leading-snug">
                {t.privacyConsent}
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleRequestCode}
              disabled={loading || phoneNumber.replace(/\D/g, '').length < 12}
              className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Kod yuborilmoqda...' : 'Telegram orqali kod olish →'}
            </button>

            {/* Doimiy admin / aloqa raqami */}
            <div className="pt-2 border-t border-white/10 text-center space-y-1">
              <p className="text-[11px] text-slate-400">
                Savollar yoki muammolar bo'yicha administrator:
              </p>
              <a
                href={`tel:${ADMIN_PHONE_RAW}`}
                className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>📞</span>
                <span>{ADMIN_PHONE}</span>
              </a>
            </div>
          </div>
        )}

        {/* 2. TELEGRAMDAN KELGAN KODNI KIRITISH */}
        {step === 'code' && (
          <div className="space-y-3.5">
            <div className="text-center text-xs text-slate-300">
              Raqam: <strong className="font-mono text-white">{phoneNumber}</strong>
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
              className="w-full min-h-[56px] px-4 rounded-xl bg-slate-950/90 border border-amber-400/50 text-white text-center font-mono text-3xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
            />

            <button
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
              className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>✅</span>
              <span>{loading ? 'Tekshirilmoqda...' : 'Tasdiqlash va Kirish →'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRequestCode}
                disabled={loading}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                🔁 Kodni qayta yuborish
              </button>
              <button
                type="button"
                onClick={backToInput}
                disabled={loading}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                ✏️ Raqamni o'zgartirish
              </button>
            </div>
          </div>
        )}

        {/* 3. RAQAM HALI BOTGA ULANMAGAN */}
        {step === 'link' && (
          <div className="space-y-3.5">
            <ol className="p-3 bg-slate-900/90 rounded-2xl border border-amber-400/40 text-xs text-slate-200 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Quyidagi tugma orqali Telegram botimizni oching</li>
              <li><strong>/start</strong> bosing va <strong>«📲 Kontaktni ulashish»</strong> tugmasini bosing</li>
              <li>Shu yerga qaytib, <strong>«Kod yuborish»</strong> ni bosing</li>
            </ol>

            <a
              href={botUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <span>🤖</span>
              <span>Telegram botni ochish</span>
            </a>

            <button
              onClick={handleRequestCode}
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Kod yuborilmoqda...' : 'Ulashdim — Kod yuborish →'}
            </button>

            <button
              type="button"
              onClick={backToInput}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              ✏️ Raqamni o'zgartirish
            </button>
          </div>
        )}

        {/* 4. BAZADA TOPILMAGANDA KO'RSATILADIGAN BLOK */}
        {step === 'not_found' && (
          <div className="space-y-4 p-4 bg-rose-950/40 rounded-2xl border border-rose-500/40 text-center">
            <div className="space-y-1.5">
              <div className="text-base font-black text-rose-300">
                Bunday mijoz bazada topilmadi
              </div>
              <p className="text-xs text-slate-300">
                Kiritilgan raqam: <strong className="font-mono text-white">{phoneNumber}</strong>
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Aksiyada qatnashish, ro'yxatdan o'tish yoki ma'lumotlaringizni jadvalga kiritish uchun administrator bilan bog'laning:
              </p>
            </div>

            {/* Aloqa tugmasi */}
            <a
              href={`tel:${ADMIN_PHONE_RAW}`}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <span>📞</span>
              <span>Administrator: {ADMIN_PHONE}</span>
            </a>

            {/* Qayta urinish */}
            <button
              type="button"
              onClick={backToInput}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              ✏️ Raqamni qayta kiritish
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
