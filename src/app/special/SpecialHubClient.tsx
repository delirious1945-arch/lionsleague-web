'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserSession } from '@/app/actions';
import { getBoardNumberFromSessionName } from '@/lib/session';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Tv,
  Sparkles,
  Trees,
  Clock,
} from 'lucide-react';
import {
  isPlayerSlug,
  getBoardDisplayName,
  getPlayerSlug,
  getPlayerBySlug,
} from '@/lib/playerSlugs';

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
] as const;

export default function SpecialHubClient({
  user,
  initialBoard,
}: SpecialHubClientProps) {
  const sessionBoardNum = getBoardNumberFromSessionName(user?.name);
  const userSlug = user?.name ? getPlayerSlug(user.name) : null;
  const validUserSlug = userSlug && isPlayerSlug(userSlug) ? userSlug : null;
  const userPlayer = validUserSlug ? getPlayerBySlug(validUserSlug) : null;

  const [activeBoard, setActiveBoard] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBoard = urlParams.get('board')?.trim().toLowerCase();
      if (urlBoard && (['1', '2', '3', '4', '5'].includes(urlBoard) || isPlayerSlug(urlBoard))) {
        return urlBoard;
      }
      const saved = (
        localStorage.getItem('lions_tablet_board') ||
        localStorage.getItem('lions_active_board') ||
        localStorage.getItem('lions_active_board_tannenbaum') ||
        localStorage.getItem('lions_active_board_adventskalender') ||
        localStorage.getItem('lions_active_board_rudolph') ||
        localStorage.getItem('lions_active_board_bingo') ||
        localStorage.getItem('lions_active_board_dartsgolf') ||
        localStorage.getItem('lions_active_board_dartsrally')
      )?.trim().toLowerCase();
      if (saved && (['1', '2', '3', '4', '5'].includes(saved) || isPlayerSlug(saved))) {
        return saved;
      }
      if (sessionBoardNum) {
        return sessionBoardNum;
      }
      if (validUserSlug) {
        return validUserSlug;
      }
    }
    const cleanInit = initialBoard?.trim().toLowerCase();
    return cleanInit && (['1', '2', '3', '4', '5'].includes(cleanInit) || isPlayerSlug(cleanInit))
      ? cleanInit
      : sessionBoardNum || validUserSlug || '1';
  });

  const handleSelectBoard = (b: string) => {
    setActiveBoard(b);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lions_tablet_board', b);
        localStorage.setItem('lions_active_board', b);
        localStorage.setItem('lions_active_board_tannenbaum', b);
        localStorage.setItem('lions_active_board_adventskalender', b);
        localStorage.setItem('lions_active_board_rudolph', b);
        localStorage.setItem('lions_active_board_bingo', b);
        localStorage.setItem('lions_active_board_dartsgolf', b);
        localStorage.setItem('lions_active_board_dartsrally', b);
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
              <span>Admin &amp; Board 4/5 · Geheim</span>
            </span>
          </div>

          <Link
            href={`/board/${activeBoard}`}
            target="_blank"
            data-ui-id="SPECIAL.NAV.TV_LINK"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-xs font-bold transition-all shadow-sm"
          >
            <Tv className="w-4 h-4 text-cyan-400" />
            <span>TV-Monitor {getBoardDisplayName(activeBoard)}</span>
          </Link>
        </div>

        {/* Board-Arretierung */}
        <div
          data-ui-id="SPECIAL.BOARD.SELECTOR"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-slate-900/65 backdrop-blur-xl border border-emerald-500/25 shadow-lg"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-200 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 font-mono font-black uppercase">
              {getBoardDisplayName(activeBoard)}
            </span>
            <span>Dieses Tablet steuert TV-Monitor: {getBoardDisplayName(activeBoard)}</span>
            <span className="hidden md:inline text-slate-400 font-normal">
              (Angemeldet: {user.name})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {userPlayer && (
              <button
                type="button"
                onClick={() => handleSelectBoard(userPlayer.slug)}
                className={`min-h-[52px] px-3 rounded-xl font-mono text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  activeBoard === userPlayer.slug
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105'
                    : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30'
                }`}
                title={`Mein persönlicher Monitor (${userPlayer.slug.toUpperCase()})`}
              >
                👤 Mein Monitor ({userPlayer.slug.toUpperCase()})
              </button>
            )}
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
                Board {b}
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
                        Exklusiv-Besitz · 6/11 vs. Alle 11
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-400/[0.12] border border-emerald-400/35 text-emerald-200 font-mono font-bold text-[11px]">
                    1 vs. 1 &amp; Solo · Live TV
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Erobere vollfarbige <strong className="text-emerald-300">Exklusiv-Elemente</strong> (
                  <strong className="text-red-300">Rot</strong> vs. <strong className="text-amber-300">Gold</strong>):
                  9 Kugeln (12–20), der <strong className="text-amber-300">Baumstamm (beliebiges Doppel)</strong> sowie
                  der <strong className="text-amber-300">Stern (Bull/D20, ab Start werfbar)</strong>! Wähle zwischen{' '}
                  <strong className="text-emerald-300">6 von 11</strong> (Schnell-Duell) oder{' '}
                  <strong className="text-amber-300">Alle 11 Elementen</strong>.
                </p>

                <div className="rounded-2xl bg-slate-950/60 border border-orange-400/30 px-3.5 py-2.5 text-xs text-orange-200/95 flex items-center gap-2">
                  <span>🔥</span>
                  <span>
                    <strong>D/T-Klau &amp; Abprall-Schutz:</strong> Freie Kugeln sicherst du mit jedem Treffer. Bei
                    gegnerischen Kugeln prallt ein Single ab — erst <strong>Doppel oder Triple</strong> klaut sie
                    komplett!
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

            {/* Karte 2: Der verhexte Adventskalender */}
            <div
              data-ui-id="SPECIAL.GAME_ADVENTSKALENDER.CARD"
              className="group relative rounded-3xl p-6 bg-gradient-to-br from-[#230910]/90 via-slate-900/90 to-[#161006]/90 hover:from-[#2f0c15]/95 hover:to-[#1f1608]/95 backdrop-blur-2xl border-2 border-amber-500/40 hover:border-amber-400/75 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-300 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-lg">
                      🚪
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        Der verflixte Adventskalender
                      </h3>
                      <span className="text-xs font-semibold text-amber-300">
                        24 Mystery-Türchen (inkl. Nikolaus 6+Bull &amp; Heiligabend 20+4+Bull)
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/[0.12] border border-amber-400/35 text-amber-200 font-mono font-bold text-[11px]">
                    1 vs. 1 &amp; Solo · Live TV
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Öffne mit Treffern auf <strong className="text-amber-300">1 bis 20</strong>,{' '}
                  <strong className="text-cyan-300">Doppel (21)</strong>, <strong className="text-cyan-300">Triple (22)</strong>{' '}
                  &amp; <strong className="text-cyan-300">Bull (23)</strong> alle 24 Türchen! Inklusive{' '}
                  <strong className="text-amber-300">Nikolaus (Tür 6: 6 + Bull)</strong> und{' '}
                  <strong className="text-amber-300">Heiligabend (Tür 24: 20 + 4 + Bull)</strong>. Dahinter warten{' '}
                  <strong className="text-emerald-300">Punkte (+25 bis +75)</strong>,{' '}
                  <strong className="text-emerald-300">Schutz-Engel (2× Schild)</strong> und der{' '}
                  <strong className="text-red-300">Geschenke-Räuber (Steal 50)</strong>.
                </p>

                <div className="rounded-2xl bg-slate-950/60 border border-purple-400/30 px-3.5 py-2.5 text-xs text-purple-200/95 flex items-center gap-2">
                  <span>👹</span>
                  <span>
                    <strong>Party-Chaos &amp; 6 Flüche:</strong> Der <strong>Grinch</strong> tauscht Punkte, dazu drohen{' '}
                    <strong>Im Sitzen</strong>, <strong>Nur 1 Dart</strong>, <strong>Runde aussetzen</strong>,{' '}
                    <strong>360°-Drehwurm</strong> &amp; <strong>Falsche Hand</strong>!
                  </span>
                </div>
              </div>

              <Link
                href={`/special/adventskalender?board=${activeBoard}`}
                data-ui-id="SPECIAL.GAME_ADVENTSKALENDER.START_BTN"
                className="w-full min-h-[56px] py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Spiel starten</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div
            data-ui-id="SPECIAL.GAME_RUDOLPH.CARD"
            className="group relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-br from-slate-900/95 via-rose-950/25 to-slate-900/95 p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-2xl shadow-rose-950/30 hover:border-rose-400/50 transition-all"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    🦌
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Live-Rennen
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
                        Solo &amp; 1 vs. 1
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Rudolphs Flug nach Weyhausen
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                10 zufällig geloste Weihnachts-Routen über 12 Stationen (Nordpol bis Weyhausen) mit
                strengen Segment-Zielen (Großes/Kleines Single, Doppel, Triple, Bull) sowie
                Schneeball-Sabotage, Schlitten-Crash und Wichtel-Schild!
              </p>

              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  🎲 10 Zufalls-Routen
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  🎯 Strikte Zonen
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  ❄️ Sabotage &amp; Crash
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <Link
                href={`/special/rudolph?board=${activeBoard}`}
                data-ui-id="SPECIAL.GAME_RUDOLPH.START_BTN"
                className="w-full min-h-[56px] py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-rose-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Spiel starten</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div
            data-ui-id="SPECIAL.GAME_BINGO.CARD"
            className="group relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/95 via-emerald-950/25 to-slate-900/95 p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-2xl shadow-emerald-950/30 hover:border-emerald-400/50 transition-all"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    🎱
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Party-Bingo
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
                        Solo &amp; 1 vs. 1
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Weihnachts-Bingo
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Stemple deine 3×3 Weihnachts-Bingo-Karte per 1-Tap am Tablet ab – wahlweise im Duell auf
                identischen oder individuellen Karten. Wer zuerst eine 3er-Reihe (waagerecht, senkrecht
                oder diagonal) füllt, gewinnt!
              </p>

              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  🎄 3×3 Missionskarte
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  🔥 Fehlt-1-Alarm
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  🎉 Live-BINGO-Buzzer
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <Link
                href={`/special/bingo?board=${activeBoard}`}
                data-ui-id="SPECIAL.GAME_BINGO.START_BTN"
                className="w-full min-h-[56px] py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Spiel starten</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div
            data-ui-id="SPECIAL.GAME_DARTSGOLF.CARD"
            className="group relative overflow-hidden rounded-3xl border border-emerald-500/35 bg-gradient-to-br from-slate-900/95 via-emerald-950/30 to-slate-900/95 p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-2xl shadow-emerald-950/30 hover:border-emerald-400/55 transition-all"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    ⛳
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        18 Holes · Par 72
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
                        1 vs. Computer &amp; 1 vs. 1
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Lions Darts-Golf (18 Holes)
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                18 Bahnen mit zufällig generierten Loch-Entfernungen (55–300 m). Gib die geworfene
                Gesamtzahl (0–180) klassisch am 0–9 Eingabepad ein – der Rest erfolgt im Kopf! Wirfst
                du zu weit (z. B. 25 m Rest und 60 m), fliegt der Ball übers Loch auf 35 m Rest!
              </p>

              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  ⛳ 18 Löcher (55–300 m)
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  ⌨️ Klassisches 0–180 Numpad
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  🤖 4 Golf-Bots &amp; 1vs1
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <Link
                href={`/special/dartsgolf?board=${activeBoard}`}
                data-ui-id="SPECIAL.GAME_DARTSGOLF.START_BTN"
                className="w-full min-h-[56px] py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Golfrunde starten</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div
            data-ui-id="SPECIAL.GAME_DARTSRALLY.CARD"
            className="group relative overflow-hidden rounded-3xl border border-rose-500/35 bg-gradient-to-br from-slate-900/95 via-rose-950/30 to-slate-900/95 p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-2xl shadow-rose-950/30 hover:border-rose-400/55 transition-all"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/35 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    🏎️
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        1000-Punkte-Staffel
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
                        Team vs. Team &amp; Live Sync
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Darts Rally
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Highspeed-Team-Eilrennen über 750, 1.000 oder 1.500 Punkte mit Spitzenbruch, Darttausch,
                Ausgebremst, Reifenplatzer, Turbo und Schild! Wurf abdrücken, nächsten Läufer abklatschen.
              </p>

              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  🏁 1000 Pkt Staffel
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  ⚡ 6 Echtzeit-Items
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
                  📡 Board vs. Board Sync
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <Link
                href={`/special/dartsrally?board=${activeBoard}`}
                data-ui-id="SPECIAL.GAME_DARTSRALLY.START_BTN"
                className="w-full min-h-[56px] py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-500 to-red-600 hover:from-rose-400 hover:to-amber-400 text-white font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-rose-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Rallye starten</span>
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
