'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  deleteMatchAction,
  updateMatchAction,
  resetPlayerPasswordAction,
  updatePlayerRoleAction,
} from '../actions';
import { MatchRow, Player } from '@/lib/data';
import {
  ChevronDown,
  ChevronUp,
  Target,
  Award,
  Trophy,
  Users,
  ArrowRight,
  ExternalLink,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { getPdcBadge, PART2_TARGETS } from '@/app/training/pdc-challenge/types';
import AdminTrainingOverview from '@/components/AdminTrainingOverview';
import { AdminTrainingOverviewData } from '@/lib/trainingLottery';

export default function VerwaltungClient({
  matches,
  players,
  trainingDoubles = [],
  trainingPdc = [],
  adminTrainingOverview,
}: {
  matches: MatchRow[];
  players: Player[];
  trainingDoubles?: any[];
  trainingPdc?: any[];
  adminTrainingOverview?: AdminTrainingOverviewData;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const defaultTab = tabParam === 'training'
    ? 'training'
    : tabParam === 'players'
    ? 'players'
    : 'matches';

  const [activeTab, setActiveTab] = useState<'matches' | 'players' | 'training'>(defaultTab);
  const [trainingGameType, setTrainingGameType] = useState<'all' | 'doubles' | 'pdc'>('all');
  const [trainingPlayerFilter, setTrainingPlayerFilter] = useState<string>('all');
  const [expandedTrainingKey, setExpandedTrainingKey] = useState<string | number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Edit Match modal / state
  const [editingMatch, setEditingMatch] = useState<MatchRow | null>(null);

  // Match edit fields
  const [editLegsWon, setEditLegsWon] = useState(3);
  const [editLegsLost, setEditLegsLost] = useState(0);
  const [editAvgTotal, setEditAvgTotal] = useState(50.0);
  const [editAvg9, setEditAvg9] = useState(50.0);
  const [editAvg18, setEditAvg18] = useState(50.0);
  const [editScores80, setEditScores80] = useState(0);
  const [editScores100, setEditScores100] = useState(0);
  const [editScores140, setEditScores140] = useState(0);
  const [editScores180, setEditScores180] = useState(0);
  const [editHighFinishes, setEditHighFinishes] = useState(0);
  const [editShortLegs, setEditShortLegs] = useState(0);
  const [editSpecialsCount, setEditSpecialsCount] = useState(0);
  const [editOpponent, setEditOpponent] = useState('');
  const [editDate, setEditDate] = useState('');

  const openEditModal = (m: MatchRow) => {
    setEditingMatch(m);
    setEditLegsWon(m.legs_won);
    setEditLegsLost(m.legs_lost);
    setEditAvgTotal(m.avg_total);
    setEditAvg9(m.avg_9);
    setEditAvg18(m.avg_18);
    setEditScores80(m.scores_80);
    setEditScores100(m.scores_100);
    setEditScores140(m.scores_140);
    setEditScores180(m.scores_180);
    setEditHighFinishes(m.high_finishes);
    setEditShortLegs(m.short_legs);
    setEditSpecialsCount(m.specials_count);
    setEditOpponent(m.opponent);
    setEditDate(
      m.match_date ? new Date(m.match_date).toISOString().split('T')[0] : ''
    );
  };

  const handleSaveMatchEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    startTransition(async () => {
      setStatusMessage(null);
      const res = await updateMatchAction(editingMatch.id, {
        player_id: editingMatch.player_id,
        match_date: editDate,
        opponent: editOpponent,
        legs_won: editLegsWon,
        legs_lost: editLegsLost,
        avg_total: editAvgTotal,
        avg_9: editAvg9,
        avg_18: editAvg18,
        scores_80: editScores80,
        scores_100: editScores100,
        scores_140: editScores140,
        scores_180: editScores180,
        high_finishes: editHighFinishes,
        short_legs: editShortLegs,
        specials_count: editSpecialsCount,
      });

      if (res.success) {
        setStatusMessage({
          text: `✅ Spielbericht #${editingMatch.id} für ${editingMatch.player_name} erfolgreich aktualisiert!`,
          type: 'success',
        });
        setEditingMatch(null);
      } else {
        setStatusMessage({
          text: `❌ Fehler beim Aktualisieren: ${res.error}`,
          type: 'error',
        });
      }
    });
  };

  const handleDeleteMatch = (m: MatchRow) => {
    if (
      !confirm(
        `Möchtest du das Match #${m.id} (${m.player_name} vs. ${m.opponent}) wirklich löschen?`
      )
    ) {
      return;
    }

    startTransition(async () => {
      setStatusMessage(null);
      const res = await deleteMatchAction(m.id);
      if (res.success) {
        setStatusMessage({
          text: `✅ Match #${m.id} (${m.player_name}) wurde gelöscht.`,
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: `❌ Fehler beim Löschen: ${res.error}`,
          type: 'error',
        });
      }
    });
  };

  const handleResetPassword = (playerId: number, playerName: string) => {
    if (!confirm(`Passwort für ${playerName} auf 'lions2026' zurücksetzen?`)) return;

    startTransition(async () => {
      setStatusMessage(null);
      const res = await resetPlayerPasswordAction(playerId);
      if (res.success) {
        setStatusMessage({
          text: `✅ Passwort für ${playerName} auf 'lions2026' zurückgesetzt!`,
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: `❌ Fehler beim Passwort-Reset: ${res.error}`,
          type: 'error',
        });
      }
    });
  };

  const handleRoleToggle = (playerId: number, currentRole: string, playerName: string) => {
    const newRole = currentRole === 'admin' ? 'player' : 'admin';
    startTransition(async () => {
      setStatusMessage(null);
      const res = await updatePlayerRoleAction(playerId, newRole);
      if (res.success) {
        setStatusMessage({
          text: `✅ Rolle für ${playerName} geändert zu: ${newRole.toUpperCase()}`,
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: `❌ Fehler: ${res.error}`,
          type: 'error',
        });
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn py-2">
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

      {/* Title */}
      <div className="pb-4 border-b border-white/10">

        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span>⚙️</span> Verwaltung & Spielberichts-Bearbeitung
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Eingetragene Spielberichte korrigieren, löschen oder Spieler-Rollen & Passwörter verwalten.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 sm:gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'matches'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>🎯</span> Einzel-Spielberichte verwalten ({matches.length})
        </button>

        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'players'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-lg shadow-purple-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>👑</span> Spieler & Rollen ({players.length})
        </button>

        <button
          onClick={() => setActiveTab('training')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'training'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-lg shadow-emerald-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>📈</span> Trainingsleistungen ({trainingDoubles.length + trainingPdc.length})
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* TAB 1: Spielberichte verwalten */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#081022]">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-cyan-400">
                  <th className="p-3">ID</th>
                  <th className="p-3">Datum</th>
                  <th className="p-3">Spieler</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Gegner</th>
                  <th className="p-3 text-center">Legs</th>
                  <th className="p-3 text-right">Avg Total</th>
                  <th className="p-3 text-center">Specials</th>
                  <th className="p-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {matches.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 text-slate-500 font-mono text-xs">#{m.id}</td>
                    <td className="p-3 text-slate-300 whitespace-nowrap">
                      {m.match_date
                        ? new Date(m.match_date).toLocaleDateString('de-DE')
                        : '-'}
                    </td>
                    <td className="p-3 font-bold text-white whitespace-nowrap">
                      {m.player_name}
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          m.team === 'A-Team'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {m.team}
                      </span>
                    </td>
                    <td className="p-3 text-slate-200 whitespace-nowrap">{m.opponent}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded font-black text-xs ${
                          m.legs_won > m.legs_lost
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {m.legs_won}:{m.legs_lost}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-cyan-300">
                      {m.avg_total.toFixed(1)}
                    </td>
                    <td className="p-3 text-center">
                      {m.specials_count > 0 ? (
                        <span className="text-amber-400 font-bold">⭐ {m.specials_count}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(m)}
                          className="bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-lg font-bold transition-all"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDeleteMatch(m)}
                          disabled={isPending}
                          className="bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1 rounded-lg font-bold transition-all disabled:opacity-50"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Spieler & Rollen */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#081022]">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-purple-400">
                  <th className="p-3">ID</th>
                  <th className="p-3">Spieler Name</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Aktuelle Rolle</th>
                  <th className="p-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {players.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 text-slate-500 font-mono text-xs">#{p.id}</td>
                    <td className="p-3 font-bold text-white whitespace-nowrap">{p.name}</td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          p.team === 'A-Team'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : p.team === 'B-Team'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {p.team}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-black ${
                          p.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {p.role === 'admin' ? '👑 Admin' : '🎯 Spieler'}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRoleToggle(p.id, p.role, p.name)}
                          disabled={isPending}
                          className="bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs px-2.5 py-1 rounded-lg font-bold transition-all disabled:opacity-50"
                        >
                          {p.role === 'admin' ? 'Zum Spieler machen' : 'Zum Admin machen'}
                        </button>
                        <button
                          onClick={() => handleResetPassword(p.id, p.name)}
                          disabled={isPending}
                          className="bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 text-xs px-2.5 py-1 rounded-lg font-bold transition-all disabled:opacity-50"
                        >
                          PW: lions2026
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Trainingsleistungen aller Spieler */}
      {activeTab === 'training' && (() => {
        const TARGETS = ['D20', 'D10', 'D16', 'D8', 'D4'];

        const trainingPlayers = Array.from(
          new Set([
            ...trainingDoubles.map((d: any) => d.player_name),
            ...trainingPdc.map((p: any) => p.player_name),
          ].filter(Boolean))
        ).sort();

        const combinedSessions = [
          ...trainingDoubles.map((d: any) => ({ ...d, gameType: 'doubles' })),
          ...trainingPdc.map((p: any) => ({ ...p, gameType: 'pdc' })),
        ].sort((a: any, b: any) => {
          const tA = new Date(a.created_at || a.training_date).getTime();
          const tB = new Date(b.created_at || b.training_date).getTime();
          return tB - tA;
        });

        const filteredSessions = combinedSessions.filter((s: any) => {
          if (trainingGameType !== 'all' && s.gameType !== trainingGameType) return false;
          if (trainingPlayerFilter !== 'all') {
            const matches =
              s.player_name?.toLowerCase() === trainingPlayerFilter.toLowerCase() ||
              s.opponent_name?.toLowerCase() === trainingPlayerFilter.toLowerCase();
            if (!matches) return false;
          }
          return true;
        });

        // Top Stats
        const bestDqQuote = trainingDoubles.reduce((max: number, d: any) => Math.max(max, Number(d.total_quote || 0)), 0);
        const bestPdcScore = trainingPdc.reduce((max: number, p: any) => Math.max(max, Number(p.total_score || 0)), 0);

        return (
          <div className="space-y-5 animate-fadeIn">
            {/* Header & Quick Links */}
            <div className="bg-[#081022] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span className="text-xl">🎯</span> Trainingsleistungen (Admin-Zentrale)
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Alle Spieler
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Hier hast du als Admin vollständige Einsicht in alle absolvierten Doppelquote- und PDC-Challenge-Trainings.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/doppelquote"
                  className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Target size={13} />
                  <span>Doppelquote Training</span>
                  <ExternalLink size={12} />
                </Link>
                <Link
                  href="/training/pdc-challenge"
                  className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Award size={13} />
                  <span>PDC Challenge</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            {/* 1. Monatliche Zuordnung & Spieler-Auswertung für Admin */}
            {adminTrainingOverview && (
              <AdminTrainingOverview initialData={adminTrainingOverview} />
            )}

            {/* Trenner zur Detail-Sitzungsliste */}
            <div className="pt-2">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <span>📋</span> Einzelprotokolle & Sitzungs-Historie
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Vollständige Liste aller absolvierten Einzelsitzungen mit Wurfdetails zum Aufklappen.
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#081022] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Gesamt-Trainings</div>
                <div className="text-xl sm:text-2xl font-black text-white mt-1">
                  {combinedSessions.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {trainingDoubles.length} DQ · {trainingPdc.length} PDC
                </div>
              </div>

              <div className="bg-[#081022] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-cyan-400 font-bold uppercase">Beste Doppelquote</div>
                <div className="text-xl sm:text-2xl font-black text-cyan-300 mt-1">
                  {bestDqQuote > 0 ? (bestDqQuote * 100).toFixed(1) + '%' : '-'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">150 Darts Challenge</div>
              </div>

              <div className="bg-[#081022] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-amber-400 font-bold uppercase">PDC High Score</div>
                <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
                  {bestPdcScore > 0 ? `${bestPdcScore} Pkt.` : '-'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">57 Darts Challenge</div>
              </div>

              <div className="bg-[#081022] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-purple-400 font-bold uppercase">Aktive Spieler</div>
                <div className="text-xl sm:text-2xl font-black text-purple-300 mt-1">
                  {trainingPlayers.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Im Trainingsbetrieb</div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#081022] border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Type Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-white/5">
                <button
                  onClick={() => setTrainingGameType('all')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    trainingGameType === 'all'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Alle ({combinedSessions.length})
                </button>
                <button
                  onClick={() => setTrainingGameType('doubles')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    trainingGameType === 'doubles'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Doppelquote ({trainingDoubles.length})
                </button>
                <button
                  onClick={() => setTrainingGameType('pdc')}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    trainingGameType === 'pdc'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  PDC Challenge ({trainingPdc.length})
                </button>
              </div>

              {/* Player Filter */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Users size={13} className="text-emerald-400" /> Spieler:
                </span>
                <select
                  value={trainingPlayerFilter}
                  onChange={(e) => setTrainingPlayerFilter(e.target.value)}
                  className="bg-slate-900 border border-white/15 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="all">🌐 Alle Spieler ({combinedSessions.length})</option>
                  {trainingPlayers.map((p) => {
                    const cnt = combinedSessions.filter(
                      (s: any) => s.player_name === p || s.opponent_name === p
                    ).length;
                    return (
                      <option key={p} value={p}>
                        {p} ({cnt})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Sessions List */}
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs bg-[#081022] rounded-xl border border-white/10">
                Keine Trainingseinheiten gefunden.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredSessions.map((s: any, idx: number) => {
                  const isDq = s.gameType === 'doubles';
                  const isAborted = Boolean(s.is_aborted);
                  const sessionKey = s.session_id ? `${s.session_id}_${s.player_name}_${idx}` : `s_${idx}`;
                  const isExpanded = expandedTrainingKey === sessionKey;
                  const dateObj = new Date(s.training_date || s.created_at);
                  const dStr = isNaN(dateObj.getTime())
                    ? s.training_date
                    : dateObj.toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                  const pdcBadge = !isDq ? getPdcBadge(s.total_score || 0) : null;

                  return (
                    <div
                      key={sessionKey}
                      onClick={() => !isAborted && setExpandedTrainingKey(isExpanded ? null : sessionKey)}
                      className={`border rounded-xl p-3.5 flex flex-col gap-2.5 text-xs transition-all ${
                        !isAborted ? 'cursor-pointer hover:border-white/20 hover:bg-slate-900/90' : ''
                      } ${
                        isAborted
                          ? 'bg-rose-950/20 border-rose-900/40 opacity-70'
                          : isExpanded
                          ? 'bg-slate-900/95 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                          : 'bg-[#081022] border-white/10'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDq
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isDq ? '🎯 Doppelquote' : '🌟 PDC Challenge'}
                          </span>
                          <span className="font-bold text-white text-sm">{s.player_name}</span>
                          {s.opponent_name && (
                            <span className="text-slate-400 text-xs">vs. {s.opponent_name}</span>
                          )}
                          <span className="text-[10px] text-slate-500">· {dStr}</span>
                          {isAborted && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              ⚠️ Abgebrochen
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {isDq ? (
                            <div className="text-right">
                              <span className="text-emerald-300 font-black text-sm font-mono">
                                {((s.total_quote ?? 0) * 100).toFixed(1)}%
                              </span>
                              <div className="text-[10px] text-slate-400">
                                {s.total_hits} / {s.total_darts} Hits
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {pdcBadge && (
                                <span className={`text-[10px] px-2 py-0.5 rounded font-black ${pdcBadge.badgeClass}`}>
                                  {pdcBadge.icon} {pdcBadge.name}
                                </span>
                              )}
                              <div className="text-right">
                                <span className="text-amber-300 font-black text-sm font-mono">
                                  {s.total_score} Pkt.
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  {s.doubles_hit} Doppel · {s.shanghai_count} Sh.
                                </div>
                              </div>
                            </div>
                          )}

                          {!isAborted && (
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp size={16} className="text-emerald-400" /> : <ChevronDown size={16} />}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* EXPANDED DETAILS */}
                      {isExpanded && !isAborted && (
                        <div className="pt-3 border-t border-white/10 space-y-3 animate-fadeIn">
                          {isDq ? (
                            /* Doppelquote Breakdown */
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="text-cyan-300 flex items-center gap-1.5">
                                  <Target size={13} className="text-cyan-400" />
                                  Trefferquote je Doppelfeld (10 Runden à 3 Darts):
                                </span>
                                <div className="flex items-center gap-2 text-[10px]">
                                  {s.estimated_quote !== null && s.estimated_quote !== undefined && (
                                    <span className="bg-sky-950 border border-sky-500/40 text-sky-300 px-2 py-0.5 rounded-full font-bold">
                                      🎯 Einschätzung: {s.estimated_quote}%
                                    </span>
                                  )}
                                  <span className="text-slate-400">
                                    Bestes Feld: <strong className="text-amber-300">{s.best_double || '-'}</strong>
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                                {TARGETS.map((t) => {
                                  const key = t.toLowerCase();
                                  const hits = Number(s[`${key}_hits`] ?? 0);
                                  const darts = Number(s[`${key}_darts`] ?? 30);
                                  const quote = Number(s[`${key}_quote`] ?? (darts > 0 ? hits / darts : 0));
                                  const pct = (quote * 100).toFixed(1);
                                  const isBest = s.best_double && s.best_double.startsWith(t);

                                  return (
                                    <div
                                      key={t}
                                      className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                                        isBest
                                          ? 'bg-amber-500/10 border-amber-400/50 ring-1 ring-amber-400/30'
                                          : 'bg-slate-950/70 border-white/10'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-black text-white">{t}</span>
                                        {isBest && (
                                          <span className="text-[10px] font-black text-amber-300 bg-amber-400/20 px-1 rounded">
                                            TOP 🌟
                                          </span>
                                        )}
                                      </div>
                                      <div className="my-1">
                                        <div className="text-sm font-black text-emerald-300 font-mono">
                                          {pct}%
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {hits} / {darts} Hits
                                        </div>
                                      </div>
                                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                          style={{ width: `${Math.min(100, Math.max(0, quote * 100))}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            /* PDC Challenge Breakdown */
                            <div className="space-y-2.5">
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-950/70 border border-white/10 p-2 rounded-lg">
                                  <div className="text-[10px] text-slate-400">Teil 1 (Shanghai 10-15)</div>
                                  <div className="text-sm font-black text-sky-400">{s.score_part1} Pkt.</div>
                                </div>
                                <div className="bg-slate-950/70 border border-white/10 p-2 rounded-lg">
                                  <div className="text-[10px] text-slate-400">Teil 2 (Doppel D1-Bull)</div>
                                  <div className="text-sm font-black text-emerald-400">{s.score_part2} Pkt.</div>
                                </div>
                                <div className="bg-slate-950/70 border border-white/10 p-2 rounded-lg">
                                  <div className="text-[10px] text-slate-400">Teil 3 (Shanghai 15-Bull)</div>
                                  <div className="text-sm font-black text-amber-400">{s.score_part3} Pkt.</div>
                                </div>
                              </div>

                              {/* Doubles Grid */}
                              {(() => {
                                let detailsObj: any = null;
                                if (s.details) {
                                  try {
                                    detailsObj = typeof s.details === 'string' ? JSON.parse(s.details) : s.details;
                                  } catch (e) {}
                                }
                                if (detailsObj?.part2Hits) {
                                  return (
                                    <div className="space-y-1">
                                      <div className="text-[11px] font-bold text-emerald-300">
                                        Doppel-Treffer Übersicht (Teil 2):
                                      </div>
                                      <div className="grid grid-cols-7 sm:grid-cols-11 gap-1 text-center">
                                        {PART2_TARGETS.map((target) => {
                                          const isHit = detailsObj.part2Hits[target] === true;
                                          return (
                                            <div
                                              key={target}
                                              className={`py-1 px-0.5 rounded border text-[10px] font-mono font-bold ${
                                                isHit
                                                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                                                  : 'bg-slate-950/60 border-white/5 text-slate-500'
                                              }`}
                                            >
                                              <div>{target}</div>
                                              <div>{isHit ? '✓' : '✗'}</div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}

                          {s.notes && (
                            <div className="text-[11px] text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-white/5">
                              💬 Notiz: {s.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* MODAL: Match Bearbeiten */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0b1428] border border-cyan-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xl font-bold text-white">
                Match #{editingMatch.id} bearbeiten ({editingMatch.player_name})
              </h3>
              <button
                onClick={() => setEditingMatch(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMatchEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Datum</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Gegner</label>
                  <input
                    type="text"
                    value={editOpponent}
                    onChange={(e) => setEditOpponent(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Legs Gewonnen</label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={editLegsWon}
                    onChange={(e) => setEditLegsWon(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-emerald-300 font-bold rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Legs Verloren</label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={editLegsLost}
                    onChange={(e) => setEditLegsLost(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-rose-300 font-bold rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Gesamt Avg</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editAvgTotal}
                    onChange={(e) => setEditAvgTotal(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">9-Dart Avg</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editAvg9}
                    onChange={(e) => setEditAvg9(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">18-Dart Avg</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editAvg18}
                    onChange={(e) => setEditAvg18(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">80+</label>
                  <input
                    type="number"
                    value={editScores80}
                    onChange={(e) => setEditScores80(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">100+</label>
                  <input
                    type="number"
                    value={editScores100}
                    onChange={(e) => setEditScores100(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">140+</label>
                  <input
                    type="number"
                    value={editScores140}
                    onChange={(e) => setEditScores140(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">180er</label>
                  <input
                    type="number"
                    value={editScores180}
                    onChange={(e) => setEditScores180(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-cyan-400 text-cyan-300 rounded-lg px-2 py-1.5 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">High Finish</label>
                  <input
                    type="number"
                    value={editHighFinishes}
                    onChange={(e) => setEditHighFinishes(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Short Legs</label>
                  <input
                    type="number"
                    value={editShortLegs}
                    onChange={(e) => setEditShortLegs(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/15 text-white rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Specials</label>
                  <input
                    type="number"
                    value={editSpecialsCount}
                    onChange={(e) => setEditSpecialsCount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-amber-400 text-amber-300 rounded-lg px-2 py-1.5 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 text-slate-950 font-black py-2.5 rounded-xl text-sm transition-all"
                >
                  {isPending ? 'Speichere...' : '💾 Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
