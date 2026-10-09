'use client';

import React, { useState, useTransition } from 'react';
import {
  deleteMatchAction,
  updateMatchAction,
  resetPlayerPasswordAction,
  updatePlayerRoleAction,
} from '../actions';
import { MatchRow, Player } from '@/lib/data';

export default function VerwaltungClient({
  matches,
  players,
}: {
  matches: MatchRow[];
  players: Player[];
}) {
  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
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
    <div className="space-y-8 animate-fadeIn py-2">
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
      <div className="flex gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'matches'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>🎯</span> Einzel-Spielberichte verwalten ({matches.length})
        </button>

        <button
          onClick={() => setActiveTab('players')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'players'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-lg shadow-purple-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>👑</span> Spieler & Rollen ({players.length})
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
