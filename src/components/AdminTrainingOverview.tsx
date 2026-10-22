'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Users,
  Target,
  Beer,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  Clock,
  Shield,
  Award,
} from 'lucide-react';
import { AdminTrainingOverviewData, PlayerMonthlyTrainingStat } from '@/lib/trainingLottery';
import { getAdminTrainingOverviewAction } from '@/app/actions/lotteryActions';

interface AdminTrainingOverviewProps {
  initialData: AdminTrainingOverviewData;
}

export default function AdminTrainingOverview({ initialData }: AdminTrainingOverviewProps) {
  const [data, setData] = useState<AdminTrainingOverviewData>(initialData);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialData.selectedMonthKey);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'qualified'>('all');
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleMonthChange = async (newMonthKey: string) => {
    setSelectedMonth(newMonthKey);
    setLoading(true);
    try {
      const res = await getAdminTrainingOverviewAction(newMonthKey);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error('Fehler beim Laden des Monats:', e);
    } finally {
      setLoading(false);
    }
  };

  // Gefilterte Spielerliste
  const filteredPlayers = data.players.filter((p) => {
    // 1. Textsuche
    if (searchQuery.trim() && !p.playerName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // 2. Team-Filter
    if (teamFilter !== 'all' && p.team !== teamFilter) {
      return false;
    }
    // 3. Status-Filter
    if (statusFilter === 'active' && p.totalCompletedGames === 0) {
      return false;
    }
    if (statusFilter === 'qualified' && !p.isQualified) {
      return false;
    }
    return true;
  });

  // Alle vorhandenen Teams sammeln
  const allTeams = Array.from(new Set(data.players.map((p) => p.team).filter(Boolean)));

  return (
    <div
      data-ui-id="ADMIN.TRAINING_OVERVIEW.CARD"
      className="bg-slate-900/95 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6 text-white"
    >
      {/* 1. Header mit Monatsauswahl */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Admin: Monats-Trainingsübersicht
                </h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                Monatliche Zuordnung aller absolvierten Spiele (Solo & 1-gegen-1) und Lostopf-Tracking (5 Freigetränke ab 20 Spielen).
              </p>
            </div>
          </div>
        </div>

        {/* Monats-Dropdown */}
        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <select
            data-ui-id="ADMIN.TRAINING_OVERVIEW.MONTH_SELECT"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={loading}
            className="w-full md:w-auto bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-inner"
          >
            {data.availableMonths.map((m) => (
              <option key={m.monthKey} value={m.monthKey}>
                📅 {m.monthLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. KPI-Karten (Übersicht auf einen Blick) */}
      <div
        data-ui-id="ADMIN.TRAINING_OVERVIEW.KPIS"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {/* KPI 1: Gesamtspiele */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-1 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Absolvierte Spiele</span>
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">
            {data.totalGamesInMonth}
          </div>
          <div className="text-[11px] text-slate-400">
            im {data.selectedMonthLabel}
          </div>
        </div>

        {/* KPI 2: Aktive Spieler */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-1 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Aktive Spieler</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {data.totalActivePlayers}
          </div>
          <div className="text-[11px] text-slate-400">
            von {data.players.length} Vereinsmitgliedern
          </div>
        </div>

        {/* KPI 3: Im Lostopf (>= 20) */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-1 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Im Lostopf (≥ 20)</span>
            <Beer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
            {data.qualifiedPlayersCount}
          </div>
          <div className="text-[11px] text-slate-400">
            für 5 Freigetränke qualifiziert
          </div>
        </div>

        {/* KPI 4: Monats-Gewinner */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-1 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Monatsgewinner</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm sm:text-base font-black text-white truncate" title={data.monthWinner?.player_name || 'Noch nicht gezogen'}>
            {data.monthWinner ? data.monthWinner.player_name : 'Noch offen'}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {data.monthWinner ? `🏆 5 Freigetränke (${data.monthWinner.completed_games} Spiele)` : 'Auslosung am 1. d. Monats'}
          </div>
        </div>
      </div>

      {/* 3. Such- und Filterleiste */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            data-ui-id="ADMIN.TRAINING_OVERVIEW.SEARCH_INPUT"
            type="text"
            placeholder="Spieler suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Team-Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all">Alle Teams</option>
            {allTeams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Status-Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all">Alle Spieler ({data.players.length})</option>
            <option value="active">Nur mit Spielen ({data.totalActivePlayers})</option>
            <option value="qualified">Im Lostopf ≥20 ({data.qualifiedPlayersCount})</option>
          </select>
        </div>
      </div>

      {/* 4. Spieler-Tabelle */}
      <div
        data-ui-id="ADMIN.TRAINING_OVERVIEW.TABLE"
        className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 shadow-xl"
      >
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 font-black border-b border-white/10">
            <tr>
              <th className="py-3 px-3 sm:px-4">#</th>
              <th className="py-3 px-3 sm:px-4">Spieler</th>
              <th className="py-3 px-2 text-center">Checkout Battle (Solo / 1vs1)</th>
              <th className="py-3 px-2 text-center">PDC Challenge (Solo / 1vs1)</th>
              <th className="py-3 px-3 text-center">Gesamt</th>
              <th className="py-3 px-3">Fortschritt (Ziel: 20)</th>
              <th className="py-3 px-3 text-right">Lostopf-Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Keine Spieler für die ausgewählten Filterkriterien gefunden.
                </td>
              </tr>
            ) : (
              filteredPlayers.map((p, idx) => {
                const isExpanded = expandedPlayer === p.playerName;
                const pct = Math.min(100, Math.round((p.totalCompletedGames / 20) * 100));

                return (
                  <React.Fragment key={p.playerName}>
                    <tr
                      onClick={() => setExpandedPlayer(isExpanded ? null : p.playerName)}
                      className={`hover:bg-slate-900/60 transition-colors cursor-pointer ${
                        p.isMonthWinner
                          ? 'bg-amber-500/10'
                          : p.isQualified
                          ? 'bg-emerald-500/5'
                          : ''
                      }`}
                    >
                      {/* Rang */}
                      <td className="py-3.5 px-3 sm:px-4 font-mono font-bold text-slate-400">
                        {p.totalCompletedGames > 0 ? `#${idx + 1}` : '-'}
                      </td>

                      {/* Spielername & Team */}
                      <td className="py-3.5 px-3 sm:px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">
                            {p.playerName}
                          </span>
                          {p.team && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                              {p.team}
                            </span>
                          )}
                          {p.isMonthWinner && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/50 flex items-center gap-1">
                              🏆 Gewinner
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Checkout Battle */}
                      <td className="py-3.5 px-2 text-center">
                        <span className="font-mono font-semibold">
                          <strong className="text-white">{p.totalDoubles}</strong>{' '}
                          <span className="text-[11px] text-slate-400">
                            ({p.doublesSolo}s / {p.doubles1vs1}d)
                          </span>
                        </span>
                      </td>

                      {/* PDC Challenge */}
                      <td className="py-3.5 px-2 text-center">
                        <span className="font-mono font-semibold">
                          <strong className="text-white">{p.totalPdc}</strong>{' '}
                          <span className="text-[11px] text-slate-400">
                            ({p.pdcSolo}s / {p.pdc1vs1}d)
                          </span>
                        </span>
                      </td>

                      {/* Gesamtspiele */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="text-base sm:text-lg font-black font-mono text-amber-400">
                          {p.totalCompletedGames}
                        </span>
                      </td>

                      {/* Fortschrittsbalken */}
                      <td className="py-3.5 px-3 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400 font-mono">
                              {p.totalCompletedGames} / 20
                            </span>
                            <span className={p.isQualified ? 'text-emerald-400' : 'text-amber-400'}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                p.isQualified
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                  : 'bg-gradient-to-r from-amber-500 to-amber-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.isMonthWinner ? (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/50">
                              🏆 5 Freigetränke
                            </span>
                          ) : p.isBlockedByPastWin ? (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              🔒 4M-Sperre
                            </span>
                          ) : p.isQualified ? (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Im Lostopf</span>
                            </span>
                          ) : p.totalCompletedGames > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 border border-white/10">
                              Noch {20 - p.totalCompletedGames} offen
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">
                              Keine Spiele
                            </span>
                          )}

                          {p.gamesList.length > 0 && (
                            <button
                              type="button"
                              className="p-1 rounded text-slate-400 hover:text-white"
                              title="Spiele aufklappen"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Aufklappbare Einzelspiele des Spielers */}
                    {isExpanded && p.gamesList.length > 0 && (
                      <tr className="bg-slate-900/90 border-t border-b border-emerald-500/30 animate-fadeIn">
                        <td colSpan={7} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                              <span>
                                Alle {p.gamesList.length} absolvierten Spiele von {p.playerName} im {data.selectedMonthLabel}:
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                (Solo = Einzeltraining, 1vs1 = Duell mit Trainingspartner)
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {p.gamesList.map((g) => {
                                const dObj = new Date(g.date);
                                const dateStr = isNaN(dObj.getTime())
                                  ? g.date
                                  : dObj.toLocaleString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    });

                                return (
                                  <div
                                    key={g.id + '_' + g.gameType}
                                    className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between gap-2 shadow-inner"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                          g.gameType === 'doubles'
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}>
                                          {g.gameType === 'doubles' ? 'Checkout' : 'PDC'}
                                        </span>
                                        <span className="font-bold text-white">
                                          {g.gameMode === 'solo' ? 'Solo' : `1vs1 vs. ${g.opponentName || 'Gegner'}`}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400">
                                        {g.summary}
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono shrink-0 text-right">
                                      {dateStr}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
