'use client';

import React, { useState } from 'react';
import PlayerAvatar from './PlayerAvatar';
import { LeaderboardEntry } from '@/lib/data';
import { ArrowUpDown, Table as TableIcon } from 'lucide-react';

interface DetailedMatrixTableProps {
  leaderboard: LeaderboardEntry[];
}

type SortField = 'rank' | 'player_name' | 'match_count' | 'wins' | 'avg_total' | 'final_rating';

export default function DetailedMatrixTable({
  leaderboard,
}: DetailedMatrixTableProps) {
  const [sortField, setSortField] = useState<SortField>('final_rating');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterTeam, setFilterTeam] = useState('ALL');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'player_name' || field === 'rank');
    }
  };

  const filtered = leaderboard.filter((p) => {
    if (filterTeam === 'ALL') return true;
    return p.team === filterTeam;
  });

  const sorted = [...filtered].sort((a, b) => {
    let res = 0;
    if (sortField === 'rank') res = a.rank - b.rank;
    else if (sortField === 'player_name')
      res = a.player_name.localeCompare(b.player_name);
    else if (sortField === 'match_count') res = a.match_count - b.match_count;
    else if (sortField === 'wins') res = a.wins - b.wins;
    else if (sortField === 'avg_total') res = a.avg_total - b.avg_total;
    else if (sortField === 'final_rating')
      res = a.final_rating - b.final_rating;
    return sortAsc ? res : -res;
  });

  return (
    <div className="lions-card p-5 mt-6" id="rangliste">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-sm font-black tracking-wider uppercase text-white">
              Vollständige Punkte-Aufschlüsselung
            </h3>
            <p className="text-[11px] text-slate-400">
              Offizielle Rangliste nach Formel & Specials
            </p>
          </div>
        </div>

        {/* Team Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => setFilterTeam('ALL')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filterTeam === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Alle Teams
          </button>
          <button
            onClick={() => setFilterTeam('A-Team')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filterTeam === 'A-Team'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🦁 A-Team
          </button>
          <button
            onClick={() => setFilterTeam('B-Team')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filterTeam === 'B-Team'
                ? 'bg-slate-400/20 text-slate-200 border border-slate-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🐯 B-Team
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
              <th
                onClick={() => handleSort('rank')}
                className="py-3 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>#</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('player_name')}
                className="py-3 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Spieler</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">Team</th>
              <th
                onClick={() => handleSort('match_count')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Spiele</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('wins')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Siege</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avg_total')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Gesamt Avg</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">9D Avg</th>
              <th className="py-3 px-3 text-right">18D Avg</th>
              <th className="py-3 px-3 text-right">Specials</th>
              <th className="py-3 px-3 text-right">Doppel-Bonus</th>
              <th
                onClick={() => handleSort('final_rating')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1 text-cyan-400">
                  <span>Punkte</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((p) => (
              <tr
                key={p.player_name}
                className="hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-3 px-3 font-black text-cyan-400">
                  {p.rank}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar
                      name={p.player_name}
                      size={28}
                      borderColor="#00D4FF"
                    />
                    <span className="font-bold text-white">
                      {p.player_name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      p.team === 'A-Team'
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-400/10 text-slate-300 border border-slate-400/20'
                    }`}
                  >
                    {p.team}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-semibold text-slate-300">
                  {p.match_count}
                </td>
                <td className="py-3 px-3 text-right font-semibold text-emerald-400">
                  {p.wins}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-white">
                  {p.avg_total.toFixed(1)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-400">
                  {p.avg_9.toFixed(1)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-slate-400">
                  {p.avg_18.toFixed(1)}
                </td>
                <td className="py-3 px-3 text-right font-bold text-amber-400">
                  {p.specials_count > 0 ? `${p.specials_count} 🎯` : '-'}
                </td>
                <td className="py-3 px-3 text-right text-slate-400">
                  {p.doppel_bonus > 0 ? `+${p.doppel_bonus.toFixed(1)}` : '-'}
                </td>
                <td className="py-3 px-3 text-right font-black text-sm text-cyan-400">
                  {p.final_rating.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
