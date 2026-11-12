'use client';

import React from 'react';
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

// =============================================================================
// HUD CORNER BRACKETS (Goldene Sci-Fi Ecken ⌜ ⌝ ⌞ ⌟)
// =============================================================================
function HudBrackets({ cx, cy, size = 38 }: { cx: number; cy: number; size?: number }) {
  const arm = 9;
  const left = cx - size;
  const right = cx + size;
  const top = cy - size;
  const bottom = cy + size;

  return (
    <g stroke="#ffd700" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9">
      {/* Oben Links ⌜ */}
      <path d={`M ${left} ${top + arm} L ${left} ${top} L ${left + arm} ${top}`} />
      {/* Oben Rechts ⌝ */}
      <path d={`M ${right - arm} ${top} L ${right} ${top} L ${right} ${top + arm}`} />
      {/* Unten Links ⌞ */}
      <path d={`M ${left} ${bottom - arm} L ${left} ${bottom} L ${left + arm} ${bottom}`} />
      {/* Unten Rechts ⌟ */}
      <path d={`M ${right - arm} ${bottom} L ${right} ${bottom} L ${right} ${bottom - arm}`} />
    </g>
  );
}

// =============================================================================
// 3D HOLOGRAPHISCHER CYBER-FUSSBALL (Leuchtende Vektor-Kugel mit Panel-Muster)
// =============================================================================
function CyberBall({ cx, cy, r = 28 }: { cx: number; cy: number; r?: number }) {
  return (
    <g className="animate-pulse">
      {/* Äußerer Halo Glow */}
      <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="#00f0ff" strokeWidth="1" strokeOpacity="0.4" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="url(#ballSphereGrad)"
        stroke="#00e5ff"
        strokeWidth="2"
        filter="url(#cyanBallGlow)"
      />

      {/* Zentrales Pentagon (Waben-Zentrum) */}
      <polygon
        points={`
          ${cx},${cy - r * 0.45}
          ${cx + r * 0.42},${cy - r * 0.14}
          ${cx + r * 0.26},${cy + r * 0.38}
          ${cx - r * 0.26},${cy + r * 0.38}
          ${cx - r * 0.42},${cy - r * 0.14}
        `}
        fill="rgba(0, 229, 255, 0.3)"
        stroke="#00f0ff"
        strokeWidth="1.5"
      />

      {/* Speichen zu den Waben am Rand */}
      <line x1={cx} y1={cy - r * 0.45} x2={cx} y2={cy - r * 0.9} stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.8" />
      <line x1={cx + r * 0.42} y1={cy - r * 0.14} x2={cx + r * 0.85} y2={cy - r * 0.3} stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.8" />
      <line x1={cx + r * 0.26} y1={cy + r * 0.38} x2={cx + r * 0.65} y2={cy + r * 0.72} stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.8" />
      <line x1={cx - r * 0.26} y1={cy + r * 0.38} x2={cx - r * 0.65} y2={cy + r * 0.72} stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.8" />
      <line x1={cx - r * 0.42} y1={cy - r * 0.14} x2={cx - r * 0.85} y2={cy - r * 0.3} stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.8" />

      {/* Rand-Polygone */}
      <path
        d={`M ${cx - r * 0.55} ${cy - r * 0.7} L ${cx} ${cy - r * 0.9} L ${cx + r * 0.55} ${cy - r * 0.7}`}
        fill="none"
        stroke="#00e5ff"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
      <path
        d={`M ${cx + r * 0.85} ${cy - r * 0.3} L ${cx + r * 0.92} ${cy + r * 0.2} L ${cx + r * 0.65} ${cy + r * 0.72}`}
        fill="none"
        stroke="#00e5ff"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
      <path
        d={`M ${cx - r * 0.85} ${cy - r * 0.3} L ${cx - r * 0.92} ${cy + r * 0.2} L ${cx - r * 0.65} ${cy + r * 0.72}`}
        fill="none"
        stroke="#00e5ff"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
      <path
        d={`M ${cx - r * 0.65} ${cy + r * 0.72} L ${cx} ${cy + r * 0.95} L ${cx + r * 0.65} ${cy + r * 0.72}`}
        fill="none"
        stroke="#00e5ff"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
    </g>
  );
}

