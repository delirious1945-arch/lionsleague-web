'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LeaderboardEntry } from '@/lib/data';
import PlayerAvatar from '@/components/PlayerAvatar';

interface PlayerCardInfo {
  id: number;
  name: string;
  team: string;
  matches: number;
  rating: number;
  avgTotal: number;
  wins: number;
  legsWon: number;
  legsLost: number;
}

export default function TeamsClient({
  aTeamPlayers,
  bTeamPlayers,
  selectedSeason,
  availableSeasons,
}: {
  aTeamPlayers: PlayerCardInfo[];
  bTeamPlayers: PlayerCardInfo[];
  selectedSeason: string;
  availableSeasons: string[];
}) {
  const [activeTab, setActiveTab] = useState<'A-Team' | 'B-Team'>('A-Team');

  const currentPlayers = activeTab === 'A-Team' ? aTeamPlayers : bTeamPlayers;
  const accentColor = activeTab === 'A-Team' ? '#00D4FF' : '#3B82F6';
  const badgeText =
    activeTab === 'A-Team'
      ? '2. Kreisklasse Staffel 07'
      : '2. Kreisklasse Staffel 11';

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

      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">

        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span>🦁</span> Team-Kader & Mannschaftsübersicht
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Unsere Mannschaftsaufstellung im SC Weyhausen von 1921 e.V.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <form method="GET" action="/teams">
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
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('A-Team')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'A-Team'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>🦁</span> A-Team (Staffel 07)
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
            {aTeamPlayers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('B-Team')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'B-Team'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50 shadow-lg shadow-blue-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>🐯</span> B-Team (Staffel 11)
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
            {bTeamPlayers.length}
          </span>
        </button>
      </div>

      {/* Subheader */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>{activeTab === 'A-Team' ? '🦁' : '🐯'}</span> {activeTab}
            <span
              className="text-xs px-2.5 py-1 rounded-md font-semibold ml-2"
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentColor,
                border: `1px solid ${accentColor}40`,
              }}
            >
              {badgeText}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Alle aktiven Spieler und ihre aktuellen Saisonstatistiken
          </p>
        </div>
      </div>

      {/* Players Grid */}
      {currentPlayers.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 text-slate-400">
          Noch keine Spieler für dieses Team zugewiesen.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {currentPlayers.map((player) => {
            return (
              <div
                key={player.id}
                className="group relative bg-gradient-to-b from-[#0e1a38]/90 to-[#070d1e]/95 border border-white/10 hover:border-cyan-400/50 rounded-2xl p-5 text-center transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col items-center"
              >
                {/* Avatar with fallback */}
                <div className="mb-4">
                  <PlayerAvatar
                    name={player.name}
                    size={96}
                    borderColor={accentColor}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Name & Team */}
                <h3 className="text-lg font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                  {player.name}
                </h3>
                <div
                  className="text-xs font-bold mt-0.5 mb-4"
                  style={{ color: accentColor }}
                >
                  {player.team}
                </div>

                <div className="w-full border-t border-white/10 my-1"></div>

                {/* Stats 3 columns */}
                <div className="w-full grid grid-cols-3 gap-2 pt-3 text-center">
                  <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                    <div className="text-[11px] text-slate-400 font-medium">Spiele</div>
                    <div className="text-base font-extrabold text-white mt-0.5">
                      {player.matches}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                    <div className="text-[11px] text-slate-400 font-medium">Punkte</div>
                    <div
                      className="text-base font-black mt-0.5"
                      style={{ color: accentColor }}
                    >
                      {player.rating > 0 ? player.rating.toFixed(2) : '0.00'}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                    <div className="text-[11px] text-slate-400 font-medium">Avg.</div>
                    <div className="text-base font-extrabold text-white mt-0.5">
                      {player.avgTotal > 0 ? player.avgTotal.toFixed(1) : '-'}
                    </div>
                  </div>
                </div>

                {/* Secondary Stats */}
                <div className="w-full flex justify-between items-center text-xs text-slate-400 mt-3 pt-2 border-t border-white/5 px-1">
                  <span>Siege: <strong className="text-emerald-400 font-bold">{player.wins}</strong></span>
                  <span>Legs: <strong className="text-slate-200 font-semibold">{player.legsWon}:{player.legsLost}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
