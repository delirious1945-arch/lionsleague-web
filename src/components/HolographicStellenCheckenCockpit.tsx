'use client';

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export interface HolographicStellenCheckenProps {
  boardId: string;
  activeName: string;
  is1vs1?: boolean;
  activePlayer?: 1 | 2;
  currentVisit: number; // z.B. 4
  totalVisits?: number; // z.B. 15
  currentNumber: number; // z.B. 64
  recommendedRoute: string; // z.B. "T16 ➔ D8"
  checksCount: number; // z.B. 5
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// 20 Dartboard Segmente im Uhrzeigersinn ab 12:00 Uhr (0°)
const DARTBOARD_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

interface ParsedTarget {
  ring: 'triple' | 'double' | 'single' | 'bull';
  number: number;
}

// Hilfsfunktion: Ring-Sektor als SVG-Pfad
function getAnnularSectorPath(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  startDeg: number,
  endDeg: number
): string {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;

  const x1Out = cx + rOut * Math.sin(startRad);
  const y1Out = cy - rOut * Math.cos(startRad);
  const x2Out = cx + rOut * Math.sin(endRad);
  const y2Out = cy - rOut * Math.cos(endRad);

  const x1In = cx + rIn * Math.sin(startRad);
  const y1In = cy - rIn * Math.cos(startRad);
  const x2In = cx + rIn * Math.sin(endRad);
  const y2In = cy - rIn * Math.cos(endRad);

  return `M ${x1Out.toFixed(2)} ${y1Out.toFixed(2)} A ${rOut} ${rOut} 0 0 1 ${x2Out.toFixed(2)} ${y2Out.toFixed(2)} L ${x2In.toFixed(2)} ${y2In.toFixed(2)} A ${rIn} ${rIn} 0 0 0 ${x1In.toFixed(2)} ${y1In.toFixed(2)} Z`;
}

// Hilfsfunktion: Eck-Klammern (HUD Brackets ⌜ ⌝ ⌞ ⌟) um ein Segment
function getSectorCorners(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  startDeg: number,
  endDeg: number
) {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;

  return {
    c1Out: { x: cx + rOut * Math.sin(startRad), y: cy - rOut * Math.cos(startRad) },
    c2Out: { x: cx + rOut * Math.sin(endRad), y: cy - rOut * Math.cos(endRad) },
    c1In: { x: cx + rIn * Math.sin(startRad), y: cy - rIn * Math.cos(startRad) },
    c2In: { x: cx + rIn * Math.sin(endRad), y: cy - rIn * Math.cos(endRad) },
  };
}

// Route parsen: z.B. "T16 ➔ D8 (oder T14 ➔ D11)"
function parseRoute(routeStr: string): {
  primary: ParsedTarget[];
  secondary: ParsedTarget[];
  primaryTokens: string[];
} {
  const parts = routeStr.split(/\(oder\s*/i);
  const primaryText = parts[0].trim();
  const secondaryText = parts[1] ? parts[1].replace(/\)$/, '').trim() : '';

  const parseTokens = (text: string): { targets: ParsedTarget[]; tokens: string[] } => {
    const rawTokens = text.split(/➔|->|\s+/).map((t) => t.trim()).filter(Boolean);
    const targets: ParsedTarget[] = [];
    const tokens: string[] = [];

    for (const tok of rawTokens) {
      const upper = tok.toUpperCase();
      tokens.push(tok);
      if (upper.includes('BULL')) {
        targets.push({ ring: 'bull', number: 50 });
      } else if (upper.startsWith('T')) {
        const num = parseInt(upper.slice(1), 10);
        if (!isNaN(num) && num >= 1 && num <= 20) targets.push({ ring: 'triple', number: num });
      } else if (upper.startsWith('D')) {
        const num = parseInt(upper.slice(1), 10);
        if (!isNaN(num) && num >= 1 && num <= 20) targets.push({ ring: 'double', number: num });
      } else if (upper.startsWith('S')) {
        const num = parseInt(upper.slice(1), 10);
        if (!isNaN(num) && num >= 1 && num <= 25) targets.push({ ring: 'single', number: num });
      } else {
        const num = parseInt(upper, 10);
        if (!isNaN(num) && num >= 1 && num <= 20) targets.push({ ring: 'single', number: num });
      }
    }
    return { targets, tokens };
  };

  const p = parseTokens(primaryText);
  const s = secondaryText ? parseTokens(secondaryText) : { targets: [], tokens: [] };

  return {
    primary: p.targets,
    secondary: s.targets,
    primaryTokens: p.tokens,
  };
}

// Golden Lion Head Emblem (Königliches Wappen mit feinem Gold-Glow)
function GoldenLionHead({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff8cc" />
          <stop offset="25%" stopColor="#ffd700" />
          <stop offset="65%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#996515" />
        </linearGradient>
        <filter id="goldGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g filter="url(#goldGlowFilter)" fill="url(#goldGrad)">
        {/* Äußere Mähne */}
        <path d="M50 10 L54 19 L64 13 L63 24 L74 21 L70 31 L81 32 L74 40 L84 44 L75 51 L84 58 L74 62 L81 70 L70 71 L74 81 L63 78 L64 89 L54 83 L50 93 L46 83 L36 89 L37 78 L26 81 L30 71 L19 70 L26 62 L16 58 L25 51 L16 44 L26 40 L19 32 L30 31 L26 21 L37 24 L36 13 L46 19 Z" fillOpacity="0.9" />
        {/* Löwengesicht Kontur */}
        <path d="M50 26 C41 26 36 33 36 45 C36 57 43 67 50 73 C57 67 64 57 64 45 C64 33 59 26 50 26 Z" fillOpacity="0.95" />
        {/* Stirn-Spitzen */}
        <polygon points="50,29 46,37 54,37" fill="#fff9d6" />
        {/* Augen */}
        <path d="M42 44 C44 42 47 42 48 45 C46 46 43 46 42 44 Z" fill="#1e1810" />
        <path d="M58 44 C56 42 53 42 52 45 C54 46 57 46 58 44 Z" fill="#1e1810" />
        {/* Nase & Schnauze */}
        <polygon points="50,57 46,51 54,51" fill="#2a1f10" />
        <path d="M50 57 L50 63 M50 63 C46 63 44 61 43 59 M50 63 C54 63 56 61 57 59" stroke="#2a1f10" strokeWidth="2" strokeLinecap="round" />
        <circle cx="47" cy="60" r="1" fill="#fff" />
        <circle cx="53" cy="60" r="1" fill="#fff" />
      </g>
    </svg>
  );
}

export default function HolographicStellenCheckenCockpit({
  boardId,
  activeName,
  is1vs1 = false,
  activePlayer = 1,
  currentVisit,
  totalVisits = 15,
  currentNumber,
  recommendedRoute,
  checksCount,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicStellenCheckenProps) {
  // Name in 2 Zeilen aufteilen (wie "Sebastian Kirsch" im Soll-Bild)
  const nameParts = activeName.trim().split(' ');
  const firstName = nameParts[0] || 'Sebastian';
  const lastName = nameParts.slice(1).join(' ') || 'Kirsch';

  // Prozentquote: Exakt wie im Soll-Bild (5/15 = 33.3%)
  const checkPct = totalVisits > 0 ? ((checksCount / totalVisits) * 100).toFixed(1) : '0.0';

  // Route parsen
  const { primary, secondary, primaryTokens } = parseRoute(recommendedRoute);

  // Dartboard Geometrie (500 x 500 ViewBox, Zentrum 250, 250)
  const cx = 250;
  const cy = 250;
  const rDoubleIn = 186;
  const rDoubleOut = 206;
  const rTripleIn = 114;
  const rTripleOut = 138;
  const rSingleOuterIn = 138;
  const rSingleOuterOut = 186;
  const rSingleInnerIn = 40;
  const rSingleInnerOut = 114;

  // Hilfsfunktion: Ring-Radien für Target ermitteln
  const getRadiiForTarget = (ring: 'triple' | 'double' | 'single' | 'bull') => {
    if (ring === 'triple') return { rIn: rTripleIn, rOut: rTripleOut };
    if (ring === 'double') return { rIn: rDoubleIn, rOut: rDoubleOut };
    if (ring === 'bull') return { rIn: 0, rOut: 36 };
    return { rIn: rSingleOuterIn, rOut: rSingleOuterOut };
  };

  return (
    <div className="relative w-screen h-screen bg-[#040711] text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none font-sans">
      {/* =================================================================== */}
      {/* 1. VOLUMETRISCHE GOD RAYS & CYBER-ATMOSPHÄRE (EXAKT WIE IM SOLL) */}
      {/* =================================================================== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Tiefer Space-Hintergrund */}
        <div className="absolute inset-0 bg-[#040711]" />

        {/* Volumetrischer Lichtstrahl von links oben */}
        <div
          className="absolute -top-24 left-[10%] w-[480px] h-[900px] pointer-events-none opacity-45 mix-blend-screen"
          style={{
            background:
              'linear-gradient(145deg, rgba(6, 182, 212, 0.55) 0%, rgba(6, 182, 212, 0.12) 45%, transparent 75%)',
            clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
            filter: 'blur(32px)',
            transform: 'rotate(-8deg)',
          }}
        />

        {/* Volumetrischer Lichtstrahl von rechts oben */}
        <div
          className="absolute -top-24 right-[10%] w-[480px] h-[900px] pointer-events-none opacity-45 mix-blend-screen"
          style={{
            background:
              'linear-gradient(215deg, rgba(6, 182, 212, 0.55) 0%, rgba(6, 182, 212, 0.12) 45%, transparent 75%)',
            clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
            filter: 'blur(32px)',
            transform: 'rotate(8deg)',
          }}
        />

        {/* Zentraler Leuchtkegel hinter der holografischen Matrix */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full pointer-events-none opacity-70"
          style={{
            background:
              'radial-gradient(circle, rgba(0, 229, 255, 0.22) 0%, rgba(255, 51, 85, 0.15) 35%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Subtiles 48px HUD-Raster */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:48px_48px] opacity-35" />
      </div>

      {/* =================================================================== */}
      {/* 2. TOP HEADER: ZENTRIERTE, SCHWEBENDE GLASS-KAPSEL (WIE IM SOLL) */}
      {/* =================================================================== */}
      <header className="relative z-30 pt-2 flex items-center justify-center">
        <div className="px-8 sm:px-14 py-2.5 rounded-full bg-slate-900/60 backdrop-blur-3xl border-2 border-cyan-300/70 shadow-[0_0_35px_rgba(6,182,212,0.45),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center gap-3 text-xs sm:text-sm font-black font-mono tracking-widest text-cyan-200 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          <span>BOARD {boardId}</span>
          <span className="text-cyan-400/60">•</span>
          <span>LIONS WEYHAUSEN</span>
          <span className="text-cyan-400/60">•</span>
          <span>STELLEN &amp; CHECKEN</span>
          <span className="text-cyan-400/60">•</span>
          <span className="text-cyan-300">
            AUFNAHME {currentVisit}/{totalVisits}
          </span>
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
          {/* LINKER FLÜGEL: SPIELER-CARD MIT GOLD-RAHMEN & LÖWEN-WAPPEN */}
          {/* --------------------------------------------------------------- */}
          <div
            className="relative z-10 w-[300px] sm:w-[360px] lg:w-[410px] h-[220px] sm:h-[260px] lg:h-[280px] rounded-[2.5rem] bg-slate-900/50 backdrop-blur-3xl border-2 border-[#d4af37]/75 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.4),0_0_35px_rgba(212,175,55,0.25)] p-6 sm:p-8 flex items-center gap-5 -mr-10 overflow-hidden"
            style={{
              clipPath: 'polygon(0% 0%, 100% 4%, 96% 96%, 0% 100%)',
            }}
          >
            {/* Oberer goldener Glanzstreifen */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffd700]/70 to-transparent" />

            {/* Golden Lion Crest */}
            <div className="shrink-0 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]">
              <GoldenLionHead className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24" />
            </div>

            {/* Spielername & Status */}
            <div className="flex flex-col justify-center space-y-2">
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)]">
                  {firstName}
                </span>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)] mt-0.5">
                  {lastName}
                </span>
              </div>

              {/* Status Badge */}
              <div className="pt-1">
                <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/80 border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] text-cyan-300 font-mono text-xs sm:text-sm font-black tracking-widest">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ff3366] animate-pulse" />
                  <span>🎯 AM WURF</span>
                </span>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* ZENTRUM: HOLOGRAFISCHES DARTBOARD-RADAR (1:1 SOLL-BILD) */}
          {/* --------------------------------------------------------------- */}
          <div className="relative z-20 w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] lg:w-[490px] lg:h-[490px] shrink-0 flex items-center justify-center select-none pointer-events-none">
            {/* Äußerer Leuchtring */}
            <div className="absolute -inset-4 rounded-full bg-cyan-500/15 blur-2xl animate-pulse pointer-events-none" />

            {/* SVG RADAR DARTBOARD */}
            <svg
              viewBox="0 0 500 500"
              className="w-full h-full drop-shadow-[0_0_50px_rgba(0,229,255,0.5)] select-none pointer-events-none"
            >
              <defs>
                <filter id="cyanNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="coralNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Äußere HUD Rahmen-Kreise & Ticks */}
              <circle
                cx={cx}
                cy={cy}
                r="242"
                fill="none"
                stroke="#00e5ff"
                strokeWidth="1.5"
                strokeOpacity="0.3"
                strokeDasharray="4 8"
              />
              <circle
                cx={cx}
                cy={cy}
                r="214"
                fill="none"
                stroke="#00e5ff"
                strokeWidth="2"
                strokeOpacity="0.4"
              />

              {/* Fadenkreuz-Markierungen (0°, 90°, 180°, 270°) */}
              <line x1={cx} y1="2" x2={cx} y2="18" stroke="#00e5ff" strokeWidth="2.5" strokeOpacity="0.8" />
              <line x1={cx} y1="482" x2={cx} y2="498" stroke="#00e5ff" strokeWidth="2.5" strokeOpacity="0.8" />
              <line x1="2" y1={cy} x2="18" y2={cy} stroke="#00e5ff" strokeWidth="2.5" strokeOpacity="0.8" />
              <line x1="482" y1={cy} x2="498" y2={cy} stroke="#00e5ff" strokeWidth="2.5" strokeOpacity="0.8" />

              {/* 20 DARTBOARD NUMMERN ENTLANG DES ÄUSSEREN KREISES */}
              {DARTBOARD_NUMBERS.map((num, i) => {
                const ang = i * 18;
                const rad = (ang * Math.PI) / 180;
                const numX = cx + 228 * Math.sin(rad);
                const numY = cy - 228 * Math.cos(rad);
                return (
                  <text
                    key={num}
                    x={numX}
                    y={numY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#00e5ff"
                    fontSize="13"
                    fontFamily="monospace"
                    fontWeight="900"
                    fillOpacity="0.85"
                  >
                    {num}
                  </text>
                );
              })}

              {/* Dartboard-Dunkler Hintergrund */}
              <circle cx={cx} cy={cy} r={rDoubleOut} fill="rgba(4, 7, 17, 0.85)" />

              {/* 20 Radiale Speichenlinien */}
              {Array.from({ length: 20 }).map((_, i) => {
                const ang = i * 18 - 9;
                const rad = (ang * Math.PI) / 180;
                const x1 = cx + rSingleInnerIn * Math.sin(rad);
                const y1 = cy - rSingleInnerIn * Math.cos(rad);
                const x2 = cx + rDoubleOut * Math.sin(rad);
                const y2 = cy - rDoubleOut * Math.cos(rad);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#00e5ff"
                    strokeWidth="1"
                    strokeOpacity="0.25"
                  />
                );
              })}

              {/* Konzentrische Drähte / Ringe */}
              <circle cx={cx} cy={cy} r={rDoubleOut} fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.4" />
              <circle cx={cx} cy={cy} r={rDoubleIn} fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.4" />
              <circle cx={cx} cy={cy} r={rTripleOut} fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.35" />
              <circle cx={cx} cy={cy} r={rTripleIn} fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.35" />
              <circle cx={cx} cy={cy} r={rSingleInnerIn} fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.3" />

              {/* ============================================================= */}
              {/* TARGET HIGHLIGHTS: Primäre Zielsegmente (T16 & D8) */}
              {/* ============================================================= */}
              {primary.map((t, idx) => {
                if (t.ring === 'bull') {
                  return (
                    <circle
                      key={`prim-bull-${idx}`}
                      cx={cx}
                      cy={cy}
                      r="20"
                      fill="#ff3366"
                      stroke="#ff3366"
                      strokeWidth="3"
                      filter="url(#coralNeonGlow)"
                    />
                  );
                }
                const numIdx = DARTBOARD_NUMBERS.indexOf(t.number);
                if (numIdx === -1) return null;
                const centerAng = numIdx * 18;
                const startAng = centerAng - 9;
                const endAng = centerAng + 9;
                const { rIn, rOut } = getRadiiForTarget(t.ring);
                const pathD = getAnnularSectorPath(cx, cy, rIn, rOut, startAng, endAng);
                const corners = getSectorCorners(cx, cy, rIn, rOut, startAng, endAng);

                return (
                  <g key={`prim-${t.ring}-${t.number}-${idx}`}>
                    {/* Leuchtende Füllung & Kontur */}
                    <path
                      d={pathD}
                      fill="rgba(255, 51, 85, 0.45)"
                      stroke="#ff3366"
                      strokeWidth="3"
                      filter="url(#coralNeonGlow)"
                    />
                    {/* HUD Gold Corner Brackets ⌜ ⌝ ⌞ ⌟ */}
                    <circle cx={corners.c1Out.x} cy={corners.c1Out.y} r="2.5" fill="#ffd700" />
                    <circle cx={corners.c2Out.x} cy={corners.c2Out.y} r="2.5" fill="#ffd700" />
                    <circle cx={corners.c1In.x} cy={corners.c1In.y} r="2.5" fill="#ffd700" />
                    <circle cx={corners.c2In.x} cy={corners.c2In.y} r="2.5" fill="#ffd700" />
                  </g>
                );
              })}

              {/* Sekundäre Zielsegmente (falls vorhanden) */}
              {secondary.map((t, idx) => {
                const numIdx = DARTBOARD_NUMBERS.indexOf(t.number);
                if (numIdx === -1) return null;
                const centerAng = numIdx * 18;
                const startAng = centerAng - 9;
                const endAng = centerAng + 9;
                const { rIn, rOut } = getRadiiForTarget(t.ring);
                const pathD = getAnnularSectorPath(cx, cy, rIn, rOut, startAng, endAng);

                return (
                  <path
                    key={`sec-${t.ring}-${t.number}-${idx}`}
                    d={pathD}
                    fill="rgba(255, 170, 0, 0.25)"
                    stroke="#ffaa00"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                );
              })}

              {/* ============================================================= */}
              {/* ZENTRALER KERN: RESTPUNKTE (64) IN GIGANTISCHEM CYAN-GLOW */}
              {/* ============================================================= */}
              <circle
                cx={cx}
                cy={cy}
                r="78"
                fill="rgba(4, 7, 17, 0.92)"
                stroke="#00e5ff"
                strokeWidth="4"
                filter="url(#cyanNeonGlow)"
              />
              <circle
                cx={cx}
                cy={cy}
                r="70"
                fill="none"
                stroke="#ff3366"
                strokeWidth="2"
                strokeOpacity="0.75"
              />

              {/* Gigantische Rest-Zahl (64) */}
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#00f0ff"
                fontSize="68"
                fontFamily="monospace"
                fontWeight="900"
                filter="url(#cyanNeonGlow)"
              >
                {currentNumber}
              </text>
            </svg>

            {/* ============================================================= */}
            {/* GEDOCKTER ROUTEN-POD (T16 ➔ D8) AM UNTEREN RAND DES RADARS */}
            {/* ============================================================= */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-7 py-2 rounded-full bg-slate-950/95 border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.6)] flex items-center gap-2.5 z-30">
              {primaryTokens.map((tok, i) => {
                const isFinish = tok.toUpperCase().startsWith('D') || tok.toUpperCase().includes('BULL');
                return (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-white font-bold text-sm">➔</span>}
                    <span
                      className={`font-black font-mono tracking-wider ${
                        isFinish
                          ? 'text-[#ffd700] text-base sm:text-lg drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]'
                          : 'text-[#00f0ff] text-base sm:text-lg drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]'
                      }`}
                    >
                      {tok}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* RECHTER FLÜGEL: CHECKS & QUOTE MIT 15 FORTSCHRITTS-KAPSELN */}
          {/* --------------------------------------------------------------- */}
          <div
            className="relative z-10 w-[300px] sm:w-[360px] lg:w-[410px] h-[220px] sm:h-[260px] lg:h-[280px] rounded-[2.5rem] bg-slate-900/50 backdrop-blur-3xl border-2 border-[#d4af37]/75 shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.4),0_0_35px_rgba(212,175,55,0.25)] p-6 sm:p-8 flex flex-col justify-between -ml-10 overflow-hidden"
            style={{
              clipPath: 'polygon(4% 4%, 100% 0%, 100% 100%, 0% 96%)',
            }}
          >
            {/* Oberer goldener Glanzstreifen */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffd700]/70 to-transparent" />

            {/* Oberer Bereich: Gigantische Typografie (5 / 15 Checks & 33.3%) */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2.5">
                <span className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono text-[#00ff88] leading-none drop-shadow-[0_0_35px_rgba(0,255,136,0.8)]">
                  {checksCount}
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#00ff88] tracking-tight leading-none drop-shadow-[0_0_20px_rgba(0,255,136,0.5)]">
                  /{totalVisits} Checks
                </span>
              </div>

              <div className="pt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#ffd700] tracking-wider drop-shadow-[0_0_20px_rgba(255,215,0,0.7)]">
                  {checkPct}%
                </span>
              </div>
            </div>

            {/* Unterer Bereich: Exakt 15 Fortschritts-Kapseln (Pill-Dots) */}
            <div className="flex items-center gap-2 w-full pt-4">
              {Array.from({ length: totalVisits }).map((_, i) => {
                const isChecked = i < checksCount;
                return (
                  <div
                    key={i}
                    className={`h-3.5 flex-1 rounded-full transition-all duration-500 ${
                      isChecked
                        ? 'bg-[#00ff88] shadow-[0_0_15px_#00ff88,0_0_5px_#ffffff] border border-[#00ff88]'
                        : 'bg-slate-800/80 border border-white/10'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Unten: Absolut sauber ohne störende Ecken-Texte (wie im Soll-Bild 2) */}
      <div className="relative z-20 h-4" />
    </div>
  );
}
