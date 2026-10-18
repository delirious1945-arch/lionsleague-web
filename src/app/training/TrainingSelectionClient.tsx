'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserSession } from '@/app/actions';
import { CheckCircle2, ArrowRight, Clock, Sparkles, FileSpreadsheet, FileText, ArrowLeft, Trophy, Target } from 'lucide-react';

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
          Gezieltes Einzeltraining oder 1-gegen-1 Duelle für maximale Board-Präzision.
        </p>
      </div>

      {/* Grid of Training Games */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Spiel 1: Doppelquoten-Training (AKTIV) */}
        <div className="lg:col-span-2 relative bg-gradient-to-b from-[#0b162c] via-[#09142b] to-[#060e1f] border-2 border-cyan-500/50 hover:border-cyan-400 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all flex flex-col justify-between">
          
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SOFORT SPIELBAR
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                10 Aufnahmen à 3 Darts
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(0,212,255,0.3)]">
                  🎯
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Doppelquoten-Training
                  </h3>
                  <p className="text-xs text-cyan-300 font-semibold">
                    Offizieller SC Weyhausen Trainings-Klassiker
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-300 mt-4 leading-relaxed">
                Trainiere systematisch die fünf wichtigsten Doppel-Felder im Ligaspiel: 
                <span className="font-bold text-cyan-300"> D20, D10, D16, D8 und D4</span>. 
                Jedes Feld wird 2-mal angeworfen (10 Runden = 30 Darts). Treffer werden in Echtzeit berechnet und gespeichert.
              </p>
            </div>

            {/* Detaillierte Feature-Liste wie vom User gewünscht */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Solo-Modus & 1vs1-Duell am Board</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Synthesizer Audio & Ansager-Sound</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Echtzeit Trefferquote & Leg-Historie</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Auto-Speicherung in Spielerprofil</span>
              </div>
            </div>

            {/* Download Downloads */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold mr-1">Trainingsblätter A4:</span>
              <a
                href="/Darts_Doppelquote_Trainingsblatt_A4.pdf"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span>PDF Download</span>
              </a>
              <a
                href="/Darts_Doppelquote_Trainingsblatt_A4.xlsx"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel Download</span>
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Bereit für deine nächste Aufnahme?
            </span>
            <Link
              href="/doppelquote"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,212,255,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>🎯 Doppelquote-Spiel starten</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Spiel 2 & 3: Demnächst verfügbar */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* 121 Checkout */}
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> DEMNÄCHST
                </span>
                <span className="text-[11px] font-mono text-slate-500">6–9 Darts</span>
              </div>
              <h4 className="text-lg font-black text-slate-200">
                🎯 121 Checkout-Trainer
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trainiere High-Finishes von 121 bis 170. Checkst du innerhalb von 9 Darts, geht es eine Stufe höher.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-500 italic">
              Folgt im nächsten Trainings-Update.
            </div>
          </div>

          {/* 100 Darts at 20 */}
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> DEMNÄCHST
                </span>
                <span className="text-[11px] font-mono text-slate-500">100 Darts</span>
              </div>
              <h4 className="text-lg font-black text-slate-200">
                🎯 100 Darts at 20 (Scoring)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Perfektioniere deine Gruppierung und Scoring-Konstanz auf das 20er Segment.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-500 italic">
              Folgt im nächsten Trainings-Update.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
