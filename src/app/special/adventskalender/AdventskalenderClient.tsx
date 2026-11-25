'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import { generateSessionId } from '@/lib/liveSession';
import {
  AdventsCurseType,
  AdventsDartEvent,
  AdventsDoorNumber,
  AdventsDoorState,
  AdventsLastActionBanner,
  AdventsPlayerState,
  AdventsRewardKind,
  cloneAdventsPlayerState,
  cloneDoors,
  countOpenDoors,
  createInitialAdventsPlayerState,
  createShuffledDoors,
  getDoorTargetLabel,
} from './types';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Tv,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const CACHE_KEY = 'lions_active_adventskalender_session_v1';

interface AdventskalenderClientProps {
  players: Player[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

interface TurnSnapshot {
  activePlayer: 1 | 2;
  roundNumber: number;
  isSuddenDeath: boolean;
  doors: AdventsDoorState[];
  p1State: AdventsPlayerState;
  p2State: AdventsPlayerState;
  lastAction: AdventsLastActionBanner | null;
  winnerPlayer: 1 | 2 | 'draw' | null;
  isGameFinished: boolean;
}

type SoundKind = 'good' | 'jackpot' | 'grinch' | 'curse' | 'niete' | 'miss' | 'win';

const CURSE_UI_META: Record<
  AdventsCurseType,
  {
    icon: string;
    badge: string;
    short: string;
    warning: string;
    chipCls: string;
  }
> = {
  wrong_hand: {
    icon: '🧦',
    badge: 'FALSCHE HAND!',
    short: 'Falsche Hand',
    warning: 'wirft diese Aufnahme mit der FALSCHEN HAND!',
    chipCls: 'bg-red-600/35 border-red-400 text-red-100',
  },
  two_darts: {
    icon: '❄️',
    badge: 'NUR 2 DARTS!',
    short: 'Nur 2 Darts',
    warning: 'hat diese Aufnahme NUR 2 DARTS!',
    chipCls: 'bg-sky-600/35 border-sky-400 text-sky-100',
  },
  one_dart: {
    icon: '🎯',
    badge: 'NUR 1 DART!',
    short: 'Nur 1 Dart',
    warning: 'hat diese Aufnahme NUR 1 DART!',
    chipCls: 'bg-rose-600/35 border-rose-400 text-rose-100',
  },
  sitting: {
    icon: '🪑',
    badge: 'IM SITZEN!',
    short: 'Im Sitzen',
    warning: 'muss diese Aufnahme IM SITZEN werfen!',
    chipCls: 'bg-amber-600/35 border-amber-400 text-amber-100',
  },
  skip_round: {
    icon: '⛄',
    badge: 'AUSSETZEN!',
    short: 'Runde aussetzen',
    warning: 'ist EINGESCHNEIT und setzt diese Runde aus (0 Darts)!',
    chipCls: 'bg-cyan-600/35 border-cyan-300 text-cyan-50',
  },
  spin_360: {
    icon: '🌪️',
    badge: '360° DREHWURM!',
    short: '360° Drehung',
    warning: 'muss sich vor dem Wurf 360° DREHEN (Drehwurm)!',
    chipCls: 'bg-purple-600/35 border-purple-400 text-purple-100',
  },
};

const CURSE_REWARD_MAP: Partial<Record<AdventsRewardKind, AdventsCurseType>> = {
  curse_wrong_hand: 'wrong_hand',
  curse_two_darts: 'two_darts',
  curse_one_dart: 'one_dart',
  curse_sitting: 'sitting',
  curse_skip_round: 'skip_round',
  curse_spin_360: 'spin_360',
};

const POINTS_REWARD_MAP: Partial<Record<AdventsRewardKind, { points: number; isJackpot: boolean; label: string }>> = {
  points_25: { points: 25, isJackpot: false, label: 'Schoko-Nikolaus-Punkte' },
  points_30: { points: 30, isJackpot: false, label: 'Schoko-Punkte' },
  points_35: { points: 35, isJackpot: false, label: 'Zimtstern-Punkte' },
  points_40: { points: 40, isJackpot: false, label: 'Vanillekipferl-Punkte' },
  solo_bonus_45: { points: 45, isJackpot: false, label: 'Nikolaus-Stiefel-Punkte' },
  points_50: { points: 50, isJackpot: false, label: 'Geschenk-Punkte' },
  points_55: { points: 55, isJackpot: false, label: 'Wichtel-Punkte' },
  points_60: { points: 60, isJackpot: true, label: 'Glühwein-Jackpot-Punkte' },
  points_65: { points: 65, isJackpot: true, label: 'Glühwein-Jackpot-Punkte' },
  points_75: { points: 75, isJackpot: true, label: 'Rentier-Schlitten-Jackpot' },
};

function getMaxDartsForCurses(curses: AdventsCurseType[]): number {
  if (curses.includes('skip_round')) return 0;
  if (curses.includes('one_dart')) return 1;
  if (curses.includes('two_darts')) return 2;
  return 3;
}

function createAdventsSound(kind: SoundKind) {
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

    if (kind === 'good') {
      playTone(587.33, 0, 0.14, 'triangle', 0.12);
      playTone(880, 0.09, 0.22, 'sine', 0.13);
    } else if (kind === 'jackpot') {
      playTone(523.25, 0, 0.12, 'triangle', 0.13);
      playTone(659.25, 0.08, 0.12, 'triangle', 0.13);
      playTone(783.99, 0.16, 0.14, 'triangle', 0.14);
      playTone(1046.5, 0.26, 0.34, 'sine', 0.15);
    } else if (kind === 'grinch') {
      playTone(392, 0, 0.15, 'sawtooth', 0.1);
      playTone(277.18, 0.12, 0.18, 'sawtooth', 0.1);
      playTone(185, 0.26, 0.32, 'sawtooth', 0.11);
    } else if (kind === 'curse') {
      playTone(620, 0, 0.12, 'sine', 0.1);
      playTone(466.16, 0.1, 0.14, 'triangle', 0.1);
      playTone(311.13, 0.22, 0.26, 'sine', 0.11);
    } else if (kind === 'win') {
      playTone(523.25, 0, 0.14, 'triangle', 0.14);
      playTone(659.25, 0.11, 0.14, 'triangle', 0.14);
      playTone(783.99, 0.22, 0.16, 'triangle', 0.14);
      playTone(1046.5, 0.35, 0.42, 'sine', 0.16);
      playTone(1318.51, 0.5, 0.52, 'sine', 0.14);
    } else {
      playTone(175, 0, 0.15, 'sine', 0.08);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch {}
}

export default function AdventskalenderClient({
  players,
  currentUser,
}: AdventskalenderClientProps) {
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

  // Setup-Konfiguration
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<'1vs1' | 'solo'>('1vs1');
  const [maxRounds, setMaxRounds] = useState<number | null>(4);
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

  // Spiel-Zustand
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [isSuddenDeath, setIsSuddenDeath] = useState<boolean>(false);
  const [doors, setDoors] = useState<AdventsDoorState[]>(() => createShuffledDoors('1vs1'));
  const [p1State, setP1State] = useState<AdventsPlayerState>(createInitialAdventsPlayerState);
  const [p2State, setP2State] = useState<AdventsPlayerState>(createInitialAdventsPlayerState);
  const [lastAction, setLastAction] = useState<AdventsLastActionBanner | null>(null);
  const [winnerPlayer, setWinnerPlayer] = useState<1 | 2 | 'draw' | null>(null);
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
        localStorage.getItem('lions_active_board_adventskalender') ||
        localStorage.getItem('lions_active_board') ||
        '1'
      );
    }
    return '1';
  });

  const [gameSessionId, setGameSessionId] = useState<string>(() =>
    generateSessionId('adventskalender', activeBoard)
  );
  const liveBroadcastRef = useRef<BroadcastChannel | null>(null);

  const playSound = useCallback(
    (kind: SoundKind) => {
      if (soundEnabled) {
        createAdventsSound(kind);
      }
    },
    [soundEnabled]
  );

  const handleSelectBoard = (b: string) => {
    setActiveBoard(b);
    try {
      localStorage.setItem('lions_tablet_board', b);
      localStorage.setItem('lions_active_board', b);
      localStorage.setItem('lions_active_board_adventskalender', b);
      window.history.replaceState(null, '', `/special/adventskalender?board=${b}`);
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      liveBroadcastRef.current = new BroadcastChannel(`lions_adventskalender_live_sync_${activeBoard}`);
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
          Array.isArray(cached.doors) &&
          cached.doors.length === 24 &&
          (cached.p1State?.dartsThrown > 0 ||
            cached.p2State?.dartsThrown > 0 ||
            cached.p1State?.roundsPlayed > 0 ||
            cached.p2State?.roundsPlayed > 0)
        ) {
          setCachedSessionToResume(cached);
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden des Adventskalender-Caches:', e);
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
      dList: AdventsDoorState[],
      p1S: AdventsPlayerState,
      p2S: AdventsPlayerState,
      actPlayer: 1 | 2,
      rNum: number,
      sudden: boolean,
      banner: AdventsLastActionBanner | null,
      winPlayer: 1 | 2 | 'draw' | null,
      overrideSessionId?: string
    ) => {
      const winnerDisplayName =
        winPlayer === 1 ? p1Name : winPlayer === 2 ? p2Name : winPlayer === 'draw' ? 'Unentschieden' : null;

      return {
        boardId: activeBoard,
        sessionId: overrideSessionId || gameSessionId,
        status: finished ? ('completed' as const) : ('playing' as const),
        gameType: 'adventskalender' as const,
        gameTitle: 'Der verhexte Adventskalender',
        gameMode,
        p1Name: p1Name.trim() || 'Spieler 1',
        p2Name: p2Name.trim() || 'Spieler 2',
        activePlayer: actPlayer,
        currentRound: rNum,
        scoreP1: p1S.score,
        scoreP2: p2S.score,
        winner: winnerDisplayName || undefined,
        adventskalenderData: {
          maxRounds,
          roundNumber: rNum,
          isSuddenDeath: sudden,
          doors: dList,
          p1: p1S,
          p2: p2S,
          lastAction: banner,
          winnerPlayer: winPlayer,
          winnerName: winnerDisplayName,
        },
        updatedAt: Date.now(),
      };
    },
    [activeBoard, gameSessionId, gameMode, maxRounds, p1Name, p2Name]
  );

  // 4s Heartbeat solange aktiv oder im Sieger-Screen
  useEffect(() => {
    if (!isGameStarted && !isGameFinished) return;
    const interval = setInterval(() => {
      const payload = buildLivePayload(
        isGameFinished,
        doors,
        p1State,
        p2State,
        activePlayer,
        roundNumber,
        isSuddenDeath,
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
    doors,
    p1State,
    p2State,
    activePlayer,
    roundNumber,
    isSuddenDeath,
    lastAction,
    winnerPlayer,
  ]);

  const broadcastLiveState = useCallback(
    (
      started: boolean,
      finished: boolean,
      dList: AdventsDoorState[],
      p1S: AdventsPlayerState,
      p2S: AdventsPlayerState,
      actPlayer: 1 | 2,
      rNum: number,
      sudden: boolean,
      banner: AdventsLastActionBanner | null,
      winPlayer: 1 | 2 | 'draw' | null,
      overrideSessionId?: string
    ) => {
      if (!started && !finished) return;
      const payload = buildLivePayload(
        finished,
        dList,
        p1S,
        p2S,
        actPlayer,
        rNum,
        sudden,
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
        doors,
        p1State,
        p2State,
        activePlayer,
        roundNumber,
        isSuddenDeath,
        lastAction,
        winnerPlayer
      );
    }
  }, [
    isGameStarted,
    isGameFinished,
    doors,
    p1State,
    p2State,
    activePlayer,
    roundNumber,
    isSuddenDeath,
    lastAction,
    winnerPlayer,
    broadcastLiveState,
  ]);

  // Atomarer Cache nach jedem Wurf
  useEffect(() => {
    if (
      isGameStarted &&
      !isGameFinished &&
      (p1State.dartsThrown > 0 ||
        p2State.dartsThrown > 0 ||
        p1State.roundsPlayed > 0 ||
        p2State.roundsPlayed > 0)
    ) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            isGameStarted,
            isGameFinished,
            gameMode,
            maxRounds,
            p1Name,
            p2Name,
            isGuestP1,
            isGuestP2,
            activePlayer,
            roundNumber,
            isSuddenDeath,
            doors,
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
    maxRounds,
    p1Name,
    p2Name,
    isGuestP1,
    isGuestP2,
    activePlayer,
    roundNumber,
    isSuddenDeath,
    doors,
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

    const freshId = generateSessionId('adventskalender', activeBoard);
    const freshDoors = createShuffledDoors(gameMode);
    const initP1 = createInitialAdventsPlayerState();
    const initP2 = createInitialAdventsPlayerState();
    const startBanner: AdventsLastActionBanner = {
      id: Date.now(),
      tone: 'info',
      icon: '🚪',
      headline: 'KALENDER GEMISCHT!',
      subline:
        gameMode === '1vs1'
          ? `${cleanP1} eröffnet gegen ${cleanP2} – wirf 1–20, Doppel (21), Triple (22) & Bull (23/24)!`
          : `${cleanP1} startet die 24-Türchen-Jagd auf 1–20, Doppel, Triple & Bull!`,
      actorPlayer: 1,
    };

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setCachedSessionToResume(null);
    setRestoredFromCache(false);
    setGameSessionId(freshId);
    setDoors(freshDoors);
    setP1State(initP1);
    setP2State(initP2);
    setActivePlayer(1);
    setRoundNumber(1);
    setIsSuddenDeath(false);
    setWinnerPlayer(null);
    setUndoStack([]);
    setLastAction(startBanner);
    setIsGameFinished(false);
    setIsGameStarted(true);

    broadcastLiveState(
      true,
      false,
      freshDoors,
      initP1,
      initP2,
      1,
      1,
      false,
      startBanner,
      null,
      freshId
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
    setMaxRounds(typeof c.maxRounds === 'number' && c.maxRounds > 0 ? c.maxRounds : null);
    setP1Name(c.p1Name || defaultP1);
    setP2Name(c.p2Name || 'Gastspieler');
    setIsGuestP1(Boolean(c.isGuestP1));
    setIsGuestP2(Boolean(c.isGuestP2));
    setActivePlayer(c.activePlayer === 2 ? 2 : 1);
    setRoundNumber(Number(c.roundNumber || 1));
    setIsSuddenDeath(Boolean(c.isSuddenDeath));
    setDoors(
      Array.isArray(c.doors) && c.doors.length === 24
        ? c.doors
        : createShuffledDoors(c.gameMode === 'solo' ? 'solo' : '1vs1')
    );
    setP1State(c.p1State || createInitialAdventsPlayerState());
    setP2State(c.p2State || createInitialAdventsPlayerState());
    setLastAction(c.lastAction ?? null);
    setWinnerPlayer(c.winnerPlayer ?? null);
    setUndoStack(Array.isArray(c.undoStack) ? c.undoStack : []);
    setGameSessionId(c.gameSessionId || generateSessionId('adventskalender', activeBoard));
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

  // Undo (Korrektur)
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setActivePlayer(prev.activePlayer);
    setRoundNumber(prev.roundNumber);
    setIsSuddenDeath(prev.isSuddenDeath);
    setDoors(cloneDoors(prev.doors));
    setP1State(cloneAdventsPlayerState(prev.p1State));
    setP2State(cloneAdventsPlayerState(prev.p2State));
    setLastAction(prev.lastAction);
    setWinnerPlayer(prev.winnerPlayer);
    setIsGameFinished(prev.isGameFinished);
    setIsGameStarted(true);
  };

  const pushSnapshot = () => {
    const snap: TurnSnapshot = {
      activePlayer,
      roundNumber,
      isSuddenDeath,
      doors: cloneDoors(doors),
      p1State: cloneAdventsPlayerState(p1State),
      p2State: cloneAdventsPlayerState(p2State),
      lastAction,
      winnerPlayer,
      isGameFinished,
    };
    setUndoStack((prev) => [...prev.slice(-49), snap]);
  };

  // Zugabschluss & Spielende prüfen
  const commitTurnStep = (
    nextDoors: AdventsDoorState[],
    nextP1: AdventsPlayerState,
    nextP2: AdventsPlayerState,
    banner: AdventsLastActionBanner
  ) => {
    const ownAfter = activePlayer === 1 ? nextP1 : nextP2;
    let nextActive: 1 | 2 = activePlayer;
    let nextRound = roundNumber;
    let nextSudden = isSuddenDeath;
    let winPlayer: 1 | 2 | 'draw' | null = null;
    let finalBanner = banner;

    const allOpened = countOpenDoors(nextDoors) >= 24;

    if (allOpened) {
      ownAfter.roundsPlayed += 1;
      ownAfter.activeCurses = [];
      if (gameMode === 'solo') {
        winPlayer = 1;
      } else if (nextP1.score > nextP2.score) {
        winPlayer = 1;
      } else if (nextP2.score > nextP1.score) {
        winPlayer = 2;
      } else {
        winPlayer = 'draw';
      }
      playSound('win');
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {}
    } else {
      const maxDartsForOwn = getMaxDartsForCurses(ownAfter.activeCurses);

      if (ownAfter.currentTurnDarts.length >= maxDartsForOwn) {
        ownAfter.roundsPlayed += 1;
        ownAfter.activeCurses = [];

        if (gameMode === '1vs1') {
          if (activePlayer === 1) {
            nextActive = 2;
            nextP2.activeCurses = [...nextP2.pendingCurses];
            nextP2.pendingCurses = [];
            nextP2.currentTurnDarts = [];
          } else {
            // Spieler 2 hat die Runde abgeschlossen -> Rundenlimit prüfen
            if (maxRounds !== null && roundNumber >= maxRounds) {
              if (nextP1.score !== nextP2.score) {
                winPlayer = nextP1.score > nextP2.score ? 1 : 2;
                playSound('win');
                try {
                  localStorage.removeItem(CACHE_KEY);
                } catch {}
              } else {
                // Gleichstand nach Rundenende -> Sudden Death!
                nextSudden = true;
                nextRound = roundNumber + 1;
                nextActive = 1;
                nextP1.activeCurses = [...nextP1.pendingCurses];
                nextP1.pendingCurses = [];
                nextP1.currentTurnDarts = [];
                finalBanner = {
                  ...banner,
                  subline: `${banner.subline} • 🔥 Gleichstand! Weiter mit Sudden Death!`,
                };
              }
            } else {
              nextRound = roundNumber + 1;
              nextActive = 1;
              nextP1.activeCurses = [...nextP1.pendingCurses];
              nextP1.pendingCurses = [];
              nextP1.currentTurnDarts = [];
            }
          }
        } else {
          // Solo-Modus
          if (maxRounds !== null && roundNumber >= maxRounds) {
            winPlayer = 1;
            playSound('win');
            try {
              localStorage.removeItem(CACHE_KEY);
            } catch {}
          } else {
            nextRound = roundNumber + 1;
            nextP1.activeCurses = [...nextP1.pendingCurses];
            nextP1.pendingCurses = [];
            nextP1.currentTurnDarts = [];
          }
        }
      }
    }

    setDoors(nextDoors);
    setP1State(nextP1);
    setP2State(nextP2);
    setActivePlayer(nextActive);
    setRoundNumber(nextRound);
    setIsSuddenDeath(nextSudden);
    setLastAction(finalBanner);
    setWinnerPlayer(winPlayer);
    setIsGameFinished(winPlayer !== null);
  };

  // A) Tipp auf Kalendertürchen 1..24
  const handleDoorHit = (doorNum: AdventsDoorNumber) => {
    if (isGameFinished) return;
    const currentOwn = activePlayer === 1 ? p1State : p2State;
    if (currentOwn.activeCurses.includes('skip_round')) return;
    pushSnapshot();

    const nextDoors = cloneDoors(doors);
    const nextP1 = cloneAdventsPlayerState(p1State);
    const nextP2 = cloneAdventsPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const opp = activePlayer === 1 ? nextP2 : nextP1;
    const activeName = activePlayer === 1 ? p1Name : p2Name;
    const oppName = activePlayer === 1 ? p2Name : p1Name;

    const curMaxDarts = getMaxDartsForCurses(own.activeCurses);
    if (own.currentTurnDarts.length >= curMaxDarts) own.currentTurnDarts = [];

    const door = nextDoors.find((d) => d.number === doorNum);
    if (!door) return;

    const targetMeta = getDoorTargetLabel(doorNum);
    const doorTitleLabel = targetMeta.isSpecial
      ? `TÜRCHEN ${doorNum} (${targetMeta.label})`
      : `TÜRCHEN ${doorNum}`;

    if (door.isOpen) {
      own.dartsThrown += 1;
      own.currentTurnDarts.push({
        kind: 'door_empty',
        doorNumber: doorNum,
        label: `🚪 ${doorNum}`,
        subLabel: 'Leer',
        tone: 'niete',
      });
      playSound('niete');
      const banner: AdventsLastActionBanner = {
        id: Date.now(),
        doorNumber: doorNum,
        tone: 'niete',
        icon: '🕯️',
        headline: `${doorTitleLabel} SCHON LEER`,
        subline: `${activeName} trifft das bereits geöffnete Türchen ${doorNum} – keine Punkte.`,
        actorPlayer: activePlayer,
      };
      commitTurnStep(nextDoors, nextP1, nextP2, banner);
      return;
    }

    // Türchen war geschlossen -> Öffnen!
    door.isOpen = true;
    door.openedBy = activePlayer;
    door.openedInRound = roundNumber;
    own.doorsOpened += 1;
    own.dartsThrown += 1;

    const rw = door.reward;
    let ev: AdventsDartEvent = {
      kind: 'door_opened',
      doorNumber: doorNum,
      label: `${rw.icon} #${doorNum}`,
      subLabel: rw.shortBadge,
      tone: rw.tone,
    };

    const banner: AdventsLastActionBanner = {
      id: Date.now(),
      doorNumber: doorNum,
      tone: rw.tone,
      icon: rw.icon,
      headline: `${doorTitleLabel}: ${rw.title.toUpperCase()}!`,
      subline: '',
      actorPlayer: activePlayer,
    };

    const pointsMeta = POINTS_REWARD_MAP[rw.kind];
    const curseType = CURSE_REWARD_MAP[rw.kind];

    if (pointsMeta) {
      own.score += pointsMeta.points;
      playSound(pointsMeta.isJackpot ? 'jackpot' : 'good');
      banner.subline = `${activeName} ${pointsMeta.isJackpot ? 'räumt' : 'schnappt sich'} +${pointsMeta.points} ${pointsMeta.label} ab (Stand: ${own.score})!`;
    } else if (curseType) {
      const meta = CURSE_UI_META[curseType];
      const targetPlayer = gameMode === '1vs1' ? opp : own;
      const targetName = gameMode === '1vs1' ? oppName : activeName;
      if ((targetPlayer.shieldsCount ?? 0) > 0) {
        targetPlayer.shieldsCount = (targetPlayer.shieldsCount ?? 1) - 1;
        ev = { ...ev, subLabel: '🛡️ GEBLOCKT', tone: 'good' };
        playSound('good');
        banner.tone = 'good';
        banner.icon = '🛡️';
        banner.headline = '🛡️ FLUCH ABGEWEHRT!';
        banner.subline = `${targetName} wehrt ${rw.title} (${meta.badge}) mit 1 Schutzschild ab (noch ${targetPlayer.shieldsCount})!`;
      } else {
        if (!targetPlayer.pendingCurses.includes(curseType)) {
          targetPlayer.pendingCurses.push(curseType);
        }
        playSound('curse');
        banner.headline = `${meta.icon} ${rw.title.toUpperCase()}: ${meta.badge}`;
        banner.subline = `${targetName} ${meta.warning}`;
      }
    } else {
      switch (rw.kind) {
        case 'bell_bless_30':
        case 'bell_bless_35':
        case 'bell_bless_45': {
          const pts = rw.kind === 'bell_bless_45' ? 45 : rw.kind === 'bell_bless_35' ? 35 : 30;
          const hadCurses = own.activeCurses.length + own.pendingCurses.length > 0;
          own.score += pts;
          own.activeCurses = [];
          own.pendingCurses = [];
          playSound('good');
          banner.subline = hadCurses
            ? `${activeName} erhält +${pts} Pkt UND wird von allen Flüchen geheilt!`
            : `${activeName} erhält +${pts} Glöckchen-Punkte (von allen Flüchen befreit)!`;
          break;
        }

        case 'shield_angel': {
          own.shieldsCount = (own.shieldsCount ?? 0) + 2;
          playSound('good');
          banner.headline = '🛡️ SCHUTZ-ENGEL: +2 SCHILDE!';
          banner.subline = `${activeName} erhält 2 Schutzschilde (gesamt: ${own.shieldsCount}) gegen Flüche & Diebstahl!`;
          break;
        }

        case 'steal_25':
        case 'steal_50': {
          const isSteal50 = rw.kind === 'steal_50';
          if (gameMode === '1vs1' && (opp.shieldsCount ?? 0) > 0) {
            opp.shieldsCount = (opp.shieldsCount ?? 1) - 1;
            ev = { ...ev, subLabel: '🛡️ GEBLOCKT', tone: 'niete' };
            playSound('curse');
            banner.tone = 'good';
            banner.icon = '🛡️';
            banner.headline = '🛡️ DIEBSTAHL ABGEWEHRT!';
            banner.subline = `${oppName} blockt den ${rw.title} mit 1 Schutzschild ab (noch ${opp.shieldsCount})!`;
          } else if (isSteal50) {
            const stolen = Math.min(50, opp.score);
            opp.score -= stolen;
            own.score += stolen;
            playSound(stolen > 0 ? 'jackpot' : 'good');
            banner.subline =
              stolen > 0
                ? `${activeName} raubt ${oppName} ganze ${stolen} Punkte (Stand: ${own.score})!`
                : `${activeName} will 50 Pkt klauen, aber ${oppName} hat 0 Punkte!`;
          } else {
            const stolen = Math.min(25, opp.score);
            opp.score -= stolen;
            own.score += 25;
            playSound('good');
            banner.subline =
              stolen > 0
                ? `${activeName} bekommt +25 Pkt und stiehlt ${oppName} ${stolen} Pkt!`
                : `${activeName} ergattert +25 Wichtel-Punkte!`;
          }
          break;
        }

        case 'double_star': {
          if (own.score > 0) {
            own.score *= 2;
            banner.subline = `${activeName} VERDOPPELT auf sensationelle ${own.score} Punkte!`;
          } else {
            own.score += 40;
            banner.subline = `${activeName} startet mit +40 Weihnachtsstern-Punkten!`;
          }
          playSound('jackpot');
          break;
        }

        case 'grinch_swap': {
          const tmp = own.score;
          own.score = opp.score;
          opp.score = tmp;
          own.grinchHits += 1;
          playSound('grinch');
          banner.headline = '👹 DER GRINCH TAUSCHT DIE PUNKTE!';
          banner.subline = `${activeName} & ${oppName} tauschen eiskalt die Punktestände (${opp.score} ⇄ ${own.score})!`;
          break;
        }

        case 'roulette_duel': {
          const lucky = Math.random() >= 0.5;
          if (lucky) {
            own.score += 60;
            playSound('jackpot');
            ev = { ...ev, subLabel: '+60 GLÜCK!', tone: 'jackpot' };
            banner.tone = 'jackpot';
            banner.headline = '🎲 WICHTEL-ROULETTE: +60 PKT!';
            banner.subline = `${activeName} gewinnt beim Wichtel-Roulette +60 Pkt (Stand: ${own.score})!`;
          } else {
            own.score = Math.max(0, own.score - 30);
            own.grinchHits += 1;
            playSound('grinch');
            ev = { ...ev, subLabel: '-30 PECH!', tone: 'grinch' };
            banner.tone = 'grinch';
            banner.headline = '🎲 WICHTEL-ROULETTE: -30 PKT!';
            banner.subline = `Pech beim Wichtel-Roulette! ${activeName} verliert 30 Pkt (Stand: ${own.score})!`;
          }
          break;
        }

        case 'grinch_trap_30':
        case 'grinch_trap_50': {
          const penalty = rw.kind === 'grinch_trap_50' ? 50 : 30;
          own.score = Math.max(0, own.score - penalty);
          own.grinchHits += 1;
          playSound('grinch');
          banner.headline =
            rw.kind === 'grinch_trap_50'
              ? '🥶 EISZAPFEN-SCHOCK! -50 PKT'
              : '😈 GRINCH-FALLE! -30 PKT';
          banner.subline = `${activeName} verliert sofort ${penalty} Punkte – neuer Stand: ${own.score} Pkt!`;
          break;
        }

        case 'solo_gamble': {
          const lucky = Math.random() >= 0.5;
          if (lucky) {
            own.score += 80;
            playSound('jackpot');
            ev = { ...ev, subLabel: '+80 LUCKY!', tone: 'jackpot' };
            banner.tone = 'jackpot';
            banner.headline = '🎲 GRINCH-ROULETTE: JACKPOT +80!';
            banner.subline = `${activeName} gewinnt beim Roulette +80 Pkt (Stand: ${own.score})!`;
          } else {
            own.score = Math.floor(own.score / 2);
            own.grinchHits += 1;
            playSound('grinch');
            ev = { ...ev, subLabel: '½ HALBIERT', tone: 'grinch' };
            banner.headline = '👹 GRINCH-ROULETTE: HALBIERT!';
            banner.subline = `Der Grinch halbiert ${activeName}s Konto auf ${own.score} Pkt!`;
          }
          break;
        }

        case 'niete_0':
        default:
          playSound('niete');
          banner.subline = `${activeName} öffnet nur verbrannte Plätzchen (0 Punkte).`;
          break;
      }
    }

    own.currentTurnDarts.push(ev);
    commitTurnStep(nextDoors, nextP1, nextP2, banner);
  };

  // B) Fehlwurf (Daneben)
  const handleMiss = () => {
    if (isGameFinished) return;
    const currentOwn = activePlayer === 1 ? p1State : p2State;
    if (currentOwn.activeCurses.includes('skip_round')) return;
    pushSnapshot();

    const nextDoors = cloneDoors(doors);
    const nextP1 = cloneAdventsPlayerState(p1State);
    const nextP2 = cloneAdventsPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    const maxDarts = getMaxDartsForCurses(own.activeCurses);
    if (own.currentTurnDarts.length >= maxDarts) own.currentTurnDarts = [];

    own.dartsThrown += 1;
    own.currentTurnDarts.push({
      kind: 'miss',
      label: 'MISS',
      subLabel: 'Daneben',
      tone: 'miss',
    });

    playSound('miss');
    const banner: AdventsLastActionBanner = {
      id: Date.now(),
      doorNumber: null,
      tone: 'miss',
      icon: '✕',
      headline: 'DANEBEN',
      subline: `${activeName} trifft kein Kalendertürchen (1–24).`,
      actorPlayer: activePlayer,
    };

    commitTurnStep(nextDoors, nextP1, nextP2, banner);
  };

  // C) Restliche Darts dieser Aufnahme als Miss buchen
  const handleRestMiss = () => {
    if (isGameFinished) return;
    const currentOwn = activePlayer === 1 ? p1State : p2State;
    if (currentOwn.activeCurses.includes('skip_round')) return;
    pushSnapshot();

    const nextDoors = cloneDoors(doors);
    const nextP1 = cloneAdventsPlayerState(p1State);
    const nextP2 = cloneAdventsPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    const maxDarts = getMaxDartsForCurses(own.activeCurses);
    const existing = own.currentTurnDarts.length >= maxDarts ? 0 : own.currentTurnDarts.length;
    if (existing === 0) own.currentTurnDarts = [];
    const remaining = Math.max(1, maxDarts - existing);

    own.dartsThrown += remaining;
    for (let i = 0; i < remaining; i += 1) {
      own.currentTurnDarts.push({
        kind: 'miss',
        label: 'MISS',
        subLabel: 'Daneben',
        tone: 'miss',
      });
    }

    playSound('miss');
    const banner: AdventsLastActionBanner = {
      id: Date.now(),
      doorNumber: null,
      tone: 'miss',
      icon: '✕',
      headline: 'AUFNAHME DANEBEN',
      subline: `${activeName} beendet die Aufnahme ohne weiteres Türchen.`,
      actorPlayer: activePlayer,
    };

    commitTurnStep(nextDoors, nextP1, nextP2, banner);
  };

  // D) Runde wegen Schneewehen-Fluch (skip_round) mit 0 Darts aussetzen
  const handleSkipRound = () => {
    if (isGameFinished) return;
    const currentOwn = activePlayer === 1 ? p1State : p2State;
    if (!currentOwn.activeCurses.includes('skip_round')) return;
    pushSnapshot();

    const nextDoors = cloneDoors(doors);
    const nextP1 = cloneAdventsPlayerState(p1State);
    const nextP2 = cloneAdventsPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    own.currentTurnDarts = [];
    playSound('curse');

    const banner: AdventsLastActionBanner = {
      id: Date.now(),
      doorNumber: null,
      tone: 'curse',
      icon: '⛄',
      headline: 'EINGESCHNEIT! RUNDE AUSGESETZT',
      subline: `${activeName} steckt in der Schneewehe und wird mit 0 Darts weitergeschaltet.`,
      actorPlayer: activePlayer,
    };

    commitTurnStep(nextDoors, nextP1, nextP2, banner);
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
            data-ui-id="ADVENT.SETUP.BACK_BTN"
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
            data-ui-id="ADVENT.RESUME.DIALOG"
            className="rounded-3xl p-5 sm:p-6 bg-amber-950/60 border-2 border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.3)] space-y-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-amber-200">
                  Unterbrochenes Spiel gefunden!
                </h2>
                <p className="text-xs sm:text-sm text-amber-100/90 mt-1">
                  <strong>{cachedSessionToResume.p1Name}</strong>
                  {cachedSessionToResume.gameMode === '1vs1' ? (
                    <>
                      {' '}vs. <strong>{cachedSessionToResume.p2Name}</strong> (
                      {cachedSessionToResume.p1State?.score ?? 0} : {cachedSessionToResume.p2State?.score ?? 0} Pkt)
                    </>
                  ) : (
                    <> ({cachedSessionToResume.p1State?.score ?? 0} Pkt)</>
                  )}{' '}
                  • {countOpenDoors(cachedSessionToResume.doors || [])}/24 Türchen offen • Runde{' '}
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
        <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-[#230910]/90 via-slate-900/95 to-[#161006]/90 border-2 border-amber-500/40 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl">
                🚪
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Der verhexte Adventskalender
                </h1>
                <p className="text-xs sm:text-sm text-amber-300 font-semibold">
                  24 Mystery-Türchen (1–20, Doppel, Triple, Bull) · Schilde, Steal, Grinch &amp; Flüche!
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
                      ? 'bg-amber-400 text-slate-950 shadow-lg'
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
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>1 vs. 1 Duell (Party-Standard)</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('solo')}
                className={`min-h-[56px] px-4 py-3 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  gameMode === 'solo'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Solo-Challenge</span>
              </button>
            </div>
          </div>

          {/* Spielerauswahl */}
          <div className={`grid gap-4 ${gameMode === '1vs1' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-mono font-black uppercase tracking-wider text-red-300">
                  {gameMode === '1vs1' ? 'Spieler 1 · Rot' : 'Spieler 1'}
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
                    Spieler 2 · Gold
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

          {/* Spiellänge */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Spiellänge (Endet automatisch, wenn alle 24 Türchen offen sind)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { val: 4, label: '4 Runden (8 Türen)', sub: 'Schnell · Party-Duell' },
                { val: 6, label: '6 Runden (12 Türen)', sub: 'Mittel · Taktik & Chaos' },
                { val: 8, label: '8 Runden (16 Türen)', sub: 'Lang · Große Punktejagd' },
                { val: null, label: 'Alle 24 Türchen', sub: 'Voller Kalender bis Tür 24' },
              ].map((opt) => (
                <button
                  key={String(opt.val)}
                  type="button"
                  onClick={() => setMaxRounds(opt.val)}
                  className={`min-h-[58px] px-4 py-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    maxRounds === opt.val
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-lg'
                      : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div className="text-sm font-black">{opt.label}</div>
                  <div className="text-[11px] text-slate-400">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartGame}
            data-ui-id="ADVENT.SETUP.START_BTN"
            className="w-full min-h-[60px] py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-amber-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>🚪 Türchen mischen &amp; Spiel starten</span>
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
  const openCount = countOpenDoors(doors);
  const totalDoors = doors.length || 24;
  const hasSkipRoundCurse = ownState.activeCurses.includes('skip_round');
  const hasOneDartCurse = ownState.activeCurses.includes('one_dart');
  const hasTwoDartsCurse = ownState.activeCurses.includes('two_darts');
  const activeHeaderCurses = ownState.activeCurses;

  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-5 space-y-3.5 animate-fadeIn">
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
            {isSuddenDeath
              ? '🔥 SUDDEN DEATH'
              : maxRounds
              ? `RUNDE ${roundNumber}/${maxRounds}`
              : `RUNDE ${roundNumber}`}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 font-mono text-xs font-black">
            {openCount}/{totalDoors} OFFEN
          </span>
          {!isGameFinished &&
            activeHeaderCurses.map((c) => {
              const meta = CURSE_UI_META[c];
              return (
                <span
                  key={`hdr-${c}`}
                  className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-black animate-pulse ${meta.chipCls}`}
                >
                  {meta.icon} {meta.badge}
                </span>
              );
            })}
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
            title={soundEnabled ? 'Ton ausschalten' : 'Ton einschalten'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
            title="Regeln anzeigen"
          >
            <HelpCircle className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </div>

      {/* Regel-Hilfe Box */}
      {showHelp && (
        <div className="rounded-2xl p-4 bg-slate-900/95 border border-amber-400/40 text-xs sm:text-sm text-slate-200 space-y-1.5">
          <div className="font-black text-amber-300">🚪 Spielregeln: Der verhexte Adventskalender (24 Türchen)</div>
          <p>
            1. Wirf am Dartboard die Zahlen <strong>1 bis 20</strong> (Single, Double oder Triple egal) sowie{' '}
            <strong>Doppel (Tür 21)</strong>, <strong>Triple (Tür 22)</strong>, <strong>Single Bull 25 (Tür 23)</strong>{' '}
            und <strong>Bullseye 50 / D20 (Tür 24)</strong>!
          </p>
          <p>
            2. Hinter den 24 Türchen warten <strong>Punkte (+25 bis +75)</strong>, der{' '}
            <strong>Schutz-Engel (2× Schild gegen Flüche &amp; Diebstahl)</strong>, der{' '}
            <strong>Weihnachtsstern (×2)</strong>, der <strong>Geschenke-Räuber (klaut bis zu 50 Pkt)</strong>,{' '}
            <strong>Wichtel-Roulette (+60 / -30)</strong>, der <strong>Grinch (Punkte-Tausch!)</strong> sowie 6 fiese
            Flüche (<strong>Falsche Hand</strong>, <strong>Nur 2 Darts</strong>, <strong>Nur 1 Dart</strong>,{' '}
            <strong>Im Sitzen</strong>, <strong>Runde aussetzen</strong> &amp; <strong>360°-Drehwurm</strong>).
          </p>
          <p>3. Bereits geöffnete Türchen bleiben leer. Wer am Ende die meisten Punkte hat, gewinnt!</p>
        </div>
      )}

      {/* Spieler Status Karten */}
      <div className={`grid gap-3 ${gameMode === '1vs1' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {[1, ...(gameMode === '1vs1' ? [2] : [])].map((pNum) => {
          const isP1 = pNum === 1;
          const st = isP1 ? p1State : p2State;
          const name = isP1 ? p1Name : p2Name;
          const isAct = !isGameFinished && activePlayer === pNum;
          const isWin = winnerPlayer === pNum;
          const shields = st.shieldsCount ?? 0;

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
                  <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2 mt-0.5 flex-wrap">
                    {isWin ? (
                      <span className="text-amber-300 font-black">🏆 SIEGER!</span>
                    ) : isAct ? (
                      <span className={`${isP1 ? 'text-red-300' : 'text-amber-300'} font-black`}>
                        🎯 AM WURF
                      </span>
                    ) : (
                      <span className="text-slate-400">Wartet</span>
                    )}
                    <span className="text-slate-400">· {st.doorsOpened} Türchen</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-2xl sm:text-4xl font-black font-mono ${
                      isP1 ? 'text-red-300' : 'text-amber-300'
                    }`}
                  >
                    {st.score}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">PUNKTE</span>
                </div>
              </div>

              {(shields > 0 || st.activeCurses.length > 0 || st.pendingCurses.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-2 font-mono text-[10px] font-black">
                  {shields > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-300 text-emerald-100">
                      🛡️ SCHUTZSCHILD ×{shields}
                    </span>
                  )}
                  {st.activeCurses.map((c) => {
                    const meta = CURSE_UI_META[c];
                    return (
                      <span
                        key={`act-${c}`}
                        className={`px-2 py-0.5 rounded-md border ${meta.chipCls}`}
                      >
                        {meta.icon} {meta.badge}
                      </span>
                    );
                  })}
                  {st.pendingCurses.map((c) => {
                    const meta = CURSE_UI_META[c];
                    return (
                      <span
                        key={`pend-${c}`}
                        className="px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-400/50 text-sky-200"
                      >
                        ⏳ Nächste: {meta.icon} {meta.short}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Prominenter Fluch-Hinweisbalken für den aktiven Werfer */}
      {!isGameFinished && ownState.activeCurses.length > 0 && (
        <div className="rounded-2xl px-4 py-3 bg-gradient-to-r from-sky-950/90 via-red-950/85 to-purple-950/90 border-2 border-sky-400 text-center space-y-2 animate-pulse shadow-[0_0_25px_rgba(56,189,248,0.35)]">
          {ownState.activeCurses.map((c) => {
            const meta = CURSE_UI_META[c];
            return (
              <div
                key={`warn-${c}`}
                className="text-xs sm:text-sm font-black text-white uppercase tracking-wide"
              >
                {meta.icon} ACHTUNG: {ownName} {meta.warning}
              </div>
            );
          })}

          {hasSkipRoundCurse && (
            <button
              type="button"
              onClick={handleSkipRound}
              data-ui-id="ADVENT.PLAY.SKIP_ROUND_BTN"
              className="w-full min-h-[56px] px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.99]"
            >
              <span>⛄ Eingeschneit! Runde aussetzen (0 Darts weiter)</span>
            </button>
          )}
        </div>
      )}

      {/* Live Event Banner */}
      {lastAction && (
        <div
          className={`rounded-2xl px-4 py-2.5 border text-center transition-all ${
            lastAction.tone === 'grinch'
              ? 'bg-purple-950/80 border-purple-400 text-purple-100'
              : lastAction.tone === 'curse'
              ? 'bg-sky-950/80 border-sky-400 text-sky-100'
              : lastAction.tone === 'jackpot' || lastAction.tone === 'win'
              ? 'bg-amber-950/75 border-amber-400 text-amber-100'
              : lastAction.tone === 'good'
              ? 'bg-emerald-950/75 border-emerald-400 text-emerald-100'
              : lastAction.tone === 'niete' || lastAction.tone === 'miss'
              ? 'bg-red-950/60 border-red-500/55 text-red-100'
              : 'bg-slate-900/75 border-white/15 text-slate-200'
          }`}
        >
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider mr-2">
            {lastAction.icon} {lastAction.headline}
          </span>
          <span className="text-xs sm:text-sm opacity-95">{lastAction.subline}</span>
        </div>
      )}

      {/* Sieger-Banner am Tablet */}
      {isGameFinished && winnerPlayer && (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-950/80 via-slate-900/95 to-red-950/80 border-2 border-amber-400 text-center space-y-4 shadow-2xl">
          <div className="text-4xl">{winnerPlayer === 'draw' ? '🤝🚪' : '🏆🚪'}</div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {winnerPlayer === 'draw'
                ? 'Unentschieden am Adventskalender!'
                : `${winnerPlayer === 1 ? p1Name : p2Name} gewinnt mit ${
                    winnerPlayer === 1 ? p1State.score : p2State.score
                  } Punkten!`}
            </h2>
            <p className="text-xs sm:text-sm text-amber-200 mt-1">
              {openCount}/{totalDoors} Türchen geöffnet · Runde {roundNumber}
              {gameMode === '1vs1' ? ` • Endstand ${p1State.score} : ${p2State.score}` : ''}
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
              className="min-h-[54px] px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm cursor-pointer"
            >
              🔄 Neu mischen &amp; Revanche
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

      {/* Aktuelle Aufnahme + Korrektur + 24 Türchen Grid */}
      {!isGameFinished && (
        <>
          <div className="grid grid-cols-12 gap-2 items-center">
            {hasSkipRoundCurse ? (
              <div className="col-span-8 sm:col-span-9 min-h-[52px] px-3 py-2 rounded-xl border-2 border-cyan-300 bg-gradient-to-r from-sky-950 via-cyan-900/90 to-sky-950 flex items-center justify-center gap-2 font-mono text-xs sm:text-sm font-black text-cyan-100 animate-pulse">
                <span>⛄</span>
                <span>EINGESCHNEIT · RUNDE AUSSETZEN (0 DARTS)</span>
                <span>❄️</span>
              </div>
            ) : (
              <div className="col-span-8 sm:col-span-9 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => {
                  if ((hasOneDartCurse && idx >= 1) || (hasTwoDartsCurse && idx === 2)) {
                    return (
                      <div
                        key={idx}
                        className="min-h-[52px] px-2 py-1.5 rounded-xl border-2 border-sky-400/70 bg-sky-950/75 flex flex-col items-center justify-center font-mono text-sky-200"
                      >
                        <span className="text-[10px] font-black">
                          {hasOneDartCurse ? '🎯' : '❄️'} Dart {idx + 1}
                        </span>
                        <span className="text-[10px] font-black uppercase">
                          {hasOneDartCurse ? 'GESPERRT' : 'EINGEFROREN'}
                        </span>
                      </div>
                    );
                  }

                  const ev = ownState.currentTurnDarts[idx];
                  const isNext = idx === ownState.currentTurnDarts.length;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[52px] px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center font-mono ${
                        ev
                          ? ev.tone === 'miss' || ev.tone === 'niete'
                            ? 'bg-red-950/70 border-red-500/60 text-red-200'
                            : ev.tone === 'grinch'
                            ? 'bg-purple-500/25 border-purple-400 text-purple-100'
                            : ev.tone === 'curse'
                            ? 'bg-sky-500/25 border-sky-400 text-sky-100'
                            : ev.tone === 'jackpot'
                            ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                            : 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                          : isNext
                          ? 'bg-amber-500/10 border-amber-400 text-amber-300 animate-pulse'
                          : 'bg-slate-950/60 border-white/10 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] font-bold opacity-80">
                        {ev ? ev.label : `Dart ${idx + 1}`}
                      </span>
                      <span className="text-[11px] sm:text-xs font-black truncate max-w-full">
                        {ev ? ev.subLabel : isNext ? 'Bereit' : '•'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

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

          {/* 6x4 / 4x6 Adventskalender Touch-Grid (1 bis 24) */}
          <div className="rounded-3xl p-3.5 sm:p-5 bg-gradient-to-b from-[#230910]/90 via-slate-950/95 to-slate-950 border-2 border-amber-500/35 space-y-3 shadow-2xl">
            <div className="text-center text-xs font-mono uppercase tracking-widest text-amber-300 font-bold">
              🎯 {ownName} wirft ({ownState.score} Pkt) — Tipp getroffenes Türchen (1–24):
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-2.5">
              {doors.map((door) => {
                const target = getDoorTargetLabel(door.number);

                if (!door.isOpen) {
                  return (
                    <button
                      key={door.number}
                      type="button"
                      disabled={hasSkipRoundCurse}
                      onClick={() => handleDoorHit(door.number)}
                      data-ui-id={`ADVENT.PLAY.DOOR_${door.number}`}
                      className={`min-h-[66px] sm:min-h-[76px] rounded-2xl border-2 shadow-lg flex flex-col items-center justify-center p-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
                        target.isSpecial
                          ? 'bg-gradient-to-br from-[#231245] via-[#130e2b] to-slate-950 hover:from-[#2f1859] hover:to-slate-900 border-cyan-300/75 hover:border-cyan-200'
                          : 'bg-gradient-to-br from-[#450e17] via-[#260a12] to-slate-950 hover:from-[#5c1320] hover:to-slate-900 border-amber-400/65 hover:border-amber-300'
                      }`}
                    >
                      {target.isSpecial ? (
                        <>
                          <span className="text-[10px] font-mono font-black text-cyan-300 leading-none">
                            #{door.number}
                          </span>
                          <span className="text-xs sm:text-sm font-black font-mono text-white leading-tight mt-0.5">
                            {target.label}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-cyan-200/85 truncate max-w-full">
                            {target.subLabel}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl sm:text-2xl font-black font-mono text-amber-200 leading-none">
                            {door.number}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-amber-400/90 mt-1 truncate max-w-full">
                            {target.subLabel}
                          </span>
                        </>
                      )}
                    </button>
                  );
                }

                const ownerCls =
                  gameMode === '1vs1' && door.openedBy === 2
                    ? 'border-amber-400/50 bg-slate-900/75'
                    : 'border-red-400/50 bg-slate-900/75';

                return (
                  <button
                    key={door.number}
                    type="button"
                    disabled={hasSkipRoundCurse}
                    onClick={() => handleDoorHit(door.number)}
                    data-ui-id={`ADVENT.PLAY.DOOR_${door.number}`}
                    className={`min-h-[66px] sm:min-h-[76px] rounded-2xl border-2 ${ownerCls} opacity-75 hover:opacity-95 flex flex-col items-center justify-between p-1.5 cursor-pointer active:scale-95 transition-all font-mono disabled:opacity-35 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-between w-full text-[9px] sm:text-[10px] font-black text-slate-400 gap-0.5">
                      <span className="truncate">
                        #{door.number}
                        {target.isSpecial ? `·${target.label}` : ''}
                      </span>
                      {gameMode === '1vs1' && door.openedBy && (
                        <span
                          className={
                            door.openedBy === 1 ? 'text-red-300' : 'text-amber-300'
                          }
                        >
                          P{door.openedBy}
                        </span>
                      )}
                    </div>
                    <span className="text-lg sm:text-xl leading-none">{door.reward.icon}</span>
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-200 truncate max-w-full">
                      {door.reward.shortBadge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Untere Fehlwurf-Leiste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={hasSkipRoundCurse}
              onClick={handleMiss}
              data-ui-id="ADVENT.PLAY.MISS_BTN"
              className="min-h-[60px] px-5 py-3 rounded-2xl bg-red-600/85 hover:bg-red-500 text-white border-2 border-red-400 font-black text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <span>✕ DANEBEN (KEIN TREFFER / MISS)</span>
            </button>

            <button
              type="button"
              disabled={hasSkipRoundCurse}
              onClick={handleRestMiss}
              data-ui-id="ADVENT.PLAY.REST_MISS_BTN"
              className="min-h-[60px] px-5 py-3 rounded-2xl bg-rose-950/90 hover:bg-rose-900 text-rose-100 border-2 border-rose-500/70 font-black text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <span>✕✕✕ Restliche Darts Miss</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
