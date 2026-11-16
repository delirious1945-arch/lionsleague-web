'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PlayerAvatar from '@/components/PlayerAvatar';
import PlayerPulseAmpel from '@/components/PlayerPulseAmpel';
import type { DoublesMatchRow } from '@/lib/data';
import { PlayerTrainingDoublesStats } from '@/lib/playerDoublesStats';
import { computePlayerPulse, getPlayerDoublesHistory } from '@/lib/playerKeyFacts';
import { Target } from 'lucide-react';

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
  scores_80?: number;
  scores_100?: number;
  scores_140?: number;
  scores_180?: number;
  short_legs?: number;
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
  doublesMatches,
  doublesByPlayer,
  availableSeasons,
  selectedSeason,
  initialPlayerName,
  loggedInPlayerName,
  trainingDoublesStats,
}: {
  players: PlayerProfile[];
  matchesByPlayer: Record<string, MatchHistoryItem[]>;
  doublesMatches: DoublesMatchRow[];
  doublesByPlayer: Record<string, DoubleSpecialItem[]>;
  availableSeasons: string[];
  selectedSeason: string;
  initialPlayerName?: string;
  loggedInPlayerName?: string;
  trainingDoublesStats?: Record<string, PlayerTrainingDoublesStats>;
}) {
  const [teamFilter, setTeamFilter] = useState<'all' | 'A-Team' | 'B-Team'>('all');

  const filteredPlayers = players.filter((p) => {
    if (teamFilter === 'all') return p.team === 'A-Team' || p.team === 'B-Team';
    return p.team === teamFilter;
  });

  const normalizeName = (name: string) => name.normalize('NFC').trim().toLowerCase();

  const resolveTargetPlayerName = (target?: string): string => {
    for (const candidate of [target, initialPlayerName, loggedInPlayerName]) {
      if (!candidate) continue;
      const norm = normalizeName(candidate);
      const match = players.find((p) => normalizeName(p.name) === norm);
      if (match) return match.name;
    }
    return filteredPlayers.length > 0 ? filteredPlayers[0].name : players[0]?.name || '';
  };

  const [selectedPlayerName, setSelectedPlayerName] = useState<string>(() =>
    resolveTargetPlayerName(initialPlayerName)
  );

  useEffect(() => {
    const targetName = resolveTargetPlayerName(initialPlayerName);
    if (targetName) {
      const targetPlayer = players.find((p) => p.name === targetName);
      if (targetPlayer && teamFilter !== 'all' && targetPlayer.team !== teamFilter) {
        setTeamFilter('all');
      }
      setSelectedPlayerName(targetName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlayerName]);

  const currentPlayer =
    players.find((p) => p.name === selectedPlayerName) ||
    filteredPlayers[0] ||
    players[0];

  const pMatches = useMemo(
    () => (currentPlayer ? matchesByPlayer[currentPlayer.name] || [] : []),
    [currentPlayer, matchesByPlayer]
  );
  const pDoubles = useMemo(
    () => (currentPlayer ? doublesByPlayer[currentPlayer.name] || [] : []),
    [currentPlayer, doublesByPlayer]
  );

  const pDoublesHistory = useMemo(
    () =>
      currentPlayer
        ? getPlayerDoublesHistory(currentPlayer.id, currentPlayer.name, doublesMatches)
        : [],
    [currentPlayer, doublesMatches]
  );

  const currentTrainingStats = useMemo(() => {
    if (!currentPlayer || !trainingDoublesStats) return null;
    return trainingDoublesStats[normalizeName(currentPlayer.name)] || null;
  }, [currentPlayer, trainingDoublesStats]);

  const pulse = useMemo(
    () =>
      computePlayerPulse({
        playerName: currentPlayer?.name || '',
        singleMatches: pMatches,
        doublesHistory: pDoublesHistory,
        doublesSpecialsCount: pDoubles.length,
        trainingStats: currentTrainingStats,
      }),
    [currentPlayer, pMatches, pDoublesHistory, pDoubles.length, currentTrainingStats]
  );

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

  const highestFinish = pMatches.reduce(
    (max, m) => (m.high_finish > max ? m.high_finish : max),
    0
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Version 2.0 Badge */}
      <div className="flex items-center justify-between text-xs pb-1">
        <div className="flex items-center gap-2">
          <Link
            href="/?mode=ranking"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-cyan-400 bg-slate-900/80 hover:bg-slate-800 border border-white/10 px-3 py-1.5 rounded-xl transition-all font-bold text-xs shadow-sm"
          >
            <span>←</span> Zurück zum Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-semibold px-2 py-1 transition-colors"
          >
            <span>🔄</span> Hauptmenü
          </Link>
        </div>
        <span className="text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded font-mono">
          VERSION 2.0
        </span>
      </div>

      {/* Title & Season Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">

        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span>👤</span> Spieler-Steckbrief & Match-Logbuch
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Dein kompaktes Spieler-Cockpit mit 6 Key Facts, Leistungs-Ampel sowie Einzel- und Doppel-Historie.
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
                  const keepCurrent = nextPlayers.find(
                    (p) => normalizeName(p.name) === normalizeName(selectedPlayerName)
                  );
                  if (keepCurrent) {
                    setSelectedPlayerName(keepCurrent.name);
                  } else {
                    const keepLoggedIn = loggedInPlayerName
                      ? nextPlayers.find(
                          (p) => normalizeName(p.name) === normalizeName(loggedInPlayerName)
                        )
                      : undefined;
                    setSelectedPlayerName(keepLoggedIn ? keepLoggedIn.name : nextPlayers[0].name);
                  }
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
              {currentTrainingStats && currentTrainingStats.hasTrainingData && (
                <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-bold font-mono shadow-sm">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span>Empirische Doppelquote: <strong className="text-white">{currentTrainingStats.totalDoubleQuote.toFixed(1)}%</strong> ({currentTrainingStats.totalDoubleHits}/{currentTrainingStats.totalDoubleDarts} Darts)</span>
                  </span>
                </div>
              )}
            </div>

            {/* Option B: Klare Trennung - Direktlink zur DAE Tiefen-Diagnostik */}
            <div className="shrink-0">
              <Link
                href={`/analytics?player=${encodeURIComponent(currentPlayer.name)}`}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/45 text-cyan-200 hover:text-white font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-950/30"
              >
                <span>🔬 Zur DAE Tiefen-Diagnostik & Radar →</span>
              </Link>
            </div>
          </div>

          {/* 3-Säulen-Ampel & 6 Key Facts (Vorschlag 3 + Option C) */}
          <PlayerPulseAmpel
            playerName={currentPlayer.name}
            columns={pulse.columns}
          />

          {/* 6 kompakte Saison-KPIs */}
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

            {/* 2. Einzel-Average */}
            <div className="bg-[#0b1428] border border-white/10 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Einzel-Avg
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

            {/* 4. Doppel-Werfer-Avg / Bilanz */}
            <div className="bg-[#0b1428] border border-white/10 rounded-xl p-4 text-center">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Doppel-Avg / Bilanz
              </div>
              <div className="text-2xl font-black text-amber-300 mt-1">
                {pulse.doublesSummary.myAvg !== null
                  ? pulse.doublesSummary.myAvg.toFixed(1)
                  : pulse.doublesSummary.games > 0
                  ? `${pulse.doublesSummary.wins} / ${pulse.doublesSummary.games}`
                  : '-'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {pulse.doublesSummary.myAvg !== null
                  ? `Werfer-Ø · ${pulse.doublesSummary.wins}/${pulse.doublesSummary.games} Siege`
                  : pulse.doublesSummary.games > 0
                  ? `Paar-Ø ${pulse.doublesSummary.pairAvg.toFixed(1)}`
                  : 'Kein Doppel'}
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

          {/* Doppel-Matches Historie & 100%-Werfer-Auswertung */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🤝</span> Doppel-Matches Historie & Einzelwerfer-Daten
              </h3>
              <span className="text-[11px] font-semibold text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                Info: Fließt nicht ins Einzel-Ranking ein
              </span>
            </div>

            {pDoublesHistory.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-slate-400 text-sm">
                Für diesen Spieler liegen in dieser Saison noch keine Doppel-Ligapartien vor.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#081022]">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-cyan-400">
                      <th className="p-3">Datum</th>
                      <th className="p-3">Partner</th>
                      <th className="p-3">Gegner</th>
                      <th className="p-3 text-center">Ergebnis</th>
                      <th className="p-3 text-right">Paar-Avg</th>
                      <th className="p-3 text-right">Mein Werfer-Avg</th>
                      <th className="p-3 text-right">First-9 / Darts</th>
                      <th className="p-3 text-center">Scores & Checks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pDoublesHistory.map((d) => (
                      <tr key={d.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-medium text-slate-300 whitespace-nowrap">
                          {d.match_date}
                        </td>
                        <td className="p-3 font-semibold text-cyan-200 whitespace-nowrap">
                          {d.partner_name}
                        </td>
                        <td className="p-3 text-white font-medium whitespace-nowrap">
                          {d.opponent}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-black ${
                              d.is_win
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {d.legs_won}:{d.legs_lost} {d.is_win ? 'Sieg' : 'Ndlg'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium text-slate-400 whitespace-nowrap">
                          {d.pair_avg.toFixed(1)}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {d.has_individual_stats && d.my_avg !== null ? (
                            <span className="font-black text-cyan-300 bg-cyan-500/15 border border-cyan-400/30 px-2 py-0.5 rounded">
                              {d.my_avg.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Alt-Softw.</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-slate-300 whitespace-nowrap font-mono text-xs">
                          {d.has_individual_stats ? (
                            <span>
                              {d.my_first9_avg ? d.my_first9_avg.toFixed(1) : '-'}
                              <span className="text-slate-500"> / {d.my_darts ?? '-'}D</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {d.has_individual_stats ? (
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold">
                              {d.my_checkouts > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  ✓ {d.my_checkouts}× Check
                                </span>
                              )}
                              {d.my_scores_180 > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  180×{d.my_scores_180}
                                </span>
                              )}
                              {d.my_scores_140 > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                                  140+×{d.my_scores_140}
                                </span>
                              )}
                              {d.my_scores_100 > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                                  100+×{d.my_scores_100}
                                </span>
                              )}
                              {d.my_checkouts === 0 &&
                                d.my_scores_180 === 0 &&
                                d.my_scores_140 === 0 &&
                                d.my_scores_100 === 0 && (
                                  <span className="text-slate-500">-</span>
                                )}
                            </div>
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
                <span>⭐</span> Im Doppel geworfene Specials (+0,5 Pkt Bonus)
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
