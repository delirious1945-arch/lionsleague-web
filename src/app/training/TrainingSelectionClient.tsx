'use client';

import React from 'react';
import Link from 'next/link';
import { UserSession } from '@/app/actions';
import {
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  ArrowLeft,
  Tv,
} from 'lucide-react';
import { PlayerMonthProgress, LotteryWinner } from '@/lib/trainingLottery';

interface TrainingSelectionClientProps {
  user: UserSession;
  monthProgress?: PlayerMonthProgress | null;
  bannerWinner?: LotteryWinner | null;
}

export default function TrainingSelectionClient({
  user,
  monthProgress,
}: TrainingSelectionClientProps) {
  const completed = monthProgress?.completedGames ?? 0;
  const target = monthProgress?.targetGames ?? 20;
  const pct = Math.min(100, Math.round((completed / target) * 100));

  return (
    <div className="relative min-h-[85vh] py-4 sm:py-7 max-w-6xl mx-auto px-3 sm:px-5 animate-fadeIn">
      {/* Dezente Hintergrund-Lichtquellen für echten Glassmorphism-Tiefeneffekt */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[12%] left-[18%] w-96 h-96 rounded-full bg-amber-500/[0.06] blur-[130px]" />
        <div className="absolute bottom-[15%] right-[15%] w-[28rem] h-[28rem] rounded-full bg-slate-400/[0.05] blur-[140px]" />
        <div className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[36rem] h-64 rounded-full bg-amber-400/[0.04] blur-[150px]" />
      </div>

      <div className="space-y-5">
        {/* 1. Kompakte, elegante Top-Leiste */}
        <div
          data-ui-id="TRAINING.NAV.BAR"
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center gap-3.5" data-ui-id="TRAINING.HEADER.TITLE">
            <Link
              href="/"
              data-ui-id="TRAINING.NAV.BACK_BTN"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] text-xs font-semibold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Startseite</span>
            </Link>

            <div className="h-5 w-px bg-white/10 hidden sm:block" />

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Trainings-Arena
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {user.role === 'admin' && (
              <Link
                href="/verwaltung?tab=training"
                data-ui-id="TRAINING.LOTTERY.ADMIN_LINK"
                className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.12] font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <span>👑 Admin-Übersicht</span>
              </Link>
            )}

            <Link
              href="/training/live"
              data-ui-id="TRAINING.HEADER.TV_BOARD_BTN"
              className="px-4 py-2 rounded-xl bg-amber-400/[0.08] hover:bg-amber-400/[0.16] text-amber-200 border border-amber-400/40 font-bold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(251,191,36,0.2)] transition-all cursor-pointer"
            >
              <Tv className="w-4 h-4 text-amber-300" />
              <span>Vereinsheim TV-Board</span>
            </Link>
          </div>
        </div>

        {/* 2. Schlanker Monatsverlosungs-Banner (Glassmorphism) */}
        {monthProgress && (
          <div
            data-ui-id="TRAINING.LOTTERY.PROGRESS_CARD"
            className="rounded-2xl px-5 py-4 bg-white/[0.035] backdrop-blur-xl border border-amber-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_16px_40px_rgba(0,0,0,0.45)] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">🍻</span>
                <span className="text-sm sm:text-base font-black text-white">
                  Monatsverlosung (5 Freigetränke)
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-slate-300 font-medium">
                  {monthProgress.monthLabel}
                </span>
              </div>

              <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                {monthProgress.isBlockedByPastWin ? (
                  <span className="text-purple-300 font-medium">
                    ℹ️ Gewinnersperre aktiv (4-Monats-Regel)
                  </span>
                ) : monthProgress.isQualified ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Im Lostopf für die Auslosung am 1. dabei!</span>
                  </span>
                ) : (
                  <span>
                    Noch <strong className="text-amber-300">{monthProgress.remainingGames} Spiele</strong> bis zur Teilnahme
                  </span>
                )}
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">
                  {monthProgress.eligiblePlayersCount} Spieler qualifiziert
                </span>
              </div>
            </div>

            <div className="w-full lg:w-80 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-300 font-bold">
                  {completed} / {target} Spiele ({pct}%)
                </span>
                <span className="text-slate-400">
                  Noch {monthProgress.daysRemainingInMonth} Tage
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/50 rounded-full border border-white/10 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. 2x2 Grid der 4 Trainings-Disziplinen (Einheitlicher, edler Glassmorphism-Stil) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-ui-id="TRAINING.GAMES.GRID">
          {/* SPIEL 1: Checkout Battle (Doppelquote) */}
          <div
            data-ui-id="TRAINING.GAME_CHECKOUT.CARD"
            className="group relative rounded-3xl p-6 bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-2xl border border-white/[0.09] hover:border-amber-400/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Checkout Battle (Doppelquote)
                </h2>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/[0.08] border border-amber-400/30 text-amber-200 font-mono font-bold text-[11px]">
                  150 Darts · Solo & 1vs1
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Trainiere systematisch die fünf wichtigsten Doppel-Felder im Ligaspiel: D20, D10, D16, D8 und D4. Jedes Feld wird 10 Runden (30 Darts) angeworfen. Treffer werden in Echtzeit berechnet und gespeichert.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 font-mono font-semibold">
                  D20 · D10 · D16 · D8 · D4
                </span>
                <a
                  href="/Darts_Doppelquote_Trainingsblatt_A4.pdf"
                  download
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 transition-colors"
                >
                  <FileText className="w-3 h-3 text-amber-300" />
                  <span>PDF Vorlage</span>
                </a>
                <a
                  href="/Darts_Doppelquote_Trainingsblatt_A4.xlsx"
                  download
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 transition-colors"
                >
                  <FileSpreadsheet className="w-3 h-3 text-amber-300" />
                  <span>Excel Vorlage</span>
                </a>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <Link
                href="/training/live?view=doppelquote"
                data-ui-id="TRAINING.GAME_CHECKOUT.TV_BTN"
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                title="Live-Ranking für TV im Vereinsheim"
              >
                <Tv className="w-3.5 h-3.5 text-amber-300" />
                <span>TV Board</span>
              </Link>

              <Link
                href="/doppelquote"
                data-ui-id="TRAINING.GAME_CHECKOUT.START_BTN"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Spiel starten</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* SPIEL 2: PDC Challenge Routine */}
          <div
            data-ui-id="TRAINING.GAME_PDC.CARD"
            className="group relative rounded-3xl p-6 bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-2xl border border-white/[0.09] hover:border-amber-400/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  PDC Challenge Routine
                </h2>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/[0.08] border border-amber-400/30 text-amber-200 font-mono font-bold text-[11px]">
                  57 Darts · Solo & 1vs1
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Das renommierte Qualifikations- und Trainingsformat der Profis: 3 Sektionen inklusive Shanghai 10–15, Doppel-Runde D1–D20 + Bullseye und Shanghai 15–20. Erringe dein persönliches Leistungsabzeichen von Weiß bis Gold!
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 font-semibold">
                  8 Leistungsstufen (Weiß bis Gold)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 font-semibold">
                  +100 Shanghai-Bonus
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <Link
                href="/training/live?view=pdc"
                data-ui-id="TRAINING.GAME_PDC.TV_BTN"
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                title="Live-Ranking für TV im Vereinsheim"
              >
                <Tv className="w-3.5 h-3.5 text-amber-300" />
                <span>TV Board</span>
              </Link>

              <Link
                href="/training/pdc-challenge"
                data-ui-id="TRAINING.GAME_PDC.START_BTN"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Spiel starten</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* SPIEL 3: Fußball (Soccer Darts) */}
          <div
            data-ui-id="TRAINING.GAME_FUSSBALL.CARD"
            className="group relative rounded-3xl p-6 bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-2xl border border-white/[0.09] hover:border-amber-400/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Fußball (Soccer Darts)
                </h2>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/[0.08] border border-amber-400/30 text-amber-200 font-mono font-bold text-[11px]">
                  Freie Tore · 1vs1 & Computer
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Erobere den Ball über Bullseye oder Single Bull! Wer in Ballbesitz ist, schießt auf beliebige Doppel – jeder Treffer ist ein Tor. Spiele 1-gegen-1 oder gegen 5 anspruchsvolle KI-Stufen (Kreisliga bis PDC Pro).
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 font-semibold">
                  Kreisliga · Bezirksliga · Landesliga · Bundesliga · PDC Pro
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <Link
                href="/training/live?view=fussball"
                data-ui-id="TRAINING.GAME_FUSSBALL.TV_BTN"
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                title="1vs1 TV-Board im Vereinsheim"
              >
                <Tv className="w-3.5 h-3.5 text-amber-300" />
                <span>TV Board</span>
              </Link>

              <Link
                href="/training/fussball"
                data-ui-id="TRAINING.GAME_FUSSBALL.START_BTN"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Spiel starten</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* SPIEL 4: Stellen & Checken (3–101) */}
          <div
            data-ui-id="TRAINING.GAME_STELLEN_CHECKEN.CARD"
            className="group relative rounded-3xl p-6 bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-2xl border border-white/[0.09] hover:border-amber-400/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.55)] transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Stellen & Checken (3–101)
                </h2>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/[0.08] border border-amber-400/30 text-amber-200 font-mono font-bold text-[11px]">
                  15 Aufnahmen · Solo & 1vs1
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Du hast pro Zielzahl genau eine Aufnahme (3 Darts) Zeit: Stelle dir mit 1–2 Darts dein Doppel und checke! 200 fest hinterlegte Zufalls-Sequenzen (#001–#200) sorgen für 100 % faire Vergleiche im Solo oder 1vs1.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-200 font-semibold">
                  3–60: +1 Punkt · 61–80: +2 Punkte · 81–101: +3 Punkte
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <Link
                href="/training/live?view=stellen_checken"
                data-ui-id="TRAINING.GAME_STELLEN_CHECKEN.TV_BTN"
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                title="Stellen & Checken TV-Board im Vereinsheim"
              >
                <Tv className="w-3.5 h-3.5 text-amber-300" />
                <span>TV Board</span>
              </Link>

              <Link
                href="/training/stellen-checken"
                data-ui-id="TRAINING.GAME_STELLEN_CHECKEN.START_BTN"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Spiel starten</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
