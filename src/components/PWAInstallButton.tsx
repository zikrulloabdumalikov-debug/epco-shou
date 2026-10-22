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
        className="btn btn-soft w-full"
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
          className="btn btn-soft w-full"
        >
          📲 {L('Ekranga qo\'shish', 'Добавить на экран')}
        </button>

        {showIOSGuide && (
          <div className="sheet-backdrop">
            <div className="sheet space-y-3">
              <h3 className="text-base font-bold">📱 {L('iPhone / iPad ga o\'rnatish', 'Установка на iPhone / iPad')}</h3>
              <div className="text-muted space-y-2 leading-relaxed">
                <p>{L('1. Safari pastidagi «Ulashish» (Share) tugmasini bosing.', '1. Нажмите кнопку «Поделиться» (Share) внизу Safari.')}</p>
                <p>{L('2. «Ekranga qo\'shish» (Add to Home Screen) ni tanlang.', '2. Выберите «На экран Домой» (Add to Home Screen).')}</p>
              </div>
              <button onClick={() => setShowIOSGuide(false)} className="btn btn-primary w-full">
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
