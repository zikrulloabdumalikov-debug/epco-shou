import React, { useState } from 'react';
import { LogOut, MapPin, Phone, Volume2, VolumeX, Type, Languages } from 'lucide-react';
import { User } from '../types';
import { triggerHaptic } from '../utils/audio';
import { PWAInstallButton } from './PWAInstallButton';
import { useL, useLanguage } from '../i18n/lang';
import { Sheet } from './Sheet';

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
  const [leaving, setLeaving] = useState(false);

  const logout = async () => {
    if (!confirm(L('Tizimdan chiqasizmi?', 'Выйти из аккаунта?'))) return;
    setLeaving(true);
    triggerHaptic(30);
    try {
      await onLogout();
    } finally {
      setLeaving(false);
      onClose();
    }
  };

  const setting = (icon: React.ReactNode, label: string, value: string, onClick: () => void, on?: boolean) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
      <span className="w-9 h-9 shrink-0 rounded-xl bg-brand-soft text-brand flex items-center justify-center">{icon}</span>
      <span className="flex-1 font-semibold">{label}</span>
      <span className={`text-sm font-bold ${on ? 'text-brand' : 'text-muted'}`}>{value}</span>
    </button>
  );

  return (
    <Sheet open={isOpen} onClose={onClose} title={L('Profil', 'Профиль')}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 rounded-full bg-brand text-white text-2xl font-bold flex items-center justify-center">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">{user.name}</div>
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <Phone size={14} /> <span className="tabular-nums">{user.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={14} /> {user.region}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line divide-y divide-line">
          {setting(<Languages size={18} />, L('Til', 'Язык'), language === 'uz' ? 'O\'zbekcha' : 'Русский', onToggleLanguage)}
          {setting(
            soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />,
            L('Ovoz', 'Звук'),
            soundOn ? L('Yoqiq', 'Вкл.') : L('O\'chiq', 'Выкл.'),
            onToggleSound,
            soundOn
          )}
          {setting(<Type size={18} />, L('Katta harf', 'Крупный шрифт'), isLargeText ? L('Yoqiq', 'Вкл.') : L('O\'chiq', 'Выкл.'), onToggleTextSize, isLargeText)}
        </div>

        <div className="flex justify-center">
          <PWAInstallButton />
        </div>

        <button onClick={logout} disabled={leaving} className="btn btn-danger w-full">
          <LogOut size={18} />
          {leaving ? L('Chiqilmoqda...', 'Выходим...') : L('Chiqish', 'Выйти')}
        </button>
      </div>
    </Sheet>
  );
};
