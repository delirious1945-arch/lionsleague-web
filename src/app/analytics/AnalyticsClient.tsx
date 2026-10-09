'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AnalyticsMatchItem, Player, Top26Player, RawLegVisit } from '@/lib/data';
import {
  computePlayerAnalytics,
  generateSimulatedLegVisits,
  PlayerDAEAnalytics,
} from '@/lib/daeEngine';
import RadarChart from '@/components/analytics/RadarChart';
import LegTrendChart from '@/components/analytics/LegTrendChart';
import DartsToWinWidget from '@/components/analytics/DartsToWinWidget';
import LegAnatomyWidget from '@/components/analytics/LegAnatomyWidget';
import PlayerAvatar from '@/components/PlayerAvatar';

interface AnalyticsClientProps {
  matches: AnalyticsMatchItem[];
  players: Player[];
  top26: Top26Player[];
  allLegVisits: Record<number, RawLegVisit[][]>;
  availableSeasons: string[];
  selectedSeason: string;
}

export default function AnalyticsClient({
  matches,
  players,
  top26,
  allLegVisits,
  availableSeasons,
  selectedSeason,
}: AnalyticsClientProps) {
  // Tabs: 'single' | 'h2h' | 'matrix'
  const [activeTab, setActiveTab] = useState<'single' | 'h2h' | 'matrix'>('single');

  // Single Player Tab
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(
    players.length > 0 ? players[0].id : 0
  );
  const [simTargetAvg, setSimTargetAvg] = useState<number>(48);

  // H2H Tab
  const [h2hPlayerId1, setH2hPlayerId1] = useState<number>(
    players.length > 0 ? players[0].id : 0
  );
  const [h2hPlayerId2, setH2hPlayerId2] = useState<number>(
    players.length > 1 ? players[1].id : players[0]?.id || 0
  );

  // Matrix Filter
  const [matrixTeamFilter, setMatrixTeamFilter] = useState<'all' | 'A-Team' | 'B-Team'>('all');

  // Spieler-Map für schnellen Zugriff
  const playersMap = useMemo(() => {
    const map = new Map<number, Player>();
    for (const p of players) map.set(p.id, p);
    return map;
  }, [players]);

  // Berechne DAE für einen Spieler
  const getPlayerAnalytics = (pid: number, targetAvg = 48): PlayerDAEAnalytics => {
    const p = playersMap.get(pid);
    const pName = p ? p.name : 'Spieler';
    const rawLegs = allLegVisits[pid] || [];

    if (rawLegs.length === 0) {
      // Simulation
      const simLegs = generateSimulatedLegVisits(pid, targetAvg);
      const res = computePlayerAnalytics(pid, pName, simLegs);
      res.isSimulated = true;
      return res;
    }

    return computePlayerAnalytics(pid, pName, rawLegs);
  };

  // Aktiver Spieler für Single Tab
  const singleAna = useMemo(() => {
    return getPlayerAnalytics(selectedPlayerId, simTargetAvg);
  }, [selectedPlayerId, allLegVisits, playersMap, simTargetAvg]);

  const currentPlayer = playersMap.get(selectedPlayerId);

  // H2H Spieler
  const h2hAna1 = useMemo(() => {
    return getPlayerAnalytics(h2hPlayerId1);
  }, [h2hPlayerId1, allLegVisits, playersMap]);

  const h2hAna2 = useMemo(() => {
    return getPlayerAnalytics(h2hPlayerId2);
  }, [h2hPlayerId2, allLegVisits, playersMap]);

  // Matrix Daten für alle Spieler
  const matrixData = useMemo(() => {
    return players
      .filter((p) => (matrixTeamFilter === 'all' ? true : p.team === matrixTeamFilter))
      .map((p) => {
        const ana = getPlayerAnalytics(p.id);
        return {
          player: p,
          ana,
        };
      })
      .sort((a, b) => b.ana.visit_stats.match_average - a.ana.visit_stats.match_average);
  }, [players, allLegVisits, matrixTeamFilter]);

  return (
    <div className="space-y-6 animate-fadeIn py-2 max-w-7xl mx-auto">
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
            Deterministische Steel-Dart Leistungsdiagnostik • Einzelanalyse & Head-to-Head Duell
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-cyan-500/15 border border-cyan-400 text-cyan-300 font-extrabold text-xs px-3.5 py-1.5 rounded-lg shadow-sm shadow-cyan-400/20">
            🟢 ENGINE V2.0
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

      {/* Haupt-Tabs */}
      <div className="flex border-b border-white/10 gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all whitespace-nowrap ${
            activeTab === 'single'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>👤</span> Einzelspieler-Analyse
        </button>

        <button
          onClick={() => setActiveTab('h2h')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all whitespace-nowrap ${
            activeTab === 'h2h'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-lg shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>⚔️</span> Spieler-Vergleich (Head-to-Head)
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-lg shadow-purple-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>📊</span> DAE-Matrix (Alle Spieler)
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: EINZELSPIELER-ANALYSE */}
      {/* ==================================================== */}
      {activeTab === 'single' && (
        <div className="space-y-6">
          {/* Spieler-Auswahl Leiste */}
          <div className="bg-[#0b162c] border border-cyan-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4 w-full md:w-auto">
              {currentPlayer && (
                <PlayerAvatar
                  name={currentPlayer.name}
                  size={58}
                  borderColor="#00D4FF"
                />
              )}
              <div>
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Spieler auswählen:
                </label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                  className="bg-slate-900 border border-cyan-400/50 text-white font-extrabold text-base rounded-xl px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.team})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status / Simulation Badge */}
            <div className="flex items-center gap-3">
              {singleAna.isSimulated ? (
                <div className="bg-amber-500/15 border border-amber-400/50 rounded-xl p-2.5 text-xs text-amber-300 flex flex-col items-end">
                  <span className="font-extrabold flex items-center gap-1">
                    <span>⚠️</span> Probabilistischer Simulationsmodus
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-300">Ziel-Average:</span>
                    <input
                      type="range"
                      min="35"
                      max="65"
                      value={simTargetAvg}
                      onChange={(e) => setSimTargetAvg(Number(e.target.value))}
                      className="w-24 accent-amber-400 cursor-pointer"
                    />
                    <span className="font-bold text-white">{simTargetAvg}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/15 border border-emerald-400/40 rounded-xl px-3.5 py-2 text-right">
                  <div className="text-[10px] font-black text-emerald-300 uppercase">
                    Echte Match-Datenbasis
                  </div>
                  <div className="text-xs font-bold text-white">
                    {singleAna.legs_count} Legs • {singleAna.visit_stats.total_visits} Visits
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KPI-Kacheln */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Match Average */}
            <div className="bg-gradient-to-b from-[#0e1d3d] to-[#071126] border border-cyan-500/30 rounded-2xl p-4 shadow-lg text-center">
              <span className="text-[11px] text-cyan-300 font-extrabold uppercase">
                Match Average
              </span>
              <div className="text-3xl font-black text-white mt-1">
                {singleAna.visit_stats.match_average.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">3-Dart Schnitt</div>
            </div>

            {/* First-9 Average */}
            <div className="bg-gradient-to-b from-[#0e1d3d] to-[#071126] border border-cyan-500/30 rounded-2xl p-4 shadow-lg text-center">
              <span className="text-[11px] text-cyan-300 font-extrabold uppercase">
                First-9 Average
              </span>
              <div className="text-3xl font-black text-white mt-1">
                {singleAna.first_n.first_9_avg.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Erste 3 Aufnahmen</div>
            </div>

            {/* Darts / Leg */}
            <div className="bg-gradient-to-b from-[#0e1d3d] to-[#071126] border border-cyan-500/30 rounded-2xl p-4 shadow-lg text-center">
              <span className="text-[11px] text-cyan-300 font-extrabold uppercase">
                Darts / Leg
              </span>
              <div className="text-3xl font-black text-white mt-1">
                {singleAna.visit_stats.darts_per_leg > 0
                  ? singleAna.visit_stats.darts_per_leg.toFixed(1)
                  : '-'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Bei Leg-Gewinn</div>
            </div>

            {/* Bestes Leg */}
            <div className="bg-gradient-to-b from-[#0e1d3d] to-[#071126] border border-cyan-500/30 rounded-2xl p-4 shadow-lg text-center">
              <span className="text-[11px] text-amber-300 font-extrabold uppercase">
                Bestes Leg
              </span>
              <div className="text-3xl font-black text-amber-400 mt-1">
                {singleAna.visit_stats.best_leg_darts > 0
                  ? `${singleAna.visit_stats.best_leg_darts}`
                  : '-'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Darts zum Checkout</div>
            </div>

            {/* Wurfkonstanz */}
            <div className="bg-gradient-to-b from-[#0e1d3d] to-[#071126] border border-cyan-500/30 rounded-2xl p-4 shadow-lg text-center">
              <span className="text-[11px] text-cyan-300 font-extrabold uppercase">
                Wurfkonstanz
              </span>
              <div
                className="text-lg font-black mt-2 px-2 py-0.5 rounded-lg inline-block"
                style={{
                  color: singleAna.visit_stats.konstanz_color,
                  backgroundColor: `${singleAna.visit_stats.konstanz_color}18`,
                  border: `1px solid ${singleAna.visit_stats.konstanz_color}44`,
                }}
              >
                {singleAna.visit_stats.konstanz_label}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Streuung: ±{singleAna.visit_stats.volatility_std.toFixed(1)}
              </div>
            </div>

            {/* Leistungs-Korridor */}
            <div className="bg-gradient-to-b from-[#0e1d3d] to-[#071126] border border-cyan-500/30 rounded-2xl p-4 shadow-lg text-center">
              <span className="text-[11px] text-cyan-300 font-extrabold uppercase">
                Leistungs-Korridor
              </span>
              <div className="text-xl font-black text-cyan-300 mt-1.5">
                {singleAna.visit_stats.korridor_min} – {singleAna.visit_stats.korridor_max}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Standard-Korridor</div>
            </div>
          </div>

          {/* VISUELLE HIGHLIGHTS: Radar + Grafik 1 (Leg-Trend) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LINKS: Radar Chart (Herzstück!) */}
            <div className="lg:col-span-5 bg-gradient-to-b from-[#091630] to-[#050c1e] border border-cyan-500/30 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-between">
              <div className="w-full flex items-center justify-between border-b border-white/10 pb-3 mb-2">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>🎯</span> 6-Achsen Skill-Radar
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Deterministische Leistungs-Dimensionen (0–100 Punkte)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-black text-cyan-400 block">
                    Overall Skill
                  </span>
                  <span className="text-lg font-black text-white">
                    {singleAna.radar_metrics.overall_skill}
                    <span className="text-xs text-slate-400 font-normal"> / 100</span>
                  </span>
                </div>
              </div>

              <div className="py-2">
                <RadarChart
                  dimensions={singleAna.radar_metrics.dimensions}
                  playerName={singleAna.playerName}
                  size={360}
                />
              </div>

              {/* Kompakte Dimensions-Tabelle */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-white/10 text-xs">
                {singleAna.radar_metrics.dimensions.map((d) => (
                  <div key={d.key} className="bg-white/[0.02] border border-white/5 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400">{d.dim}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-black text-cyan-300">{d.value}</span>
                      <span className="text-[10px] font-bold text-slate-300">{d.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECHTS: Grafik 1 (Chronologischer Leg-Trend mit Korridor) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <LegTrendChart
                trendData={singleAna.leg_trend}
                matchAvg={singleAna.visit_stats.match_average}
                korridorMin={singleAna.visit_stats.korridor_min}
                korridorMax={singleAna.visit_stats.korridor_max}
                playerName={singleAna.playerName}
              />

              {/* Phasen & Start Kacheln */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start-Analyse */}
                <div className="bg-[#091630] border border-cyan-500/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>🏹</span> Start-Analyse (Visits 1–3)
                    </span>
                    <span className="text-xs font-black text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-400/30">
                      Start-Index: {singleAna.start_data.start_index}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white/5 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400">Visit 1</div>
                      <div className="text-base font-black text-white mt-0.5">
                        {singleAna.start_data.avg_visit_1}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400">Visit 2</div>
                      <div className="text-base font-black text-white mt-0.5">
                        {singleAna.start_data.avg_visit_2}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400">Visit 3</div>
                      <div className="text-base font-black text-white mt-0.5">
                        {singleAna.start_data.avg_visit_3}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phasen-Verlauf */}
                <div className="bg-[#091630] border border-cyan-500/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>⏳</span> Leg-Phasen Trend
                    </span>
                    <span className="text-[10px] font-bold text-amber-300 truncate max-w-[140px]">
                      {singleAna.phases.phase_trend}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white/5 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400">Early (V1-3)</div>
                      <div className="text-base font-black text-cyan-300 mt-0.5">
                        {singleAna.phases.opening.average}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400">Mid (V4-6)</div>
                      <div className="text-base font-black text-cyan-300 mt-0.5">
                        {singleAna.phases.mid_game.average}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400">Late (V7+)</div>
                      <div className="text-base font-black text-cyan-300 mt-0.5">
                        {singleAna.phases.finish.average}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ZWEITE REIHE: Grafik 2 (Darts-to-Win) + Grafik 3 (Leg-Anatomie) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DartsToWinWidget efficiency={singleAna.darts_to_win} />
            <LegAnatomyWidget anatomy={singleAna.leg_anatomy} />
          </div>

          {/* DRITTE REIHE: KI-SCOUTING-PROFIL */}
          <div className="bg-gradient-to-r from-[#091736] via-[#0b1d44] to-[#08132d] border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{singleAna.ai_profile.archetype_icon}</span>
                <div>
                  <div className="text-xs uppercase font-black text-cyan-400">
                    KI-Scouting Archetyp
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {singleAna.ai_profile.archetype}
                  </h3>
                </div>
              </div>
              <p className="text-xs text-slate-300 max-w-md italic sm:text-right">
                „{singleAna.ai_profile.archetype_desc}“
              </p>
            </div>

            {/* 3 Verhaltens-Karten (Rebound, Pressure, Focus) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bounce-Back */}
              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    {singleAna.ai_profile.bounce_back.title}
                  </span>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded"
                    style={{
                      color: singleAna.ai_profile.bounce_back.badge_color,
                      backgroundColor: `${singleAna.ai_profile.bounce_back.badge_color}22`,
                      border: `1px solid ${singleAna.ai_profile.bounce_back.badge_color}55`,
                    }}
                  >
                    {singleAna.ai_profile.bounce_back.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {singleAna.ai_profile.bounce_back.text}
                </p>
              </div>

              {/* Pressure */}
              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    {singleAna.ai_profile.pressure.title}
                  </span>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded"
                    style={{
                      color: singleAna.ai_profile.pressure.badge_color,
                      backgroundColor: `${singleAna.ai_profile.pressure.badge_color}22`,
                      border: `1px solid ${singleAna.ai_profile.pressure.badge_color}55`,
                    }}
                  >
                    {singleAna.ai_profile.pressure.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {singleAna.ai_profile.pressure.text}
                </p>
              </div>

              {/* Focus */}
              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    {singleAna.ai_profile.focus.title}
                  </span>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded"
                    style={{
                      color: singleAna.ai_profile.focus.badge_color,
                      backgroundColor: `${singleAna.ai_profile.focus.badge_color}22`,
                      border: `1px solid ${singleAna.ai_profile.focus.badge_color}55`,
                    }}
                  >
                    {singleAna.ai_profile.focus.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {singleAna.ai_profile.focus.text}
                </p>
              </div>
            </div>

            {/* Taktische Empfehlungen */}
            <div className="bg-cyan-950/30 border border-cyan-400/20 rounded-xl p-4">
              <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>💡</span> Taktische Scouting-Empfehlungen
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {singleAna.ai_profile.tactical_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: SPIELER-VERGLEICH (HEAD-TO-HEAD) */}
      {/* ==================================================== */}
      {activeTab === 'h2h' && (
        <div className="space-y-6">
          {/* Spieler-Auswahl Head-to-Head */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Spieler 1 */}
            <div className="bg-[#0b162c] border border-cyan-400/40 rounded-2xl p-4 flex items-center gap-4">
              <PlayerAvatar
                name={h2hAna1.playerName}
                size={54}
                borderColor="#00D4FF"
              />
              <div className="flex-1">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                  Spieler 1 (Cyan)
                </span>
                <select
                  value={h2hPlayerId1}
                  onChange={(e) => setH2hPlayerId1(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-cyan-400/50 text-white font-extrabold text-sm rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.team})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Spieler 2 */}
            <div className="bg-[#0b162c] border border-amber-400/40 rounded-2xl p-4 flex items-center gap-4">
              <PlayerAvatar
                name={h2hAna2.playerName}
                size={54}
                borderColor="#F59E0B"
              />
              <div className="flex-1">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                  Spieler 2 (Bernstein)
                </span>
                <select
                  value={h2hPlayerId2}
                  onChange={(e) => setH2hPlayerId2(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-amber-400/50 text-white font-extrabold text-sm rounded-xl px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.team})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Doppel-Radar Chart & Kennzahlen-Vergleich */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Doppel-Radar */}
            <div className="lg:col-span-6 bg-gradient-to-b from-[#091630] to-[#050c1e] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-between">
              <div className="w-full border-b border-white/10 pb-3 mb-2 text-center">
                <h3 className="text-base font-black text-white flex items-center justify-center gap-2">
                  <span>⚔️</span> Head-to-Head Skill-Radar
                </h3>
                <p className="text-[11px] text-slate-400">
                  Direkter Vergleich aller 6 Leistungsachsen
                </p>
              </div>

              <RadarChart
                dimensions={h2hAna1.radar_metrics.dimensions}
                comparisonDimensions={h2hAna2.radar_metrics.dimensions}
                playerName={h2hAna1.playerName}
                comparisonPlayerName={h2hAna2.playerName}
                size={360}
              />

              <div className="w-full flex items-center justify-around pt-4 border-t border-white/10 text-xs">
                <div className="text-center">
                  <span className="text-slate-400 block text-[10px]">Overall Skill (P1)</span>
                  <span className="text-xl font-black text-cyan-300">
                    {h2hAna1.radar_metrics.overall_skill}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 block text-[10px]">Overall Skill (P2)</span>
                  <span className="text-xl font-black text-amber-300">
                    {h2hAna2.radar_metrics.overall_skill}
                  </span>
                </div>
              </div>
            </div>

            {/* Metriken Gegenüberstellung */}
            <div className="lg:col-span-6 bg-gradient-to-b from-[#091630] to-[#050c1e] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="border-b border-white/10 pb-3 mb-4 flex items-center justify-between text-xs font-black">
                  <span className="text-cyan-300">{h2hAna1.playerName}</span>
                  <span className="text-slate-400 uppercase">Kategorie</span>
                  <span className="text-amber-300">{h2hAna2.playerName}</span>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    {
                      label: 'Match Average',
                      v1: h2hAna1.visit_stats.match_average,
                      v2: h2hAna2.visit_stats.match_average,
                      format: (v: number) => v.toFixed(1),
                    },
                    {
                      label: 'First-9 Average',
                      v1: h2hAna1.first_n.first_9_avg,
                      v2: h2hAna2.first_n.first_9_avg,
                      format: (v: number) => v.toFixed(1),
                    },
                    {
                      label: 'Start-Index (0–100)',
                      v1: h2hAna1.start_data.start_index,
                      v2: h2hAna2.start_data.start_index,
                      format: (v: number) => v.toFixed(1),
                    },
                    {
                      label: 'Mid-Game Schnitt',
                      v1: h2hAna1.phases.mid_game.average,
                      v2: h2hAna2.phases.mid_game.average,
                      format: (v: number) => v.toFixed(1),
                    },
                    {
                      label: 'Darts / Leg (Sieg)',
                      v1: h2hAna1.visit_stats.darts_per_leg,
                      v2: h2hAna2.visit_stats.darts_per_leg,
                      format: (v: number) => (v > 0 ? v.toFixed(1) : '-'),
                      inverse: true,
                    },
                    {
                      label: 'Wurfstreuung (± σ)',
                      v1: h2hAna1.visit_stats.volatility_std,
                      v2: h2hAna2.visit_stats.volatility_std,
                      format: (v: number) => v.toFixed(1),
                      inverse: true,
                    },
                    {
                      label: '100+ Trefferquote',
                      v1: h2hAna1.dist_data.thresholds['100+']?.pct || 0,
                      v2: h2hAna2.dist_data.thresholds['100+']?.pct || 0,
                      format: (v: number) => `${v.toFixed(1)}%`,
                    },
                  ].map((row) => {
                    const lead1 = row.inverse ? row.v1 < row.v2 : row.v1 > row.v2;
                    const lead2 = row.inverse ? row.v2 < row.v1 : row.v2 > row.v1;

                    return (
                      <div
                        key={row.label}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                      >
                        <span
                          className={`font-black text-sm ${
                            lead1 ? 'text-cyan-300 drop-shadow' : 'text-slate-400'
                          }`}
                        >
                          {row.format(row.v1)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-300 text-center">
                          {row.label}
                        </span>
                        <span
                          className={`font-black text-sm ${
                            lead2 ? 'text-amber-300 drop-shadow' : 'text-slate-400'
                          }`}
                        >
                          {row.format(row.v2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Duell-Fazit */}
              <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl">
                <span className="font-extrabold text-white block mb-1">
                  ⚖️ Duell-Einschätzung:
                </span>
                {h2hAna1.visit_stats.match_average >= h2hAna2.visit_stats.match_average ? (
                  <span>
                    <strong className="text-cyan-300">{h2hAna1.playerName}</strong> geht
                    mit leichtem Scoring-Vorteil ins Match. Wenn{' '}
                    <strong className="text-amber-300">{h2hAna2.playerName}</strong> im
                    Mid-Game gegenhält und seine Finish-Chancen nutzt, bleibt das Spiel
                    völlig offen.
                  </span>
                ) : (
                  <span>
                    <strong className="text-amber-300">{h2hAna2.playerName}</strong> führt
                    im Scoring-Schnitt. Der Schlüssel für{' '}
                    <strong className="text-cyan-300">{h2hAna1.playerName}</strong> liegt
                    in einem aggressiven Start und konsequenter Doppelquote.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: DAE-MATRIX (GESAMTÜBERSICHT) */}
      {/* ==================================================== */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Team Filter */}
          <div className="flex items-center justify-between bg-[#0b162c] border border-purple-500/30 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>📊</span> DAE Gesamtrangliste & Leistungsmatrix
              </h3>
              <p className="text-[11px] text-slate-400">
                Alle aktiven Lions-Darter sortiert nach Match-Average und DAE-Skill
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-xl p-1">
              {(['all', 'A-Team', 'B-Team'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMatrixTeamFilter(t)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    matrixTeamFilter === t
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'Alle Teams' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Tabelle */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#070e20] shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-black border-b border-white/10">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Spieler</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center">Match Avg</th>
                  <th className="py-3 px-4 text-center">First-9</th>
                  <th className="py-3 px-4 text-center">Start-Index</th>
                  <th className="py-3 px-4 text-center">Mid-Game</th>
                  <th className="py-3 px-4 text-center">Darts/Leg</th>
                  <th className="py-3 px-4 text-center">Konstanz</th>
                  <th className="py-3 px-4 text-center">Skill Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {matrixData.map(({ player, ana }, idx) => (
                  <tr
                    key={player.id}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-4 font-black text-slate-400">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar name={player.name} size={30} />
                        <span className="font-extrabold text-white text-sm">
                          {player.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-400">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          player.team === 'A-Team'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {player.team}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-cyan-300 text-sm">
                      {ana.visit_stats.match_average.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">
                      {ana.first_n.first_9_avg.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-300">
                      {ana.start_data.start_index.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-300">
                      {ana.phases.mid_game.average.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">
                      {ana.visit_stats.darts_per_leg > 0
                        ? ana.visit_stats.darts_per_leg.toFixed(1)
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span
                        className="px-2 py-0.5 rounded text-[10px]"
                        style={{
                          color: ana.visit_stats.konstanz_color,
                          backgroundColor: `${ana.visit_stats.konstanz_color}18`,
                        }}
                      >
                        {ana.visit_stats.konstanz_label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-purple-300 text-sm">
                      {ana.radar_metrics.overall_skill}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
