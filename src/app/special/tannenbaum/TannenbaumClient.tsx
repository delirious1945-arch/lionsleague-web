'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import { generateSessionId } from '@/lib/liveSession';
import {
  TANNENBAUM_ROWS,
  TannenbaumBallNumber,
  TannenbaumDartEvent,
  TannenbaumLastActionBanner,
  TannenbaumNodeId,
  TannenbaumPlayerState,
  TannenbaumStarTarget,
  clonePlayerState,
  countLitBaseElements,
  countTotalLit,
  createInitialPlayerState,
  isStarUnlocked,
} from './types';
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Star,
  Trees,
  Tv,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const CACHE_KEY = 'lions_active_tannenbaum_session_v1';

interface TannenbaumClientProps {
  players: Player[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

interface TurnSnapshot {
  activePlayer: 1 | 2;
  roundNumber: number;
  p1State: TannenbaumPlayerState;
  p2State: TannenbaumPlayerState;
  lastAction: TannenbaumLastActionBanner | null;
  winnerPlayer: 1 | 2 | null;
  isGameFinished: boolean;
}

type SoundKind = 'lit' | 'trunk' | 'extinguish' | 'star_unlocked' | 'win' | 'miss';

function createAudioBeep(kind: SoundKind) {
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

    if (kind === 'lit') {
      playTone(659.25, 0, 0.14, 'triangle', 0.12); // E5
      playTone(987.77, 0.08, 0.22, 'sine', 0.13); // B5
    } else if (kind === 'trunk') {
      playTone(440, 0, 0.15, 'triangle', 0.13);
      playTone(554.37, 0.09, 0.15, 'triangle', 0.13);
      playTone(659.25, 0.18, 0.25, 'sine', 0.14);
    } else if (kind === 'extinguish') {
      playTone(420, 0, 0.16, 'sawtooth', 0.1);
      playTone(230, 0.12, 0.28, 'sawtooth', 0.11);
    } else if (kind === 'star_unlocked') {
      playTone(523.25, 0, 0.14, 'triangle', 0.12);
      playTone(659.25, 0.1, 0.14, 'triangle', 0.12);
      playTone(783.99, 0.2, 0.16, 'triangle', 0.13);
      playTone(1046.5, 0.32, 0.36, 'sine', 0.14);
    } else if (kind === 'win') {
      playTone(523.25, 0, 0.15, 'triangle', 0.14);
      playTone(659.25, 0.12, 0.15, 'triangle', 0.14);
      playTone(783.99, 0.24, 0.18, 'triangle', 0.14);
      playTone(1046.5, 0.38, 0.45, 'sine', 0.16);
      playTone(1318.51, 0.52, 0.55, 'sine', 0.14);
    } else {
      playTone(170, 0, 0.14, 'sine', 0.08);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch {}
}

export default function TannenbaumClient({
  players,
  currentUser,
}: TannenbaumClientProps) {
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
  const [p1Name, setP1Name] = useState<string>(defaultP1);
  const [p2Name, setP2Name] = useState<string>(validPlayers[1]?.name || 'Gastspieler');
  const [isGuestP1, setIsGuestP1] = useState<boolean>(false);
  const [isGuestP2, setIsGuestP2] = useState<boolean>(false);
  const [tripleExtinguishEnabled, setTripleExtinguishEnabled] = useState<boolean>(true);
  const [starTarget, setStarTarget] = useState<TannenbaumStarTarget>('BULL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Arretierung von Spieler 1 im Solo-Modus (AGENTS.md §12.5)
  useEffect(() => {
    if (gameMode === 'solo' && !isBoardUser && userPlayerMatch) {
      setIsGuestP1(false);
      setP1Name(userPlayerMatch.name);
    }
  }, [gameMode, isBoardUser, userPlayerMatch]);

  // Spiel-Zustand
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [p1State, setP1State] = useState<TannenbaumPlayerState>(createInitialPlayerState);
  const [p2State, setP2State] = useState<TannenbaumPlayerState>(createInitialPlayerState);
  const [lastAction, setLastAction] = useState<TannenbaumLastActionBanner | null>(null);
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
        localStorage.getItem('lions_active_board_tannenbaum') ||
        localStorage.getItem('lions_active_board') ||
        '1'
      );
    }
    return '1';
  });

