'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2 } from 'lucide-react';
import { UnifiedLiveState } from '@/app/api/live/board/route';
import HolographicStellenCheckenCockpit from '@/components/HolographicStellenCheckenCockpit';
import HolographicFussballCockpit from '@/components/HolographicFussballCockpit';
import HolographicCheckoutBattleCockpit from '@/components/HolographicCheckoutBattleCockpit';
import HolographicPdcChallengeCockpit from '@/components/HolographicPdcChallengeCockpit';
import HolographicScoringLeiterCockpit from '@/components/HolographicScoringLeiterCockpit';
import HolographicDarts99Cockpit from '@/components/HolographicDarts99Cockpit';
import HolographicTannenbaumCockpit from '@/components/HolographicTannenbaumCockpit';
import { createInitialPlayerState } from '@/app/special/tannenbaum/types';
import HolographicAdventskalenderCockpit from '@/components/HolographicAdventskalenderCockpit';
import {
  createInitialAdventsPlayerState,
  createShuffledDoors,
} from '@/app/special/adventskalender/types';
import HolographicRudolphCockpit from '@/components/HolographicRudolphCockpit';
import { createInitialRudolphPlayerState } from '@/app/special/rudolph/types';
import HolographicBingoCockpit from '@/components/HolographicBingoCockpit';
import {
  createBingoCard,
  createInitialBingoPlayerState,
} from '@/app/special/bingo/types';
import HolographicDartsGolfCockpit from '@/components/HolographicDartsGolfCockpit';
import {
  createInitialGolfPlayerState,
  generateGolfCourse,
} from '@/app/special/dartsgolf/types';
import HolographicDartsRallyCockpit from '@/components/HolographicDartsRallyCockpit';
import { createInitialRallyState } from '@/app/special/dartsrally/types';
import { getPlayerBySlug, isPlayerSlug } from '@/lib/playerSlugs';

interface UnifiedBoardLiveProps {
  initialBoardId?: string;
}

const TARGET_ANGLES: Record<string, { angle: number; color: string; label: string }> = {
  D20: { angle: 0, color: '#ff3366', label: 'Tops · Doppel 20' },
  D10: { angle: 108, color: '#ff3366', label: 'Halb-Tops · Doppel 10' },
  D16: { angle: 234, color: '#ff3366', label: 'Favorit · Doppel 16' },
  D8: { angle: 252, color: '#ff3366', label: 'Halb-16 · Doppel 8' },
  D4: { angle: 54, color: '#ff3366', label: 'Finish-Doppel · Doppel 4' },
};

// Hilfsfunktion zur Verhinderung von Race-Conditions und veralteten Geister-Paketen
function mergeIncomingLiveState(prev: UnifiedLiveState, incoming: UnifiedLiveState): UnifiedLiveState {
  if (!incoming || typeof incoming !== 'object') return prev;

  const isIncomingIdle =
    incoming.status === 'idle' ||
    incoming.gameType === 'idle' ||
    (incoming as any).reset === true;

  // 1. Standby / Reset Befehle IMMER sofort annehmen!
  if (isIncomingIdle) {
    return {
      ...incoming,
      status: 'idle',
      gameType: 'idle',
      updatedAt: incoming.updatedAt || Date.now(),
    };
  }

  // 2. Wenn incoming älter ist als der aktuellste Zeitstempel -> veraltetes Paket verwerfen!
  if (prev.updatedAt && incoming.updatedAt && incoming.updatedAt < prev.updatedAt) {
    return prev;
  }

  // 3. Schutz vor teilweisen / leeren Heartbeats: niemals bekannte Namen/Spieldaten überschreiben
  if (
    prev.status === 'playing' &&
    prev.sessionId === incoming.sessionId &&
    prev.gameType === incoming.gameType &&
    (!incoming.p1Name || (incoming as any).heartbeat === true)
  ) {
    return {
      ...prev,
      ...incoming,
      p1Name: incoming.p1Name || prev.p1Name,
      p2Name: incoming.p2Name || prev.p2Name,
    };
  }

  return incoming;
}

