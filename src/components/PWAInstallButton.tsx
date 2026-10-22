import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';
import { translations } from '../i18n';

interface PWAInstallButtonProps {
  language: Language;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ language }) => {
  const t = translations[language];
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as installed PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FFC933] text-[#06154A] text-xs font-bold shadow-sm active:scale-95 transition-transform"
        aria-label={t.installApp}
      >
        <span>📲</span>
        <span>{t.installApp}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/20 active:scale-95 transition-transform"
          aria-label="Install on iOS"
        >
          <span>📲</span>
          <span>Ekranga</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#06154A] border border-white/20 p-5 shadow-2xl text-white space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-base font-bold flex items-center gap-1.5">
                  <span>📱</span> iPhone / iPad ga o'rnatish
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-white/80 space-y-2 py-1 leading-relaxed">
                <p>1. Safari brauzerining pastki qismidagi <strong>"Ulashish" (Share)</strong> tugmasini bosing.</p>
                <p>2. Menyu pastiga tushib, <strong>"Ekranga qo'shish" (Add to Home Screen)</strong> bandini tanlang.</p>
                <p className="text-[11px] text-[#FFC933] font-medium">
                  Ilova to'liq ekranda qulay ishlaydi va bildirishnomalarni ko'rsatadi!
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
