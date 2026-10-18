'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface PlayerRankItem {
  id: string;
  name: string;
  short: string;
  photo: string;
  team: string;
  score: number;
}

const ALL_LIONS_PLAYERS: Omit<PlayerRankItem, 'score'>[] = [
  { id: 'seb', name: 'Sebastian Kirste', short: 'S. Kirste', photo: '/players/Sebastian.png', team: 'Lions A' },
  { id: 'dirk', name: 'Dirk Ostermann', short: 'D. Ostermann', photo: '/players/Dirk.jpg', team: 'Lions A' },
  { id: 'andre', name: 'André Rathje', short: 'A. Rathje', photo: '/players/Andre.png', team: 'Lions B' },
  { id: 'kevin', name: 'Kevin Emde', short: 'K. Emde', photo: '/players/Kevin.jpg', team: 'Lions A' },
  { id: 'martin_t', name: 'Martin Thomas', short: 'M. Thomas', photo: '/players/Martin%20Thomas.jpg', team: 'Lions B' },
  { id: 'jens', name: 'Jens Goldmann', short: 'J. Goldmann', photo: '/players/Jens%20Goltermann.jpg', team: 'Lions B' },
  { id: 'erik', name: 'Erik Schremmer', short: 'E. Schremmer', photo: '/players/Erik%20Schremmer.jpg', team: 'Lions A' },
  { id: 'jannik', name: 'Jannik Beyer', short: 'J. Beyer', photo: '/players/Jannik.jpg', team: 'Lions B' },
  { id: 'michael_g', name: 'Michael Gehrt', short: 'M. Gehrt', photo: '/players/Michael%20Gehrt.jpg', team: 'Lions B' },
  { id: 'michael_k', name: 'Michael Kranz', short: 'M. Kranz', photo: '/players/Michael%20Kranz.png', team: 'Lions A' },
  { id: 'nick', name: 'Nick Kollas-Stedman', short: 'N. Stedman', photo: '/players/Nick.png', team: 'Lions B' },
  { id: 'karsten', name: 'Karsten Kohnert', short: 'K. Kohnert', photo: '/players/Karsten.png', team: 'Lions B' },
  { id: 'karen', name: 'Karen Schulz', short: 'K. Schulz', photo: '/players/Karen.png', team: 'Lions B' },
];

function getRandomRanking(): PlayerRankItem[] {
  // Zufällige Mischung der Lions-Spieler
  const shuffled = [...ALL_LIONS_PLAYERS].sort(() => 0.5 - Math.random());
  // Wähle die ersten 4
  const baseScores = [468, 442, 415, 389];
  return shuffled.slice(0, 4).map((p, idx) => ({
    ...p,
    score: baseScores[idx] + Math.floor(Math.random() * 9),
  }));
}

export default function DynamicRankingTileContent() {
  const [ranking, setRanking] = useState<PlayerRankItem[]>([]);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    // Erste Initialisierung client-seitig
    setRanking(getRandomRanking());

    // Sanfte Rotation alle 5 Sekunden: Neuer Stand, wer oben oder unten steht
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setRanking(getRandomRanking());
        setFade(true);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (ranking.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-[260px] sm:max-w-[290px] bg-slate-950/85 backdrop-blur-md rounded-2xl border border-amber-500/40 p-2.5 sm:p-3 shadow-[0_0_25px_rgba(245,158,11,0.25)] select-none">
      {/* Header der Scoreboard-Tafel */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/30">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300">
            LIONS LEAGUE TOP 4
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-400 font-bold">
          LIVE RANK
        </span>
      </div>

      {/* Rangliste mit echten Lions Spielern */}
      <div className={`space-y-1.5 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        {ranking.map((player, index) => {
          const rankColors = [
            'bg-amber-500 text-slate-950 font-black',
            'bg-slate-300 text-slate-950 font-bold',
            'bg-amber-700/80 text-amber-100 font-bold',
            'bg-slate-800 text-slate-400 font-semibold',
          ];

          return (
            <div
              key={`${player.id}-${index}`}
              className="flex items-center justify-between gap-2 p-1 sm:p-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Rang Ziffer */}
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] shrink-0 ${
                    rankColors[index] || 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {index + 1}
                </span>

                {/* Echtes Spielerfoto */}
                <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-amber-400/40 shrink-0 bg-slate-900">
                  <Image
                    src={player.photo}
                    alt={player.name}
                    fill
                    className="object-cover object-center"
                    sizes="28px"
                  />
                </div>

                {/* Name & Team */}
                <div className="min-w-0 truncate">
                  <div className="text-[11px] sm:text-xs font-bold text-white truncate leading-tight">
                    {player.short}
                  </div>
                  <div className="text-[9px] text-slate-400 font-semibold">
                    {player.team}
                  </div>
                </div>
              </div>

              {/* Punkte */}
              <div className="text-right shrink-0">
                <span className="text-[11px] sm:text-xs font-black font-mono text-amber-300">
                  {player.score}
                </span>
                <span className="text-[8px] text-slate-400 block -mt-0.5">Pkt</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
