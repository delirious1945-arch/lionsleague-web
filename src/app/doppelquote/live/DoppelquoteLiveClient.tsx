'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LiveRankingResult,
  PlayerOverallRank,
  TargetLeader,
  getLiveDoppelquoteRankingAction,
} from '../actions';
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
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface DoppelquoteLiveClientProps {
  initialData: LiveRankingResult;
  initialFilter: 'today' | 'month' | 'all';
}

const TARGETS: ('D20' | 'D10' | 'D16' | 'D8' | 'D4')[] = ['D20', 'D10', 'D16', 'D8', 'D4'];

const TARGET_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  D20: { bg: 'bg-rose-500/15', border: 'border-rose-500/40', text: 'text-rose-300', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.25)]' },
  D10: { bg: 'bg-blue-500/15', border: 'border-blue-500/40', text: 'text-blue-300', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.25)]' },
  D16: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300', glow: 'shadow-[0_0_20px_rgba(160,185,129,0.25)]' },
  D8:  { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]' },
  D4:  { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-300', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.25)]' },
};

export default function DoppelquoteLiveClient({
  initialData,
  initialFilter,
}: DoppelquoteLiveClientProps) {
  const [data, setData] = useState<LiveRankingResult>(initialData);
  const [filter, setFilter] = useState<'today' | 'month' | 'all'>(initialFilter);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(6);
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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  // Daten abrufen
  const refreshData = async (selectedFilter = filter) => {
    setIsUpdating(true);
    try {
      const result = await getLiveDoppelquoteRankingAction(selectedFilter);
      if (result.totalSessions > prevSessionsCountRef.current) {
        playLivePing();
      }
      prevSessionsCountRef.current = result.totalSessions;
      setData(result);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Live-Rankings:', error);
    } finally {
      setIsUpdating(false);
      setCountdown(6);
    }
  };

  // Auto-Sync Countdown
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshData(filter);
          return 6;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSync, filter]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#040711] text-slate-100 flex flex-col p-2 sm:p-5 select-none font-sans overflow-x-hidden">
      
      {/* TV TOP BAR */}
      <header className="bg-slate-900/90 border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-3 backdrop-blur-md">
        
        {/* Brand & Titel */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <Link
              href="/doppelquote"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors text-xs font-bold shadow-sm"
              title="Zurück zum Trainingsspiel"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Zurück zum Spiel</span>
            </Link>

            <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0">
              <Image
                src="/logo.png"
                alt="Lions Weyhausen"
                fill
                className="object-contain drop-shadow-[0_0_12px_rgba(37,99,235,0.7)]"
                priority
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-wider text-white uppercase">
                  Lions Weyhausen
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  LIVE TV-ARENA
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-cyan-300 via-blue-400 to-amber-300 bg-clip-text text-transparent">
                Checkout Battle
              </h1>
            </div>
          </div>

          {/* Uhrzeit auf Mobile rechts */}
          <div className="lg:hidden text-right font-mono font-black text-cyan-300 text-sm">
            {currentTime}
          </div>
        </div>

        {/* Center: Live-Sync Info & Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          
          {/* Filter: Heute vs. Monat vs. Gesamt */}
          <div className="bg-slate-950 p-1 rounded-xl border border-white/10 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => {
                setFilter('today');
                refreshData('today');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === 'today'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🎯</span> Heutiges Training
            </button>
            <button
              onClick={() => {
                setFilter('month');
                refreshData('month');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === 'month'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🗓️</span> Monatsranking
            </button>
            <button
              onClick={() => {
                setFilter('all');
                refreshData('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏆</span> Gesamtranking
            </button>
          </div>

          {/* Auto-Sync Badge */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                autoSync ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-300 font-mono text-[11px]">
              {autoSync ? `Sync in ${countdown}s` : 'Pausiert'}
            </span>
            <button
              onClick={() => refreshData(filter)}
              disabled={isUpdating}
              className="text-cyan-400 hover:text-cyan-200 transition-transform active:rotate-180 p-0.5"
              title="Jetzt aktualisieren"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>

        {/* Right: Digital-Uhr & TV-Tools */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Grosse Digital-Uhr */}
          <div className="bg-slate-950/90 border border-cyan-500/30 px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.15)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-lg font-black text-cyan-300 tracking-widest">
              {currentTime}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundAlert(!soundAlert)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={soundAlert ? 'Signalton bei neuem Spiel aktiv' : 'Signalton stumm'}
          >
            {soundAlert ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Vollbild Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs shadow-lg transition-all"
            title="Auf Vollbild für TV umschalten"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'Vollbild beenden' : 'TV-Vollbild'}</span>
          </button>
        </div>

      </header>

      {/* METRIK-LEISTE FÜR DEN TV */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Aktive Spieler</span>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {data.overallRanking.length}
            </div>
          </div>
          <span className="text-2xl">👥</span>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Durchgänge (Legs)</span>
            <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
              {data.totalSessions}
            </div>
          </div>
          <span className="text-2xl">🎯</span>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Geworfene Darts</span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
              {data.totalDartsThrown}
            </div>
          </div>
          <span className="text-2xl">⚡</span>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-2.5 sm:p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Spitzenquote</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {data.overallRanking[0]?.quote_percent ? `${data.overallRanking[0].quote_percent.toFixed(1)} %` : '-'}
            </div>
          </div>
          <span className="text-2xl">👑</span>
        </div>
      </div>

      {/* HAUPT-SPLIT-SCREEN FÜR DEN FERNSEHER */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LINKE SPALTE (7 von 12 Spalten): GESAMTRANKING */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          <div className="bg-slate-900/85 border border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl flex-1 flex flex-col backdrop-blur-xl">
            
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  🏆
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
                    {filter === 'today'
                      ? 'Heutiges Training'
                      : filter === 'month'
                      ? `Monatsranking (${data.monthLabel || 'Monat'})`
                      : 'Gesamtranking Doppelquote'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {filter === 'today'
                      ? 'Alle absolvierten Einzeldurchgänge des heutigen Tages'
                      : filter === 'month'
                      ? 'Kumulierte Vereinswertung für den laufenden Kalendermonat'
                      : 'Gewertete Treffer über alle 10 Aufnahmen (D20, D10, D16, D8, D4)'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-xl">
                {filter === 'today' ? 'Heute' : filter === 'month' ? (data.monthLabel || 'Monat') : 'Gesamt'}
              </span>
            </div>

            {/* LEADERBOARD LIST */}
            {data.overallRanking.length === 0 ? (
              <div className="my-auto py-12 text-center space-y-3">
                <div className="text-5xl animate-bounce">🎯</div>
                <h3 className="text-lg font-bold text-white">
                  Noch keine Ergebnisse für {filter === 'today' ? 'heute' : filter === 'month' ? 'diesen Monat' : 'diesen Filter'} erfasst
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Sobald die Spieler am Oche stehen und das Spiel beenden, synchronisiert sich dieses TV-Board automatisch im Sekundentakt.
                </p>
                {filter === 'today' && (
                  <button
                    onClick={() => {
                      setFilter('all');
                      refreshData('all');
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    Gesamte Historie laden
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 flex-1">
                {data.overallRanking.map((player, idx) => {
                  const isFirst = idx === 0;
                  const isSecond = idx === 1;
                  const isThird = idx === 2;
                  const photo = getPlayerPhotoUrl(player.player_name);
                  const initials = getPlayerInitials(player.player_name);

                  return (
                    <div
                      key={`${player.player_name}_${player.session_id || idx}_${player.attempt_nr || idx}`}
                      className={`relative flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl border transition-all duration-300 ${
                        isFirst
                          ? 'bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-amber-950/40 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
                          : isSecond
                          ? 'bg-slate-900/80 border-slate-400/40 shadow-md'
                          : isThird
                          ? 'bg-slate-900/70 border-amber-700/40 shadow-sm'
                          : 'bg-slate-950/60 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Linker Teil: Rang & Avatar & Name */}
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {/* Rang Plakette */}
                        <div
                          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl font-black flex items-center justify-center text-sm sm:text-base shrink-0 shadow-inner ${
                            isFirst
                              ? 'bg-gradient-to-b from-amber-300 to-amber-600 text-slate-950 font-mono shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                              : isSecond
                              ? 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-950 font-mono'
                              : isThird
                              ? 'bg-gradient-to-b from-amber-600 to-amber-800 text-white font-mono'
                              : 'bg-slate-800 text-slate-400 font-mono border border-white/10'
                          }`}
                        >
                          {isFirst ? '👑 1' : `#${player.rank}`}
                        </div>

                        {/* Spieler Avatar */}
                        <div
                          className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 border-2 bg-slate-900 shadow-md ${
                            isFirst
                              ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                              : 'border-white/20'
                          }`}
                        >
                          {photo ? (
                            <Image
                              src={photo}
                              alt={player.player_name}
                              fill
                              className="object-cover object-center"
                              sizes="56px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-sm bg-gradient-to-br from-blue-700 to-slate-900 text-white">
                              {initials}
                            </div>
                          )}
                        </div>

                        {/* Name & Details */}
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-base sm:text-xl font-black text-white truncate">
                              {player.player_name}
                            </span>
                            {filter === 'today' && player.attempt_label && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                {player.attempt_label}
                              </span>
                            )}
                            {isFirst && filter !== 'today' && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 hidden sm:inline-block">
                                {filter === 'month' ? 'MONATSBESTER' : 'LEADER'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                            {filter === 'today' ? (
                              <>
                                {player.time_label && (
                                  <span className="font-mono text-slate-400 text-[11px]">{player.time_label}</span>
                                )}
                                <span>•</span>
                                <span className="font-mono text-cyan-300 font-bold">{player.total_hits}/{player.total_darts} Treffer</span>
                                <span>•</span>
                                <span className="text-amber-300/90 font-medium">Top: {player.best_double}</span>
                              </>
                            ) : (
                              <>
                                <span>{player.sessions_count} Durchgang{player.sessions_count > 1 ? 'e' : ''} {filter === 'month' ? 'im Monat' : 'gesamt'}</span>
                                <span>•</span>
                                <span className="font-mono text-cyan-300 font-bold">{player.total_hits}/{player.total_darts} Treffer</span>
                                <span>•</span>
                                <span className="text-amber-300/90 font-medium">Bestwert: {player.best_session_quote.toFixed(1)}%</span>
                                <span>•</span>
                                <span className="hidden sm:inline">Top: {player.best_double}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rechter Teil: Quote in riesigen Lettern */}
                      <div className="text-right shrink-0 pl-2">
                        <div
                          className={`font-mono text-2xl sm:text-4xl font-black tracking-tight leading-none ${
                            isFirst
                              ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                              : 'text-cyan-300'
                          }`}
                        >
                          {player.quote_percent.toFixed(1)}
                          <span className="text-sm sm:text-lg font-bold ml-0.5">%</span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-400 font-mono mt-1">
                          Best-Leg: {player.best_session_quote.toFixed(1)}%
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* RECHTE SPALTE (5 von 12 Spalten): RANKING PRO ZAHL (KÖNIGE DER DOPPEL-SEGMENTE) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          
          <div className="bg-slate-900/85 border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10 mb-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-base shadow-[0_0_15px_rgba(0,212,255,0.25)]">
                🎯
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Könige der Doppel-Felder
                </h3>
                <p className="text-[11px] text-slate-400">
                  Wer trifft welche Zahl am stärksten?
                </p>
              </div>
            </div>

            {/* 5 Kacheln für D20, D10, D16, D8, D4 */}
            <div className="space-y-3">
              {TARGETS.map((target) => {
                const style = TARGET_COLORS[target];
                const list = data.targetRankings[target] || [];
                const king = list[0]; // Platz 1 auf dieser Zahl
                const runnerUps = list.slice(1, 3); // Platz 2 und 3

                const kingPhoto = king ? getPlayerPhotoUrl(king.player_name) : null;
                const kingInitials = king ? getPlayerInitials(king.player_name) : '🎯';

                return (
                  <div
                    key={target}
                    className={`rounded-2xl border ${style.border} ${style.bg} p-3 sm:p-3.5 transition-all shadow-md ${style.glow}`}
                  >
                    {/* Header der Zahl */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs sm:text-sm font-black font-mono bg-slate-950 ${style.text} border ${style.border}`}>
                          {target}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          {target === 'D20' ? 'Tops (Double 20)' : `Doppel ${target.replace('D', '')}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {list.length} Spieler gewertet
                      </span>
                    </div>

                    {/* Platz 1 König dieser Zahl */}
                    {king ? (
                      <div className="flex items-center justify-between gap-2 bg-slate-950/75 p-2 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs font-black text-amber-400 shrink-0">👑 #1</span>
                          
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-400/50 shrink-0 bg-slate-900">
                            {kingPhoto ? (
                              <Image
                                src={kingPhoto}
                                alt={king.player_name}
                                fill
                                className="object-cover object-center"
                                sizes="32px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold bg-slate-800 text-slate-200">
                                {kingInitials}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 truncate">
                            <span className="text-xs sm:text-sm font-black text-white truncate block">
                              {king.player_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {king.hits}/{king.darts} Treffer
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-base sm:text-lg font-black font-mono ${style.text}`}>
                            {king.quote_percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic py-1 text-center">
                        Noch keine Treffer auf {target}
                      </div>
                    )}

                    {/* Plätze 2 & 3 im Miniformat */}
                    {runnerUps.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
                        {runnerUps.map((p, pIdx) => (
                          <div key={p.player_name} className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-mono text-[10px]">#{pIdx + 2}</span>
                            <span className="font-semibold text-slate-200">{p.player_name}</span>
                            <span className="font-mono text-cyan-300 text-[10px]">({p.quote_percent.toFixed(1)}%)</span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

      {/* FOOTER TICKER FÜR DEN TV */}
      <footer className="mt-4 bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">●</span>
          <span>Live-Board aktualisiert automatisch nach jedem abgeschlossenen Durchgang.</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
          <span>Letzter Sync: {data.lastUpdate}</span>
          <span>•</span>
          <span>SC Weyhausen 1921 e.V.</span>
        </div>
      </footer>

    </div>
  );
}
