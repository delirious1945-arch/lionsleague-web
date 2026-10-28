'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserSession, logoutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, SunMoon, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import DynamicRankingTileContent from './DynamicRankingTileContent';
import TrainingLotteryWidget from './TrainingLotteryWidget';
import { LotteryWinner } from '@/lib/trainingLottery';

interface ModeSelectionHubProps {
  user: UserSession;
  bannerWinner?: LotteryWinner | null;
  unacknowledgedWin?: LotteryWinner | null;
}

export default function ModeSelectionHub({ user, bannerWinner, unacknowledgedWin }: ModeSelectionHubProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.refresh();
  };

  return (
    <div className="relative min-h-[calc(100dvh-2.5rem)] w-full flex flex-col justify-between gap-3 sm:gap-5 py-1 sm:py-2 select-none">
      
      {/* Obere Leiste mit dezentem Logout-Button */}
      <div className="flex items-center justify-between w-full px-1" data-ui-id="HOME.HEADER.BAR">
        <div className="text-xs font-bold text-slate-400" data-ui-id="HOME.HEADER.USER_INFO">
          Angemeldet: <span className="text-white font-black">{user.name}</span>
        </div>
        <button
          onClick={handleLogout}
          data-ui-id="HOME.HEADER.LOGOUT_BTN"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-500/40 text-xs font-semibold transition-all cursor-pointer backdrop-blur-sm"
          title={`Abmelden (${user.name})`}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Abmelden</span>
        </button>
      </div>

      {/* Monatsverlosungs-Banner & persönliches Gewinner-Modal */}
      <TrainingLotteryWidget
        bannerWinner={bannerWinner ?? null}
        unacknowledgedWin={unacknowledgedWin ?? null}
        currentUser={user.name}
      />

      {/* Haupt-Bereich: Ranking, Training & Video-Wurfstilanalyse nebeneinander auf voller Bildschirmbreite */}
      <div
        data-ui-id="HOME.TILES.GRID"
        className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5 flex-1 min-h-[380px] sm:min-h-[460px] lg:min-h-[500px]"
      >
        {/* Kachel 1: Ranking-System */}
        <Link
          href="/?mode=ranking"
          data-ui-id="HOME.TILES.RANKING_CARD"
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
              <h2 className="text-xl sm:text-2xl xl:text-3xl font-black text-white tracking-wide group-hover:text-amber-400 transition-colors drop-shadow-md">
                Ranking-System
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 rounded-2xl bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 border border-amber-400/30 flex items-center justify-center font-black text-lg sm:text-2xl transition-all shrink-0 ml-2 shadow-lg">
              →
            </div>
          </div>
        </Link>

        {/* Kachel 2: Trainingsmodus */}
        <Link
          href="/training"
          data-ui-id="HOME.TILES.TRAINING_CARD"
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
              <h2 className="text-xl sm:text-2xl xl:text-3xl font-black text-white tracking-wide group-hover:text-cyan-400 transition-colors drop-shadow-md">
                Trainingsmodus
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 rounded-2xl bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 border border-cyan-400/30 flex items-center justify-center font-black text-lg sm:text-2xl transition-all shrink-0 ml-2 shadow-lg">
              →
            </div>
          </div>
        </Link>

        {/* Kachel 3: Video-Wurfstilanalyse (Coming Soon / Unkenntlich, nur für Admins anwählbar) */}
        <div
          onClick={() => {
            if (user.role === 'admin') {
              router.push('/video');
            }
          }}
          data-ui-id="HOME.TILES.VIDEO_CARD"
          className={`group relative flex flex-col justify-end w-full h-full min-h-[220px] rounded-3xl overflow-hidden border-2 shadow-2xl select-none transition-all duration-300 ${
            user.role === 'admin'
              ? 'border-emerald-500/40 hover:border-emerald-400 cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
              : 'border-slate-700/60 cursor-not-allowed pointer-events-none'
          }`}
        >
          {/* Hintergrundbild stark weichgezeichnet & unkenntlich gemacht */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#062016] to-slate-950" />
          <Image
            src="/video-banner.jpg"
            alt="Video-Wurfstilanalyse"
            fill
            className="object-cover object-center blur-2xl scale-125 opacity-30 grayscale-[60%] brightness-50"
          />

          {/* Milchglas- und Abdunklungs-Overlay */}
          <div className="absolute inset-0 backdrop-blur-xl bg-slate-950/65" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />

          {/* Zentrale COMING SOON Einblendung */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center">
            <div className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-slate-900/90 border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.25)] backdrop-blur-md flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-emerald-400">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-base sm:text-xl xl:text-2xl font-black uppercase tracking-[0.2em] text-white drop-shadow">
                  Coming Soon
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-400/90 uppercase tracking-widest">
                {user.role === 'admin' ? 'In Entwicklung • Admin-Zugang aktiv' : 'In Entwicklung'}
              </span>
            </div>
          </div>

          {/* Badges oben links (gedimmt) */}
          <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-10 flex flex-col gap-1.5 opacity-60">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              KI-Wurfanalyse
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-400 border border-slate-700/60 text-[9px] font-bold backdrop-blur-md">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              100% On-Device • DSGVO
            </span>
          </div>

          {/* Titel unten (gedimmt) */}
          <div className="relative z-10 p-4 sm:p-7 flex items-center justify-between opacity-50">
            <div>
              <span className="text-[10px] sm:text-xs uppercase font-black tracking-widest text-emerald-400 block mb-0.5">
                Biomechanik & Release
              </span>
              <h2 className="text-xl sm:text-2xl xl:text-3xl font-black text-white tracking-wide drop-shadow-md">
                Video-Wurfstil
              </h2>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 rounded-2xl bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center justify-center font-black text-lg sm:text-xl shrink-0 ml-2">
              <Lock className="w-5 h-5" />
            </div>
          </div>
        </div>

      </div>

      {/* Untere Kachel: Einstellungen (Über die gesamte Bildschirmbreite) */}
      <Link
        href="/einstellungen"
        data-ui-id="HOME.TILES.SETTINGS_CARD"
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
