'use client';

import React from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2 } from 'lucide-react';

export interface HolographicFussballProps {
  boardId: string;
  p1Name?: string;
  p2Name?: string;
  activeName?: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  scoreP1: number;
  scoreP2: number;
  targetGoals?: number;
  ballPossession?: 1 | 2;
  fussballStats?: {
    p1Darts?: number;
    p1DoubleHits?: number;
    p1DoubleAttempts?: number;
    p1BullHits?: number;
    p1BullAttempts?: number;
  };
  activeTarget?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Hilfsfunktion: Spielername in 2 Zeilen aufteilen
function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

// Dynamische Schriftgröße anhand der längsten Zeile, damit kein Name jemals über den Glasflügel-Rand ragt
function getNameSizeClass(first: string, last: string) {
  const maxLen = Math.max(first.length, last.length);
  if (maxLen <= 8) return 'text-[clamp(1.6rem,3.0vw,3.0rem)]';
  if (maxLen <= 11) return 'text-[clamp(1.4rem,2.4vw,2.4rem)]';
  if (maxLen <= 14) return 'text-[clamp(1.15rem,1.9vw,1.95rem)]';
  if (maxLen <= 18) return 'text-[clamp(1.0rem,1.55vw,1.6rem)]';
  return 'text-[clamp(0.9rem,1.3vw,1.35rem)]';
}

export default function HolographicFussballCockpit({
  boardId,
  p1Name = 'Sebastian Kirste',
  p2Name = 'Gegner',
  scoreP1,
  scoreP2,
  targetGoals = 5,
  ballPossession = 1,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicFussballProps) {
  const p1 = splitName(p1Name);
  const p2 = splitName(p2Name);
  const p1SizeClass = getNameSizeClass(p1.first, p1.last);
  const p2SizeClass = getNameSizeClass(p2.first, p2.last);
  const isP1Possession = ballPossession === 1;
  const isP2Possession = ballPossession === 2;

  return (
    <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between py-4 sm:py-6 lg:py-8 px-0 overflow-hidden select-none font-sans">
      {/* =================================================================== */}
      {/* 1. PHOTOREALISTISCHE 3D-BÜHNE (100% CLEAN STAGE)                    */}
      {/* =================================================================== */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/images/fussball-cockpit-stage.jpg"
          alt="Fußball Darts 3D Hologramm Tor"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-105 contrast-105"
        />
      </div>

      {/* =================================================================== */}
      {/* 2. ZENTRIERTE SCHWEBENDE GLASS-KAPSEL IM HEADER                     */}
      {/* =================================================================== */}
      <header className="relative z-30 w-full flex items-center justify-center pt-1 sm:pt-2 px-4">
        <div className="flex items-center justify-center gap-2.5 sm:gap-4 px-8 sm:px-14 py-2 sm:py-2.5 rounded-full bg-slate-900/75 backdrop-blur-3xl border-2 border-slate-600/60 shadow-[0_10px_35px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.4),0_0_25px_rgba(6,182,212,0.3)] text-xs sm:text-sm font-black font-mono tracking-widest text-white uppercase">
          <span className="text-cyan-300">BOARD {boardId}</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-white">LIONS WEYHAUSEN</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-white">FUßBALL DARTS</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-cyan-300">1 VS 1 DUELL</span>
        </div>

        {/* Dezent versteckter Vollbild-Button oben rechts */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="absolute right-4 sm:right-6 top-1 sm:top-2 p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.15] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-2xl"
            title="Vollbild"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </header>

      {/* =================================================================== */}
      {/* 3. MITTELBEREICH: EXAKT MITTIG IN DEN INNEREN GLASFLÜGEL-RAHMEN     */}
      {/* =================================================================== */}
      <main className="my-auto w-full grid grid-cols-1 md:grid-cols-[27%_46%_27%] items-center relative z-20">
        {/* ----------------------------------------------------------------- */}
        {/* LINKER FLÜGEL: ZENTRIERT MIT SICHERHEITSABSTAND ZUM INNENRAND     */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-col items-center justify-center text-center pl-4 pr-6 md:pl-[2vw] md:pr-[3.5vw] min-w-0 overflow-hidden">
          <span
            className={`${p1SizeClass} font-black text-white tracking-tight leading-[1.08] drop-shadow-[0_4px_28px_rgba(0,0,0,0.95)] whitespace-nowrap`}
          >
            {p1.first}
          </span>
          {p1.last && (
            <span
              className={`${p1SizeClass} font-black text-white tracking-tight leading-[1.08] drop-shadow-[0_4px_28px_rgba(0,0,0,0.95)] mt-1 whitespace-nowrap`}
            >
              {p1.last}
            </span>
          )}

          {/* Ballbesitz-Schild */}
          <div className="mt-4 sm:mt-5">
            {isP1Possession ? (
              <span className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2 rounded-full bg-[#062c1e]/95 border-2 border-[#00ff88] text-[#00ff88] font-mono text-xs sm:text-sm lg:text-base font-black tracking-widest shadow-[0_0_28px_rgba(0,255,136,0.55)]">
                <span className="text-base sm:text-lg leading-none">⚽</span>
                <span>BALLBESITZ</span>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2 rounded-full bg-slate-900/80 border-2 border-slate-600/70 text-slate-300 font-mono text-xs sm:text-sm lg:text-base font-black tracking-widest">
                <span className="text-base sm:text-lg leading-none">🛡️</span>
                <span>ABWEHR</span>
              </span>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ZENTRUM: KOMPLETT FREIER RAUM FÜR DAS 3D-TOR                      */}
        {/* ----------------------------------------------------------------- */}
        <div className="hidden md:block w-full h-[240px] pointer-events-none" />

        {/* ----------------------------------------------------------------- */}
        {/* RECHTER FLÜGEL: ZENTRIERT MIT SICHERHEITSABSTAND ZUM INNENRAND    */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-col items-center justify-center text-center pl-6 pr-4 md:pl-[3.5vw] md:pr-[2vw] min-w-0 overflow-hidden">
          <span
            className={`${p2SizeClass} font-black text-white tracking-tight leading-[1.08] drop-shadow-[0_4px_28px_rgba(0,0,0,0.95)] whitespace-nowrap`}
          >
            {p2.first}
          </span>
          {p2.last && (
            <span
              className={`${p2SizeClass} font-black text-slate-200 tracking-tight leading-[1.08] drop-shadow-[0_4px_28px_rgba(0,0,0,0.95)] mt-1 whitespace-nowrap`}
            >
              {p2.last}
            </span>
          )}

          {/* Ballbesitz-Schild für Gegner */}
          <div className="mt-4 sm:mt-5">
            {isP2Possession ? (
              <span className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2 rounded-full bg-[#062c1e]/95 border-2 border-[#00ff88] text-[#00ff88] font-mono text-xs sm:text-sm lg:text-base font-black tracking-widest shadow-[0_0_28px_rgba(0,255,136,0.55)]">
                <span className="text-base sm:text-lg leading-none">⚽</span>
                <span>BALLBESITZ</span>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2 rounded-full bg-slate-900/80 border-2 border-slate-600/70 text-slate-300 font-mono text-xs sm:text-sm lg:text-base font-black tracking-widest">
                <span className="text-base sm:text-lg leading-none">🛡️</span>
                <span>ABWEHR</span>
              </span>
            )}
          </div>
        </div>
      </main>

      {/* =================================================================== */}
      {/* 4. FOOTER: SCORE-POD KOMPLETT UNTERHALB DES TORS & EXAKT ZENTRIERT  */}
      {/* =================================================================== */}
      <footer className="relative z-30 w-full flex items-center justify-center pb-1 sm:pb-2 px-4">
        <div className="px-10 sm:px-14 py-3 sm:py-3.5 rounded-2xl sm:rounded-3xl bg-[#080d19]/92 backdrop-blur-2xl border-2 border-[#00e5ff] shadow-[0_0_35px_rgba(0,229,255,0.4)] flex flex-col items-center justify-center text-center min-w-[230px] sm:min-w-[270px]">
          <div className="w-full flex items-center justify-center gap-3 sm:gap-4 font-mono font-black text-4xl sm:text-5xl lg:text-6xl leading-none tabular-nums">
            <span className="text-[#00ff88] drop-shadow-[0_0_25px_rgba(0,255,136,0.9)]">
              {scoreP1}
            </span>
            <span className="text-slate-400 font-bold">:</span>
            <span className="text-[#00e5ff] drop-shadow-[0_0_25px_rgba(0,229,255,0.9)]">
              {scoreP2}
            </span>
          </div>

          <span className="w-full text-center text-[11px] sm:text-xs font-mono font-bold tracking-widest text-slate-300 uppercase pt-2">
            ZIEL: {targetGoals} TORE
          </span>
        </div>
      </footer>
    </div>
  );
}
