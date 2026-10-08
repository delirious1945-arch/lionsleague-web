import React from 'react';
import PlayerAvatar from './PlayerAvatar';
import { Top26Player } from '@/lib/data';
import { getShortName } from '@/lib/scoring';
import { Crown } from 'lucide-react';

interface KingsOf26Props {
  top26: Top26Player[];
}

export default function KingsOf26({ top26 }: KingsOf26Props) {
  // Gruppieren nach Anzahl
  const groups: { count: number; players: Top26Player[] }[] = [];
  for (const p of top26) {
    let grp = groups.find((g) => g.count === p.count_26);
    if (!grp) {
      grp = { count: p.count_26, players: [] };
      groups.push(grp);
    }
    grp.players.push(p);
  }

  const top3Ranks = groups.slice(0, 3);

  const rankStyles = [
    {
      numColor: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
      badgeColor: 'text-amber-400',
      avatarBorder: '#F59E0B',
    },
    {
      numColor: 'text-slate-300',
      border: 'border-slate-400/30',
      bg: 'bg-slate-400/5',
      badgeColor: 'text-slate-300',
      avatarBorder: '#CBD5E1',
    },
    {
      numColor: 'text-amber-600',
      border: 'border-amber-700/30',
      bg: 'bg-amber-700/5',
      badgeColor: 'text-amber-500',
      avatarBorder: '#D97706',
    },
  ];

  return (
    <div className="lions-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black tracking-wider uppercase text-white">
            👑 26er Könige
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
          KLASSIKER 🎯
        </span>
      </div>

      <p className="text-[11px] text-slate-400 italic mb-4">
        Ist zwar keine 180, aber trotzdem ein echter Klassiker.
      </p>

      {/* Rows */}
      <div className="space-y-2">
        {top3Ranks.length > 0 ? (
          top3Ranks.map((grp, idx) => {
            const style = rankStyles[idx] || rankStyles[2];
            const namesStr = grp.players
              .map((p) => getShortName(p.player_name))
              .join(' & ');
            const teamsUnique = Array.from(
              new Set(grp.players.map((p) => p.team))
            ).join(' & ');

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2.5 rounded-xl border ${style.border} ${style.bg} transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`font-black text-sm w-4 shrink-0 ${style.numColor}`}
                  >
                    {idx + 1}.
                  </span>
                  <div className="flex -space-x-2 shrink-0">
                    {grp.players.slice(0, 2).map((p, pIdx) => (
                      <PlayerAvatar
                        key={pIdx}
                        name={p.player_name}
                        size={32}
                        borderColor={style.avatarBorder}
                      />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-xs font-bold text-white truncate"
                      title={namesStr}
                    >
                      {namesStr}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {teamsUnique}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <div className={`text-sm font-black ${style.badgeColor}`}>
                    {grp.count}×
                  </div>
                  <div className="text-[9px] uppercase font-bold text-slate-500">
                    26er
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            Noch keine 26er geworfen 🎯
          </div>
        )}
      </div>
    </div>
  );
}
