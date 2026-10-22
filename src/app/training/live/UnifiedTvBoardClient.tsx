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
    initialData.todayDoppelLeaderboard.length + initialData.todayPdcLeaderboard.length
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
        result.todayDoppelLeaderboard.length + result.todayPdcLeaderboard.length;
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
    <div className="min-h-screen bg-[#040711] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* ========================================================
          TV HEADER / CONTROL BAR
          ======================================================== */}
      <header className="bg-gradient-to-r from-slate-950 via-[#070b19] to-slate-950 border-b border-amber-500/20 px-4 py-3 sm:py-3.5 sticky top-0 z-40 backdrop-blur-md shadow-2xl">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo, Titel & Digital-Uhr */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <Link
              href="/training"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold"
              title="Zurück zum Trainingsmenü"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Training</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400/40">
                🎯
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>LIONS TV-BOARD</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 animate-pulse">
                      LIVE
                    </span>
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  SC Weyhausen Dartsport • Trainings-Arena
                </p>
              </div>
            </div>

            {/* Uhrzeit */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 font-mono text-sm sm:text-base font-bold shadow-inner">
              <Clock className="w-3.5 h-3.5 text-amber-400/80" />
              <span>{currentTime || '--:--:--'}</span>
            </div>
          </div>

          {/* Steuerung: Ansichten (Tabs) */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80 overflow-x-auto max-w-full">
            <button
              onClick={() => {
                setViewMode('both');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                viewMode === 'both' && timeframe !== 'archive'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gemeinschaft (Beide Spiele)</span>
            </button>

            <button
              onClick={() => {
                setViewMode('doppelquote');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                viewMode === 'doppelquote' && timeframe !== 'archive'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>🎯 Checkout Battle</span>
            </button>

            <button
              onClick={() => {
                setViewMode('pdc');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                viewMode === 'pdc' && timeframe !== 'archive'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>🏆 PDC Challenge</span>
            </button>

            <button
              onClick={() => {
                setViewMode('archive');
                setTimeframe('archive');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                viewMode === 'archive' || timeframe === 'archive'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Archiv & Kalender</span>
            </button>
          </div>

          {/* Steuerung: Timeframe / Kalender + TV Tools */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Zeitraum (wenn nicht Archiv-Ansicht) */}
            {viewMode !== 'archive' && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => handleTimeframeChange('today')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    timeframe === 'today'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Heutiges Training"
                >
                  Heute
                </button>
                <button
                  onClick={() => handleTimeframeChange('month')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    timeframe === 'month'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Monatsübersicht"
                >
                  Monat
                </button>
                <button
                  onClick={() => handleTimeframeChange('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    timeframe === 'all'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Gesamtübersicht"
                >
                  Gesamt
                </button>
              </div>
            )}

            {/* Sync & Audio */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundAlert(!soundAlert)}
                className={`p-2 rounded-xl border transition-all ${
                  soundAlert
                    ? 'bg-slate-900 text-amber-400 border-amber-500/30'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
                title={soundAlert ? 'Sound-Ping aktiv' : 'Sound stumm'}
              >
                {soundAlert ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => refreshData(timeframe, selectedArchiveDate)}
                disabled={isUpdating}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all flex items-center gap-1 text-xs font-mono font-bold"
                title="Jetzt aktualisieren"
              >
                <RefreshCw className={`w-4 h-4 text-amber-400 ${isUpdating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-amber-400">{countdown}s</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
                title={isFullscreen ? 'Vollbild beenden' : 'Vollbild (TV-Modus)'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          SUB-HEADER / STATUS BANNER
          ======================================================== */}
      <div className="bg-[#060b1b] border-b border-slate-800/80 px-4 py-2">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Aktiver Modus:</span>
            {viewMode === 'both' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 font-black">
                Gemeinschaftsansicht (PDC & Checkout Battle)
              </span>
            ) : viewMode === 'doppelquote' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40 font-black">
                Checkout Battle Detail-Board
              </span>
            ) : viewMode === 'pdc' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/40 font-black">
                PDC Challenge Detail-Board
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/40 font-black">
                Archiv & Kalender
              </span>
            )}

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
              <strong className="text-white font-mono">{data.todayDoppelLeaderboard.length}</strong> Doppel-Durchgänge
            </span>
            <span>•</span>
            <span>
              <strong className="text-white font-mono">{data.todayPdcLeaderboard.length}</strong> PDC-Durchgänge
            </span>
            <span>•</span>
            <span>Stand: {data.lastUpdate || 'soeben'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          MAIN CONTENT AREA
          ======================================================== */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1920px] w-full mx-auto">
        {/* ========================================================
            VIEW 1: GEMEINSCHAFTSANSICHT (BEIDE SPIELE NEBENEINANDER)
            ======================================================== */}
        {viewMode === 'both' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
              {/* TABELLE LINKS: CHECKOUT BATTLE (DOPPELQUOTE) */}
              <div className="bg-gradient-to-b from-[#0e1322] to-[#080d19] rounded-3xl border-2 border-amber-500/40 shadow-2xl p-4 sm:p-5 flex flex-col">
                {/* Header Spiel 1 */}
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                      🎯
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <span>Checkout Battle</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
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
                    className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1"
                    title="Zur detaillierten Doppel-Aufschlüsselung"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tabelle Doppelquote */}
                {data.todayDoppelLeaderboard.length === 0 ? (
                  <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
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
                        <tr className="border-b border-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-2 text-center w-12">Platz</th>
                          <th className="py-2.5 px-3">Spieler</th>
                          <th className="py-2.5 px-2 text-center">Treffer</th>
                          <th className="py-2.5 px-3 text-right">Doppelquote</th>
                          <th className="py-2.5 px-3 text-right hidden sm:table-cell">Bestes Doppel</th>
                          <th className="py-2.5 px-2 text-right text-slate-500">Zeit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 font-medium">
                        {data.todayDoppelLeaderboard.map((row) => {
                          const photo = getPlayerPhotoUrl(row.player_name);
                          const initials = getPlayerInitials(row.player_name);
                          return (
                            <tr
                              key={row.session_id + row.player_name + row.attempt_nr}
                              className={`transition-colors hover:bg-slate-800/40 ${
                                row.rank === 1
                                  ? 'bg-amber-500/10'
                                  : row.rank === 2
                                  ? 'bg-slate-800/20'
                                  : row.rank === 3
                                  ? 'bg-amber-950/15'
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
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center font-bold text-[10px] text-amber-300">
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
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
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
                                <span className="font-mono font-black text-sm sm:text-base text-amber-400">
                                  {row.quote_percent.toFixed(1)}%
                                </span>
                              </td>

                              {/* Bestes Doppel */}
                              <td className="py-3 px-3 text-right hidden sm:table-cell">
                                <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400">
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
              <div className="bg-gradient-to-b from-[#14120a] to-[#0c0903] rounded-3xl border-2 border-amber-500/40 shadow-2xl p-4 sm:p-5 flex flex-col">
                {/* Header Spiel 2 */}
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                      🏆
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <span>PDC Challenge</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-bold border border-yellow-500/30">
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
                    className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1"
                    title="Zur detaillierten Sektionen-Aufschlüsselung"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tabelle PDC */}
                {data.todayPdcLeaderboard.length === 0 ? (
                  <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
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
                        <tr className="border-b border-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-2 text-center w-12">Platz</th>
                          <th className="py-2.5 px-3">Spieler</th>
                          <th className="py-2.5 px-3 text-right">Punkte</th>
                          <th className="py-2.5 px-3 text-center">Abzeichen</th>
                          <th className="py-2.5 px-2 text-center hidden sm:table-cell">Shanghai</th>
                          <th className="py-2.5 px-2 text-center hidden sm:table-cell">Doppel</th>
                          <th className="py-2.5 px-2 text-right text-slate-500">Zeit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 font-medium">
                        {data.todayPdcLeaderboard.map((row) => {
                          const photo = getPlayerPhotoUrl(row.player_name);
                          const initials = getPlayerInitials(row.player_name);
                          const badge = getPdcBadge(row.best_score);
                          return (
                            <tr
                              key={row.session_id + row.player_name + row.attempt_nr}
                              className={`transition-colors hover:bg-slate-800/40 ${
                                row.rank === 1
                                  ? 'bg-amber-500/10'
                                  : row.rank === 2
                                  ? 'bg-slate-800/20'
                                  : row.rank === 3
                                  ? 'bg-amber-950/15'
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
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center font-bold text-[10px] text-yellow-300">
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
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-yellow-300 border border-slate-700">
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
                                <span className="font-mono font-black text-sm sm:text-base text-yellow-400">
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
                                <span className="font-mono font-bold text-amber-300">
                                  {row.total_shanghais}
                                </span>
                              </td>

                              {/* Doppel */}
                              <td className="py-3 px-2 text-center hidden sm:table-cell">
                                <span className="font-mono font-bold text-emerald-400">
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
            <div className="bg-gradient-to-b from-[#0e1322] to-[#080d19] rounded-3xl border-2 border-amber-500/40 p-5 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
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
                  <button
                    onClick={() => setViewMode('both')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all"
                  >
                    ← Zurück zur Gemeinschaftsansicht
                  </button>
                </div>
              </div>

              {/* Detaillierte Tabelle mit allen 5 Doppel */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-2 text-center w-12">Platz</th>
                      <th className="py-3 px-3">Spieler</th>
                      <th className="py-3 px-2 text-center">Treffer</th>
                      <th className="py-3 px-3 text-right">Gesamtquote</th>
                      <th className="py-3 px-3 text-center text-rose-400">D20</th>
                      <th className="py-3 px-3 text-center text-blue-400">D10</th>
                      <th className="py-3 px-3 text-center text-emerald-400">D16</th>
                      <th className="py-3 px-3 text-center text-amber-400">D8</th>
                      <th className="py-3 px-3 text-center text-purple-400">D4</th>
                      <th className="py-3 px-3 text-right">Bestes Doppel</th>
                      <th className="py-3 px-2 text-right text-slate-500">Zeit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-medium">
                    {data.todayDoppelLeaderboard.map((row) => (
                      <tr key={row.session_id + row.player_name} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-2 text-center">
                          {renderRankBadge(row.rank, row.isShared)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-black text-white text-sm">
                            {row.player_name}
                            {row.attempt_nr > 1 && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-amber-300">
                                #{row.attempt_nr}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono">
                          {row.total_hits} / {row.total_darts}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-amber-400 text-base">
                          {row.quote_percent.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-300">
                          {row.d20_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-300">
                          {row.d10_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-300">
                          {row.d16_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                          {row.d8_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-purple-300">
                          {row.d4_quote.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400">
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
            <div className="bg-gradient-to-b from-[#14120a] to-[#0c0903] rounded-3xl border-2 border-amber-500/40 p-5 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
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
                  <button
                    onClick={() => setViewMode('both')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all"
                  >
                    ← Zurück zur Gemeinschaftsansicht
                  </button>
                </div>
              </div>

              {/* Detaillierte PDC Tabelle */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-2 text-center w-12">Platz</th>
                      <th className="py-3 px-3">Spieler</th>
                      <th className="py-3 px-3 text-right">Gesamtpunkte</th>
                      <th className="py-3 px-3 text-center">Abzeichen</th>
                      <th className="py-3 px-3 text-center text-amber-300">Part 1 (10–15)</th>
                      <th className="py-3 px-3 text-center text-emerald-300">Part 2 (Doppel)</th>
                      <th className="py-3 px-3 text-center text-yellow-300">Part 3 (15–20)</th>
                      <th className="py-3 px-2 text-center">Shanghais</th>
                      <th className="py-3 px-2 text-center">Doppel-Hits</th>
                      <th className="py-3 px-2 text-right text-slate-500">Zeit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-medium">
                    {data.todayPdcLeaderboard.map((row) => {
                      const badge = getPdcBadge(row.best_score);
                      return (
                        <tr key={row.session_id + row.player_name} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-2 text-center">
                            {renderRankBadge(row.rank, row.isShared)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-black text-white text-sm">
                              {row.player_name}
                              {row.attempt_nr > 1 && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-yellow-300">
                                  #{row.attempt_nr}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-yellow-400 text-base">
                            {row.best_score}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${badge.badgeClass}`}>
                              <span>{badge.icon}</span>
                              <span>{badge.name}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                            {row.score_part1 || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-300">
                            {row.score_part2 || '-'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-yellow-300">
                            {row.score_part3 || '-'}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-amber-300">
                            {row.total_shanghais}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-emerald-300">
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
            VIEW 4: ARCHIV & KALENDER (DATUMSAUSWAHL & PROTOKOLL)
            ======================================================== */}
        {viewMode === 'archive' && (
          <div className="space-y-6">
            {/* Kalender / Datums-Auswahl Bar */}
            <div className="bg-gradient-to-r from-slate-950 via-[#0a1226] to-slate-950 rounded-3xl border border-blue-500/40 p-5 shadow-2xl">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
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
                    className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-400 shadow-inner"
                  />
                </div>
              </div>

              {/* Schnellauswahl der Trainingstage (Chips) */}
              <div className="mt-4 pt-3 border-t border-slate-800">
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
                            ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/30 border border-blue-400'
                            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        <span>{day.dayLabel}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-blue-300">
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
                <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>📅 {data.currentArchiveDayDetail.fullDateLabel}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {data.currentArchiveDayDetail.totalSessions} absolvierte Spiele
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs text-slate-400 mr-1">Aktive Spieler:</span>
                      {data.currentArchiveDayDetail.activePlayers.length > 0 ? (
                        data.currentArchiveDayDetail.activePlayers.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold"
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
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <span>Tages-Ranking in TV-Tabelle ansehen</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Spiele-Listen des Tages */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {/* Doppelquote Spiele */}
                  <div className="bg-slate-950 rounded-2xl border border-amber-500/30 p-4 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
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
                            className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-white">{g.playerName}</div>
                              {g.opponentName && (
                                <div className="text-[10px] text-slate-400">vs. {g.opponentName}</div>
                              )}
                              <div className="text-[10px] text-emerald-400 mt-0.5">
                                Bestes: {g.bestDouble}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-black text-amber-400 text-sm">
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
                  <div className="bg-slate-950 rounded-2xl border border-yellow-500/30 p-4 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                      <h4 className="text-sm font-black text-yellow-300 flex items-center gap-1.5">
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
                              className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
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
                                <div className="font-mono font-black text-yellow-400 text-sm">
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
                  <div className="bg-slate-950 rounded-2xl border border-emerald-500/30 p-4 shadow-xl flex flex-col">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                      <h4 className="text-sm font-black text-emerald-300 flex items-center gap-1.5">
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
                            className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{g.playerName}</span>
                                {g.isWinner ? (
                                  <span className="text-[10px] px-1.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                    Sieg
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                                    Niederlage
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">vs. {g.opponentName}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-black text-emerald-400 text-sm">
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
      <footer className="bg-slate-950 border-t border-slate-800/80 px-4 py-2.5 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 font-medium">
            TV-Board SC Weyhausen • Auto-Sync alle 8s • Gleichstand teilt den Platz automatisch (🤝)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/doppelquote" className="hover:text-amber-400 transition-colors">
            🎯 Checkout spielen
          </Link>
          <span>•</span>
          <Link href="/training/pdc-challenge" className="hover:text-amber-400 transition-colors">
            🏆 PDC Routine spielen
          </Link>
          <span>•</span>
          <Link href="/training/fussball" className="hover:text-emerald-400 transition-colors">
            ⚽ Fußball spielen
          </Link>
        </div>
      </footer>
    </div>
  );
}
