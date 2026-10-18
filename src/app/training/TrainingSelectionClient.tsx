'use client';

import React from 'react';
import Link from 'next/link';
import { UserSession } from '@/app/actions';
import {
  CheckCircle2,
  ArrowRight,
  Clock,
  FileSpreadsheet,
  FileText,
  ArrowLeft,
  Trophy,
  Target,
  Award,
  Sparkles,
  Tv,
} from 'lucide-react';

interface TrainingSelectionClientProps {
  user: UserSession;
}

export default function TrainingSelectionClient({ user }: TrainingSelectionClientProps) {
  return (
    <div className="min-h-[85vh] py-4 sm:py-8 space-y-6 max-w-6xl mx-auto px-2 sm:px-4 animate-fadeIn">
      {/* Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zurück zur Auswahl</span>
          </Link>

          <div>
            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
              Lions Trainingsmodus
            </span>
            <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>🎯</span> Trainingsspiele & Wurf-Tools
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Link
            href="/?mode=ranking"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all shadow-sm"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Zum Ranking-System</span>
          </Link>
        </div>
      </div>

      {/* Intro Banner */}
      <div className="text-center sm:text-left space-y-1 px-1">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Wähle deine Trainings-Disziplin
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Gezieltes Einzeltraining oder 1-gegen-1 Duelle für maximale Board-Präzision & offizielle Leistungsabzeichen.
        </p>
      </div>

      {/* Grid of Active Training Games */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spiel 1: Vereinsmeisterschaft Checkout Battle (Doppelquote) */}
        <div className="relative bg-gradient-to-b from-[#0b162c] via-[#09142b] to-[#060e1f] border-2 border-cyan-500/50 hover:border-cyan-400 rounded-3xl p-6 sm:p-7 shadow-2xl transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SOFORT SPIELBAR
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                10 Runden à 3 Darts
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(0,212,255,0.3)]">
                  🎯
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Checkout Battle (Doppelquote)
                  </h3>
                  <p className="text-xs text-cyan-300 font-semibold">
                    Offizieller SC Weyhausen Trainings-Klassiker
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                Trainiere systematisch die fünf wichtigsten Doppel-Felder im Ligaspiel: D20, D10, D16, D8 und D4. Jedes Feld wird 10 Runden (30 Darts) angeworfen. Treffer werden in Echtzeit berechnet und gespeichert.
              </p>
            </div>

            {/* Feature-Liste */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Solo & 1vs1-Duell am Board</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Synthesizer Audio & Ansager</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Echtzeit Doppelquoten-Analyse</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>TV Live-Board fürs Vereinsheim</span>
              </div>
            </div>

            {/* Download Vorlagen */}
            <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-400 font-semibold mr-1">A4 Vorlagen:</span>
              <a
                href="/Darts_Doppelquote_Trainingsblatt_A4.pdf"
                download
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <FileText className="w-3 h-3 text-red-400" />
                <span>PDF Download</span>
              </a>
              <a
                href="/Darts_Doppelquote_Trainingsblatt_A4.xlsx"
                download
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                <span>Excel Download</span>
              </a>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              5 Ziel-Doppel · 150 Darts
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/doppelquote/live"
                target="_blank"
                className="flex-1 sm:flex-initial px-3.5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                title="Live-Ranking für TV im Vereinsheim"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV Board</span>
              </Link>
              <Link
                href="/doppelquote"
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>🎯 Spiel starten</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Spiel 2: PDC Challenge (57 Darts Leistungsabzeichen) */}
        <div className="relative bg-gradient-to-b from-[#191508] via-[#120f06] to-[#090703] border-2 border-amber-500/60 hover:border-amber-400 rounded-3xl p-6 sm:p-7 shadow-2xl transition-all flex flex-col justify-between">
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
                  <p className="text-xs text-amber-300 font-semibold">
                    Offizielles 57-Darts Leistungsabzeichen (JDC)
                  </p>
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
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-900 border border-white">Weiß</span>
              <span className="px-2 py-0.5 rounded bg-purple-600 text-white">Lila</span>
              <span className="px-2 py-0.5 rounded bg-yellow-500 text-slate-950">Gelb</span>
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white">Grün</span>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white">Blau</span>
              <span className="px-2 py-0.5 rounded bg-red-600 text-white">Rot</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white border border-slate-600">Schwarz</span>
              <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950">Gold</span>
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
                className="flex-1 sm:flex-initial px-3.5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                title="Live-Ranking für TV im Vereinsheim"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV Board</span>
              </Link>
              <Link
                href="/training/pdc-challenge"
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>🏆 Challenge starten</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Upcoming Games */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* 121 Checkout */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                <Clock className="w-3 h-3" /> DEMNÄCHST
              </span>
              <span className="text-[11px] font-mono text-slate-500">6–9 Darts</span>
            </div>
            <h4 className="text-base font-black text-slate-200">
              🎯 121 Checkout-Trainer
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trainiere High-Finishes von 121 bis 170. Checkst du innerhalb von 9 Darts, geht es eine Stufe höher.
            </p>
          </div>
        </div>

        {/* 100 Darts at 20 */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                <Clock className="w-3 h-3" /> DEMNÄCHST
              </span>
              <span className="text-[11px] font-mono text-slate-500">100 Darts</span>
            </div>
            <h4 className="text-base font-black text-slate-200">
              🎯 100 Darts at 20 (Scoring)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Perfektioniere deine Gruppierung und Scoring-Konstanz auf das 20er Segment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
