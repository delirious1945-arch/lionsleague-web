'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import { generateSessionId } from '@/lib/liveSession';
import {
  RUDOLPH_ROUTES,
  RUDOLPH_TOTAL_STEPS,
  RudolphDartEvent,
  RudolphFinalTarget,
  RudolphLastActionBanner,
  RudolphPlayerState,
  RudolphZoneType,
  cloneRudolphPlayerState,
  createInitialRudolphPlayerState,
  getRudolphCheckpoints,
  getRudolphRouteById,
  pickRandomRudolphRoute,
} from './types';
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  RotateCcw,
  Shield,
  Snowflake,
  Sparkles,
  Target,
  Tv,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const CACHE_KEY = 'lions_active_rudolph_session_v3';

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

type SoundKind =
  | 'hit'
  | 'turbo'
  | 'sabotage'
  | 'crash'
  | 'trap'
  | 'shield'
  | 'win'
  | 'miss';

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
      playTone(523.25, 0, 0.1, 'triangle', 0.13);
      playTone(659.25, 0.07, 0.1, 'triangle', 0.13);
      playTone(783.99, 0.14, 0.12, 'triangle', 0.14);
      playTone(1046.5, 0.22, 0.26, 'sine', 0.15);
    } else if (kind === 'sabotage') {
      playTone(1174.66, 0, 0.09, 'sine', 0.12);
      playTone(932.33, 0.07, 0.11, 'sine', 0.12);
      playTone(622.25, 0.16, 0.22, 'triangle', 0.13);
    } else if (kind === 'crash') {
      playTone(220, 0, 0.09, 'sawtooth', 0.12);
      playTone(164.81, 0.07, 0.14, 'sawtooth', 0.13);
      playTone(110, 0.16, 0.22, 'triangle', 0.13);
    } else if (kind === 'trap') {
      playTone(392, 0, 0.11, 'sawtooth', 0.1);
      playTone(311.13, 0.1, 0.12, 'sawtooth', 0.11);
      playTone(220, 0.2, 0.24, 'triangle', 0.12);
    } else if (kind === 'shield') {
      playTone(659.25, 0, 0.1, 'sine', 0.12);
      playTone(987.77, 0.08, 0.18, 'triangle', 0.13);
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
    }, 1600);
  } catch {}
}

function getMaxDartsForTurn(st: RudolphPlayerState): number {
  return st.isFrozen ? 2 : 3;
}

function getStepsCountForDart(d: RudolphDartEvent): number {
  if (d.kind === 'turbo') return d.subLabel.includes('+2') ? 2 : 1;
  if (d.kind === 'crash') return d.subLabel.includes('+2') ? 2 : 1;
  if (d.kind === 'hit' || d.kind === 'win') return 1;
  return 0;
}

