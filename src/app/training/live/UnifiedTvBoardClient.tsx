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
  Tv,
  Monitor,
  Smartphone,
  Settings2,
  Sliders,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';

export type DisplayProfileSetting = 'auto' | 'tv' | 'laptop' | 'tablet';
export type ResolvedDisplayMode = 'tv' | 'laptop' | 'tablet';

function detectCurrentDisplay(): {
  resolvedMode: ResolvedDisplayMode;
  reason: string;
  isSmartTv: boolean;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
} {
  if (typeof window === 'undefined') {
    return {
      resolvedMode: 'tv',
      reason: 'Standard (Server-Rendering)',
      isSmartTv: false,
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 1080,
    };
  }

  const ua = navigator.userAgent || '';
  const isSmartTv =
    /TV|SmartTV|GoogleTV|AppleTV|HbbTV|CrKey|Roku|Tizen|Web0S|NetCast|BRAVIA|LargeScreen|AFT|MiTV|Hisense/i.test(
      ua
    );
  const isFullscreen = !!document.fullscreenElement;
  const screenW = window.screen?.width || window.innerWidth;
  const screenH = window.screen?.height || window.innerHeight;
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  // 1. Eindeutiger Smart-TV User-Agent
  if (isSmartTv) {
    return {
      resolvedMode: 'tv',
      reason: 'Smart-TV / TV-Browser erkannt (User-Agent)',
      isSmartTv: true,
      screenWidth: screenW,
      screenHeight: screenH,
      viewportWidth: winW,
      viewportHeight: winH,
    };
  }

  // 2. Vollbildmodus auf großem Bildschirm (z. B. TV-Wandboard per F11)
  if (isFullscreen && (winW >= 1700 || screenW >= 1700)) {
    return {
      resolvedMode: 'tv',
      reason: 'Vollbild Kiosk-Modus aktiv (55-65" TV-Wandboard)',
      isSmartTv: false,
      screenWidth: screenW,
      screenHeight: screenH,
      viewportWidth: winW,
      viewportHeight: winH,
    };
  }

  // 3. Ultra-HD / 4K Großbildschirm
  if (screenW >= 2560 || (screenW >= 1920 && dpr <= 1 && winW >= 1700)) {
    return {
      resolvedMode: 'tv',
      reason: 'Großbild / 4K Monitor (≥1920px Wurfdistanz)',
      isSmartTv: false,
      screenWidth: screenW,
      screenHeight: screenH,
      viewportWidth: winW,
      viewportHeight: winH,
    };
  }

  // 4. Kompakte Mobilgeräte / Tablets
  if (winW < 1024) {
    return {
      resolvedMode: 'tablet',
      reason: 'Kompakter Viewport (<1024px)',
      isSmartTv: false,
      screenWidth: screenW,
      screenHeight: screenH,
      viewportWidth: winW,
      viewportHeight: winH,
    };
  }

  // 5. Standard Laptop / Desktop Monitor (15–17 Zoll, 50cm Sitzabstand)
  return {
    resolvedMode: 'laptop',
    reason: 'Standard 15–17" Laptop / Desktop (Sitzdistanz ~50cm)',
    isSmartTv: false,
    screenWidth: screenW,
    screenHeight: screenH,
    viewportWidth: winW,
    viewportHeight: winH,
  };
}

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

  // Monitor- & Display-Erkennung (17" Laptop vs. 56" Vereinsheim-TV)
  const [displaySetting, setDisplaySetting] = useState<DisplayProfileSetting>('auto');
  const [resolvedDisplayMode, setResolvedDisplayMode] = useState<ResolvedDisplayMode>('tv');
  const [detectionReason, setDetectionReason] = useState<string>('Erkenne Anzeigegerät...');
  const [displayZoom, setDisplayZoom] = useState<number>(1.15);
  const [showDisplayMenu, setShowDisplayMenu] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState<boolean>(true);
  const displayMenuRef = useRef<HTMLDivElement>(null);

  // Initialisierung aus URL (?display=tv|laptop|tablet|auto) und localStorage
  useEffect(() => {
    let initialSetting: DisplayProfileSetting = 'auto';

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlDisp = params.get('display');
      if (urlDisp === 'tv' || urlDisp === 'laptop' || urlDisp === 'tablet' || urlDisp === 'auto') {
        initialSetting = urlDisp;
      } else {
        const stored = localStorage.getItem('lions_tv_display_profile') as DisplayProfileSetting | null;
        if (stored === 'tv' || stored === 'laptop' || stored === 'tablet' || stored === 'auto') {
          initialSetting = stored;
        }
      }
    }

    setDisplaySetting(initialSetting);

    const detected = detectCurrentDisplay();
    if (initialSetting === 'auto') {
      setResolvedDisplayMode(detected.resolvedMode);
      setDetectionReason(detected.reason);
      setDisplayZoom(detected.resolvedMode === 'tv' ? 1.15 : 1.0);
    } else {
      setResolvedDisplayMode(initialSetting);
      setDetectionReason(
        `Manuell gewählt: ${initialSetting === 'tv' ? '56" TV' : initialSetting === 'laptop' ? '17" Laptop' : 'Tablet'}`
      );
      setDisplayZoom(initialSetting === 'tv' ? 1.15 : 1.0);
    }
  }, []);

  // Automatische Neubewertung bei Resize & Vollbild-Änderung
  useEffect(() => {
    const handleReevaluate = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (displaySetting === 'auto') {
        const detected = detectCurrentDisplay();
        setResolvedDisplayMode(detected.resolvedMode);
        setDetectionReason(detected.reason);
        setDisplayZoom(detected.resolvedMode === 'tv' ? 1.15 : 1.0);
      }
    };

    window.addEventListener('resize', handleReevaluate);
    document.addEventListener('fullscreenchange', handleReevaluate);
    return () => {
      window.removeEventListener('resize', handleReevaluate);
      document.removeEventListener('fullscreenchange', handleReevaluate);
    };
  }, [displaySetting]);

  // Umschalten des Monitor-Profils (mit Persistenz)
  const handleSelectDisplaySetting = (setting: DisplayProfileSetting) => {
    setDisplaySetting(setting);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lions_tv_display_profile', setting);
    }

    if (setting === 'auto') {
      const detected = detectCurrentDisplay();
      setResolvedDisplayMode(detected.resolvedMode);
      setDetectionReason(detected.reason);
      setDisplayZoom(detected.resolvedMode === 'tv' ? 1.15 : 1.0);
    } else {
      setResolvedDisplayMode(setting);
      setDetectionReason(
        `Manuell gewählt: ${setting === 'tv' ? '56" TV' : setting === 'laptop' ? '17" Laptop' : 'Tablet'}`
      );
      setDisplayZoom(setting === 'tv' ? 1.15 : 1.0);
    }
  };

  // Screen Wake Lock API (verhindert Standby/Bildschirmschoner auf Fernsehern)
  useEffect(() => {
    let sentinel: any = null;
    let isCancelled = false;

    const requestLock = async () => {
      if (!wakeLockEnabled) {
        if (sentinel) {
          try {
            await sentinel.release();
          } catch (e) {}
          sentinel = null;
        }
        setWakeLockActive(false);
        return;
      }

      if (
        typeof navigator !== 'undefined' &&
        'wakeLock' in navigator &&
        (resolvedDisplayMode === 'tv' || wakeLockEnabled)
      ) {
        try {
          sentinel = await (navigator as any).wakeLock.request('screen');
          if (!isCancelled) {
            setWakeLockActive(true);
            sentinel.addEventListener('release', () => {
              if (!isCancelled) setWakeLockActive(false);
            });
          }
        } catch (e) {
          if (!isCancelled) setWakeLockActive(false);
        }
      }
    };

    requestLock();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) {
        try {
          sentinel.release();
        } catch (e) {}
      }
    };
  }, [resolvedDisplayMode, wakeLockEnabled]);

  // Click-Outside für das Display-Einstellungs-Menü
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (displayMenuRef.current && !displayMenuRef.current.contains(e.target as Node)) {
        setShowDisplayMenu(false);
      }
    };
    if (showDisplayMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDisplayMenu]);

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
    <div
      className={`relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#05070e] text-slate-100 flex flex-col font-sans select-none antialiased ${
        resolvedDisplayMode === 'tv' ? 'tv-board-large-screen font-medium' : ''
      }`}
      style={{
        zoom: displayZoom !== 1.0 ? displayZoom : undefined,
      }}
    >
      {/* Dezente Hintergrund-Lichtquellen für edlen Glassmorphism-Effekt */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[15%] w-[30rem] h-[30rem] rounded-full bg-amber-500/[0.05] blur-[140px]" />
        <div className="absolute bottom-[12%] right-[15%] w-[32rem] h-[32rem] rounded-full bg-slate-400/[0.04] blur-[150px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40rem] h-72 rounded-full bg-amber-400/[0.03] blur-[160px]" />
      </div>

      {/* ========================================================
          TV HEADER / CONTROL BAR (AUFGERÄUMT, EINZEILIG & GLASSMORPHISM)
          ======================================================== */}
      <header data-ui-id="TV_BOARD.HEADER.BAR" className="bg-white/[0.025] border-b border-white/[0.08] px-4 py-2.5 sticky top-0 z-40 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1920px] mx-auto flex flex-wrap xl:flex-nowrap items-center justify-between gap-3">
          {/* 1. LINKS: Zurück-Button & Einzeiliger Titel */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/training"
              data-ui-id="TV_BOARD.HEADER.BACK_BTN"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 hover:text-white transition-all text-xs font-bold whitespace-nowrap"
              title="Zurück zum Trainingsmenü"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Training</span>
            </Link>

            <h1 data-ui-id="TV_BOARD.HEADER.TITLE" className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 whitespace-nowrap">
              <span>LIONS TV-BOARD</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/[0.12] text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/35">
                LIVE
              </span>
            </h1>
          </div>

          {/* 2. MITTE: Spiel-Auswahl (Einheitliches Dark-Gold Glassmorphism) */}
          <div data-ui-id="TV_BOARD.NAV.TABS_BAR" className="flex items-center justify-center gap-1 bg-black/40 backdrop-blur-xl p-1 rounded-2xl border border-white/[0.08] flex-wrap sm:flex-nowrap order-3 xl:order-2 w-full xl:w-auto">
            <button
              onClick={() => {
                setViewMode('both');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              data-ui-id="TV_BOARD.NAV.TAB_ALL_4"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'both' && timeframe !== 'archive'
                  ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_2px_15px_rgba(245,158,11,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gesamtübersicht (4 Spiele)</span>
            </button>

            <button
              onClick={() => {
                setViewMode('doppelquote');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              data-ui-id="TV_BOARD.NAV.TAB_CHECKOUT"
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
              data-ui-id="TV_BOARD.NAV.TAB_PDC"
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
              data-ui-id="TV_BOARD.NAV.TAB_FUSSBALL"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'fussball' && timeframe !== 'archive'
                  ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_2px_15px_rgba(245,158,11,0.25)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>Fußball</span>
            </button>

            <button
              onClick={() => {
                setViewMode('stellen_checken');
                if (timeframe === 'archive') setTimeframe('today');
              }}
              data-ui-id="TV_BOARD.NAV.TAB_STELLEN"
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
              data-ui-id="TV_BOARD.NAV.TAB_ARCHIVE"
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
              <div data-ui-id="TV_BOARD.TIMEFRAME.BAR" className="flex items-center gap-0.5 bg-black/40 backdrop-blur-xl p-1 rounded-xl border border-white/[0.08] text-xs">
                <button
                  onClick={() => handleTimeframeChange('today')}
                  data-ui-id="TV_BOARD.TIMEFRAME.TODAY_BTN"
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
                  data-ui-id="TV_BOARD.TIMEFRAME.MONTH_BTN"
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
                  data-ui-id="TV_BOARD.TIMEFRAME.ALL_BTN"
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
            <div data-ui-id="TV_BOARD.HEADER.CLOCK" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-amber-300 font-mono text-xs sm:text-sm font-bold shadow-inner whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-amber-300/80" />
              <span>{currentTime || '--:--:--'}</span>
            </div>

            {/* Sync, Audio, Monitor-Automation & Vollbild */}
            <div className="flex items-center gap-1">
              {/* DISPLAY / MONITOR PROFILE AUTOMATION BUTTON & DROPDOWN */}
              <div className="relative" ref={displayMenuRef}>
                <button
                  onClick={() => setShowDisplayMenu((prev) => !prev)}
                  data-ui-id="TV_BOARD.HEADER.DISPLAY_PROFILE_BTN"
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                    showDisplayMenu
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                      : resolvedDisplayMode === 'tv'
                      ? 'bg-white/[0.05] text-amber-300 border-amber-400/40 hover:bg-white/[0.1]'
                      : resolvedDisplayMode === 'laptop'
                      ? 'bg-white/[0.05] text-sky-300 border-sky-400/40 hover:bg-white/[0.1]'
                      : 'bg-white/[0.05] text-emerald-300 border-emerald-400/40 hover:bg-white/[0.1]'
                  }`}
                  title="Monitor- & TV-Automation konfigurieren"
                >
                  {resolvedDisplayMode === 'tv' ? (
                    <Tv className="w-4 h-4 shrink-0" />
                  ) : resolvedDisplayMode === 'laptop' ? (
                    <Monitor className="w-4 h-4 shrink-0" />
                  ) : (
                    <Smartphone className="w-4 h-4 shrink-0" />
                  )}
                  <span className="hidden md:inline font-mono text-[11px]">
                    {displaySetting === 'auto' ? 'Auto' : 'Profil'}:{' '}
                    {resolvedDisplayMode === 'tv'
                      ? '56" TV'
                      : resolvedDisplayMode === 'laptop'
                      ? '17" Laptop'
                      : 'Tablet'}
                  </span>
                  {wakeLockActive && resolvedDisplayMode === 'tv' && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                      title="Bildschirmschoner-Schutz aktiv"
                    />
                  )}
                </button>

                {/* DROPDOWN MENU */}
                {showDisplayMenu && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/[0.15] shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-4 z-50 text-slate-200 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.1]">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-amber-400" />
                        <span className="font-black text-sm text-white">Monitor- & TV-Automation</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-slate-300 font-bold">
                        {Math.round(displayZoom * 100)}% Zoom
                      </span>
                    </div>

                    {/* Erkennungs-Info-Box */}
                    <div className="my-3 p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-400/25 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <div className="font-bold text-amber-300">
                          {displaySetting === 'auto' ? 'Auto-Erkennung aktiv' : 'Manuelle Einstellung'}
                        </div>
                        <div className="text-slate-300">{detectionReason}</div>
                      </div>
                    </div>

                    {/* Auswahl Monitor-Profile */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold px-1">
                        Profil auswählen
                      </div>

                      <button
                        onClick={() => handleSelectDisplaySetting('auto')}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          displaySetting === 'auto'
                            ? 'bg-amber-400/15 border-amber-400/50 text-white'
                            : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Sliders className="w-4 h-4 text-amber-400" />
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1.5">
                              <span>✨ Automatische Erkennung</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono font-bold">
                                Empfohlen
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Prüft User-Agent, Auflösung, Vollbild und Kiosk-Modus
                            </div>
                          </div>
                        </div>
                        {displaySetting === 'auto' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>

                      <button
                        onClick={() => handleSelectDisplaySetting('tv')}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          displaySetting === 'tv'
                            ? 'bg-amber-400/15 border-amber-400/50 text-white'
                            : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Tv className="w-4 h-4 text-amber-400" />
                          <div>
                            <div className="font-bold text-xs">📺 Vereinsheim-TV (56" Großbild)</div>
                            <div className="text-[10px] text-slate-400">
                              Große Schriften, High-Contrast, Wurfdistanz 3–5m, Standby-Schutz
                            </div>
                          </div>
                        </div>
                        {displaySetting === 'tv' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>

                      <button
                        onClick={() => handleSelectDisplaySetting('laptop')}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          displaySetting === 'laptop'
                            ? 'bg-sky-400/15 border-sky-400/50 text-white'
                            : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Monitor className="w-4 h-4 text-sky-400" />
                          <div>
                            <div className="font-bold text-xs">🖥️ Laptop / PC (15–17" Schreibtisch)</div>
                            <div className="text-[10px] text-slate-400">
                              Kompakte Datendichte, Standard-Zoom, Sitzabstand ~50cm
                            </div>
                          </div>
                        </div>
                        {displaySetting === 'laptop' && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                      </button>

                      <button
                        onClick={() => handleSelectDisplaySetting('tablet')}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          displaySetting === 'tablet'
                            ? 'bg-emerald-400/15 border-emerald-400/50 text-white'
                            : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Smartphone className="w-4 h-4 text-emerald-400" />
                          <div>
                            <div className="font-bold text-xs">📱 Tablet / Mobil</div>
                            <div className="text-[10px] text-slate-400">
                              Touch-optimiert, vertikaler Stapelfluss
                            </div>
                          </div>
                        </div>
                        {displaySetting === 'tablet' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    </div>

                    {/* Zoom-Feinjustierung */}
                    <div className="mt-3 pt-3 border-t border-white/[0.08]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                          Skalierung / Zoom
                        </span>
                        <span className="font-mono text-amber-300 font-bold text-xs">
                          {Math.round(displayZoom * 100)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[1.0, 1.1, 1.15, 1.25].map((zVal) => (
                          <button
                            key={zVal}
                            onClick={() => setDisplayZoom(zVal)}
                            className={`py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              Math.abs(displayZoom - zVal) < 0.02
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300'
                            }`}
                          >
                            {Math.round(zVal * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Standby- / Bildschirmschoner-Schutz (WakeLock) */}
                    <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck
                          className={`w-4 h-4 ${wakeLockActive ? 'text-emerald-400' : 'text-slate-500'}`}
                        />
                        <div>
                          <div className="text-xs font-bold text-white">Bildschirmschoner-Schutz</div>
                          <div className="text-[10px] text-slate-400">
                            {wakeLockActive
                              ? 'Display bleibt beim Werfen dauerhaft an'
                              : 'Standard Standby-Verhalten'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setWakeLockEnabled((prev) => !prev)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          wakeLockEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/[0.05] text-slate-400 border border-white/[0.1]'
                        }`}
                      >
                        {wakeLockEnabled ? 'Aktiv' : 'Aus'}
                      </button>
                    </div>

                    {/* Lesezeichen-Tipp für Vereinsheim */}
                    <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] text-slate-400 leading-normal">
                      💡 <strong>Tipp für den Vereinsheim-TV:</strong> Als Lesezeichen{' '}
                      <code className="text-amber-300">/training/live?display=tv</code> speichern, um den 56"-Modus fest einzustellen.
                    </div>
                  </div>
                )}
              </div>

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
                ? 'Gesamtübersicht (Alle 4 Trainingsspiele)'
                : viewMode === 'doppelquote'
                ? 'Checkout Battle (Doppelquote)'
                : viewMode === 'pdc'
                ? 'PDC Challenge Routine'
                : viewMode === 'fussball'
                ? 'Fußball (Matchboard & Duelle)'
                : viewMode === 'stellen_checken'
                ? 'Stellen & Checken (3–101)'
                : 'Archiv & Kalender'}
            </span>

            <span className="text-slate-600">•</span>

            {/* Display-Profil Pill */}
            <button
              onClick={() => setShowDisplayMenu(true)}
              className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] font-mono text-[10px] flex items-center gap-1 transition-all cursor-pointer"
              title="Klicken zum Anpassen des Monitor-Profils"
            >
              {resolvedDisplayMode === 'tv' ? (
                <>
                  <Tv className="w-3 h-3 text-amber-300" />
                  <span className="font-bold text-amber-200">56" TV-Modus</span>
                </>
              ) : resolvedDisplayMode === 'laptop' ? (
                <>
                  <Monitor className="w-3 h-3 text-sky-300" />
                  <span className="font-bold text-sky-200">17" Laptop-Modus</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3 h-3 text-emerald-300" />
                  <span className="font-bold text-emerald-200">Mobil / Tablet</span>
                </>
              )}
              {wakeLockActive && resolvedDisplayMode === 'tv' && (
                <span className="text-emerald-400 font-bold ml-0.5">• WakeLock ✓</span>
              )}
            </button>

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
              <strong className="text-white font-mono">{data.todayFussballMatches?.length || 0}</strong> Fußball Matches
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
              <div data-ui-id="TV_BOARD.QUADRANT.CHECKOUT_CARD" className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-4 sm:p-5 flex flex-col">
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
              <div data-ui-id="TV_BOARD.QUADRANT.PDC_CARD" className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-4 sm:p-5 flex flex-col">
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

              {/* TABELLE 3: FUßBALL DARTS (MATCHBOARD & DUELLE) */}
              <div data-ui-id="TV_BOARD.QUADRANT.FUSSBALL_CARD" className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-4 sm:p-5 flex flex-col">
                {/* Header Spiel 3 */}
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                      ⚽
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <span>Fußball Darts</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/[0.08] text-amber-300/90 font-bold border border-amber-400/20">
                          1vs1 & vs. Computer
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Balleroberung auf Bull & Tore über beliebige Doppel • Wertung ab 5 Toren
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewMode('fussball')}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 border border-white/[0.09] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Zur detaillierten Fußball-Matchliste"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tabelle Fußball Leaderboard */}
                {data.todayFussballLeaderboard.length === 0 ? (
                  <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-center p-6 bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08]">
                    <div className="text-4xl mb-3">⚽</div>
                    <h3 className="text-base font-bold text-slate-200">
                      Noch keine Fußball-Spiele heute
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Sobald ein Spieler ein Match ab 5 Toren beendet (1vs1 oder gegen den Computer), erscheint die Wertung hier sofort auf dem TV-Board!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.07] text-slate-400 uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-2 text-center w-12">Platz</th>
                            <th className="py-2.5 px-3">Spieler</th>
                            <th className="py-2.5 px-2 text-center">Spiele</th>
                            <th className="py-2.5 px-2 text-center">Tore</th>
                            <th className="py-2.5 px-3 text-right">Siegquote</th>
                            <th className="py-2.5 px-2 text-right text-slate-500">Zeit</th>
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
                                        <Image src={photo} alt={row.player_name} width={32} height={32} className="w-full h-full object-cover" />
                                      ) : (
                                        <span>{initials}</span>
                                      )}
                                    </div>
                                    <div className="font-black text-white text-xs sm:text-sm tracking-tight">
                                      {row.player_name}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-center font-mono">
                                  <span className="font-bold text-white">{row.matches_count}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">({row.wins}S/{row.losses}N)</span>
                                </td>
                                <td className="py-3 px-2 text-center font-mono font-bold text-slate-200">
                                  {row.goals_scored}:{row.goals_conceded}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-black text-sm text-amber-300">
                                  {row.win_rate.toFixed(1)}%
                                </td>
                                <td className="py-3 px-2 text-right text-[11px] font-mono text-slate-500">
                                  {row.last_time || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mini-Match-Ticker */}
                    {data.todayFussballMatches && data.todayFussballMatches.length > 0 && (
                      <div className="pt-2.5 border-t border-white/[0.06]">
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center justify-between">
                          <span>Zuletzt gespielte Matches:</span>
                          <span className="text-slate-500 font-mono">{data.todayFussballMatches.length} gesamt</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {data.todayFussballMatches.slice(0, 2).map((m) => {
                            const p1Win = m.player1_goals > m.player2_goals;
                            const p2Win = m.player2_goals > m.player1_goals;
                            return (
                              <div key={m.id} className="p-2 bg-white/[0.02] rounded-xl border border-white/[0.06] flex items-center justify-between text-xs">
                                <div className="truncate pr-2">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className={`font-bold truncate ${p1Win ? 'text-amber-300' : 'text-slate-300'}`}>{m.player1_name}</span>
                                    <span className="text-slate-500 text-[10px]">vs.</span>
                                    <span className={`truncate text-xs ${p2Win ? 'text-amber-300' : 'text-slate-400'}`}>{m.player2_name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono mt-0.5">
                                    <span>{m.time_label}</span>
                                    <span>•</span>
                                    <span>{m.darts_thrown} Darts</span>
                                    {m.is_computer && (
                                      <span className="px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
                                        vs. Computer
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="font-mono font-black px-2 py-0.5 rounded bg-black/40 border border-white/5 shrink-0 text-white">
                                  {m.player1_goals} : {m.player2_goals}
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

              {/* TABELLE 4: STELLEN & CHECKEN (3–101 PUNKTEJAGD) */}
              <div data-ui-id="TV_BOARD.QUADRANT.STELLEN_CARD" className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] p-4 sm:p-5 flex flex-col">
                {/* Header Spiel 4 */}
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                      🎲
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <span>Stellen & Checken</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/[0.08] text-amber-300/90 font-bold border border-amber-400/20">
                          3–101
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        15 Runden Finish-Jagd • +1 Pkt (3–60), +2 Pkt (61–80), +3 Pkt (81–101)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewMode('stellen_checken')}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 border border-white/[0.09] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Zur detaillierten Stellen & Checken Übersicht"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tabelle Stellen & Checken */}
                {(!data.todayStellenCheckenLeaderboard || data.todayStellenCheckenLeaderboard.length === 0) ? (
                  <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-center p-6 bg-white/[0.02] rounded-2xl border border-dashed border-white/[0.08]">
                    <div className="text-4xl mb-3">🎲</div>
                    <h3 className="text-base font-bold text-slate-200">
                      Noch keine Stellen & Checken Spiele heute
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Sobald ein Spieler eine 15-Runden-Sequenz wirft, erscheint die Wertung hier sofort live auf dem TV-Board!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.07] text-slate-400 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-2 text-center w-12">Platz</th>
                          <th className="py-2.5 px-3">Spieler</th>
                          <th className="py-2.5 px-2 text-center">Sequenz</th>
                          <th className="py-2.5 px-3 text-right">Punkte</th>
                          <th className="py-2.5 px-3 text-right hidden sm:table-cell">Checks (15 R.)</th>
                          <th className="py-2.5 px-2 text-right text-slate-500">Zeit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] font-medium">
                        {data.todayStellenCheckenLeaderboard.map((row, idx) => {
                          const photo = getPlayerPhotoUrl(row.player_name);
                          const initials = getPlayerInitials(row.player_name);
                          return (
                            <tr
                              key={row.session_id + '_' + idx}
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
                                      <Image src={photo} alt={row.player_name} width={32} height={32} className="w-full h-full object-cover" />
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
                              <td className="py-3 px-2 text-center font-mono">
                                <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.09] text-[11px] font-bold text-amber-200">
                                  #{String(row.preset_id).padStart(3, '0')}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span className="font-mono font-black text-sm sm:text-base text-amber-300">
                                  {row.points_scored}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono ml-1">
                                  / {row.max_possible_points}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right hidden sm:table-cell font-mono text-slate-300">
                                {row.checks_count}/{row.total_rounds} ({row.quote_percent.toFixed(0)}%)
                              </td>
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
                      <span>Fußball • Matchboard & Duelle</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/[0.08] text-amber-300/90 font-bold border border-amber-400/20">
                        1vs1 & vs. Computer
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Offizielle Fußball Darts Duelle & Matches (gewertet ab 5 Toren gem. BBDV-Leistungsstandard).
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
                    Noch keine regulären Fußball-Matches in diesem Zeitraum
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    Spiele ab 5 Toren (1-gegen-1 Duelle oder Spiele gegen den Computer) werden hier automatisch für das Leistungsranking gewertet.
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
                          <span>⚽ Ausgetragene Matches ({data.todayFussballMatches.length}):</span>
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
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-slate-400">{m.time_label || 'Spiel'}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                    m.is_computer
                                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
                                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                                  }`}>
                                    {m.is_computer ? '🤖 vs. Computer' : '👥 1-gegen-1'}
                                  </span>
                                </div>
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
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>vs. {g.opponentName}</span>
                                {g.isComputer && (
                                  <span className="text-[9px] px-1 rounded bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/25">
                                    vs. Computer
                                  </span>
                                )}
                              </div>
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
