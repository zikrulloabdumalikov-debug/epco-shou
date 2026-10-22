import React, { useState } from 'react';
import { User } from '../types';
import { triggerHaptic } from '../utils/audio';
import { User as UserIcon, Phone, MapPin, LogOut, X } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useL, useLanguage } from '../i18n/lang';

interface ProfileModalProps {
  isOpen: boolean;
  user: User;
  isLargeText?: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
  soundOn: boolean;
  onToggleSound: () => void;
  onToggleTextSize: () => void;
  onToggleLanguage: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  user,
  isLargeText,
  onClose,
  onLogout,
  soundOn,
  onToggleSound,
  onToggleTextSize,
  onToggleLanguage,
}) => {
  const L = useL();
  const language = useLanguage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogoutClick = async () => {
    if (!confirm(L('Tizimdan chiqasizmi?', 'Выйти из аккаунта?'))) return;
    setIsLoggingOut(true);
    triggerHaptic(30);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
      onClose();
    }
  };

  const toggleClass = (on: boolean) =>
    `min-h-[60px] rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition-colors ${
      on ? 'bg-amber-400 text-[#06154A] border-amber-300' : 'bg-white/5 text-slate-300 border-white/10'
    }`;

  const infoRow = (icon: React.ReactNode, label: string, value: string, mono?: boolean) => (
    <div className="p-3 bg-[#081028] border border-white/10 rounded-2xl flex items-center gap-3">
      {icon}
      <div className="min-w-0">
        <span className="text-[10px] text-slate-400 uppercase font-bold block">{label}</span>
        <span className={`font-bold text-white text-sm truncate block ${mono ? 'font-mono' : ''}`}>{value}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-md bg-[#0D121F] rounded-3xl border border-amber-500/35 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-5 sm:p-6 text-white space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className={`font-black ${isLargeText ? 'text-xl' : 'text-lg'}`}>👤 {L('Profil', 'Профиль')}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label={L('Yopish', 'Закрыть')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {infoRow(<UserIcon className="w-4 h-4 text-amber-400 shrink-0" />, L('Ism / do\'kon', 'Имя / магазин'), user.name)}
          {infoRow(<Phone className="w-4 h-4 text-emerald-400 shrink-0" />, L('Telefon', 'Телефон'), user.phone, true)}
          {infoRow(<MapPin className="w-4 h-4 text-sky-400 shrink-0" />, L('Hudud', 'Регион'), user.region)}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={onToggleSound} className={toggleClass(soundOn)}>
            <span className="text-lg">{soundOn ? '🔊' : '🔇'}</span>
            {soundOn ? L('Ovoz yoqiq', 'Звук вкл.') : L('Ovoz o\'chiq', 'Звук выкл.')}
          </button>
          <button onClick={onToggleTextSize} className={toggleClass(Boolean(isLargeText))}>
            <span className="text-lg font-black">A+</span>
            {L('Katta harf', 'Крупный шрифт')}
          </button>
          <button onClick={onToggleLanguage} className={toggleClass(false)}>
            <span className="text-lg font-black">{language === 'uz' ? 'RU' : 'UZ'}</span>
            {language === 'uz' ? 'Русский' : 'O\'zbekcha'}
          </button>
        </div>

        <div className="flex justify-center">
          <PWAInstallButton />
        </div>

        <button
          onClick={handleLogoutClick}
          disabled={isLoggingOut}
          className="w-full py-3.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-black text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? L('Chiqilmoqda...', 'Выходим...') : L('Chiqish', 'Выйти')}
        </button>
      </div>
    </div>
  );
};
