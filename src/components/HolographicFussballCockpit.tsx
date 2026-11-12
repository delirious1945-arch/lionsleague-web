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

// Hilfsfunktion: Spielername in 2 Zeilen aufteilen für monumentale Typografie
function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export default function HolographicFussballCockpit({
  boardId,
  p1Name = 'Sebastian Kirste',
  is1vs1 = true,
  scoreP1,
  targetGoals = 5,
  ballPossession = 1,
  fussballStats,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicFussballProps) {
  // Spieler 1 Name (z. B. Sebastian Kirste)
  const p1 = splitName(p1Name);
  const isP1Possession = ballPossession === 1;

  // Live-Statistiken für die rechte Anzeige
  const doubleAttempts = fussballStats?.p1DoubleAttempts ?? 0;
  const doubleHits = fussballStats?.p1DoubleHits ?? scoreP1;
  const doublePct =
    doubleAttempts > 0 ? ((doubleHits / doubleAttempts) * 100).toFixed(1) : '0.0';
  const totalDarts = fussballStats?.p1Darts ?? 0;

  return (
    <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden select-none font-sans">
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
      <header className="relative z-30 w-full flex items-center justify-center pt-1 sm:pt-3">
        <div className="flex items-center justify-center gap-2.5 sm:gap-4 px-8 sm:px-14 py-2 sm:py-2.5 rounded-full bg-slate-900/75 backdrop-blur-3xl border-2 border-slate-600/60 shadow-[0_10px_35px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.4),0_0_25px_rgba(6,182,212,0.3)] text-xs sm:text-sm font-black font-mono tracking-widest text-white uppercase">
          <span className="text-cyan-300">BOARD {boardId}</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-white">LIONS WEYHAUSEN</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-white">FUßBALL DARTS</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-cyan-300">{is1vs1 ? '1 VS 1 DUELL' : 'EINZELSPIELERMODUS'}</span>
        </div>

        {/* Dezent versteckter Vollbild-Button oben rechts */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="absolute right-4 top-2 sm:top-3 p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.15] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-2xl"
            title="Vollbild"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </header>

      {/* =================================================================== */}
      {/* 3. MITTELBEREICH: FLÜGEL AUF HÖHE DER GLASFLÜGEL, TOR BLEIBT FREI   */}
      {/* =================================================================== */}
      <main className="my-auto w-full max-w-[1540px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center relative z-20 px-4 sm:px-8 lg:px-12 gap-4">
        {/* ----------------------------------------------------------------- */}
        {/* LINKER FLÜGEL: GROSSER SPIELERNAME + GROSSES BALLBESITZ-SCHILD    */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex items-center justify-start pl-4 sm:pl-8 lg:pl-14">
          <div className="flex flex-col justify-center items-start min-w-0">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] drop-shadow-[0_4px_28px_rgba(0,0,0,0.95)]">
              {p1.first}
            </span>
            {p1.last && (
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] drop-shadow-[0_4px_28px_rgba(0,0,0,0.95)] mt-1">
                {p1.last}
              </span>
            )}

            {/* Großes Ballbesitz-Schild */}
            <div className="mt-5 sm:mt-6">
              {isP1Possession ? (
                <span className="inline-flex items-center gap-2.5 px-5 sm:px-7 py-2 sm:py-2.5 rounded-full bg-[#062c1e]/95 border-2 border-[#00ff88] text-[#00ff88] font-mono text-sm sm:text-base lg:text-lg font-black tracking-widest shadow-[0_0_28px_rgba(0,255,136,0.55)]">
                  <span className="text-lg sm:text-xl leading-none">⚽</span>
                  <span>BALLBESITZ</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2.5 px-5 sm:px-7 py-2 sm:py-2.5 rounded-full bg-slate-900/80 border-2 border-slate-600/70 text-slate-300 font-mono text-sm sm:text-base lg:text-lg font-black tracking-widest">
                  <span className="text-lg sm:text-xl leading-none">🛡️</span>
                  <span>ABWEHR</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ZENTRUM: KOMPLETT FREIER RAUM FÜR DAS 3D-TOR                      */}
        {/* ----------------------------------------------------------------- */}
        <div className="hidden md:block min-w-[360px] lg:min-w-[520px] h-[240px] pointer-events-none" />

        {/* ----------------------------------------------------------------- */}
        {/* RECHTER FLÜGEL: LIVE-STATISTIKEN                                  */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex items-center justify-end pr-4 sm:pr-8 lg:pr-14">
          <div className="flex flex-col items-end text-right min-w-0">
            {/* Doppelquote im Großformat */}
            <div className="flex flex-col items-end">
              <span className="text-5xl sm:text-6xl lg:text-7xl font-mono font-black text-[#00ff88] leading-none drop-shadow-[0_0_35px_rgba(0,255,136,0.85)] tabular-nums">
                {doublePct}%
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-black uppercase tracking-widest text-emerald-400/90 pt-1.5">
                DOPPELQUOTE
              </span>
            </div>

            {/* Treffer & geworfene Darts */}
            <div className="pt-3.5 flex flex-col items-end">
              <span className="text-base sm:text-lg lg:text-xl font-mono font-bold text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] tabular-nums">
                {doubleHits} / {doubleAttempts} Treffer
              </span>
              <span className="text-xs sm:text-sm font-mono text-slate-300 pt-0.5 tabular-nums">
                {totalDarts} Darts geworfen
              </span>
            </div>

            {/* 15 Aufnahmen-Dots */}
            <div className="flex items-center gap-1.5 pt-3.5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < doubleHits
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-slate-700/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* =================================================================== */}
      {/* 4. FOOTER: SCORE-POD KOMPLETT UNTERHALB DES TORS & EXAKT ZENTRIERT  */}
      {/* =================================================================== */}
      <footer className="relative z-30 w-full flex items-center justify-center pb-1 sm:pb-3">
        <div className="px-10 sm:px-14 py-3 sm:py-3.5 rounded-2xl sm:rounded-3xl bg-[#080d19]/92 backdrop-blur-2xl border-2 border-[#00e5ff] shadow-[0_0_35px_rgba(0,229,255,0.4)] flex flex-col items-center justify-center text-center min-w-[230px] sm:min-w-[270px]">
          {/* Exakt zentrierte Zahlenreihe */}
          <div className="w-full flex items-center justify-center gap-3 sm:gap-4 font-mono font-black text-4xl sm:text-5xl lg:text-6xl leading-none tabular-nums">
            <span className="text-[#00ff88] drop-shadow-[0_0_25px_rgba(0,255,136,0.9)]">
              {scoreP1}
            </span>
            <span className="text-slate-400 font-bold">/</span>
            <span className="text-white">{targetGoals}</span>
          </div>

          {/* Untertitel exakt mittig darunter */}
          <span className="w-full text-center text-[11px] sm:text-xs font-mono font-bold tracking-widest text-slate-300 uppercase pt-2">
            ZIEL: {targetGoals} TORE
          </span>
        </div>
      </footer>
    </div>
  );
}
