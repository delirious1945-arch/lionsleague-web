'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserSession, logoutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import DynamicRankingTileContent from './DynamicRankingTileContent';

interface ModeSelectionHubProps {
  user: UserSession;
}

export default function ModeSelectionHub({ user }: ModeSelectionHubProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.refresh();
  };

  return (
    <div className="relative min-h-[calc(100dvh-2rem)] flex flex-col justify-center items-center py-2 sm:py-4 w-full select-none">
      
      {/* Minimalistischer Logout-Button dezent in der oberen rechten Ecke */}
      <div className="absolute top-0 right-0 z-20">
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-800/80 hover:border-red-500/40 text-xs font-medium transition-all backdrop-blur-sm cursor-pointer"
          title={`Abmelden (${user.name})`}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Abmelden</span>
        </button>
      </div>

      {/* 3 Kacheln: Ranking, Training & Einstellungen - Vollständig responsive auf Handy-, Tablet- & Desktop-Größe optimiert */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 my-auto">
        
        {/* Kachel 1: Ranking-System */}
        <Link
          href="/?mode=ranking"
          className="group relative flex flex-col justify-end h-[38dvh] sm:h-[480px] rounded-3xl overflow-hidden border-2 border-amber-500/30 hover:border-amber-400 shadow-2xl hover:shadow-[0_0_35px_rgba(245,158,11,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          {/* Hintergrundbild */}
          <Image
            src="/ranking-banner.jpg"
            alt="Ranking-System"
            fill
            priority
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Dunkler Gradient-Overlay für beste Lesbarkeit */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Dynamisches Lions-Weyhausen Leaderboard mit echten Spielerfotos & Namen */}
          <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-10">
            <DynamicRankingTileContent />
          </div>

          {/* Nur der Hauptname */}
          <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wide group-hover:text-amber-400 transition-colors drop-shadow-md">
              Ranking-System
            </h2>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 border border-amber-400/30 flex items-center justify-center font-black text-lg transition-all shrink-0 ml-3">
              →
            </div>
          </div>
        </Link>

        {/* Kachel 2: Trainingsmodus */}
        <Link
          href="/training"
          className="group relative flex flex-col justify-end h-[38dvh] sm:h-[480px] rounded-3xl overflow-hidden border-2 border-cyan-500/30 hover:border-cyan-400 shadow-2xl hover:shadow-[0_0_35px_rgba(0,212,255,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          {/* Hintergrundbild */}
          <Image
            src="/training-banner.jpg"
            alt="Trainingsmodus"
            fill
            priority
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Dunkler Gradient-Overlay für beste Lesbarkeit */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

          {/* Nur der Hauptname */}
          <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wide group-hover:text-cyan-400 transition-colors drop-shadow-md">
              Trainingsmodus
            </h2>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 border border-cyan-400/30 flex items-center justify-center font-black text-lg transition-all shrink-0 ml-3">
              →
            </div>
          </div>
        </Link>

        {/* Kachel 3: Einstellungen (Hell/Dunkel, Monitor-Spiegelung, Schnellwechsel) */}
        <Link
          href="/einstellungen"
          className="group relative flex flex-col justify-between h-[38dvh] sm:h-[480px] rounded-3xl overflow-hidden border-2 border-purple-500/30 hover:border-purple-400 bg-gradient-to-br from-[#121c33] via-[#091224] to-[#050811] shadow-2xl hover:shadow-[0_0_35px_rgba(168,85,247,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer p-6 sm:p-7"
        >
          {/* Dekorative Icons im Hintergrund */}
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-44 h-44 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

          {/* Oberer Bereich mit Features */}
          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-[11px] font-black text-purple-300 uppercase tracking-wider">
                <span>Personalisiert</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Design (Hell- & Dunkelmodus), Monitor-Spiegelung im Querformat für externe Bildschirme und Direktwechsel zwischen Ranking & Training.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-[11px] font-bold text-slate-300">
                ☀️/🌙 Hell & Dunkel
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-[11px] font-bold text-slate-300">
                📺 Zweit-Monitor (Querformat)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-[11px] font-bold text-slate-300">
                🔄 Ranking ↔ Training
              </span>
            </div>
          </div>

          {/* Unterer Titel-Bereich */}
          <div className="relative z-10 pt-4 flex items-center justify-between border-t border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wide group-hover:text-purple-400 transition-colors drop-shadow-md">
              Einstellungen
            </h2>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/20 group-hover:bg-purple-500 text-purple-300 group-hover:text-slate-950 border border-purple-400/30 flex items-center justify-center font-black text-lg transition-all shrink-0 ml-3">
              →
            </div>
          </div>
        </Link>

      </div>

    </div>
  );
}
