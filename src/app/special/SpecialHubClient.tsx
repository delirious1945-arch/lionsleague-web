'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserSession } from '@/app/actions';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Tv,
  Sparkles,
  Trees,
  Clock,
} from 'lucide-react';

interface SpecialHubClientProps {
  user: UserSession;
  initialBoard?: string | null;
}

const UPCOMING_SPECIALS = [
  {
    icon: '🎰',
    title: 'Mystery-Glücksrad & Turnier-Modus',
    subtitle: 'Automatische Auslosung, roter Tablet-Buzzer & Live-Glücksrad auf dem TV-Monitor',
  },
  {
    icon: '🏏',
    title: 'Klassik-Cricket',
    subtitle: 'Taktisches Schließen der Zahlen 15–20 + Bull mit Punktekampf',
  },
  {
    icon: '🎁',
    title: 'Schrottwichteln am Oche',
    subtitle: '6 geheime Weihnachtspakete erspielen, auspacken & dem Gegner wieder klauen',
  },
  {
    icon: '❄️',
    title: 'Lions-Schneeballschlacht',
    subtitle: 'Schneebälle formen, Festung reparieren & mit dem Bullseye Mauern sprengen',
  },
  {
    icon: '🚪',
    title: 'Verhexter Adventskalender',
    subtitle: '12 Kalendertürchen mit Schoko-Punkten, Grinch-Tausch & Knecht Ruprecht',
  },
  {
    icon: '🦌',
    title: 'Rudolphs Flug nach Weyhausen',
    subtitle: '5 Checkpoints vom Nordpol bis ins Vereinsheim Weyhausen im Sprint-Rennen',
  },
] as const;

