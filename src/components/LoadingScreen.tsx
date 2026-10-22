import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/lang';
import epcoMark from '../assets/brand/epco-mark.png';

const MESSAGES_UZ = [
  'Ustalar ro\'yxati ochilmoqda...',
  'Biletlaringiz sanalmoqda...',
  'Mijozlar ko\'p — navbatingiz kelmoqda...',
  'Reyting yangilanmoqda...',
  'DAMAS garajdan chiqmoqda...',
];

const MESSAGES_RU = [
  'Открываем список мастеров...',
  'Считаем ваши билеты...',
  'Участников много — ваша очередь близко...',
  'Обновляем рейтинг...',
  'DAMAS выезжает из гаража...',
];

/**
 * Birinchi yuklanish ekrani. Server javobi necha soniya olishini oldindan bilib bo'lmaydi,
 * shuning uchun foiz tez boshlanib, 95% ga sekin yaqinlashadi va javob kelganda yakunlanadi.
 */
export const LoadingScreen: React.FC = () => {
  const messages = useLanguage() === 'ru' ? MESSAGES_RU : MESSAGES_UZ;
  const [progress, setProgress] = useState(4);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      setProgress(Math.min(95, Math.round(95 * (1 - Math.exp(-seconds / 3.2)))));
    }, 120);
    const rotate = setInterval(() => setMessageIndex((i) => (i + 1) % messages.length), 1800);
    return () => {
      clearInterval(timer);
      clearInterval(rotate);
    };
  }, [messages.length]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 36 36" className="absolute inset-0 w-28 h-28 -rotate-90">
          <circle cx="18" cy="18" r="16.5" fill="none" stroke="var(--color-brand-soft)" strokeWidth="2" />
          <circle
            cx="18"
            cy="18"
            r="16.5"
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${progress * 1.037} 104`}
            className="transition-[stroke-dasharray] duration-300"
          />
        </svg>
        <img src={epcoMark} alt="EPCO" className="absolute inset-3 w-[88px] h-[88px]" />
      </div>
      <div className="mt-6 text-3xl font-extrabold text-brand tabular-nums">{progress}%</div>
      <p key={messageIndex} className="mt-2 h-6 text-muted">
        {messages[messageIndex]}
      </p>
    </div>
  );
};
