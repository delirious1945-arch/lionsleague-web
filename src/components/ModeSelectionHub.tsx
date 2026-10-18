'use client';

import React from 'react';
import Link from 'next/link';
import { UserSession, logoutAction } from '@/app/actions';
import PlayerAvatar from './PlayerAvatar';
import { Target, Trophy, ArrowRight, Zap, BarChart3, Users, FileText, CheckCircle2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-6 sm:py-10 animate-fadeIn">
      <div className="max-w-4xl w-full space-y-8">
        
        {/* Welcome Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(0,212,255,0.2)]">
            <span>🦁</span> LIONS WEYHAUSEN PORTAL
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Willkommen, <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">{user.name}</span>!
          </h1>
          
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Wähle deinen gewünschten Bereich für dein aktuelles Gerät (Android, Apple oder PC):
          </p>
        </div>

        {/* 2 Big Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          
          {/* Card 1: TRAININGSMODUS (Doppelquote) */}
          <Link
            href="/doppelquote"
            className="group relative bg-gradient-to-b from-[#0b162c] via-[#09142b] to-[#060e1f] border-2 border-cyan-500/40 hover:border-cyan-400 rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-[0_0_35px_rgba(0,212,255,0.3)] transition-all duration-300 flex flex-col justify-between hover:scale-[1.02] cursor-pointer"
          >
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span>🎯</span> INTERAKTIV
              </span>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(0,212,255,0.35)] group-hover:scale-110 transition-transform">
                🎯
              </div>

              <div>
                <span className="text-[11px] font-black uppercase text-cyan-400 tracking-wider">
                  Trainings & Wurf-Tool
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 group-hover:text-cyan-300 transition-colors">
                  Trainingsmodus
                </h2>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  Trainiere deine Doppelquote mit dem offiziellen Lions-Spiel (10 Aufnahmen à 3 Darts auf D20, D10, D16, D8, D4).
                </p>
              </div>

              <div className="pt-2 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Solo-Training oder 1vs1-Duell am Board</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Live Treffereingabe & Sound-Synthesizer</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cloud-Trainingshistorie & Excel/PDF-Export</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 group-hover:underline">
                Direkt zum Doppelquote-Spiel
              </span>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-slate-950 flex items-center justify-center transition-all">
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Card 2: RANKING-OBERFLÄCHE */}
          <Link
            href="/?mode=ranking"
            className="group relative bg-gradient-to-b from-[#140e2b] via-[#100b24] to-[#090617] border-2 border-purple-500/40 hover:border-purple-400 rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-[0_0_35px_rgba(168,85,247,0.3)] transition-all duration-300 flex flex-col justify-between hover:scale-[1.02] cursor-pointer"
          >
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <span>🏆</span> LIGA & STATS
              </span>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(168,85,247,0.35)] group-hover:scale-110 transition-transform">
                🏆
              </div>

              <div>
                <span className="text-[11px] font-black uppercase text-purple-400 tracking-wider">
                  Vereinswertung & DAE
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 group-hover:text-purple-300 transition-colors">
                  Ranking-System
                </h2>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  Offizielle Vereins-Rangliste, Spieltag-Ergebnisse, Team Battle (A-Team vs. B-Team) und Dart Analytics Engine.
                </p>
              </div>

              <div className="pt-2 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Gesamtwertung, Monatspodium & 26er Könige</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Dart Analytics Engine (DAE) & Wurfkorridor</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Team-Profile, Spielertabellen & Detailmatrix</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 group-hover:underline">
                Zur Liga- und Ranking-Übersicht
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 group-hover:bg-purple-500 text-purple-300 group-hover:text-slate-950 flex items-center justify-center transition-all">
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* User Card & Logout Footer */}
        <div className="bg-[#070e1f] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <PlayerAvatar name={user.name} size={42} />
            <div>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                {user.name}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {user.team}
                </span>
                {user.role === 'admin' && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Authentifiziert für SC Weyhausen von 1921 e.V.
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-400 hover:text-rose-300 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>Abmelden</span>
          </button>
        </div>

      </div>
    </div>
  );
}
