import React from 'react';
import { Language, PromoConfig } from '../types';
import { translations } from '../i18n';
import damasPrizeImg from '../assets/images/hero_damas_prize_1790772648839.jpg';

interface RulesAndTrustModalProps {
  isOpen: boolean;
  config: PromoConfig;
  language: Language;
  isLargeText?: boolean;
  onClose: () => void;
}

export const RulesAndTrustModal: React.FC<RulesAndTrustModalProps> = ({
  isOpen,
  config,
  language,
  isLargeText,
  onClose,
}) => {
  const t = translations[language];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0D121F] rounded-3xl border border-amber-500/35 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-5 max-h-[85vh] flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <div>
              <h3 className={`font-black ${isLargeText ? 'text-xl' : 'text-lg'}`}>
                {t.rulesBtn} va Rasmiy Shartlar
              </h3>
              <p className="text-[11px] text-slate-400">
                EPCO Aksiya rasmiy qoidalari va sovg'alar fondi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs no-scrollbar">
          {/* Grand Prize Card with Image */}
          <div className="rounded-2xl overflow-hidden border border-amber-400/40 relative">
            <img
              src={damasPrizeImg}
              alt="Damas Avtomobili"
              className="w-full h-36 object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `${import.meta.env.BASE_URL}icon.svg`;
              }}
            />
            <div className="p-3 bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 inset-x-0">
              <span className="text-[10px] uppercase font-bold text-amber-300">
                Bosh Sovg'a Fondi: $15,000
              </span>
              <div className="text-base font-black text-white">
                Chevrolet DAMAS & iPhone 18 Pro Max
              </div>
            </div>
          </div>

          {/* Key Rules Accordion / Points */}
          <div className="space-y-2">
            <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-400/40 space-y-1">
              <span className="font-extrabold text-amber-300 text-xs flex items-center gap-1.5">
                <span>💵</span> 1. Har $1,000 to'lov (PUL KIRIM) = 1 ta bilet
              </span>
              <p className="text-slate-200 leading-relaxed text-[11px]">
                Mijoz kassaga yoki agentga har $1,000 to'lov qilishi bilan 1 ta rasmiy raqamli bilet taqdim etiladi. Biletlar va $1,000 dan kam qoldiq har oy boshida nollanadi va yangi oy uchun hisoblanadi.
              </p>
            </div>

            <div className="bg-rose-950/40 p-3 rounded-2xl border border-rose-500/50 space-y-1">
              <span className="font-extrabold text-rose-300 text-xs flex items-center gap-1.5">
                <span>🛡️</span> 2. Qarz bo'lsa biletlar NOFAOL, qarz yopilsa AKTUAL!
              </span>
              <p className="text-rose-100 leading-relaxed text-[11px]">
                Qarzi bor mijozning biletlari "NOFAOL" holatda bo'ladi. Qarz to'liq yopilib $0 bo'lishi bilan barcha biletlar avtomatik ravishda "AKTUAL" bo'ladi va shouda qatnashadi.
              </p>
            </div>

            <div className="bg-sky-950/40 p-3 rounded-2xl border border-sky-400/40 space-y-1">
              <span className="font-extrabold text-sky-300 text-xs flex items-center gap-1.5">
                <span>🎲</span> 3. Har oy 30 ta bilet egalari jonli shouga taklif qilinadi
              </span>
              <p className="text-slate-200 leading-relaxed text-[11px]">
                Bu reyting bo'yicha emas! Har oy barcha AKTUAL biletlar orasidan tasodifiy tanlov asosida 30 ta bilet tanlanadi va ularning egalari jonli efir shousiga taklif qilinadi.
              </p>
            </div>

            <div className="bg-emerald-950/40 p-3 rounded-2xl border border-emerald-400/40 space-y-1">
              <span className="font-extrabold text-emerald-300 text-xs flex items-center gap-1.5">
                <span>📱</span> 4. Har oy reytingdagi 1-o'ringa — iPhone 18 Pro Max!
              </span>
              <p className="text-slate-200 leading-relaxed text-[11px]">
                Joriy oyda eng ko'p PUL KIRIM qilgan qarzsiz 1-o'rindagi usta har oy kafolatlangan iPhone 18 Pro Max bilan taqdirlanadi!
              </p>
            </div>

            <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-1">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <span>🎁</span> 5. Qimmatbaho Sovg'alar Ro'yxati ($15,000 fond ichida)
              </span>
              <p className="text-slate-200 leading-relaxed text-[11px]">
                • Bosh sovg'a: <strong>Chevrolet DAMAS</strong><br />
                • Har oylik 1-o'rin: <strong>iPhone 18 Pro Max</strong><br />
                • Jonli shoudagi boshqa sovg'alar: Katta televizorlar, muzlatgichlar, kir yuvish mashinalari, konditsionerlar, smartfonlar va zamonaviy air fryerlar!
              </p>
            </div>
          </div>

          {/* Official Contact Phone */}
          <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">
                {t.supportContact}
              </span>
              <a
                href={`tel:${config.supportPhone}`}
                className="text-sm font-extrabold text-amber-300 hover:underline"
              >
                {config.supportPhone}
              </a>
            </div>
            <span className="text-2xl">📞</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-3">
          <button
            onClick={onClose}
            className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] font-extrabold text-xs active:scale-95 transition-transform cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
