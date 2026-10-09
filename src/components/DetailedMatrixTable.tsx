'use client';

import React, { useState } from 'react';
import PlayerAvatar from './PlayerAvatar';
import { LeaderboardEntry } from '@/lib/data';
import { Table as TableIcon } from 'lucide-react';

interface DetailedMatrixTableProps {
  leaderboard: LeaderboardEntry[];
}

type SortField =
  | 'rank'
  | 'player_name'
  | 'match_count'
  | 'pts_win_w'
  | 'pts_avg_w'
  | 'pts_9_18_w'
  | 'pts_scores_w'
  | 'total_specials_bonus'
  | 'final_rating';

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
    else if (sortField === 'pts_win_w') res = a.pts_win_w - b.pts_win_w;
    else if (sortField === 'pts_avg_w') res = a.pts_avg_w - b.pts_avg_w;
    else if (sortField === 'pts_9_18_w') res = a.pts_9_18_w - b.pts_9_18_w;
    else if (sortField === 'pts_scores_w') res = a.pts_scores_w - b.pts_scores_w;
    else if (sortField === 'total_specials_bonus')
      res = a.total_specials_bonus - b.total_specials_bonus;
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

        {/* Team Filter Buttons (professionell ohne Tier-Emojis) */}
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
            A-Team
          </button>
          <button
            onClick={() => setFilterTeam('B-Team')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filterTeam === 'B-Team'
                ? 'bg-slate-400/20 text-slate-200 border border-slate-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            B-Team
          </button>
        </div>
      </div>

      {/* Exakte Tabelle wie auf dem Bild */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
              <th
                onClick={() => handleSort('rank')}
                className="py-3 px-3 cursor-pointer hover:text-white w-10"
              >
                #
              </th>
              <th
                onClick={() => handleSort('player_name')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                SPIELER
              </th>
              <th
                onClick={() => handleSort('match_count')}
                className="py-3 px-3 text-center cursor-pointer hover:text-white"
              >
                SPIELE
              </th>
              <th
                onClick={() => handleSort('pts_win_w')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white text-slate-400 font-bold"
              >
                SIEG (50%)
              </th>
              <th
                onClick={() => handleSort('pts_avg_w')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white text-slate-400 font-bold"
              >
                AVG (20%)
              </th>
              <th
                onClick={() => handleSort('pts_9_18_w')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white text-slate-400 font-bold"
              >
                9/18D (15%)
              </th>
              <th
                onClick={() => handleSort('pts_scores_w')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white text-slate-400 font-bold"
              >
                SCORES (15%)
              </th>
              <th
                onClick={() => handleSort('total_specials_bonus')}
                className="py-3 px-3 text-right cursor-pointer text-emerald-400 font-extrabold"
              >
                SPECIALS
              </th>
              <th
                onClick={() => handleSort('final_rating')}
                className="py-3 px-4 text-right cursor-pointer text-cyan-400 font-black tracking-wide"
              >
                GESAMT
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-medium">
            {sorted.map((p) => {
              const specStr =
                p.total_specials_bonus > 0
                  ? `+${p.total_specials_bonus.toFixed(2)}`
                  : '-';

              return (
                <tr
                  key={p.player_name}
                  className="hover:bg-white/[0.03] transition-colors"
                >
                  <td className="py-3.5 px-3 font-black text-slate-400 text-sm">
                    {p.rank}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar
                        name={p.player_name}
                        size={32}
                        borderColor="#334155"
                      />
                      <span className="font-bold text-white text-sm">
                        {p.player_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-300 font-semibold text-sm">
                    {p.match_count}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-300 font-semibold text-sm">
                    {p.pts_win_w.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-300 font-semibold text-sm">
                    {p.pts_avg_w.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-300 font-semibold text-sm">
                    {p.pts_9_18_w.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-300 font-semibold text-sm">
                    {p.pts_scores_w.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                    {specStr}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-cyan-400 text-base">
                    {p.final_rating.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Fußzeile mit offizieller Formel-Erklärung */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div>
          <span className="font-bold text-slate-300">Formel: </span>
          <span className="italic">
            Gesamt = Sieg (50%) + Avg (20%) + 9/18D (15%) + Scores (15%) + Specials
          </span>
        </div>
        <div className="text-slate-400">
          Max. Basiswertung pro Spiel:{' '}
          <span className="font-bold text-slate-200">6,45 Pkt</span> (+ Specials)
        </div>
      </div>
    </div>
  );
}
