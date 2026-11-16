'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Handshake,
  Info,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import type {
  AnalyzedDoublesMatch,
  DoublesPairSummary,
  DoublesThrowerLeaderboardEntry,
  SynergyTone,
  ThrowerMatchBreakdown,
} from '@/lib/doublesAnalytics';

interface SimplePlayer {
  id: number;
  name: string;
  team: string;
}

type DoppelTab = 'matches' | 'throwers' | 'pairs';

function normalizeName(name: string): string {
  return name.normalize('NFC').trim().toLowerCase();
}

function getRatingBadgeClass(status: 'green' | 'yellow' | 'red'): string {
  if (status === 'green') {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40';
  }
  if (status === 'yellow') {
    return 'bg-amber-500/20 text-amber-300 border-amber-400/40';
  }
  return 'bg-rose-500/20 text-rose-300 border-rose-400/40';
}

function getSynergyBadgeClass(tone: SynergyTone): string {
  switch (tone) {
    case 'emerald':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35';
    case 'cyan':
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35';
    case 'amber':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/35';
    default:
      return 'bg-white/5 text-slate-400 border-white/15';
  }
}

function ThrowerCard({
  breakdown,
  partnerAvg,
  legsWon,
  accent,
}: {
  breakdown: ThrowerMatchBreakdown;
  partnerAvg: number;
  legsWon: number;
  accent: 'cyan' | 'indigo';
}) {
  const maxAvg = Math.max(breakdown.avg, partnerAvg, 60);
  const avgWidthPct = Math.min(
    100,
    Math.max(12, Math.round((breakdown.avg / maxAvg) * 100))
  );
  const borderClass =
    accent === 'cyan' ? 'border-cyan-500/30' : 'border-indigo-500/30';
  const barClass =
    accent === 'cyan'
      ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
      : 'bg-gradient-to-r from-indigo-500 to-cyan-400';

  return (
    <div
      className={`rounded-xl bg-[#071022] border ${borderClass} p-3.5 space-y-2.5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/spieler?player=${encodeURIComponent(breakdown.playerName)}`}
            className="font-extrabold text-sm text-white hover:text-cyan-300 transition-colors"
          >
            {breakdown.playerName}
          </Link>
          {breakdown.isScoringLeader && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              ⚡ Scoring-Leader
            </span>
          )}
          {breakdown.isCloser && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              🎯 Closer
            </span>
          )}
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mr-1.5">
            Werfer-Index
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-white/10 text-cyan-300 font-mono text-xs font-black border border-white/15">
            {breakdown.individualIndex.toFixed(2)} Pkt
          </span>
        </div>
      </div>

      {/* Avg Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-slate-400 font-semibold">3-Dart-Avg im Doppel</span>
          <span className="text-base font-black text-white font-mono">
            {breakdown.avg.toFixed(2)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${barClass}`}
            style={{ width: `${avgWidthPct}%` }}
          />
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
        <div className="rounded-lg bg-white/5 px-2 py-1.5 border border-white/5">
          <div className="text-[10px] text-slate-400">First-9</div>
          <div className="font-extrabold text-slate-100 font-mono">
            {breakdown.first9Avg > 0 ? breakdown.first9Avg.toFixed(1) : '-'}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1.5 border border-white/5">
          <div className="text-[10px] text-slate-400">Darts</div>
          <div className="font-extrabold text-slate-100 font-mono">
            {breakdown.darts > 0 ? breakdown.darts : '-'}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1.5 border border-white/5">
          <div className="text-[10px] text-slate-400">Checkouts</div>
          <div className="font-extrabold text-emerald-300 font-mono">
            {breakdown.checkouts}/{legsWon}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1.5 border border-white/5">
          <div className="text-[10px] text-slate-400">Scores 80+</div>
          <div className="font-extrabold text-amber-300 font-mono">
            {breakdown.scoresTotal}
          </div>
        </div>
      </div>

      {/* High Score Detail Pills + Closer Breakdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {breakdown.scores80 > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-semibold">
              80+ × {breakdown.scores80}
            </span>
          )}
          {breakdown.scores100 > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-semibold">
              100+ × {breakdown.scores100}
            </span>
          )}
          {breakdown.scores140 > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
              140+ × {breakdown.scores140}
            </span>
          )}
          {breakdown.scores180 > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              180 × {breakdown.scores180}
            </span>
          )}
          {breakdown.scoresTotal === 0 && (
            <span className="text-slate-500 italic">Keine 80+ Scores</span>
          )}
        </div>
        {breakdown.closerBonus > 0 && (
          <span className="text-emerald-300 font-bold">
            +{breakdown.closerBonus.toFixed(2).replace('.', ',')} Closer
          </span>
        )}
      </div>
    </div>
  );
}

export default function DoppelClient({
  analyzedMatches,
  throwerLeaderboard,
  pairSummaries,
  players,
  availableSeasons,
  selectedSeason,
  loggedInPlayerName,
  initialTeamFilter,
  initialPlayerFilter,
}: {
  analyzedMatches: AnalyzedDoublesMatch[];
  throwerLeaderboard: DoublesThrowerLeaderboardEntry[];
  pairSummaries: DoublesPairSummary[];
  players: SimplePlayer[];
  availableSeasons: string[];
  selectedSeason: string;
  loggedInPlayerName?: string;
  initialTeamFilter?: string;
  initialPlayerFilter?: string;
}) {
  const [teamFilter, setTeamFilter] = useState<'all' | 'A-Team' | 'B-Team'>(
    initialTeamFilter === 'A-Team' || initialTeamFilter === 'B-Team'
      ? initialTeamFilter
      : 'all'
  );
  const [playerFilter, setPlayerFilter] = useState<string>(
    initialPlayerFilter || 'all'
  );
  const [onlyTracked, setOnlyTracked] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DoppelTab>('matches');
  const [showScoringConcept, setShowScoringConcept] = useState<boolean>(true);
  const [expandedMatchIds, setExpandedMatchIds] = useState<Record<number, boolean>>(
    () => {
      const defaults: Record<number, boolean> = {};
      for (const m of analyzedMatches) {
        if (m.hasIndividualStats) defaults[m.id] = true;
      }
      return defaults;
    }
  );

  const normLoggedIn = loggedInPlayerName ? normalizeName(loggedInPlayerName) : '';
  const normPlayerFilter =
    playerFilter !== 'all' ? normalizeName(playerFilter) : '';

  const filteredMatches = useMemo(() => {
    return analyzedMatches.filter((m) => {
      if (teamFilter !== 'all' && m.team !== teamFilter) return false;
      if (onlyTracked && !m.hasIndividualStats) return false;
      if (normPlayerFilter) {
        const p1 = normalizeName(m.p1Name);
        const p2 = normalizeName(m.p2Name);
        if (p1 !== normPlayerFilter && p2 !== normPlayerFilter) return false;
      }
      return true;
    });
  }, [analyzedMatches, teamFilter, onlyTracked, normPlayerFilter]);

  const filteredThrowers = useMemo(() => {
    return throwerLeaderboard.filter((t) => {
      if (teamFilter !== 'all' && t.team !== teamFilter) return false;
      if (onlyTracked && t.gamesTracked === 0) return false;
      if (normPlayerFilter && normalizeName(t.playerName) !== normPlayerFilter) {
        return false;
      }
      return true;
    });
  }, [throwerLeaderboard, teamFilter, onlyTracked, normPlayerFilter]);

  const filteredPairs = useMemo(() => {
    return pairSummaries.filter((p) => {
      if (teamFilter !== 'all' && p.team !== teamFilter) return false;
      if (onlyTracked && p.trackedGames === 0) return false;
      if (normPlayerFilter) {
        const pA = normalizeName(p.playerAName);
        const pB = normalizeName(p.playerBName);
        if (pA !== normPlayerFilter && pB !== normPlayerFilter) return false;
      }
      return true;
    });
  }, [pairSummaries, teamFilter, onlyTracked, normPlayerFilter]);

  // Dynamische Hero-KPIs passend zum aktiven Filter
  const kpiStats = useMemo(() => {
    const total = filteredMatches.length;
    const wins = filteredMatches.filter((m) => m.isWin).length;
    const legsWon = filteredMatches.reduce((acc, m) => acc + m.legsWon, 0);
    const legsLost = filteredMatches.reduce((acc, m) => acc + m.legsLost, 0);
    const trackedCount = filteredMatches.filter((m) => m.hasIndividualStats).length;
    const winRatePct = total > 0 ? Math.round((wins / total) * 100) : 0;

    // Stärkstes Duo (mind. 2 gemeinsame Spiele bevorzugt, sonst bestes Duo)
    const eligiblePairs =
      filteredPairs.filter((p) => p.games >= 2).length > 0
        ? filteredPairs.filter((p) => p.games >= 2)
        : filteredPairs;
    const topPair = eligiblePairs.length > 0 ? eligiblePairs[0] : null;

    // Top-Einzelwerfer mit 100%-Daten
    const trackedThrowers = filteredThrowers.filter((t) => t.trackedAvg !== null);
    const topThrower = trackedThrowers.length > 0 ? trackedThrowers[0] : null;

    return {
      total,
      wins,
      legsWon,
      legsLost,
      winRatePct,
      trackedCount,
      trackedPct: total > 0 ? Math.round((trackedCount / total) * 100) : 0,
      topPair,
      topThrower,
    };
  }, [filteredMatches, filteredPairs, filteredThrowers]);

  const toggleMatchExpand = (id: number) => {
    setExpandedMatchIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isMyFilterActive =
    Boolean(normLoggedIn) && normPlayerFilter === normLoggedIn;

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

      {/* Page Header & Season Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span>🤝</span> Doppel-Analyse & Spielwertung
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Einzelspiel-Wertung, Paar-Synergie und 100%-Einzelwerfer-Tracking für alle Lions-Doppelpartien.
          </p>
        </div>

        <form method="GET" action="/doppel">
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

      {/* Filter Bar */}
      <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider">
            Team:
          </span>
          {(['all', 'A-Team', 'B-Team'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTeamFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                teamFilter === t
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {t === 'all' ? 'Alle Teams' : t}
            </button>
          ))}

          {loggedInPlayerName && (
            <button
              onClick={() =>
                setPlayerFilter(isMyFilterActive ? 'all' : loggedInPlayerName)
              }
              className={`ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isMyFilterActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                  : 'bg-white/5 text-slate-300 hover:text-white border-white/10'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Meine Doppel ({loggedInPlayerName.split(' ')[0]})</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setOnlyTracked((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              onlyTracked
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Nur 100%-Einzelwerfer</span>
          </button>

          <div className="flex items-center gap-2">
            <label
              htmlFor="doppel-player-filter"
              className="text-xs font-bold text-slate-400 whitespace-nowrap"
            >
              Spieler:
            </label>
            <select
              id="doppel-player-filter"
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value)}
              className="bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs sm:text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 min-w-[180px]"
            >
              <option value="all" className="bg-slate-900 text-white">
                Alle Spieler ({players.length})
              </option>
              {players.map((p) => (
                <option key={p.id} value={p.name} className="bg-slate-900 text-white">
                  {p.name} ({p.team})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Doppel-Bilanz */}
        <div className="bg-[#0b1428] border border-cyan-500/30 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Doppel-Bilanz</span>
            <Handshake className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {kpiStats.wins} / {kpiStats.total}{' '}
            <span className="text-sm font-bold text-emerald-400">
              ({kpiStats.winRatePct}%)
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Legs: <strong className="text-slate-200">{kpiStats.legsWon}:{kpiStats.legsLost}</strong>
          </div>
        </div>

        {/* KPI 2: Stärkstes Lions-Duo */}
        <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Top-Duo (Wertung)</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          {kpiStats.topPair ? (
            <>
              <div className="text-base font-black text-amber-300 truncate">
                {kpiStats.topPair.playerAName.split(' ')[0]} &{' '}
                {kpiStats.topPair.playerBName.split(' ')[0]}
              </div>
              <div className="text-xs text-slate-300">
                Ø Note <strong className="text-white">{kpiStats.topPair.avgPairRating.toFixed(2)}</strong> ·{' '}
                {kpiStats.topPair.wins}/{kpiStats.topPair.games} Siege · Avg{' '}
                {kpiStats.topPair.avgTotal.toFixed(1)}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500 pt-1">Keine Paarung</div>
          )}
        </div>

        {/* KPI 3: Stärkster Einzelwerfer (100%) */}
        <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Top-Werfer (100%)</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          {kpiStats.topThrower ? (
            <>
              <div className="text-base font-black text-emerald-300 truncate">
                {kpiStats.topThrower.playerName}
              </div>
              <div className="text-xs text-slate-300">
                Doppel-Avg{' '}
                <strong className="text-white">
                  {kpiStats.topThrower.trackedAvg?.toFixed(2)}
                </strong>{' '}
                · First-9{' '}
                <strong className="text-cyan-300">
                  {kpiStats.topThrower.trackedFirst9Avg?.toFixed(1) ?? '-'}
                </strong>{' '}
                · {kpiStats.topThrower.totalCheckouts} Checkouts
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 pt-1">
              Noch keine 100%-Spiele im Filter
            </div>
          )}
        </div>

        {/* KPI 4: 100%-Software-Tracking */}
        <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>100%-Einzelwerfer</span>
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300">
            {kpiStats.trackedCount} / {kpiStats.total}{' '}
            <span className="text-sm font-bold text-slate-400">
              ({kpiStats.trackedPct}%)
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Spiele mit exakter Werfer-Zuordnung
          </div>
        </div>
      </div>

      {/* Erklär- & Vorschlags-Banner: Lions Doppel-Wertungssystem */}
      <div className="bg-gradient-to-r from-[#0d1b36] via-[#0b152b] to-[#081022] border border-cyan-500/30 rounded-2xl p-4">
        <button
          onClick={() => setShowScoringConcept((v) => !v)}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-white flex flex-wrap items-center gap-2">
                <span>Vorschlag: Lions Doppel-Wertungssystem (vom Einzel-Ranking getrennt)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ✓ Kein Einfluss auf Einzel-Rangliste
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Faire Bewertung jedes Doppelspiels auf Paar-Ebene + individueller Werfer-Index bei 2K-Software-Spielen.
              </p>
            </div>
          </div>
          <span className="text-slate-400 shrink-0">
            {showScoringConcept ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {showScoringConcept && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/10 text-xs text-slate-300">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
              <div className="font-extrabold text-cyan-300 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> 1. Paar-Match-Note (0–7+ Pkt)
              </div>
              <p className="text-slate-400 leading-relaxed">
                Nutzt exakt den Lions-Schlüssel (50% Sieg, 20% Paar-Avg, 15% First-9 & 18D, 15% Scores/Leg + 0,5 Pkt je Doppel-Special) – vergleichbar über Alt- und Neu-Software.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
              <div className="font-extrabold text-emerald-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> 2. Individueller Werfer-Index
              </div>
              <p className="text-slate-400 leading-relaxed">
                Bei 100%-Zuordnung zählen dein eigener 3-Dart-Avg, First-9, auf Doppel-Aufnahmen normierte High Scores und{' '}
                <strong className="text-emerald-300">+0,15 Closer-Bonus</strong> pro eigenem Doppel-Checkout.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
              <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> 3. Rollen & Paar-Synergie
              </div>
              <p className="text-slate-400 leading-relaxed">
                Jedes 100%-Spiel erkennt automatisch{' '}
                <strong className="text-white">⚡ Scoring-Leader</strong>,{' '}
                <strong className="text-emerald-300">🎯 Closer</strong> sowie Duos ({' '}
                <em>High-Power Duo</em>, <em>Ausgeglichenes Duo</em>,{' '}
                <em>Zugpferd & Partner</em>).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main View Switcher Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'matches'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/15'
              : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <span>🔍</span>
          <span>Einzelspiel-Analyse & Wertung</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white">
            {filteredMatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('throwers')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'throwers'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-lg shadow-emerald-500/15'
              : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <span>🏹</span>
          <span>Einzelwerfer-Rangliste (100%)</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white">
            {filteredThrowers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pairs')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'pairs'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-lg shadow-amber-500/15'
              : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <span>🤝</span>
          <span>Paarungs-Synergie & Duo-Bilanz</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white">
            {filteredPairs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Einzelspiel-Analyse & Match-Wertung */}
      {activeTab === 'matches' && (
        <div className="space-y-3">
          {filteredMatches.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-400">
              Keine Doppelpartien für die aktuelle Filterauswahl gefunden.
            </div>
          ) : (
            filteredMatches.map((m) => {
              const isExpanded = Boolean(expandedMatchIds[m.id]);
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border transition-all bg-[#081022] ${
                    m.hasIndividualStats
                      ? 'border-cyan-500/35 shadow-lg shadow-cyan-950/15'
                      : 'border-white/10'
                  }`}
                >
                  {/* Summary Row */}
                  <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {m.formattedDate}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            m.team === 'A-Team'
                              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {m.team}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold border ${getSynergyBadgeClass(
                            m.synergy.tone
                          )}`}
                          title={m.synergy.desc}
                        >
                          {m.synergy.label}
                        </span>
                        {m.specialsInMatch.length > 0 && (
                          <span className="px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-400/35">
                            ⭐ {m.specialsInMatch.length} Special
                            {m.specialsInMatch.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-base sm:text-lg font-black text-white">
                          {m.p1Name} &amp; {m.p2Name}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          vs. <strong className="text-slate-200">{m.opponent}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Result + Pair Avg + Match Rating + Expand Button */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black border ${
                          m.isWin
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/35'
                        }`}
                      >
                        {m.legsWon}:{m.legsLost} {m.isWin ? 'Sieg' : 'Ndlg'}
                      </span>

                      <div className="text-right px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          Paar-Avg (9D/18D)
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-200 font-mono">
                          {m.pairAvg.toFixed(1)}{' '}
                          <span className="text-slate-500 text-xs">
                            ({m.pairAvg9.toFixed(1)} / {m.pairAvg18.toFixed(1)})
                          </span>
                        </div>
                      </div>

                      <div
                        className={`px-3 py-1 rounded-xl border text-center ${getRatingBadgeClass(
                          m.ratingStatus
                        )}`}
                      >
                        <div className="text-[10px] uppercase font-bold opacity-80">
                          Paar-Note
                        </div>
                        <div className="text-sm font-black font-mono">
                          {m.pairRatingWithSpecials.toFixed(2)} Pkt
                        </div>
                      </div>

                      {m.hasIndividualStats && (
                        <button
                          onClick={() => toggleMatchExpand(m.id)}
                          className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-300 transition-all cursor-pointer"
                          title={
                            isExpanded
                              ? 'Einzelwerfer-Details einklappen'
                              : 'Einzelwerfer-Details aufklappen'
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded 100%-Thrower Comparison */}
                  {m.hasIndividualStats &&
                    isExpanded &&
                    m.p1Breakdown &&
                    m.p2Breakdown && (
                      <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3 bg-[#050b18]/60 rounded-b-2xl">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                          <span className="font-bold text-cyan-300">
                            ✓ 100%-Werfer-Aufschlüsselung ({m.synergy.desc})
                          </span>
                          <span>
                            Paar High-Scores gesamt: 80+×{m.scores80} · 100+×
                            {m.scores100} · 140+×{m.scores140} · 180×{m.scores180}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <ThrowerCard
                            breakdown={m.p1Breakdown}
                            partnerAvg={m.p2Breakdown.avg}
                            legsWon={m.legsWon}
                            accent="cyan"
                          />
                          <ThrowerCard
                            breakdown={m.p2Breakdown}
                            partnerAvg={m.p1Breakdown.avg}
                            legsWon={m.legsWon}
                            accent="indigo"
                          />
                        </div>

                        {m.specialsInMatch.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {m.specialsInMatch.map((sp) => (
                              <span
                                key={sp.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs font-bold"
                              >
                                <span>⭐</span>
                                <span>
                                  {sp.player_name}:{' '}
                                  {sp.description || sp.special_type}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Einzelwerfer-Rangliste im Doppel (100%-Zuordnung) */}
      {activeTab === 'throwers' && (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
            <span>
              🎯 Sortiert nach persönlichem <strong className="text-emerald-300">3-Dart-Doppel-Avg</strong> aus allen Partien mit 100%-Werfer-Zuordnung. Der Vergleich <strong className="text-white">Δ vs. Einzel</strong> zeigt, wer im Team-Doppel über oder unter seinem Einzel-Niveau scort.
            </span>
          </div>

          {filteredThrowers.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-400">
              Keine Einzelwerfer-Daten für den gewählten Filter vorhanden.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#081022]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-cyan-400">
                    <th className="p-3">#</th>
                    <th className="p-3">Spieler</th>
                    <th className="p-3 text-center">Team</th>
                    <th className="p-3 text-center">Doppel (100% / Ges.)</th>
                    <th className="p-3 text-right">Darts (100%)</th>
                    <th className="p-3 text-right">Doppel-Avg (100%)</th>
                    <th className="p-3 text-right">Einzel-Avg</th>
                    <th className="p-3 text-center">Δ Doppel vs. Einzel</th>
                    <th className="p-3 text-right">First-9</th>
                    <th className="p-3 text-center">Checkouts</th>
                    <th className="p-3 text-center">Scores (100+/140+/180)</th>
                    <th className="p-3 text-right">Ø Werfer-Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredThrowers.map((t, idx) => (
                    <tr key={t.playerName} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-extrabold text-white whitespace-nowrap">
                        <Link
                          href={`/spieler?player=${encodeURIComponent(t.playerName)}`}
                          className="hover:text-cyan-300 transition-colors"
                        >
                          {t.playerName}
                        </Link>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            t.team === 'A-Team'
                              ? 'bg-cyan-500/15 text-cyan-300'
                              : 'bg-blue-500/15 text-blue-300'
                          }`}
                        >
                          {t.team}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-xs text-slate-300 whitespace-nowrap">
                        <strong className="text-white">{t.gamesTracked}</strong> /{' '}
                        {t.gamesTotal}{' '}
                        <span className="text-slate-500">
                          ({t.winsTotal}S)
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">
                        {t.gamesTracked > 0 ? t.totalDarts : '-'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {t.trackedAvg !== null ? (
                          <span className="px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/35 font-black font-mono">
                            {t.trackedAvg.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            Ø Paar {t.avgPairAvgAll.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">
                        {t.singlesAvg !== null ? t.singlesAvg.toFixed(2) : '-'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {t.deltaVsSingles !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-black font-mono ${
                              t.deltaVsSingles >= 0
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
                            }`}
                          >
                            {t.deltaVsSingles >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {t.deltaVsSingles >= 0 ? '+' : ''}
                            {t.deltaVsSingles.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-200">
                        {t.trackedFirst9Avg !== null
                          ? t.trackedFirst9Avg.toFixed(1)
                          : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-300">
                        {t.gamesTracked > 0 ? t.totalCheckouts : '-'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap text-xs font-mono">
                        {t.gamesTracked > 0 ? (
                          <span className="text-slate-200">
                            <span className="text-cyan-300">{t.scores100}</span> /{' '}
                            <span className="text-purple-300">{t.scores140}</span> /{' '}
                            <span className="text-amber-300">{t.scores180}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-white">
                        {t.avgIndividualIndex !== null
                          ? `${t.avgIndividualIndex.toFixed(2)} Pkt`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Paarungs-Synergie & Duo-Bilanz */}
      {activeTab === 'pairs' && (
        <div className="space-y-4">
          {filteredPairs.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-400">
              Keine Doppel-Paarungen für den gewählten Filter vorhanden.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#081022]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-amber-400">
                    <th className="p-3">#</th>
                    <th className="p-3">Doppel-Paarung</th>
                    <th className="p-3 text-center">Team</th>
                    <th className="p-3 text-center">Bilanz</th>
                    <th className="p-3 text-center">Legs</th>
                    <th className="p-3 text-right">Ø Paar-Avg</th>
                    <th className="p-3 text-right">Ø 9D / 18D</th>
                    <th className="p-3 text-center">Specials</th>
                    <th className="p-3 text-center">100%-Spiele</th>
                    <th className="p-3 text-right">Ø Paar-Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPairs.map((p, idx) => (
                    <tr key={p.pairKey} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-extrabold text-white whitespace-nowrap">
                        {p.playerAName} &amp; {p.playerBName}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.team === 'A-Team'
                              ? 'bg-cyan-500/15 text-cyan-300'
                              : 'bg-blue-500/15 text-blue-300'
                          }`}
                        >
                          {p.team}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-black ${
                            p.winRatePct >= 60
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : p.winRatePct >= 40
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {p.wins}/{p.games} ({p.winRatePct}%)
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-300">
                        {p.legsWon}:{p.legsLost}
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-white">
                        {p.avgTotal.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-slate-400 whitespace-nowrap">
                        {p.avg9.toFixed(1)} / {p.avg18.toFixed(1)}
                      </td>
                      <td className="p-3 text-center">
                        {p.specialsCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-xs">
                            ⭐ {p.specialsCount}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono text-xs text-cyan-300">
                        {p.trackedGames > 0 ? `${p.trackedGames}/${p.games}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-amber-300 whitespace-nowrap">
                        {p.avgPairRating.toFixed(2)} Pkt
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
