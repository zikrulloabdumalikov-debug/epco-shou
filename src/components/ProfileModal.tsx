import React, { useState } from 'react';
import { User, Language } from '../types';
import { translations } from '../i18n';
import { triggerHaptic } from '../utils/audio';
import { User as UserIcon, Phone, MapPin, Eye, LogOut, X } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  user: User;
  language: Language;
  isLargeText?: boolean;
  onClose: () => void;
  onUpdateConsent: (consent: boolean) => Promise<void>;
  onLogout: () => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  user,
  language,
  isLargeText,
  onClose,
  onUpdateConsent,
  onLogout,
}) => {
  const t = translations[language];
  const [consent, setConsent] = useState(!user.isAnonymous);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleToggleConsent = async () => {
    const next = !consent;
    setConsent(next);
    setIsUpdating(true);
    triggerHaptic(20);
    try {
      await onUpdateConsent(next);
    } catch (e) {
      console.error(e);
      setConsent(!next); // revert
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogoutClick = async () => {
    if (confirm(t.profileLogoutConfirm)) {
      setIsLoggingOut(true);
      triggerHaptic(30);
      try {
        await onLogout();
      } finally {
        setIsLoggingOut(false);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0D121F] rounded-3xl border border-amber-500/35 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-5 sm:p-6 text-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-black ${isLargeText ? 'text-xl' : 'text-lg'}`}>
                {t.profileTitle}
              </h3>
              <p className="text-[11px] text-slate-400">
                Shaxsiy sozlamalar va maxfiylik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Info Fields */}
        <div className="space-y-2.5 text-xs">
          <div className="p-3 bg-[#081028] border border-white/10 rounded-2xl flex items-center gap-3">
            <UserIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Ism / Do'kon:
              </span>
              <span className="font-bold text-white text-sm truncate block">
                {user.name}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#081028] border border-white/10 rounded-2xl flex items-center gap-3">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {t.profilePhone}:
              </span>
              <span className="font-mono font-bold text-emerald-300 text-sm truncate block">
                {user.phone}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#081028] border border-white/10 rounded-2xl flex items-center gap-3">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {t.profileRegion}:
              </span>
              <span className="font-bold text-slate-200 truncate block">
                {user.region}
              </span>
            </div>
          </div>
        </div>

        {/* Privacy Consent Toggle */}
        <div className="p-3.5 bg-amber-400/10 border border-amber-400/30 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-200">
                {t.profileConsent}
              </span>
            </div>
            <button
              onClick={handleToggleConsent}
              disabled={isUpdating}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                consent ? 'bg-amber-400 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-950 shadow-md block" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {t.profileConsentNote}
          </p>
        </div>

        {/* Logout Button */}
        <div className="pt-2">
          <button
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            className="w-full py-3.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? 'Chiqilmoqda...' : t.logoutBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
