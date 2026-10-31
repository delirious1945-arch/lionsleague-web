'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  UnifiedTvBoardData,
  UnifiedTvViewMode,
  UnifiedTvTimeframe,
  TvDoppelquoteRow,
  TvPdcRow,
} from './types';
import { getUnifiedTvBoardDataAction } from './actions';
import { getPlayerPhotoUrl, getPlayerInitials } from '@/lib/avatar';
import { getPdcBadge, PDC_BADGES_LIST } from '../pdc-challenge/types';
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
  Calendar,
  Layers,
  ChevronRight,
  Users,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface UnifiedTvBoardClientProps {
  initialData: UnifiedTvBoardData;
  initialViewMode?: UnifiedTvViewMode;
  initialTimeframe?: UnifiedTvTimeframe;
}

export default function UnifiedTvBoardClient({
  initialData,
  initialViewMode = 'both',
  initialTimeframe = 'today',
}: UnifiedTvBoardClientProps) {
  const [data, setData] = useState<UnifiedTvBoardData>(initialData);
  const [viewMode, setViewMode] = useState<UnifiedTvViewMode>(initialViewMode);
  const [timeframe, setTimeframe] = useState<UnifiedTvTimeframe>(initialTimeframe);
  const [selectedArchiveDate, setSelectedArchiveDate] = useState<string>(
    initialData.availableArchiveDays[0]?.dateStr || initialData.selectedDateStr
  );

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(8);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [soundAlert, setSoundAlert] = useState<boolean>(true);

  const prevSessionTotalRef = useRef<number>(
    initialData.todayDoppelLeaderboard.length +
    initialData.todayPdcLeaderboard.length +
    (initialData.todayFussballMatches?.length || 0) +
    (initialData.todayStellenCheckenLeaderboard?.length || 0)
  );

  // Digital-Uhr
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Europe/Berlin',
        }).format(now)
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
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
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  // Daten abrufen
  const refreshData = async (
    targetTimeframe: UnifiedTvTimeframe = timeframe,
    targetDate: string = selectedArchiveDate
  ) => {
    setIsUpdating(true);
    try {
      const result = await getUnifiedTvBoardDataAction({
        timeframe: targetTimeframe,
        customDate: targetDate,
      });

      const currentTotal =
        result.todayDoppelLeaderboard.length +
        result.todayPdcLeaderboard.length +
        (result.todayFussballMatches?.length || 0) +
        (result.todayStellenCheckenLeaderboard?.length || 0);
      if (currentTotal > prevSessionTotalRef.current) {
        playLivePing();
      }
      prevSessionTotalRef.current = currentTotal;

      setData(result);
    } catch (e) {
      console.error('Fehler beim Aktualisieren des TV-Boards:', e);
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
          refreshData(timeframe, selectedArchiveDate);
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSync, timeframe, selectedArchiveDate]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Switch timeframe handler
  const handleTimeframeChange = (newTf: UnifiedTvTimeframe) => {
    setTimeframe(newTf);
    if (newTf === 'archive') {
      setViewMode('archive');
      refreshData('archive', selectedArchiveDate);
    } else {
      if (viewMode === 'archive') {
        setViewMode('both');
      }
      refreshData(newTf);
    }
  };

  // Switch archive date handler
  const handleArchiveDateSelect = (dStr: string) => {
    setSelectedArchiveDate(dStr);
    setTimeframe('archive');
    setViewMode('archive');
    refreshData('archive', dStr);
  };

  // Helper für Rang-Badge-Styling (inklusive geteilter Platz!)
  const renderRankBadge = (rank: number, isShared: boolean) => {
    if (rank === 1) {
      return (
        <span
          className={`inline-flex items-center justify-center font-black rounded-xl px-2 py-1 shadow-md bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border border-yellow-200 text-xs sm:text-sm ${
            isShared ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-black' : ''
          }`}
          title={isShared ? 'Platz 1 geteilt' : 'Platz 1'}
        >
          {isShared ? '🤝 1.' : '🥇 1.'}
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span
          className={`inline-flex items-center justify-center font-black rounded-xl px-2 py-1 shadow-md bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 border border-slate-100 text-xs sm:text-sm ${
            isShared ? 'ring-2 ring-slate-300 ring-offset-1 ring-offset-black' : ''
          }`}
          title={isShared ? 'Platz 2 geteilt' : 'Platz 2'}
        >
          {isShared ? '🤝 2.' : '🥈 2.'}
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span
          className={`inline-flex items-center justify-center font-black rounded-xl px-2 py-1 shadow-md bg-gradient-to-r from-amber-700 to-amber-800 text-amber-100 border border-amber-600 text-xs sm:text-sm ${
            isShared ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-black' : ''
          }`}
          title={isShared ? 'Platz 3 geteilt' : 'Platz 3'}
        >
          {isShared ? '🤝 3.' : '🥉 3.'}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center justify-center font-mono font-bold rounded-lg px-2 py-1 text-xs sm:text-sm ${
          isShared
            ? 'bg-slate-800 text-amber-300 border border-amber-500/40'
            : 'bg-slate-900 text-slate-400 border border-slate-800'
        }`}
        title={isShared ? `Platz ${rank} geteilt` : `Platz ${rank}`}
      >
        {isShared ? `🤝 ${rank}.` : `${rank}.`}
      </span>
    );
  };

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#05070e] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Dezente Hintergrund-Lichtquellen für edlen Glassmorphism-Effekt */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[15%] w-[30rem] h-[30rem] rounded-full bg-amber-500/[0.05] blur-[140px]" />
        <div className="absolute bottom-[12%] right-[15%] w-[32rem] h-[32rem] rounded-full bg-slate-400/[0.04] blur-[150px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40rem] h-72 rounded-full bg-amber-400/[0.03] blur-[160px]" />
      </div>

      {/* ========================================================
          TV HEADER / CONTROL BAR (AUFGERÄUMT, EINZEILIG & GLASSMORPHISM)
          ======================================================== */}
      <header className="bg-white/[0.025] border-b border-white/[0.08] px-4 py-2.5 sticky top-0 z-40 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1920px] mx-auto flex flex-wrap xl:flex-nowrap items-center justify-between gap-3">
          {/* 1. LINKS: Zurück-Button & Einzeiliger Titel */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/training"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 hover:text-white transition-all text-xs font-bold whitespace-nowrap"
              title="Zurück zum Trainingsmenü"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Training</span>
            </Link>

            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 whitespace-nowrap">
              <span>LIONS TV-BOARD</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/[0.12] text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/35">
                LIVE
              </span>
            </h1>
          </div>

          {/* 2. MITTE: Spiel-Auswahl (Einheitliches Dark-Gold Glassmorphism) */}
          <div className="flex items-center justify-center gap-1 bg-black/40 backdrop-blur-xl p-1 rounded-2xl border border-white/[0.08] flex-wrap sm:flex-nowrap order-3 xl:order-2 w-full xl:w-auto">
            <button
              onClick={() => {
                setViewMode('both');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'both' && timeframe !== 'archive'
                  ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_2px_15px_rgba(245,158,11,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kombi-Ansicht</span>
            </button>

            <button
              onClick={() => {
                setViewMode('doppelquote');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'doppelquote' && timeframe !== 'archive'
                  ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_2px_15px_rgba(245,158,11,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>Checkout Battle</span>
            </button>

            <button
              onClick={() => {
                setViewMode('pdc');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'pdc' && timeframe !== 'archive'
                  ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_2px_15px_rgba(245,158,11,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>PDC Challenge</span>
            </button>

            <button
              onClick={() => {
                setViewMode('fussball');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'fussball' && timeframe !== 'archive'
                  ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_2px_15px_rgba(245,158,11,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>Fußball (1vs1)</span>
            </button>

            <button
              onClick={() => {
                setViewMode('stellen_checken');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'stellen_checken' && timeframe !== 'archive'
                  ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_2px_15px_rgba(245,158,11,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>Stellen & Checken</span>
            </button>

            <button
              onClick={() => {
                setViewMode('archive');
                setTimeframe('archive');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'archive' || timeframe === 'archive'
                  ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_2px_15px_rgba(245,158,11,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Archiv</span>
            </button>
          </div>

          {/* 3. RECHTS: Zeitraum-Wahl, Uhrzeit & TV-Tools */}
          <div className="flex items-center gap-2 shrink-0 order-2 xl:order-3">
            {viewMode !== 'archive' && (
              <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur-xl p-1 rounded-xl border border-white/[0.08] text-xs">
                <button
                  onClick={() => handleTimeframeChange('today')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    timeframe === 'today'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Heutiges Training"
                >
                  Heute
                </button>
                <button
                  onClick={() => handleTimeframeChange('month')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    timeframe === 'month'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Monatsübersicht"
                >
                  Monat
                </button>
                <button
                  onClick={() => handleTimeframeChange('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    timeframe === 'all'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Gesamtübersicht"
                >
                  Gesamt
                </button>
              </div>
            )}

            {/* Uhrzeit */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-amber-300 font-mono text-xs sm:text-sm font-bold shadow-inner whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-amber-300/80" />
              <span>{currentTime || '--:--:--'}</span>
            </div>

            {/* Sync, Audio & Vollbild */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundAlert(!soundAlert)}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer ${
                  soundAlert
                    ? 'bg-white/[0.05] text-amber-300 border-amber-400/35'
                    : 'bg-white/[0.03] text-slate-500 border-white/[0.08]'
                }`}
                title={soundAlert ? 'Sound-Ping aktiv' : 'Sound stumm'}
              >
                {soundAlert ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => refreshData(timeframe, selectedArchiveDate)}
                disabled={isUpdating}
                className="p-1.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.09] transition-all flex items-center gap-1 text-xs font-mono font-bold cursor-pointer"
                title="Jetzt aktualisieren"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isUpdating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-amber-300">{countdown}s</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.09] transition-all cursor-pointer"
                title={isFullscreen ? 'Vollbild beenden' : 'Vollbild (TV-Modus)'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          SUB-HEADER / STATUS BANNER (EINHEITLICH & ELEGANT)
          ======================================================== */}
      <div className="bg-white/[0.015] border-b border-white/[0.07] px-4 py-2 backdrop-blur-md">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Aktiver Modus:</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/[0.08] text-amber-200 border border-amber-400/30 font-bold">
              {viewMode === 'both'
                ? 'Kombi-Ansicht (Checkout Battle & PDC Challenge)'
                : viewMode === 'doppelquote'
                ? 'Checkout Battle (Doppelquote)'
                : viewMode === 'pdc'
                ? 'PDC Challenge Routine'
                : viewMode === 'fussball'
                ? 'Fußball (1vs1 Matchboard)'
                : viewMode === 'stellen_checken'
                ? 'Stellen & Checken (3–101)'
                : 'Archiv & Kalender'}
            </span>

            <span className="text-slate-600">•</span>

            <span className="text-slate-400">
              {timeframe === 'today'
                ? 'Heutiger Trainingstag'
                : timeframe === 'month'
                ? `Monat: ${data.monthLabel}`
                : timeframe === 'all'
                ? 'Gesamte Historie (All-Time)'
                : `Archiv-Datum: ${data.currentArchiveDayDetail?.fullDateLabel || selectedArchiveDate}`}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>
              <strong className="text-white font-mono">{data.todayDoppelLeaderboard.length}</strong> Doppel
            </span>
            <span>•</span>
            <span>
              <strong className="text-white font-mono">{data.todayPdcLeaderboard.length}</strong> PDC
            </span>
            <span>•</span>
            <span>
              <strong className="text-white font-mono">{data.todayFussballMatches?.length || 0}</strong> Fußball 1vs1
            </span>
            <span>•</span>
            <span>
              <strong className="text-white font-mono">{data.todayStellenCheckenLeaderboard?.length || 0}</strong> Stellen & Checken
            </span>
            <span>•</span>
            <span>Stand: {data.lastUpdate || 'soeben'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          MAIN CONTENT AREA
          ======================================================== */}
      <main className="relative z-10 flex-1 p-3 sm:p-5 max-w-[1920px] w-full mx-auto">
        {/* ========================================================
            VIEW 1: GEMEINSCHAFTSANSICHT (BEIDE SPIELE NEBENEINANDER)
            ======================================================== */}
        {viewMode === 'both' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
              {/* TABELLE LINKS: CHECKOUT BATTLE (DOPPELQUOTE) */}
              <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-4 sm:p-5 flex flex-col">
                {/* Header Spiel 1 */}
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                      🎯
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <span>Checkout Battle</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/[0.08] text-amber-300/90 font-bold border border-amber-400/20">
                          Doppelquote
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        10 Runden à 3 Darts (D20, D10, D16, D8, D4) • Ranking nach Quote
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewMode('doppelquote')}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 border border-white/[0.09] text-xs font-bold transition-all flex items-center gap-1"
                    title="Zur detaillierten Doppel-Aufschlüsselung"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tabelle Doppelquote */}
                {data.todayDoppelLeaderboard.length === 0 ? (
                  <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08]">
                    <div className="text-4xl mb-3">🎯</div>
                    <h3 className="text-base font-bold text-slate-200">
                      Noch keine Checkout-Spiele heute
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Sobald ein Spieler das Checkout Battle beendet, erscheint die Wertung hier sofort automatisch auf dem TV-Board!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.07] text-slate-400 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-2 text-center w-12">Platz</th>
                          <th className="py-2.5 px-3">Spieler</th>
                          <th className="py-2.5 px-2 text-center">Treffer</th>
                          <th className="py-2.5 px-3 text-right">Doppelquote</th>
                          <th className="py-2.5 px-3 text-right hidden sm:table-cell">Bestes Doppel</th>
                          <th className="py-2.5 px-2 text-right text-slate-500">Zeit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] font-medium">
                        {data.todayDoppelLeaderboard.map((row) => {
                          const photo = getPlayerPhotoUrl(row.player_name);
                          const initials = getPlayerInitials(row.player_name);
                          return (
                            <tr
                              key={row.session_id + row.player_name + row.attempt_nr}
                              className={`transition-colors hover:bg-white/[0.04] ${
                                row.rank === 1
                                  ? 'bg-amber-400/[0.08]'
                                  : row.rank === 2
                                  ? 'bg-white/[0.03]'
                                  : row.rank === 3
                                  ? 'bg-amber-900/[0.12]'
                                  : ''
                              }`}
                            >
                              {/* Platz */}
                              <td className="py-3 px-2 text-center">
                                {renderRankBadge(row.rank, row.isShared)}
                              </td>

                              {/* Spieler */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-white/[0.06] border border-white/[0.12] shrink-0 flex items-center justify-center font-bold text-[10px] text-amber-300">
                                    {photo ? (
                                      <Image
                                        src={photo}
                                        alt={row.player_name}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span>{initials}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-black text-white text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                                      <span>{row.player_name}</span>
                                      {row.attempt_nr > 1 && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/[0.06] text-amber-300 border border-white/[0.1]">
                                          #{row.attempt_nr}
                                        </span>
                                      )}
                                    </div>
                                    {row.opponent_name && (
                                      <div className="text-[10px] text-slate-400">
                                        vs. {row.opponent_name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Treffer */}
                              <td className="py-3 px-2 text-center">
                                <span className="font-mono font-bold text-slate-200">
                                  {row.total_hits}
                                </span>
                                <span className="text-[10px] text-slate-500"> / {row.total_darts}</span>
                              </td>

                              {/* Doppelquote */}
                              <td className="py-3 px-3 text-right">
                                <span className="font-mono font-black text-sm sm:text-base text-amber-300">
                                  {row.quote_percent.toFixed(1)}%
                                </span>
                              </td>

                              {/* Bestes Doppel */}
                              <td className="py-3 px-3 text-right hidden sm:table-cell">
                                <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.09] text-xs font-bold text-amber-200">
                                  {row.best_double}
                                </span>
                              </td>

                              {/* Zeit */}
                              <td className="py-3 px-2 text-right text-[11px] font-mono text-slate-500">
                                {row.time_label || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TABELLE RECHTS: PDC CHALLENGE (57 DARTS) */}
              <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-4 sm:p-5 flex flex-col">
                {/* Header Spiel 2 */}
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                      🏆
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <span>PDC Challenge</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/[0.08] text-amber-300/90 font-bold border border-amber-400/20">
                          57 Darts
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Shanghai 10–15, Doppel D1–D20 + Bull, Shanghai 15–20 • Ranking nach Punkten
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewMode('pdc')}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 border border-white/[0.09] text-xs font-bold transition-all flex items-center gap-1"
                    title="Zur detaillierten Sektionen-Aufschlüsselung"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tabelle PDC */}
                {data.todayPdcLeaderboard.length === 0 ? (
                  <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08]">
                    <div className="text-4xl mb-3">🏆</div>
                    <h3 className="text-base font-bold text-slate-200">
                      Noch keine PDC-Challenges heute
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Sobald ein Spieler die 57-Darts Challenge wirft, erscheint die Wertung hier sofort live auf dem TV-Board!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.07] text-slate-400 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-2 text-center w-12">Platz</th>
                          <th className="py-2.5 px-3">Spieler</th>
                          <th className="py-2.5 px-3 text-right">Punkte</th>
                          <th className="py-2.5 px-3 text-center">Abzeichen</th>
                          <th className="py-2.5 px-2 text-center hidden sm:table-cell">Shanghai</th>
                          <th className="py-2.5 px-2 text-center hidden sm:table-cell">Doppel</th>
                          <th className="py-2.5 px-2 text-right text-slate-500">Zeit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] font-medium">
                        {data.todayPdcLeaderboard.map((row) => {
                          const photo = getPlayerPhotoUrl(row.player_name);
                          const initials = getPlayerInitials(row.player_name);
                          const badge = getPdcBadge(row.best_score);
                          return (
                            <tr
                              key={row.session_id + row.player_name + row.attempt_nr}
                              className={`transition-colors hover:bg-white/[0.04] ${
                                row.rank === 1
                                  ? 'bg-amber-400/[0.08]'
                                  : row.rank === 2
                                  ? 'bg-white/[0.03]'
                                  : row.rank === 3
                                  ? 'bg-amber-900/[0.12]'
                                  : ''
                              }`}
                            >
                              {/* Platz */}
                              <td className="py-3 px-2 text-center">
                                {renderRankBadge(row.rank, row.isShared)}
                              </td>

                              {/* Spieler */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-white/[0.06] border border-white/[0.12] shrink-0 flex items-center justify-center font-bold text-[10px] text-amber-300">
                                    {photo ? (
                                      <Image
                                        src={photo}
                                        alt={row.player_name}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span>{initials}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-black text-white text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                                      <span>{row.player_name}</span>
                                      {row.attempt_nr > 1 && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/[0.06] text-amber-300 border border-white/[0.1]">
                                          #{row.attempt_nr}
                                        </span>
                                      )}
                                    </div>
                                    {row.opponent_name && (
                                      <div className="text-[10px] text-slate-400">
                                        vs. {row.opponent_name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Punkte */}
                              <td className="py-3 px-3 text-right">
                                <span className="font-mono font-black text-sm sm:text-base text-amber-300">
                                  {row.best_score}
                                </span>
                              </td>

                              {/* Abzeichen */}
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${badge.badgeClass}`}
                                >
                                  <span>{badge.icon}</span>
                                  <span>{badge.name}</span>
                                </span>
                              </td>

                              {/* Shanghais */}
                              <td className="py-3 px-2 text-center hidden sm:table-cell">
                                <span className="font-mono font-bold text-amber-200">
                                  {row.total_shanghais}
                                </span>
                              </td>

                              {/* Doppel */}
                              <td className="py-3 px-2 text-center hidden sm:table-cell">
                                <span className="font-mono font-bold text-slate-200">
                                  {row.best_doubles_hit}
                                </span>
                                <span className="text-[10px] text-slate-500"> / 21</span>
                              </td>

                              {/* Zeit */}
                              <td className="py-3 px-2 text-right text-[11px] font-mono text-slate-500">
                                {row.time_label || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 2: CHECKOUT BATTLE DETAILANSICHT
            ======================================================== */}
        {viewMode === 'doppelquote' && (
          <div className="space-y-5">
            <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                    🎯
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      Checkout Battle • Erweiterte Doppel-Analyse
                    </h2>
                    <p className="text-xs text-slate-400">
                      Vollständige Aufschlüsselung der 5 Zielfelder D20, D10, D16, D8 und D4
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/doppelquote"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:via-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-[0_8px_20px_rgba(245,158,11,0.2)] transition-all"
                  >
                    Spiel starten
                  </Link>
                  <button
                    onClick={() => setViewMode('both')}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.09] text-xs font-bold transition-all"
                  >
                    ← Zurück
                  </button>
                </div>
              </div>

              {/* Detaillierte Tabelle mit allen 5 Doppel */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-2 text-center w-12">Platz</th>
                      <th className="py-3 px-3">Spieler</th>
                      <th className="py-3 px-2 text-center">Treffer</th>
                      <th className="py-3 px-3 text-right">Gesamtquote</th>
                      <th className="py-3 px-3 text-center text-amber-200/80">D20</th>
                      <th className="py-3 px-3 text-center text-amber-200/80">D10</th>
                      <th className="py-3 px-3 text-center text-amber-200/80">D16</th>
                      <th className="py-3 px-3 text-center text-amber-200/80">D8</th>
                      <th className="py-3 px-3 text-center text-amber-200/80">D4</th>
                      <th className="py-3 px-3 text-right">Bestes Doppel</th>
                      <th className="py-3 px-2 text-right text-slate-500">Zeit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] font-medium">
                    {data.todayDoppelLeaderboard.map((row) => (
                      <tr key={row.session_id + row.player_name} className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-3 px-2 text-center">
                          {renderRankBadge(row.rank, row.isShared)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-black text-white text-sm">
                            {row.player_name}
                            {row.attempt_nr > 1 && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-white/[0.06] text-amber-300 border border-white/[0.1]">
                                #{row.attempt_nr}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-200">
                          {row.total_hits} / {row.total_darts}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-amber-300 text-base">
                          {row.quote_percent.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                          {row.d20_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                          {row.d10_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                          {row.d16_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                          {row.d8_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                          {row.d4_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.09] text-xs font-bold text-amber-200">
                            {row.best_double}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-xs font-mono text-slate-500">
                          {row.time_label || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 3: PDC CHALLENGE DETAILANSICHT
            ======================================================== */}
        {viewMode === 'pdc' && (
          <div className="space-y-5">
            <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                    🏆
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      PDC Challenge • Sektionen-Aufschlüsselung
                    </h2>
                    <p className="text-xs text-slate-400">
                      Shanghai 10–15 (Part 1), Doppelrunde D1–D20+Bull (Part 2), Shanghai 15–20 (Part 3)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/training/pdc-challenge"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:via-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-[0_8px_20px_rgba(245,158,11,0.2)] transition-all"
                  >
                    Spiel starten
                  </Link>
                  <button
                    onClick={() => setViewMode('both')}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.09] text-xs font-bold transition-all"
                  >
                    ← Zurück
                  </button>
                </div>
              </div>

              {/* Detaillierte PDC Tabelle */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-2 text-center w-12">Platz</th>
                      <th className="py-3 px-3">Spieler</th>
                      <th className="py-3 px-3 text-right">Gesamtpunkte</th>
                      <th className="py-3 px-3 text-center">Abzeichen</th>
                      <th className="py-3 px-3 text-center text-amber-200/80">Part 1 (10–15)</th>
                      <th className="py-3 px-3 text-center text-amber-200/80">Part 2 (Doppel)</th>
                      <th className="py-3 px-3 text-center text-amber-200/80">Part 3 (15–20)</th>
                      <th className="py-3 px-2 text-center">Shanghais</th>
                      <th className="py-3 px-2 text-center">Doppel-Hits</th>
                      <th className="py-3 px-2 text-right text-slate-500">Zeit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] font-medium">
                    {data.todayPdcLeaderboard.map((row) => {
                      const badge = getPdcBadge(row.best_score);
                      return (
                        <tr key={row.session_id + row.player_name} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-3 px-2 text-center">
                            {renderRankBadge(row.rank, row.isShared)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-black text-white text-sm">
                              {row.player_name}
                              {row.attempt_nr > 1 && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-white/[0.06] text-amber-300 border border-white/[0.1]">
                                  #{row.attempt_nr}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-amber-300 text-base">
                            {row.best_score}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${badge.badgeClass}`}>
                              <span>{badge.icon}</span>
                              <span>{badge.name}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                            {row.score_part1 || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                            {row.score_part2 || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                            {row.score_part3 || '-'}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-amber-200">
                            {row.total_shanghais}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-slate-200">
                            {row.best_doubles_hit} / 21
                          </td>
                          <td className="py-3 px-2 text-right text-xs font-mono text-slate-500">
                            {row.time_label || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 4: FUßBALL 1vs1 MATCHBOARD
            ======================================================== */}
        {viewMode === 'fussball' && (
          <div className="space-y-6">
            <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                    ⚽
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                      <span>Fußball • 1-gegen-1 Matchboard</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/[0.08] text-amber-300/90 font-bold border border-amber-400/20">
                        Reine Spieler-Duelle
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Offizielle 1vs1 Liga-Duelle zwischen Spielern (Matches gegen den Computer werden hier nicht gewertet).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/training/fussball"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:via-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-[0_8px_20px_rgba(245,158,11,0.2)] transition-all"
                  >
                    Spiel starten
                  </Link>
                  <button
                    onClick={() => setViewMode('both')}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.09] text-xs font-bold transition-all"
                  >
                    ← Zurück
                  </button>
                </div>
              </div>

              {/* 1vs1 Rangliste */}
              {data.todayFussballLeaderboard.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08] mt-4">
                  <div className="text-4xl mb-3">⚽</div>
                  <h3 className="text-base font-bold text-slate-200">
                    Noch keine 1vs1 Fußball-Matches in diesem Zeitraum
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    Hier werden ausschließlich echte 1-gegen-1 Duelle zwischen zwei Spielern gelistet. Fordere jetzt deinen Trainingspartner zu einem Fußball-Match heraus!
                  </p>
                  <Link
                    href="/training/fussball"
                    className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:via-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-[0_8px_20px_rgba(245,158,11,0.25)]"
                  >
                    Spiel starten
                  </Link>
                </div>
              ) : (
                <div className="space-y-6 mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.07] text-slate-400 uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-2 text-center w-12">Platz</th>
                          <th className="py-3 px-3">Spieler</th>
                          <th className="py-3 px-3 text-center">Spiele (S / N)</th>
                          <th className="py-3 px-3 text-center">Tore</th>
                          <th className="py-3 px-3 text-center">Diff.</th>
                          <th className="py-3 px-3 text-right">Siegquote</th>
                          <th className="py-3 px-3 text-center text-amber-200/80 hidden sm:table-cell">Bull-Quote</th>
                          <th className="py-3 px-3 text-center text-amber-200/80 hidden sm:table-cell">Doppel-Quote</th>
                          <th className="py-3 px-2 text-center hidden md:table-cell">Darts</th>
                          <th className="py-3 px-2 text-right text-slate-500">Zuletzt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] font-medium">
                        {data.todayFussballLeaderboard.map((row) => {
                          const photo = getPlayerPhotoUrl(row.player_name);
                          const initials = getPlayerInitials(row.player_name);
                          return (
                            <tr
                              key={row.player_name}
                              className={`transition-colors hover:bg-white/[0.04] ${
                                row.rank === 1
                                  ? 'bg-amber-400/[0.08]'
                                  : row.rank === 2
                                  ? 'bg-white/[0.03]'
                                  : row.rank === 3
                                  ? 'bg-amber-900/[0.12]'
                                  : ''
                              }`}
                            >
                              <td className="py-3 px-2 text-center">
                                {renderRankBadge(row.rank, row.isShared)}
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-white/[0.06] border border-white/[0.12] shrink-0 flex items-center justify-center font-bold text-[10px] text-amber-300">
                                    {photo ? (
                                      <Image
                                        src={photo}
                                        alt={row.player_name}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span>{initials}</span>
                                    )}
                                  </div>
                                  <div className="font-black text-white text-xs sm:text-sm tracking-tight">
                                    {row.player_name}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center font-mono">
                                <span className="font-bold text-white">{row.matches_count}</span>{' '}
                                <span className="text-[11px] text-slate-400">
                                  ({row.wins}S / {row.losses}N)
                                </span>
                              </td>

                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                                {row.goals_scored} : {row.goals_conceded}
                              </td>

                              <td className="py-3 px-3 text-center font-mono">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                    row.goal_diff > 0
                                      ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
                                      : row.goal_diff < 0
                                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                                      : 'bg-white/[0.05] text-slate-400'
                                  }`}
                                >
                                  {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right font-mono font-black text-amber-300 text-sm sm:text-base">
                                {row.win_rate.toFixed(1)}%
                              </td>

                              <td className="py-3 px-3 text-center font-mono text-slate-300 hidden sm:table-cell">
                                {row.bull_quote.toFixed(1)}%
                              </td>

                              <td className="py-3 px-3 text-center font-mono text-slate-300 hidden sm:table-cell">
                                {row.double_quote.toFixed(1)}%
                              </td>

                              <td className="py-3 px-2 text-center font-mono text-slate-400 hidden md:table-cell">
                                {row.darts_thrown}
                              </td>

                              <td className="py-3 px-2 text-right text-xs font-mono text-slate-500">
                                {row.last_time || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 1vs1 Match-Log / Einzelduelle */}
                  {data.todayFussballMatches && data.todayFussballMatches.length > 0 && (
                    <div className="pt-4 border-t border-white/[0.07] space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span>⚽ Ausgetragene 1-gegen-1 Duelle ({data.todayFussballMatches.length}):</span>
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          Chronologisch sortiert
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {data.todayFussballMatches.map((m) => {
                          const p1IsWinner = m.player1_goals > m.player2_goals;
                          const p2IsWinner = m.player2_goals > m.player1_goals;
                          return (
                            <div
                              key={m.id}
                              className="bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-2xl border border-white/[0.08] flex flex-col justify-between gap-2 shadow-inner"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-white/[0.06] pb-1.5">
                                <span className="font-mono text-slate-400">{m.time_label || 'Spiel'}</span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {m.darts_thrown} Darts
                                </span>
                              </div>

                              <div className="flex items-center justify-between py-1 gap-2">
                                <div className="flex-1 text-left">
                                  <div className={`font-black text-sm truncate ${p1IsWinner ? 'text-amber-300' : 'text-slate-300'}`}>
                                    {m.player1_name}
                                  </div>
                                  {p1IsWinner && (
                                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                                      🏆 Sieger
                                    </span>
                                  )}
                                </div>

                                <div className="px-3 py-1 rounded-xl bg-black/40 border border-white/[0.08] font-mono font-black text-base sm:text-lg text-white shrink-0 shadow-inner">
                                  <span className={p1IsWinner ? 'text-amber-300' : 'text-slate-300'}>
                                    {m.player1_goals}
                                  </span>
                                  <span className="text-slate-500 mx-1.5">:</span>
                                  <span className={p2IsWinner ? 'text-amber-300' : 'text-slate-300'}>
                                    {m.player2_goals}
                                  </span>
                                </div>

                                <div className="flex-1 text-right">
                                  <div className={`font-black text-sm truncate ${p2IsWinner ? 'text-amber-300' : 'text-slate-300'}`}>
                                    {m.player2_name}
                                  </div>
                                  {p2IsWinner && (
                                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                                      🏆 Sieger
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 4B: STELLEN & CHECKEN (3–101) DETAIL-BOARD
            ======================================================== */}
        {viewMode === 'stellen_checken' && (
          <div className="space-y-6">
            <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-5 sm:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-5 border-b border-white/[0.07]">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                    🎲
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-white">
                        Stellen & Checken (3–101) • Live-Board
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/[0.08] text-amber-300/90 border border-amber-400/20 text-xs font-black">
                        15 Aufnahmen · 200 Sequenzen
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                      Wertung: Zahlen 3–60 = <strong>+1 Pkt</strong> • 61–80 = <strong>+2 Pkt</strong> • 81–101 = <strong>+3 Pkt</strong> • Gleichstand teilt den Platz (🤝)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/training/stellen-checken"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:via-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-[0_8px_20px_rgba(245,158,11,0.2)] transition-all"
                  >
                    Spiel starten
                  </Link>
                  <button
                    onClick={() => setViewMode('both')}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.09] text-xs font-bold transition-all"
                  >
                    ← Zurück
                  </button>
                </div>
              </div>

              {(!data.todayStellenCheckenLeaderboard || data.todayStellenCheckenLeaderboard.length === 0) ? (
                <div className="py-16 text-center space-y-3 bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08]">
                  <div className="text-4xl">🎲</div>
                  <div className="text-base sm:text-lg font-black text-white">
                    Noch keine Stellen & Checken Runden für diesen Zeitraum erfasst
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                    Starte am Board ein Solo-Training oder ein 1-gegen-1 Duell in „Stellen & Checken“ – das Ergebnis erscheint sofort hier auf dem TV-Board!
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/training/stellen-checken"
                      className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:via-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-[0_8px_20px_rgba(245,158,11,0.25)] transition-all"
                    >
                      Spiel starten
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-slate-400 font-black">
                        <th className="py-3 px-3">Platz</th>
                        <th className="py-3 px-3">Spieler</th>
                        <th className="py-3 px-3 text-center">Sequenz</th>
                        <th className="py-3 px-3 text-center">Modus / Durchgang</th>
                        <th className="py-3 px-3 text-right">Punkte</th>
                        <th className="py-3 px-3 text-right">Checks (15 R.)</th>
                        <th className="py-3 px-3 text-right">Check-Quote</th>
                        <th className="py-3 px-3 text-right">Zeit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] text-xs sm:text-sm">
                      {data.todayStellenCheckenLeaderboard.map((row, idx) => {
                        const photoUrl = getPlayerPhotoUrl(row.player_name);
                        return (
                          <tr
                            key={row.session_id + '_' + idx}
                            className={`transition-colors ${
                              row.rank === 1
                                ? 'bg-amber-400/[0.08] hover:bg-amber-400/[0.12]'
                                : 'hover:bg-white/[0.04]'
                            }`}
                          >
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {renderRankBadge(row.rank, row.isShared)}
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-3">
                                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/[0.06] border border-white/[0.12] shrink-0 flex items-center justify-center">
                                  {photoUrl ? (
                                    <Image
                                      src={photoUrl}
                                      alt={row.player_name}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs font-black text-amber-300">
                                      {getPlayerInitials(row.player_name)}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-black text-white text-sm sm:text-base">
                                    {row.player_name}
                                  </div>
                                  {row.opponent_name && (
                                    <div className="text-[11px] text-amber-300/90 font-semibold">
                                      ⚔️ 1vs1 Duell vs. {row.opponent_name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-center">
                              <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.1] text-amber-200 font-mono font-black text-xs">
                                #{String(row.preset_id).padStart(3, '0')}
                              </span>
                            </td>

                            <td className="py-3.5 px-3 text-center">
                              <span className="text-xs text-slate-300 font-semibold">
                                {row.attempt_label}
                              </span>
                            </td>

                            <td className="py-3.5 px-3 text-right">
                              <span className="text-lg sm:text-xl font-black font-mono text-amber-300">
                                {row.points_scored}
                              </span>
                              <span className="text-xs text-slate-400 font-mono ml-1">
                                / {row.max_possible_points} Pkt
                              </span>
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-200">
                              {row.checks_count} / {row.total_rounds}
                            </td>

                            <td className="py-3.5 px-3 text-right min-w-[130px]">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-mono font-black text-amber-200 text-sm">
                                  {row.quote_percent.toFixed(1)}%
                                </span>
                                <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden border border-white/10">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-300 to-yellow-500 rounded-full"
                                    style={{ width: `${Math.min(100, row.quote_percent)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-400">
                              {row.time_label}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 5: ARCHIV & KALENDER (DATUMSAUSWAHL & PROTOKOLL)
            ======================================================== */}
        {viewMode === 'archive' && (
          <div className="space-y-6">
            {/* Kalender / Datums-Auswahl Bar */}
            <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-5">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-300" />
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      Trainings-Archiv & Kalender
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300">
                    Wähle einen Trainingstag aus, um alle Spiele, Teilnehmer und Ergebnisse dieses Tages einzusehen.
                  </p>
                </div>

                {/* Date Picker Input */}
                <div className="flex items-center gap-2 w-full lg:w-auto">
                  <label className="text-xs font-bold text-slate-300 shrink-0">
                    Datum wählen:
                  </label>
                  <input
                    type="date"
                    value={selectedArchiveDate}
                    onChange={(e) => handleArchiveDateSelect(e.target.value)}
                    className="bg-white/[0.04] border border-white/[0.12] text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-400/50 shadow-inner"
                  />
                </div>
              </div>

              {/* Schnellauswahl der Trainingstage (Chips) */}
              <div className="mt-4 pt-3 border-t border-white/[0.07]">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Verfügbare Trainingstage im Vereinsarchiv:
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {data.availableArchiveDays.length === 0 ? (
                    <span className="text-xs text-slate-500">Keine archivierten Tage gefunden.</span>
                  ) : (
                    data.availableArchiveDays.map((day) => (
                      <button
                        key={day.dateStr}
                        onClick={() => handleArchiveDateSelect(day.dateStr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                          selectedArchiveDate === day.dateStr
                            ? 'bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 font-black shadow-[0_0_16px_rgba(245,158,11,0.3)]'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08]'
                        }`}
                      >
                        <span>{day.dayLabel}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          selectedArchiveDate === day.dateStr
                            ? 'bg-slate-950/20 text-slate-950 font-black'
                            : 'bg-black/40 text-amber-300'
                        }`}>
                          {day.totalSessions} Spiele
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Protokoll für den gewählten Tag */}
            {data.currentArchiveDayDetail ? (
              <div className="space-y-5">
                {/* Tageszusammenfassung Banner */}
                <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.09] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>📅 {data.currentArchiveDayDetail.fullDateLabel}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/[0.08] text-amber-300 border border-amber-400/20">
                        {data.currentArchiveDayDetail.totalSessions} absolvierte Spiele
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs text-slate-400 mr-1">Aktive Spieler:</span>
                      {data.currentArchiveDayDetail.activePlayers.length > 0 ? (
                        data.currentArchiveDayDetail.activePlayers.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.1] text-slate-200 text-xs font-semibold"
                          >
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Keine Spieler hinterlegt</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setViewMode('both');
                    }}
                    className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 font-bold text-xs border border-white/[0.1] transition-all flex items-center gap-1.5"
                  >
                    <span>Tages-Ranking in TV-Tabelle ansehen</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Spiele-Listen des Tages */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {/* Doppelquote Spiele */}
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.09] p-4 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.07]">
                      <h4 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                        <span>🎯 Checkout Battle</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({data.currentArchiveDayDetail.doppelGames.length})
                        </span>
                      </h4>
                    </div>

                    {data.currentArchiveDayDetail.doppelGames.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center">
                        Keine Checkout-Spiele an diesem Tag
                      </div>
                    ) : (
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px] pr-1">
                        {data.currentArchiveDayDetail.doppelGames.map((g, idx) => (
                          <div
                            key={g.id + idx}
                            className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.07] flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-white">{g.playerName}</div>
                              {g.opponentName && (
                                <div className="text-[10px] text-slate-400">vs. {g.opponentName}</div>
                              )}
                              <div className="text-[10px] text-amber-200/80 mt-0.5">
                                Bestes: {g.bestDouble}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-black text-amber-300 text-sm">
                                {g.quotePercent.toFixed(1)}%
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {g.hits}/{g.darts} • {g.time}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PDC Challenge Spiele */}
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.09] p-4 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.07]">
                      <h4 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                        <span>🏆 PDC Challenge</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({data.currentArchiveDayDetail.pdcGames.length})
                        </span>
                      </h4>
                    </div>

                    {data.currentArchiveDayDetail.pdcGames.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center">
                        Keine PDC-Spiele an diesem Tag
                      </div>
                    ) : (
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px] pr-1">
                        {data.currentArchiveDayDetail.pdcGames.map((g, idx) => {
                          const badge = getPdcBadge(g.score);
                          return (
                            <div
                              key={g.id + idx}
                              className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.07] flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-white">{g.playerName}</div>
                                {g.opponentName && (
                                  <div className="text-[10px] text-slate-400">vs. {g.opponentName}</div>
                                )}
                                <div className="mt-0.5">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-black ${badge.badgeClass}`}>
                                    <span>{badge.icon}</span>
                                    <span>{badge.name}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-black text-amber-300 text-sm">
                                  {g.score} Pkt
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  SH: {g.shanghais} • D: {g.doubles} • {g.time}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Fußball Darts Spiele */}
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.09] p-4 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.07]">
                      <h4 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                        <span>⚽ Fußball (Soccer Darts)</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({data.currentArchiveDayDetail.fussballGames.length})
                        </span>
                      </h4>
                    </div>

                    {data.currentArchiveDayDetail.fussballGames.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center">
                        Keine Fußball-Spiele an diesem Tag
                      </div>
                    ) : (
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px] pr-1">
                        {data.currentArchiveDayDetail.fussballGames.map((g, idx) => (
                          <div
                            key={g.id + idx}
                            className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.07] flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{g.playerName}</span>
                                {g.isWinner ? (
                                  <span className="text-[10px] px-1.5 rounded bg-amber-400/15 text-amber-300 font-bold">
                                    Sieg
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 rounded bg-white/[0.06] text-slate-400 font-bold">
                                    Niederlage
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">vs. {g.opponentName}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-black text-amber-300 text-sm">
                                {g.goalsScored} : {g.goalsConceded}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {g.dartsThrown} Darts • {g.time}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stellen & Checken Spiele */}
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.09] p-4 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.07]">
                      <h4 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                        <span>🎲 Stellen & Checken</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({data.currentArchiveDayDetail.stellenCheckenGames?.length || 0})
                        </span>
                      </h4>
                    </div>

                    {!data.currentArchiveDayDetail.stellenCheckenGames ||
                    data.currentArchiveDayDetail.stellenCheckenGames.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center">
                        Keine Stellen & Checken Spiele an diesem Tag
                      </div>
                    ) : (
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px] pr-1">
                        {data.currentArchiveDayDetail.stellenCheckenGames.map((g, idx) => (
                          <div
                            key={g.id + idx}
                            className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.07] flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{g.playerName}</span>
                                <span className="text-[10px] font-mono px-1.5 rounded bg-white/[0.06] text-amber-200 font-bold">
                                  #{String(g.presetId).padStart(3, '0')}
                                </span>
                              </div>
                              {g.opponentName && (
                                <div className="text-[10px] text-slate-400">vs. {g.opponentName}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-black text-amber-300 text-sm">
                                {g.pointsScored} / {g.maxPossiblePoints} Pkt
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {g.checksCount}/{g.totalRounds} ({g.quotePercent.toFixed(0)}%) • {g.time}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                Wähle einen Trainingstag oben aus.
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================
          FOOTER / TICKER
          ======================================================== */}
      <footer className="relative z-10 bg-white/[0.02] backdrop-blur-xl border-t border-white/[0.07] px-4 py-2.5 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-slate-400 font-medium">
            Lions TV-Board • Auto-Sync alle 8s • Gleichstand teilt den Platz automatisch (🤝)
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/doppelquote" className="hover:text-amber-300 transition-colors">
            🎯 Checkout Battle
          </Link>
          <span>•</span>
          <Link href="/training/pdc-challenge" className="hover:text-amber-300 transition-colors">
            🏆 PDC Challenge
          </Link>
          <span>•</span>
          <Link href="/training/fussball" className="hover:text-amber-300 transition-colors">
            ⚽ Fußball Darts
          </Link>
          <span>•</span>
          <Link href="/training/stellen-checken" className="hover:text-amber-300 transition-colors">
            🎲 Stellen & Checken
          </Link>
        </div>
      </footer>
    </div>
  );
}
