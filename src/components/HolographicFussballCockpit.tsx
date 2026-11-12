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

// =============================================================================
// KÖNIGLICHES LIONS-WAPPEN (Golden Lion Head mit strahlendem Glanz)
// =============================================================================
function GoldenLionHead({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGradFussball" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff8cc" />
          <stop offset="25%" stopColor="#ffd700" />
          <stop offset="65%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#996515" />
        </linearGradient>
        <filter id="goldGlowFussball" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g filter="url(#goldGlowFussball)" fill="url(#goldGradFussball)">
        {/* Äußere Mähne */}
        <path
          d="M50 10 L54 19 L64 13 L63 24 L74 21 L70 31 L81 32 L74 40 L84 44 L75 51 L84 58 L74 62 L81 70 L70 71 L74 81 L63 78 L64 89 L54 83 L50 93 L46 83 L36 89 L37 78 L26 81 L30 71 L19 70 L26 62 L16 58 L25 51 L16 44 L26 40 L19 32 L30 31 L26 21 L37 24 L36 13 L46 19 Z"
          fillOpacity="0.9"
        />
        {/* Löwengesicht Kontur */}
        <path
          d="M50 26 C41 26 36 33 36 45 C36 57 43 67 50 73 C57 67 64 57 64 45 C64 33 59 26 50 26 Z"
          fillOpacity="0.95"
        />
        {/* Stirn-Spitzen */}
        <polygon points="50,29 46,37 54,37" fill="#fff9d6" />
        {/* Augen */}
        <path d="M42 44 C44 42 47 42 48 45 C46 46 43 46 42 44 Z" fill="#1e1810" />
        <path d="M58 44 C56 42 53 42 52 45 C54 46 57 46 58 44 Z" fill="#1e1810" />
        {/* Nase & Schnauze */}
        <polygon points="50,57 46,51 54,51" fill="#2a1f10" />
        <path
          d="M50 57 L50 63 M50 63 C46 63 44 61 43 59 M50 63 C54 63 56 61 57 59"
          stroke="#2a1f10"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="47" cy="60" r="1" fill="#fff" />
        <circle cx="53" cy="60" r="1" fill="#fff" />
      </g>
    </svg>
  );
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
  p2Name = 'Bot-Gegner',
  activeName,
  is1vs1 = true,
  scoreP1,
  scoreP2,
  targetGoals = 5,
  ballPossession = 1,
  fussballStats,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicFussballProps) {
  // Spieler 1 Name
  const p1 = splitName(p1Name);
  // Spieler 2 Name (Gegner)
  const p2 = splitName(p2Name);

  // Ballbesitz-Flags
  const isP1Possession = ballPossession === 1;
  const isP2Possession = ballPossession === 2;

  // Solo-Statistiken
  const doubleAttempts = fussballStats?.p1DoubleAttempts ?? 0;
  const doubleHits = fussballStats?.p1DoubleHits ?? scoreP1;
  const doublePct = doubleAttempts > 0 ? Math.round((doubleHits / doubleAttempts) * 100) : 0;
  const totalDarts = fussballStats?.p1Darts ?? 0;

  return (
    <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden select-none font-sans">
      {/* =================================================================== */}
      {/* 1. PHOTOREALISTISCHE 3D-BÜHNE (3D TOR, GOD RAYS, GLASFLÜGEL)        */}
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
      <header className="relative z-30 w-full flex items-center justify-center pt-2 sm:pt-4">
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
            className="absolute right-4 top-4 p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.15] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-2xl"
            title="Vollbild"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </header>

      {/* =================================================================== */}
      {/* 3. COCKPIT-BÜHNE: KEINE VORDERGRUND-KACHELN, REINE PROJEKTION      */}
      {/* =================================================================== */}
      <main className="my-auto w-full max-w-[1440px] mx-auto flex items-center justify-between relative z-20 px-4 sm:px-8 lg:px-12">
        {/* ----------------------------------------------------------------- */}
        {/* LINKER FLÜGEL: SPIELER 1 (DIREKT IN DEN GLASFLÜGEL PROJIZIERT)   */}
        {/* ----------------------------------------------------------------- */}
        <div className="w-[300px] sm:w-[360px] lg:w-[410px] flex items-center gap-4 sm:gap-6">
          {/* Golden Lion Crest */}
          <div className="shrink-0 drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]">
            <GoldenLionHead className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24" />
          </div>

          {/* Spielername & Status Badge */}
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)]">
              {p1.first}
            </span>
            {p1.last && (
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)] mt-1 sm:mt-1.5">
                {p1.last}
              </span>
            )}

            {/* Status: ⚽ BALLBESITZ (wenn Spieler 1 am Ball ist) */}
            <div className="mt-4 sm:mt-5">
              {isP1Possession ? (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/90 border-2 border-[#00ff88] shadow-[0_0_25px_rgba(0,255,136,0.7)] text-[#00ff88] font-mono text-xs sm:text-sm font-black tracking-widest animate-pulse">
                  <span className="text-base sm:text-lg">⚽</span>
                  <span>BALLBESITZ</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/60 border border-slate-700/60 text-slate-400 font-mono text-xs font-bold tracking-wider">
                  <span>ABWEHR</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ZENTRUM: 3D-TOR (HINTERGRUND) + ERGEBNIS IM GROSSFORMAT UNTER DEM TOR */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-[560px] mx-2">
          {/* Freiraum für das 3D-Tor im Hintergrund (damit Tor & Cyberball frei sichtbar bleiben) */}
          <div className="w-full h-[220px] sm:h-[260px] lg:h-[290px] pointer-events-none" />

          {/* GROSSFORMATIGES ERGEBNIS UNTER DEM TOR */}
          <div className="flex flex-col items-center justify-center -mt-4 sm:-mt-6 lg:-mt-8 z-30">
            {is1vs1 ? (
              /* 1 vs 1 Duell Score: 3 : 1 */
              <div className="flex items-baseline justify-center gap-4 sm:gap-6 px-8 sm:px-12 py-2 sm:py-3 rounded-3xl bg-slate-950/80 backdrop-blur-2xl border-2 border-cyan-400/50 shadow-[0_0_50px_rgba(6,182,212,0.45),inset_0_1px_2px_rgba(255,255,255,0.4)]">
                <span className="text-6xl sm:text-8xl lg:text-9xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_35px_rgba(0,255,136,0.9)]">
                  {scoreP1}
                </span>
                <span className="text-4xl sm:text-6xl lg:text-7xl font-bold font-mono text-cyan-300 leading-none">
                  :
                </span>
                <span className="text-6xl sm:text-8xl lg:text-9xl font-black font-mono text-[#00f0ff] leading-none drop-shadow-[0_0_35px_rgba(0,240,255,0.9)]">
                  {scoreP2}
                </span>
              </div>
            ) : (
              /* Einzelspieler-Score: 3 / 5 Tore */
              <div className="flex items-baseline justify-center gap-3 px-8 sm:px-12 py-2 sm:py-3 rounded-3xl bg-slate-950/80 backdrop-blur-2xl border-2 border-cyan-400/50 shadow-[0_0_50px_rgba(6,182,212,0.45),inset_0_1px_2px_rgba(255,255,255,0.4)]">
                <span className="text-6xl sm:text-8xl lg:text-9xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_35px_rgba(0,255,136,0.9)]">
                  {scoreP1}
                </span>
                <span className="text-3xl sm:text-5xl lg:text-6xl font-bold font-mono text-slate-400 leading-none">
                  / {targetGoals}
                </span>
              </div>
            )}

            {/* Zielvorgabe dezent & edel darunter */}
            <span className="text-sm sm:text-base lg:text-lg font-bold font-mono text-slate-300 tracking-widest uppercase pt-2.5 drop-shadow-md">
              Ziel: {targetGoals} Tore
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RECHTER FLÜGEL: GEGNER (1vs1) ODER STATISTIK / QUOTE (SOLO)       */}
        {/* ----------------------------------------------------------------- */}
        <div className="w-[300px] sm:w-[360px] lg:w-[410px] flex items-center justify-end">
          {is1vs1 ? (
            /* ============================================================= */
            /* 1 VS 1 MODUS: RECHTS STEHT DER GEGNER (KEINE STATISTIK)      */
            /* ============================================================= */
            <div className="flex flex-col items-end text-right min-w-0">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)]">
                {p2.first}
              </span>
              {p2.last && (
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)] mt-1 sm:mt-1.5">
                  {p2.last}
                </span>
              )}

              {/* Status: ⚽ BALLBESITZ (wenn Spieler 2 am Ball ist) */}
              <div className="mt-4 sm:mt-5">
                {isP2Possession ? (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/90 border-2 border-[#00ff88] shadow-[0_0_25px_rgba(0,255,136,0.7)] text-[#00ff88] font-mono text-xs sm:text-sm font-black tracking-widest animate-pulse">
                    <span className="text-base sm:text-lg">⚽</span>
                    <span>BALLBESITZ</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/60 border border-slate-700/60 text-slate-400 font-mono text-xs font-bold tracking-wider">
                    <span>ABWEHR</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* EINZELSPIELERMODUS: RECHTS STEHEN QUOTEN & TREFFER            */
            /* ============================================================= */
            <div className="flex flex-col items-end text-right min-w-0">
              {/* Treffer & Doppelquote im Großformat */}
              <div className="flex flex-col items-end">
                <span className="text-5xl sm:text-6xl lg:text-7xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_35px_rgba(0,255,136,0.85)]">
                  {doublePct}%
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-black uppercase tracking-widest text-emerald-400/90 pt-1">
                  DOPPELQUOTE
                </span>
              </div>

              {/* Treffer bei Versuchen */}
              <div className="pt-3 sm:pt-4 flex flex-col items-end">
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.7)]">
                  {doubleHits} / {doubleAttempts} Treffer
                </span>
                {totalDarts > 0 && (
                  <span className="text-xs font-mono text-slate-400 pt-0.5">
                    {totalDarts} Darts geworfen
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =================================================================== */}
      {/* 4. FOOTER: SAUBER & ABLENKUNGSFREI                                  */}
      {/* =================================================================== */}
      <footer className="relative z-20 h-4" />
    </div>
  );
}
