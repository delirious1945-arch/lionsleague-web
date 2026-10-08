'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Calendar } from 'lucide-react';

interface HeaderProps {
  currentSeason: string;
  seasons: string[];
}

export default function Header({ currentSeason, seasons }: HeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', selected);
    router.push(`/?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10 px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 shrink-0 transition-transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Lions Weyhausen"
                width={48}
                height={48}
                className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(37,99,235,0.6)]"
                priority
              />
            </div>
            <div>
              <div className="text-lg font-black tracking-wider text-white flex items-center gap-2">
                <span>LIONS LEAGUE</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-2.5 h-2.5 animate-pulse" />
                  V2.0 High-Speed
                </span>
              </div>
              <p className="text-[11px] font-semibold tracking-wide text-blue-400 uppercase">
                SC Weyhausen von 1921 e.V. • Dartsport
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation & Season Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Season Selector */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-xl px-3 py-1.5 shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
              Saison:
            </span>
            <select
              value={currentSeason}
              onChange={handleSeasonChange}
              className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer pr-1"
            >
              {seasons.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Nav Links */}
          <nav className="flex items-center gap-1 sm:gap-2 text-xs font-bold">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm"
            >
              Dashboard
            </Link>
            <Link
              href="#rangliste"
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Rangliste
            </Link>
            <Link
              href="#teambattle"
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Team-Battle
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
