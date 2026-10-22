import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';
import { playDropSound, triggerHaptic } from '../utils/audio';

interface MascotProps {
  language: Language;
  activeTab: string;
  isLargeText?: boolean;
}

export const MascotUstaMoy: React.FC<MascotProps> = ({
  language,
  activeTab,
  isLargeText,
}) => {
  const t = translations[language];
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string>('greeting');

  // Blinking eyes animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Listen to interactive button clicks throughout the entire app
  useEffect(() => {
    const handleSpeakEvent = (e: CustomEvent<{ topic: string; text?: string }>) => {
      const topic = e.detail?.topic || 'general';
      setActiveTopic(topic);

      if (e.detail?.text) {
        setCurrentMessage(e.detail.text);
      } else {
        switch (topic) {
          case 'kanistra':
          case 'ticket':
            setCurrentMessage(
              "Usta! Har $1,000 to'lov uchun 1 ta bilet olasiz. Biletlaringiz Damas o'yinida qatnashishi uchun qarzingiz $0 bo'lishi shart!"
            );
            break;
          case 'debt_cleared':
            setCurrentMessage(
              "Ajoyib! Sizda qarz yo'q ($0). Barcha biletlaringiz to'liq AKTUAL va Damas o'yinida qatnashishga tayyor!"
            );
            break;
          case 'debt_warning':
            setCurrentMessage(
              "Diqqat usta! Hisobingizda qarz bor. Qarz $0 qilib yopilmaguncha biletlar 'Kutilmoqda' holatida turadi va tirajga qo'yilmaydi!"
            );
            break;
          case 'simulator':
            setCurrentMessage(
              "Slayderni suring! Necha pul bersangiz qancha yangi bilet va reytingdagi yangi o'rningizni darhol hisoblab beraman!"
            );
            break;
          case 'sheets':
            setCurrentMessage(
              "Barcha hisob-kitoblar va biletlar to'g'ridan-to'g'ri EPCO Google Sheets jadvalidan olinadi va real vaqtda hisoblanadi!"
            );
            break;
          case 'leaderboard':
            setCurrentMessage(
              "Reytingda faqat tasdiqlangan to'lovlar hisobga olinadi. Top-30 usta jonli efir shousiga yo'llanma oladi!"
            );
            break;
          case 'login':
            setCurrentMessage(
              "Xush kelibsiz! Telegram orqali o'z raqamingizni tasdiqlang va shaxsiy biletlaringizni tekshiring!"
            );
            break;
          default:
            setCurrentMessage(
              "Salom usta! Men Usta Moyman. Har qanday tugmani bosing, sizga qoidalar va holatingizni tushuntirib boraman!"
            );
        }
      }

      setIsOpen(true);
      playDropSound();
      triggerHaptic(20);
    };

    window.addEventListener('usta-moy-speak' as any, handleSpeakEvent);
    return () => {
      window.removeEventListener('usta-moy-speak' as any, handleSpeakEvent);
    };
  }, []);

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentMessage(
        "Assalomu alaykum usta! Har $1,000 to'lovga 1 ta bilet beriladi. Qarzingizni $0 qilsangiz, biletlaringiz AKTUAL bo'ladi!"
      );
      setIsOpen(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleTap = () => {
    playDropSound();
    triggerHaptic(25);
    const messages = [
      "Har $1,000 to'lov = 1 ta bilet! Biletlar tirajda qatnashishi uchun qarzingiz $0 bo'lishi shart!",
      "Google Sheets jadvalidan ma'lumotlar avtomatik sinxronlanadi!",
      "Oy oxirida qoldiq summangiz kuyib ketmasin, $1,000 ga to'ldirib oling!",
      "Jonli efirda 🚗 Chevrolet DAMAS va $15,000 lik sovg'alar o'ynaladi!",
      "Qarzingizni yopsangiz, barcha biletlaringiz darhol 'Faol' (Aktual) bo'ladi!"
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    setCurrentMessage(randomMsg);
    setIsOpen(!isOpen);
  };

  const handleTopicChip = (topic: string) => {
    triggerHaptic(15);
    window.dispatchEvent(new CustomEvent('usta-moy-speak', { detail: { topic } }));
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Mascot Avatar Button */}
      <button
        onClick={handleTap}
        className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.25)]"
        aria-label="Usta Moy maslahatchisi"
        title="Usta Moy bilan suhbat"
      >
        {/* Animated Usta Moy Icon */}
        <div className="relative w-7 h-7 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow">
            {/* Canister / Drop stylized body */}
            <defs>
              <linearGradient id="mascotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
            </defs>
            <path
              d="M 50 12 C 50 12 18 52 18 72 C 18 90 32 95 50 95 C 68 95 82 90 82 72 C 82 52 50 12 50 12 Z"
              fill="url(#mascotGrad)"
              stroke="#FFF"
              strokeWidth="3"
            />
            {/* Wrench in hand */}
            <path
              d="M 22 55 L 12 45 L 8 49 L 14 58 Z"
              fill="#E2E8F0"
              stroke="#0F172A"
              strokeWidth="2"
            />
            {/* Cap */}
            <path
              d="M 32 32 C 38 22 62 22 68 32 C 76 34 82 38 84 44 L 16 44 C 18 38 24 34 32 32 Z"
              fill="#1E3A8A"
            />
            {/* Eyes */}
            {!isBlinking ? (
              <>
                <circle cx="42" cy="54" r="5" fill="#0F172A" />
                <circle cx="40" cy="52" r="2" fill="#FFF" />
                <circle cx="58" cy="54" r="5" fill="#0F172A" />
                <circle cx="56" cy="52" r="2" fill="#FFF" />
              </>
            ) : (
              <>
                <line x1="37" y1="54" x2="47" y2="54" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                <line x1="53" y1="54" x2="63" y2="54" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
              </>
            )}
            {/* Friendly Smile */}
            <path
              d="M 42 66 Q 50 74 58 66"
              fill="none"
              stroke="#0F172A"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <span className="text-xs font-black text-amber-300 hidden sm:inline tracking-tight">
          Usta Moy
        </span>
        <span className="text-[10px] text-amber-400 font-bold bg-black/60 px-1.5 py-0.5 rounded-full border border-amber-400/40">
          Maslahat
        </span>
      </button>

      {/* Speech Bubble: Opens safely DOWNWARD inside the screen (Never clips off the top!) */}
      {isOpen && currentMessage && (
        <div
          className={`absolute top-full right-0 sm:right-auto sm:left-0 mt-2.5 w-72 sm:w-80 p-3.5 rounded-2xl bg-[#0D1322] text-white shadow-[0_12px_40px_rgba(0,0,0,0.95)] z-50 border border-amber-400/60 animate-in fade-in slide-in-from-top-2 duration-200 ${
            isLargeText ? 'text-sm' : 'text-xs'
          }`}
        >
          {/* Top arrow pointer */}
          <div className="absolute -top-2 right-6 sm:right-auto sm:left-6 w-3.5 h-3.5 bg-[#0D1322] border-t border-l border-amber-400/60 rotate-45" />

          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🛢️</span>
              <span className="font-black text-amber-300 text-xs tracking-wide">
                Usta Moy maslahati:
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 text-xs"
              aria-label="Yopish"
            >
              ✕
            </button>
          </div>

          {/* Message Text */}
          <p className="text-slate-100 leading-relaxed font-medium relative z-10">
            {currentMessage}
          </p>

          {/* Quick Interactive Topic Chips */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1 relative z-10">
            <button
              onClick={() => handleTopicChip('ticket')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 cursor-pointer"
            >
              🎟️ Bilet qoidasi
            </button>
            <button
              onClick={() => handleTopicChip('debt_warning')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 cursor-pointer"
            >
              💳 Qarz sharti
            </button>
            <button
              onClick={() => handleTopicChip('sheets')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 cursor-pointer"
            >
              📊 Google Sheets
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