export default function SpecialHubClient({
  user,
  initialBoard,
}: SpecialHubClientProps) {
  const [activeBoard, setActiveBoard] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBoard = urlParams.get('board');
      if (urlBoard && ['1', '2', '3', '4', '5'].includes(urlBoard)) {
        return urlBoard;
      }
      const saved =
        localStorage.getItem('lions_tablet_board') ||
        localStorage.getItem('lions_active_board') ||
        localStorage.getItem('lions_active_board_tannenbaum');
      if (saved && ['1', '2', '3', '4', '5'].includes(saved)) {
        return saved;
      }
    }
    return initialBoard && ['1', '2', '3', '4', '5'].includes(initialBoard) ? initialBoard : '1';
  });

  const handleSelectBoard = (b: string) => {
    setActiveBoard(b);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lions_tablet_board', b);
        localStorage.setItem('lions_active_board', b);
        localStorage.setItem('lions_active_board_tannenbaum', b);
        window.history.replaceState(null, '', `/special?board=${b}`);
      } catch {}
    }
  };

  // Beim Aufruf der Event-Arena: Standby-Signal an das gewählte Board senden
  useEffect(() => {
    try {
      const idlePayload = {
        boardId: activeBoard,
        sessionId: 'idle',
        status: 'idle',
        reset: true,
        updatedAt: Date.now(),
      };
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const masterBc = new BroadcastChannel(`lions_board_live_sync_${activeBoard}`);
        masterBc.postMessage(idlePayload);
        masterBc.close();
      }
      localStorage.setItem(`lions_board_live_sync_${activeBoard}`, JSON.stringify(idlePayload));
      fetch('/api/live/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idlePayload),
      }).catch(() => {});
    } catch {}
  }, [activeBoard]);

  return (
    <div className="relative min-h-[85vh] py-4 sm:py-7 max-w-6xl mx-auto px-3 sm:px-5 animate-fadeIn">
      {/* Hintergrund-Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 rounded-full bg-emerald-500/[0.08] blur-[130px]" />
        <div className="absolute bottom-[12%] right-[12%] w-[28rem] h-[28rem] rounded-full bg-amber-500/[0.07] blur-[140px]" />
        <div className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[34rem] h-64 rounded-full bg-rose-500/[0.05] blur-[150px]" />
      </div>

      <div className="space-y-6">
        {/* Top-Navigationsleiste */}
        <div
          data-ui-id="SPECIAL.NAV.BAR"
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              data-ui-id="SPECIAL.NAV.BACK_BTN"
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] text-xs font-semibold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Startseite</span>
            </Link>

            <div className="h-5 w-px bg-white/10 hidden sm:block" />

            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🎄</span>
              <span>Weihnachts- &amp; Event-Arena</span>
            </h1>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
              <Lock className="w-3 h-3" />
              <span>Admin-Only · Geheim</span>
            </span>
          </div>

          <Link
            href={`/board/${activeBoard}`}
            target="_blank"
            data-ui-id="SPECIAL.NAV.TV_LINK"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-xs font-bold transition-all shadow-sm"
          >
            <Tv className="w-4 h-4 text-cyan-400" />
            <span>TV-Monitor Board {activeBoard}</span>
          </Link>
        </div>

        {/* Board-Arretierung */}
        <div
          data-ui-id="SPECIAL.BOARD.SELECTOR"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-slate-900/65 backdrop-blur-xl border border-emerald-500/25 shadow-lg"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-200">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 font-mono font-black">
              BOARD {activeBoard}
            </span>
            <span>Dieses Tablet steuert TV-Monitor Board {activeBoard}</span>
            <span className="hidden md:inline text-slate-400 font-normal">
              (Angemeldet: {user.name})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {['1', '2', '3', '4', '5'].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => handleSelectBoard(b)}
                className={`min-w-[52px] min-h-[52px] px-3 rounded-xl font-mono text-sm font-black transition-all cursor-pointer ${
                  activeBoard === b
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105'
                    : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-white/10'
                }`}
              >
                B{b}
              </button>
            ))}
          </div>
        </div>

        {/* Aktive Spiele */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-emerald-300">
              Spielbare Event-Module
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Karte 1: Lions Tannenbaum */}
            <div
              data-ui-id="SPECIAL.GAME_TANNENBAUM.CARD"
              className="group relative rounded-3xl p-6 bg-gradient-to-br from-[#071a12]/90 via-slate-900/85 to-[#120d07]/90 hover:from-[#092418]/95 hover:to-[#1a1309]/95 backdrop-blur-2xl border-2 border-emerald-500/35 hover:border-emerald-400/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-300 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shadow-lg">
                      <Trees className="w-6 h-6 text-emerald-300" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        🎄 Lions Tannenbaum
                      </h3>
                      <span className="text-xs font-semibold text-amber-300">
                        Inspiriert vom Tannenbaumkegeln
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-400/[0.12] border border-emerald-400/35 text-emerald-200 font-mono font-bold text-[11px]">
                    1 vs. 1 &amp; Solo · Live TV
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Bringe alle <strong className="text-emerald-300">9 Christbaumkugeln (12–20)</strong> sowie den{' '}
                  <strong className="text-amber-300">Baumstamm (beliebiges Doppel)</strong> zum Leuchten! Sobald alle
                  10 Lichter brennen, setzt du mit <strong className="text-amber-300">Bull oder D20</strong> den Stern
                  auf die Spitze.
                </p>

                <div className="rounded-2xl bg-slate-950/60 border border-amber-400/25 px-3.5 py-2.5 text-xs text-amber-200/95 flex items-center gap-2">
                  <span>🔥</span>
                  <span>
                    <strong>Party-Clou:</strong> Triffst du ein <strong>Triple</strong> einer Zahl, die beim Gegner
                    schon leuchtet, pustest du seine Kugel wieder aus!
                  </span>
                </div>
              </div>

              <Link
                href={`/special/tannenbaum?board=${activeBoard}`}
                data-ui-id="SPECIAL.GAME_TANNENBAUM.START_BTN"
                className="w-full min-h-[56px] py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Spiel starten</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Demnächst in dieser Arena */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-slate-300">
              Demnächst in dieser Arena
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {UPCOMING_SPECIALS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-4 bg-slate-900/55 border border-white/[0.08] opacity-75 flex flex-col justify-between gap-2.5 select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{item.icon}</span>
                    <h3 className="text-sm font-black text-slate-100 leading-snug">
                      {item.title}
                    </h3>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono text-[10px] font-black uppercase">
                    In Arbeit
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
