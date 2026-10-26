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
  Target,
  Award,
  Sparkles,
  Tv,
  Trophy,
  Beer,
  Gift,
  Clock,
  Bot,
} from 'lucide-react';
import { PDC_BADGES_LIST } from './pdc-challenge/types';
import { PlayerMonthProgress, LotteryWinner } from '@/lib/trainingLottery';

interface TrainingSelectionClientProps {
  user: UserSession;
  monthProgress?: PlayerMonthProgress | null;
  bannerWinner?: LotteryWinner | null;
}

export default function TrainingSelectionClient({
  user,
  monthProgress,
  bannerWinner,
}: TrainingSelectionClientProps) {
  const completed = monthProgress?.completedGames ?? 0;
  const target = monthProgress?.targetGames ?? 20;
  const pct = Math.min(100, Math.round((completed / target) * 100));

  return (
    <div className="min-h-[85vh] py-4 sm:py-8 space-y-6 max-w-6xl mx-auto px-2 sm:px-4 animate-fadeIn">
      {/* Navigation Top Bar */}
      <div
        data-ui-id="TRAINING.NAV.BAR"
        className="flex items-center justify-between gap-3 bg-slate-900/80 border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl"
      >
        <Link
          href="/"
          data-ui-id="TRAINING.NAV.BACK_BTN"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zurück zur Startseite</span>
        </Link>
      </div>

      {/* Monatsverlosung-Fortschrittskarte (20 Spiele für 5 Freigetränke) */}
      {monthProgress && (
        <div
          data-ui-id="TRAINING.LOTTERY.PROGRESS_CARD"
          className="relative overflow-hidden bg-gradient-to-r from-zinc-900 via-slate-900 to-zinc-900 border-2 border-amber-500/40 hover:border-amber-400 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-md text-xl">
                🍻
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Monatsverlosung: 5 Freigetränke
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">
                    {monthProgress.monthLabel}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                  Trainingsfleiß zahlt sich aus: 20 Spiele = 1 Los im Topf!
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Noch {monthProgress.daysRemainingInMonth} Tage im {monthProgress.monthLabel}</span>
            </div>
          </div>

          {/* Fortschrittsbalken */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-bold text-zinc-300">
                Dein persönlicher Fortschritt ({user.name}):
              </span>
              <span className="font-black font-mono text-amber-400 text-sm sm:text-base">
                {completed} / {target} Spiele ({pct}%)
              </span>
            </div>

            <div className="w-full h-3.5 sm:h-4 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  monthProgress.isQualified
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Status-Hinweise */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs pt-1">
            {monthProgress.isBlockedByPastWin ? (
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                ℹ️ Gewinnersperre aktiv (du hast in den letzten 4 Monaten gewonnen und setzt diesen Monat aus)
              </span>
            ) : monthProgress.isQualified ? (
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Lostopf freigeschaltet! Du bist bei der Auslosung am 1. dabei! 🎯</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                Noch <strong className="text-white">{monthProgress.remainingGames} abgeschlossene Spiele</strong> bis zur Teilnahme
              </span>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-zinc-400">
                Aktuell <strong className="text-white">{monthProgress.eligiblePlayersCount} Spieler</strong> im Lostopf • Auslosung am 1. nach Zufallsprinzip
              </span>

              {user.role === 'admin' && (
                <Link
                  href="/verwaltung?tab=training"
                  data-ui-id="TRAINING.LOTTERY.ADMIN_LINK"
                  className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] flex items-center gap-1.5 transition-all"
                >
                  <span>👑 Admin: Alle Spieler ansehen</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Intro Banner & TV-Board Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1" data-ui-id="TRAINING.HEADER.TITLE">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Wähle deine Trainings-Disziplin
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Gezieltes Einzeltraining oder 1-gegen-1 Duelle für maximale Board-Präzision & offizielle Leistungsabzeichen.
          </p>
        </div>

        <Link
          href="/training/live"
          target="_blank"
          data-ui-id="TRAINING.HEADER.TV_BOARD_BTN"
          className="self-center sm:self-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border-2 border-amber-500/50 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Tv className="w-4 h-4 text-amber-400" />
          <span>📺 Vereinsheim TV-Board</span>
        </Link>
      </div>

      {/* Grid of Active Training Games */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-ui-id="TRAINING.GAMES.GRID">
        {/* Spiel 1: Checkout Battle (Doppelquote) */}
        <div
          data-ui-id="TRAINING.GAME_CHECKOUT.CARD"
          className="relative bg-zinc-900 border-2 border-zinc-700/80 hover:border-amber-400/80 rounded-3xl p-6 sm:p-7 shadow-2xl transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                SOFORT SPIELBAR
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg">
                10 Runden à 3 Darts
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">
                  🎯
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Checkout Battle (Doppelquote)
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 mt-3 leading-relaxed">
                Trainiere systematisch die fünf wichtigsten Doppel-Felder im Ligaspiel: D20, D10, D16, D8 und D4. Jedes Feld wird 10 Runden (30 Darts) angeworfen. Treffer werden in Echtzeit berechnet und gespeichert.
              </p>
            </div>

            {/* Feature-Liste */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-zinc-300">
              <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Solo & 1vs1-Duell am Board</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Synthesizer Audio & Ansager</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Echtzeit Doppelquoten-Analyse</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>TV Live-Board fürs Vereinsheim</span>
              </div>
            </div>

            {/* Download Vorlagen */}
            <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-zinc-400 font-semibold mr-1">A4 Vorlagen:</span>
              <a
                href="/Darts_Doppelquote_Trainingsblatt_A4.pdf"
                download
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
              >
                <FileText className="w-3 h-3 text-zinc-300" />
                <span>PDF Download</span>
              </a>
              <a
                href="/Darts_Doppelquote_Trainingsblatt_A4.xlsx"
                download
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
              >
                <FileSpreadsheet className="w-3 h-3 text-amber-400" />
                <span>Excel Download</span>
              </a>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-zinc-400 font-mono">
              5 Ziel-Doppel · 150 Darts
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/training/live?view=doppelquote"
                target="_blank"
                data-ui-id="TRAINING.GAME_CHECKOUT.TV_BTN"
                className="flex-1 sm:flex-initial px-3.5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                title="Live-Ranking für TV im Vereinsheim"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV Board</span>
              </Link>
              <Link
                href="/doppelquote"
                data-ui-id="TRAINING.GAME_CHECKOUT.START_BTN"
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>🎯 Spiel starten</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Spiel 2: PDC Challenge (57 Darts Leistungsabzeichen) */}
        <div
          data-ui-id="TRAINING.GAME_PDC.CARD"
          className="relative bg-gradient-to-b from-[#191508] via-[#120f06] to-[#090703] border-2 border-amber-500/60 hover:border-amber-400 rounded-3xl p-6 sm:p-7 shadow-2xl transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                NEU & SOFORT SPIELBAR
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                57 Darts Challenge
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  🏆
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    PDC Challenge Routine
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                Das renommierte Qualifikations- und Trainingsformat der Profis: 3 Sektionen inklusive Shanghai 10–15, Doppel-Runde D1–D20 + Bullseye und Shanghai 15–20. Erringe dein persönliches Leistungsabzeichen von Weiß bis Gold!
              </p>
            </div>

            {/* Feature-Liste PDC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>8 Leistungsstufen (Weiß bis Gold)</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Shanghai-Erkennung & +100 Bonus</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Doppel-Runde D1–D20 + Bull</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Eigenes TV Live-Leaderboard</span>
              </div>
            </div>

            {/* Badges Preview Pill Bar */}
            <div className="pt-1 flex items-center gap-1.5 overflow-x-auto text-[10px] font-black">
              {PDC_BADGES_LIST.slice().reverse().map((b) => (
                <span
                  key={b.name}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 shrink-0 ${b.badgeClass}`}
                  title={`${b.name}: ${b.title} (${b.min}${b.max >= 9000 ? '+' : `–${b.max}`} Pkt)`}
                >
                  <span>{b.icon}</span>
                  <span>{b.name}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              3 Sektionen · 57 Darts
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/training/live?view=pdc"
                target="_blank"
                data-ui-id="TRAINING.GAME_PDC.TV_BTN"
                className="flex-1 sm:flex-initial px-3.5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                title="Live-Ranking für TV im Vereinsheim"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV Board</span>
              </Link>
              <Link
                href="/training/pdc-challenge"
                data-ui-id="TRAINING.GAME_PDC.START_BTN"
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>🏆 Challenge starten</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Spiel 3: Fußball (Soccer Darts) */}
        <div
          data-ui-id="TRAINING.GAME_FUSSBALL.CARD"
          className="relative bg-gradient-to-b from-[#0c1f15] via-[#09150e] to-[#050c08] border-2 border-emerald-500/60 hover:border-emerald-400 rounded-3xl p-6 sm:p-7 shadow-2xl transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                NEU & SOFORT SPIELBAR
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                1vs1 & vs. Computer
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  ⚽
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Fußball (Soccer Darts)
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                Erobere den Ball über Bullseye oder Single Bull! Wer in Ballbesitz ist, schießt auf beliebige Doppel – jeder Treffer ist ein Tor. Spiele 1-gegen-1 oder gegen 5 anspruchsvolle KI-Stufen (Kreisliga bis PDC Pro).
              </p>
            </div>

            {/* Feature-Liste Fußball */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Ballbesitz über Bull & Bullseye</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Jedes Doppel zählt als Tor</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <Bot className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Computer mit 5 Stärken</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Stadion-Sounds & Pfiffe</span>
              </div>
            </div>

            {/* Schwierigkeiten Pill Bar */}
            <div className="pt-1 flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold text-emerald-200">
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/60">Kreisliga</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/60">Bezirksliga</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/60">Landesliga</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/60">Bundesliga</span>
              <span className="px-2 py-0.5 rounded bg-emerald-900/80 border border-emerald-500 font-black text-emerald-300">PDC Pro</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Freie Tor-Anzahl (z.B. 5 Tore)
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/training/live?view=fussball"
                target="_blank"
                data-ui-id="TRAINING.GAME_FUSSBALL.TV_BTN"
                className="flex-1 sm:flex-initial px-3.5 py-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                title="1vs1 TV-Board im Vereinsheim"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV Board</span>
              </Link>
              <Link
                href="/training/fussball"
                data-ui-id="TRAINING.GAME_FUSSBALL.START_BTN"
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>⚽ Match anpfeifen</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
