'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import { generateSessionId } from '@/lib/liveSession';
import {
  GOLF_BOT_CONFIGS,
  GolfBotDifficulty,
  GolfDartShot,
  GolfGameMode,
  GolfHistoryItem,
  GolfHoleDefinition,
  GolfHolePlayerResult,
  GolfHolesCount,
  GolfLastActionBanner,
  GolfPlayerState,
  GolfSessionSavePayload,
  MAX_STROKES_PER_HOLE,
  cloneGolfPlayerState,
  createInitialGolfPlayerState,
  formatToPar,
  generateGolfCourse,
  getCaddyAdvice,
  getDirectCheckoutOptions,
  getGolfTermForScore,
  simulateGolfBotDart,
} from './types';
import { saveDartsGolfSessionAction } from './actions';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Flag,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Tv,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const CACHE_KEY = 'lions_active_dartsgolf_session_v1';
const OFFLINE_QUEUE_KEY = 'lions_dartsgolf_offline_queue_v1';

interface DartsGolfClientProps {
  players: Player[];
  initialHistory: GolfHistoryItem[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

interface GolfSnapshot {
  activePlayer: 1 | 2;
  currentHoleIndex: number;
  p1State: GolfPlayerState;
  p2State: GolfPlayerState;
  lastAction: GolfLastActionBanner | null;
  winnerPlayer: 1 | 2 | 'draw' | null;
  isGameFinished: boolean;
}

type SoundKind = 'drive' | 'overshoot' | 'hole_out' | 'eagle' | 'miss' | 'win';

function playGolfSound(kind: SoundKind) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const tone = (
      freq: number,
      offset: number,
      duration: number,
      type: OscillatorType = 'sine',
      gainVal = 0.12
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(gainVal, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + duration);
    };

    if (kind === 'drive') {
      tone(440, 0, 0.1, 'triangle', 0.11);
      tone(659.25, 0.07, 0.14, 'sine', 0.12);
    } else if (kind === 'overshoot') {
      tone(783.99, 0, 0.09, 'sawtooth', 0.11);
      tone(587.33, 0.08, 0.11, 'sawtooth', 0.11);
      tone(440, 0.17, 0.18, 'triangle', 0.12);
    } else if (kind === 'hole_out') {
      tone(587.33, 0, 0.11, 'triangle', 0.13);
      tone(880, 0.09, 0.22, 'sine', 0.14);
    } else if (kind === 'eagle' || kind === 'win') {
      tone(523.25, 0, 0.12, 'triangle', 0.14);
      tone(659.25, 0.1, 0.12, 'triangle', 0.14);
      tone(783.99, 0.2, 0.14, 'triangle', 0.14);
      tone(1046.5, 0.32, 0.38, 'sine', 0.16);
    } else {
      tone(180, 0, 0.13, 'sine', 0.08);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {}
}

function enqueueOfflineGolf(payloads: GolfSessionSavePayload[]) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: GolfSessionSavePayload[][] = raw ? JSON.parse(raw) : [];
    queue.push(payloads);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export default function DartsGolfClient({
  players,
  initialHistory,
  currentUser,
}: DartsGolfClientProps) {
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
  const [gameMode, setGameMode] = useState<GolfGameMode>('1vsComputer');
  const [holesCount, setHolesCount] = useState<GolfHolesCount>(18);
  const [botDifficulty, setBotDifficulty] = useState<GolfBotDifficulty>('clubmeister');
  const [p1Name, setP1Name] = useState<string>(defaultP1);
  const [p2Name, setP2Name] = useState<string>(validPlayers[1]?.name || 'Dirk Ostermann');
  const [isGuestP2, setIsGuestP2] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [selectedMultiplier, setSelectedMultiplier] = useState<1 | 2 | 3>(1);
  const [historyList, setHistoryList] = useState<GolfHistoryItem[]>(initialHistory || []);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Strikte User-Arretierung im 1vsComputer-Modus (AGENTS.md §12.5)
  useEffect(() => {
    if (gameMode === '1vsComputer' && !isBoardUser && userPlayerMatch) {
      setP1Name(userPlayerMatch.name);
    }
  }, [gameMode, isBoardUser, userPlayerMatch]);

  // Kurs- & Spiel-State
  const [holes, setHoles] = useState<GolfHoleDefinition[]>(() => generateGolfCourse(18));
  const [currentHoleIndex, setCurrentHoleIndex] = useState<number>(0);
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [p1State, setP1State] = useState<GolfPlayerState>(() =>
    createInitialGolfPlayerState(90)
  );
  const [p2State, setP2State] = useState<GolfPlayerState>(() =>
    createInitialGolfPlayerState(90)
  );
  const [lastAction, setLastAction] = useState<GolfLastActionBanner | null>(null);
  const [winnerPlayer, setWinnerPlayer] = useState<1 | 2 | 'draw' | null>(null);
  const [undoStack, setUndoStack] = useState<GolfSnapshot[]>([]);
  const [isBotThrowing, setIsBotThrowing] = useState<boolean>(false);

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
        localStorage.getItem('lions_active_board_dartsgolf') ||
        localStorage.getItem('lions_active_board') ||
        '1'
      );
    }
    return '1';
  });

  const [gameSessionId, setGameSessionId] = useState<string>(() =>
    generateSessionId('dartsgolf', activeBoard)
  );
  const liveBroadcastRef = useRef<BroadcastChannel | null>(null);

  const triggerSound = useCallback(
    (kind: SoundKind) => {
      if (soundEnabled) playGolfSound(kind);
    },
    [soundEnabled]
  );

  const handleSelectBoard = (b: string) => {
    setActiveBoard(b);
    try {
      localStorage.setItem('lions_tablet_board', b);
      localStorage.setItem('lions_active_board', b);
      localStorage.setItem('lions_active_board_dartsgolf', b);
      window.history.replaceState(null, '', `/training/dartsgolf?board=${b}`);
    } catch {}
  };

  // Offline-Queue beim Start synchronisieren
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncQueue = async () => {
      try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        if (!raw) return;
        const queue: GolfSessionSavePayload[][] = JSON.parse(raw);
        if (!Array.isArray(queue) || queue.length === 0) return;
        const remaining: GolfSessionSavePayload[][] = [];
        for (const item of queue) {
          const res = await saveDartsGolfSessionAction(item);
          if (!res.success) remaining.push(item);
        }
        if (remaining.length === 0) {
          localStorage.removeItem(OFFLINE_QUEUE_KEY);
        } else {
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
        }
      } catch {}
    };
    syncQueue();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      liveBroadcastRef.current = new BroadcastChannel(`lions_dartsgolf_live_sync_${activeBoard}`);
    } catch {}
    return () => {
      liveBroadcastRef.current?.close();
    };
  }, [activeBoard]);

  // Lokalen Cache auf unterbrochenes Spiel prüfen
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (
          cached &&
          cached.isGameStarted &&
          !cached.isGameFinished &&
          (cached.p1State?.totalStrokes > 0 ||
            cached.p1State?.currentHoleStrokes > 0 ||
            cached.p2State?.totalStrokes > 0 ||
            cached.p2State?.currentHoleStrokes > 0)
        ) {
          setCachedSessionToResume(cached);
        }
      }
    } catch {}
  }, []);

  const effectiveP2Name =
    gameMode === '1vsComputer'
      ? `Computer (${GOLF_BOT_CONFIGS[botDifficulty].name})`
      : p2Name.trim() || 'Spieler 2';

  const coursePar = holes.reduce((acc, h) => acc + h.par, 0);

  // Standby-Signal an TV senden
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
          navigator.sendBeacon(
            '/api/live/board',
            new Blob([payloadStr], { type: 'application/json' })
          );
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
      p1S: GolfPlayerState,
      p2S: GolfPlayerState,
      actPlayer: 1 | 2,
      holeIdx: number,
      courseHoles: GolfHoleDefinition[],
      banner: GolfLastActionBanner | null,
      winPlayer: 1 | 2 | 'draw' | null,
      overrideSessionId?: string
    ) => {
      const totalCoursePar = courseHoles.reduce((acc, h) => acc + h.par, 0);
      const winName =
        winPlayer === 1
          ? p1Name
          : winPlayer === 2
          ? effectiveP2Name
          : winPlayer === 'draw'
          ? 'Unentschieden'
          : null;

      return {
        boardId: activeBoard,
        sessionId: overrideSessionId || gameSessionId,
        status: finished ? ('completed' as const) : ('playing' as const),
        gameType: 'dartsgolf' as const,
        gameTitle: `Lions Darts-Golf (${courseHoles.length} Holes)`,
        gameMode: gameMode === '1vsComputer' ? '1vs1' : '1vs1',
        p1Name: p1Name.trim() || 'Spieler 1',
        p2Name: effectiveP2Name,
        activePlayer: actPlayer,
        currentRound: holeIdx + 1,
        scoreP1: p1S.totalStrokes,
        scoreP2: p2S.totalStrokes,
        winner: winName || undefined,
        dartsgolfData: {
          holesCount: courseHoles.length as GolfHolesCount,
          currentHoleIndex: holeIdx,
          coursePar: totalCoursePar,
          holes: courseHoles,
          isComputer: gameMode === '1vsComputer',
          computerLevel: botDifficulty,
          p1: p1S,
          p2: p2S,
          lastAction: banner,
          winnerPlayer: winPlayer,
          winnerName: winName,
        },
        updatedAt: Date.now(),
      };
    },
    [activeBoard, botDifficulty, effectiveP2Name, gameMode, gameSessionId, p1Name]
  );

  const broadcastLiveState = useCallback(
    (
      started: boolean,
      finished: boolean,
      p1S: GolfPlayerState,
      p2S: GolfPlayerState,
      actPlayer: 1 | 2,
      holeIdx: number,
      courseHoles: GolfHoleDefinition[],
      banner: GolfLastActionBanner | null,
      winPlayer: 1 | 2 | 'draw' | null,
      overrideSessionId?: string
    ) => {
      if (!started && !finished) return;
      const payload = buildLivePayload(
        finished,
        p1S,
        p2S,
        actPlayer,
        holeIdx,
        courseHoles,
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

  // 4s Heartbeat
  useEffect(() => {
    if (!isGameStarted && !isGameFinished) return;
    const interval = setInterval(() => {
      const payload = buildLivePayload(
        isGameFinished,
        p1State,
        p2State,
        activePlayer,
        currentHoleIndex,
        holes,
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
    currentHoleIndex,
    holes,
    lastAction,
    winnerPlayer,
  ]);

  useEffect(() => {
    if (isGameStarted || isGameFinished) {
      broadcastLiveState(
        isGameStarted,
        isGameFinished,
        p1State,
        p2State,
        activePlayer,
        currentHoleIndex,
        holes,
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
    currentHoleIndex,
    holes,
    lastAction,
    winnerPlayer,
    broadcastLiveState,
  ]);

  // Atomarer Cache nach jedem Schlag
  useEffect(() => {
    if (
      isGameStarted &&
      !isGameFinished &&
      (p1State.totalStrokes > 0 ||
        p1State.currentHoleStrokes > 0 ||
        p2State.totalStrokes > 0 ||
        p2State.currentHoleStrokes > 0)
    ) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            isGameStarted,
            isGameFinished,
            gameMode,
            holesCount,
            botDifficulty,
            p1Name,
            p2Name,
            isGuestP2,
            holes,
            currentHoleIndex,
            activePlayer,
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
    holesCount,
    botDifficulty,
    p1Name,
    p2Name,
    isGuestP2,
    holes,
    currentHoleIndex,
    activePlayer,
    p1State,
    p2State,
    lastAction,
    winnerPlayer,
    undoStack,
    gameSessionId,
    activeBoard,
  ]);

  // Speichern nach Spielende
  const persistFinishedMatch = useCallback(
    async (
      finalP1: GolfPlayerState,
      finalP2: GolfPlayerState,
      winPlayer: 1 | 2 | 'draw',
      courseHoles: GolfHoleDefinition[],
      sId: string
    ) => {
      const todayIso = new Date().toISOString();
      const totalPar = courseHoles.reduce((acc, h) => acc + h.par, 0);
      const p1Obj = validPlayers.find(
        (p) => p.name.trim().toLowerCase() === p1Name.trim().toLowerCase()
      );
      const p2Obj = validPlayers.find(
        (p) => p.name.trim().toLowerCase() === p2Name.trim().toLowerCase()
      );

      const payloads: GolfSessionSavePayload[] = [
        {
          session_id: sId,
          player_id: p1Obj?.id ?? null,
          player_name: p1Name.trim(),
          opponent_name: effectiveP2Name,
          game_mode: gameMode,
          is_computer: gameMode === '1vsComputer' ? 1 : 0,
          computer_level:
            gameMode === '1vsComputer' ? GOLF_BOT_CONFIGS[botDifficulty].name : null,
          holes_count: courseHoles.length,
          course_par: totalPar,
          total_strokes: finalP1.totalStrokes,
          score_to_par: finalP1.scoreToPar,
          holes_won: finalP1.holesWon,
          eagles_count: finalP1.eaglesOrBetter,
          birdies_count: finalP1.birdies,
          pars_count: finalP1.pars,
          bogeys_count: finalP1.bogeys + finalP1.doubleBogeysOrWorse,
          overshoots_count: finalP1.totalOvershoots,
          is_winner: winPlayer === 1 ? 1 : 0,
          hole_details: finalP1.completedHoles,
          training_date: todayIso,
        },
      ];

      if (gameMode === '1vs1') {
        payloads.push({
          session_id: sId,
          player_id: p2Obj?.id ?? null,
          player_name: p2Name.trim(),
          opponent_name: p1Name.trim(),
          game_mode: '1vs1',
          is_computer: 0,
          computer_level: null,
          holes_count: courseHoles.length,
          course_par: totalPar,
          total_strokes: finalP2.totalStrokes,
          score_to_par: finalP2.scoreToPar,
          holes_won: finalP2.holesWon,
          eagles_count: finalP2.eaglesOrBetter,
          birdies_count: finalP2.birdies,
          pars_count: finalP2.pars,
          bogeys_count: finalP2.bogeys + finalP2.doubleBogeysOrWorse,
          overshoots_count: finalP2.totalOvershoots,
          is_winner: winPlayer === 2 ? 1 : 0,
          hole_details: finalP2.completedHoles,
          training_date: todayIso,
        });
      }

      try {
        const res = await saveDartsGolfSessionAction(payloads);
        if (res.success) {
          setSaveMessage('✓ Scorecard in Vereinsdatenbank gespeichert!');
          setHistoryList((prev) => [
            ...payloads.map((p, idx) => ({ ...p, id: Date.now() + idx })),
            ...prev,
          ]);
        } else {
          enqueueOfflineGolf(payloads);
          setSaveMessage('ℹ️ Lokal im Offline-Puffer gesichert (Auto-Sync aktiv).');
        }
      } catch {
        enqueueOfflineGolf(payloads);
        setSaveMessage('ℹ️ Lokal im Offline-Puffer gesichert (Auto-Sync aktiv).');
      }
    },
    [botDifficulty, effectiveP2Name, gameMode, p1Name, p2Name, validPlayers]
  );

  // Neues Spiel starten
  const handleStartGame = () => {
    const cleanP1 = p1Name.trim() || 'Spieler 1';
    const cleanP2 = p2Name.trim() || 'Spieler 2';
    setP1Name(cleanP1);
    setP2Name(cleanP2);

    const newCourse = generateGolfCourse(holesCount);
    const firstHole = newCourse[0];
    const freshId = generateSessionId('dartsgolf', activeBoard);
    const initP1 = createInitialGolfPlayerState(firstHole.startDistance);
    const initP2 = createInitialGolfPlayerState(firstHole.startDistance);

    const startBanner: GolfLastActionBanner = {
      id: Date.now(),
      tone: 'info',
      icon: '⛳',
      headline: `LOCH 1: ${firstHole.name.toUpperCase()} (PAR ${firstHole.par})`,
      subline: `${firstHole.startDistance} m bis zur Fahne — ${cleanP1} schlägt ab!`,
      actorPlayer: 1,
    };

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setCachedSessionToResume(null);
    setRestoredFromCache(false);
    setSaveMessage(null);
    setHoles(newCourse);
    setCurrentHoleIndex(0);
    setActivePlayer(1);
    setP1State(initP1);
    setP2State(initP2);
    setLastAction(startBanner);
    setWinnerPlayer(null);
    setUndoStack([]);
    setSelectedMultiplier(1);
    setGameSessionId(freshId);
    setIsGameFinished(false);
    setIsGameStarted(true);

    broadcastLiveState(
      true,
      false,
      initP1,
      initP2,
      1,
      0,
      newCourse,
      startBanner,
      null,
      freshId
    );
  };

  const handleResumeCachedGame = () => {
    if (!cachedSessionToResume) return;
    const c = cachedSessionToResume;
    if (c.activeBoard && ['1', '2', '3', '4', '5'].includes(c.activeBoard)) {
      setActiveBoard(c.activeBoard);
    }
    setGameMode(c.gameMode === '1vs1' ? '1vs1' : '1vsComputer');
    setHolesCount(c.holesCount === 9 ? 9 : 18);
    setBotDifficulty(c.botDifficulty || 'clubmeister');
    setP1Name(c.p1Name || defaultP1);
    setP2Name(c.p2Name || 'Dirk Ostermann');
    setIsGuestP2(Boolean(c.isGuestP2));
    setHoles(Array.isArray(c.holes) && c.holes.length > 0 ? c.holes : generateGolfCourse(18));
    setCurrentHoleIndex(Number(c.currentHoleIndex || 0));
    setActivePlayer(c.activePlayer === 2 ? 2 : 1);
    setP1State(cloneGolfPlayerState(c.p1State));
    setP2State(cloneGolfPlayerState(c.p2State));
    setLastAction(c.lastAction ?? null);
    setWinnerPlayer(c.winnerPlayer ?? null);
    setUndoStack(Array.isArray(c.undoStack) ? c.undoStack : []);
    setGameSessionId(c.gameSessionId || generateSessionId('dartsgolf', activeBoard));
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

  const handleAbortToSetup = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setIsBotThrowing(false);
    setIsGameStarted(false);
    setIsGameFinished(false);
    setWinnerPlayer(null);
    setUndoStack([]);
    sendStandbySignal();
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isBotThrowing) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setActivePlayer(prev.activePlayer);
    setCurrentHoleIndex(prev.currentHoleIndex);
    setP1State(cloneGolfPlayerState(prev.p1State));
    setP2State(cloneGolfPlayerState(prev.p2State));
    setLastAction(prev.lastAction);
    setWinnerPlayer(prev.winnerPlayer);
    setIsGameFinished(prev.isGameFinished);
    setIsGameStarted(true);
  };

  // Hilfsfunktion: Loch für einen Spieler abschließen
  const finalizeHoleForPlayer = (st: GolfPlayerState, hole: GolfHoleDefinition) => {
    const strokes = st.currentHoleStrokes;
    const toPar = strokes - hole.par;
    const res: GolfHolePlayerResult = {
      holeNumber: hole.holeNumber,
      par: hole.par,
      startDistance: hole.startDistance,
      strokes,
      toPar,
      overshoots: st.currentHoleOvershoots,
      holedOut: st.currentHoleHoledOut,
      pickedUp: st.currentHolePickedUp,
      shots: st.currentHoleAllShots.map((sh) => ({ ...sh })),
    };

    st.completedHoles.push(res);
    if (strokes === 1) st.holeInOnes += 1;
    if (toPar <= -2) st.eaglesOrBetter += 1;
    else if (toPar === -1) st.birdies += 1;
    else if (toPar === 0) st.pars += 1;
    else if (toPar === 1) st.bogeys += 1;
    else st.doubleBogeysOrWorse += 1;
  };

  // Kernfunktion: Einen einzelnen Dart (Schlag) verarbeiten
  const executeDartShot = useCallback(
    (label: string, value: number, isFromBot = false) => {
      if (isGameFinished) return;

      // Undo-Snapshot nur bei menschlichen Würfen anlegen, damit "Korrektur" immer zum letzten eigenen Wurf zurückspringt
      if (!isFromBot) {
        const snap: GolfSnapshot = {
          activePlayer,
          currentHoleIndex,
          p1State: cloneGolfPlayerState(p1State),
          p2State: cloneGolfPlayerState(p2State),
          lastAction,
          winnerPlayer,
          isGameFinished,
        };
        setUndoStack((prev) => [...prev.slice(-49), snap]);
      }

      const nextP1 = cloneGolfPlayerState(p1State);
      const nextP2 = cloneGolfPlayerState(p2State);
      const own = activePlayer === 1 ? nextP1 : nextP2;
      const opp = activePlayer === 1 ? nextP2 : nextP1;
      const actorName = activePlayer === 1 ? p1Name : effectiveP2Name;
      const currentHole = holes[currentHoleIndex];

      if (own.currentTurnShots.length >= 3) {
        own.currentTurnShots = [];
      }

      const distBefore = own.currentDistance;
      const distAfter = Math.abs(distBefore - value);
      const overshot = value > distBefore;
      const holedOut = distAfter === 0;

      own.currentHoleStrokes += 1;
      own.totalStrokes += 1;
      own.currentDistance = distAfter;

      if (overshot) {
        own.currentHoleOvershoots += 1;
        own.totalOvershoots += 1;
      }

      const reachedMaxStrokes =
        !holedOut && own.currentHoleStrokes >= MAX_STROKES_PER_HOLE;
      if (holedOut) {
        own.currentHoleHoledOut = true;
      } else if (reachedMaxStrokes) {
        own.currentHolePickedUp = true;
        own.currentDistance = 0;
      }

      const shot: GolfDartShot = {
        strokeNumber: own.currentHoleStrokes,
        dartInTurn: (own.currentTurnShots.length + 1) as 1 | 2 | 3,
        label,
        value,
        distanceBefore: distBefore,
        distanceAfter: own.currentDistance,
        overshot,
        holedOut,
        pickedUp: reachedMaxStrokes,
      };

      own.currentTurnShots.push(shot);
      own.currentHoleAllShots.push(shot);

      // Laufenden Score-To-Par aktualisieren
      const completedParOwn = own.completedHoles.reduce((a, h) => a + h.par, 0);
      own.totalParPlayed = completedParOwn + currentHole.par;
      own.scoreToPar = own.totalStrokes - own.totalParPlayed;

      let banner: GolfLastActionBanner;
      const ownDoneOnHole = own.currentHoleHoledOut || own.currentHolePickedUp;
      const oppDoneOnHole = opp.currentHoleHoledOut || opp.currentHolePickedUp;

      if (holedOut) {
        const term = getGolfTermForScore(own.currentHoleStrokes, currentHole.par);
        const isEagleOrBetter = own.currentHoleStrokes - currentHole.par <= -2 || own.currentHoleStrokes === 1;
        triggerSound(isEagleOrBetter ? 'eagle' : 'hole_out');
        banner = {
          id: Date.now(),
          tone: isEagleOrBetter ? 'eagle' : 'hole_out',
          icon: isEagleOrBetter ? '🦅' : '⛳',
          headline: `${term.term.toUpperCase()} AN LOCH ${currentHole.holeNumber}!`,
          subline: `${actorName} checkt ${distBefore} m über ${label} im ${own.currentHoleStrokes}. Schlag (${term.toParLabel})!`,
          actorPlayer: activePlayer,
        };
      } else if (reachedMaxStrokes) {
        triggerSound('miss');
        banner = {
          id: Date.now(),
          tone: 'miss',
          icon: '⚠️',
          headline: `MAX-SCHLÄGE (${MAX_STROKES_PER_HOLE}) ERREICHT`,
          subline: `${actorName} hebt den Ball an Loch ${currentHole.holeNumber} mit ${MAX_STROKES_PER_HOLE} Schlägen auf.`,
          actorPlayer: activePlayer,
        };
      } else if (overshot) {
        triggerSound('overshoot');
        banner = {
          id: Date.now(),
          tone: 'overshoot',
          icon: '💨',
          headline: `ÜBERFLUG! +${distAfter} M HINTER DIE FAHNE!`,
          subline: `${actorName} wirft ${label} (${value} m) bei ${distBefore} m Rest — neue Distanz: ${distAfter} m!`,
          actorPlayer: activePlayer,
        };
      } else if (value === 0) {
        triggerSound('miss');
        banner = {
          id: Date.now(),
          tone: 'miss',
          icon: '✕',
          headline: 'LUFTSCHLAG (0 M)',
          subline: `${actorName} bleibt bei ${distAfter} m vor der Fahne.`,
          actorPlayer: activePlayer,
        };
      } else {
        triggerSound('drive');
        banner = {
          id: Date.now(),
          tone: 'drive',
          icon: '🏌️‍♂️',
          headline: `${label} (${value} M) GESCHLAGEN`,
          subline: `${actorName} verkürzt von ${distBefore} m auf ${distAfter} m Restdistanz!`,
          actorPlayer: activePlayer,
        };
      }

      // Prüfen, ob beide Spieler das aktuelle Loch abgeschlossen haben
      if (ownDoneOnHole && oppDoneOnHole) {
        finalizeHoleForPlayer(nextP1, currentHole);
        finalizeHoleForPlayer(nextP2, currentHole);

        if (nextP1.currentHoleStrokes < nextP2.currentHoleStrokes) {
          nextP1.holesWon += 1;
        } else if (nextP2.currentHoleStrokes < nextP1.currentHoleStrokes) {
          nextP2.holesWon += 1;
        }

        nextP1.totalParPlayed = nextP1.completedHoles.reduce((a, h) => a + h.par, 0);
        nextP1.scoreToPar = nextP1.totalStrokes - nextP1.totalParPlayed;
        nextP2.totalParPlayed = nextP2.completedHoles.reduce((a, h) => a + h.par, 0);
        nextP2.scoreToPar = nextP2.totalStrokes - nextP2.totalParPlayed;

        // War es das letzte Loch?
        if (currentHoleIndex >= holes.length - 1) {
          let winP: 1 | 2 | 'draw' = 'draw';
          if (nextP1.totalStrokes < nextP2.totalStrokes) winP = 1;
          else if (nextP2.totalStrokes < nextP1.totalStrokes) winP = 2;

          triggerSound('win');
          const finalBanner: GolfLastActionBanner = {
            id: Date.now(),
            tone: 'eagle',
            icon: '🏆',
            headline:
              winP === 'draw'
                ? `RUNDE BEENDET · GLEICHSTAND (${nextP1.totalStrokes} SCHLÄGE)!`
                : `SIEG FÜR ${(winP === 1 ? p1Name : effectiveP2Name).toUpperCase()}!`,
            subline: `Endstand nach ${holes.length} Löchern: ${p1Name} ${nextP1.totalStrokes} (${formatToPar(
              nextP1.scoreToPar
            )}) vs. ${effectiveP2Name} ${nextP2.totalStrokes} (${formatToPar(nextP2.scoreToPar)})`,
            actorPlayer: winP === 2 ? 2 : 1,
          };

          try {
            localStorage.removeItem(CACHE_KEY);
          } catch {}

          setP1State(nextP1);
          setP2State(nextP2);
          setLastAction(finalBanner);
          setWinnerPlayer(winP);
          setIsGameFinished(true);
          persistFinishedMatch(nextP1, nextP2, winP, holes, gameSessionId);
          return;
        }

        // Weiter zum nächsten Loch!
        const nextHoleIdx = currentHoleIndex + 1;
        const nextHole = holes[nextHoleIdx];

        nextP1.currentDistance = nextHole.startDistance;
        nextP1.currentHoleStrokes = 0;
        nextP1.currentHoleOvershoots = 0;
        nextP1.currentHoleHoledOut = false;
        nextP1.currentHolePickedUp = false;
        nextP1.currentTurnShots = [];
        nextP1.currentHoleAllShots = [];

        nextP2.currentDistance = nextHole.startDistance;
        nextP2.currentHoleStrokes = 0;
        nextP2.currentHoleOvershoots = 0;
        nextP2.currentHoleHoledOut = false;
        nextP2.currentHolePickedUp = false;
        nextP2.currentTurnShots = [];
        nextP2.currentHoleAllShots = [];

        const p1LastRes = nextP1.completedHoles[nextP1.completedHoles.length - 1];
        const p2LastRes = nextP2.completedHoles[nextP2.completedHoles.length - 1];

        const nextHoleBanner: GolfLastActionBanner = {
          id: Date.now(),
          tone: 'hole_out',
          icon: '⛳',
          headline: `LOCH ${currentHole.holeNumber} BEENDET (${p1LastRes.strokes} : ${p2LastRes.strokes}) ➔ LOCH ${nextHole.holeNumber} (${nextHole.startDistance} M)`,
          subline: `Weiter auf Bahn ${nextHole.holeNumber} (${nextHole.name} · Par ${nextHole.par} · ${nextHole.startDistance} m)!`,
          actorPlayer: 1,
        };

        setP1State(nextP1);
        setP2State(nextP2);
        setCurrentHoleIndex(nextHoleIdx);
        setActivePlayer(1);
        setSelectedMultiplier(1);
        setLastAction(nextHoleBanner);
        return;
      }

      // Falls dieses Loch noch nicht für beide beendet ist: Prüfen ob Spielerwechsel dran ist
      const turnFinished = ownDoneOnHole || own.currentTurnShots.length >= 3;
      let nextActive: 1 | 2 = activePlayer;

      if (turnFinished) {
        if (!oppDoneOnHole) {
          nextActive = activePlayer === 1 ? 2 : 1;
          opp.currentTurnShots = [];
        } else {
          // Gegner ist schon im Loch, aktiver Spieler startet nächste 3er-Aufnahme am selben Loch
          nextActive = activePlayer;
          own.currentTurnShots = [];
        }
      }

      setP1State(nextP1);
      setP2State(nextP2);
      setActivePlayer(nextActive);
      setSelectedMultiplier(1);
      setLastAction(banner);
    },
    [
      activePlayer,
      currentHoleIndex,
      effectiveP2Name,
      gameSessionId,
      holes,
      isGameFinished,
      lastAction,
      p1Name,
      p1State,
      p2State,
      persistFinishedMatch,
      triggerSound,
      winnerPlayer,
    ]
  );

  // Restliche Darts der Aufnahme als Miss (0 m) werten
  const handleRestMiss = () => {
    if (isGameFinished || isBotThrowing) return;
    const own = activePlayer === 1 ? p1State : p2State;
    const thrownInTurn = own.currentTurnShots.length >= 3 ? 0 : own.currentTurnShots.length;
    const remaining = Math.max(1, 3 - thrownInTurn);
    // Wenn nur 1 Dart übrig ist, normaler Miss
    if (remaining === 1) {
      executeDartShot('MISS', 0);
      return;
    }

    // Snapshot vor den gebündelten Misses sichern
    const snap: GolfSnapshot = {
      activePlayer,
      currentHoleIndex,
      p1State: cloneGolfPlayerState(p1State),
      p2State: cloneGolfPlayerState(p2State),
      lastAction,
      winnerPlayer,
      isGameFinished,
    };
    setUndoStack((prev) => [...prev.slice(-49), snap]);

    const nextP1 = cloneGolfPlayerState(p1State);
    const nextP2 = cloneGolfPlayerState(p2State);
    const ownNext = activePlayer === 1 ? nextP1 : nextP2;
    const oppNext = activePlayer === 1 ? nextP2 : nextP1;
    const actorName = activePlayer === 1 ? p1Name : effectiveP2Name;
    const currentHole = holes[currentHoleIndex];

    if (ownNext.currentTurnShots.length >= 3) ownNext.currentTurnShots = [];

    for (let i = 0; i < remaining; i += 1) {
      if (ownNext.currentHoleHoledOut || ownNext.currentHolePickedUp) break;
      ownNext.currentHoleStrokes += 1;
      ownNext.totalStrokes += 1;
      const reachedMax = ownNext.currentHoleStrokes >= MAX_STROKES_PER_HOLE;
      if (reachedMax) {
        ownNext.currentHolePickedUp = true;
        ownNext.currentDistance = 0;
      }
      const sh: GolfDartShot = {
        strokeNumber: ownNext.currentHoleStrokes,
        dartInTurn: (ownNext.currentTurnShots.length + 1) as 1 | 2 | 3,
        label: 'MISS',
        value: 0,
        distanceBefore: ownNext.currentDistance,
        distanceAfter: ownNext.currentDistance,
        overshot: false,
        holedOut: false,
        pickedUp: reachedMax,
      };
      ownNext.currentTurnShots.push(sh);
      ownNext.currentHoleAllShots.push(sh);
    }

    const completedParOwn = ownNext.completedHoles.reduce((a, h) => a + h.par, 0);
    ownNext.totalParPlayed = completedParOwn + currentHole.par;
    ownNext.scoreToPar = ownNext.totalStrokes - ownNext.totalParPlayed;

    triggerSound('miss');

    const ownDone = ownNext.currentHoleHoledOut || ownNext.currentHolePickedUp;
    const oppDone = oppNext.currentHoleHoledOut || oppNext.currentHolePickedUp;

    if (ownDone && oppDone) {
      // Beide fertig -> Loch abschließen
      finalizeHoleForPlayer(nextP1, currentHole);
      finalizeHoleForPlayer(nextP2, currentHole);
      if (nextP1.currentHoleStrokes < nextP2.currentHoleStrokes) nextP1.holesWon += 1;
      else if (nextP2.currentHoleStrokes < nextP1.currentHoleStrokes) nextP2.holesWon += 1;

      if (currentHoleIndex >= holes.length - 1) {
        let winP: 1 | 2 | 'draw' = 'draw';
        if (nextP1.totalStrokes < nextP2.totalStrokes) winP = 1;
        else if (nextP2.totalStrokes < nextP1.totalStrokes) winP = 2;

        setP1State(nextP1);
        setP2State(nextP2);
        setWinnerPlayer(winP);
        setIsGameFinished(true);
        persistFinishedMatch(nextP1, nextP2, winP, holes, gameSessionId);
        return;
      }

      const nextHoleIdx = currentHoleIndex + 1;
      const nextHole = holes[nextHoleIdx];
      nextP1.currentDistance = nextHole.startDistance;
      nextP1.currentHoleStrokes = 0;
      nextP1.currentHoleOvershoots = 0;
      nextP1.currentHoleHoledOut = false;
      nextP1.currentHolePickedUp = false;
      nextP1.currentTurnShots = [];
      nextP1.currentHoleAllShots = [];

      nextP2.currentDistance = nextHole.startDistance;
      nextP2.currentHoleStrokes = 0;
      nextP2.currentHoleOvershoots = 0;
      nextP2.currentHoleHoledOut = false;
      nextP2.currentHolePickedUp = false;
      nextP2.currentTurnShots = [];
      nextP2.currentHoleAllShots = [];

      setP1State(nextP1);
      setP2State(nextP2);
      setCurrentHoleIndex(nextHoleIdx);
      setActivePlayer(1);
      setLastAction({
        id: Date.now(),
        tone: 'info',
        icon: '⛳',
        headline: `WEITER ZU LOCH ${nextHole.holeNumber} (${nextHole.startDistance} M)`,
        subline: `${nextHole.name} · Par ${nextHole.par}`,
        actorPlayer: 1,
      });
      return;
    }

    let nextActive: 1 | 2 = activePlayer;
    if (!oppDone) {
      nextActive = activePlayer === 1 ? 2 : 1;
      oppNext.currentTurnShots = [];
    } else {
      ownNext.currentTurnShots = [];
    }

    setP1State(nextP1);
    setP2State(nextP2);
    setActivePlayer(nextActive);
    setLastAction({
      id: Date.now(),
      tone: 'miss',
      icon: '✕',
      headline: 'AUFNAHME BEENDET (0 M)',
      subline: `${actorName} liegt weiterhin bei ${ownNext.currentDistance} m.`,
      actorPlayer: activePlayer,
    });
  };

  // Automatischer Computer-Zug im 1vsComputer-Modus
  useEffect(() => {
    if (
      !isGameStarted ||
      isGameFinished ||
      gameMode !== '1vsComputer' ||
      activePlayer !== 2
    ) {
      setIsBotThrowing(false);
      return;
    }

    setIsBotThrowing(true);
    const timer = setTimeout(() => {
      const botShot = simulateGolfBotDart(p2State.currentDistance, botDifficulty);
      executeDartShot(botShot.label, botShot.value, true);
    }, 680);

    return () => clearTimeout(timer);
  }, [
    isGameStarted,
    isGameFinished,
    gameMode,
    activePlayer,
    p2State.currentDistance,
    p2State.currentHoleStrokes,
    botDifficulty,
    executeDartShot,
  ]);

  // =========================================================================
  // ANSICHT 1: SETUP-BILDSCHIRM
  // =========================================================================
  if (!isGameStarted) {
    const soloLocked = gameMode === '1vsComputer' && !isBoardUser && Boolean(userPlayerMatch);

    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6 space-y-5 animate-fadeIn">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
          <Link
            href={`/training?board=${activeBoard}`}
            data-ui-id="DARTSGOLF.SETUP.BACK_BTN"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zur Trainings-Arena</span>
          </Link>

          <Link
            href={`/board/${activeBoard}`}
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 text-xs font-bold transition-all"
          >
            <Tv className="w-4 h-4 text-emerald-400" />
            <span>TV-Monitor Board {activeBoard}</span>
          </Link>
        </div>

        {/* Crash- & Wisch-Schutz Dialog */}
        {cachedSessionToResume && (
          <div
            data-ui-id="DARTSGOLF.RESUME.DIALOG"
            className="rounded-3xl p-5 sm:p-6 bg-amber-950/60 border-2 border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.3)] space-y-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-amber-200">
                  Unterbrochenes Spiel gefunden!
                </h2>
                <p className="text-xs sm:text-sm text-amber-100/90 mt-1">
                  <strong>{cachedSessionToResume.p1Name}</strong> (
                  {formatToPar(cachedSessionToResume.p1State?.scoreToPar || 0)} ·{' '}
                  {cachedSessionToResume.p1State?.totalStrokes || 0} Schläge) vs.{' '}
                  <strong>
                    {cachedSessionToResume.gameMode === '1vsComputer'
                      ? `Computer (${
                          GOLF_BOT_CONFIGS[
                            (cachedSessionToResume.botDifficulty as GolfBotDifficulty) ||
                              'clubmeister'
                          ]?.name || 'Bot'
                        })`
                      : cachedSessionToResume.p2Name}
                  </strong>{' '}
                  (
                  {formatToPar(cachedSessionToResume.p2State?.scoreToPar || 0)} ·{' '}
                  {cachedSessionToResume.p2State?.totalStrokes || 0} Schläge) • Loch{' '}
                  {(cachedSessionToResume.currentHoleIndex || 0) + 1} /{' '}
                  {cachedSessionToResume.holesCount || 18}
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
        <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-[#071f18]/90 via-slate-900/95 to-[#171307]/90 border-2 border-emerald-500/40 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-3xl">
                ⛳
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Lions Darts-Golf (18 Holes)
                </h1>
                <p className="text-xs sm:text-sm text-emerald-300 font-semibold">
                  Zufällige Loch-Distanzen · Check mit Single/Double/Triple/Bull · Überwurf fliegt übers Loch!
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
                      ? 'bg-emerald-400 text-slate-950 shadow-lg'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-white/10'
                  }`}
                >
                  B{b}
                </button>
              ))}
            </div>
          </div>

          {/* Regel-Highlight Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-400/30 space-y-1.5">
            <div className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-2">
              <Flag className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Die Darts-Golf Overshoot-Regel (Kein Bust!)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Jedes Loch hat eine zufällige Entfernung in Metern. Du darfst mit{' '}
              <strong>Single, Doppel, Triple oder Bull</strong> exakt auf <strong>0 m</strong>{' '}
              einlochen. Wirfst du zu weit (z. B. <strong>25 m Rest</strong> und du triffst{' '}
              <strong>Triple 20 = 60 m</strong>), fliegt der Ball übers Loch hinaus und du stehst bei{' '}
              <strong>35 m Rest</strong> (<code>|25 − 60| = 35 m</code>)!
            </p>
          </div>

          {/* Spielmodus */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-black uppercase tracking-wider text-slate-300 block">
              Spielmodus
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameMode('1vsComputer')}
                className={`min-h-[56px] px-4 py-3 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  gameMode === '1vsComputer'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-5 h-5" />
                <span>1 vs. Computer (Golf-Bot)</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('1vs1')}
                className={`min-h-[56px] px-4 py-3 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  gameMode === '1vs1'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>1 vs. 1 Flight-Duell</span>
              </button>
            </div>
          </div>

          {/* Spielerauswahl */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Spieler 1 */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
              <label className="text-xs font-mono font-black uppercase tracking-wider text-emerald-300 block">
                Golfer 1
              </label>
              {soloLocked ? (
                <div className="min-h-[52px] px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-between gap-2">
                  <span className="font-black text-white text-sm sm:text-base">{p1Name}</span>
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950">
                    ✓ Angemeldet · Fest fixiert
                  </span>
                </div>
              ) : (
                <select
                  value={p1Name}
                  onChange={(e) => setP1Name(e.target.value)}
                  className="w-full min-h-[52px] px-4 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  {validPlayers.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.team})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Gegner: Bot-Level oder Spieler 2 */}
            {gameMode === '1vsComputer' ? (
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                <label className="text-xs font-mono font-black uppercase tracking-wider text-amber-300 block">
                  Computer-Gegner (Handicap)
                </label>
                <select
                  value={botDifficulty}
                  onChange={(e) => setBotDifficulty(e.target.value as GolfBotDifficulty)}
                  className="w-full min-h-[52px] px-4 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {Object.values(GOLF_BOT_CONFIGS).map((cfg) => (
                    <option key={cfg.id} value={cfg.id}>
                      {cfg.name} ({cfg.handicapLabel}) — {cfg.subtitle.split('·')[0]}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  {GOLF_BOT_CONFIGS[botDifficulty].subtitle}
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-mono font-black uppercase tracking-wider text-amber-300">
                    Golfer 2
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

          {/* Platzlänge: 18 Löcher (Standard) vs. 9 Löcher */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-emerald-200">
                Turnier-Distanz (Anzahl Löcher)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                18 Löcher (Par 72) zählen offiziell für das TV-Ranking &amp; den Monats-Lostopf (+1 Spiel)
              </div>
            </div>
            <div className="flex items-center gap-2">
              {([18, 9] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setHolesCount(cnt)}
                  className={`min-h-[48px] px-4 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                    holesCount === cnt
                      ? 'bg-emerald-400 text-slate-950 shadow-lg'
                      : 'bg-slate-900 text-slate-300 border border-white/15'
                  }`}
                >
                  {cnt === 18 ? '18 Löcher (Par 72 · Offiziell)' : '9 Löcher (Par 36 · Kurzrunde)'}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartGame}
            data-ui-id="DARTSGOLF.SETUP.START_BTN"
            className="w-full min-h-[60px] py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-slate-950 font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>⛳ Golfplatz generieren &amp; Abschlag starten</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Letzte Ergebnisse (Historie) */}
        {historyList.length > 0 && (
          <div className="rounded-3xl p-5 bg-slate-900/75 border border-white/10 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Letzte Clubhaus-Scorecards (Lions Darts-Golf)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {historyList.slice(0, 6).map((h, i) => (
                <div
                  key={`${h.session_id}_${i}`}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-black text-white">
                      {h.player_name}{' '}
                      <span className="text-slate-400 font-normal">
                        vs. {h.opponent_name || 'Computer'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {h.holes_count} Löcher · 🐦 {h.birdies_count + h.eagles_count} Birdies/Eagles · 💨{' '}
                      {h.overshoots_count} Überflüge
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div
                      className={`text-sm font-black ${
                        h.score_to_par < 0
                          ? 'text-emerald-400'
                          : h.score_to_par === 0
                          ? 'text-white'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatToPar(h.score_to_par)} ({h.total_strokes})
                    </div>
                    <div className="text-[10px] text-slate-500">Par {h.course_par}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // ANSICHT 2: AKTIVES SPIEL (TABLET-COCKPIT)
  // =========================================================================
  const currentHole = holes[Math.min(holes.length - 1, Math.max(0, currentHoleIndex))];
  const ownState = activePlayer === 1 ? p1State : p2State;
  const ownName = activePlayer === 1 ? p1Name : effectiveP2Name;
  const chk = getDirectCheckoutOptions(ownState.currentDistance);
  const caddyTip = getCaddyAdvice(ownState.currentDistance);

  // Schnell-Drives & Putts
  const quickShots = [
    { label: 'T20', value: 60 },
    { label: 'T19', value: 57 },
    { label: 'T18', value: 54 },
    { label: 'BULL', value: 50 },
    { label: '25', value: 25 },
    { label: 'S20', value: 20 },
  ];

  const numbersDesc = Array.from({ length: 20 }, (_, i) => 20 - i);

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-5 space-y-3.5 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/85 border border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAbortToSetup}
            className="min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Abbruch / Clubhaus</span>
          </button>

          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 font-mono text-xs font-black">
            BOARD {activeBoard}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 font-mono text-xs font-black">
            ⛳ LOCH {currentHole.holeNumber} / {holes.length} · PAR {currentHole.par}
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
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
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
        <div className="rounded-2xl p-4 bg-slate-900/95 border border-emerald-400/40 text-xs sm:text-sm text-slate-200 space-y-1.5">
          <div className="font-black text-emerald-300">⛳ Spielregeln: Lions Darts-Golf</div>
          <p>
            <strong>1. Einlochen (0 m):</strong> Du darfst die Restdistanz mit jedem Feld (Single,
            Doppel, Triple, 25 oder Bullseye 50) exakt auf <strong>0 m</strong> checken.
          </p>
          <p>
            <strong>2. Überflug (Overshoot):</strong> Wirfst du mehr Meter als die Restdistanz,
            fliegt der Ball übers Loch hinaus: <code>Neue Distanz = |Rest − Wurf|</code> (z. B. 25 m
            Rest mit T20 = 60 m ➔ 35 m Rest).
          </p>
          <p>
            <strong>3. Wertung:</strong> Jeder geworfene Dart zählt als 1 Schlag. Nach {holes.length}{' '}
            Löchern gewinnt der Spieler mit den wenigsten Gesamtschlägen!
          </p>
        </div>
      )}

      {/* Beide Spieler-Statuskarten */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((pNum) => {
          const isP1 = pNum === 1;
          const st = isP1 ? p1State : p2State;
          const name = isP1 ? p1Name : effectiveP2Name;
          const isAct = !isGameFinished && activePlayer === pNum;
          const isWin = winnerPlayer === pNum;
          const lastSh =
            st.currentHoleAllShots.length > 0
              ? st.currentHoleAllShots[st.currentHoleAllShots.length - 1]
              : null;

          return (
            <div
              key={pNum}
              className={`rounded-2xl p-3.5 border-2 transition-all ${
                isWin
                  ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
                  : isAct
                  ? isP1
                    ? 'bg-emerald-950/45 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.28)]'
                    : 'bg-amber-950/45 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.25)]'
                  : 'bg-slate-900/65 border-white/10 opacity-85'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-black text-white truncate">{name}</div>
                  <div className="text-[11px] font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                    {st.currentHoleHoledOut ? (
                      <span className="text-emerald-300 font-black">
                        ⛳ Im Loch ({st.currentHoleStrokes} Schl.)
                      </span>
                    ) : isAct ? (
                      <span className={`${isP1 ? 'text-emerald-300' : 'text-amber-300'} font-black`}>
                        🏌️‍♂️ Am Schlag ({st.currentHoleStrokes}. Schl.)
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Rest: {st.currentDistance} m ({st.currentHoleStrokes} Schl.)
                      </span>
                    )}
                    {lastSh?.overshot && !st.currentHoleHoledOut && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/60 text-amber-200 text-[10px] font-black">
                        💨 Überflug
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <div
                    className={`text-xl sm:text-2xl font-black ${
                      st.scoreToPar < 0
                        ? 'text-emerald-400'
                        : st.scoreToPar === 0
                        ? 'text-white'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatToPar(st.scoreToPar)}
                  </div>
                  <div className="text-[10px] text-slate-400">{st.totalStrokes} Schläge</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Action Banner */}
      {lastAction && (
        <div
          className={`rounded-2xl px-4 py-2.5 border text-center transition-all ${
            lastAction.tone === 'eagle'
              ? 'bg-amber-950/85 border-amber-400 text-amber-100'
              : lastAction.tone === 'hole_out'
              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-100'
              : lastAction.tone === 'overshoot'
              ? 'bg-orange-950/85 border-amber-400 text-amber-100'
              : lastAction.tone === 'drive'
              ? 'bg-cyan-950/75 border-cyan-400/60 text-cyan-100'
              : lastAction.tone === 'miss'
              ? 'bg-red-950/60 border-red-500/50 text-red-200'
              : 'bg-slate-900/75 border-white/15 text-slate-200'
          }`}
        >
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider mr-2">
            {lastAction.icon} {lastAction.headline}
          </span>
          <span className="text-xs sm:text-sm opacity-95">{lastAction.subline}</span>
        </div>
      )}

      {/* Kompakte 18-Loch Scorecard am Tablet */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-2.5 overflow-x-auto">
        <table className="w-full text-center font-mono text-[10px] sm:text-[11px] border-collapse">
          <thead>
            <tr className="text-slate-400 border-b border-white/10">
              <th className="py-1 px-1.5 text-left">LOCH</th>
              {holes.map((h, idx) => (
                <th
                  key={h.holeNumber}
                  className={`py-1 px-1 ${
                    idx === currentHoleIndex ? 'text-cyan-300 font-black bg-cyan-500/15 rounded-t' : ''
                  }`}
                >
                  {h.holeNumber}
                </th>
              ))}
              <th className="py-1 px-1.5 text-amber-300">TOT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr className="text-slate-500">
              <td className="py-1 px-1.5 text-left font-bold">PAR</td>
              {holes.map((h) => (
                <td key={h.holeNumber} className="py-1 px-1">
                  {h.par}
                </td>
              ))}
              <td className="py-1 px-1.5 font-bold text-slate-400">{coursePar}</td>
            </tr>
            <tr>
              <td className="py-1 px-1.5 text-left font-black text-emerald-300 truncate max-w-[85px]">
                {p1Name}
              </td>
              {holes.map((h, idx) => {
                const res = p1State.completedHoles.find((c) => c.holeNumber === h.holeNumber);
                if (!res) {
                  return (
                    <td
                      key={h.holeNumber}
                      className={`py-1 px-1 ${
                        idx === currentHoleIndex ? 'text-cyan-300 font-black' : 'text-slate-600'
                      }`}
                    >
                      {idx === currentHoleIndex && p1State.currentHoleStrokes > 0
                        ? p1State.currentHoleStrokes
                        : '·'}
                    </td>
                  );
                }
                const term = getGolfTermForScore(res.strokes, h.par);
                return (
                  <td key={h.holeNumber} className="py-1 px-0.5">
                    <span className={`inline-block px-1 rounded border font-black ${term.colorClass}`}>
                      {res.strokes}
                    </span>
                  </td>
                );
              })}
              <td className="py-1 px-1.5 font-black text-white">
                {p1State.totalStrokes} ({formatToPar(p1State.scoreToPar)})
              </td>
            </tr>
            <tr>
              <td className="py-1 px-1.5 text-left font-black text-amber-300 truncate max-w-[85px]">
                {gameMode === '1vsComputer' ? 'Bot' : p2Name}
              </td>
              {holes.map((h, idx) => {
                const res = p2State.completedHoles.find((c) => c.holeNumber === h.holeNumber);
                if (!res) {
                  return (
                    <td
                      key={h.holeNumber}
                      className={`py-1 px-1 ${
                        idx === currentHoleIndex ? 'text-cyan-300 font-black' : 'text-slate-600'
                      }`}
                    >
                      {idx === currentHoleIndex && p2State.currentHoleStrokes > 0
                        ? p2State.currentHoleStrokes
                        : '·'}
                    </td>
                  );
                }
                const term = getGolfTermForScore(res.strokes, h.par);
                return (
                  <td key={h.holeNumber} className="py-1 px-0.5">
                    <span className={`inline-block px-1 rounded border font-black ${term.colorClass}`}>
                      {res.strokes}
                    </span>
                  </td>
                );
              })}
              <td className="py-1 px-1.5 font-black text-white">
                {p2State.totalStrokes} ({formatToPar(p2State.scoreToPar)})
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Sieger-Screen am Tablet */}
      {isGameFinished && winnerPlayer && (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-950/85 via-slate-900/95 to-amber-950/80 border-2 border-emerald-400 text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🏆⛳</div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {winnerPlayer === 'draw'
                ? 'Unentschieden nach 18 Löchern!'
                : `Green Jacket für ${winnerPlayer === 1 ? p1Name : effectiveP2Name}!`}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1">
              {p1Name}: {p1State.totalStrokes} Schläge ({formatToPar(p1State.scoreToPar)}) •{' '}
              {effectiveP2Name}: {p2State.totalStrokes} Schläge ({formatToPar(p2State.scoreToPar)})
            </p>
            {saveMessage && (
              <p className="text-xs font-mono font-bold text-amber-300 mt-2">{saveMessage}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="min-h-[54px] px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/15 font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Letzten Schlag korrigieren</span>
            </button>
            <button
              type="button"
              onClick={handleStartGame}
              className="min-h-[54px] px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm cursor-pointer"
            >
              🔄 Neuer Platz &amp; Revanche
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

      {/* Aktives Wurf-Deck */}
      {!isGameFinished && (
        <>
          {/* Aktuelles Loch & Restdistanz-Anzeige */}
          <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#062118] via-slate-950 to-[#181306] border-2 border-emerald-400/45 text-center space-y-2 shadow-2xl">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono font-black uppercase tracking-widest text-emerald-300">
              <span>
                ⛳ Loch {currentHole.holeNumber}/{holes.length} · {currentHole.name}
              </span>
              <span>•</span>
              <span className="text-amber-300">
                Par {currentHole.par} (Start: {currentHole.startDistance} m)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-1">
              <div className="text-xs font-mono text-slate-300">
                Am Schlag: <strong className="text-white text-sm">{ownName}</strong> (Schlag{' '}
                {ownState.currentHoleStrokes + 1})
              </div>
              <div className="text-4xl sm:text-6xl font-black font-mono text-emerald-300 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                {ownState.currentDistance} m
              </div>
            </div>

            <p className="text-xs sm:text-sm font-mono font-bold text-cyan-200">{caddyTip}</p>
          </div>

          {/* 3-Dart-Aufnahme + Korrektur (Undo) */}
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-8 sm:col-span-9 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((idx) => {
                const sh = ownState.currentTurnShots[idx];
                const isNext = idx === ownState.currentTurnShots.length;
                return (
                  <div
                    key={idx}
                    className={`min-h-[52px] px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center font-mono ${
                      sh
                        ? sh.holedOut
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100'
                          : sh.overshot
                          ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                          : sh.value === 0
                          ? 'bg-red-950/70 border-red-500/60 text-red-200'
                          : 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                        : isNext
                        ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300 animate-pulse'
                        : 'bg-slate-950/60 border-white/10 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-80">
                      Dart {idx + 1}
                    </span>
                    <span className="text-xs font-black truncate max-w-full">
                      {sh
                        ? `${sh.label} (→${sh.distanceAfter}m)`
                        : isNext
                        ? isBotThrowing
                          ? '🤖 Bot zielt...'
                          : 'Bereit'
                        : '•'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0 || isBotThrowing}
              className="col-span-4 sm:col-span-3 min-h-[52px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white border border-white/15 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Korrektur</span>
            </button>
          </div>

          {isBotThrowing ? (
            <div className="rounded-3xl p-8 bg-slate-900/85 border-2 border-amber-400/50 text-center space-y-2 animate-pulse">
              <div className="text-3xl">🤖⛳</div>
              <div className="text-base sm:text-lg font-black text-amber-300">
                {effectiveP2Name} schlägt aus {p2State.currentDistance} m Entfernung...
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Schlag {p2State.currentHoleStrokes + 1} läuft automatisch
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 1. SMART 1-TAP PUTT / CHECKOUT BUTTON (wenn mit 1 Dart direkt auf 0 checkbar!) */}
              {chk.canCheckoutInOne && (
                <button
                  type="button"
                  onClick={() =>
                    executeDartShot(chk.primaryLabel.replace('Single ', 'S'), chk.value)
                  }
                  data-ui-id="DARTSGOLF.PLAY.DIRECT_HOLEOUT_BTN"
                  className="w-full min-h-[74px] px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-slate-950 border-2 border-emerald-100 font-black text-base sm:text-xl flex flex-col items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] cursor-pointer active:scale-[0.98] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6" />
                    <span>⛳ EINGELOCHT! ({ownState.currentDistance} m gecheckt → 0 m!)</span>
                  </span>
                  <span className="text-xs font-mono opacity-85">
                    Erlaubte Check-Felder: {chk.allOptionsText}
                  </span>
                </button>
              )}

              {/* 2. SCHNELL-DRIVES & BULL / MISS LEISTE (1-Tap ohne Umschalten) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {quickShots.map((q) => {
                  const newDist = Math.abs(ownState.currentDistance - q.value);
                  const isOver = q.value > ownState.currentDistance;
                  const isHole = newDist === 0;
                  return (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => executeDartShot(q.label, q.value)}
                      className={`min-h-[58px] px-2 py-2 rounded-xl border-2 font-mono flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                        isHole
                          ? 'bg-emerald-500/30 border-emerald-300 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : isOver
                          ? 'bg-amber-950/60 border-amber-400/60 text-amber-200 hover:bg-amber-900/70'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-cyan-400/40 text-white'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-black">
                        {q.label} <span className="opacity-75 text-[10px]">({q.value}m)</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          isHole
                            ? 'text-emerald-300'
                            : isOver
                            ? 'text-amber-300'
                            : 'text-cyan-300'
                        }`}
                      >
                        {isHole ? '⛳ ➔ 0m!' : isOver ? `💨 ➔ ${newDist}m` : `➔ ${newDist}m`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 3. RING-WAHL (SINGLE 1× / DOUBLE 2× / TRIPLE 3×) */}
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setSelectedMultiplier(mult)}
                    className={`min-h-[52px] px-3 py-2 rounded-xl border-2 font-mono font-black text-xs sm:text-sm transition-all cursor-pointer ${
                      selectedMultiplier === mult
                        ? mult === 1
                          ? 'bg-cyan-500 text-slate-950 border-cyan-200 shadow-lg'
                          : mult === 2
                          ? 'bg-rose-500 text-white border-rose-200 shadow-lg'
                          : 'bg-amber-400 text-slate-950 border-amber-100 shadow-lg'
                        : 'bg-slate-900/80 text-slate-300 border-white/10 hover:text-white'
                    }`}
                  >
                    {mult === 1
                      ? 'SINGLE (1×)'
                      : mult === 2
                      ? 'DOUBLE (2×)'
                      : 'TRIPLE (3×)'}
                  </button>
                ))}
              </div>

              {/* 4. ZAHLEN-MATRIX 20..1 MIT LIVE-RESTDISTANZ & ÜBERFLUG-VORSCHAU */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {numbersDesc.map((num) => {
                  const val = num * selectedMultiplier;
                  const prefix =
                    selectedMultiplier === 3 ? 'T' : selectedMultiplier === 2 ? 'D' : 'S';
                  const lbl = `${prefix}${num}`;
                  const nextDist = Math.abs(ownState.currentDistance - val);
                  const isOver = val > ownState.currentDistance;
                  const isHole = nextDist === 0;

                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => executeDartShot(lbl, val)}
                      className={`min-h-[60px] px-2 py-2 rounded-xl border-2 font-mono flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                        isHole
                          ? 'bg-emerald-500/35 border-emerald-300 text-white shadow-[0_0_18px_rgba(16,185,129,0.5)]'
                          : isOver
                          ? 'bg-slate-900/90 hover:bg-amber-950/60 border-amber-500/45 text-amber-100'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-white/15 text-white'
                      }`}
                    >
                      <div className="text-sm sm:text-base font-black leading-tight">
                        {lbl}{' '}
                        <span className="text-[11px] font-normal text-slate-400">({val}m)</span>
                      </div>
                      <div
                        className={`text-[10px] font-bold mt-0.5 ${
                          isHole
                            ? 'text-emerald-300 font-black'
                            : isOver
                            ? 'text-amber-300'
                            : 'text-cyan-300'
                        }`}
                      >
                        {isHole ? '⛳ ➔ 0 m!' : isOver ? `💨 ➔ ${nextDist} m` : `➔ ${nextDist} m`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 5. MISS (0 m) & RESTLICHE DARTS MISS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => executeDartShot('MISS', 0)}
                  data-ui-id="DARTSGOLF.PLAY.MISS_BTN"
                  className="min-h-[60px] px-4 py-3 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white border-2 border-red-400 font-black text-sm sm:text-base flex items-center justify-center cursor-pointer active:scale-98"
                >
                  <span>✕ MISS / 0 METER (Bleibt bei {ownState.currentDistance} m)</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestMiss}
                  data-ui-id="DARTSGOLF.PLAY.REST_MISS_BTN"
                  className="min-h-[60px] px-4 py-3 rounded-2xl bg-rose-950/90 hover:bg-rose-900 text-rose-100 border-2 border-rose-500/70 font-black text-sm sm:text-base flex items-center justify-center cursor-pointer active:scale-98"
                >
                  <span>✕✕✕ Restliche Darts Miss (0 m)</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