export default function HolographicFussballCockpit({
  boardId,
  activeName,
  is1vs1 = true,
  activePlayer = 1,
  scoreP1,
  scoreP2,
  targetGoals = 5,
  ballPossession = 1,
  activeTarget,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicFussballProps) {
  // Name in Vorname und Nachname aufteilen für zweizeilige monumentale Typografie
  const nameParts = activeName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Sebastian';
  const lastName = nameParts.slice(1).join(' ') || 'Kirsch';

  // ===========================================================================
  // 3D ISOMETRISCHE TOR-GEOMETRIE (Exakt nach Soll-Bild 1)
  // ===========================================================================
  // Front-Rahmen (Vorderer Hauptrahmen zum Betrachter hin)
  const F_TL = { x: 145, y: 92 };
  const F_TR = { x: 535, y: 110 };
  const F_BL = { x: 145, y: 365 };
  const F_BR = { x: 525, y: 372 };

  // Hinterer Rahmen (In die Tiefe nach links versetzt)
  const B_TL = { x: 92, y: 96 };
  const B_TR = { x: 495, y: 122 };
  const B_BL = { x: 82, y: 350 };
  const B_BR = { x: 480, y: 356 };

  // 5 ZIELFELDER (Exakte Positionen im Tor aus Soll-Bild 1)
  const targets = {
    OBEN_L: { x: 215, y: 160 },
    UNTEN_L: { x: 215, y: 305 },
    MITTE: { x: 340, y: 235 },
    OBEN_R: { x: 480, y: 175 },
    UNTEN_R: { x: 472, y: 315 },
  };

  // Ball-Position aus Soll-Bild 1: Zwischen Mitte und rechtem oberen Pfosten schwebend
  const ballPos = { x: 412, y: 235 };

  // Hilfsfunktion: Interpolation zwischen zwei Punkten
  const lerp = (p1: { x: number; y: number }, p2: { x: number; y: number }, t: number) => ({
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  });

  return (
    <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-hidden select-none font-sans">
      {/* =================================================================== */}
      {/* 1. VOLUMETRISCHE SCHEINWERFER (GOD RAYS) & STADION-ATMOSPHÄRE */}
      {/* =================================================================== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Linker Scheinwerfer-Kegel (von oben links aufs Tor) */}
        <div className="absolute -top-36 left-[14%] w-[28vw] h-[135vh] bg-gradient-to-b from-cyan-400/30 via-cyan-500/08 to-transparent rotate-[20deg] blur-2xl opacity-75" />
        {/* Rechter Scheinwerfer-Kegel (von oben rechts aufs Tor) */}
        <div className="absolute -top-36 right-[14%] w-[28vw] h-[135vh] bg-gradient-to-b from-cyan-400/30 via-cyan-500/08 to-transparent -rotate-[20deg] blur-2xl opacity-75" />
        {/* Zentraler Sphärischer Cyber-Glow */}
        <div className="absolute top-[38%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-600/15 rounded-full blur-[140px]" />
        {/* Feines HUD-Raster im Raum */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:44px_44px] opacity-35" />
      </div>

      {/* =================================================================== */}
      {/* 2. ZENTRIERTE SCHWEBENDE GLASS-KAPSEL IM HEADER (1:1 SOLL-BILD 1) */}
      {/* =================================================================== */}
      <header className="relative z-30 w-full flex items-center justify-center pt-2 sm:pt-4">
        <div className="flex items-center justify-center gap-2.5 sm:gap-4 px-8 sm:px-14 py-2 sm:py-2.5 rounded-full bg-slate-900/65 backdrop-blur-3xl border-2 border-slate-600/50 shadow-[0_10px_35px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.4),0_0_25px_rgba(6,182,212,0.3)] text-xs sm:text-sm font-black font-mono tracking-widest text-white uppercase">
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
            className="relative z-10 w-[320px] sm:w-[380px] lg:w-[420px] h-[240px] sm:h-[270px] lg:h-[290px] rounded-[2.5rem] bg-slate-900/65 backdrop-blur-3xl border-2 border-slate-700/60 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.35),0_0_35px_rgba(6,182,212,0.2)] p-6 sm:p-8 flex items-center gap-5 -mr-10 overflow-hidden"
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
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border-2 border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.5)] text-[#00ff88] font-mono text-xs sm:text-sm font-black tracking-widest">
                  <span className="text-base sm:text-lg">⚽</span>
                  <span>BALLBESITZ</span>
                </span>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* ZENTRUM: 3D HOLOGRAPHISCHES WIREFRAME-TOR (1:1 SOLL-BILD 1) */}
          {/* --------------------------------------------------------------- */}
          <div className="relative z-20 w-[420px] h-[340px] sm:w-[500px] sm:h-[400px] lg:w-[600px] lg:h-[450px] shrink-0 flex items-center justify-center select-none pointer-events-none">
            {/* Tor Ambient Aura */}
            <div className="absolute inset-4 rounded-3xl bg-cyan-500/10 blur-3xl animate-pulse pointer-events-none" />

            {/* SVG 3D TOR-GEOMETRIE */}
            <svg
              viewBox="0 0 620 460"
              className="w-full h-full drop-shadow-[0_0_40px_rgba(0,229,255,0.6)] select-none pointer-events-none"
            >
              <defs>
                {/* Cyan Neon Glow für Torpfosten */}
                <filter id="goalNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {/* Cyber Ball Glow */}
                <filter id="cyanBallGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {/* Ball Radial Gradient */}
                <radialGradient id="ballSphereGrad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#c7f9ff" />
                  <stop offset="40%" stopColor="#00b4d8" />
                  <stop offset="85%" stopColor="#03045e" />
                  <stop offset="100%" stopColor="#001233" />
                </radialGradient>
              </defs>

              {/* =========================================================== */}
              {/* TOR-NETZ (3D PERSPEKTIVISCHES WIREFRAME-GITTER) */}
              {/* =========================================================== */}
              {/* 1. HINTERES NETZ: Horizontale Linien (16 Maschen) */}
              {Array.from({ length: 16 }).map((_, i) => {
                const t = (i + 1) / 17;
                const pLeft = lerp(B_TL, B_BL, t);
                const pRight = lerp(B_TR, B_BR, t);
                return (
                  <line
                    key={`h-net-${i}`}
                    x1={pLeft.x}
                    y1={pLeft.y}
                    x2={pRight.x}
                    y2={pRight.y}
                    stroke="#00e5ff"
                    strokeWidth="1"
                    strokeOpacity="0.3"
                  />
                );
              })}

              {/* 2. HINTERES NETZ: Vertikale Linien (24 Maschen) */}
              {Array.from({ length: 24 }).map((_, i) => {
                const t = (i + 1) / 25;
                const pTop = lerp(B_TL, B_TR, t);
                const pBottom = lerp(B_BL, B_BR, t);
                return (
                  <line
                    key={`v-net-${i}`}
                    x1={pTop.x}
                    y1={pTop.y}
                    x2={pBottom.x}
                    y2={pBottom.y}
                    stroke="#00e5ff"
                    strokeWidth="1"
                    strokeOpacity="0.3"
                  />
                );
              })}

              {/* 3. LINKES SEITEN-NETZ: Tiefenlinien von hinten nach vorne */}
              {Array.from({ length: 10 }).map((_, i) => {
                const t = (i + 1) / 11;
                const pBack = lerp(B_TL, B_BL, t);
                const pFront = lerp(F_TL, F_BL, t);
                return (
                  <line
                    key={`left-net-${i}`}
                    x1={pBack.x}
                    y1={pBack.y}
                    x2={pFront.x}
                    y2={pFront.y}
                    stroke="#00e5ff"
                    strokeWidth="1"
                    strokeOpacity="0.35"
                  />
                );
              })}

              {/* 4. OBERES DACH-NETZ: Tiefenlinien von hinten nach vorne */}
              {Array.from({ length: 18 }).map((_, i) => {
                const t = (i + 1) / 19;
                const pBack = lerp(B_TL, B_TR, t);
                const pFront = lerp(F_TL, F_TR, t);
                return (
                  <line
                    key={`top-net-${i}`}
                    x1={pBack.x}
                    y1={pBack.y}
                    x2={pFront.x}
                    y2={pFront.y}
                    stroke="#00e5ff"
                    strokeWidth="1"
                    strokeOpacity="0.35"
                  />
                );
              })}

              {/* =========================================================== */}
              {/* TOR-RAHMEN (3D PFOSTEN & QUERLATTE MIT NEON-GLOW) */}
              {/* =========================================================== */}
              {/* Hintere Pfosten & Querlatte (dünnere Stärke für Tiefenwirkung) */}
              <line x1={B_TL.x} y1={B_TL.y} x2={B_TR.x} y2={B_TR.y} stroke="#00e5ff" strokeWidth="2.5" strokeOpacity="0.6" />
              <line x1={B_TL.x} y1={B_TL.y} x2={B_BL.x} y2={B_BL.y} stroke="#00e5ff" strokeWidth="2.5" strokeOpacity="0.6" />
              <line x1={B_TR.x} y1={B_TR.y} x2={B_BR.x} y2={B_BR.y} stroke="#00e5ff" strokeWidth="2.5" strokeOpacity="0.6" />
              <line x1={B_BL.x} y1={B_BL.y} x2={B_BR.x} y2={B_BR.y} stroke="#00e5ff" strokeWidth="2" strokeOpacity="0.5" />

              {/* Tiefen-Verbindungsstreben (Seitliche Querverbindungen) */}
              <line x1={B_TL.x} y1={B_TL.y} x2={F_TL.x} y2={F_TL.y} stroke="#00f0ff" strokeWidth="4" filter="url(#goalNeonGlow)" />
              <line x1={B_TR.x} y1={B_TR.y} x2={F_TR.x} y2={F_TR.y} stroke="#00f0ff" strokeWidth="4" filter="url(#goalNeonGlow)" />
              <line x1={B_BL.x} y1={B_BL.y} x2={F_BL.x} y2={F_BL.y} stroke="#00f0ff" strokeWidth="4" filter="url(#goalNeonGlow)" />
              <line x1={B_BR.x} y1={B_BR.y} x2={F_BR.x} y2={F_BR.y} stroke="#00f0ff" strokeWidth="4" filter="url(#goalNeonGlow)" />

              {/* VORDERER HAUPTRAHMEN (Massiv leuchtende Pfosten & Latte) */}
              {/* Querlatte Oben */}
              <line x1={F_TL.x} y1={F_TL.y} x2={F_TR.x} y2={F_TR.y} stroke="#00f0ff" strokeWidth="5.5" filter="url(#goalNeonGlow)" />
              {/* Pfosten Links */}
              <line x1={F_TL.x} y1={F_TL.y} x2={F_BL.x} y2={F_BL.y} stroke="#00f0ff" strokeWidth="5.5" filter="url(#goalNeonGlow)" />
              {/* Pfosten Rechts */}
              <line x1={F_TR.x} y1={F_TR.y} x2={F_BR.x} y2={F_BR.y} stroke="#00f0ff" strokeWidth="5.5" filter="url(#goalNeonGlow)" />
              {/* Bodenlinie Vorne */}
              <line x1={F_BL.x} y1={F_BL.y} x2={F_BR.x} y2={F_BR.y} stroke="#00f0ff" strokeWidth="4" filter="url(#goalNeonGlow)" />

              {/* =========================================================== */}
              {/* 5 ZIELFELDER (KREISE MIT GOLDENEN HUD-ECKEN ⌜ ⌝ ⌞ ⌟) */}
              {/* =========================================================== */}
              {/* 1. Oben Links */}
              <g>
                <circle cx={targets.OBEN_L.x} cy={targets.OBEN_L.y} r="26" fill="rgba(0, 229, 255, 0.15)" stroke="#00f0ff" strokeWidth="2.5" />
                <circle cx={targets.OBEN_L.x} cy={targets.OBEN_L.y} r="18" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="3 3" />
                <HudBrackets cx={targets.OBEN_L.x} cy={targets.OBEN_L.y} size={33} />
              </g>

              {/* 2. Unten Links */}
              <g>
                <circle cx={targets.UNTEN_L.x} cy={targets.UNTEN_L.y} r="26" fill="rgba(0, 229, 255, 0.15)" stroke="#00f0ff" strokeWidth="2.5" />
                <circle cx={targets.UNTEN_L.x} cy={targets.UNTEN_L.y} r="18" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="3 3" />
                <HudBrackets cx={targets.UNTEN_L.x} cy={targets.UNTEN_L.y} size={33} />
              </g>

              {/* 3. Mitte (Hero-Zielfeld mit Fadenkreuz) */}
              <g>
                <circle cx={targets.MITTE.x} cy={targets.MITTE.y} r="32" fill="rgba(0, 229, 255, 0.2)" stroke="#00f0ff" strokeWidth="3" filter="url(#goalNeonGlow)" />
                <circle cx={targets.MITTE.x} cy={targets.MITTE.y} r="22" fill="none" stroke="#00f0ff" strokeWidth="1.8" />
                <circle cx={targets.MITTE.x} cy={targets.MITTE.y} r="12" fill="none" stroke="#00f0ff" strokeWidth="1.2" strokeDasharray="2 2" />
                {/* Fadenkreuz */}
                <line x1={targets.MITTE.x - 14} y1={targets.MITTE.y} x2={targets.MITTE.x + 14} y2={targets.MITTE.y} stroke="#00f0ff" strokeWidth="1.5" />
                <line x1={targets.MITTE.x} y1={targets.MITTE.y - 14} x2={targets.MITTE.x} y2={targets.MITTE.y + 14} stroke="#00f0ff" strokeWidth="1.5" />
                <HudBrackets cx={targets.MITTE.x} cy={targets.MITTE.y} size={39} />
              </g>

              {/* 4. Oben Rechts */}
              <g>
                <circle cx={targets.OBEN_R.x} cy={targets.OBEN_R.y} r="26" fill="rgba(0, 229, 255, 0.15)" stroke="#00f0ff" strokeWidth="2.5" />
                <circle cx={targets.OBEN_R.x} cy={targets.OBEN_R.y} r="18" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="3 3" />
                <HudBrackets cx={targets.OBEN_R.x} cy={targets.OBEN_R.y} size={33} />
              </g>

              {/* 5. Unten Rechts */}
              <g>
                <circle cx={targets.UNTEN_R.x} cy={targets.UNTEN_R.y} r="26" fill="rgba(0, 229, 255, 0.15)" stroke="#00f0ff" strokeWidth="2.5" />
                <circle cx={targets.UNTEN_R.x} cy={targets.UNTEN_R.y} r="18" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="3 3" />
                <HudBrackets cx={targets.UNTEN_R.x} cy={targets.UNTEN_R.y} size={33} />
              </g>

              {/* =========================================================== */}
              {/* 3D HOLOGRAPHISCHER CYBER-FUSSBALL (SCHWEBEND IM TOR) */}
              {/* =========================================================== */}
              <CyberBall cx={ballPos.x} cy={ballPos.y} r={26} />
            </svg>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* RECHTER FLÜGEL: SPIELSTAND & ZIEL-TORE (1:1 SOLL-BILD 1) */}
          {/* --------------------------------------------------------------- */}
          <div
            className="relative z-10 w-[320px] sm:w-[380px] lg:w-[420px] h-[240px] sm:h-[270px] lg:h-[290px] rounded-[2.5rem] bg-slate-900/65 backdrop-blur-3xl border-2 border-slate-700/60 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.35),0_0_35px_rgba(6,182,212,0.2)] p-6 sm:p-8 flex flex-col items-center justify-center text-center -ml-10 overflow-hidden"
          >
            {/* Oberer feiner Lichtglanzstreifen */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

            {/* Score & Zielbereich komplett zentriert */}
            <div className="flex flex-col items-center justify-center my-auto w-full">
              {/* Gigantischer Spielstand: 3 : 1 */}
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
