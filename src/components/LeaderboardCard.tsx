'use client';

import React, { useState } from 'react';
import PlayerAvatar from './PlayerAvatar';
import { LeaderboardEntry } from '@/lib/data';
import { getShortName } from '@/lib/scoring';
import { Medal, Search } from 'lucide-react';

interface LeaderboardCardProps {
  leaderboard: LeaderboardEntry[];
}

export default function LeaderboardCard({ leaderboard }: LeaderboardCardProps) {
  const [search, setSearch] = useState('');

  const filtered = leaderboard.filter((p) =>
    p.player_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="lions-card p-5 flex flex-col h-full min-h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Medal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-black tracking-wider uppercase text-white">
            Rangliste
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          Top Spieler
        </span>
      </div>

      {/* Quick Search */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Spieler suchen..."
          className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Column Headers */}
      <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pb-2 border-b border-white/5">
        <span className="w-6 shrink-0">#</span>
        <span className="w-8 shrink-0"></span>
        <span className="flex-1 truncate pl-1">Spieler</span>
        <span className="w-12 text-right shrink-0">Spiele</span>
        <span className="w-14 text-right shrink-0 text-cyan-400">Punkte</span>
      </div>

      {/* Player List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-2 custom-scrollbar max-h-[380px]">
        {filtered.map((player) => (
          <div
            key={player.player_name}
            className="flex items-center p-2 rounded-xl border border-cyan-500/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
          >
            {/* Rank */}
            <span className="w-6 font-black text-sm text-cyan-400 shrink-0">
              {player.rank}
            </span>

            {/* Avatar */}
            <div className="w-8 shrink-0">
              <PlayerAvatar
                name={player.player_name}
                size={28}
                borderColor="#00D4FF"
              />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0 pl-1.5">
              <div
                className="text-xs font-bold text-white truncate"
                title={player.player_name}
              >
                {getShortName(player.player_name)}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {player.team}
              </div>
            </div>

            {/* Matches */}
            <span className="w-12 text-right text-xs font-bold text-slate-400 shrink-0">
              {player.match_count}
            </span>

            {/* Rating */}
            <span className="w-14 text-right text-sm font-black text-cyan-400 shrink-0">
              {Number(player.final_rating).toFixed(2)}
            </span>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs">
            Kein Spieler gefunden
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-white/5 text-center text-[10px] font-medium text-slate-500">
        Detaillierte Punkteaufschlüsselung in der Matrix unten
      </div>
    </div>
  );
}
