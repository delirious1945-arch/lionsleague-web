'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnalyticsMatchItem, Player, Top26Player } from '@/lib/data';

export default function AnalyticsClient({
  matches,
  players,
  top26,
  availableSeasons,
  selectedSeason,
}: {
  matches: AnalyticsMatchItem[];
  players: Player[];
  top26: Top26Player[];
  availableSeasons: string[];
  selectedSeason: string;
}) {
  const [activeTab, setActiveTab] = useState<'matches' | 'scouting'>('matches');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>(
    players.length > 0 ? players[0].name : ''
  );

  const filteredMatches = matches.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.player_a_name.toLowerCase().includes(q) ||
      m.player_b_name.toLowerCase().includes(q) ||
      m.round_name.toLowerCase().includes(q)
    );
  });

  // Player scouting stats from analytics matches
  const playerMatchesA = matches.filter(
    (m) => m.player_a_name.toLowerCase() === selectedPlayerName.toLowerCase()
  );
  const playerMatchesB = matches.filter(
    (m) => m.player_b_name.toLowerCase() === selectedPlayerName.toLowerCase()
  );
  const totalAnalyticsMatches = playerMatchesA.length + playerMatchesB.length;
  const playerTop26 = top26.find(
    (t) => t.player_name.toLowerCase() === selectedPlayerName.toLowerCase()
  );

  return (
    <div className="space-y-6 animate-fadeIn py-2">
      {/* Top Breadcrumb & Version 2.0 Badge */}
      <div className="flex items-center justify-between text-xs pb-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors font-semibold"
        >
          <span>←</span> Zurück zum Dashboard
        </Link>
        <span className="text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded font-mono">
          VERSION 2.0
        </span>
      </div>

      {/* Header Banner */}

      <div className="relative overflow-hidden bg-gradient-to-r from-[#071329] via-[#091b38] to-[#050e1f] border border-cyan-500/40 rounded-2xl p-6 shadow-xl shadow-cyan-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎯</span>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              DART ANALYTICS ENGINE (DAE)
            </h1>
          </div>
          <p className="text-cyan-400 text-xs md:text-sm font-semibold">
            Deterministische Steel-Dart Leistungsdiagnostik • Einzelanalyse & Match-Archiv
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-cyan-500/15 border border-cyan-400 text-cyan-300 font-extrabold text-xs px-3.5 py-1.5 rounded-lg shadow-sm shadow-cyan-400/20">
            🟢 ENGINE V1.2
          </span>

          <form method="GET" action="/analytics">
            <select
              name="season"
              defaultValue={selectedSeason}
              onChange={(e) => e.target.form?.submit()}
              className="bg-slate-900 border border-white/15 text-white text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-400"
            >
              {availableSeasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </form>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'matches'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>🚀</span> Aufgenommene Matches ({matches.length})
        </button>

        <button
          onClick={() => setActiveTab('scouting')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'scouting'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>👤</span> Spieler-Diagnostik
        </button>
      </div>

      {/* TAB 1: Aufgenommene Matches */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> Alle archivierten DAE-Matches
            </h2>
            <input
              type="text"
              placeholder="Spieler oder Runde suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-white/15 text-white text-xs rounded-xl px-3.5 py-2 w-full sm:w-64 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {filteredMatches.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-slate-400">
              Keine Matches gefunden.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#081022]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-cyan-400">
                    <th className="p-3">ID</th>
                    <th className="p-3">Datum</th>
                    <th className="p-3">Spieler A</th>
                    <th className="p-3 text-center">VS</th>
                    <th className="p-3">Spieler B</th>
                    <th className="p-3 text-center">Spieldauer</th>
                    <th className="p-3">Format / Runde</th>
                    <th className="p-3 text-right">Saison</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMatches.map((m) => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-slate-500 font-mono text-xs">#{m.id}</td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">
                        {m.match_date
                          ? new Date(m.match_date).toLocaleDateString('de-DE')
                          : '-'}
                      </td>
                      <td className="p-3 font-bold text-white whitespace-nowrap">
                        {m.player_a_name}
                      </td>
                      <td className="p-3 text-center text-cyan-400 font-bold text-xs whitespace-nowrap">
                        vs.
                      </td>
                      <td className="p-3 font-bold text-white whitespace-nowrap">
                        {m.player_b_name}
                      </td>
                      <td className="p-3 text-center text-slate-400 whitespace-nowrap">
                        {m.duration_min > 0 ? `${m.duration_min} Min` : '-'}
                      </td>
                      <td className="p-3 text-slate-300 whitespace-nowrap text-xs">
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {m.round_name} (Bo{m.best_of_legs})
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-400 whitespace-nowrap text-xs">
                        {m.season}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Spieler-Diagnostik */}
      {activeTab === 'scouting' && (
        <div className="space-y-6">
          <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label htmlFor="diag-player-select" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Spieler für Diagnostik wählen:
              </label>
              <select
                id="diag-player-select"
                value={selectedPlayerName}
                onChange={(e) => setSelectedPlayerName(e.target.value)}
                className="bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold text-sm rounded-xl px-4 py-2.5 min-w-[260px] focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.name} className="bg-slate-900 text-white font-medium">
                    {p.team === 'A-Team' ? '🦁 ' : '🐯 '}
                    {p.name} ({p.team})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">DAE-Status:</span>
              <span className="text-sm font-bold text-emerald-400">
                {totalAnalyticsMatches > 0
                  ? `✅ ${totalAnalyticsMatches} Matches mit Aufnahmedaten`
                  : 'ℹ️ Noch keine detaillierten Aufnahmen'}
              </span>
            </div>
          </div>

          {/* Player Diagnostik Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0b1428] border border-cyan-500/30 rounded-xl p-5 text-center">
              <div className="text-xs font-bold text-slate-400 uppercase">
                DAE Matches
              </div>
              <div className="text-3xl font-black text-cyan-400 mt-2">
                {totalAnalyticsMatches}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Detailliert erfasst</div>
            </div>

            <div className="bg-[#0b1428] border border-amber-500/30 rounded-xl p-5 text-center">
              <div className="text-xs font-bold text-slate-400 uppercase">
                👑 26er Visits
              </div>
              <div className="text-3xl font-black text-amber-400 mt-2">
                {playerTop26 ? playerTop26.count_26 : 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {playerTop26 ? 'Geworfene 26er (T1-1-5)' : 'Keine 26er erfasst'}
              </div>
            </div>

            <div className="bg-[#0b1428] border border-emerald-500/30 rounded-xl p-5 text-center">
              <div className="text-xs font-bold text-slate-400 uppercase">
                Analyse-Level
              </div>
              <div className="text-3xl font-black text-emerald-400 mt-2">
                {totalAnalyticsMatches >= 5 ? 'A+' : totalAnalyticsMatches > 0 ? 'B' : 'Basis'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Stichprobengüte</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