function getZoneBadgeClasses(zoneType: RudolphZoneType): string {
  switch (zoneType) {
    case 'inner_single':
      return 'bg-cyan-500/25 border-cyan-400 text-cyan-200';
    case 'outer_single':
      return 'bg-slate-200/15 border-slate-300/70 text-white';
    case 'double':
      return 'bg-rose-500/25 border-rose-400 text-rose-200';
    case 'triple':
      return 'bg-amber-500/25 border-amber-400 text-amber-200';
    case 'bull':
      return 'bg-emerald-500/25 border-emerald-400 text-emerald-200';
  }
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
  const [chaosEnabled, setChaosEnabled] = useState<boolean>(true);
  const [activeRouteId, setActiveRouteId] = useState<string>(RUDOLPH_ROUTES[0].id);
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
      overrideSessionId?: string,
      overrideRouteId?: string
    ) => {
      const winnerDisplayName = winPlayer === 1 ? p1Name : winPlayer === 2 ? p2Name : null;
      const usedRoute = getRudolphRouteById(overrideRouteId || activeRouteId);

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
          chaosEnabled,
          routeId: usedRoute.id,
          routeName: usedRoute.name,
          routeDifficulty: usedRoute.difficulty,
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
    [
      activeBoard,
      activeRouteId,
      chaosEnabled,
      finalTarget,
      gameMode,
      gameSessionId,
      p1Name,
      p2Name,
    ]
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
      overrideSessionId?: string,
      overrideRouteId?: string
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
        overrideSessionId,
        overrideRouteId
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
        const currentRoute = getRudolphRouteById(activeRouteId);
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            isGameStarted,
            isGameFinished,
            gameMode,
            finalTarget,
            chaosEnabled,
            activeRouteId,
            routeName: `${currentRoute.icon} ${currentRoute.name}`,
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
    chaosEnabled,
    activeRouteId,
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

  // Spiel starten (zieht automatisch per Zufall eine der 10 Flugrouten!)
  const handleStartGame = () => {
    const cleanP1 = p1Name.trim() || 'Spieler 1';
    const cleanP2 = p2Name.trim() || 'Gastspieler';
    setP1Name(cleanP1);
    setP2Name(cleanP2);

    const chosenRoute = pickRandomRudolphRoute(activeRouteId);
    const routeCheckpoints = getRudolphCheckpoints(finalTarget, chosenRoute.id);
    const firstCp = routeCheckpoints[0];

    const freshId = generateSessionId('rudolph', activeBoard);
    const initP1 = createInitialRudolphPlayerState();
    const initP2 = createInitialRudolphPlayerState();
    const startBanner: RudolphLastActionBanner = {
      id: Date.now(),
      tone: 'info',
      icon: chosenRoute.icon,
      headline: `${chosenRoute.name.toUpperCase()} (${chosenRoute.difficulty.toUpperCase()}) GELOST!`,
      subline:
        gameMode === '1vs1'
          ? `${cleanP1} eröffnet gegen ${cleanP2}! Start-Ziel: ${firstCp.targetLabel} (${firstCp.zoneShort})!`
          : `${cleanP1} hebt vom Nordpol ab! Start-Ziel: ${firstCp.targetLabel} (${firstCp.zoneShort})!`,
      actorPlayer: 1,
    };

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setCachedSessionToResume(null);
    setRestoredFromCache(false);
    setActiveRouteId(chosenRoute.id);
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

    broadcastLiveState(
      true,
      false,
      initP1,
      initP2,
      1,
      1,
      startBanner,
      null,
      freshId,
      chosenRoute.id
    );
  };

  // Wiederherstellung aus Cache
  const handleResumeCachedGame = () => {
    if (!cachedSessionToResume) return;
    const c = cachedSessionToResume;
    if (c.activeBoard && ['1', '2', '3', '4', '5'].includes(c.activeBoard)) {
      setActiveBoard(c.activeBoard);
    }
    setGameMode(c.gameMode === 'solo' ? 'solo' : '1vs1');
    setFinalTarget(
      c.finalTarget === 'D20' ? 'D20' : c.finalTarget === 'BULLSEYE' ? 'BULLSEYE' : 'BULL'
    );
    setChaosEnabled(c.chaosEnabled ?? true);
    setActiveRouteId(c.activeRouteId || RUDOLPH_ROUTES[0].id);
    setP1Name(c.p1Name || defaultP1);
    setP2Name(c.p2Name || 'Gastspieler');
    setIsGuestP1(Boolean(c.isGuestP1));
    setIsGuestP2(Boolean(c.isGuestP2));
    setActivePlayer(c.activePlayer === 2 ? 2 : 1);
    setRoundNumber(Number(c.roundNumber || 1));
    setP1State(
      c.p1State ? cloneRudolphPlayerState(c.p1State) : createInitialRudolphPlayerState()
    );
    setP2State(
      c.p2State ? cloneRudolphPlayerState(c.p2State) : createInitialRudolphPlayerState()
    );
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

  const activeRoute = getRudolphRouteById(activeRouteId);
  const checkpoints = getRudolphCheckpoints(finalTarget, activeRoute.id);

  const commitTurnStep = (
    nextP1: RudolphPlayerState,
    nextP2: RudolphPlayerState,
    banner: RudolphLastActionBanner,
    winPlayer: 1 | 2 | null,
    isMissSoundPending = false
  ) => {
    const ownAfter = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;
    let nextActive: 1 | 2 = activePlayer;
    let nextRound = roundNumber;
    let finalBanner = banner;
    let playedSpecialTrapOrShield = false;

    const maxDarts = getMaxDartsForTurn(ownAfter);

    if (winPlayer !== null) {
      ownAfter.roundsPlayed += 1;
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {}
    } else if (ownAfter.currentTurnDarts.length >= maxDarts) {
      ownAfter.roundsPlayed += 1;

      const currentCp =
        checkpoints[Math.min(RUDOLPH_TOTAL_STEPS - 1, ownAfter.completedSteps)];
      if (
        chaosEnabled &&
        ownAfter.currentTurnDarts.length === 3 &&
        ownAfter.currentTurnDarts.every((d) => d.kind === 'miss') &&
        currentCp?.specialType === 'trap'
      ) {
        playedSpecialTrapOrShield = true;
        if (ownAfter.hasShield) {
          ownAfter.hasShield = false;
          playSound('shield');
          finalBanner = {
            id: Date.now(),
            tone: 'shield',
            icon: '🛡️',
            headline: 'WICHTEL-SCHILD RETTET!',
            subline: `3× Miss an ${currentCp.location} — doch das Wichtel-Schild fängt den Schubs gegen ${activeName} ab!`,
            actorPlayer: activePlayer,
          };
        } else {
          ownAfter.completedSteps = Math.max(0, ownAfter.completedSteps - 1);
          playSound('trap');
          if (currentCp.step === 10) {
            finalBanner = {
              id: Date.now(),
              tone: 'trap',
              icon: '👹',
              headline: 'GRINCH-FALLE! -1 ETAPPE!',
              subline: `3× Miss im Grinch-Hinterhalt! Der Grinch schubst ${activeName} zurück auf Station ${ownAfter.completedSteps + 1}!`,
              actorPlayer: activePlayer,
            };
          } else {
            finalBanner = {
              id: Date.now(),
              tone: 'trap',
              icon: '🧦',
              headline: 'KNECHT RUPRECHTS RUTE!',
              subline: `3× Miss bei Knecht Ruprecht! ${activeName} rutscht -1 Etappe zurück!`,
              actorPlayer: activePlayer,
            };
          }
        }
      }

      ownAfter.isFrozen = false;
      ownAfter.sabotagedThisTurn = false;

      if (gameMode === '1vs1') {
        if (activePlayer === 1) {
          nextActive = 2;
          nextP2.currentTurnDarts = [];
          nextP2.sabotagedThisTurn = false;
        } else {
          nextActive = 1;
          nextRound = roundNumber + 1;
          nextP1.currentTurnDarts = [];
          nextP1.sabotagedThisTurn = false;
        }
      } else {
        nextRound = roundNumber + 1;
        nextP1.currentTurnDarts = [];
        nextP1.sabotagedThisTurn = false;
      }
    }

    if (isMissSoundPending && !playedSpecialTrapOrShield) {
      playSound('miss');
    }

    setP1State(nextP1);
    setP2State(nextP2);
    setActivePlayer(nextActive);
    setRoundNumber(nextRound);
    setLastAction(finalBanner);
    setWinnerPlayer(winPlayer);
    setIsGameFinished(winPlayer !== null);
  };

  // A) Exakter Segment-Treffer (+1 Etappe, bei 3/3 Treffern +1 Bonus-Etappe & 🛡️ Schild)
  const handleExactHit = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = cloneRudolphPlayerState(p1State);
    const nextP2 = cloneRudolphPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const opp = activePlayer === 1 ? nextP2 : nextP1;
    const activeName = activePlayer === 1 ? p1Name : p2Name;
    const oppName = activePlayer === 1 ? p2Name : p1Name;

    if (own.currentTurnDarts.length >= getMaxDartsForTurn(own)) {
      own.currentTurnDarts = [];
      own.sabotagedThisTurn = false;
    }

    const prevSteps = own.completedSteps;
    const cp = checkpoints[Math.min(RUDOLPH_TOTAL_STEPS - 1, prevSteps)];

    // Landung in Weyhausen (Station 12)
    if (prevSteps >= RUDOLPH_TOTAL_STEPS - 1) {
      own.completedSteps = RUDOLPH_TOTAL_STEPS;
      own.dartsThrown += 1;
      own.currentTurnDarts.push({
        kind: 'win',
        checkpointStep: RUDOLPH_TOTAL_STEPS,
        label: `${cp.icon} ${cp.targetLabel}`,
        subLabel: '🏆 LANDUNG!',
      });

      const stepsThisTurn = own.currentTurnDarts.reduce(
        (acc, d) => acc + getStepsCountForDart(d),
        0
      );
      if (stepsThisTurn > own.bestTurnSteps) {
        own.bestTurnSteps = stepsThisTurn;
      }

      playSound('win');
      const winBanner: RudolphLastActionBanner = {
        id: Date.now(),
        tone: 'win',
        icon: '🏆',
        headline: 'LANDUNG IN WEYHAUSEN!',
        subline: `${activeName} trifft exakt ${cp.targetLabel} und gewinnt Route ${activeRoute.name}!`,
        actorPlayer: activePlayer,
      };
      commitTurnStep(nextP1, nextP2, winBanner, activePlayer);
      return;
    }

    // Stationen 1–11 (nie Station 12 überspringen)
    const priorHits = own.currentTurnDarts.filter(
      (d) =>
        d.kind === 'hit' || d.kind === 'turbo' || d.kind === 'crash' || d.kind === 'win'
    ).length;
    const isThreeInTurnTurbo = priorHits === 2;

    const afterHitSteps = Math.min(RUDOLPH_TOTAL_STEPS - 1, prevSteps + 1);
    const nextSteps = isThreeInTurnTurbo
      ? Math.min(RUDOLPH_TOTAL_STEPS - 1, afterHitSteps + 1)
      : afterHitSteps;
    const actualJump = nextSteps - prevSteps;

    own.completedSteps = nextSteps;
    own.dartsThrown += 1;

    // Sonder-Stationen im Intervall (prevSteps, nextSteps] prüfen
    let thawedNow = false;
    let gainedStationShield = false;
    if (prevSteps < 4 && nextSteps >= 4 && own.isFrozen) {
      own.isFrozen = false;
      thawedNow = true;
    }
    if (prevSteps < 9 && nextSteps >= 9) {
      own.hasShield = true;
      gainedStationShield = true;
    }
    if (isThreeInTurnTurbo) {
      own.hasShield = true;
    }

    const nextCp = checkpoints[Math.min(RUDOLPH_TOTAL_STEPS - 1, nextSteps)];

    // Crash-Prüfung auf gleicher Etappe (1..11)
    const crashPossible =
      gameMode === '1vs1' &&
      chaosEnabled &&
      nextSteps >= 1 &&
      nextSteps <= RUDOLPH_TOTAL_STEPS - 1 &&
      opp.completedSteps === nextSteps;

    let dartKind: RudolphDartEvent['kind'] = isThreeInTurnTurbo ? 'turbo' : 'hit';
    let dartLabel = isThreeInTurnTurbo ? `🚀 ${cp.targetLabel}` : `${cp.icon} ${cp.targetLabel}`;
    let dartSubLabel = isThreeInTurnTurbo
      ? actualJump === 2
        ? '+2 TURBO + 🛡️'
        : 'TURBO + 🛡️'
      : `Etappe ${cp.step}/${RUDOLPH_TOTAL_STEPS}`;

    if (crashPossible && !opp.hasShield) {
      dartKind = 'crash';
      dartLabel = `💥 ${cp.targetLabel}`;
      dartSubLabel = actualJump === 2 ? '+2 & CRASH!' : 'CRASH!';
    }

    own.currentTurnDarts.push({
      kind: dartKind,
      checkpointStep: cp.step,
      label: dartLabel,
      subLabel: dartSubLabel,
    });

    const stepsThisTurn = own.currentTurnDarts.reduce(
      (acc, d) => acc + getStepsCountForDart(d),
      0
    );
    if (stepsThisTurn > own.bestTurnSteps) {
      own.bestTurnSteps = stepsThisTurn;
    }

    let banner: RudolphLastActionBanner;

    if (crashPossible) {
      if (opp.hasShield) {
        opp.hasShield = false;
        playSound('shield');
        banner = {
          id: Date.now(),
          tone: 'shield',
          icon: '🛡️',
          headline: 'CRASH ABGEBLOCKT!',
          subline: `${activeName} zieht auf Flughöhe ${nextSteps}/${RUDOLPH_TOTAL_STEPS}, aber ${oppName}s Wichtel-Schild fängt die Ramme ab!`,
          actorPlayer: activePlayer,
        };
      } else {
        opp.completedSteps = Math.max(0, opp.completedSteps - 1);
        own.crashesCaused += 1;
        playSound('crash');
        banner = {
          id: Date.now(),
          tone: 'crash',
          icon: '💥',
          headline: 'SCHLITTEN-CRASH!',
          subline: `${activeName} landet exakt bei ${oppName} (${nextSteps}/${RUDOLPH_TOTAL_STEPS}) und rammt den Rivalen -1 Etappe nach unten!`,
          actorPlayer: activePlayer,
        };
      }
    } else if (isThreeInTurnTurbo) {
      playSound('turbo');
      banner = {
        id: Date.now(),
        tone: 'turbo',
        icon: '🚀',
        headline: '3/3 TURBO-BONUS + 🛡️!',
        subline: `3 exakte Treffer in Folge! ${activeName} fliegt +${actualJump} Etappe${
          actualJump === 2 ? 'n' : ''
        } & holt ein 🛡️ Wichtel-Schild — nächstes Ziel: ${nextCp.location} (${nextCp.targetLabel})!`,
        actorPlayer: activePlayer,
      };
    } else if (thawedNow) {
      playSound('hit');
      banner = {
        id: Date.now(),
        tone: 'hit',
        icon: '🍷',
        headline: 'GLÜHWEIN TAUT KUFEN AUF!',
        subline: `${activeName} trifft exakt ${cp.targetLabel}! Dart 3 wieder frei — nächster Halt: ${nextCp.location} (${nextCp.targetLabel})!`,
        actorPlayer: activePlayer,
      };
    } else if (gainedStationShield) {
      playSound('shield');
      banner = {
        id: Date.now(),
        tone: 'shield',
        icon: '🎁',
        headline: 'WICHTEL-SCHILD EINGESACKT!',
        subline: `${activeName} trifft ${cp.targetLabel} & aktiviert 🛡️ Schildschutz! Nächstes Ziel: ${nextCp.location} (${nextCp.targetLabel})!`,
        actorPlayer: activePlayer,
      };
    } else {
      playSound('hit');
      banner = {
        id: Date.now(),
        tone: 'hit',
        icon: '🦌',
        headline: `${cp.location.toUpperCase()} GEMEISTERT!`,
        subline: `${activeName} trifft exakt ${cp.targetLabel} — nächstes Ziel: ${nextCp.location} (${nextCp.targetLabel})!`,
        actorPlayer: activePlayer,
      };
    }

    commitTurnStep(nextP1, nextP2, banner, null);
  };

  // B) Schneeball-Sabotage (max 1× pro Aufnahme)
  const handleSabotage = () => {
    if (
      isGameFinished ||
      gameMode !== '1vs1' ||
      !chaosEnabled ||
      ownState.sabotagedThisTurn
    ) {
      return;
    }
    pushSnapshot();

    const nextP1 = cloneRudolphPlayerState(p1State);
    const nextP2 = cloneRudolphPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const opp = activePlayer === 1 ? nextP2 : nextP1;
    const activeName = activePlayer === 1 ? p1Name : p2Name;
    const oppName = activePlayer === 1 ? p2Name : p1Name;

    if (own.currentTurnDarts.length >= getMaxDartsForTurn(own)) {
      own.currentTurnDarts = [];
      own.sabotagedThisTurn = false;
    }

    const oppCp = checkpoints[Math.min(RUDOLPH_TOTAL_STEPS - 1, opp.completedSteps)];
    const targetText = oppCp.targetLabel.includes('BULL')
      ? oppCp.targetLabel
      : `${oppCp.targetLabel} oder BULL`;

    own.dartsThrown += 1;
    own.sabotagedThisTurn = true;

    let banner: RudolphLastActionBanner;

    if (opp.hasShield) {
      opp.hasShield = false;
      own.currentTurnDarts.push({
        kind: 'shield',
        label: '🛡️ GEBLOCKT',
        subLabel: `${oppName} hält stand`,
      });
      playSound('shield');
      banner = {
        id: Date.now(),
        tone: 'shield',
        icon: '🛡️',
        headline: 'SCHNEEBALL ABGEPRALLT!',
        subline: `${activeName} trifft ${targetText}, aber ${oppName}s Wichtel-Schild blockt die Sabotage komplett ab!`,
        actorPlayer: activePlayer,
      };
    } else {
      const pushBack = opp.isFrozen ? 2 : 1;
      opp.completedSteps = Math.max(0, opp.completedSteps - pushBack);
      opp.isFrozen = true;
      own.sabotagesLanded += 1;
      own.currentTurnDarts.push({
        kind: 'sabotage',
        label: '❄️ SABOTAGE',
        subLabel: `-${pushBack} & Eis!`,
      });
      playSound('sabotage');
      banner = {
        id: Date.now(),
        tone: 'sabotage',
        icon: '❄️',
        headline: 'SCHNEEBALL-VOLLETREFFER!',
        subline: `${activeName} trifft ${targetText} — ${oppName} rutscht -${pushBack} zurück & Kufen vereist (nur 2 Darts)!`,
        actorPlayer: activePlayer,
      };
    }

    commitTurnStep(nextP1, nextP2, banner, null);
  };

  // C) Einzelner Dart Miss / Falscher Ring
  const handleMiss = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = cloneRudolphPlayerState(p1State);
    const nextP2 = cloneRudolphPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    if (own.currentTurnDarts.length >= getMaxDartsForTurn(own)) {
      own.currentTurnDarts = [];
      own.sabotagedThisTurn = false;
    }
    const curCp = checkpoints[Math.min(RUDOLPH_TOTAL_STEPS - 1, own.completedSteps)];

    own.dartsThrown += 1;
    own.currentTurnDarts.push({
      kind: 'miss',
      label: 'MISS',
      subLabel: 'Falscher Ring / Daneben',
    });

    const banner: RudolphLastActionBanner = {
      id: Date.now(),
      tone: 'miss',
      icon: '✕',
      headline: 'NICHT DIE RICHTIGE ZONE!',
      subline: `${activeName} verfehlt ${curCp.targetLabel} (${curCp.location}).`,
      actorPlayer: activePlayer,
    };

    commitTurnStep(nextP1, nextP2, banner, null, true);
  };

  // D) Restliche Darts Miss
  const handleRestMiss = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = cloneRudolphPlayerState(p1State);
    const nextP2 = cloneRudolphPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    const maxDarts = getMaxDartsForTurn(own);
    const existing = own.currentTurnDarts.length >= maxDarts ? 0 : own.currentTurnDarts.length;
    if (existing === 0) {
      own.currentTurnDarts = [];
      own.sabotagedThisTurn = false;
    }
    const remaining = Math.max(1, maxDarts - existing);
    const curCp = checkpoints[Math.min(RUDOLPH_TOTAL_STEPS - 1, own.completedSteps)];

    own.dartsThrown += remaining;
    for (let i = 0; i < remaining; i += 1) {
      own.currentTurnDarts.push({
        kind: 'miss',
        label: 'MISS',
        subLabel: 'Kein Weiterflug',
      });
    }

    const banner: RudolphLastActionBanner = {
      id: Date.now(),
      tone: 'miss',
      icon: '✕',
      headline: 'AUFNAHME VORBEI',
      subline: `${activeName} bleibt vorerst bei ${curCp.location} (${curCp.targetLabel}).`,
      actorPlayer: activePlayer,
    };

    commitTurnStep(nextP1, nextP2, banner, null, true);
  };

  // =========================================================================
  // ANSICHT 1: SETUP-BILDSCHIRM
  // =========================================================================
  if (!isGameStarted) {
    const soloLocked = gameMode === 'solo' && !isBoardUser && Boolean(userPlayerMatch);
    const resumeRoute = cachedSessionToResume
      ? getRudolphRouteById(cachedSessionToResume.activeRouteId)
      : null;

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
                  {cachedSessionToResume.p1State?.completedSteps ?? 0}/{RUDOLPH_TOTAL_STEPS})
                  {cachedSessionToResume.gameMode === '1vs1' && (
                    <>
                      {' '}vs. <strong>{cachedSessionToResume.p2Name}</strong> (Etappe{' '}
                      {cachedSessionToResume.p2State?.completedSteps ?? 0}/{RUDOLPH_TOTAL_STEPS})
                    </>
                  )}{' '}
                  • {resumeRoute ? `${resumeRoute.icon} ${resumeRoute.name}` : 'Zufalls-Route'} • Runde{' '}
                  {cachedSessionToResume.roundNumber || 1}
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
                  10 Zufalls-Flugrouten à 12 Weihnachts-Stationen · Nur der exakte Ring zählt!
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

          {/* Info-Box zu 10 Zufalls-Routen */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/45 via-slate-950/75 to-cyan-950/45 border border-amber-400/35 flex items-start gap-3">
            <span className="text-2xl shrink-0">🎲</span>
            <div className="space-y-1">
              <div className="text-sm font-black text-amber-200">
                Zufalls-Flugrouten (10 verschiedene Spiele)
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                Bei jedem Spielstart wird automatisch eine zufällige Route mit strengen Segment-Zielen
                (Großes Single, Kleines Single, Doppel, Triple, Bull) gelost. Beliebiges Treffen einer
                Zahl gilt nicht mehr!
              </p>
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

          {/* Chaos- & Sabotage-Modus Toggle */}
          <button
            type="button"
            onClick={() => setChaosEnabled((v) => !v)}
            data-ui-id="RUDOLPH.SETUP.CHAOS_TOGGLE"
            className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between gap-4 text-left transition-all cursor-pointer ${
              chaosEnabled
                ? 'bg-cyan-950/40 border-cyan-400/70 shadow-[0_0_24px_rgba(6,182,212,0.18)]'
                : 'bg-slate-950/60 border-white/10'
            }`}
          >
            <div className="space-y-0.5">
              <div className="text-sm font-black text-cyan-200 flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Chaos- &amp; Sabotage-Modus (Bein stellen!)</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                Schneeball-Sabotage (Rivalen zurückwerfen &amp; Kufen vereisen), Schlitten-Crash bei
                Überholmanöver sowie Knecht-Ruprecht- &amp; Grinch-Fallen (3× Miss = -1 Etappe)
              </p>
            </div>
            <span
              className={`shrink-0 px-3.5 py-2 rounded-xl font-mono text-xs font-black uppercase ${
                chaosEnabled
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 border border-white/10'
              }`}
            >
              {chaosEnabled ? '✓ AN' : 'AUS'}
            </span>
          </button>

          {/* Finale Landeziel-Wahl */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-amber-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>Landeziel in Weyhausen (Station 12)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Der entscheidende Treffer zur Landung am Vereinsheim
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['BULL', 'BULLSEYE', 'D20'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFinalTarget(t)}
                  className={`min-h-[48px] px-3.5 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                    finalTarget === t
                      ? 'bg-amber-400 text-slate-950 shadow-lg'
                      : 'bg-slate-900 text-slate-300 border border-white/15'
                  }`}
                >
                  {t === 'BULL'
                    ? 'BULL (25/50)'
                    : t === 'BULLSEYE'
                    ? 'BULLSEYE (50)'
                    : 'D20 (Tops)'}
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
            <span>🎲 Zufalls-Route losen &amp; Abflug starten</span>
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
  const oppState = activePlayer === 1 ? p2State : p1State;
  const ownName = activePlayer === 1 ? p1Name : p2Name;
  const oppName = activePlayer === 1 ? p2Name : p1Name;
  const activeCp = checkpoints[Math.min(RUDOLPH_TOTAL_STEPS - 1, ownState.completedSteps)];
  const oppCp = checkpoints[Math.min(RUDOLPH_TOTAL_STEPS - 1, oppState.completedSteps)];
  const isFinalStep = ownState.completedSteps >= RUDOLPH_TOTAL_STEPS - 1;
  const sabotageTargetLabel = oppCp.targetLabel.includes('BULL')
    ? oppCp.targetLabel
    : `${oppCp.targetLabel} oder BULL`;

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
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 font-mono text-xs font-black">
            🗺️ {activeRoute.icon} {activeRoute.name} ({activeRoute.index}/{RUDOLPH_ROUTES.length})
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
        <div className="rounded-2xl p-4 bg-slate-900/95 border border-cyan-400/40 text-xs sm:text-sm text-slate-200 space-y-2">
          <div className="font-black text-cyan-300">
            🦌 Spielregeln: {activeRoute.icon} {activeRoute.name} ({activeRoute.difficulty})
          </div>
          <p>
            <strong>1. Exakte Ziel-Zone Pflicht:</strong> Bei jeder der 12 Stationen zählt nur der
            vorgegebene Ring — <em>Großes Single (AUSSEN)</em>, <em>Kleines Single (INNEN)</em>,{' '}
            <em>Doppel</em>, <em>Triple</em> oder <em>Bull</em>! Ein falscher Ring ist ein Miss.
          </p>
          <p>
            <strong>2. 3/3 Turbo-Bonus:</strong> Schaffst du <strong>3 exakte Treffer in einer Aufnahme</strong>,
            zündet der Rudolph-Turbo: automatisch <strong>+1 Bonus-Etappe</strong> (max. bis 11) &amp;
            ein <strong>🛡️ Wichtel-Schild</strong>!
          </p>
          {chaosEnabled && (
            <p>
              <strong>3. Bein stellen (Chaos-Modus):</strong>{' '}
              <span className="text-cyan-300 font-bold">❄️ Schneeball-Sabotage</span> (1×/Aufnahme auf
              Rivalenziel oder BULL) wirft den Rivalen -1 zurück &amp; vereist Kufen (nur 2 Darts).{' '}
              <span className="text-amber-300 font-bold">💥 Schlitten-Crash</span> bei Gleichstand rammt
              ihn -1 zurück. <span className="text-rose-300 font-bold">⚠️ Fallen</span> (Station 6 &amp; 10):
              3× Miss = -1 Etappe!
            </p>
          )}
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
                  : 'bg-slate-900/60 border-white/10 opacity-85'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm sm:text-lg font-black text-white truncate">{name}</div>
                  <div className="text-[11px] font-mono text-slate-300 mt-0.5 flex flex-wrap items-center gap-1.5">
                    {isWin ? (
                      <span className="text-amber-300 font-black">🏆 GELANDET!</span>
                    ) : isAct ? (
                      <span className={`${isP1 ? 'text-red-300' : 'text-amber-300'} font-black`}>
                        🎯 AM WURF
                      </span>
                    ) : (
                      <span className="text-slate-400">Wartet</span>
                    )}
                    {st.isFrozen && (
                      <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 text-[10px] font-black">
                        ❄️ VEREIST · 2 DARTS
                      </span>
                    )}
                    {st.hasShield && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 text-[10px] font-black">
                        🛡️ WICHTEL-SCHILD
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className={`text-2xl sm:text-3xl font-black ${isP1 ? 'text-red-300' : 'text-amber-300'}`}>
                    {st.completedSteps}
                    <span className="text-xs text-slate-400">/{RUDOLPH_TOTAL_STEPS}</span>
                  </span>
                </div>
              </div>

              {/* Mini-12-Etappen-Leiste */}
              <div className="grid grid-cols-12 gap-1 mt-2.5">
                {checkpoints.map((cp) => {
                  const done = st.completedSteps >= cp.step;
                  const activeHere = !isWin && st.completedSteps === cp.step - 1;
                  return (
                    <div
                      key={cp.step}
                      title={`${cp.step}. ${cp.location} (${cp.targetLabel})`}
                      className={`py-1 rounded-md border text-center text-[10px] sm:text-xs font-mono font-bold ${
                        done
                          ? isP1
                            ? 'bg-red-500/35 border-red-400 text-white'
                            : 'bg-amber-500/35 border-amber-400 text-white'
                          : activeHere
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 animate-pulse'
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
              : lastAction.tone === 'sabotage'
              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-100'
              : lastAction.tone === 'crash'
              ? 'bg-orange-950/80 border-orange-400 text-orange-100'
              : lastAction.tone === 'trap'
              ? 'bg-rose-950/85 border-rose-400 text-rose-100'
              : lastAction.tone === 'shield'
              ? 'bg-emerald-950/80 border-cyan-400 text-emerald-100'
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
              Route {activeRoute.icon} {activeRoute.name} ({activeRoute.difficulty}) bezwungen in Runde{' '}
              {roundNumber} ({(winnerPlayer === 1 ? p1State : p2State).dartsThrown} Darts).
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
              🎲 Neue Zufalls-Revanche
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
          <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#081b26] via-slate-950 to-[#1a1106] border-2 border-cyan-400/45 text-center space-y-2.5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-cyan-300">
                🎯 {ownName} · Etappe {activeCp.step} / {RUDOLPH_TOTAL_STEPS} · {activeCp.location} ({activeCp.title})
              </span>
              {activeCp.specialBadge && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${
                    activeCp.specialType === 'trap'
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : activeCp.specialType === 'shield'
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : activeCp.specialType === 'thaw'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                      : 'bg-yellow-500/25 border-yellow-300 text-yellow-200'
                  }`}
                >
                  {activeCp.specialBadge}
                </span>
              )}
            </div>

            <div>
              <span
                className={`inline-block px-3.5 py-1 rounded-full border-2 font-mono text-xs sm:text-sm font-black tracking-wider ${getZoneBadgeClasses(
                  activeCp.zoneType
                )}`}
              >
                {activeCp.zoneBadge}
              </span>
            </div>

            <div className="text-3xl sm:text-5xl font-black font-mono text-white flex items-center justify-center gap-3 py-0.5">
              <span>{activeCp.icon}</span>
              <span className="text-emerald-300 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                {activeCp.targetLabel}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 font-semibold">{activeCp.ruleHint}</p>
            <p className="text-[11px] font-mono font-bold text-amber-300">
              🚀 3 exakte Treffer in einer Aufnahme = +1 Bonus-Etappe &amp; 🛡️ Schild
            </p>
          </div>

          {/* 3-Dart-Aufnahme + Undo */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-8 sm:col-span-9 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((idx) => {
                const isFrozenSlot = ownState.isFrozen && idx === 2;
                const ev = ownState.currentTurnDarts[idx];
                const isNext = !isFrozenSlot && idx === ownState.currentTurnDarts.length;

                if (isFrozenSlot) {
                  return (
                    <div
                      key={idx}
                      className="min-h-[54px] px-2 py-1.5 rounded-xl border border-cyan-400/70 bg-cyan-950/75 text-cyan-200 flex flex-col items-center justify-center font-mono"
                    >
                      <span className="text-[10px] font-bold opacity-90">Dart 3</span>
                      <span className="text-[11px] font-black truncate max-w-full">
                        ❄️ EINGEFROREN
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`min-h-[54px] px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center font-mono ${
                      ev
                        ? ev.kind === 'win' || ev.kind === 'turbo'
                          ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                          : ev.kind === 'sabotage' || ev.kind === 'shield'
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100'
                          : ev.kind === 'crash'
                          ? 'bg-orange-500/25 border-orange-400 text-orange-100'
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
              className="col-span-4 sm:col-span-3 min-h-[54px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white border border-white/15 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Korrektur</span>
            </button>
          </div>

          {/* Reihe 1: Exakter Treffer & Daneben / Falscher Ring */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExactHit}
              data-ui-id="RUDOLPH.PLAY.HIT_BTN"
              className={`min-h-[84px] px-5 py-4 rounded-2xl border-2 font-black text-base sm:text-lg flex flex-col items-center justify-center shadow-xl cursor-pointer active:scale-[0.98] transition-all ${
                isFinalStep
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 border-yellow-100 shadow-amber-500/35'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 border-emerald-200 shadow-emerald-500/30'
              }`}
            >
              {isFinalStep ? (
                <>
                  <span>🏆 LANDUNG IN WEYHAUSEN (SIEG!)</span>
                  <span className="text-[11px] font-mono opacity-85">
                    {activeCp.targetLabel} · {activeCp.zoneShort}
                  </span>
                </>
              ) : (
                <>
                  <span>✓ EXAKT GETROFFEN!</span>
                  <span className="text-[11px] font-mono opacity-85">
                    {activeCp.targetLabel} · {activeCp.zoneShort}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleMiss}
              data-ui-id="RUDOLPH.PLAY.MISS_BTN"
              className="min-h-[84px] px-5 py-4 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white border-2 border-red-400 font-black text-base sm:text-lg flex flex-col items-center justify-center shadow-xl cursor-pointer active:scale-[0.98] transition-all"
            >
              <span>✕ DANEBEN / FALSCHES FELD</span>
              <span className="text-[11px] font-mono opacity-90">Falscher Ring oder Miss</span>
            </button>
          </div>

          {/* Reihe 2: Schneeball-Sabotage im 1 vs 1 Chaos-Modus */}
          {gameMode === '1vs1' && chaosEnabled && (
            <button
              type="button"
              onClick={handleSabotage}
              disabled={ownState.sabotagedThisTurn}
              data-ui-id="RUDOLPH.PLAY.SABOTAGE_BTN"
              className="w-full min-h-[68px] px-5 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/25 via-sky-500/30 to-cyan-500/25 hover:from-cyan-500/35 hover:to-sky-500/40 disabled:opacity-45 disabled:cursor-not-allowed text-cyan-100 border-2 border-cyan-400/80 font-black text-sm sm:text-base flex flex-col items-center justify-center shadow-lg shadow-cyan-500/15 cursor-pointer active:scale-[0.98] transition-all"
            >
              {ownState.sabotagedThisTurn ? (
                <span className="flex items-center gap-2 text-cyan-200">
                  <Shield className="w-4 h-4" />
                  <span>✓ Sabotage in dieser Aufnahme bereits genutzt</span>
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <Snowflake className="w-5 h-5 text-cyan-300" />
                    <span>❄️ SCHNEEBALL-SABOTAGE!</span>
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono text-cyan-200 mt-0.5">
                    Triff {sabotageTargetLabel} ➔ {oppName} -1 &amp; ❄️ Vereist (nur 2 Darts!)
                  </span>
                </>
              )}
            </button>
          )}

          {/* Reihe 3: Restliche Darts Miss */}
          <button
            type="button"
            onClick={handleRestMiss}
            data-ui-id="RUDOLPH.PLAY.REST_MISS_BTN"
            className="w-full min-h-[68px] px-5 py-3.5 rounded-2xl bg-rose-950/90 hover:bg-rose-900 text-rose-100 border-2 border-rose-500/70 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.98]"
          >
            <span>✕✕✕ Restliche Darts Miss</span>
          </button>
        </>
      )}
    </div>
  );
}