  const [gameSessionId, setGameSessionId] = useState<string>(() =>
    generateSessionId('tannenbaum', activeBoard)
  );
  const liveBroadcastRef = useRef<BroadcastChannel | null>(null);

  const playSound = useCallback(
    (kind: SoundKind) => {
      if (soundEnabled) {
        createAudioBeep(kind);
      }
    },
    [soundEnabled]
  );

  const handleSelectBoard = (b: string) => {
    setActiveBoard(b);
    try {
      localStorage.setItem('lions_tablet_board', b);
      localStorage.setItem('lions_active_board', b);
      localStorage.setItem('lions_active_board_tannenbaum', b);
      window.history.replaceState(null, '', `/special/tannenbaum?board=${b}`);
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      liveBroadcastRef.current = new BroadcastChannel(`lions_tannenbaum_live_sync_${activeBoard}`);
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
      console.error('Fehler beim Laden des Tannenbaum-Caches:', e);
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
      p1S: TannenbaumPlayerState,
      p2S: TannenbaumPlayerState,
      actPlayer: 1 | 2,
      rNum: number,
      banner: TannenbaumLastActionBanner | null,
      winPlayer: 1 | 2 | null,
      overrideSessionId?: string
    ) => {
      const winnerDisplayName =
        winPlayer === 1 ? p1Name : winPlayer === 2 ? p2Name : null;

      return {
        boardId: activeBoard,
        sessionId: overrideSessionId || gameSessionId,
        status: finished ? ('completed' as const) : ('playing' as const),
        gameType: 'tannenbaum' as const,
        gameTitle: 'Lions Tannenbaum',
        gameMode,
        p1Name: p1Name.trim() || 'Spieler 1',
        p2Name: p2Name.trim() || 'Spieler 2',
        activePlayer: actPlayer,
        currentRound: rNum,
        scoreP1: countTotalLit(p1S.tree),
        scoreP2: countTotalLit(p2S.tree),
        winner: winnerDisplayName || undefined,
        tannenbaumData: {
          tripleExtinguishEnabled,
          starTarget,
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
      gameSessionId,
      gameMode,
      p1Name,
      p2Name,
      tripleExtinguishEnabled,
      starTarget,
    ]
  );

  // 4s Heartbeat solange aktiv ODER im Sieger-Screen (damit TV-Sieger-Overlay erhalten bleibt)
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
      p1S: TannenbaumPlayerState,
      p2S: TannenbaumPlayerState,
      actPlayer: 1 | 2,
      rNum: number,
      banner: TannenbaumLastActionBanner | null,
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
            p1Name,
            p2Name,
            isGuestP1,
            isGuestP2,
            tripleExtinguishEnabled,
            starTarget,
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
    p1Name,
    p2Name,
    isGuestP1,
    isGuestP2,
    tripleExtinguishEnabled,
    starTarget,
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

    const freshId = generateSessionId('tannenbaum', activeBoard);
    const initP1 = createInitialPlayerState();
    const initP2 = createInitialPlayerState();
    const startBanner: TannenbaumLastActionBanner = {
      id: Date.now(),
      type: 'info',
      headline: '🎄 ANWURF!',
      subline:
        gameMode === '1vs1'
          ? `${cleanP1} eröffnet das Tannenbaum-Duell gegen ${cleanP2}!`
          : `${cleanP1} startet die Tannenbaum-Challenge!`,
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
    setP1Name(c.p1Name || defaultP1);
    setP2Name(c.p2Name || 'Gastspieler');
    setIsGuestP1(Boolean(c.isGuestP1));
    setIsGuestP2(Boolean(c.isGuestP2));
    setTripleExtinguishEnabled(c.tripleExtinguishEnabled ?? true);
    setStarTarget(c.starTarget === 'D20' ? 'D20' : 'BULL');
    setActivePlayer(c.activePlayer === 2 ? 2 : 1);
    setRoundNumber(Number(c.roundNumber || 1));
    setP1State(c.p1State || createInitialPlayerState());
    setP2State(c.p2State || createInitialPlayerState());
    setLastAction(c.lastAction ?? null);
    setWinnerPlayer(c.winnerPlayer ?? null);
    setUndoStack(Array.isArray(c.undoStack) ? c.undoStack : []);
    setGameSessionId(c.gameSessionId || generateSessionId('tannenbaum', activeBoard));
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

  // Spiel beenden / Zurück zum Setup
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
    setP1State(clonePlayerState(prev.p1State));
    setP2State(clonePlayerState(prev.p2State));
    setLastAction(prev.lastAction);
    setWinnerPlayer(prev.winnerPlayer);
    setIsGameFinished(prev.isGameFinished);
    setIsGameStarted(true);
  };

  // Hilfsfunktion: Snapshot pushen & Zugabschluss ausführen
  const commitTurnStep = (
    nextP1: TannenbaumPlayerState,
    nextP2: TannenbaumPlayerState,
    banner: TannenbaumLastActionBanner,
    winPlayer: 1 | 2 | null
  ) => {
    const isWin = winPlayer !== null;
    const ownAfter = activePlayer === 1 ? nextP1 : nextP2;
    let nextActive: 1 | 2 = activePlayer;
    let nextRound = roundNumber;

    if (isWin) {
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
    setIsGameFinished(isWin);
  };

  const pushSnapshot = () => {
    const snap: TurnSnapshot = {
      activePlayer,
      roundNumber,
      p1State: clonePlayerState(p1State),
      p2State: clonePlayerState(p2State),
      lastAction,
      winnerPlayer,
      isGameFinished,
    };
    setUndoStack((prev) => [...prev.slice(-49), snap]);
  };

  // A) Kugel 12–20 getroffen (Single/Double oder direkter Triple-Angriff)
  const handleBallHit = (num: TannenbaumBallNumber, isTriple: boolean) => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = clonePlayerState(p1State);
    const nextP2 = clonePlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const opp = activePlayer === 1 ? nextP2 : nextP1;
    const activeName = activePlayer === 1 ? p1Name : p2Name;
    const oppName = activePlayer === 1 ? p2Name : p1Name;

    if (own.currentTurnDarts.length >= 3) own.currentTurnDarts = [];

    const wasStarUnlocked = isStarUnlocked(own.tree);
    let newlyLitBall = false;
    if (!own.tree.balls[num]) {
      own.tree.balls[num] = true;
      own.lightsLitCount += 1;
      newlyLitBall = true;
    }

    let extinguishedOpp = false;
    if (isTriple && tripleExtinguishEnabled && gameMode === '1vs1' && opp.tree.balls[num]) {
      opp.tree.balls[num] = false;
      opp.timesExtinguished += 1;
      own.extinguishedCount += 1;
      extinguishedOpp = true;
    }

    const nowStarUnlocked = isStarUnlocked(own.tree);
    const unlockedStarThisDart = !wasStarUnlocked && nowStarUnlocked;
    own.dartsThrown += 1;

    const nodeId = String(num) as TannenbaumNodeId;
    const ev: TannenbaumDartEvent = extinguishedOpp
      ? {
          kind: 'triple_extinguish',
          label: `T${num}`,
          target: nodeId,
          isTriple: true,
          extinguishedOpponentBall: num,
        }
      : newlyLitBall
      ? {
          kind: 'ball_lit',
          label: `${isTriple ? 'T' : ''}${num}`,
          target: nodeId,
          isTriple,
        }
      : {
          kind: 'ball_already_lit',
          label: `${isTriple ? 'T' : ''}${num}`,
          target: nodeId,
          isTriple,
        };

    own.currentTurnDarts.push(ev);

    let banner: TannenbaumLastActionBanner;
    if (extinguishedOpp) {
      playSound('extinguish');
      banner = {
        id: Date.now(),
        type: 'extinguish',
        headline: '💨 LICHT GEKLAUT!',
        subline: unlockedStarThisDart
          ? `${activeName} klaut ${oppName}s Kugel ${num} — UND schaltet den Stern frei!`
          : `${activeName} klaut ${oppName}s Kugel ${num}!`,
        actorPlayer: activePlayer,
        affectedNode: nodeId,
      };
    } else if (unlockedStarThisDart) {
      playSound('star_unlocked');
      banner = {
        id: Date.now(),
        type: 'star_unlocked',
        headline: '⭐ STERN FREIGESCHALTET!',
        subline: `${activeName} hat alle 10 Lichter an – jetzt auf ${starTarget} zum Sieg!`,
        actorPlayer: activePlayer,
        affectedNode: nodeId,
      };
    } else if (newlyLitBall) {
      playSound('lit');
      banner = {
        id: Date.now(),
        type: 'lit',
        headline: `✨ KUGEL ${num} ERLEUCHTET!`,
        subline: `${activeName} zündet Kugel ${num} an (${countTotalLit(own.tree)}/11).`,
        actorPlayer: activePlayer,
        affectedNode: nodeId,
      };
    } else {
      playSound('lit');
      banner = {
        id: Date.now(),
        type: 'info',
        headline: `KUGEL ${num} BEREITS AN`,
        subline:
          isTriple && tripleExtinguishEnabled && gameMode === '1vs1'
            ? `Bei ${oppName} leuchtet die ${num} noch nicht.`
            : `${activeName} trifft erneut die ${num}.`,
        actorPlayer: activePlayer,
        affectedNode: nodeId,
      };
    }

    commitTurnStep(nextP1, nextP2, banner, null);
  };

  // B) Baumstamm (beliebiges Doppel) getroffen
  const handleTrunkHit = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = clonePlayerState(p1State);
    const nextP2 = clonePlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    if (own.currentTurnDarts.length >= 3) own.currentTurnDarts = [];

    const wasStarUnlocked = isStarUnlocked(own.tree);
    let newlyLit = false;
    if (!own.tree.trunk) {
      own.tree.trunk = true;
      own.lightsLitCount += 1;
      newlyLit = true;
    }
    const unlockedStarThisDart = !wasStarUnlocked && isStarUnlocked(own.tree);
    own.dartsThrown += 1;

    own.currentTurnDarts.push({
      kind: newlyLit ? 'trunk_lit' : 'trunk_already_lit',
      label: 'DOPPEL',
      target: 'TRUNK',
    });

    let banner: TannenbaumLastActionBanner;
    if (unlockedStarThisDart) {
      playSound('star_unlocked');
      banner = {
        id: Date.now(),
        type: 'star_unlocked',
        headline: '⭐ STERN FREIGESCHALTET!',
        subline: `${activeName} beleuchtet den Stamm – jetzt ${starTarget} für den Sieg!`,
        actorPlayer: activePlayer,
        affectedNode: 'TRUNK',
      };
    } else if (newlyLit) {
      playSound('trunk');
      banner = {
        id: Date.now(),
        type: 'trunk',
        headline: '🪵 BAUMSTAMM ERLEUCHTET!',
        subline: `${activeName} trifft ein Doppel und erleuchtet den Stamm (${countTotalLit(own.tree)}/11).`,
        actorPlayer: activePlayer,
        affectedNode: 'TRUNK',
      };
    } else {
      playSound('trunk');
      banner = {
        id: Date.now(),
        type: 'info',
        headline: '🪵 STAMM BEREITS AN',
        subline: `${activeName} trifft nochmal ein Doppel.`,
        actorPlayer: activePlayer,
        affectedNode: 'TRUNK',
      };
    }

    commitTurnStep(nextP1, nextP2, banner, null);
  };

  // C) Spitzen-Stern (Finale) getroffen
  const handleStarHit = () => {
    if (isGameFinished) return;
    const curOwn = activePlayer === 1 ? p1State : p2State;
    if (!isStarUnlocked(curOwn.tree)) return;

    pushSnapshot();

    const nextP1 = clonePlayerState(p1State);
    const nextP2 = clonePlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    if (own.currentTurnDarts.length >= 3) own.currentTurnDarts = [];

    own.tree.star = true;
    own.lightsLitCount += 1;
    own.dartsThrown += 1;
    own.currentTurnDarts.push({
      kind: 'star_win',
      label: starTarget,
      target: 'STAR',
    });

    playSound('win');
    const banner: TannenbaumLastActionBanner = {
      id: Date.now(),
      type: 'win',
      headline: '🏆 FROHE WEIHNACHTEN & SIEG!',
      subline: `${activeName} setzt den Stern (${starTarget}) auf die Spitze!`,
      actorPlayer: activePlayer,
      affectedNode: 'STAR',
    };

    commitTurnStep(nextP1, nextP2, banner, activePlayer);
  };

  // D) Fehlwurf (einzelner Dart Miss)
  const handleMiss = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = clonePlayerState(p1State);
    const nextP2 = clonePlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    if (own.currentTurnDarts.length >= 3) own.currentTurnDarts = [];

    own.dartsThrown += 1;
    own.currentTurnDarts.push({ kind: 'miss', label: 'MISS' });

    playSound('miss');
    const banner: TannenbaumLastActionBanner = {
      id: Date.now(),
      type: 'miss',
      headline: '✕ DANEBEN',
      subline: `${activeName} verfehlt die offenen Lichter.`,
      actorPlayer: activePlayer,
    };

    commitTurnStep(nextP1, nextP2, banner, null);
  };

