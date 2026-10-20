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
} from 'lucide-react';
import { PDC_BADGES_LIST } from './pdc-challenge/types';

interface TrainingSelectionClientProps {
  user: UserSession;
}

export default function TrainingSelectionClient({ user }: TrainingSelectionClientProps) {
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

      {/* Intro Banner */}
      <div className="text-center sm:text-left space-y-1 px-1" data-ui-id="TRAINING.HEADER.TITLE">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Wähle deine Trainings-Disziplin
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Gezieltes Einzeltraining oder 1-gegen-1 Duelle für maximale Board-Präzision & offizielle Leistungsabzeichen.
        </p>
      </div>

      {/* Grid of Active Training Games */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-ui-id="TRAINING.GAMES.GRID">
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
                href="/doppelquote/live"
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
                href="/training/pdc-challenge/live"
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
      </div>
    </div>
  );
}
