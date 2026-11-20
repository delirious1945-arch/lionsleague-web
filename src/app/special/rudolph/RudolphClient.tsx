'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import { generateSessionId } from '@/lib/liveSession';
import {
  RudolphFinalTarget,
  RudolphLastActionBanner,
  RudolphPlayerState,
  cloneRudolphPlayerState,
  createInitialRudolphPlayerState,
  getRudolphCheckpoints,
} from './types';
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Target,
  Tv,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const CACHE_KEY = 'lions_active_rudolph_session_v1';

interface RudolphClientProps {
  players: Player[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

interface TurnSnapshot {
  activePlayer: 1 | 2;
  roundNumber: number;
  p1State: RudolphPlayerState;
  p2State: RudolphPlayerState;
  lastAction: RudolphLastActionBanner | null;
  winnerPlayer: 1 | 2 | null;
  isGameFinished: boolean;
}

type SoundKind = 'hit' | 'turbo' | 'win' | 'miss';

function createRudolphSound(kind: SoundKind) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      type: OscillatorType = 'sine',
      gainLevel = 0.12
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(gainLevel, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    if (kind === 'hit') {
      playTone(587.33, 0, 0.12, 'triangle', 0.12);
      playTone(880, 0.08, 0.18, 'sine', 0.13);
    } else if (kind === 'turbo') {
      playTone(523.25, 0, 0.11, 'triangle', 0.13);
      playTone(659.25, 0.08, 0.11, 'triangle', 0.13);
      playTone(783.99, 0.16, 0.14, 'triangle', 0.14);
      playTone(1046.5, 0.25, 0.28, 'sine', 0.15);
    } else if (kind === 'win') {
      playTone(523.25, 0, 0.14, 'triangle', 0.14);
      playTone(659.25, 0.11, 0.14, 'triangle', 0.14);
      playTone(783.99, 0.22, 0.16, 'triangle', 0.14);
      playTone(1046.5, 0.35, 0.42, 'sine', 0.16);
      playTone(1318.51, 0.5, 0.52, 'sine', 0.14);
    } else {
      playTone(175, 0, 0.14, 'sine', 0.08);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch {}
}

export default function RudolphClient({
  players,
  currentUser,
}: RudolphClientProps) {
  const validPlayers = players.filter((p) => !p.name.startsWith('Board '));
  const isBoardUser = Boolean(
    currentUser?.name && currentUser.name.trim().toLowerCase().startsWith('board')
  );
  const userPlayerMatch = validPlayers.find(
    (p) => p.name.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
  );
  const defaultP1 =
    !isBoardUser && userPlayerMatch
      ? userPlayerMatch.name
      : validPlayers[0]?.name || 'Sebastian Kirste';

  // Setup-State
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<'1vs1' | 'solo'>('1vs1');
  const [finalTarget, setFinalTarget] = useState<RudolphFinalTarget>('BULL');
  const [p1Name, setP1Name] = useState<string>(defaultP1);
  const [p2Name, setP2Name] = useState<string>(validPlayers[1]?.name || 'Gastspieler');
  const [isGuestP1, setIsGuestP1] = useState<boolean>(false);
  const [isGuestP2, setIsGuestP2] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // User-Arretierung im Solo-Modus (AGENTS.md §12.5)
  useEffect(() => {
    if (gameMode === 'solo' && !isBoardUser && userPlayerMatch) {
      setIsGuestP1(false);
      setP1Name(userPlayerMatch.name);
    }
  }, [gameMode, isBoardUser, userPlayerMatch]);

  // Spiel-State
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [p1State, setP1State] = useState<RudolphPlayerState>(createInitialRudolphPlayerState);
  const [p2State, setP2State] = useState<RudolphPlayerState>(createInitialRudolphPlayerState);
  const [lastAction, setLastAction] = useState<RudolphLastActionBanner | null>(null);
  const [winnerPlayer, setWinnerPlayer] = useState<1 | 2 | null>(null);
  const [undoStack, setUndoStack] = useState<TurnSnapshot[]>([]);

  // Crash- & Wisch-Schutz
  const [cachedSessionToResume, setCachedSessionToResume] = useState<any | null>(null);
  const [restoredFromCache, setRestoredFromCache] = useState<boolean>(false);

  // Board-Zuweisung
  const [activeBoard, setActiveBoard] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBoard = urlParams.get('board');
      if (urlBoard && ['1', '2', '3', '4', '5'].includes(urlBoard)) {
        return urlBoard;
      }
      return (
        localStorage.getItem('lions_tablet_board') ||
        localStorage.getItem('lions_active_board_rudolph') ||
        localStorage.getItem('lions_active_board') ||
        '1'
      );
    }
    return '1';
  });