export default function UnifiedBoardLiveClient({ initialBoardId = '1' }: UnifiedBoardLiveProps) {
  const [boardId, setBoardId] = useState<string>(() => {
    const cleanInitial = (initialBoardId || '1').trim().toLowerCase();
    if (typeof window !== 'undefined' && cleanInitial === '1') {
      const saved = localStorage.getItem('lions_monitor_board');
      if (saved && (['1', '2', '3', '4', '5'].includes(saved) || isPlayerSlug(saved))) {
        return saved.toLowerCase();
      }
    }
    return cleanInitial;
  });
  const [liveState, setLiveState] = useState<UnifiedLiveState>({
    boardId: (initialBoardId || '1').trim().toLowerCase(),
    status: 'idle',
    gameType: 'idle',
    updatedAt: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const loadedUiVersionRef = useRef<string | null>(null);

  // Synchronisiere boardId mit URL / localStorage
  const handleSelectBoard = (b: string) => {
    setBoardId(b);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lions_monitor_board', b);
      window.history.replaceState(null, '', `/board/${b}`);
    }
  };

  // Digital-Uhr
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 1. BroadcastChannel Listener (für 0ms Latenz am selben Host)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(`lions_board_live_sync_${boardId}`);
        bc.onmessage = (event) => {
          if (event.data && typeof event.data === 'object') {
            setLiveState((prev) => mergeIncomingLiveState(prev, event.data));
          }
        };
      } catch (e) {}
    }
    return () => {
      bc?.close();
    };
  }, [boardId]);

  // 2. localStorage Event Listener
  useEffect(() => {
    const storageKey = `lions_board_live_sync_${boardId}`;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setLiveState((prev) => mergeIncomingLiveState(prev, parsed));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLiveState((prev) => mergeIncomingLiveState(prev, JSON.parse(raw)));
    } catch (err) {}
    return () => window.removeEventListener('storage', handleStorage);
  }, [boardId]);

  // 3. API Polling alle 1.0s für externe Smart-TVs / Fire TV Sticks mit Cache-Busting
  useEffect(() => {
    const pollApi = async () => {
      try {
        const res = await fetch(`/api/live/board?board=${boardId}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (data.uiVersion) {
              const incomingVersion = String(data.uiVersion);
              if (loadedUiVersionRef.current === null) {
                loadedUiVersionRef.current = incomingVersion;
              } else if (loadedUiVersionRef.current !== incomingVersion) {
                window.location.reload();
                return;
              }
            }
            setLiveState((prev) => mergeIncomingLiveState(prev, data));
          }
        }
      } catch (e) {}
    };

    pollApi();
    const interval = setInterval(pollApi, 1000);
    return () => clearInterval(interval);
  }, [boardId]);

  // 4. Client-Watchdog: Wenn seit mehr als 20 Sekunden keine Pakete mehr vom Tablet eintreffen -> Auto-Standby
  useEffect(() => {
    const watchdog = setInterval(() => {
      setLiveState((prev) => {
        if (
          prev.status === 'playing' &&
          prev.updatedAt &&
          Date.now() - prev.updatedAt > 20000
        ) {
          return {
            boardId,
            sessionId: 'idle',
            status: 'idle',
            gameType: 'idle',
            gameTitle: 'Warte auf Spielbeginn...',
            scoreP1: 0,
            scoreP2: 0,
            updatedAt: Date.now(),
          };
        }
        return prev;
      });
    }, 2000);
    return () => clearInterval(watchdog);
  }, [boardId]);

  const p1Name = (liveState.p1Name || 'Spieler 1').trim();
  const p2Name = (liveState.p2Name || 'Gastspieler').trim();
  const is1vs1 = liveState.gameMode === '1vs1';
  const activePlayer = liveState.activePlayer || 1;
  const activeName = is1vs1 ? (activePlayer === 1 ? p1Name : p2Name) : p1Name;
  const playerInfo = getPlayerBySlug(boardId);

  // =========================================================================
  // 1. STANDBY SCREEN (Wenn kein Spiel aktiv ist)
  // =========================================================================
  if (liveState.status === 'idle' || liveState.gameType === 'idle') {
    return (
      <div className="fixed inset-0 z-50 w-full h-full bg-[#040711] text-white flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none font-sans">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[20%] w-[55vw] h-[55vw] bg-cyan-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-15%] right-[15%] w-[45vw] h-[45vw] bg-emerald-600/10 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:40px_40px] opacity-40" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {playerInfo ? (
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-mono text-xs sm:text-sm font-bold tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  PERSÖNLICHER MONITOR
                </span>
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white font-mono uppercase">
                  {playerInfo.name} <span className="text-cyan-400">({playerInfo.slug.toUpperCase()})</span>
                </span>
              </div>
            ) : (
              <span className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 font-mono">
                BOARD {boardId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
            <span>{currentTime}</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8 my-auto">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-[400px] md:h-[400px] lg:w-[460px] lg:h-[460px] xl:w-[520px] xl:h-[520px] max-h-[48vh] filter drop-shadow-[0_0_70px_rgba(6,182,212,0.65)] transition-all">
            <Image src="/logo.png" alt="Lions Weyhausen" fill sizes="(max-width: 640px) 256px, (max-width: 1024px) 400px, 520px" className="object-contain" priority />
          </div>

          <div className="space-y-3 max-w-xl">
            <p className="text-xl sm:text-3xl text-cyan-300 font-mono tracking-widest animate-pulse font-black drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              {playerInfo
                ? `Warte auf Spielbeginn von ${playerInfo.name}...`
                : `Warte auf Spielbeginn am Board ${boardId}...`}
            </p>
            <span className="text-sm sm:text-base text-slate-300 block pt-1 font-medium">
              {playerInfo
                ? `Starte einfach am Tablet mit deinem Login (${playerInfo.name}). Dieser Bildschirm schaltet automatisch um.`
                : `Starte einfach ein beliebiges Spiel am Tablet. Der Bildschirm schaltet automatisch um.`}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-slate-400 font-mono mr-2">KANAL:</span>
            {['1', '2', '3', '4', '5'].map((b) => (
              <button
                key={b}
                onClick={() => handleSelectBoard(b)}
                className={`w-10 h-10 rounded-xl font-mono text-sm font-black transition-all cursor-pointer ${
                  boardId === b
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-110'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10'
                }`}
              >
                {b}
              </button>
            ))}
            {playerInfo && (
              <button
                key={playerInfo.slug}
                onClick={() => handleSelectBoard(playerInfo.slug)}
                className={`px-3 h-10 rounded-xl font-mono text-sm font-black transition-all cursor-pointer ${
                  boardId === playerInfo.slug
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10'
                }`}
              >
                {playerInfo.slug.toUpperCase()}
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 font-mono border-t border-white/10 pt-4">
          <span>{playerInfo ? `PERSÖNLICHER MONITOR · ${playerInfo.slug.toUpperCase()}` : 'AUTO-SWITCHING LIVE BOARD'}</span>
          <span>CHECKOUT BATTLE · PDC CHALLENGE · FUßBALL · STELLEN &amp; CHECKEN · SCORING-LEITER · 99 DARTS</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. SPIEL: CHECKOUT BATTLE (DOPPELQUOTE)
  // =========================================================================
  if (liveState.gameType === 'doppelquote') {
    const curTarget = liveState.currentTarget || 'D20';
    const activeStats = is1vs1
      ? activePlayer === 1
        ? liveState.p1Stats
        : liveState.p2Stats
      : liveState.p1Stats;
    const curQuote = activeStats?.quote ?? 0;
    const curHits = activeStats?.hits ?? 0;
    const curThrown = activeStats?.thrown ?? 0;

    return (
      <HolographicCheckoutBattleCockpit
        boardId={boardId}
        boardLabel={
          playerInfo ? `${playerInfo.slug.toUpperCase()} · ${playerInfo.name}` : undefined
        }
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        currentTarget={curTarget}
        currentRound={liveState.currentRound || 1}
        totalRounds={10}
        quote={curQuote}
        hits={curHits}
        thrown={curThrown}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 3. SPIEL: PDC CHALLENGE
  // =========================================================================
  if (liveState.gameType === 'pdc_challenge') {
    const curTarget = liveState.currentTarget || 'D20';
    const curScore = is1vs1 ? (activePlayer === 1 ? liveState.scoreP1 : liveState.scoreP2) ?? 0 : liveState.scoreP1 ?? 0;
    const curVisit = liveState.currentVisit || 1;
    const totalVisits = liveState.totalVisits || 26;

    return (
      <HolographicPdcChallengeCockpit
        boardId={boardId}
        boardLabel={playerInfo ? `${playerInfo.slug.toUpperCase()} · ${playerInfo.name}` : undefined}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        currentPart={(liveState.currentPart as 1 | 2 | 3) || 1}
        currentTarget={curTarget}
        currentScore={curScore}
        currentVisit={curVisit}
        totalVisits={totalVisits}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 4. SPIEL: FUßBALL DARTS (NEUES ARENA-COCKPIT)
  // =========================================================================
  if (liveState.gameType === 'fussball') {
    const scoreP1 = liveState.scoreP1 ?? 0;
    const scoreP2 = liveState.scoreP2 ?? 0;
    const targetGoals = liveState.targetGoals ?? 5;
    const ballPossession = liveState.ballPossession || 1;
    const activeFootballName = ballPossession === 1 ? p1Name : p2Name;
    const isFussball1vs1 = liveState.gameMode === '1vs1' || liveState.gameMode === '1vsComputer' || liveState.gameMode === 'bot' || (liveState.gameMode !== 'solo' && !!liveState.p2Name);

    return (
      <HolographicFussballCockpit
        boardId={boardId}
        boardLabel={playerInfo ? `${playerInfo.slug.toUpperCase()} · ${playerInfo.name}` : undefined}
        p1Name={p1Name}
        p2Name={p2Name}
        activeName={activeFootballName}
        is1vs1={isFussball1vs1}
        activePlayer={activePlayer}
        scoreP1={scoreP1}
        scoreP2={scoreP2}
        targetGoals={targetGoals}
        ballPossession={ballPossession as 1 | 2}
        fussballStats={liveState.fussballStats || liveState.fussballData?.stats}
        activeTarget={liveState.currentTarget}
        gameMode={liveState.gameMode}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 5. SPIEL: STELLEN & CHECKEN
  // =========================================================================
  if (liveState.gameType === 'stellen_checken') {
    const curNum = liveState.currentNumber ?? 64;
    const curRoute = liveState.recommendedRoute || 'T16 ➔ D8';
    const curChecks = is1vs1 ? (activePlayer === 1 ? liveState.p1Checks : liveState.p2Checks) ?? 0 : liveState.p1Checks ?? 0;
    const curVisit = liveState.currentVisit ?? 1;

    return (
      <HolographicStellenCheckenCockpit
        boardId={boardId}
        boardLabel={playerInfo ? `${playerInfo.slug.toUpperCase()} · ${playerInfo.name}` : undefined}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        currentVisit={curVisit}
        totalVisits={15}
        currentNumber={curNum}
        recommendedRoute={curRoute}
        checksCount={curChecks}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 6. SPIEL: SCORING-LEITER (41–140)
  // =========================================================================
  if (liveState.gameType === 'scoring_leiter') {
    return (
      <HolographicScoringLeiterCockpit
        boardId={boardId}
        boardLabel={playerInfo ? `${playerInfo.slug.toUpperCase()} · ${playerInfo.name}` : undefined}
        p1Name={p1Name}
        p2Name={p2Name}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        currentLevelIndex={liveState.currentLevelIndex ?? 0}
        currentNumber={liveState.currentNumber ?? 41}
        hitsInLevel={liveState.hitsInLevel ?? 0}
        levelVisits={Array.isArray(liveState.levelVisits) ? liveState.levelVisits : []}
        currentVisit={liveState.currentVisit ?? 1}
        eliminated={Boolean(liveState.eliminated)}
        clearedAll={Boolean(liveState.clearedAll)}
        p1LevelIndex={liveState.p1LevelIndex ?? liveState.currentLevelIndex ?? 0}
        p1HitsInLevel={liveState.p1HitsInLevel ?? 0}
        p1LevelVisits={Array.isArray(liveState.p1LevelVisits) ? liveState.p1LevelVisits : []}
        p1Eliminated={Boolean(liveState.p1Eliminated)}
        p1ClearedAll={Boolean(liveState.p1ClearedAll)}
        p2LevelIndex={liveState.p2LevelIndex ?? 0}
        p2HitsInLevel={liveState.p2HitsInLevel ?? 0}
        p2LevelVisits={Array.isArray(liveState.p2LevelVisits) ? liveState.p2LevelVisits : []}
        p2Eliminated={Boolean(liveState.p2Eliminated)}
        p2ClearedAll={Boolean(liveState.p2ClearedAll)}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 7. SPIEL: 99 DARTS CHALLENGE (20 / 19 / 18)
  // =========================================================================
  if (liveState.gameType === 'darts_99') {
    const d99 = liveState.darts99Data || {};
    const defaultStats = {
      totalPoints: 0,
      dartsThrown: 0,
      currentRound: 1,
      currentTurnDarts: [],
      singles: 0,
      doubles: 0,
      triples: 0,
      misses: 0,
      hitQuote: 0,
      pointsPerDart: 0,
      finished: false,
    };

    return (
      <HolographicDarts99Cockpit
        boardId={boardId}
        boardLabel={playerInfo ? `${playerInfo.slug.toUpperCase()} · ${playerInfo.name}` : undefined}
        p1Name={p1Name}
        p2Name={p2Name}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        targetNumber={Number(d99.targetNumber || liveState.currentNumber || 20)}
        p1Stats={d99.p1 || defaultStats}
        p2Stats={d99.p2 || defaultStats}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 8. SPIEL: LIONS TANNENBAUM
  // =========================================================================
  if (liveState.gameType === 'tannenbaum') {
    const tb = liveState.tannenbaumData || {};
    const fallbackPlayer = createInitialPlayerState();

    return (
      <HolographicTannenbaumCockpit
        boardId={boardId}
        p1Name={p1Name}
        p2Name={p2Name}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        roundNumber={Number(tb.roundNumber || liveState.currentRound || 1)}
        tripleExtinguishEnabled={tb.tripleExtinguishEnabled ?? true}
        starTarget={tb.starTarget === 'D20' ? 'D20' : 'BULL'}
        winCondition={tb.winCondition === 'all_11' ? 'all_11' : 'majority_6'}
        p1={tb.p1 || fallbackPlayer}
        p2={tb.p2 || fallbackPlayer}
        lastAction={tb.lastAction ?? null}
        winnerPlayer={tb.winnerPlayer ?? null}
        winnerName={tb.winnerName ?? null}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 9. SPIEL: DER VERHEXTE ADVENTSKALENDER
  // =========================================================================
  if (liveState.gameType === 'adventskalender') {
    const ak = liveState.adventskalenderData || {};
    const fallbackPlayer = createInitialAdventsPlayerState();
    const fallbackDoors = Array.isArray(ak.doors) && ak.doors.length === 24
      ? ak.doors
      : createShuffledDoors(is1vs1 ? '1vs1' : 'solo');

    return (
      <HolographicAdventskalenderCockpit
        boardId={boardId}
        p1Name={p1Name}
        p2Name={p2Name}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        roundNumber={Number(ak.roundNumber || liveState.currentRound || 1)}
        maxRounds={ak.maxRounds ?? null}
        isSuddenDeath={Boolean(ak.isSuddenDeath)}
        doors={fallbackDoors}
        p1={ak.p1 || fallbackPlayer}
        p2={ak.p2 || fallbackPlayer}
        lastAction={ak.lastAction ?? null}
        winnerPlayer={ak.winnerPlayer ?? null}
        winnerName={ak.winnerName ?? null}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 10. SPIEL: RUDOLPHS FLUG NACH WEYHAUSEN
  // =========================================================================
  if (liveState.gameType === 'rudolph') {
    const rd = liveState.rudolphData || {};
    const fallbackPlayer = createInitialRudolphPlayerState();

    return (
      <HolographicRudolphCockpit
        boardId={boardId}
        p1Name={p1Name}
        p2Name={p2Name}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        roundNumber={Number(rd.roundNumber || liveState.currentRound || 1)}
        finalTarget={
          rd.finalTarget === 'D20'
            ? 'D20'
            : rd.finalTarget === 'BULLSEYE'
            ? 'BULLSEYE'
            : 'BULL'
        }
        chaosEnabled={rd.chaosEnabled ?? true}
        routeId={rd.routeId}
        routeName={rd.routeName}
        routeDifficulty={rd.routeDifficulty}
        p1={rd.p1 || fallbackPlayer}
        p2={rd.p2 || fallbackPlayer}
        lastAction={rd.lastAction ?? null}
        winnerPlayer={rd.winnerPlayer ?? null}
        winnerName={rd.winnerName ?? null}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 11. SPIEL: WEIHNACHTS-BINGO
  // =========================================================================
  if (liveState.gameType === 'bingo') {
    const bg = liveState.bingoData || {};
    const fallbackCells = createBingoCard();
    const fallbackPlayer = createInitialBingoPlayerState(fallbackCells);

    return (
      <HolographicBingoCockpit
        boardId={boardId}
        p1Name={p1Name}
        p2Name={p2Name}
        activeName={activeName}
        is1vs1={is1vs1}
        activePlayer={activePlayer}
        roundNumber={Number(bg.roundNumber || liveState.currentRound || 1)}
        p1={bg.p1 || fallbackPlayer}
        p2={bg.p2 || fallbackPlayer}
        lastAction={bg.lastAction ?? null}
        winnerPlayer={bg.winnerPlayer ?? null}
        winnerName={bg.winnerName ?? null}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 12. SPIEL: LIONS DARTS-GOLF (18 HOLES)
  // =========================================================================
  if (liveState.gameType === 'dartsgolf') {
    const dg = liveState.dartsgolfData || {};
    const holesCount = dg.holesCount === 9 ? 9 : 18;
    const courseHoles =
      Array.isArray(dg.holes) && dg.holes.length > 0
        ? dg.holes
        : generateGolfCourse(holesCount);
    const fallbackPlayer = createInitialGolfPlayerState(courseHoles[0]?.startDistance || 90);

    return (
      <HolographicDartsGolfCockpit
        boardId={boardId}
        p1Name={p1Name}
        p2Name={p2Name || 'Computer'}
        activePlayer={activePlayer}
        holesCount={holesCount}
        currentHoleIndex={Number(dg.currentHoleIndex || 0)}
        coursePar={Number(dg.coursePar || (holesCount === 9 ? 36 : 72))}
        holes={courseHoles}
        isComputer={Boolean(dg.isComputer)}
        computerLevel={dg.computerLevel || 'clubmeister'}
        p1={dg.p1 || fallbackPlayer}
        p2={dg.p2 || fallbackPlayer}
        lastAction={dg.lastAction ?? null}
        winnerPlayer={dg.winnerPlayer ?? null}
        winnerName={dg.winnerName ?? null}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // =========================================================================
  // 13. SPIEL: DARTS RALLY
  // =========================================================================
  if (liveState.gameType === 'dartsrally') {
    const dr = liveState.dartsrallyData || {};
    const fallbackRally = createInitialRallyState({
      boardId,
      targetDistance:
        dr.targetDistance === 750 || dr.targetDistance === 1500
          ? dr.targetDistance
          : 1000,
      gameMode:
        dr.gameMode === 'board_vs_board' ? 'board_vs_board' : 'single_board',
    });

    const rallyState =
      dr && dr.team1 && dr.team2
        ? dr
        : {
            ...fallbackRally,
            team1: {
              ...fallbackRally.team1,
              score: Number(dr.teamRedScore ?? liveState.scoreP1 ?? 0),
            },
            team2: {
              ...fallbackRally.team2,
              score: Number(dr.teamGoldScore ?? liveState.scoreP2 ?? 0),
            },
            winnerTeam:
              dr.winnerTeam === 1 || dr.winnerTeam === 'red'
                ? 1
                : dr.winnerTeam === 2 || dr.winnerTeam === 'gold'
                ? 2
                : null,
          };

    return (
      <HolographicDartsRallyCockpit
        boardId={boardId}
        rally={rallyState}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    );
  }

  // Fallback
  return null;
}
