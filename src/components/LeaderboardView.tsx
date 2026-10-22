import React from 'react';
import { LeaderboardEntry, PrizeScope, ClientStats, User } from '../types';
import { useL, money } from '../i18n/lang';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  stats: ClientStats;
  user: User;
  activeScope: PrizeScope;
  onChangeScope: (scope: PrizeScope) => void;
}

const MEDAL: Record<number, string> = { 1: 'bg-[#F5A300] text-white', 2: 'bg-[#AAB4C3] text-white', 3: 'bg-[#C77B3A] text-white' };

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ entries, stats, user, activeScope, onChangeScope }) => {
  const L = useL();
  const isRegion = activeScope === 'region';
  const myEntry = entries.find((e) => e.isMe);
  const myRank = isRegion ? myEntry?.rank || stats.regionRank || 0 : stats.currentRank;
  const total = isRegion ? stats.regionTotal || entries.length : stats.totalParticipants;

  const nextGoal =
    stats.currentRank <= 1
      ? L('Siz 1-o\'rindasiz! 🎉', 'Вы на 1-м месте! 🎉')
      : L(
          `${stats.currentRank - 1}-o'ringa chiqish uchun yana ${money(stats.gapToNextRank)} to'lov kerak`,
          `До ${stats.currentRank - 1}-го места нужно ещё ${money(stats.gapToNextRank)}`
        );

  return (
    <div className="space-y-4">
      <section className="hero p-5">
        <div className="relative z-10 flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs font-semibold text-white/75 uppercase">{L('O\'rningiz', 'Ваше место')}</div>
            <div className="text-6xl font-extrabold leading-none tabular-nums">{myRank || '—'}</div>
          </div>
          <div className="min-w-0 text-sm leading-snug">
            <div className="text-white/80">
              {isRegion ? user.region : L('Respublika bo\'yicha', 'По республике')} · {total.toLocaleString('en-US')} {L('ishtirokchi', 'участников')}
            </div>
            {!isRegion && stats.regionRank ? (
              <div className="text-white/80">
                {L('Viloyatingizda:', 'В регионе:')} <b className="text-white">#{stats.regionRank}</b>
              </div>
            ) : null}
            <div className="mt-1 font-semibold">{nextGoal}</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-surface border border-line">
        {(['republic', 'region'] as PrizeScope[]).map((scope) => (
          <button
            key={scope}
            onClick={() => onChangeScope(scope)}
            className={`min-h-[44px] rounded-xl text-[15px] font-bold transition-colors ${
              activeScope === scope ? 'bg-brand text-white' : 'text-muted'
            }`}
          >
            {scope === 'republic' ? L('Respublika', 'Республика') : L('Viloyatim', 'Мой регион')}
          </button>
        ))}
      </div>

      <section className="card divide-y divide-line overflow-hidden">
        {entries.length === 0 && <div className="p-6 text-center text-muted">{L('Hozircha ishtirokchilar yo\'q', 'Пока нет участников')}</div>}
        {entries.map((entry, index) => {
          const hasGap = index > 0 && entry.rank > entries[index - 1].rank + 1;
          const active = entry.isDebtCleared !== false;
          return (
            <React.Fragment key={entry.id}>
              {hasGap && <div className="py-1 text-center text-muted tracking-[0.4em]">···</div>}
              <div className={`flex items-center gap-3 px-4 py-3 ${entry.isMe ? 'bg-brand-soft' : ''}`}>
                <div
                  className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold tabular-nums ${
                    MEDAL[entry.rank] || 'bg-page text-muted'
                  }`}
                >
                  {entry.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold truncate ${entry.isMe ? 'text-brand-dark' : ''}`}>{entry.maskedName}</span>
                    {entry.isMe && <span className="shrink-0 rounded-full bg-brand px-2 text-[11px] font-bold text-white">{L('Siz', 'Вы')}</span>}
                  </div>
                  <div className="text-xs text-muted truncate">{entry.region}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold tabular-nums">
                    {entry.tickets} <span className="text-xs font-medium text-muted">{L('bilet', 'бил.')}</span>
                  </div>
                  <div className={`text-[11px] font-semibold ${active ? 'text-ok' : 'text-bad'}`}>
                    {active ? L('faol', 'активны') : L('qarzi bor', 'есть долг')}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </section>
    </div>
  );
};
