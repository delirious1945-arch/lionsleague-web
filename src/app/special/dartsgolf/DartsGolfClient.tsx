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
  GolfHoleDefinition,
  GolfHolePlayerResult,
  GolfHolesCount,
  GolfLastActionBanner,
  GolfPlayerState,
  MAX_STROKES_PER_HOLE,
  cloneGolfPlayerState,
  createInitialGolfPlayerState,
  formatToPar,
  generateGolfCourse,
  getGolfTermForScore,
  isValidThreeDartScore,
  simulateGolfBotVisit,
} from './types';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ClipboardList,
  Delete,
  Flag,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Tv,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const CACHE_KEY = 'lions_active_dartsgolf_session_v2';

interface DartsGolfClientProps {
  players: Player[];
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

export default function DartsGolfClient({
  players,
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
  const [showScorecard, setShowScorecard] = useState<boolean>(false);
  const [scoreInput, setScoreInput] = useState<string>('');

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
    createInitialGolfPlayerState(140)
  );
  const [p2State, setP2State] = useState<GolfPlayerState>(() =>
    createInitialGolfPlayerState(140)
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
      window.history.replaceState(null, '', `/special/dartsgolf?board=${b}`);
    } catch {}
  };

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
        gameMode: '1vs1',
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
    setHoles(newCourse);
    setCurrentHoleIndex(0);
    setActivePlayer(1);
    setP1State(initP1);
    setP2State(initP2);
    setLastAction(startBanner);
    setWinnerPlayer(null);
    setUndoStack([]);
    setScoreInput('');
    setShowScorecard(false);
    setShowHelp(false);
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
    setScoreInput('');
    setShowScorecard(false);
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
    setScoreInput('');
    sendStandbySignal();
  };

  const handleUndo = useCallback(() => {
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
    setScoreInput('');
    setIsGameStarted(true);
  }, [isBotThrowing, undoStack]);

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

  // Kernfunktion: Eine 3-Dart-Aufnahme (1 Aufnahme = 1 Schlag) verbuchen
  const submitVisitScore = useCallback(
    (score: number, isFromBot = false) => {
      if (isGameFinished) return;
      if (!isValidThreeDartScore(score)) return;

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

      const distBefore = own.currentDistance;
      const distAfter = Math.abs(distBefore - score);
      const overshot = score > distBefore;
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
        dartInTurn: (((own.currentHoleStrokes - 1) % 3) + 1) as 1 | 2 | 3,
        label: score === 0 ? 'MISS' : String(score),
        value: score,
        distanceBefore: distBefore,
        distanceAfter: own.currentDistance,
        overshot,
        holedOut,
        pickedUp: reachedMaxStrokes,
      };

      own.currentHoleAllShots.push(shot);
      own.currentTurnShots = own.currentHoleAllShots.slice(-3);

      // Laufenden Score-To-Par aktualisieren
      const completedParOwn = own.completedHoles.reduce((a, h) => a + h.par, 0);
      own.totalParPlayed = completedParOwn + currentHole.par;
      own.scoreToPar = own.totalStrokes - own.totalParPlayed;

      let banner: GolfLastActionBanner;
      const ownDoneOnHole = own.currentHoleHoledOut || own.currentHolePickedUp;
      const oppDoneOnHole = opp.currentHoleHoledOut || opp.currentHolePickedUp;

      if (holedOut) {
        const term = getGolfTermForScore(own.currentHoleStrokes, currentHole.par);
        const isEagleOrBetter =
          own.currentHoleStrokes - currentHole.par <= -2 || own.currentHoleStrokes === 1;
        triggerSound(isEagleOrBetter ? 'eagle' : 'hole_out');
        banner = {
          id: Date.now(),
          tone: isEagleOrBetter ? 'eagle' : 'hole_out',
          icon: isEagleOrBetter ? '🦅' : '⛳',
          headline: `${term.term.toUpperCase()}!`,
          subline: `${actorName} checkt ${distBefore} m im ${own.currentHoleStrokes}. Schlag (${term.toParLabel})!`,
          actorPlayer: activePlayer,
        };
      } else if (reachedMaxStrokes) {
        triggerSound('miss');
        banner = {
          id: Date.now(),
          tone: 'miss',
          icon: '⚠️',
          headline: `MAX-SCHLÄGE (${MAX_STROKES_PER_HOLE})`,
          subline: `${actorName} beendet Loch ${currentHole.holeNumber} mit ${MAX_STROKES_PER_HOLE} Schlägen.`,
          actorPlayer: activePlayer,
        };
      } else if (overshot) {
        triggerSound('overshoot');
        banner = {
          id: Date.now(),
          tone: 'overshoot',
          icon: '💨',
          headline: `ÜBERFLUG! ${score} M BEI ${distBefore} M REST`,
          subline: `${actorName} fliegt übers Loch ➔ ${distAfter} m Rest!`,
          actorPlayer: activePlayer,
        };
      } else if (score === 0) {
        triggerSound('miss');
        banner = {
          id: Date.now(),
          tone: 'miss',
          icon: '✕',
          headline: '0 M (KEIN SCORE)',
          subline: `${actorName} bleibt bei ${distAfter} m vor der Fahne.`,
          actorPlayer: activePlayer,
        };
      } else {
        triggerSound('drive');
        banner = {
          id: Date.now(),
          tone: 'drive',
          icon: '🏌️‍♂️',
          headline: `${score} M GESCHLAGEN`,
          subline: `${actorName}: ${distBefore} m ➔ ${distAfter} m Rest!`,
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
                ? `GLEICHSTAND (${nextP1.totalStrokes} SCHLÄGE)!`
                : `SIEG FÜR ${(winP === 1 ? p1Name : effectiveP2Name).toUpperCase()}!`,
            subline: `${p1Name}: ${nextP1.totalStrokes} (${formatToPar(
              nextP1.scoreToPar
            )}) vs. ${effectiveP2Name}: ${nextP2.totalStrokes} (${formatToPar(
              nextP2.scoreToPar
            )})`,
            actorPlayer: winP === 2 ? 2 : 1,
          };

          try {
            localStorage.removeItem(CACHE_KEY);
          } catch {}

          setP1State(nextP1);
          setP2State(nextP2);
          setLastAction(finalBanner);
          setWinnerPlayer(winP);
          setScoreInput('');
          setIsGameFinished(true);
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
          headline: `LOCH ${currentHole.holeNumber} (${p1LastRes.strokes}:${p2LastRes.strokes}) ➔ LOCH ${nextHole.holeNumber}: ${nextHole.startDistance} M`,
          subline: `${nextHole.name} · Par ${nextHole.par}`,
          actorPlayer: 1,
        };

        setP1State(nextP1);
        setP2State(nextP2);
        setCurrentHoleIndex(nextHoleIdx);
        setActivePlayer(1);
        setScoreInput('');
        setLastAction(nextHoleBanner);
        return;
      }

      // Sofortiger Spielerwechsel nach jedem Schlag (1 Aufnahme = 1 Schlag), solange der andere noch nicht im Loch ist
      const nextActive: 1 | 2 = !oppDoneOnHole
        ? activePlayer === 1
          ? 2
          : 1
        : activePlayer;

      setP1State(nextP1);
      setP2State(nextP2);
      setActivePlayer(nextActive);
      setScoreInput('');
      setLastAction(banner);
    },
    [
      activePlayer,
      currentHoleIndex,
      effectiveP2Name,
      holes,
      isGameFinished,
      lastAction,
      p1Name,
      p1State,
      p2State,
      triggerSound,
      winnerPlayer,
    ]
  );

  // Automatischer Computer-Zug (genau 1 Aufnahme) im 1vsComputer-Modus
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
      const botVisit = simulateGolfBotVisit(p2State.currentDistance, botDifficulty);
      submitVisitScore(botVisit.value, true);
    }, 750);

    return () => clearTimeout(timer);
  }, [
    isGameStarted,
    isGameFinished,
    gameMode,
    activePlayer,
    p2State.currentDistance,
    p2State.currentHoleStrokes,
    botDifficulty,
    submitVisitScore,
  ]);

  // Numpad Handler
  const parsedInput = scoreInput === '' ? null : Number(scoreInput);
  const isInputValid = parsedInput !== null && isValidThreeDartScore(parsedInput);
  const hasInputError =
    scoreInput !== '' && parsedInput !== null && !isValidThreeDartScore(parsedInput);

  const handleDigitPress = useCallback((digit: string) => {
    setScoreInput((prev) => {
      if (prev.length >= 3) return prev;
      if (prev === '0') return digit;
      return prev + digit;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setScoreInput((prev) => prev.slice(0, -1));
  }, []);

  const handleClearInput = useCallback(() => {
    setScoreInput('');
  }, []);

  const handleConfirmInput = useCallback(() => {
    if (!isInputValid || parsedInput === null || isBotThrowing || isGameFinished) return;
    submitVisitScore(parsedInput, false);
  }, [isBotThrowing, isGameFinished, isInputValid, parsedInput, submitVisitScore]);

  // Tastatur-Support für 0–9, Backspace, Escape, Enter
  useEffect(() => {
    if (!isGameStarted || isGameFinished) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isBotThrowing) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearInput();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmInput();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleBackspace,
    handleClearInput,
    handleConfirmInput,
    handleDigitPress,
    isBotThrowing,
    isGameFinished,
    isGameStarted,
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
            href={`/special?board=${activeBoard}`}
            data-ui-id="DARTSGOLF.SETUP.BACK_BTN"
            className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zur Event-Arena</span>
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
                  55–300 m Zufallsdistanzen · Geworfene Gesamtzahl (0–180) eingeben · Überwurf fliegt übers Loch!
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
              <span>Klassisches Eingabepad &amp; Overshoot-Regel</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Jede 3-Dart-Aufnahme zählt als <strong>1 Schlag</strong>. Gib die geworfene
              Gesamtpunktzahl (<code>0–180</code>) am Numpad ein – der Rest wird automatisch im Kopf
              ausgeworfen. Checken ist über jedes Feld erlaubt. Wirfst du mehr Meter als Rest
              (z. B. <strong>25 m</strong> Rest mit <strong>60 m</strong>), fliegt der Ball übers
              Loch und du stehst bei <strong>35 m Rest</strong>!
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

          {/* Platzlänge: 18 Löcher vs. 9 Löcher */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-emerald-200">
                Turnier-Distanz (Anzahl Löcher)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Wähle die volle 18-Loch-Meisterschaftsrunde (Par 72) oder die schnelle 9-Loch-Kurzrunde (Par 36).
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
                  {cnt === 18 ? '18 Löcher (Par 72 · Vollrunde)' : '9 Löcher (Par 36 · Kurzrunde)'}
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
      </div>
    );
  }

  // =========================================================================
  // ANSICHT 2: SCHLANKES TABLET-UI MIT KLASSISCHEM 0–9 EINGABEPAD
  // =========================================================================
  const currentHole = holes[Math.min(holes.length - 1, Math.max(0, currentHoleIndex))];
  const ownState = activePlayer === 1 ? p1State : p2State;
  const ownName = activePlayer === 1 ? p1Name : effectiveP2Name;

  return (
    <div className="max-w-3xl mx-auto px-2.5 sm:px-4 space-y-3 animate-fadeIn">
      {/* 1. Schlanke Top-Leiste */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-900/85 border border-white/10">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleAbortToSetup}
            className="min-h-[42px] px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Abbruch</span>
          </button>

          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 font-mono text-xs font-black">
            B{activeBoard}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 font-mono text-xs font-black">
            ⛳ Loch {currentHole.holeNumber}/{holes.length} · Par {currentHole.par} ({currentHole.startDistance} m)
          </span>
          {restoredFromCache && (
            <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
              ✓ Cache
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowScorecard((v) => !v)}
            data-ui-id="DARTSGOLF.PLAY.SCORECARD_TOGGLE"
            className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showScorecard
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>📋 Scorecard</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className="min-h-[42px] min-w-[42px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
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
            className="min-h-[42px] min-w-[42px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </div>

      {/* Optional aufklappbare Hilfe-Box */}
      {showHelp && (
        <div className="rounded-2xl p-3.5 bg-slate-900/95 border border-emerald-400/40 text-xs text-slate-200 space-y-1">
          <div className="font-black text-emerald-300">⛳ Kurzregeln: Lions Darts-Golf</div>
          <p>
            1 Aufnahme (3 Darts) = 1 Schlag. Gesamtpunktzahl <code>0–180</code> eintippen &amp; mit{' '}
            <strong>✓ OK</strong> bestätigen. Jeder Treffer auf Rest 0 m locht ein. Bei Überwurf gilt{' '}
            <code>|Rest − Wurf|</code>.
          </p>
        </div>
      )}

      {/* Optional aufklappbare 18-Loch Scorecard */}
      {showScorecard && (
        <div className="rounded-2xl bg-slate-900/90 border border-emerald-400/35 p-2.5 overflow-x-auto animate-fadeIn">
          <table className="w-full text-center font-mono text-[10px] sm:text-[11px] border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-white/10">
                <th className="py-1 px-1.5 text-left">LOCH</th>
                {holes.map((h, idx) => (
                  <th
                    key={h.holeNumber}
                    className={`py-1 px-1 ${
                      idx === currentHoleIndex
                        ? 'text-cyan-300 font-black bg-cyan-500/15 rounded-t'
                        : ''
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
      )}

      {/* 2. Kompaktes Dual-Scoreboard */}
      <div className="grid grid-cols-2 gap-2.5">
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
              className={`rounded-2xl p-3 sm:p-3.5 border-2 transition-all ${
                isWin
                  ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
                  : isAct
                  ? isP1
                    ? 'bg-emerald-950/45 border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.28)]'
                    : 'bg-amber-950/45 border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.25)]'
                  : 'bg-slate-900/65 border-white/10 opacity-85'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-white truncate">{name}</div>
                  <div className="text-[11px] font-mono mt-0.5">
                    {st.currentHoleHoledOut ? (
                      <span className="text-emerald-300 font-black">
                        ⛳ Im Loch ({st.currentHoleStrokes})
                      </span>
                    ) : isAct ? (
                      <span className={`${isP1 ? 'text-emerald-300' : 'text-amber-300'} font-black`}>
                        🏌️‍♂️ AM SCHLAG
                      </span>
                    ) : (
                      <span className="text-slate-400">Wartet</span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <div
                    className={`text-sm sm:text-base font-black ${
                      st.scoreToPar < 0
                        ? 'text-emerald-400'
                        : st.scoreToPar === 0
                        ? 'text-white'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatToPar(st.scoreToPar)}{' '}
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({st.totalStrokes} Schl.)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-white/10 flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Restdistanz
                </span>
                <div className="flex items-center gap-1.5">
                  {lastSh?.overshot && !st.currentHoleHoledOut && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-amber-200 font-mono text-[10px] font-black">
                      💨 Überflug
                    </span>
                  )}
                  <span
                    className={`text-2xl sm:text-3xl font-black font-mono ${
                      st.currentHoleHoledOut
                        ? 'text-emerald-400'
                        : isAct
                        ? isP1
                          ? 'text-emerald-300'
                          : 'text-amber-300'
                        : 'text-white'
                    }`}
                  >
                    {st.currentDistance} m
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Kompakter 1-Zeilen-Statusbanner */}
      {lastAction && (
        <div
          className={`rounded-xl px-3.5 py-2 border text-center truncate transition-all ${
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
          <span className="text-xs font-black uppercase tracking-wider mr-2">
            {lastAction.icon} {lastAction.headline}
          </span>
          <span className="text-xs opacity-95">{lastAction.subline}</span>
        </div>
      )}

      {/* Sieger-Screen */}
      {isGameFinished && winnerPlayer && (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-950/85 via-slate-900/95 to-amber-950/80 border-2 border-emerald-400 text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🏆⛳</div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {winnerPlayer === 'draw'
                ? 'Unentschieden!'
                : `Green Jacket für ${winnerPlayer === 1 ? p1Name : effectiveP2Name}!`}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1">
              {p1Name}: {p1State.totalStrokes} Schläge ({formatToPar(p1State.scoreToPar)}) •{' '}
              {effectiveP2Name}: {p2State.totalStrokes} Schläge ({formatToPar(p2State.scoreToPar)})
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

      {/* 4. Klassisches Dart-Eingabepad (Numpad 0–9) */}
      {!isGameFinished && (
        isBotThrowing ? (
          <div className="rounded-3xl p-8 bg-slate-900/85 border-2 border-amber-400/50 text-center space-y-2 animate-pulse">
            <div className="text-3xl">🤖⛳</div>
            <div className="text-base sm:text-lg font-black text-amber-300">
              {effectiveP2Name} schlägt aus {p2State.currentDistance} m Entfernung...
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Schlag {p2State.currentHoleStrokes + 1} (3-Dart-Aufnahme)
            </div>
          </div>
        ) : (
          <div className="rounded-3xl p-3.5 sm:p-4 bg-slate-900/90 border-2 border-white/15 shadow-2xl space-y-3">
            {/* Eingabezeile über dem Pad */}
            <div className="px-4 py-3 rounded-2xl bg-slate-950/90 border border-white/15 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-white truncate">
                  Am Schlag: <span className="text-emerald-300">{ownName}</span>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  Rest: <strong className="text-white">{ownState.currentDistance} m</strong> · Schlag{' '}
                  {ownState.currentHoleStrokes + 1}
                </div>
                {hasInputError && (
                  <div className="text-[11px] font-mono font-bold text-rose-400 mt-0.5">
                    Nur gültige 3-Dart-Werte 0–180
                  </div>
                )}
              </div>

              <div
                className={`min-w-[110px] text-right font-mono text-4xl sm:text-5xl font-black tracking-tight px-3 py-1 rounded-xl border ${
                  hasInputError
                    ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                    : scoreInput !== ''
                    ? 'bg-emerald-950/50 border-emerald-400/70 text-emerald-300'
                    : 'bg-slate-900/80 border-white/10 text-slate-400'
                }`}
              >
                {scoreInput || '0'}
              </div>
            </div>

            {/* Riesiges 3×4 Numpad */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  data-ui-id={`DARTSGOLF.NUMPAD.${digit}`}
                  className="min-h-[68px] sm:min-h-[76px] rounded-2xl bg-slate-800/95 hover:bg-slate-700 active:scale-[0.97] border border-white/15 text-white font-mono text-2xl sm:text-3xl font-black shadow-lg transition-all cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleBackspace}
                data-ui-id="DARTSGOLF.NUMPAD.BACKSPACE"
                className="min-h-[68px] sm:min-h-[76px] rounded-2xl bg-rose-950/80 hover:bg-rose-900/90 active:scale-[0.97] border border-rose-500/50 text-rose-200 font-mono text-xl sm:text-2xl font-black flex items-center justify-center shadow-lg transition-all cursor-pointer"
                aria-label="Letzte Ziffer löschen"
              >
                <Delete className="w-7 h-7" />
              </button>

              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                data-ui-id="DARTSGOLF.NUMPAD.0"
                className="min-h-[68px] sm:min-h-[76px] rounded-2xl bg-slate-800/95 hover:bg-slate-700 active:scale-[0.97] border border-white/15 text-white font-mono text-2xl sm:text-3xl font-black shadow-lg transition-all cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleConfirmInput}
                disabled={!isInputValid}
                data-ui-id="DARTSGOLF.NUMPAD.OK"
                className="min-h-[68px] sm:min-h-[76px] rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:border-white/10 active:scale-[0.97] border-2 border-emerald-200 text-slate-950 font-mono text-xl sm:text-2xl font-black shadow-xl shadow-emerald-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                ✓ OK
              </button>
            </div>

            {/* 1 kompakte Aktionszeile darunter */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                data-ui-id="DARTSGOLF.PLAY.UNDO_BTN"
                className="min-h-[50px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 border border-white/15 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>↩ Letzten Schlag korrigieren</span>
              </button>

              <button
                type="button"
                onClick={handleClearInput}
                disabled={scoreInput === ''}
                data-ui-id="DARTSGOLF.PLAY.CLEAR_BTN"
                className="min-h-[50px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-white/15 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>C Eingabe leeren</span>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
