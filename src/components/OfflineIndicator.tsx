import React, { useEffect, useState } from 'react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-14 left-4 right-4 z-50 flex items-center justify-center gap-2 rounded-2xl bg-[#FF4D63] px-3 py-2 text-xs font-bold text-white shadow-xl animate-in slide-in-from-top-2">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Oflayn rejim — keshdagi ma'lumotlar ko'rsatilmoqda</span>
    </div>
  );
};
