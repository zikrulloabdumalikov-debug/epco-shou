import React from 'react';
import { LeaderboardEntry, PrizeScope, Language, ClientStats, User } from '../types';
import { translations } from '../i18n';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  stats: ClientStats;
  user: User;
  language: Language;
  isLargeText?: boolean;
  activeScope: PrizeScope;
  onChangeScope: (scope: PrizeScope) => void;
  hasPreviousMonthData?: boolean;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  stats,
  user,
  language,
  isLargeText,
  activeScope,
  onChangeScope,
  hasPreviousMonthData = false,
}) => {
  const t = translations[language];

  // Check if current user is within Top 10
  const isMeInTop10 = stats.currentRank <= 10;

  return (
    <div className="space-y-4">
      {/* Title & Privacy Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`font-black text-white ${isLargeText ? 'text-2xl' : 'text-xl'}`}>
            {t.leaderboardTitle}
          </h2>
          <p className="text-xs text-white/70">
            Joriy oyning to'lovlari (PUL KIRIM) bo'yicha saralangan
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-white/50 block font-medium">Viloyat:</span>
          <span className="text-xs font-bold text-[#FFC933] uppercase">
            {user.region}
          </span>
        </div>
      </div>

      {/* Scope Selector Tabs (Segmented control) - Republic and Region (and Growth only if data exists) */}
      <div className="flex items-center p-1 bg-[#090D17]/90 rounded-2xl border border-amber-500/20 gap-1 shadow-inner">
        <button
          onClick={() => onChangeScope('republic')}
          className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeScope === 'republic' || activeScope === 'league'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          🇺🇿 Respublika (Barchasi)
        </button>
        <button
          onClick={() => onChangeScope('region')}
          className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeScope === 'region'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          📍 Mening Viloyatim
        </button>
        {hasPreviousMonthData && (
          <button
            onClick={() => onChangeScope('growth')}
            className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeScope === 'growth'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-[#06154A] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📈 O'sish Ligasi
          </button>
        )}
      </div>

      {/* Three Critical Gap Calculation Cards (neighbor spend - my spend + 1) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Next Rank Gap */}
        <div className="glass-card p-3 rounded-2xl text-center border border-amber-500/20">
          <div className="text-[10px] text-slate-300 font-semibold leading-tight">
            Keyingi o'ringacha
          </div>
          <div className="text-base sm:text-lg font-black text-amber-400 mt-1 tabular-nums">
            {stats.currentRank <= 1 ? '🥇 1-o\'rin' : `+$${stats.gapToNextRank}`}
          </div>
          <div className="text-[9px] text-slate-400">{stats.currentRank <= 1 ? 'Yetakchisiz' : 'kerakli to\'lov'}</div>
        </div>

        {/* Top 10 Gap */}
        <div className="glass-card p-3 rounded-2xl text-center border border-emerald-500/30 bg-emerald-950/20">
          <div className="text-[10px] text-emerald-200 font-semibold leading-tight">
            Top-10 gacha
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-400 mt-1 tabular-nums">
            {isMeInTop10 ? '✓ Ichida' : `+$${stats.gapToTop10}`}
          </div>
          <div className="text-[9px] text-emerald-300/70">
            {isMeInTop10 ? 'Top-10 dasiz' : 'kerakli to\'lov'}
          </div>
        </div>

        {/* 1st Place Gap */}
        <div className="glass-card p-3 rounded-2xl text-center border border-amber-500/30 bg-amber-950/20">
          <div className="text-[10px] text-rose-200 font-semibold leading-tight">
            1-o'ringacha (iPhone)
          </div>
          <div className="text-base sm:text-lg font-black text-rose-400 mt-1 tabular-nums">
            {stats.currentRank === 1 ? '🎉 Sizda' : `+$${stats.gapToFirstPlace}`}
          </div>
          <div className="text-[9px] text-rose-300/70">
            {stats.currentRank === 1 ? 'Yetakchi' : 'kerakli to\'lov'}
          </div>
        </div>
      </div>

      {/* Top List Table */}
      <div className="glass-card p-3 sm:p-4 rounded-3xl border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between text-[11px] font-bold text-white/60 pb-2 border-b border-white/10 px-2 uppercase tracking-wider">
          <span>O'rin / Ishtirokchi</span>
          <span>Biletlar holati</span>
        </div>

        <div className="divide-y divide-white/5 mt-1">
          {entries.map((entry) => {
            const isMe = entry.isMe;

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between py-2.5 px-2 rounded-xl transition-all duration-300 ${
                  isMe
                    ? 'bg-amber-400/20 border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.25)] scale-[1.01]'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      entry.rank === 1
                        ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-black shadow-md shadow-amber-500/30'
                        : entry.rank === 2
                        ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black'
                        : entry.rank === 3
                        ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white font-black'
                        : 'bg-white/10 text-white/80'
                    }`}
                  >
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </div>

                  {/* Masked Name & Region (Others' exact phone, debt, and spend are NEVER shown) */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`font-bold truncate ${isMe ? 'text-amber-300' : 'text-white'} ${isLargeText ? 'text-base' : 'text-xs sm:text-sm'}`}>
                        {entry.maskedName}
                      </span>
                      {isMe && (
                        <span className="shrink-0 bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.2 rounded">
                          {t.myPositionBadge}
                        </span>
                      )}
                      {entry.rank === 1 && (
                        <span className="shrink-0 text-xs" title="1-o'rin (iPhone 18 Pro Max da'vogari)">
                          📱👑
                        </span>
                      )}
                      {entry.isDebtCleared !== undefined && (
                        <span
                          className={`shrink-0 text-[8.5px] font-extrabold px-1.5 py-0.2 rounded border ${
                            entry.isDebtCleared
                              ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                              : 'text-rose-300 bg-rose-500/20 border-rose-500/40'
                          }`}
                        >
                          {entry.isDebtCleared ? 'Aktual' : 'Qarz'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {entry.region}
                    </span>
                  </div>
                </div>

                {/* Score Column */}
                <div className="text-right shrink-0">
                  <div>
                    <span className="font-extrabold text-white text-xs sm:text-sm tabular-nums">
                      {entry.tickets} <span className="text-[10px] text-slate-400 font-normal">bilet</span>
                    </span>
                    {entry.isDebtCleared ? (
                      <span className="text-[9px] text-emerald-400 block font-bold">✓ Faol biletlar</span>
                    ) : (
                      <span className="text-[9px] text-rose-400 block font-bold">⚠ Qarzda</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pinned Bottom User Bar if outside Top-10 */}
      {!isMeInTop10 && (
        <div className="glass-card-gold p-3.5 rounded-2xl border border-amber-400/60 shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0B0F19] text-amber-400 border border-amber-400 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-inner">
              {stats.currentRank}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm truncate">
                  {user.isAnonymous ? t.anonymousUser : user.name}
                </span>
                <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.2 rounded">
                  {t.myPositionBadge}
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                Top-10 ga chiqish uchun: <strong className="text-emerald-400">+${stats.gapToTop10}</strong>
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm font-extrabold text-white tabular-nums">
              {stats.tickets} <span className="text-[10px] text-white/70">bilet</span>
            </div>
            <span className={`text-[10px] font-semibold block ${stats.isDebtCleared ? 'text-emerald-300' : 'text-rose-300'}`}>
              {stats.isDebtCleared ? '✓ Biletlar faol' : '⚠ Qarz yopilmagan'}
            </span>
          </div>
        </div>
      )}

      {/* Privacy Guarantee Note */}
      <div className="p-3 bg-black/30 rounded-2xl text-[11px] text-white/60 border border-white/5 flex items-start gap-2">
        <span className="text-base shrink-0">🔒</span>
        <p className="leading-snug">
          Boshqa ustalar va do'konlarning telefon raqami, aniq to'lov va qarz summalari maxfiy saqlanadi. Jadvalda faqat niqoblangan ismlar va biletlar ko'rsatiladi.
        </p>
      </div>
    </div>
  );
};
