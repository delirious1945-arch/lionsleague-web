'use client';

import React from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2 } from 'lucide-react';

export interface HolographicFussballProps {
  boardId: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  scoreP1: number;
  scoreP2: number;
  targetGoals?: number;
  ballPossession?: 1 | 2;
  activeTarget?: 'OBEN_L' | 'OBEN_R' | 'MITTE' | 'UNTEN_L' | 'UNTEN_R' | string;
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

export default function HolographicFussballCockpit({
  boardId,
  activeName,
  is1vs1 = true,
  scoreP1,
  scoreP2,
  targetGoals = 5,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicFussballProps) {
  // Name in Vorname und Nachname aufteilen für zweizeilige monumentale Typografie
  const nameParts = activeName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Sebastian';
  const lastName = nameParts.slice(1).join(' ') || 'Kirsch';

  return (
    <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden select-none font-sans">
      {/* =================================================================== */}
      {/* 1. PHOTOREALISTISCHE 3D-BÜHNE (1:1 RENDERING DES SOLL-BILDS 1)      */}
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
      {/* 2. ZENTRIERTE SCHWEBENDE GLASS-KAPSEL IM HEADER (1:1 SOLL-BILD 1) */}
      {/* =================================================================== */}
      <header className="relative z-30 w-full flex items-center justify-center pt-2 sm:pt-4">
        <div className="flex items-center justify-center gap-2.5 sm:gap-4 px-8 sm:px-14 py-2 sm:py-2.5 rounded-full bg-slate-900/75 backdrop-blur-3xl border-2 border-slate-600/60 shadow-[0_10px_35px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.4),0_0_25px_rgba(6,182,212,0.3)] text-xs sm:text-sm font-black font-mono tracking-widest text-white uppercase">
          <span className="text-cyan-300">BOARD {boardId}</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-white">LIONS WEYHAUSEN</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-white">FUßBALL DARTS</span>
          <span className="text-slate-500 font-bold">•</span>
          <span className="text-cyan-300">{is1vs1 ? '1 VS 1 DUELL' : 'SOLO-MODUS'}</span>
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
      {/* 3. DAS COCKPIT-HERZ: 3 HORIZONTALE ELEMENTE (1:1 PARITÄT ZUM SOLL) */}
      {/* =================================================================== */}
      <main className="my-auto w-full max-w-7xl mx-auto flex items-center justify-center relative z-20 px-2 sm:px-4">
        <div className="relative flex items-center justify-center w-full">
          {/* --------------------------------------------------------------- */}
          {/* LINKER FLÜGEL: SPIELER-CARD MIT LÖWEN-WAPPEN & BALLBESITZ */}
          {/* --------------------------------------------------------------- */}
          <div
            className="relative z-10 w-[340px] sm:w-[400px] lg:w-[440px] h-[250px] sm:h-[280px] lg:h-[300px] rounded-[2.5rem] bg-slate-950/85 backdrop-blur-3xl border-2 border-slate-700/60 shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.35),0_0_35px_rgba(6,182,212,0.25)] p-6 sm:p-8 flex items-center gap-5 -mr-12 overflow-hidden"
          >
            {/* Oberer feiner Lichtglanzstreifen */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

            {/* Golden Lion Crest Wappen */}
            <div className="shrink-0 drop-shadow-[0_0_25px_rgba(255,215,0,0.5)]">
              <GoldenLionHead className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24" />
            </div>

            {/* Spielername & Status Badge */}
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)]">
                {firstName}
              </span>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] mt-1 sm:mt-1.5">
                {lastName}
              </span>

              {/* Status Badge: ⚽ BALLBESITZ in Smaragdgrün */}
              <div className="mt-4 sm:mt-5">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/90 border-2 border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.6)] text-[#00ff88] font-mono text-xs sm:text-sm font-black tracking-widest">
                  <span className="text-base sm:text-lg">⚽</span>
                  <span>BALLBESITZ</span>
                </span>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* ZENTRUM: 3D HOLOGRAPHISCHES WIREFRAME-TOR (AUS DEM 3D-ASSET)   */}
          {/* --------------------------------------------------------------- */}
          <div className="relative z-20 w-[420px] h-[340px] sm:w-[500px] sm:h-[400px] lg:w-[600px] lg:h-[450px] shrink-0 pointer-events-none select-none flex items-center justify-center">
            {/* Freier Durchblick auf das raytraced 3D-Tor & Cyber-Ball im Hintergrund */}
            <div className="w-full h-full" />
          </div>

          {/* --------------------------------------------------------------- */}
          {/* RECHTER FLÜGEL: SPIELSTAND & ZIEL-TORE (1:1 SOLL-BILD 1) */}
          {/* --------------------------------------------------------------- */}
          <div
            className="relative z-10 w-[340px] sm:w-[400px] lg:w-[440px] h-[250px] sm:h-[280px] lg:h-[300px] rounded-[2.5rem] bg-slate-950/85 backdrop-blur-3xl border-2 border-slate-700/60 shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.35),0_0_35px_rgba(6,182,212,0.25)] p-6 sm:p-8 flex flex-col items-center justify-center text-center -ml-12 overflow-hidden"
          >
            {/* Oberer feiner Lichtglanzstreifen */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

            {/* Score & Zielbereich komplett zentriert */}
            <div className="flex flex-col items-center justify-center my-auto w-full">
              {/* Gigantischer Spielstand: dynamisch synchronisiert */}
              <div className="flex items-baseline justify-center gap-3 sm:gap-4">
                <span className="text-7xl sm:text-8xl lg:text-9xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_35px_rgba(0,255,136,0.85)]">
                  {scoreP1}
                </span>
                <span className="text-5xl sm:text-6xl lg:text-7xl font-bold font-mono text-cyan-300 leading-none">
                  :
                </span>
                <span className="text-7xl sm:text-8xl lg:text-9xl font-black font-mono text-[#00f0ff] leading-none drop-shadow-[0_0_35px_rgba(0,240,255,0.85)]">
                  {scoreP2}
                </span>
              </div>

              {/* Ziel: 5 Tore */}
              <span className="text-xl sm:text-2xl font-bold font-mono text-slate-300 tracking-wider pt-3 sm:pt-4 block drop-shadow-md">
                Ziel: {targetGoals} Tore
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* =================================================================== */}
      {/* 4. FOOTER: SAUBER & ABLENKUNGSFREI */}
      {/* =================================================================== */}
      <footer className="relative z-20 h-4" />
    </div>
  );
}
