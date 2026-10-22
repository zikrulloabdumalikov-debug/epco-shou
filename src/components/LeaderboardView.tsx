import React from 'react';
import { LeaderboardEntry, PrizeScope, ClientStats, User } from '../types';
import { useL, money } from '../i18n/lang';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  stats: ClientStats;
  user: User;
  isLargeText?: boolean;
  activeScope: PrizeScope;
  onChangeScope: (scope: PrizeScope) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ entries, stats, user, isLargeText, activeScope, onChangeScope }) => {
  const L = useL();
  const isRegion = activeScope === 'region';
  const myEntry = entries.find((e) => e.isMe);
  const myRank = isRegion ? myEntry?.rank || stats.regionRank || 0 : stats.currentRank;
  const totalInScope = isRegion ? stats.regionTotal || entries.length : stats.totalParticipants;
  const isMeInTop10 = stats.currentRank > 0 && stats.currentRank <= 10;

  const scopeButton = (scope: PrizeScope, label: string) => (
    <button
      onClick={() => onChangeScope(scope)}
      className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold transition-all ${
        activeScope === scope || (scope === 'republic' && activeScope === 'league')
          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#06154A]'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );

  const gapCard = (label: string, value: string, note: string, tone: string) => (
    <div className={`p-3 rounded-2xl text-center border ${tone}`}>
      <div className="text-[11px] text-slate-200 font-semibold leading-tight">{label}</div>
      <div className="text-base sm:text-lg font-black mt-1 tabular-nums">{value}</div>
      <div className="text-[10px] text-slate-400">{note}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`font-black text-white ${isLargeText ? 'text-2xl' : 'text-xl'}`}>🏆 {L('Reyting', 'Рейтинг')}</h2>
        <p className="text-xs text-white/70">{L('Shu oydagi to\'lovlar bo\'yicha', 'По оплатам за этот месяц')}</p>
      </div>

      {/* Mening o'rnim */}
      <div className="glass-card-gold p-4 rounded-3xl border border-amber-400/50 flex items-center gap-4">
        <div className="w-20 h-20 shrink-0 rounded-2xl bg-[#0B0F19] border border-amber-400/70 flex flex-col items-center justify-center">
          <span className="text-[10px] text-amber-300/80 font-bold uppercase">{L('O\'rin', 'Место')}</span>
          <span className="text-3xl font-black text-amber-300 tabular-nums leading-none">{myRank || '—'}</span>
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-sm text-slate-200">
            {isRegion ? user.region : L('Respublika bo\'yicha', 'По республике')}:{' '}
            <b className="text-white tabular-nums">{totalInScope.toLocaleString('en-US')}</b> {L('ishtirokchi', 'участников')}
          </div>
          {!isRegion && stats.regionRank ? (
            <div className="text-xs text-slate-300">
              {L('Viloyatingizda:', 'В вашем регионе:')} <b className="text-white">#{stats.regionRank}</b> / {stats.regionTotal}
            </div>
          ) : null}
          <div className={`text-xs font-bold ${stats.isDebtCleared ? 'text-emerald-300' : 'text-rose-300'}`}>
            {stats.isDebtCleared
              ? L(`✓ ${stats.activeTicketsCount} ta faol bilet`, `✓ Активных билетов: ${stats.activeTicketsCount}`)
              : L('⚠ Qarz yopilmagan — biletlar nofaol', '⚠ Долг не погашен — билеты неактивны')}
          </div>
        </div>
      </div>

      <div className="flex items-center p-1 bg-[#090D17]/90 rounded-2xl border border-amber-500/20 gap-1">
        {scopeButton('republic', L('🇺🇿 Respublika', '🇺🇿 Республика'))}
        {scopeButton('region', L('📍 Viloyatim', '📍 Мой регион'))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {gapCard(
          L('Keyingi o\'ringacha', 'До след. места'),
          stats.currentRank <= 1 ? '🥇' : `+${money(stats.gapToNextRank)}`,
          stats.currentRank <= 1 ? L('Siz 1-o\'rinda', 'Вы первый') : L('to\'lov kerak', 'нужно оплатить'),
          'border-amber-500/20 text-amber-400 glass-card'
        )}
        {gapCard(
          L('Top-10 gacha', 'До топ-10'),
          isMeInTop10 ? '✓' : `+${money(stats.gapToTop10)}`,
          isMeInTop10 ? L('Top-10 dasiz', 'Вы в топ-10') : L('to\'lov kerak', 'нужно оплатить'),
          'border-emerald-500/30 bg-emerald-950/20 text-emerald-400'
        )}
        {gapCard(
          L('1-o\'ringacha', 'До 1-го места'),
          stats.currentRank === 1 ? '🎉' : `+${money(stats.gapToFirstPlace)}`,
          stats.currentRank === 1 ? L('Yetakchi', 'Лидер') : L('to\'lov kerak', 'нужно оплатить'),
          'border-amber-500/30 bg-amber-950/20 text-rose-300'
        )}
      </div>

      <div className="glass-card p-3 sm:p-4 rounded-3xl border border-white/15 overflow-hidden">
        <div className="flex items-center justify-between text-[11px] font-bold text-white/60 pb-2 border-b border-white/10 px-2 uppercase tracking-wider">
          <span>{L('Ishtirokchi', 'Участник')}</span>
          <span>{L('Biletlar', 'Билеты')}</span>
        </div>

        <div className="divide-y divide-white/5 mt-1">
          {entries.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">{L('Hozircha ishtirokchilar yo\'q', 'Пока нет участников')}</div>
          )}
          {entries.map((entry, index) => {
            const hasGap = index > 0 && entry.rank > entries[index - 1].rank + 1;
            const active = entry.isDebtCleared !== false;
            return (
              <React.Fragment key={entry.id}>
                {hasGap && <div className="py-1 text-center text-slate-500 tracking-[0.4em]">···</div>}
                <div
                  className={`flex items-center justify-between py-2.5 px-2 rounded-xl ${
                    entry.isMe ? 'bg-amber-400/20 border border-amber-400/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        entry.rank === 1
                          ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-black'
                          : entry.rank === 2
                          ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950'
                          : entry.rank === 3
                          ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white'
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold truncate ${entry.isMe ? 'text-amber-300' : 'text-white'} ${isLargeText ? 'text-base' : 'text-sm'}`}>
                          {entry.maskedName}
                        </span>
                        {entry.isMe && (
                          <span className="shrink-0 bg-amber-400 text-black text-[9px] font-black px-1.5 rounded">{L('Siz', 'Вы')}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">{entry.region}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-white text-sm tabular-nums">{entry.tickets}</div>
                    <span className={`text-[10px] font-bold ${active ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {active ? L('faol', 'активны') : L('qarzda', 'долг')}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
