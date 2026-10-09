'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Settings } from '@/lib/scoring';
import {
  updateSettingsAction,
  addPlayerAction,
  resetPlayerPasswordAction,
  updatePlayerRoleAction,
} from '../actions';
import { Sliders, UserPlus, KeyRound, ShieldCheck, Check, AlertTriangle } from 'lucide-react';


interface PlayerItem {
  id: number;
  name: string;
  team: string;
  role: string;
  must_change_password: number;
}

interface SettingsClientProps {
  initialSettings: Settings;
  players: PlayerItem[];
}

export default function SettingsClient({
  initialSettings,
  players,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'weights' | 'addPlayer' | 'pwReset' | 'roles'>('weights');

  // Sliders State
  const [winWeight, setWinWeight] = useState(initialSettings.win_weight);
  const [avgWeight, setAvgWeight] = useState(initialSettings.avg_weight);
  const [avg9Weight, setAvg9Weight] = useState(initialSettings.avg9_weight);
  const [avg18Weight, setAvg18Weight] = useState(initialSettings.avg18_weight);
  const [scoresWeight, setScoresWeight] = useState(initialSettings.scores_weight);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const totalWeight = winWeight + avgWeight + avg9Weight + avg18Weight + scoresWeight;
  const isBalanced = Math.abs(totalWeight - 100.0) < 0.05;

  const handleSaveSettings = async () => {
    if (!isBalanced) return;
    setSavingSettings(true);
    setSettingsMessage(null);
    const res = await updateSettingsAction(
      winWeight,
      avgWeight,
      avg9Weight,
      avg18Weight,
      scoresWeight
    );
    setSavingSettings(false);
    if (res.success) {
      setSettingsMessage('✅ Einstellungen erfolgreich in der Datenbank gespeichert!');
    } else {
      setSettingsMessage(`❌ Fehler: ${res.error}`);
    }
  };

  // Add Player State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerTeam, setNewPlayerTeam] = useState('A-Team');
  const [newPlayerRole, setNewPlayerRole] = useState('player');
  const [addPlayerMsg, setAddPlayerMsg] = useState<string | null>(null);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const res = await addPlayerAction(newPlayerName, newPlayerTeam, newPlayerRole);
    if (res.success) {
      setAddPlayerMsg(`✅ Spieler "${newPlayerName.trim()}" (${newPlayerTeam}) mit Passwort lions2026 angelegt!`);
      setNewPlayerName('');
    } else {
      setAddPlayerMsg(`❌ Fehler: ${res.error}`);
    }
  };

  // Password Reset State
  const [selectedResetPlayer, setSelectedResetPlayer] = useState<number>(
    players[0]?.id || 0
  );
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleResetPassword = async () => {
    if (!selectedResetPlayer) return;
    const p = players.find((pl) => pl.id === selectedResetPlayer);
    const res = await resetPlayerPasswordAction(selectedResetPlayer);
    if (res.success) {
      setResetMsg(`✅ Passwort für ${p?.name} wurde auf 'lions2026' zurückgesetzt!`);
    } else {
      setResetMsg(`❌ Fehler: ${res.error}`);
    }
  };

  // Role Management State
  const [selectedRolePlayer, setSelectedRolePlayer] = useState<number>(
    players[0]?.id || 0
  );
  const selPlayer = players.find((pl) => pl.id === selectedRolePlayer) || players[0];
  const [roleMsg, setRoleMsg] = useState<string | null>(null);

  const handleRoleChange = async (newRole: string) => {
    if (!selectedRolePlayer) return;
    const res = await updatePlayerRoleAction(selectedRolePlayer, newRole);
    if (res.success) {
      setRoleMsg(`✅ Rolle für ${selPlayer?.name} auf "${newRole}" aktualisiert!`);
    } else {
      setRoleMsg(`❌ Fehler: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">

          <span>⚙️</span> Einstellungen & Punktegewichtungen
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Feinjustierung der 5 Bewertungskategorien, Spieler registrieren & Rollen verwalten.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('weights')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'weights'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Kategorie-Gewichtung
        </button>

        <button
          onClick={() => setActiveTab('addPlayer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'addPlayer'
              ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Spieler registrieren
        </button>

        <button
          onClick={() => setActiveTab('pwReset')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pwReset'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Passwort-Reset
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'roles'
              ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Rollen & Admin
        </button>
      </div>

      {/* TAB 1: KATEGORIE-GEWICHTUNG */}
      {activeTab === 'weights' && (
        <div className="lions-card p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">
              Feinjustierung der 5 Grundkategorien (Schritte: 0,5%)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Die Summe aller 5 Gewichtungen muss exakt 100,0 % ergeben.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Linke Spalte */}
            <div className="space-y-4">
              {/* Siegquote */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>Siegquote:</span>
                  <span className="text-cyan-400 font-mono text-sm">{winWeight.toFixed(1)} %</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={winWeight}
                  onChange={(e) => setWinWeight(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Gesamt Average */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>Gesamt Average:</span>
                  <span className="text-cyan-400 font-mono text-sm">{avgWeight.toFixed(1)} %</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={avgWeight}
                  onChange={(e) => setAvgWeight(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* 9-Dart Average */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>9-Dart Average:</span>
                  <span className="text-cyan-400 font-mono text-sm">{avg9Weight.toFixed(1)} %</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={avg9Weight}
                  onChange={(e) => setAvg9Weight(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            {/* Rechte Spalte */}
            <div className="space-y-4">
              {/* 18-Dart Average */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>18-Dart Average:</span>
                  <span className="text-cyan-400 font-mono text-sm">{avg18Weight.toFixed(1)} %</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={avg18Weight}
                  onChange={(e) => setAvg18Weight(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* High Scores */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>High Scores (80+, 100+, 140+, 180):</span>
                  <span className="text-cyan-400 font-mono text-sm">{scoresWeight.toFixed(1)} %</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={scoresWeight}
                  onChange={(e) => setScoresWeight(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Balance Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
              isBalanced
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span>
                Summe der 5 Gewichtungen: <b>{totalWeight.toFixed(1)} %</b> / 100,0 %
              </span>
            </div>
            <span>{isBalanced ? '✅ Perfekt ausbalanciert' : '⚠️ Muss exakt 100,0 % sein'}</span>
          </div>

          {settingsMessage && (
            <div className="text-xs font-bold p-3 rounded-xl bg-slate-900 border border-white/10">
              {settingsMessage}
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={!isBalanced || savingSettings}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg ${
              isBalanced && !savingSettings
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 shadow-cyan-500/25 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {savingSettings ? '💾 Speichere...' : '💾 Gewichtung in Supabase Speichern'}
          </button>
        </div>
      )}

      {/* TAB 2: SPIELER REGISTRIEREN */}
      {activeTab === 'addPlayer' && (
        <div className="lions-card p-6">
          <h2 className="text-base font-bold text-white mb-4">
            Neuen Spieler zum Verein / System hinzufügen
          </h2>
          <form onSubmit={handleAddPlayer} className="space-y-4 max-w-lg">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Vollständiger Name des Spielers:
              </label>
              <input
                type="text"
                required
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Vor- und Nachname"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Mannschaftszuordnung:
                </label>
                <select
                  value={newPlayerTeam}
                  onChange={(e) => setNewPlayerTeam(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="A-Team">🦁 A-Team</option>
                  <option value="B-Team">🐯 B-Team</option>
                  <option value="Kein Team">⚪ Kein Team (Gast / Passiv)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Rolle:
                </label>
                <select
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="player">🎯 Spieler</option>
                  <option value="admin">👑 Admin (Spartenleitung)</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              * Neuer Spieler erhält automatisch das Einmal-Passwort <code>lions2026</code> und muss es beim 1. Login ändern.
            </p>

            {addPlayerMsg && (
              <div className="text-xs font-bold p-3 rounded-xl bg-slate-900 border border-white/10">
                {addPlayerMsg}
              </div>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              ➕ Spieler anlegen
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: PASSWORT RESET */}
      {activeTab === 'pwReset' && (
        <div className="lions-card p-6 space-y-4 max-w-lg">
          <div>
            <h2 className="text-base font-bold text-white">
              🔑 Einmal-Passwort zurücksetzen
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Setzt das Passwort des ausgewählten Spielers auf <code>lions2026</code> zurück. Er wird beim nächsten Login zur Eingabe eines neuen Passworts aufgefordert.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Spieler auswählen:
            </label>
            <select
              value={selectedResetPlayer}
              onChange={(e) => setSelectedResetPlayer(Number(e.target.value))}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.team})
                </option>
              ))}
            </select>
          </div>

          {resetMsg && (
            <div className="text-xs font-bold p-3 rounded-xl bg-slate-900 border border-white/10">
              {resetMsg}
            </div>
          )}

          <button
            onClick={handleResetPassword}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
          >
            🔄 Passwort auf 'lions2026' zurücksetzen
          </button>
        </div>
      )}

      {/* TAB 4: ROLLEN & RECHTE */}
      {activeTab === 'roles' && (
        <div className="lions-card p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">
              👑 Rollen & Admin-Berechtigungen
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Admins haben vollen Zugriff auf Spielbericht-Erfassung, Verwaltung und Optionen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admins Übersicht */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Aktuelle Admins
              </h3>
              <div className="space-y-1.5 text-xs">
                {players
                  .filter((p) => p.role === 'admin')
                  .map((adm) => (
                    <div
                      key={adm.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]"
                    >
                      <span className="font-bold text-white">👑 {adm.name}</span>
                      <span className="text-[10px] text-slate-400">{adm.team}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Rolle Ändern */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                Rolle zuweisen
              </h3>
              <select
                value={selectedRolePlayer}
                onChange={(e) => setSelectedRolePlayer(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role === 'admin' ? '👑 Admin' : '🎯 Spieler'})
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => handleRoleChange('admin')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    selPlayer?.role === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  👑 Admin machen
                </button>
                <button
                  onClick={() => handleRoleChange('player')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    selPlayer?.role === 'player'
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🎯 Als Spieler setzen
                </button>
              </div>

              {roleMsg && (
                <div className="text-xs font-bold p-2.5 rounded-lg bg-slate-900 border border-white/10">
                  {roleMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
