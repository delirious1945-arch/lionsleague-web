'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserSession, logoutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

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

      {/* Exakt 2 Kacheln: Vollständig auf Handy- & Desktop-Größe optimiert */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 my-auto">
        
        {/* Kachel 1: Ranking-System */}
        <Link
          href="/?mode=ranking"
          className="group relative flex flex-col justify-end h-[42dvh] sm:h-[480px] rounded-3xl overflow-hidden border-2 border-amber-500/30 hover:border-amber-400 shadow-2xl hover:shadow-[0_0_35px_rgba(245,158,11,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

          {/* Nur der Hauptname */}
          <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wide group-hover:text-amber-400 transition-colors drop-shadow-md">
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
          className="group relative flex flex-col justify-end h-[42dvh] sm:h-[480px] rounded-3xl overflow-hidden border-2 border-cyan-500/30 hover:border-cyan-400 shadow-2xl hover:shadow-[0_0_35px_rgba(0,212,255,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wide group-hover:text-cyan-400 transition-colors drop-shadow-md">
              Trainingsmodus
            </h2>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 border border-cyan-400/30 flex items-center justify-center font-black text-lg transition-all shrink-0 ml-3">
              →
            </div>
          </div>
        </Link>

      </div>

    </div>
  );
}
