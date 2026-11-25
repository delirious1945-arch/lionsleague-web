'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Tv } from 'lucide-react';
import {
  getPlayerSlug,
  getPlayerBySlug,
  getBoardDisplayName,
  PlayerSlugEntry,
} from '@/lib/playerSlugs';

interface BoardSelectionPickerProps {
  activeBoard: string;
  onSelectBoard: (boardId: string) => void;
  currentUserName?: string | null;
  label?: string;
}

export default function BoardSelectionPicker({
  activeBoard,
  onSelectBoard,
  currentUserName,
  label = '📺 Oche / TV-Monitor zuweisen:',
}: BoardSelectionPickerProps) {
  const [player, setPlayer] = useState<PlayerSlugEntry | null>(null);

  useEffect(() => {
    let name = currentUserName;
    if (!name && typeof window !== 'undefined') {
      name = localStorage.getItem('lions_player_name');
    }
    if (name) {
      const slug = getPlayerSlug(name);
      setPlayer(getPlayerBySlug(slug));
    } else if (typeof window !== 'undefined') {
      const savedSlug = localStorage.getItem('lions_player_slug');
      if (savedSlug) {
        setPlayer(getPlayerBySlug(savedSlug));
      }
    }
  }, [currentUserName]);

  return (
    <div className="space-y-2 pt-2 border-t border-white/10 select-none">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span>{label}</span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono font-bold uppercase">
            {getBoardDisplayName(activeBoard)}
          </span>
        </label>
        <Link
          href={`/board/${activeBoard}`}
          target="_blank"
          className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 underline underline-offset-2 transition-colors"
          title={`TV-Monitor für ${getBoardDisplayName(activeBoard)} öffnen`}
        >
          <span>Monitor öffnen</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-1.5">
        {player && (
          <button
            type="button"
            onClick={() => onSelectBoard(player.slug)}
            className={`w-full min-h-[46px] py-2 px-3 rounded-xl border text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeBoard === player.slug
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.01]'
                : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/30'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>
              👤 Mein Monitor ({player.slug.toUpperCase()} · {player.name})
            </span>
          </button>
        )}

        <div className="grid grid-cols-5 gap-2">
          {['1', '2', '3', '4', '5'].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => onSelectBoard(b)}
              className={`min-h-[50px] py-2 px-3 rounded-xl border text-xs font-mono font-black transition-all cursor-pointer ${
                activeBoard === b
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30 scale-[1.02]'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10'
              }`}
            >
              Board {b}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
