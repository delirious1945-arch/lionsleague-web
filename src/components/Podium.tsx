import React from 'react';
import PlayerAvatar from './PlayerAvatar';
import { LeaderboardEntry } from '@/lib/data';
import { getShortName } from '@/lib/scoring';
import { Trophy } from 'lucide-react';

interface PodiumProps {
  topMonth: LeaderboardEntry[];
}

export default function Podium({ topMonth }: PodiumProps) {
  const p1 = topMonth[0] || { player_name: 'Offen', final_rating: 0, team: '-' };
  const p2 = topMonth[1] || { player_name: 'Offen', final_rating: 0, team: '-' };
  const p3 = topMonth[2] || { player_name: 'Offen', final_rating: 0, team: '-' };

  return (
    <div className="lions-card p-5 flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black tracking-wider uppercase text-white">
            Top 3 • Monatswertung
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          Podium
        </span>
      </div>

      {/* Podium Stage */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end pt-3 pb-1">
        {/* 2. Platz (Silber) */}
        <div className="flex flex-col items-center text-center">
          <PlayerAvatar
            name={p2.player_name}
            size={72}
            borderColor="#CBD5E1"
            className="hover:scale-105 transition-transform"
          />
          <div className="w-full mt-3 p-2.5 rounded-xl bg-slate-400/10 border border-slate-400/20 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              2. Platz
            </div>
            <div
              className="text-xs font-bold text-white truncate mt-0.5"
              title={p2.player_name}
            >
              {getShortName(p2.player_name)}
            </div>
            <div className="text-xs font-black text-cyan-400 mt-1">
              {Number(p2.final_rating).toFixed(2)} Pkt
            </div>
          </div>
        </div>

        {/* 1. Platz (Gold) - Elevated */}
        <div className="flex flex-col items-center text-center -mt-3">
          <div className="relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg">
              👑 WINNER
            </div>
            <PlayerAvatar
              name={p1.player_name}
              size={88}
              borderColor="#F59E0B"
              className="hover:scale-105 transition-transform shadow-amber-500/30"
            />
          </div>
          <div className="w-full mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 shadow-md">
            <div className="text-xs font-black uppercase tracking-wider text-amber-400">
              1. Platz
            </div>
            <div
              className="text-sm font-black text-white truncate mt-0.5"
              title={p1.player_name}
            >
              {getShortName(p1.player_name)}
            </div>
            <div className="text-sm font-black text-cyan-300 mt-1">
              {Number(p1.final_rating).toFixed(2)} Pkt
            </div>
          </div>
        </div>

        {/* 3. Platz (Bronze) */}
        <div className="flex flex-col items-center text-center">
          <PlayerAvatar
            name={p3.player_name}
            size={72}
            borderColor="#D97706"
            className="hover:scale-105 transition-transform"
          />
          <div className="w-full mt-3 p-2.5 rounded-xl bg-amber-700/10 border border-amber-700/25 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">
              3. Platz
            </div>
            <div
              className="text-xs font-bold text-white truncate mt-0.5"
              title={p3.player_name}
            >
              {getShortName(p3.player_name)}
            </div>
            <div className="text-xs font-black text-cyan-400 mt-1">
              {Number(p3.final_rating).toFixed(2)} Pkt
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