  const [gameSessionId, setGameSessionId] = useState<string>(() =>
    generateSessionId('rudolph', activeBoard)
  );
  const liveBroadcastRef = useRef<BroadcastChannel | null>(null);

  const playSound = useCallback(
    (kind: SoundKind) => {
      if (soundEnabled) {
        createRudolphSound(kind);
      }
    },
    [soundEnabled]
  );

  const handleSelectBoard = (b: string) => {
    setActiveBoard(b);
    try {
      localStorage.setItem('lions_tablet_board', b);
      localStorage.setItem('lions_active_board', b);
      localStorage.setItem('lions_active_board_rudolph', b);
      window.history.replaceState(null, '', `/special/rudolph?board=${b}`);
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      liveBroadcastRef.current = new BroadcastChannel(`lions_rudolph_live_sync_${activeBoard}`);
    } catch {}
    return () => {
      liveBroadcastRef.current?.close();
    };
  }, [activeBoard]);

  // 1. Lokalen Cache beim Start prüfen
  useEffect(() => {
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (
          cached &&
          cached.isGameStarted &&
          !cached.isGameFinished &&
          (cached.p1State?.dartsThrown > 0 || cached.p2State?.dartsThrown > 0)
        ) {
          setCachedSessionToResume(cached);
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden des Rudolph-Caches:', e);
    }
  }, []);

  // Standby-Reset Helfer
  const sendStandbySignal = useCallback(
    (bId = activeBoard, sId = gameSessionId) => {
      try {
        const idlePayload = {
          boardId: bId,
          sessionId: sId,
          status: 'idle',
          reset: true,
          updatedAt: Date.now(),
        };
        liveBroadcastRef.current?.postMessage(idlePayload);
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const masterBc = new BroadcastChannel(`lions_board_live_sync_${bId}`);
          masterBc.postMessage(idlePayload);
          masterBc.close();
        }
        localStorage.setItem(`lions_board_live_sync_${bId}`, JSON.stringify(idlePayload));

        const payloadStr = JSON.stringify(idlePayload);
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/live/board', new Blob([payloadStr], { type: 'application/json' }));
        } else {
          fetch('/api/live/board', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadStr,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {}
    },
    [activeBoard, gameSessionId]
  );

  // Standby beim Verlassen / Unmount
  useEffect(() => {
    const handleUnload = () => sendStandbySignal();
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      sendStandbySignal();
    };
  }, [sendStandbySignal]);

  const buildLivePayload = useCallback(
    (
      finished: boolean,
      p1S: RudolphPlayerState,
      p2S: RudolphPlayerState,
      actPlayer: 1 | 2,
      rNum: number,
      banner: RudolphLastActionBanner | null,
      winPlayer: 1 | 2 | null,
      overrideSessionId?: string
    ) => {
      const winnerDisplayName = winPlayer === 1 ? p1Name : winPlayer === 2 ? p2Name : null;

      return {
        boardId: activeBoard,
        sessionId: overrideSessionId || gameSessionId,
        status: finished ? ('completed' as const) : ('playing' as const),
        gameType: 'rudolph' as const,
        gameTitle: 'Rudolphs Flug nach Weyhausen',
        gameMode,
        p1Name: p1Name.trim() || 'Spieler 1',
        p2Name: p2Name.trim() || 'Spieler 2',
        activePlayer: actPlayer,
        currentRound: rNum,
        scoreP1: p1S.completedSteps,
        scoreP2: p2S.completedSteps,
        winner: winnerDisplayName || undefined,
        rudolphData: {
          finalTarget,
          roundNumber: rNum,
          p1: p1S,
          p2: p2S,
          lastAction: banner,
          winnerPlayer: winPlayer,
          winnerName: winnerDisplayName,
        },
        updatedAt: Date.now(),
      };
    },
    [activeBoard, finalTarget, gameMode, gameSessionId, p1Name, p2Name]
  );

  // 4s Heartbeat solange aktiv oder im Sieger-Screen
  useEffect(() => {
    if (!isGameStarted && !isGameFinished) return;
    const interval = setInterval(() => {
      const payload = buildLivePayload(
        isGameFinished,
        p1State,
        p2State,
        activePlayer,
        roundNumber,
        lastAction,
        winnerPlayer
      );
      fetch('/api/live/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [
    isGameStarted,
    isGameFinished,
    buildLivePayload,
    p1State,
    p2State,
    activePlayer,
    roundNumber,
    lastAction,
    winnerPlayer,
  ]);

  const broadcastLiveState = useCallback(
    (
      started: boolean,
      finished: boolean,
      p1S: RudolphPlayerState,
      p2S: RudolphPlayerState,
      actPlayer: 1 | 2,
      rNum: number,
      banner: RudolphLastActionBanner | null,
      winPlayer: 1 | 2 | null,
      overrideSessionId?: string
    ) => {
      if (!started && !finished) return;
      const payload = buildLivePayload(
        finished,
        p1S,
        p2S,
        actPlayer,
        rNum,
        banner,
        winPlayer,
        overrideSessionId
      );

      try {
        liveBroadcastRef.current?.postMessage(payload);
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const masterBc = new BroadcastChannel(`lions_board_live_sync_${activeBoard}`);
          masterBc.postMessage(payload);
          masterBc.close();
        }
        localStorage.setItem(`lions_board_live_sync_${activeBoard}`, JSON.stringify(payload));
        fetch('/api/live/board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch {}
    },
    [activeBoard, buildLivePayload]
  );

  useEffect(() => {
    if (isGameStarted || isGameFinished) {
      broadcastLiveState(
        isGameStarted,
        isGameFinished,
        p1State,
        p2State,
        activePlayer,
        roundNumber,
        lastAction,
        winnerPlayer
      );
    }
  }, [
    isGameStarted,
    isGameFinished,
    p1State,
    p2State,
    activePlayer,
    roundNumber,
    lastAction,
    winnerPlayer,
    broadcastLiveState,
  ]);

  // Atomarer Cache nach jedem Wurf
  useEffect(() => {
    if (
      isGameStarted &&
      !isGameFinished &&
      (p1State.dartsThrown > 0 || p2State.dartsThrown > 0)
    ) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            isGameStarted,
            isGameFinished,
            gameMode,
            finalTarget,
            p1Name,
            p2Name,
            isGuestP1,
            isGuestP2,
            activePlayer,
            roundNumber,
            p1State,
            p2State,
            lastAction,
            winnerPlayer,
            undoStack,
            gameSessionId,
            activeBoard,
            updatedAt: Date.now(),
          })
        );
      } catch {}
    }
  }, [
    isGameStarted,
    isGameFinished,
    gameMode,
    finalTarget,
    p1Name,
    p2Name,
    isGuestP1,
    isGuestP2,
    activePlayer,
    roundNumber,
    p1State,
    p2State,
    lastAction,
    winnerPlayer,
    undoStack,
    gameSessionId,
    activeBoard,
  ]);

  // Spiel starten
  const handleStartGame = () => {
    const cleanP1 = p1Name.trim() || 'Spieler 1';
    const cleanP2 = p2Name.trim() || 'Gastspieler';
    setP1Name(cleanP1);
    setP2Name(cleanP2);

    const freshId = generateSessionId('rudolph', activeBoard);
    const initP1 = createInitialRudolphPlayerState();
    const initP2 = createInitialRudolphPlayerState();
    const startBanner: RudolphLastActionBanner = {
      id: Date.now(),
      tone: 'info',
      icon: '🛫',
      headline: 'FREIGABE ZUM ABFLUG!',
      subline:
        gameMode === '1vs1'
          ? `${cleanP1} eröffnet das Rentier-Rennen gegen ${cleanP2}! Ziel 1: Nordpol (20)!`
          : `${cleanP1} hebt vom Nordpol ab! Ziel 1: die 20!`,
      actorPlayer: 1,
    };

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setCachedSessionToResume(null);
    setRestoredFromCache(false);
    setGameSessionId(freshId);
    setP1State(initP1);
    setP2State(initP2);
    setActivePlayer(1);
    setRoundNumber(1);
    setWinnerPlayer(null);
    setUndoStack([]);
    setLastAction(startBanner);
    setIsGameFinished(false);
    setIsGameStarted(true);

    broadcastLiveState(true, false, initP1, initP2, 1, 1, startBanner, null, freshId);
  };

  // Wiederherstellung aus Cache
  const handleResumeCachedGame = () => {
    if (!cachedSessionToResume) return;
    const c = cachedSessionToResume;
    if (c.activeBoard && ['1', '2', '3', '4', '5'].includes(c.activeBoard)) {
      setActiveBoard(c.activeBoard);
    }
    setGameMode(c.gameMode === 'solo' ? 'solo' : '1vs1');
    setFinalTarget(c.finalTarget === 'D20' ? 'D20' : 'BULL');
    setP1Name(c.p1Name || defaultP1);
    setP2Name(c.p2Name || 'Gastspieler');
    setIsGuestP1(Boolean(c.isGuestP1));
    setIsGuestP2(Boolean(c.isGuestP2));
    setActivePlayer(c.activePlayer === 2 ? 2 : 1);
    setRoundNumber(Number(c.roundNumber || 1));
    setP1State(c.p1State || createInitialRudolphPlayerState());
    setP2State(c.p2State || createInitialRudolphPlayerState());
    setLastAction(c.lastAction ?? null);
    setWinnerPlayer(c.winnerPlayer ?? null);
    setUndoStack(Array.isArray(c.undoStack) ? c.undoStack : []);
    setGameSessionId(c.gameSessionId || generateSessionId('rudolph', activeBoard));
    setIsGameFinished(false);
    setIsGameStarted(true);
    setRestoredFromCache(true);
    setCachedSessionToResume(null);
  };

  const handleDiscardCachedGame = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setCachedSessionToResume(null);
    setRestoredFromCache(false);
  };

  // Zurück zum Setup
  const handleAbortToSetup = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setIsGameStarted(false);
    setIsGameFinished(false);
    setWinnerPlayer(null);
    setUndoStack([]);
    sendStandbySignal();
  };

  // Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setActivePlayer(prev.activePlayer);
    setRoundNumber(prev.roundNumber);
    setP1State(cloneRudolphPlayerState(prev.p1State));
    setP2State(cloneRudolphPlayerState(prev.p2State));
    setLastAction(prev.lastAction);
    setWinnerPlayer(prev.winnerPlayer);
    setIsGameFinished(prev.isGameFinished);
    setIsGameStarted(true);
  };

  const pushSnapshot = () => {
    const snap: TurnSnapshot = {
      activePlayer,
      roundNumber,
      p1State: cloneRudolphPlayerState(p1State),
      p2State: cloneRudolphPlayerState(p2State),
      lastAction,
      winnerPlayer,
      isGameFinished,
    };
    setUndoStack((prev) => [...prev.slice(-49), snap]);
  };

  const commitTurnStep = (
    nextP1: RudolphPlayerState,
    nextP2: RudolphPlayerState,
    banner: RudolphLastActionBanner,
    winPlayer: 1 | 2 | null
  ) => {
    const ownAfter = activePlayer === 1 ? nextP1 : nextP2;
    let nextActive: 1 | 2 = activePlayer;
    let nextRound = roundNumber;

    if (winPlayer !== null) {
      ownAfter.roundsPlayed += 1;
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {}
    } else if (ownAfter.currentTurnDarts.length >= 3) {
      ownAfter.roundsPlayed += 1;
      if (gameMode === '1vs1') {
        if (activePlayer === 1) {
          nextActive = 2;
          nextP2.currentTurnDarts = [];
        } else {
          nextActive = 1;
          nextRound = roundNumber + 1;
          nextP1.currentTurnDarts = [];
        }
      } else {
        nextRound = roundNumber + 1;
        nextP1.currentTurnDarts = [];
      }
    }

    setP1State(nextP1);
    setP2State(nextP2);
    setActivePlayer(nextActive);
    setRoundNumber(nextRound);
    setLastAction(banner);
    setWinnerPlayer(winPlayer);
    setIsGameFinished(winPlayer !== null);
  };

  const checkpoints = getRudolphCheckpoints(finalTarget);

  // A) Checkpoint geschafft!
  const handleCheckpointHit = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = cloneRudolphPlayerState(p1State);
    const nextP2 = cloneRudolphPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    if (own.currentTurnDarts.length >= 3) own.currentTurnDarts = [];

    const clearedIndex = own.completedSteps; // 0..4
    const cp = checkpoints[Math.min(4, clearedIndex)];
    own.completedSteps = Math.min(5, own.completedSteps + 1);
    own.dartsThrown += 1;

    const isLandingWin = own.completedSteps >= 5;
    own.currentTurnDarts.push({
      kind: isLandingWin ? 'win' : 'hit',
      checkpointStep: cp.step,
      label: `${cp.icon} ${cp.targetLabel}`,
      subLabel: isLandingWin ? '🏆 LANDUNG!' : `Etappe ${cp.step}/5`,
    });

    const hitsInTurn = own.currentTurnDarts.filter(
      (d) => d.kind === 'hit' || d.kind === 'win'
    ).length;
    if (hitsInTurn > own.bestTurnSteps) {
      own.bestTurnSteps = hitsInTurn;
    }

    const isTurboTurn = !isLandingWin && hitsInTurn === 3;
    let banner: RudolphLastActionBanner;

    if (isLandingWin) {
      playSound('win');
      banner = {
        id: Date.now(),
        tone: 'win',
        icon: '🏆',
        headline: 'LANDUNG IN WEYHAUSEN!',
        subline: `${activeName} landet sicher auf der Lions-Landebahn (${cp.targetLabel}) und gewinnt!`,
        actorPlayer: activePlayer,
      };
      commitTurnStep(nextP1, nextP2, banner, activePlayer);
      return;
    }

    if (isTurboTurn) {
      playSound('turbo');
      const nextCp = checkpoints[own.completedSteps];
      banner = {
        id: Date.now(),
        tone: 'turbo',
        icon: '🚀',
        headline: 'TURBO-FLUG! 3 ETAPPEN!',
        subline: `${activeName} fliegt in einer Aufnahme durch 3 Checkpoints! Nächstes Ziel: ${nextCp.targetLabel}`,
        actorPlayer: activePlayer,
      };
    } else {
      playSound('hit');
      const nextCp = checkpoints[own.completedSteps];
      banner = {
        id: Date.now(),
        tone: 'hit',
        icon: '🦌',
        headline: `${cp.location.toUpperCase()} ÜBERFLOGEN!`,
        subline: `${activeName} trifft ${cp.targetLabel} — nächster Halt: ${nextCp.location} (${nextCp.targetLabel})!`,
        actorPlayer: activePlayer,
      };
    }

    commitTurnStep(nextP1, nextP2, banner, null);
  };

  // B) Einzelner Dart Miss
  const handleMiss = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = cloneRudolphPlayerState(p1State);
    const nextP2 = cloneRudolphPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    if (own.currentTurnDarts.length >= 3) own.currentTurnDarts = [];
    const curCp = checkpoints[Math.min(4, own.completedSteps)];

    own.dartsThrown += 1;
    own.currentTurnDarts.push({
      kind: 'miss',
      label: 'MISS',
      subLabel: 'Kein Weiterflug',
    });

    playSound('miss');
    const banner: RudolphLastActionBanner = {
      id: Date.now(),
      tone: 'miss',
      icon: '✕',
      headline: 'GEGENWIND!',
      subline: `${activeName} verfehlt ${curCp.targetLabel} (${curCp.location}).`,
      actorPlayer: activePlayer,
    };

    commitTurnStep(nextP1, nextP2, banner, null);
  };

  // C) Restliche Darts Miss
  const handleRestMiss = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = cloneRudolphPlayerState(p1State);
    const nextP2 = cloneRudolphPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    const existing = own.currentTurnDarts.length >= 3 ? 0 : own.currentTurnDarts.length;
    if (existing === 0) own.currentTurnDarts = [];
    const remaining = Math.max(1, 3 - existing);
    const curCp = checkpoints[Math.min(4, own.completedSteps)];

    own.dartsThrown += remaining;
    for (let i = 0; i < remaining; i += 1) {
      own.currentTurnDarts.push({
        kind: 'miss',
        label: 'MISS',
        subLabel: 'Kein Weiterflug',
      });
    }

    playSound('miss');
    const banner: RudolphLastActionBanner = {
      id: Date.now(),
      tone: 'miss',
      icon: '✕',
      headline: 'AUFNAHME VORBEI',
      subline: `${activeName} bleibt vorerst bei ${curCp.location} (${curCp.targetLabel}).`,
      actorPlayer: activePlayer,
    };

    commitTurnStep(nextP1, nextP2, banner, null);
  };

  // =========================================================================
  // ANSICHT 1: SETUP-BILDSCHIRM
  // =========================================================================
  if (!isGameStarted) {
    const soloLocked = gameMode === 'solo' && !isBoardUser && Boolean(userPlayerMatch);

    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6 space-y-5 animate-fadeIn">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
          <Link
            href={`/special?board=${activeBoard}`}
            data-ui-id="RUDOLPH.SETUP.BACK_BTN"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zur Event-Arena</span>
          </Link>

          <Link
            href={`/board/${activeBoard}`}
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-xs font-bold transition-all"
          >
            <Tv className="w-4 h-4 text-cyan-400" />
            <span>TV-Monitor Board {activeBoard}</span>
          </Link>
        </div>

        {/* Crash- & Wisch-Schutz */}
        {cachedSessionToResume && (
          <div
            data-ui-id="RUDOLPH.RESUME.DIALOG"
            className="rounded-3xl p-5 sm:p-6 bg-amber-950/60 border-2 border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.3)] space-y-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-amber-200">
                  Unterbrochenes Spiel gefunden!
                </h2>
                <p className="text-xs sm:text-sm text-amber-100/90 mt-1">
                  <strong>{cachedSessionToResume.p1Name}</strong> (Etappe{' '}
                  {cachedSessionToResume.p1State?.completedSteps ?? 0}/5)
                  {cachedSessionToResume.gameMode === '1vs1' && (
                    <>
                      {' '}vs. <strong>{cachedSessionToResume.p2Name}</strong> (Etappe{' '}
                      {cachedSessionToResume.p2State?.completedSteps ?? 0}/5)
                    </>
                  )}{' '}
                  • Runde {cachedSessionToResume.roundNumber || 1}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleResumeCachedGame}
                className="min-h-[56px] px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm sm:text-base transition-all cursor-pointer shadow-lg"
              >
                ▶ Spiel jetzt fortsetzen
              </button>
              <button
                type="button"
                onClick={handleDiscardCachedGame}
                className="min-h-[56px] px-5 py-3 rounded-2xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/50 font-black text-sm sm:text-base transition-all cursor-pointer"
              >
                ✕ Spiel verwerfen &amp; Neu beginnen
              </button>
            </div>
          </div>
        )}

        {/* Haupt-Setup Karte */}
        <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-[#081a24]/90 via-slate-900/95 to-[#1f1207]/90 border-2 border-cyan-500/40 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-3xl">
                🦌
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Rudolphs Flug nach Weyhausen
                </h1>
                <p className="text-xs sm:text-sm text-cyan-300 font-semibold">
                  5 Checkpoints vom Nordpol ins Vereinsheim · Treffer schaltet sofort weiter!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {['1', '2', '3', '4', '5'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleSelectBoard(b)}
                  className={`min-w-[44px] min-h-[44px] rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                    activeBoard === b
                      ? 'bg-cyan-400 text-slate-950 shadow-lg'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-white/10'
                  }`}
                >
                  B{b}
                </button>
              ))}
            </div>
          </div>

          {/* Spielmodus */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-black uppercase tracking-wider text-slate-300 block">
              Spielmodus
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameMode('1vs1')}
                className={`min-h-[56px] px-4 py-3 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  gameMode === '1vs1'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>1 vs. 1 Duell (Wettrennen)</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('solo')}
                className={`min-h-[56px] px-4 py-3 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  gameMode === 'solo'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Solo-Flug</span>
              </button>
            </div>
          </div>

          {/* Spielerauswahl */}
          <div className={`grid gap-4 ${gameMode === '1vs1' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-mono font-black uppercase tracking-wider text-red-300">
                  {gameMode === '1vs1' ? 'Schlitten 1 · Rot' : 'Pilot'}
                </label>
                {!soloLocked && (
                  <button
                    type="button"
                    onClick={() => setIsGuestP1((v) => !v)}
                    className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                  >
                    {isGuestP1 ? 'Aus Vereinsliste wählen' : 'Gastname eingeben'}
                  </button>
                )}
              </div>

              {soloLocked ? (
                <div className="min-h-[52px] px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-400/50 flex items-center justify-between gap-2">
                  <span className="font-black text-white text-sm sm:text-base">{p1Name}</span>
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950">
                    ✓ Angemeldet · Fest fixiert
                  </span>
                </div>
              ) : isGuestP1 ? (
                <input
                  type="text"
                  value={p1Name}
                  onChange={(e) => setP1Name(e.target.value)}
                  placeholder="Gastname eingeben..."
                  className="w-full min-h-[52px] px-4 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-red-400"
                />
              ) : (
                <select
                  value={p1Name}
                  onChange={(e) => setP1Name(e.target.value)}
                  className="w-full min-h-[52px] px-4 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-red-400 cursor-pointer"
                >
                  {validPlayers.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.team})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {gameMode === '1vs1' && (
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-mono font-black uppercase tracking-wider text-amber-300">
                    Schlitten 2 · Gold
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsGuestP2((v) => !v)}
                    className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                  >
                    {isGuestP2 ? 'Aus Vereinsliste wählen' : 'Gastname eingeben'}
                  </button>
                </div>

                {isGuestP2 ? (
                  <input
                    type="text"
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    placeholder="Gastname eingeben..."
                    className="w-full min-h-[52px] px-4 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                  />
                ) : (
                  <select
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    className="w-full min-h-[52px] px-4 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {validPlayers.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.team})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Finale Landeziel-Wahl */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-amber-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>Landeziel in Weyhausen (Etappe 5)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Der entscheidende Treffer zur Landung am Vereinsheim
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(['BULL', 'D20'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFinalTarget(t)}
                  className={`min-h-[48px] px-4 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                    finalTarget === t
                      ? 'bg-amber-400 text-slate-950 shadow-lg'
                      : 'bg-slate-900 text-slate-300 border border-white/15'
                  }`}
                >
                  {t === 'BULL' ? 'BULL (25/50)' : 'D20 (Tops)'}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartGame}
            data-ui-id="RUDOLPH.SETUP.START_BTN"
            className="w-full min-h-[60px] py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>🦌 Schlitten beladen &amp; Abflug starten</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ANSICHT 2: AKTIVES SPIEL (TABLET-OBERFLÄCHE)
  // =========================================================================
  const ownState = activePlayer === 1 ? p1State : p2State;
  const ownName = activePlayer === 1 ? p1Name : p2Name;
  const activeCp = checkpoints[Math.min(4, ownState.completedSteps)];
  const isFinalStep = ownState.completedSteps === 4;

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-5 space-y-4 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/80 border border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAbortToSetup}
            className="min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Event-Arena / Abbruch</span>
          </button>

          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 font-mono text-xs font-black">
            BOARD {activeBoard}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/35 text-amber-200 font-mono text-xs font-black">
            RUNDE {roundNumber}
          </span>
          {restoredFromCache && (
            <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
              ✓ Wiederhergestellt
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </div>

      {/* Hilfe-Box */}
      {showHelp && (
        <div className="rounded-2xl p-4 bg-slate-900/95 border border-cyan-400/40 text-xs sm:text-sm text-slate-200 space-y-1.5">
          <div className="font-black text-cyan-300">🦌 Spielregeln: Rudolphs Flug nach Weyhausen</div>
          <p>
            1. Fliege nacheinander durch alle 5 Checkpoints: <strong>1. 20</strong> (Nordpol) ➔{' '}
            <strong>2. Grünes Feld</strong> (Hamburg) ➔ <strong>3. 19, 17 oder 15</strong> (Hannover) ➔{' '}
            <strong>4. Beliebiges Doppel</strong> (Wolfsburg) ➔ <strong>5. {finalTarget}</strong> (Weyhausen).
          </p>
          <p>
            2. <strong>Multi-Pass:</strong> Triffst du mit Dart 1 das Ziel, darfst du mit Dart 2 sofort das nächste
            Ziel anwerfen!
          </p>
        </div>
      )}

      {/* Spieler Statuskarten */}
      <div className={`grid gap-3 ${gameMode === '1vs1' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {[1, ...(gameMode === '1vs1' ? [2] : [])].map((pNum) => {
          const isP1 = pNum === 1;
          const st = isP1 ? p1State : p2State;
          const name = isP1 ? p1Name : p2Name;
          const isAct = !isGameFinished && activePlayer === pNum;
          const isWin = winnerPlayer === pNum;

          return (
            <div
              key={pNum}
              className={`rounded-2xl p-3.5 sm:p-4 border-2 transition-all ${
                isWin
                  ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
                  : isAct
                  ? isP1
                    ? 'bg-red-950/45 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.28)]'
                    : 'bg-amber-950/45 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.25)]'
                  : 'bg-slate-900/60 border-white/10 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm sm:text-lg font-black text-white truncate">{name}</div>
                  <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                    {isWin ? (
                      <span className="text-amber-300 font-black">🏆 GELANDET!</span>
                    ) : isAct ? (
                      <span className={`${isP1 ? 'text-red-300' : 'text-amber-300'} font-black`}>
                        🎯 AM WURF
                      </span>
                    ) : (
                      <span className="text-slate-400">Wartet</span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className={`text-2xl sm:text-3xl font-black ${isP1 ? 'text-red-300' : 'text-amber-300'}`}>
                    {st.completedSteps}
                    <span className="text-xs text-slate-400">/5</span>
                  </span>
                </div>
              </div>

              {/* Mini-5-Etappen-Leiste */}
              <div className="grid grid-cols-5 gap-1.5 mt-2.5">
                {checkpoints.map((cp) => {
                  const done = st.completedSteps >= cp.step;
                  const activeHere = !isWin && st.completedSteps === cp.step - 1;
                  return (
                    <div
                      key={cp.step}
                      className={`py-1 rounded-lg border text-center text-xs font-mono font-bold ${
                        done
                          ? isP1
                            ? 'bg-red-500/30 border-red-400 text-white'
                            : 'bg-amber-500/30 border-amber-400 text-white'
                          : activeHere
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 animate-pulse'
                          : 'bg-slate-950/60 border-white/10 text-slate-500'
                      }`}
                    >
                      {cp.icon}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Event Banner */}
      {lastAction && (
        <div
          className={`rounded-2xl px-4 py-2.5 border text-center transition-all ${
            lastAction.tone === 'turbo' || lastAction.tone === 'win'
              ? 'bg-amber-950/80 border-amber-400 text-amber-100'
              : lastAction.tone === 'hit'
              ? 'bg-emerald-950/75 border-emerald-400 text-emerald-100'
              : lastAction.tone === 'miss'
              ? 'bg-red-950/55 border-red-500/50 text-red-200'
              : 'bg-slate-900/75 border-white/15 text-slate-200'
          }`}
        >
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider mr-2">
            {lastAction.icon} {lastAction.headline}
          </span>
          <span className="text-xs sm:text-sm opacity-95">{lastAction.subline}</span>
        </div>
      )}

      {/* Sieger Banner am Tablet */}
      {isGameFinished && winnerPlayer && (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-950/80 via-slate-900/95 to-cyan-950/80 border-2 border-amber-400 text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🏆🦌</div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {winnerPlayer === 1 ? p1Name : p2Name} landet sicher in Weyhausen!
            </h2>
            <p className="text-xs sm:text-sm text-amber-200 mt-1">
              Alle 5 Checkpoints bezwungen in Runde {roundNumber} ({ownState.dartsThrown} Darts).
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="min-h-[54px] px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/15 font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Letzten Dart korrigieren</span>
            </button>
            <button
              type="button"
              onClick={handleStartGame}
              className="min-h-[54px] px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm cursor-pointer"
            >
              🔄 Revanche starten
            </button>
            <button
              type="button"
              onClick={handleAbortToSetup}
              className="min-h-[54px] px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/15 font-black text-sm cursor-pointer"
            >
              Zurück zum Setup
            </button>
          </div>
        </div>
      )}

      {/* Aktives Spiel-Eingabefeld */}
      {!isGameFinished && (
        <>
          {/* Riesige Ziel-Card */}
          <div className="rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-[#081b26] via-slate-950 to-[#1a1106] border-2 border-cyan-400/45 text-center space-y-2 shadow-2xl">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-cyan-300 block">
              🎯 {ownName} fliegt Etappe {activeCp.step} / 5 · {activeCp.location}
            </span>
            <div className="text-4xl sm:text-6xl font-black font-mono text-white flex items-center justify-center gap-3 py-1">
              <span>{activeCp.icon}</span>
              <span className="text-emerald-300 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                {activeCp.targetLabel}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold">{activeCp.ruleHint}</p>
          </div>

          {/* 3-Dart-Aufnahme + Undo */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-8 sm:col-span-9 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((idx) => {
                const ev = ownState.currentTurnDarts[idx];
                const isNext = idx === ownState.currentTurnDarts.length;
                return (
                  <div
                    key={idx}
                    className={`min-h-[52px] px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center font-mono ${
                      ev
                        ? ev.kind === 'win'
                          ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                          : ev.kind === 'hit'
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100'
                          : 'bg-red-950/70 border-red-500/60 text-red-200'
                        : isNext
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 animate-pulse'
                        : 'bg-slate-950/60 border-white/10 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-80">Dart {idx + 1}</span>
                    <span className="text-xs font-black truncate max-w-full">
                      {ev ? ev.label : isNext ? 'Bereit' : '•'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="col-span-4 sm:col-span-3 min-h-[52px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white border border-white/15 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Korrektur</span>
            </button>
          </div>

          {/* 2 Riesige 1-Tap Touch-Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCheckpointHit}
              data-ui-id="RUDOLPH.PLAY.HIT_BTN"
              className={`min-h-[80px] px-5 py-4 rounded-2xl border-2 font-black text-base sm:text-lg flex flex-col items-center justify-center shadow-xl cursor-pointer active:scale-[0.98] transition-all ${
                isFinalStep
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 border-yellow-100 shadow-amber-500/35'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 border-emerald-200 shadow-emerald-500/30'
              }`}
            >
              {isFinalStep ? (
                <span>🏆 LANDUNG IN WEYHAUSEN (SIEG!)</span>
              ) : (
                <span>✓ CHECKPOINT GESCHAFFT! (WEITERFLIEGEN 🦌)</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleMiss}
              data-ui-id="RUDOLPH.PLAY.MISS_BTN"
              className="min-h-[80px] px-5 py-4 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white border-2 border-red-400 font-black text-base sm:text-lg flex items-center justify-center shadow-xl cursor-pointer active:scale-[0.98] transition-all"
            >
              <span>✕ DANEBEN (MISS)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRestMiss}
            data-ui-id="RUDOLPH.PLAY.REST_MISS_BTN"
            className="w-full min-h-[56px] px-5 py-3 rounded-2xl bg-rose-950/90 hover:bg-rose-900 text-rose-100 border-2 border-rose-500/70 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.98]"
          >
            <span>✕✕✕ Restliche Darts Miss</span>
          </button>
        </>
      )}
    </div>
  );
}
