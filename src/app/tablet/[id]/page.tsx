'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getPlayerBySlug, isPlayerSlug } from '@/lib/playerSlugs';

interface TabletPageProps {
  params: Promise<{ id: string }>;
}

export default function TabletShortcutPage({ params }: TabletPageProps) {
  const router = useRouter();
  const resolved = use(params);
  const rawId = resolved?.id || '1';
  const boardId = rawId.trim().toLowerCase();
  const player = getPlayerBySlug(boardId);

  useEffect(() => {
    try {
      localStorage.setItem('lions_tablet_board', boardId);
      localStorage.setItem('lions_active_board', boardId);
      localStorage.setItem('lions_active_board_pdc', boardId);
      localStorage.setItem('lions_active_board_fussball', boardId);
      localStorage.setItem('lions_active_board_stellen_checken', boardId);
      if (player) {
        localStorage.setItem('lions_player_slug', player.slug);
        localStorage.setItem('lions_player_name', player.name);
      }
    } catch (e) {}

    const timer = setTimeout(() => {
      router.replace(`/training?board=${boardId}`);
    }, 600);

    return () => clearTimeout(timer);
  }, [boardId, player, router]);

  return (
    <div className="fixed inset-0 z-50 bg-[#040711] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="relative w-32 h-32 mb-6 animate-pulse">
        <Image src="/logo.png" alt="Lions Weyhausen" fill className="object-contain" priority />
      </div>
      <div className="px-5 py-2 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-mono text-sm font-bold tracking-widest mb-3">
        {player ? 'PERSÖNLICHE SPIELER-ARRETIERUNG AKTIV' : 'TABLET-ZUWEISUNG AKTIV'}
      </div>
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
        Dieses Tablet ist jetzt fest arretiert an:
      </h1>
      <div className="text-5xl sm:text-7xl font-black font-mono text-cyan-400 drop-shadow-[0_0_35px_rgba(6,182,212,0.8)] my-4 uppercase">
        {player ? `${player.name} (${player.slug})` : `BOARD ${boardId}`}
      </div>
      <p className="text-sm text-slate-400 font-mono">
        Weiterleitung zum Trainingsbereich...
      </p>
    </div>
  );
}