  // E) Restliche Darts dieser Aufnahme als Miss buchen
  const handleRestMiss = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = clonePlayerState(p1State);
    const nextP2 = clonePlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    const existing = own.currentTurnDarts.length >= 3 ? 0 : own.currentTurnDarts.length;
    if (existing === 0) own.currentTurnDarts = [];
    const remaining = Math.max(1, 3 - existing);

    own.dartsThrown += remaining;
    for (let i = 0; i < remaining; i += 1) {
      own.currentTurnDarts.push({ kind: 'miss', label: 'MISS' });
    }

    playSound('miss');
    const banner: TannenbaumLastActionBanner = {
      id: Date.now(),
      type: 'miss',
      headline: '✕ AUFNAHME DANEBEN',
      subline: `${activeName} beendet die Aufnahme ohne weiteren Treffer.`,
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
            data-ui-id="TANNENBAUM.SETUP.BACK_BTN"
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

        {/* Crash- & Wisch-Schutz: Unterbrochenes Spiel gefunden */}
        {cachedSessionToResume && (
          <div
            data-ui-id="TANNENBAUM.RESUME.DIALOG"
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
                      {countTotalLit(cachedSessionToResume.p1State?.tree || createInitialPlayerState().tree)}/11 vs.{' '}
                      {countTotalLit(cachedSessionToResume.p2State?.tree || createInitialPlayerState().tree)}/11 Lichter)
                    </>
                  ) : (
                    <>
                      {' '}({countTotalLit(cachedSessionToResume.p1State?.tree || createInitialPlayerState().tree)}/11 Lichter)
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
        <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-[#071912]/90 via-slate-900/90 to-[#150f08]/90 border-2 border-emerald-500/35 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                <Trees className="w-7 h-7 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  🎄 Lions Tannenbaum
                </h1>
                <p className="text-xs sm:text-sm text-amber-300 font-semibold">
                  Duell an einem gemeinsamen Tannenbaum · 9 Kugeln (12–20) + Stamm (Doppel) + Stern ({starTarget})
                </p>
              </div>
            </div>

            {/* Board Auswahl */}
            <div className="flex items-center gap-1.5">
              {['1', '2', '3', '4', '5'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleSelectBoard(b)}
                  className={`min-w-[44px] min-h-[44px] rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                    activeBoard === b
                      ? 'bg-emerald-500 text-slate-950 shadow-lg'
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
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
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
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
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
            {/* Spieler 1 */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-mono font-black uppercase tracking-wider text-emerald-300">
                  {gameMode === '1vs1' ? 'Spieler 1 · ◀ Links (Smaragd)' : 'Spieler 1'}
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
                <div className="min-h-[52px] px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-between gap-2">
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
                  className="w-full min-h-[52px] px-4 rounded-xl bg-slate-900 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-emerald-400"
                />
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

            {/* Spieler 2 */}
            {gameMode === '1vs1' && (
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-mono font-black uppercase tracking-wider text-amber-300">
                    Spieler 2 · Rechts (Gold) ▶
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

          {/* Spielregeln-Optionen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Triple Auspust-Regel */}
            <button
              type="button"
              onClick={() => setTripleExtinguishEnabled((v) => !v)}
              disabled={gameMode === 'solo'}
              className={`min-h-[60px] p-4 rounded-2xl border-2 text-left flex items-center justify-between gap-3 transition-all ${
                gameMode === 'solo'
                  ? 'opacity-45 cursor-not-allowed bg-slate-950/50 border-white/10'
                  : tripleExtinguishEnabled
                  ? 'bg-red-950/40 border-red-400/70 text-red-100 cursor-pointer'
                  : 'bg-slate-950/60 border-white/15 text-slate-300 cursor-pointer'
              }`}
            >
              <div>
                <div className="text-sm font-black flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-400" />
                  <span>Triple klaut Gegner-Licht</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Ein direktes Triple klaut die brennende Kugelhälfte des Gegners!
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-black ${
                  tripleExtinguishEnabled && gameMode === '1vs1'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tripleExtinguishEnabled && gameMode === '1vs1' ? 'AN' : 'AUS'}
              </span>
            </button>

            {/* Spitzen-Stern Ziel */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-amber-200 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>Spitzen-Stern Finale</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Entscheidender Wurf bei 10/10 Lichtern
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {(['BULL', 'D20'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStarTarget(t)}
                    className={`min-h-[44px] px-3.5 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                      starTarget === t
                        ? 'bg-amber-400 text-slate-950 shadow-lg'
                        : 'bg-slate-900 text-slate-300 border border-white/15'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartGame}
            data-ui-id="TANNENBAUM.SETUP.START_BTN"
            className="w-full min-h-[60px] py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>🎄 Tannenbaum anzünden &amp; Spiel starten</span>
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
  const ownLit = countTotalLit(ownState.tree);
  const starReady = isStarUnlocked(ownState.tree);
  const oppStarReady = gameMode === '1vs1' && isStarUnlocked(oppState.tree);
  const remainingBaseLights = Math.max(0, 10 - countLitBaseElements(ownState.tree));
  const showTripleButtons = gameMode === '1vs1' && tripleExtinguishEnabled;

  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-5 space-y-3.5 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/80 border border-white/10">
        <div className="flex items-center gap-2">
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
          <div className="font-black text-amber-300">🎄 Spielregeln: Lions Tannenbaum</div>
          <p>
            1. Duell an einem gemeinsamen Tannenbaum (Links = Spieler 1 Smaragd, Rechts = Spieler 2 Gold). Alle 9
            Christbaumkugeln (12 bis 20) und der Baumstamm (beliebiges Doppel) müssen leuchten.
          </p>
          <p>
            2. Brennen alle 10 eigenen Lichter (9 Kugeln + Stamm), wird der Spitzen-Stern ({starTarget}) freigeschaltet.
            Ein Treffer darauf gewinnt sofort!
          </p>
          {showTripleButtons && (
            <p className="text-red-300 font-semibold">
              3. Direkt-Klau ohne Umschalten: Tippe auf die Zahl für Single/Double oder direkt darunter auf 🔥 T-Zahl,
              um dem Gegner das Licht zu klauen!
            </p>
          )}
        </div>
      )}

      {/* Spieler Status Karten */}
      <div className={`grid gap-3 ${gameMode === '1vs1' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {[1, ...(gameMode === '1vs1' ? [2] : [])].map((pNum) => {
          const isP1 = pNum === 1;
          const st = isP1 ? p1State : p2State;
          const name = isP1 ? p1Name : p2Name;
          const lit = countTotalLit(st.tree);
          const pct = Math.round((lit / 11) * 100);
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
                    ? 'bg-emerald-950/45 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                    : 'bg-amber-950/45 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.25)]'
                  : 'bg-slate-900/60 border-white/10 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {gameMode === '1vs1' && (
                    <span
                      className={`text-[10px] font-mono font-black uppercase tracking-wider block ${
                        isP1 ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {isP1 ? '◀ Links (Smaragd)' : 'Rechts (Gold) ▶'}
                    </span>
                  )}
                  <div className="text-sm sm:text-lg font-black text-white truncate">{name}</div>
                  <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2 mt-0.5 flex-wrap">
                    {isWin ? (
                      <span className="text-amber-300 font-black">🏆 SIEGER!</span>
                    ) : isAct ? (
                      <span className={`${isP1 ? 'text-emerald-300' : 'text-amber-300'} font-black`}>
                        🎯 AM WURF
                      </span>
                    ) : (
                      <span className="text-slate-400">Wartet</span>
                    )}
                    {showTripleButtons && st.extinguishedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-200 font-bold">
                        💨 {st.extinguishedCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-2xl sm:text-3xl font-black font-mono ${
                      isP1 ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {lit}
                    <span className="text-xs text-slate-400">/11</span>
                  </span>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mt-2.5 border border-white/10">
                <div
                  className={`h-full transition-all duration-300 ${
                    isP1
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-300'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Event Banner */}
      {lastAction && (
        <div
          className={`rounded-2xl px-4 py-2.5 border text-center transition-all ${
            lastAction.type === 'extinguish'
              ? 'bg-red-950/80 border-red-400 text-red-100'
              : lastAction.type === 'win' || lastAction.type === 'star_unlocked'
              ? 'bg-amber-950/75 border-amber-400 text-amber-100'
              : lastAction.type === 'lit' || lastAction.type === 'trunk'
              ? 'bg-emerald-950/75 border-emerald-400 text-emerald-100'
              : lastAction.type === 'miss'
              ? 'bg-red-950/55 border-red-500/50 text-red-200'
              : 'bg-slate-900/75 border-white/15 text-slate-200'
          }`}
        >
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider mr-2">
            {lastAction.headline}
          </span>
          <span className="text-xs sm:text-sm opacity-95">{lastAction.subline}</span>
        </div>
      )}

      {/* Sieger Banner auf dem Tablet */}
      {isGameFinished && winnerPlayer && (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-950/80 via-slate-900/95 to-emerald-950/80 border-2 border-amber-400 text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🏆🎄</div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {winnerPlayer === 1 ? p1Name : p2Name} gewinnt das Tannenbaum-Match!
            </h2>
            <p className="text-xs sm:text-sm text-amber-200 mt-1">
              Alle 11 Lichter erstrahlen in Runde {roundNumber} ({ownState.dartsThrown} Darts).
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

      {/* Aktuelle 3-Dart-Aufnahme + Undo */}
      {!isGameFinished && (
        <>
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
                        ? ev.kind === 'triple_extinguish'
                          ? 'bg-red-500/25 border-red-400 text-red-100'
                          : ev.kind === 'miss'
                          ? 'bg-red-950/70 border-red-500/60 text-red-200'
                          : 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                        : isNext
                        ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300 animate-pulse'
                        : 'bg-slate-950/60 border-white/10 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-80">Dart {idx + 1}</span>
                    <span className="text-xs sm:text-sm font-black truncate max-w-full">
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

          {/* Interaktive Tannenbaum-Pyramide (1-Blick, ohne Umschalter) */}
          <div className="rounded-3xl p-4 sm:p-6 bg-gradient-to-b from-[#061812]/90 via-[#04120d]/95 to-slate-950 border-2 border-emerald-500/30 space-y-3.5 shadow-2xl">
            <div className="text-center text-xs font-mono uppercase tracking-widest text-emerald-300 font-bold">
              🎯 {ownName} wirft ({ownLit}/11 Lichter) — Tipp direkt aufs getroffene Feld:
            </div>

            {/* Reihe 0: Spitzen-Stern */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleStarHit}
                disabled={!starReady}
                className={`min-h-[60px] w-full max-w-sm px-5 py-2 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center ${
                  starReady
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 border-yellow-200 shadow-[0_0_30px_rgba(251,191,36,0.65)] animate-pulse cursor-pointer hover:scale-[1.02]'
                    : 'bg-slate-900/75 border-white/10 text-slate-400 cursor-not-allowed opacity-80'
                }`}
              >
                <span className="text-base sm:text-lg flex items-center gap-1.5">
                  <span>⭐ STERN ({starTarget})</span>
                </span>
                <span className="text-[11px] font-mono font-bold">
                  {starReady
                    ? 'FINALE FREI! JETZT TREFFEN ZUM SIEG!'
                    : `Noch ${remainingBaseLights} Lichter bis zum Stern`}
                </span>
                {oppStarReady && (
                  <span className="text-[10px] font-mono font-black text-red-400 mt-0.5">
                    🔥 {oppName} steht ebenfalls am Stern!
                  </span>
                )}
              </button>
            </div>

            {/* Reihen 1–3: Christbaumkugeln als Kombi-Kacheln */}
            {TANNENBAUM_ROWS.map((row, rIdx) => {
              const rowGridCls =
                rIdx === 0
                  ? 'grid grid-cols-2 gap-2.5 sm:gap-3 max-w-md mx-auto w-full'
                  : rIdx === 1
                  ? 'grid grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto w-full'
                  : 'grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-w-4xl mx-auto w-full';

              return (
                <div key={rIdx} className={rowGridCls}>
                  {row.map((num) => {
                    const isP1Lit = p1State.tree.balls[num];
                    const isP2Lit = p2State.tree.balls[num];
                    const isOwnLit = ownState.tree.balls[num];
                    const isOppLit = gameMode === '1vs1' && oppState.tree.balls[num];

                    const tileBorderCls = isOwnLit
                      ? activePlayer === 1
                        ? 'border-emerald-400 bg-emerald-950/35 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                        : 'border-amber-400 bg-amber-950/35 shadow-[0_0_16px_rgba(251,191,36,0.25)]'
                      : 'border-white/20 bg-slate-900/85';

                    return (
                      <div
                        key={num}
                        className={`rounded-2xl overflow-hidden border-2 flex flex-col transition-all ${tileBorderCls}`}
                      >
                        {/* Oberer Haupt-Button: Single / Double */}
                        <button
                          type="button"
                          onClick={() => handleBallHit(num, false)}
                          className={`${
                            showTripleButtons ? 'min-h-[58px]' : 'min-h-[64px]'
                          } w-full px-2.5 py-2 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.06] active:scale-[0.98] transition-all font-mono`}
                        >
                          <span className="text-xl sm:text-2xl font-black text-white leading-none">
                            {num}
                          </span>

                          {gameMode === '1vs1' ? (
                            <div className="flex items-center justify-between gap-1.5 w-full mt-1.5 text-[10px] font-black">
                              <span
                                className={`px-1.5 py-0.5 rounded-md border ${
                                  isP1Lit
                                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                                    : 'bg-slate-950/70 border-white/10 text-slate-400'
                                }`}
                              >
                                {isP1Lit ? '✓ P1' : '○ P1'}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded-md border ${
                                  isP2Lit
                                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                                    : 'bg-slate-950/70 border-white/10 text-slate-400'
                                }`}
                              >
                                {isP2Lit ? 'P2 ✓' : 'P2 ○'}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`text-[10px] font-bold mt-1 ${
                                isOwnLit ? 'text-emerald-300' : 'text-slate-400'
                              }`}
                            >
                              {isOwnLit ? '✓ AN' : '○ AUS'}
                            </span>
                          )}
                        </button>

                        {/* Unterer Direkt-Triple-Button (ohne Umschalten!) */}
                        {showTripleButtons && (
                          <button
                            type="button"
                            onClick={() => handleBallHit(num, true)}
                            title={
                              isOppLit
                                ? `Triple ${num} — klaut ${oppName} das Licht!`
                                : `Triple ${num} buchen`
                            }
                            className={`min-h-[52px] w-full px-2 py-1.5 font-mono text-xs font-black flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98] transition-all ${
                              isOppLit
                                ? 'bg-red-600/85 hover:bg-red-500 text-white border-t border-red-400/70'
                                : 'bg-slate-950/85 hover:bg-slate-800 text-slate-300 border-t border-white/10'
                            }`}
                          >
                            {isOppLit ? (
                              <span>🔥 T{num} · KLAUEN</span>
                            ) : (
                              <span>T{num}</span>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Basis: Baumstamm */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleTrunkHit}
                className={`min-h-[60px] w-full max-w-md px-5 py-2 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                  ownState.tree.trunk
                    ? activePlayer === 1
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                    : 'bg-amber-950/45 hover:bg-amber-900/50 border-amber-600/50 text-amber-100'
                }`}
              >
                <span className="text-sm sm:text-base">
                  🪵 BAUMSTAMM (Beliebiges Doppel)
                </span>
                {gameMode === '1vs1' ? (
                  <div className="flex items-center justify-center gap-4 mt-1 font-mono text-[11px] font-black">
                    <span className={p1State.tree.trunk ? 'text-emerald-300' : 'text-slate-400'}>
                      P1: {p1State.tree.trunk ? '✓ AN' : '○ AUS'}
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className={p2State.tree.trunk ? 'text-amber-300' : 'text-slate-400'}>
                      P2: {p2State.tree.trunk ? '✓ AN' : '○ AUS'}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-mono">
                    {ownState.tree.trunk ? '✓ STAMM ERLEUCHTET' : '○ NOCH DUNKEL · Doppel treffen'}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Untere Fehlwurf-Leiste (Rot-Semantik) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleMiss}
              data-ui-id="TANNENBAUM.PLAY.MISS_BTN"
              className="min-h-[60px] px-5 py-3 rounded-2xl bg-red-600/85 hover:bg-red-500 text-white border-2 border-red-400 font-black text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.98]"
            >
              <span>✕ DANEBEN (MISS)</span>
            </button>

            <button
              type="button"
              onClick={handleRestMiss}
              data-ui-id="TANNENBAUM.PLAY.REST_MISS_BTN"
              className="min-h-[60px] px-5 py-3 rounded-2xl bg-rose-950/90 hover:bg-rose-900 text-rose-100 border-2 border-rose-500/70 font-black text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.98]"
            >
              <span>✕✕✕ Restliche Darts Miss</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
