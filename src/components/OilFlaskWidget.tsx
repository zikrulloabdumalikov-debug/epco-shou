import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ClientStats, Language } from '../types';
import { translations } from '../i18n';
import { playTicketChime, triggerHaptic } from '../utils/audio';

interface OilFlaskWidgetProps {
  stats: ClientStats;
  language: Language;
  isLargeText?: boolean;
  onOpenTicketsModal: () => void;
}

export const OilFlaskWidget: React.FC<OilFlaskWidgetProps> = ({
  stats,
  language,
  isLargeText,
  onOpenTicketsModal,
}) => {
  const t = translations[language];
  const prevTicketsRef = useRef<number>(stats.tickets);

  // Trigger confetti and chime when tickets increment
  useEffect(() => {
    if (stats.tickets > prevTicketsRef.current) {
      playTicketChime();
      triggerHaptic([60, 40, 80, 50, 100]);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFC933', '#FF9F1C', '#3DDC97', '#FFFFFF'],
      });
    }
    prevTicketsRef.current = stats.tickets;
  }, [stats.tickets]);

  // Current remainder towards $1000 ticket threshold (0-1000)
  const remainder = stats.currentMonthRemainder; // e.g. 650
  const fillPercentage = Math.min(100, Math.max(8, (remainder / 1000) * 100));
  // Invert percentage for canister oil reservoir (100% full = y 76, 0% = y 238, total height = 162)
  const clipY = 238 - (fillPercentage / 100) * 162;

  return (
    <div className="glass-card-gold p-3.5 sm:p-4 rounded-3xl relative overflow-hidden shadow-2xl transition-all duration-300">
      {/* Background ambient glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center gap-3.5 sm:gap-5">
        {/* Motor Moyi Kanistrasi Shaklidagi Bilet Idishi (Automotive Oil Canister / Jug) */}
        <div
          onClick={onOpenTicketsModal}
          className="relative cursor-pointer group shrink-0 active:scale-95 transition-transform"
          role="button"
          tabIndex={0}
          aria-label={t.ticketsBtn}
          title="Biletlarni ko'rish"
        >
          <div className="relative w-28 h-36 flex items-center justify-center">
            <svg
              viewBox="0 0 200 250"
              className="w-full h-full filter drop-shadow-[0_8px_20px_rgba(245,158,11,0.38)]"
            >
              <defs>
                {/* Gold Fluid Gradient */}
                <linearGradient id="oilFluidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="25%" stopColor="#FBBF24" />
                  <stop offset="60%" stopColor="#F59E0B" />
                  <stop offset="90%" stopColor="#D97706" />
                  <stop offset="100%" stopColor="#92400E" />
                </linearGradient>

                {/* Canister Outer Metallic/Glass Rim Gradient */}
                <linearGradient id="canisterRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
                  <stop offset="35%" stopColor="rgba(245, 158, 11, 0.7)" />
                  <stop offset="70%" stopColor="rgba(146, 64, 14, 0.6)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.4)" />
                </linearGradient>

                {/* Canister Body Shell Gradient */}
                <linearGradient id="canisterShellGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(15, 23, 42, 0.94)" />
                  <stop offset="50%" stopColor="rgba(30, 41, 59, 0.88)" />
                  <stop offset="100%" stopColor="rgba(15, 23, 42, 0.96)" />
                </linearGradient>

                {/* Mask for oil rising inside the canister reservoir */}
                <mask id="canisterTankMask">
                  <path
                    d="M 34 84 C 34 78 38 74 44 74 L 154 74 C 160 74 164 78 164 84 L 164 228 C 164 234 160 238 154 238 L 44 238 C 38 238 34 234 34 228 Z"
                    fill="#FFFFFF"
                  />
                </mask>
              </defs>

              {/* Canister Outer Body + Top Carry Handle (Compound path with evenodd for handle hole) */}
              <path
                d="M 40 38 L 26 70 C 24 75 24 80 24 88 L 24 230 C 24 238 30 244 38 244 L 160 244 C 168 244 174 238 174 230 L 174 72 C 174 64 168 58 160 58 C 160 46 156 34 146 26 C 138 20 124 18 102 18 C 76 18 64 22 62 28 L 62 38 Z M 74 44 C 74 38 80 34 88 34 L 134 34 C 142 34 148 38 148 44 C 148 50 142 54 134 54 L 88 54 C 80 54 74 50 74 44 Z"
                fill="url(#canisterShellGrad)"
                stroke="url(#canisterRimGrad)"
                strokeWidth="3.5"
                fillRule="evenodd"
              />

              {/* Spout Neck */}
              <rect x="40" y="24" width="22" height="14" fill="#78350F" stroke="#F59E0B" strokeWidth="1.5" />

              {/* Spout Screw Cap with Ribbed Texture */}
              <rect x="36" y="10" width="30" height="15" rx="3" fill="#D97706" stroke="#FEF08A" strokeWidth="1.5" />
              <line x1="42" y1="11" x2="42" y2="24" stroke="#78350F" strokeWidth="1.5" />
              <line x1="47" y1="11" x2="47" y2="24" stroke="#78350F" strokeWidth="1.5" />
              <line x1="51" y1="11" x2="51" y2="24" stroke="#78350F" strokeWidth="1.5" />
              <line x1="55" y1="11" x2="55" y2="24" stroke="#78350F" strokeWidth="1.5" />
              <line x1="60" y1="11" x2="60" y2="24" stroke="#78350F" strokeWidth="1.5" />

              {/* Rising Oil Level inside canister reservoir */}
              <g mask="url(#canisterTankMask)">
                {/* Oil liquid body */}
                <rect
                  x="30"
                  y={clipY}
                  width="140"
                  height="220"
                  fill="url(#oilFluidGrad)"
                  className="transition-all duration-700 ease-out"
                />

                {/* Liquid surface wave ripple */}
                <path
                  d={`M 30 ${clipY} Q 65 ${clipY - 4} 100 ${clipY} T 170 ${clipY} L 170 240 L 30 240 Z`}
                  fill="url(#oilFluidGrad)"
                  opacity="0.9"
                />

                {/* Ascending bubbles in motor oil */}
                <circle cx="85" cy={clipY + 28} r="3" fill="#FFFFFF" opacity="0.65" className="animate-ping" />
                <circle cx="125" cy={clipY + 45} r="2.5" fill="#FFFFFF" opacity="0.5" />
                <circle cx="65" cy={clipY + 65} r="2" fill="#FFFFFF" opacity="0.4" />
              </g>

              {/* Canister Measuring Gauge / Scale (Litr & Summa ko'rsatkichlari) */}
              <g stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.5" strokeLinecap="round">
                {/* 1000 mark */}
                <line x1="154" y1="82" x2="162" y2="82" />
                {/* 750 mark */}
                <line x1="156" y1="122" x2="162" y2="122" />
                {/* 500 mark */}
                <line x1="154" y1="160" x2="162" y2="160" />
                {/* 250 mark */}
                <line x1="156" y1="200" x2="162" y2="200" />
              </g>
              <text x="146" y="85" fill="rgba(255,255,255,0.6)" fontSize="7" fontWeight="bold" textAnchor="end">$1k</text>
              <text x="146" y="163" fill="rgba(255,255,255,0.5)" fontSize="7" fontWeight="bold" textAnchor="end">$500</text>

              {/* Handle Specular Light Reflection */}
              <path
                d="M 76 26 C 95 21 120 21 140 26"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Left Body Bevel Specular Highlight */}
              <line
                x1="28"
                y1="85"
                x2="28"
                y2="225"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Canister Central Premium Label Frame */}
              <rect
                x="44"
                y="98"
                width="98"
                height="86"
                rx="10"
                fill="rgba(8, 12, 22, 0.82)"
                stroke="rgba(245, 158, 11, 0.55)"
                strokeWidth="1.5"
              />
            </svg>

            {/* In-canister Ticket Count and Info on the Central Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 text-center pointer-events-none select-none">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-300 drop-shadow">
                Biletlar
              </span>
              <div className="flex items-baseline justify-center my-0.5">
                <span className="text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] tabular-nums">
                  {stats.tickets}
                </span>
                <span className="text-[11px] font-bold text-amber-300 ml-0.5">
                  ta
                </span>
              </div>
              <span className="text-[8.5px] font-extrabold text-amber-200 bg-black/75 px-1.5 py-0.5 rounded-md border border-amber-400/40 tabular-nums">
                ${remainder}/$1,000
              </span>
            </div>
          </div>
        </div>

        {/* Right Info Column: To'lov, Qarz va Biletlar Holati */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Shu oy to'langan summa */}
          <div>
            <span className="text-[11px] text-slate-400 block font-semibold">Shu oy to'lagansiz:</span>
            <span className="text-xl font-black text-amber-400 tabular-nums">
              ${Math.round(stats.confirmedAmount || 0).toLocaleString('en-US')}
            </span>
          </div>

          {/* Qarz Holati Banneri (Aksiya yangi qoidasi: qarz $0 bo'lsa biletlar AKTUAL!) */}
          <div
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('usta-moy-speak', {
                  detail: { topic: stats.isDebtCleared ? 'debt_cleared' : 'debt_warning' },
                })
              );
            }}
            className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
              stats.isDebtCleared
                ? 'bg-emerald-950/70 border-emerald-500/50 hover:bg-emerald-950/90 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-rose-950/80 border-rose-500/70 hover:bg-rose-950/95 shadow-[0_0_15px_rgba(244,63,94,0.25)] animate-pulse'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">{stats.isDebtCleared ? '🛡️' : '⚠️'}</span>
              <div className="min-w-0">
                <span className={`text-xs font-black block ${stats.isDebtCleared ? 'text-emerald-300' : 'text-rose-200'}`}>
                  {stats.isDebtCleared ? "Qarzingiz yo'q" :`Qarz: $${Math.round(stats.debtAmount || 0).toLocaleString('en-US')}`}
                </span>
                <span className={`text-[11px] block leading-snug ${stats.isDebtCleared ? 'text-emerald-200/80' : 'text-rose-300/90'}`}>
                  {stats.isDebtCleared ? 'Biletlaringiz faol' : 'Biletlar nofaol — qarzni yoping'}
                </span>
              </div>
            </div>
          </div>

          {/* Keyingi biletga qolgan summa va progress */}
          <div className="bg-[#090D17]/80 rounded-xl p-2 sm:p-2.5 border border-white/10 space-y-1.5">
            <div className="text-xs text-slate-300">
              Keyingi biletgacha:{' '}
              <b className="text-amber-400 tabular-nums">${Math.round(stats.gapToNextTicket || 0).toLocaleString('en-US')}</b>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                style={{ width: `${(remainder / 1000) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium tabular-nums">
              <span>${Math.round(remainder)} / $1,000</span>
              <span>$1,000 = 1 bilet</span>
            </div>
          </div>

        </div>
      </div>

      {/* Month-End Warning Alert (Real-time dynamic from system clock) */}
      {stats.isMonthEndWarning && remainder > 0 && (
        <div
          className={`mt-2.5 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-md text-xs border ${
            stats.isLastDayOfMonth
              ? 'bg-gradient-to-r from-rose-950/85 via-red-950/80 to-rose-950/85 border-rose-500/70 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
              : 'bg-rose-950/40 border-rose-500/50 text-white'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0 animate-bounce">🔥</span>
            <div className="min-w-0">
              <span className="truncate block text-xs font-bold text-rose-100">
                {stats.isLastDayOfMonth ? (
                  <>
                    <strong className="text-white font-black underline decoration-amber-400">Bugun 23:59 da</strong> ${remainder} qoldiq kuyadi!
                  </>
                ) : (
                  <>
                    Oy oxirida <strong className="text-white font-extrabold">${remainder}</strong> qoldiq kuyadi!
                  </>
                )}
              </span>
              <span className="text-[10px] text-amber-300/90 block">
                Biletga aylantirishga ulgurib qoling
              </span>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-black text-amber-300 bg-black/70 px-2 py-1 rounded-lg border border-amber-400/40 shadow-inner">
            {stats.timeRemainingLabel || `${stats.daysRemainingInMonth} kun qoldi`}
          </span>
        </div>
      )}
    </div>
  );
};
