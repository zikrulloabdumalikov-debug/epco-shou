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

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  language,
  isLargeText,
  onLogin,
  onClose,
}) => {
  const t = translations[language];
  const [phoneNumber, setPhoneNumber] = useState('+998 (90) 556-90-60');
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Yangi parolsiz oqim bosqichlari: 'input' | 'confirm' | 'not_found'
  const [step, setStep] = useState<'input' | 'confirm' | 'not_found'>('input');
  const [foundClient, setFoundClient] = useState<{
    clientName: string;
    region: string;
    phoneKey: string;
    phoneFormatted: string;
    token?: string;
  } | null>(null);

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
    }
  };

  // 1-Qadam: Raqamni bazadan tekshirish (OTP siz)
  const handleCheckPhone = async () => {
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (cleanDigits.length < 12) {
      setErrorMessage('Telefon raqamini to\'liq kiriting (+998 XX XXX-XX-XX).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    triggerHaptic(25);

    try {
      const res = await apiService.checkPhone(phoneNumber);
      if (res.found && res.clientName) {
        setFoundClient({
          clientName: res.clientName,
          region: res.region || '01 Tashkent',
          phoneKey: res.phoneKey || cleanDigits.slice(-9),
          phoneFormatted: res.phoneFormatted || phoneNumber,
          token: res.token
        });
        setStep('confirm');
        triggerHaptic([30, 40]);
      } else {
        setStep('not_found');
        triggerHaptic(50);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Tarmoq xatosi. Iltimos qayta urining.');
    } finally {
      setLoading(false);
    }
  };

  // 2-Qadam: "Ha, bu men" tasdiqlanganda to'g'ridan-to'g'ri profilga kirish
  const handleConfirmLogin = async () => {
    if (!foundClient) return;
    setLoading(true);
    triggerHaptic(35);
    playTicketChime();

    try {
      await onLogin(foundClient.phoneFormatted, consent, foundClient.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Kirishda xatolik yuz berdi.');
      setLoading(false);
    }
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
            {step === 'confirm' ? '✅' : step === 'not_found' ? '⚠️' : '📱'}
          </div>
          <h3 className={`font-black text-white ${isLargeText ? 'text-2xl' : 'text-xl'}`}>
            {step === 'confirm'
              ? 'Mijoz Tasdiqlandi'
              : step === 'not_found'
              ? 'Mijoz Topilmadi'
              : 'Tizimga Kirish'}
          </h3>
          <p className="text-xs text-slate-300">
            {step === 'confirm'
              ? 'Profilingizni tasdiqlang va akkauntingizga kiring'
              : 'Telefon raqamingizni kiriting'}
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-medium leading-relaxed text-center">
            {errorMessage}
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
                Faqat O'zbekiston raqamlari (+998)
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
              onClick={handleCheckPhone}
              disabled={loading || phoneNumber.replace(/\D/g, '').length < 12}
              className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Bazadan qidirilmoqda...' : 'Tekshirish va Kirish →'}
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

        {/* 2. MIJOZ TOPILGANDA: "ROSTAN SHU SIZMI?" SAVOLI */}
        {step === 'confirm' && foundClient && (
          <div className="space-y-4 p-4 bg-slate-900/90 rounded-2xl border border-amber-400/50 shadow-inner">
            <div className="space-y-2 text-center">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Bazadagi mijoz ma'lumoti:
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/10 space-y-1">
                <div className="text-lg font-black text-amber-300 break-words">
                  {foundClient.clientName}
                </div>
                <div className="text-xs text-slate-300 flex items-center justify-center gap-2">
                  <span>📍 {foundClient.region}</span>
                  <span>•</span>
                  <span className="font-mono">{foundClient.phoneFormatted}</span>
                </div>
              </div>
            </div>

            {/* Savol */}
            <div className="text-center py-1">
              <p className="text-sm font-black text-white">
                Rostdan ham bu sizmisiz?
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                «Ha» tugmasini bosib o'z akkauntingizga kiring
              </p>
            </div>

            {/* Tasdiqlash tugmalari */}
            <div className="space-y-2">
              <button
                onClick={handleConfirmLogin}
                disabled={loading}
                className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                <span>✅</span>
                <span>{loading ? 'Akkaunt ochilmoqda...' : 'Ha, bu men — Kirish →'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setFoundClient(null);
                }}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                🔄 Yo'q, bu men emas (Boshqa raqam kiritish)
              </button>
            </div>
          </div>
        )}

        {/* 3. BAZADA TOPILMAGANDA KO'RSATILADIGAN BLOK */}
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
              onClick={() => {
                setStep('input');
                setErrorMessage(null);
              }}
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
