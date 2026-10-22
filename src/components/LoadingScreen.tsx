import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/lang';

const MESSAGES_UZ = [
  'Ustalar ro\'yxati ochilmoqda...',
  'Biletlaringiz sanalmoqda...',
  'Mijozlar ko\'p — navbatingiz kelmoqda...',
  'Reyting yangilanmoqda...',
  'Moy kanistrasi to\'ldirilmoqda...',
  'DAMAS garajdan chiqmoqda...',
];

const MESSAGES_RU = [
  'Открываем список мастеров...',
  'Считаем ваши билеты...',
  'Участников много — ваша очередь близко...',
  'Обновляем рейтинг...',
  'Заливаем масло в канистру...',
  'DAMAS выезжает из гаража...',
];

/**
 * Birinchi yuklanish ekrani. Server javobi necha soniya olishini oldindan bilib bo'lmaydi,
 * shuning uchun foiz tez boshlanib, 95% ga sekin yaqinlashadi va javob kelganda yakunlanadi.
 */
export const LoadingScreen: React.FC = () => {
  const MESSAGES = useLanguage() === 'ru' ? MESSAGES_RU : MESSAGES_UZ;
  const [progress, setProgress] = useState(4);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      // ~3 soniyada 60%, ~8 soniyada 85%, keyin 95% gacha sekin
      setProgress(Math.min(95, Math.round(95 * (1 - Math.exp(-seconds / 3.2)))));
    }, 120);
    const messages = setInterval(() => setMessageIndex((i) => (i + 1) % MESSAGES.length), 1800);
    return () => {
      clearInterval(timer);
      clearInterval(messages);
    };
  }, []);

  return (
    <div className="min-h-screen bg-ambient-mesh bg-[#06154A] flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        {/* Moy kanistrasi */}
        <div className="relative w-24 h-28 mb-6">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 rounded-t-lg bg-amber-400/80" />
          <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/80 overflow-hidden bg-[#0B1430] shadow-[0_0_30px_rgba(245,158,11,0.35)]">
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300 transition-[height] duration-300 ease-out"
              style={{ height: `${progress}%` }}
            >
              <div className="absolute -top-1.5 left-0 right-0 h-3 bg-amber-200/60 blur-[2px] animate-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black tabular-nums text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        <h1 className="text-xl font-black tracking-tight">
          <span className="text-amber-400">EPCO</span> Shou
        </h1>
        <p key={messageIndex} className="mt-2 h-5 text-sm text-slate-300 animate-in fade-in duration-500">
          {MESSAGES[messageIndex]}
        </p>

        <div className="mt-6 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
