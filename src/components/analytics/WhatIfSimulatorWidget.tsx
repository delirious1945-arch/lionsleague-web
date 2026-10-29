'use client';

import React, { useState, useMemo } from 'react';
import { Player, RawLegVisit } from '@/lib/data';
import PlayerAvatar from '@/components/PlayerAvatar';
import {
  predictAverage,
  simulateScenario,
  requiredDoubleRate,
  requiredSetupDarts,
  estimateSetupDartsFromLegs,
  averageBand,
} from '@/lib/whatIfEngine';

interface WhatIfSimulatorWidgetProps {
  players: Player[];
  allLegVisits: Record<number, RawLegVisit[][]>;
  initialPlayerId?: number;
}

export default function WhatIfSimulatorWidget({
  players,
  allLegVisits,
  initialPlayerId,
}: WhatIfSimulatorWidgetProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(
    initialPlayerId || (players.length > 0 ? players[0].id : 0)
  );

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId) || players[0],
    [players, selectedPlayerId]
  );

  // Echte Liga-Legs des Spielers
  const playerLegs = useMemo(() => {
    return allLegVisits[selectedPlayerId] || [];
  }, [allLegVisits, selectedPlayerId]);

  // Automatische Schätzung der Setup-Darts aus Liga-Daten
  const setupEstimation = useMemo(() => {
    if (!playerLegs || playerLegs.length === 0) {
      return {
        sufficient: false,
        sample_legs: 0,
        hinweis: 'Keine Leg-Daten für diesen Spieler vorhanden.',
      };
    }
    return estimateSetupDartsFromLegs(playerLegs);
  }, [playerLegs]);

  // Szenario-Zustände
  const defaultSetup = setupEstimation.sufficient && setupEstimation.setup_darts_mean
    ? setupEstimation.setup_darts_mean
    : 18.0;

  const [setupDarts, setSetupDarts] = useState<number>(defaultSetup);
  const [doubleRateNow, setDoubleRateNow] = useState<number>(20.0);
  const [doubleRateScenario, setDoubleRateScenario] = useState<number>(25.0);
  const [setupDelta, setSetupDelta] = useState<number>(-2.0);

  // Wenn der Spieler wechselt, Setup-Darts auf dessen Schätzwert setzen
  React.useEffect(() => {
    if (setupEstimation.sufficient && setupEstimation.setup_darts_mean) {
      setSetupDarts(setupEstimation.setup_darts_mean);
    } else {
      setSetupDarts(18.0);
    }
  }, [selectedPlayerId, setupEstimation]);

  // Szenario-Berechnung
  const scenarioResult = useMemo(() => {
    return simulateScenario(
      setupDarts,
      doubleRateNow / 100.0,
      doubleRateScenario / 100.0,
      setupDelta
    );
  }, [setupDarts, doubleRateNow, doubleRateScenario, setupDelta]);

  // Bandbreite der Unsicherheit
  const uncertaintyBand = useMemo(() => {
    if (
      setupEstimation.sufficient &&
      setupEstimation.setup_darts_low !== undefined &&
      setupEstimation.setup_darts_high !== undefined &&
      Math.abs(setupDarts - (setupEstimation.setup_darts_mean || 0)) < 0.1
    ) {
      return averageBand(
        setupEstimation.setup_darts_low,
        setupEstimation.setup_darts_high,
        doubleRateNow / 100.0
      );
    }
    return null;
  }, [setupEstimation, setupDarts, doubleRateNow]);

  // Zielplaner
  const baseAvg = scenarioResult.baseline?.average || 50.0;
  const [targetAverage, setTargetAverage] = useState<number>(Math.round(baseAvg + 5));

  // Zielplaner neu ausrichten, wenn Baseline stark abweicht
  React.useEffect(() => {
    if (scenarioResult.baseline?.average) {
      setTargetAverage(Math.round(scenarioResult.baseline.average + 5));
    }
  }, [scenarioResult.baseline?.average]);

  const targetReqDouble = useMemo(() => {
    return requiredDoubleRate(targetAverage, setupDarts);
  }, [targetAverage, setupDarts]);

  const targetReqSetup = useMemo(() => {
    return requiredSetupDarts(targetAverage, doubleRateNow / 100.0);
  }, [targetAverage, doubleRateNow]);

  // Chart-Punkte generieren (5% bis 60% Doppelquote)
  const chartData = useMemo(() => {
    const points: Array<{ rate: number; avgNow: number; avgScen: number }> = [];
    const targetSetup = Math.max(setupDarts + setupDelta, 0.0);
    for (let r = 5; r <= 60; r += 2) {
      const pNow = predictAverage(setupDarts, r / 100.0);
      const pScen = predictAverage(targetSetup, r / 100.0);
      if (pNow.valid && pScen.valid) {
        points.push({
          rate: r,
          avgNow: pNow.average || 0,
          avgScen: pScen.average || 0,
        });
      }
    }
    return points;
  }, [setupDarts, setupDelta]);

  // SVG Chart Dimensionen
  const chartWidth = 600;
  const chartHeight = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const minRate = 5;
  const maxRate = 60;
  const minAvg = useMemo(() => {
    if (chartData.length === 0) return 30;
    const all = chartData.flatMap((d) => [d.avgNow, d.avgScen]);
    return Math.floor(Math.min(...all) / 5) * 5;
  }, [chartData]);

  const maxAvg = useMemo(() => {
    if (chartData.length === 0) return 100;
    const all = chartData.flatMap((d) => [d.avgNow, d.avgScen]);
    return Math.ceil(Math.max(...all) / 5) * 5;
  }, [chartData]);

  const getX = (rate: number) => {
    return (
      padding.left +
      ((rate - minRate) / (maxRate - minRate)) *
        (chartWidth - padding.left - padding.right)
    );
  };

  const getY = (avg: number) => {
    return (
      chartHeight -
      padding.bottom -
      ((avg - minAvg) / (maxAvg - minAvg)) *
        (chartHeight - padding.top - padding.bottom)
    );
  };

  const pathNow = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.rate).toFixed(1)} ${getY(d.avgNow).toFixed(1)}`)
      .join(' ');
  }, [chartData, minAvg, maxAvg]);

  const pathScen = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.rate).toFixed(1)} ${getY(d.avgScen).toFixed(1)}`)
      .join(' ');
  }, [chartData, minAvg, maxAvg]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-slate-950/90 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🔮</span>
              <h2 className="text-lg sm:text-xl font-black text-purple-300 uppercase tracking-wider">
                What-if-Prognose & Leistungs-Simulator
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Analysiere mathematisch präzise, wie sich eine Steigerung deiner Doppelquote
              oder ein schnelleres Setup unmittelbar auf deinen 3-Dart-Average auswirken.
            </p>
          </div>

          {/* Spieler Selector */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-full sm:w-auto">
            <PlayerAvatar
              name={selectedPlayer?.name || ''}
              size={36}
            />
            <div className="flex-1 sm:w-48">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">
                Spieler auswählen
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                className="w-full bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name} ({p.team})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reale Datenbasis (DAE Kennzahlen) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            🎯 Reale Setup-Darts bis Finish (Ø)
          </div>
          {setupEstimation.sufficient ? (
            <div>
              <div className="text-2xl font-black text-cyan-400">
                {setupEstimation.setup_darts_mean?.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-400">Darts</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                95%-Bandbreite: {setupEstimation.setup_darts_low?.toFixed(1)} –{' '}
                {setupEstimation.setup_darts_high?.toFixed(1)} Darts
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">
                Basis: {setupEstimation.sample_legs} Liga-Legs mit erreichter Finish-Zone
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-300 py-2">
              {setupEstimation.hinweis || 'Zu wenige Liga-Daten für eine verlässliche Schätzung.'}
              <div className="text-[10px] text-slate-400 mt-1">
                Standard-Wert 18.0 Darts wird als Richtwert genutzt.
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            ⚡ Hebelwirkung im Darts
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Darts pro Leg setzen sich aus <span className="text-cyan-300 font-bold">Setup-Darts</span>{' '}
            und der <span className="text-purple-300 font-bold">Doppel-Effizienz (1/p)</span> zusammen.
            Eine Doppelquote von 20% bedeutet im Schnitt 5 Darts auf Doppel.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            📊 Statistische Sicherheit
          </div>
          {uncertaintyBand?.valid ? (
            <div>
              <div className="text-xs text-slate-300 mb-1">
                Erwarteter Ist-Average bei Streuung:
              </div>
              <div className="text-lg font-black text-purple-300">
                {uncertaintyBand.average_low?.toFixed(1)} – {uncertaintyBand.average_high?.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Konfidenzintervall ca. 95 % auf realen Legs
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Passe das Szenario individuell an, um Schwellenwerte für deine nächsten Trainingsspiele zu berechnen.
            </div>
          )}
        </div>
      </div>

      {/* Regler & Szenario-Eingabe */}
      <div className="rounded-2xl border border-white/10 bg-[#091122] p-5 shadow-xl">
        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>🎛️</span> Szenario individuell konfigurieren
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Setup Darts Ist */}
          <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-white/5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300">Setup-Darts (Ist)</label>
              <span className="text-sm font-black text-cyan-400">{setupDarts.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="9"
              max="45"
              step="0.5"
              value={setupDarts}
              onChange={(e) => setSetupDarts(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>9 Darts</span>
              <span>27 Darts</span>
              <span>45 Darts</span>
            </div>
          </div>

          {/* 2. Doppelquote Ist */}
          <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-white/5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300">Doppelquote (Ist)</label>
              <span className="text-sm font-black text-cyan-400">{doubleRateNow.toFixed(1)} %</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={doubleRateNow}
              onChange={(e) => setDoubleRateNow(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>5 %</span>
              <span>30 %</span>
              <span>60 %</span>
            </div>
          </div>

          {/* 3. Doppelquote Szenario */}
          <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-purple-500/30">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-purple-300">Doppelquote (Szenario)</label>
              <span className="text-sm font-black text-purple-300">{doubleRateScenario.toFixed(1)} %</span>
            </div>
            <input
              type="range"
              min="5"
              max="70"
              step="1"
              value={doubleRateScenario}
              onChange={(e) => setDoubleRateScenario(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Delta: {(doubleRateScenario - doubleRateNow) >= 0 ? '+' : ''}{(doubleRateScenario - doubleRateNow).toFixed(1)} %</span>
              <span>70 %</span>
            </div>
          </div>

          {/* 4. Setup Darts Delta */}
          <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-purple-500/30">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-purple-300">Änderung Setup-Darts</label>
              <span className="text-sm font-black text-purple-300">
                {setupDelta > 0 ? `+${setupDelta.toFixed(1)}` : setupDelta.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="-9"
              max="9"
              step="0.5"
              value={setupDelta}
              onChange={(e) => setSetupDelta(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>-9 (schneller)</span>
              <span>0</span>
              <span>+9</span>
            </div>
          </div>
        </div>

        {/* Prognose-Karten */}
        {scenarioResult.valid && scenarioResult.baseline && scenarioResult.scenario ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-slate-900/90 p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Average Ist (Modell)
              </span>
              <div className="text-3xl font-black text-cyan-400 mt-1">
                {scenarioResult.baseline.average?.toFixed(1)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Ø {scenarioResult.baseline.darts_per_leg?.toFixed(1)} Darts pro Leg
                ({scenarioResult.baseline.double_darts?.toFixed(1)} Darts auf Doppel)
              </div>
            </div>

            <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-4">
              <span className="text-[11px] font-bold text-purple-300 uppercase">
                Average Szenario (Modell)
              </span>
              <div className="text-3xl font-black text-purple-300 mt-1 flex items-baseline gap-2">
                {scenarioResult.scenario.average?.toFixed(1)}
                <span
                  className={`text-sm font-extrabold ${
                    (scenarioResult.delta_average || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(scenarioResult.delta_average || 0) >= 0 ? '+' : ''}
                  {scenarioResult.delta_average?.toFixed(1)}
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Setup: {scenarioResult.scenario.setup_darts?.toFixed(1)} Darts |{' '}
                Doppel: {((scenarioResult.scenario.double_rate || 0) * 100).toFixed(1)} %
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/90 p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Darts pro Leg Szenario
              </span>
              <div className="text-3xl font-black text-white mt-1 flex items-baseline gap-2">
                {scenarioResult.scenario.darts_per_leg?.toFixed(1)}
                <span
                  className={`text-sm font-extrabold ${
                    (scenarioResult.delta_darts_per_leg || 0) <= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {(scenarioResult.delta_darts_per_leg || 0) <= 0 ? '' : '+'}
                  {scenarioResult.delta_darts_per_leg?.toFixed(1)} Darts
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Doppel-Phase: {scenarioResult.scenario.double_darts?.toFixed(1)} Darts pro Leg
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs">
            {scenarioResult.hinweis}
          </div>
        )}
      </div>

      {/* Visuelle Verlaufskurve */}
      <div className="rounded-2xl border border-white/10 bg-[#091122] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>📈</span> Average über Doppelquote
            </h3>
            <p className="text-xs text-slate-400">
              Vergleich: Ist-Setup ({setupDarts.toFixed(1)} Darts) vs. Szenario-Setup{' '}
              {Math.max(setupDarts + setupDelta, 0.0).toFixed(1)} Darts
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-cyan-400"></div>
              <span className="text-slate-300">Ist-Setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-purple-400 border-dashed"></div>
              <span className="text-purple-300">Szenario-Setup</span>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full max-w-full h-auto text-xs"
          >
            {/* Grid-Linien & Y-Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const val = minAvg + pct * (maxAvg - minAvg);
              const y = getY(val);
              return (
                <g key={pct}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {Math.round(val)}
                  </text>
                </g>
              );
            })}

            {/* X-Labels (Doppelquote in %) */}
            {[10, 20, 30, 40, 50, 60].map((rate) => {
              const x = getX(rate);
              return (
                <g key={rate}>
                  <line
                    x1={x}
                    y1={chartHeight - padding.bottom}
                    x2={x}
                    y2={chartHeight - padding.bottom + 4}
                    stroke="rgba(255,255,255,0.2)"
                  />
                  <text
                    x={x}
                    y={chartHeight - padding.bottom + 16}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {rate}%
                  </text>
                </g>
              );
            })}

            {/* Linien */}
            <path d={pathNow} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            <path
              d={pathScen}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.5"
              strokeDasharray="5 4"
            />

            {/* Marker für aktuellen Ist-Punkt */}
            {scenarioResult.baseline?.average && (
              <circle
                cx={getX(doubleRateNow)}
                cy={getY(scenarioResult.baseline.average)}
                r="5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="2"
              />
            )}

            {/* Marker für Szenario-Punkt */}
            {scenarioResult.scenario?.average && (
              <circle
                cx={getX(doubleRateScenario)}
                cy={getY(scenarioResult.scenario.average)}
                r="5"
                fill="#c084fc"
                stroke="#0f172a"
                strokeWidth="2"
              />
            )}
          </svg>
        </div>
      </div>

      {/* 🏁 Zielplaner (Umkehrrechnung) */}
      <div className="rounded-2xl border border-white/10 bg-[#091122] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>🏁</span> Zielplaner (Umkehrrechnung)
            </h3>
            <p className="text-xs text-slate-400">
              Welchen Average möchtest du spielen? Das Modell berechnet deine benötigten Schwellenwerte.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-400 font-bold">Ziel-Average:</span>
            <input
              type="number"
              min="30"
              max="110"
              step="0.5"
              value={targetAverage}
              onChange={(e) => setTargetAverage(Number(e.target.value))}
              className="w-16 bg-transparent text-emerald-400 font-black text-base focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase">
              Hebel Doppelquote
            </span>
            {targetReqDouble.valid ? (
              <div className="mt-2">
                <div className="text-sm text-slate-300">
                  Bei deinen aktuellen{' '}
                  <span className="font-bold text-cyan-400">{setupDarts.toFixed(1)} Setup-Darts</span>{' '}
                  brauchst du:
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {((targetReqDouble.required_double_rate || 0) * 100).toFixed(1)} % Doppelquote
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Ergibt ca. {targetReqDouble.darts_per_leg_target?.toFixed(1)} Darts pro Leg
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-300 mt-2">
                {targetReqDouble.hinweis}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase">
              Hebel Setup-Tempo
            </span>
            {targetReqSetup.valid ? (
              <div className="mt-2">
                <div className="text-sm text-slate-300">
                  Bei deiner aktuellen{' '}
                  <span className="font-bold text-cyan-400">{doubleRateNow.toFixed(1)} % Doppelquote</span>{' '}
                  dürfen es höchstens sein:
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {targetReqSetup.max_setup_darts?.toFixed(1)} Setup-Darts
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Du müsstest also {Math.max(setupDarts - (targetReqSetup.max_setup_darts || 0), 0).toFixed(1)} Darts früher im Finish stehen.
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-300 mt-2">
                {targetReqSetup.hinweis}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DAE Validierung & Transparenzhinweis */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-slate-400 text-xs leading-relaxed">
        <span className="font-bold text-amber-400 mr-1.5">⚖️ DAE Transparenz-Hinweis:</span>
        Das Rechenmodell nimmt eine geometrische Verteilung der Doppelwürfe an (Erwartungswert{' '}
        <span className="text-slate-300">1 / p</span>) und prognostiziert den Average eines gewonnenen Legs.
        Es dient als sportliche Orientierungshilfe und Trainingskompass, nicht als deterministische Wettkampfgarantie.
      </div>
    </div>
  );
}
