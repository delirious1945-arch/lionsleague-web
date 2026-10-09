'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PlayerAvatar from '@/components/PlayerAvatar';

interface PlayerProfile {

  id: number;
  name: string;
  team: string;
}

interface MatchHistoryItem {
  id: number;
  match_date: string;
  opponent: string;
  legs_won: number;
  legs_lost: number;
  is_win: boolean;
  rating: number;
  avg_total: number;
  avg_9: number;
  avg_18: number;
  specials_count: number;
  scores_total: number;
  high_finish: number;
}

interface DoubleSpecialItem {
  id: number;
  match_date: string;
  special_type: string;
  partner_name: string;
  opponent_team: string;
  description: string;
}

export default function PlayerClient({
  players,
  matchesByPlayer,
  doublesByPlayer,
  availableSeasons,
  selectedSeason,
}: {
  players: PlayerProfile[];
  matchesByPlayer: Record<string, MatchHistoryItem[]>;
  doublesByPlayer: Record<string, DoubleSpecialItem[]>;
  availableSeasons: string[];
  selectedSeason: string;
}) {
  const [teamFilter, setTeamFilter] = useState<'all' | 'A-Team' | 'B-Team'>('all');

  const filteredPlayers = players.filter((p) => {
    if (teamFilter === 'all') return p.team === 'A-Team' || p.team === 'B-Team';
    return p.team === teamFilter;
  });

  const [selectedPlayerName, setSelectedPlayerName] = useState<string>(
    filteredPlayers.length > 0 ? filteredPlayers[0].name : players[0]?.name || ''
  );

  const currentPlayer =
    players.find((p) => p.name === selectedPlayerName) ||
    filteredPlayers[0] ||
    players[0];

  const pMatches = currentPlayer ? matchesByPlayer[currentPlayer.name] || [] : [];
  const pDoubles = currentPlayer ? doublesByPlayer[currentPlayer.name] || [] : [];

  // Berechnungen
  const matchCount = pMatches.length;
  const winsCount = pMatches.filter((m) => m.is_win).length;
  const singlesSpecials = pMatches.reduce((acc, m) => acc + m.specials_count, 0);
  const doublesSpecials = pDoubles.length;
  const doublesBonus = doublesSpecials * 0.5;

  const avgTotal =
    matchCount > 0
      ? pMatches.reduce((acc, m) => acc + m.avg_total, 0) / matchCount
      : 0;

  // Base rating mean + specials
  const avgBaseRating =
    matchCount > 0
      ? pMatches.reduce((acc, m) => acc + m.rating, 0) / matchCount
      : 0;
  const totalPoints = avgBaseRating + singlesSpecials * 0.5 + doublesBonus;

  const totalScores = pMatches.reduce((acc, m) => acc + m.scores_total, 0);
  const totalLegs = pMatches.reduce((acc, m) => acc + m.legs_won + m.legs_lost, 0);
  const avgScoresPerLeg = totalLegs > 0 ? totalScores / totalLegs : 0;

  const highestFinish = pMatches.reduce(
    (max, m) => (m.high_finish > max ? m.high_finish : max),
    0
  );

  return (
    <div className="space-y-6 animate-fadeIn">
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

      {/* Title & Season Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">

        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span>👤</span> Spielerprofil & Performance-Analyse
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Einzelauswertung aller Lions-Darter inklusive Match-Historie und Specials.
          </p>
        </div>

        <form method="GET" action="/spieler">
          <label className="text-xs text-slate-400 block mb-1">📅 Saison</label>
          <select
            name="season"
            defaultValue={selectedSeason}
            onChange={(e) => e.target.form?.submit()}
            className="bg-slate-900 border border-white/15 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400"
          >
            {availableSeasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </form>
      </div>

      {/* Filter & Selector Bar */}
      <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Team Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">
            Team:
          </span>
          {(['all', 'A-Team', 'B-Team'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTeamFilter(t);
                const nextPlayers = players.filter((p) =>
                  t === 'all'
                    ? p.team === 'A-Team' || p.team === 'B-Team'
                    : p.team === t
                );
                if (nextPlayers.length > 0) {
                  setSelectedPlayerName(nextPlayers[0].name);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                teamFilter === t
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {t === 'all' ? 'Alle Teams' : t}
            </button>
          ))}
        </div>

        {/* Player Dropdown */}
        <div className="flex items-center gap-3">
          <label htmlFor="player-select" className="text-xs font-bold text-slate-400 whitespace-nowrap">
            Spieler wählen:
          </label>
          <select
            id="player-select"
            value={selectedPlayerName}
            onChange={(e) => setSelectedPlayerName(e.target.value)}
            className="bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 min-w-[220px]"
          >
            {filteredPlayers.map((p) => (
              <option key={p.id} value={p.name} className="bg-slate-900 text-white font-medium">
                {p.name} ({p.team})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentPlayer && (
        <>
          {/* Player Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#0c1833] via-[#08152b] to-[#050b18] border border-cyan-500/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-cyan-950/20">
            {/* Player Avatar */}
            <div className="shrink-0">
              <PlayerAvatar
                name={currentPlayer.name}
                size={144}
                borderColor="#38bdf8"
                className="shadow-2xl shadow-cyan-500/20"
              />
            </div>

            {/* Player Details */}
            <div className="text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold mb-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {currentPlayer.team === 'A-Team'
                  ? 'A-Team (2. Kreisklasse Staffel 07)'
                  : 'B-Team (2. Kreisklasse Staffel 11)'}
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {currentPlayer.name}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Eingetragener Darter beim SC Weyhausen von 1921 e.V.
              </p>
            </div>
          </div>

          {/* 6 Metric KPI Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Gesamt-Punkte */}
            <div className="bg-[#0b1428] border border-cyan-500/30 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Gesamt-Punkte
              </div>
              <div className="text-2xl font-black text-cyan-400 mt-1">
                {totalPoints > 0 ? totalPoints.toFixed(2) : '0.00'} Pkt
              </div>
              {doublesBonus > 0 && (
                <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                  +{doublesBonus.toFixed(1)} Doppel
                </div>
              )}
            </div>

            {/* 2. Gesamt-Average */}
            <div className="bg-[#0b1428] border border-white/10 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Gesamt-Avg
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {avgTotal > 0 ? avgTotal.toFixed(1) : '-'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">3-Dart Schnitt</div>
            </div>

            {/* 3. Einzel-Bilanz */}
            <div className="bg-[#0b1428] border border-white/10 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Einzel-Bilanz
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {winsCount} / {matchCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {matchCount > 0
                  ? `${Math.round((winsCount / matchCount) * 100)}% Siegquote`
                  : '0%'}
              </div>
            </div>

            {/* 4. Scores / Leg */}
            <div className="bg-[#0b1428] border border-white/10 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ø Scores / Leg
              </div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {avgScoresPerLeg > 0 ? avgScoresPerLeg.toFixed(2) : '-'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {totalScores}x Scores 80+
              </div>
            </div>

            {/* 5. Höchstes Finish */}
            <div className="bg-[#0b1428] border border-white/10 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Höchstes Finish
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {highestFinish > 0 ? highestFinish : '-'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">High Checkout</div>
            </div>

            {/* 6. Specials Gesamt */}
            <div className="bg-[#0b1428] border border-white/10 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Specials
              </div>
              <div className="text-2xl font-black text-cyan-300 mt-1">
                {singlesSpecials + doublesSpecials}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {singlesSpecials} E / {doublesSpecials} D
              </div>
            </div>
          </div>

          {/* Einzel-Matches Historie Table */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🎯</span> Einzel-Matches Historie
            </h3>

            {pMatches.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-slate-400">
                Für diesen Spieler liegen aktuell noch keine absolvierten Einzel-Matches vor.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#081022]">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-cyan-400">
                      <th className="p-3">Datum</th>
                      <th className="p-3">Gegner</th>
                      <th className="p-3 text-center">Ergebnis</th>
                      <th className="p-3 text-right">Punkte</th>
                      <th className="p-3 text-right">Gesamt Avg</th>
                      <th className="p-3 text-right">9D Avg</th>
                      <th className="p-3 text-right">18D Avg</th>
                      <th className="p-3 text-center">Specials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pMatches.map((m) => (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-medium text-slate-300 whitespace-nowrap">
                          {m.match_date}
                        </td>
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          {m.opponent}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-black ${
                              m.is_win
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {m.legs_won}:{m.legs_lost} {m.is_win ? 'Sieg' : 'Ndlg'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-cyan-400 whitespace-nowrap">
                          {m.rating.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-200 whitespace-nowrap">
                          {m.avg_total.toFixed(1)}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-400 whitespace-nowrap">
                          {m.avg_9.toFixed(1)}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-400 whitespace-nowrap">
                          {m.avg_18.toFixed(1)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {m.specials_count > 0 ? (
                            <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded text-xs">
                              ⭐ {m.specials_count}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Doppel Specials Table */}
          {pDoubles.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🤝</span> Im Doppel geworfene Specials (+0,5 Pkt Bonus)
              </h3>
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#081022]">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-amber-400">
                      <th className="p-3">Datum</th>
                      <th className="p-3">Special Type</th>
                      <th className="p-3">Teampartner</th>
                      <th className="p-3">Gegner Team</th>
                      <th className="p-3">Anmerkungen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pDoubles.map((d) => (
                      <tr key={d.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-slate-300 whitespace-nowrap">
                          {d.match_date}
                        </td>
                        <td className="p-3 font-bold text-amber-300 whitespace-nowrap">
                          {d.special_type}
                        </td>
                        <td className="p-3 font-semibold text-white whitespace-nowrap">
                          {d.partner_name}
                        </td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {d.opponent_team}
                        </td>
                        <td className="p-3 text-slate-400 italic">
                          {d.description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
