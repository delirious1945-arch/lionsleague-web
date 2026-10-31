'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  PdcLiveRankingResult,
  PdcLeaderboardRow,
  getLivePdcRankingAction,
} from '../actions';
import { getPdcBadge } from '../types';
import { getPlayerPhotoUrl, getPlayerInitials } from '@/lib/avatar';
import {
  Trophy,
  Target,
  Maximize2,
  Minimize2,
  RefreshCw,
  Clock,
  ArrowLeft,
  Flame,
  Award,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface PdcLiveClientProps {
  initialData: PdcLiveRankingResult;
  initialFilter: 'today' | 'month' | 'all';
}

export default function PdcLiveClient({
  initialData,
  initialFilter,
}: PdcLiveClientProps) {
  const [data, setData] = useState<PdcLiveRankingResult>(initialData);
  const [filter, setFilter] = useState<'today' | 'month' | 'all'>(initialFilter);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(8);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [soundAlert, setSoundAlert] = useState<boolean>(true);

  const prevSessionsCountRef = useRef<number>(initialData.totalSessions);

  // Digital-Uhr
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Web Audio Ping bei neuem Score
  const playLivePing = () => {
    if (!soundAlert || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  // Daten abrufen
  const refreshData = async (selectedFilter: 'today' | 'month' | 'all' = filter) => {
    setIsUpdating(true);
    try {
      const result = await getLivePdcRankingAction(selectedFilter);
      if (result.totalSessions > prevSessionsCountRef.current) {
        playLivePing();
      }
      prevSessionsCountRef.current = result.totalSessions;
      setData(result);
    } catch (e) {
      console.error('Fehler beim Aktualisieren des Live-Boards:', e);
    } finally {
      setIsUpdating(false);
      setCountdown(8);
    }
  };

  // Auto-Sync Timer alle 8 Sekunden
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshData(filter);
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSync, filter]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const leader = data.leaderboard[0] || null;
  const bestDoublesPlayer = [...data.leaderboard].sort(
    (a, b) => b.best_doubles_hit - a.best_doubles_hit
  )[0];
  const bestShanghaiPlayer = [...data.leaderboard].sort(
    (a, b) => b.total_shanghais - a.total_shanghais
  )[0];

  return (
    <div className="forced-dark master-view min-h-screen w-full max-w-full overflow-x-hidden bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30" data-master="true">
      {/* TV Header Bar */}
      <header className="px-4 py-3 sm:px-6 bg-slate-900/95 border-b border-white/10 flex items-center justify-between gap-4 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            href="/training/pdc-challenge"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">Zurück zum Spiel</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_#34d399]" />
            <h1 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="text-amber-400">🎯 PDC CHALLENGE</span>
              <span className="text-slate-400 text-xs sm:text-sm font-normal hidden lg:inline">
                | 57-Darts Leistungsabzeichen
              </span>
            </h1>
          </div>
        </div>

        {/* Center Filter Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => {
              setFilter('today');
              refreshData('today');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'today'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Heute ({data.hasTodayData ? 'Aktiv' : 'Leer'})
          </button>
          <button
            onClick={() => {
              setFilter('month');
              refreshData('month');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'month'
                ? 'bg-purple-500 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monat ({data.hasMonthData ? (data.monthLabel || 'Aktiv') : 'Leer'})
          </button>
          <button
            onClick={() => {
              setFilter('all');
              refreshData('all');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gesamtranking
          </button>
        </div>

        {/* Right Tools (Clock, Sync, Fullscreen) */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-white/5 font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">{currentTime}</span>
          </div>

          <button
            onClick={() => refreshData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold transition-all cursor-pointer"
            title="Jetzt manuell aktualisieren"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin text-amber-400' : ''}`} />
            <span className="font-mono text-[11px] text-amber-300 font-bold">{countdown}s</span>
          </button>

          <button
            onClick={() => setSoundAlert(!soundAlert)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title={soundAlert ? 'Sound an' : 'Sound aus'}
          >
            {soundAlert ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Vollbild umschalten"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Spotlight Cards */}
        {data.leaderboard.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Gesamtführender */}
            {leader && (
              <div className="bg-gradient-to-br from-amber-500/20 via-slate-900/90 to-slate-950 border-2 border-amber-400/60 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5">
                    {filter === 'today' ? '👑 TAGESBESTER' : filter === 'month' ? '👑 MONATSCHAMPION' : '👑 PDC CHAMPION'}
                  </span>
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>

                <div className="my-4">
                  <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 flex-wrap">
                    <span>{leader.player_name}</span>
                    {filter === 'today' && leader.attempt_label && (
                      <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-sans">
                        {leader.attempt_label}
                      </span>
                    )}
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-amber-300 font-mono mt-1">
                    {leader.best_score} <span className="text-base font-normal text-slate-400">Pkt</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="text-slate-400">Abzeichen & Einstufung:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-md font-black flex items-center gap-1 shadow-sm ${getPdcBadge(leader.best_score).badgeClass}`}>
                      <span>{getPdcBadge(leader.best_score).icon}</span>
                      <span>{getPdcBadge(leader.best_score).name}</span>
                    </span>
                    <span className="text-xs font-bold text-white bg-slate-950 px-2.5 py-0.5 rounded-md border border-white/10">
                      {getPdcBadge(leader.best_score).title}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Doppel-König */}
            {bestDoublesPlayer && (
              <div className="bg-gradient-to-br from-emerald-500/20 via-slate-900/90 to-slate-950 border-2 border-emerald-500/50 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    {filter === 'today' ? '🎯 DOPPEL-KÖNIG (HEUTE)' : filter === 'month' ? '🎯 DOPPEL-KÖNIG (MONAT)' : '🎯 DOPPEL-KÖNIG (TEIL 2)'}
                  </span>
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>

                <div className="my-4">
                  <div className="text-2xl font-black text-white flex items-center gap-2 flex-wrap">
                    <span>{bestDoublesPlayer.player_name}</span>
                    {filter === 'today' && bestDoublesPlayer.attempt_label && (
                      <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-sans">
                        {bestDoublesPlayer.attempt_label}
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-black text-emerald-300 font-mono mt-1">
                    {bestDoublesPlayer.best_doubles_hit} <span className="text-base font-normal text-slate-400">/ 21 Doppel</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>Punkte in Teil 2:</span>
                  <span className="text-emerald-300 font-bold font-mono">
                    bis zu {bestDoublesPlayer.best_doubles_hit * 50} Pkt
                  </span>
                </div>
              </div>
            )}

            {/* 3. Shanghai Master */}
            {bestShanghaiPlayer && (
              <div className="bg-gradient-to-br from-purple-500/20 via-slate-900/90 to-slate-950 border-2 border-purple-500/50 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                    {filter === 'today' ? '✨ SHANGHAI MASTER (HEUTE)' : filter === 'month' ? '✨ SHANGHAI MASTER (MONAT)' : '✨ SHANGHAI MASTER'}
                  </span>
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>

                <div className="my-4">
                  <div className="text-2xl font-black text-white flex items-center gap-2 flex-wrap">
                    <span>{bestShanghaiPlayer.player_name}</span>
                    {filter === 'today' && bestShanghaiPlayer.attempt_label && (
                      <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-sans">
                        {bestShanghaiPlayer.attempt_label}
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-black text-purple-300 font-mono mt-1">
                    {bestShanghaiPlayer.total_shanghais} <span className="text-base font-normal text-slate-400">Shanghais</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>Bonus-Punkte gesamt:</span>
                  <span className="text-purple-300 font-bold font-mono">
                    +{bestShanghaiPlayer.total_shanghais * 100} Pkt
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TV Table */}
        <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>
                {filter === 'today'
                  ? 'Heutige Durchgänge'
                  : filter === 'month'
                  ? `Monatsranking (${data.monthLabel || 'Monat'})`
                  : 'Gesamtranking'}{' '}
                ({data.leaderboard.length} {filter === 'today' ? 'Durchgänge' : 'Spieler'})
              </span>
            </h2>
            <div className="text-xs text-slate-400">
              Absolvierte Spiele: <strong className="text-white font-mono">{data.totalSessions}</strong>
            </div>
          </div>

          {data.leaderboard.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="text-3xl">🎯</div>
              <div className="text-slate-400 text-sm font-bold">
                {filter === 'today'
                  ? 'Heute wurden noch keine PDC Challenges gespielt.'
                  : filter === 'month'
                  ? 'In diesem Monat wurden noch keine PDC Challenges gespielt.'
                  : 'Noch keine Einträge in der Datenbank vorhanden.'}
              </div>
              <div className="text-xs text-slate-500">
                Spiele am Board die 57 Darts und sehe dein Ergebnis hier live auf dem TV!
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Rang</th>
                    <th className="py-3 px-4">
                      {filter === 'today' ? 'Spieler / Durchgang' : 'Spieler'}
                    </th>
                    <th className="py-3 px-4 text-right">
                      {filter === 'today' ? 'Punkte' : 'Highscore'}
                    </th>
                    <th className="py-3 px-4 text-center">Abzeichen & Einstufung</th>
                    <th className="py-3 px-4 text-right">Doppel (Teil 2)</th>
                    <th className="py-3 px-4 text-right">Shanghais</th>
                    {filter === 'today' ? (
                      <>
                        <th className="py-3 px-4 text-right">Teil 1 (10-15)</th>
                        <th className="py-3 px-4 text-right">Teil 3 (15-20)</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4 text-right">Ø Punkte</th>
                        <th className="py-3 px-4 text-right">Spiele</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {data.leaderboard.map((row, idx) => {
                    const badge = getPdcBadge(row.best_score);
                    const isPodium = row.rank <= 3;
                    return (
                      <tr
                        key={`${row.player_name}_${row.session_id || idx}_${row.attempt_nr || idx}`}
                        className={`transition-colors ${
                          row.rank === 1
                            ? 'bg-amber-500/10 hover:bg-amber-500/15'
                            : row.rank === 2
                            ? 'bg-slate-700/20 hover:bg-slate-700/30'
                            : row.rank === 3
                            ? 'bg-amber-900/15 hover:bg-amber-900/25'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="py-4 px-4 font-black">
                          {row.rank === 1 ? (
                            <span className="text-amber-400 flex items-center gap-1">🥇 #1</span>
                          ) : row.rank === 2 ? (
                            <span className="text-slate-300 flex items-center gap-1">🥈 #2</span>
                          ) : row.rank === 3 ? (
                            <span className="text-amber-600 flex items-center gap-1">🥉 #3</span>
                          ) : (
                            <span className="text-slate-500">#{row.rank}</span>
                          )}
                        </td>

                        <td className="py-4 px-4 font-sans font-black text-white text-base">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{row.player_name}</span>
                            {filter === 'today' && row.attempt_label && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                {row.attempt_label}
                              </span>
                            )}
                            {filter === 'today' && row.time_label && (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/5">
                                🕒 {row.time_label}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right font-black text-xl text-amber-300">
                          {row.best_score}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-sans font-black shadow-md ${badge.badgeClass}`}
                            >
                              <span>{badge.icon}</span>
                              <span>{badge.name}</span>
                            </span>
                            <span className="text-xs font-sans font-bold text-slate-200 mt-1 whitespace-nowrap bg-slate-950/80 px-2 py-0.5 rounded border border-white/10">
                              {badge.title}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right text-emerald-400 font-bold">
                          {row.best_doubles_hit} / 21
                        </td>

                        <td className="py-4 px-4 text-right text-purple-400 font-bold">
                          {row.total_shanghais}
                        </td>

                        {filter === 'today' ? (
                          <>
                            <td className="py-4 px-4 text-right text-cyan-300 font-bold">
                              {row.score_part1 ?? 0} Pkt
                            </td>
                            <td className="py-4 px-4 text-right text-indigo-300 font-bold">
                              {row.score_part3 ?? 0} Pkt
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-4 px-4 text-right text-slate-300">
                              {row.avg_score}
                            </td>
                            <td className="py-4 px-4 text-right text-slate-500">
                              {row.sessions_count}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
