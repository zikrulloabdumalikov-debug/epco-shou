import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useL } from '../i18n/lang';

export const PWAInstallButton: React.FC = () => {
  const L = useL();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFC933] text-[#06154A] text-sm font-bold active:scale-95 transition-transform"
      >
        📲 {L('Ilovani telefonga o\'rnatish', 'Установить на телефон')}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold border border-white/20"
        >
          📲 {L('Ekranga qo\'shish', 'Добавить на экран')}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#06154A] border border-white/20 p-5 shadow-2xl text-white space-y-3">
              <h3 className="text-base font-bold">📱 {L('iPhone / iPad ga o\'rnatish', 'Установка на iPhone / iPad')}</h3>
              <div className="text-sm text-white/80 space-y-2 leading-relaxed">
                <p>{L('1. Safari pastidagi «Ulashish» (Share) tugmasini bosing.', '1. Нажмите кнопку «Поделиться» (Share) внизу Safari.')}</p>
                <p>{L('2. «Ekranga qo\'shish» (Add to Home Screen) ni tanlang.', '2. Выберите «На экран Домой» (Add to Home Screen).')}</p>
              </div>
              <button onClick={() => setShowIOSGuide(false)} className="w-full min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm">
                {L('Yopish', 'Закрыть')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
