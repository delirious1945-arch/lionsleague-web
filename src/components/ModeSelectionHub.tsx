'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserSession, logoutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, SunMoon } from 'lucide-react';
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
    <div className="relative min-h-[calc(100dvh-2.5rem)] w-full flex flex-col justify-between gap-3 sm:gap-5 py-1 sm:py-2 select-none">
      
      {/* Obere Leiste mit dezentem Logout-Button */}
      <div className="flex items-center justify-between w-full px-1">
        <div className="text-xs font-bold text-slate-400">
          Angemeldet: <span className="text-white font-black">{user.name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-500/40 text-xs font-semibold transition-all cursor-pointer backdrop-blur-sm"
          title={`Abmelden (${user.name})`}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Abmelden</span>
        </button>
      </div>

      {/* Haupt-Bereich: Ranking-System & Trainingsmodus nebeneinander auf voller Bildschirmbreite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 flex-1 min-h-[380px] sm:min-h-[460px] lg:min-h-[500px]">
        
        {/* Kachel 1: Ranking-System */}
        <Link
          href="/?mode=ranking"
          className="group relative flex flex-col justify-end w-full h-full min-h-[220px] rounded-3xl overflow-hidden border-2 border-amber-500/30 hover:border-amber-400 shadow-2xl hover:shadow-[0_0_35px_rgba(245,158,11,0.35)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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

          {/* Titel & Pfeil */}
          <div className="relative z-10 p-4 sm:p-7 flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs uppercase font-black tracking-widest text-amber-400 block mb-0.5">
                Wettkampf & Liga
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-wide group-hover:text-amber-400 transition-colors drop-shadow-md">
                Ranking-System
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 border border-amber-400/30 flex items-center justify-center font-black text-lg sm:text-2xl transition-all shrink-0 ml-3 shadow-lg">
              →
            </div>
          </div>
        </Link>

        {/* Kachel 2: Trainingsmodus */}
        <Link
          href="/training"
          className="group relative flex flex-col justify-end w-full h-full min-h-[220px] rounded-3xl overflow-hidden border-2 border-cyan-500/30 hover:border-cyan-400 shadow-2xl hover:shadow-[0_0_35px_rgba(0,212,255,0.35)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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

          {/* Titel & Pfeil */}
          <div className="relative z-10 p-4 sm:p-7 flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs uppercase font-black tracking-widest text-cyan-400 block mb-0.5">
                Training & Wurf-Tools
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-wide group-hover:text-cyan-400 transition-colors drop-shadow-md">
                Trainingsmodus
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 border border-cyan-400/30 flex items-center justify-center font-black text-lg sm:text-2xl transition-all shrink-0 ml-3 shadow-lg">
              →
            </div>
          </div>
        </Link>

      </div>

      {/* Untere Kachel: Einstellungen (Über die gesamte Bildschirmbreite) */}
      <Link
        href="/einstellungen"
        className="group relative w-full rounded-2xl sm:rounded-3xl border-2 border-purple-500/30 hover:border-purple-400 bg-gradient-to-r from-slate-950 via-[#10162a] to-slate-950 shadow-xl hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer p-4 sm:p-5 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-md">
            <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-2xl font-black text-white group-hover:text-purple-300 transition-colors">
                Einstellungen
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-black uppercase tracking-wider">
                <SunMoon className="w-3 h-3" /> Hell- / Dunkelmodus
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Farbschema umschalten (Hellmodus per Schieberegler aktivieren / deaktivieren)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-purple-500/20 group-hover:bg-purple-500 text-purple-300 group-hover:text-slate-950 border border-purple-400/30 flex items-center justify-center font-black text-base sm:text-xl transition-all shadow-md">
            →
          </div>
        </div>
      </Link>

    </div>
  );
}
