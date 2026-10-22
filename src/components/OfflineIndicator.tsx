import React, { useEffect, useState } from 'react';
import { useL } from '../i18n/lang';

export const OfflineIndicator: React.FC = () => {
  const L = useL();
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
    <div className="fixed top-16 left-4 right-4 z-50 flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>{L('Internet yo\'q — oxirgi saqlangan ma\'lumot ko\'rsatilmoqda', 'Нет интернета — показаны сохранённые данные')}</span>
    </div>
  );
};
