'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import { generateSessionId } from '@/lib/liveSession';
import {
  BingoLastActionBanner,
  BingoPlayerState,
  cloneBingoPlayerState,
  createBingoCard,
  createInitialBingoPlayerState,
  findAlmostBingoIndices,
  findWinningLine,
} from './types';
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  LayoutGrid,
  RotateCcw,
  Sparkles,
  Tv,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const CACHE_KEY = 'lions_active_bingo_session_v1';

interface BingoClientProps {
  players: Player[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

interface TurnSnapshot {
  activePlayer: 1 | 2;
  roundNumber: number;
  p1State: BingoPlayerState;
  p2State: BingoPlayerState;
  stampsInCurrentTurn: number[];
  lastAction: BingoLastActionBanner | null;
  winnerPlayer: 1 | 2 | null;
  isGameFinished: boolean;
}

type SoundKind = 'stamp' | 'alarm' | 'bingo' | 'next';

function createBingoSound(kind: SoundKind) {
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

    if (kind === 'stamp') {
      playTone(698.46, 0, 0.12, 'triangle', 0.12);
      playTone(1046.5, 0.08, 0.18, 'sine', 0.13);
    } else if (kind === 'alarm') {
      playTone(587.33, 0, 0.12, 'triangle', 0.13);
      playTone(880, 0.1, 0.14, 'triangle', 0.14);
      playTone(1174.66, 0.22, 0.22, 'sine', 0.14);
    } else if (kind === 'bingo') {
      playTone(523.25, 0, 0.14, 'triangle', 0.14);
      playTone(659.25, 0.1, 0.14, 'triangle', 0.14);
      playTone(783.99, 0.2, 0.16, 'triangle', 0.15);
      playTone(1046.5, 0.34, 0.4, 'sine', 0.16);
      playTone(1318.51, 0.48, 0.55, 'sine', 0.15);
    } else {
      playTone(392, 0, 0.11, 'sine', 0.08);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch {}
}

export default function BingoClient({
  players,
  currentUser,
}: BingoClientProps) {
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
  const [sharedCardMode, setSharedCardMode] = useState<boolean>(true);
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
  const [p1State, setP1State] = useState<BingoPlayerState>(() =>
    createInitialBingoPlayerState(createBingoCard())
  );
  const [p2State, setP2State] = useState<BingoPlayerState>(() =>
    createInitialBingoPlayerState(createBingoCard())
  );
  const [stampsInCurrentTurn, setStampsInCurrentTurn] = useState<number[]>([]);
  const [lastAction, setLastAction] = useState<BingoLastActionBanner | null>(null);
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
        localStorage.getItem('lions_active_board_bingo') ||
        localStorage.getItem('lions_active_board') ||
        '1'
      );
    }
    return '1';
  });

  const [gameSessionId, setGameSessionId] = useState<string>(() =>
    generateSessionId('bingo', activeBoard)
  );
  const liveBroadcastRef = useRef<BroadcastChannel | null>(null);

  const playSound = useCallback(
    (kind: SoundKind) => {
      if (soundEnabled) {
        createBingoSound(kind);
      }
    },
    [soundEnabled]
  );

  const handleSelectBoard = (b: string) => {
    setActiveBoard(b);
    try {
      localStorage.setItem('lions_tablet_board', b);
      localStorage.setItem('lions_active_board', b);
      localStorage.setItem('lions_active_board_bingo', b);
      window.history.replaceState(null, '', `/special/bingo?board=${b}`);
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      liveBroadcastRef.current = new BroadcastChannel(`lions_bingo_live_sync_${activeBoard}`);
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
          (cached.p1State?.stampsCount > 0 ||
            cached.p2State?.stampsCount > 0 ||
            (cached.roundNumber || 1) > 1 ||
            cached.activePlayer === 2)
        ) {
          setCachedSessionToResume(cached);
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden des Bingo-Caches:', e);
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
      p1S: BingoPlayerState,
      p2S: BingoPlayerState,
      actPlayer: 1 | 2,
      rNum: number,
      banner: BingoLastActionBanner | null,
      winPlayer: 1 | 2 | null,
      overrideSessionId?: string
    ) => {
      const winnerDisplayName = winPlayer === 1 ? p1Name : winPlayer === 2 ? p2Name : null;

      return {
        boardId: activeBoard,
        sessionId: overrideSessionId || gameSessionId,
        status: finished ? ('completed' as const) : ('playing' as const),
        gameType: 'bingo' as const,
        gameTitle: 'Weihnachts-Bingo',
        gameMode,
        p1Name: p1Name.trim() || 'Spieler 1',
        p2Name: p2Name.trim() || 'Spieler 2',
        activePlayer: actPlayer,
        currentRound: rNum,
        scoreP1: p1S.stampsCount,
        scoreP2: p2S.stampsCount,
        winner: winnerDisplayName || undefined,
        bingoData: {
          sharedCardMode,
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
    [activeBoard, gameMode, gameSessionId, p1Name, p2Name, sharedCardMode]
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
      p1S: BingoPlayerState,
      p2S: BingoPlayerState,
      actPlayer: 1 | 2,
      rNum: number,
      banner: BingoLastActionBanner | null,
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

  // Atomarer Cache
  useEffect(() => {
    if (
      isGameStarted &&
      !isGameFinished &&
      (p1State.stampsCount > 0 ||
        p2State.stampsCount > 0 ||
        roundNumber > 1 ||
        activePlayer === 2)
    ) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            isGameStarted,
            isGameFinished,
            gameMode,
            sharedCardMode,
            p1Name,
            p2Name,
            isGuestP1,
            isGuestP2,
            activePlayer,
            roundNumber,
            p1State,
            p2State,
            stampsInCurrentTurn,
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
    sharedCardMode,
    p1Name,
    p2Name,
    isGuestP1,
    isGuestP2,
    activePlayer,
    roundNumber,
    p1State,
    p2State,
    stampsInCurrentTurn,
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

    const freshId = generateSessionId('bingo', activeBoard);
    const card1 = createBingoCard();
    const card2 = sharedCardMode ? card1 : createBingoCard();
    const initP1 = createInitialBingoPlayerState(card1);
    const initP2 = createInitialBingoPlayerState(card2);

    const startBanner: BingoLastActionBanner = {
      id: Date.now(),
      tone: 'info',
      icon: '🎱',
      headline: 'BINGO-KARTEN BEREIT!',
      subline:
        gameMode === '1vs1'
          ? `${cleanP1} eröffnet gegen ${cleanP2} — 3 goldene Stempel in einer Reihe gewinnen!`
          : `${cleanP1} startet Solo-Bingo — 3 in einer Reihe zum BINGO!`,
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
    setStampsInCurrentTurn([]);
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
    setSharedCardMode(c.sharedCardMode ?? true);
    setP1Name(c.p1Name || defaultP1);
    setP2Name(c.p2Name || 'Gastspieler');
    setIsGuestP1(Boolean(c.isGuestP1));
    setIsGuestP2(Boolean(c.isGuestP2));
    setActivePlayer(c.activePlayer === 2 ? 2 : 1);
    setRoundNumber(Number(c.roundNumber || 1));
    setP1State(c.p1State || createInitialBingoPlayerState(createBingoCard()));
    setP2State(c.p2State || createInitialBingoPlayerState(createBingoCard()));
    setStampsInCurrentTurn(Array.isArray(c.stampsInCurrentTurn) ? c.stampsInCurrentTurn : []);
    setLastAction(c.lastAction ?? null);
    setWinnerPlayer(c.winnerPlayer ?? null);
    setUndoStack(Array.isArray(c.undoStack) ? c.undoStack : []);
    setGameSessionId(c.gameSessionId || generateSessionId('bingo', activeBoard));
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
    setStampsInCurrentTurn([]);
    setUndoStack([]);
    sendStandbySignal();
  };

  const pushSnapshot = () => {
    const snap: TurnSnapshot = {
      activePlayer,
      roundNumber,
      p1State: cloneBingoPlayerState(p1State),
      p2State: cloneBingoPlayerState(p2State),
      stampsInCurrentTurn: [...stampsInCurrentTurn],
      lastAction,
      winnerPlayer,
      isGameFinished,
    };
    setUndoStack((prev) => [...prev.slice(-49), snap]);
  };

  // Undo (Korrektur)
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setActivePlayer(prev.activePlayer);
    setRoundNumber(prev.roundNumber);
    setP1State(cloneBingoPlayerState(prev.p1State));
    setP2State(cloneBingoPlayerState(prev.p2State));
    setStampsInCurrentTurn([...prev.stampsInCurrentTurn]);
    setLastAction(prev.lastAction);
    setWinnerPlayer(prev.winnerPlayer);
    setIsGameFinished(prev.isGameFinished);
    setIsGameStarted(true);
  };

  // A) Tipp auf Bingo-Feld (Stempeln oder in derselben Aufnahme wieder abwählen)
  const handleCellToggle = (cellIdx: number) => {
    if (isGameFinished) return;

    const curOwn = activePlayer === 1 ? p1State : p2State;
    const targetCell = curOwn.cells[cellIdx];
    if (!targetCell) return;

    const isFreshInThisTurn = stampsInCurrentTurn.includes(cellIdx);
    // Bereits in früheren Runden gestempelte Felder sind fest fixiert
    if (targetCell.stamped && !isFreshInThisTurn) {
      return;
    }

    pushSnapshot();

    const nextP1 = cloneBingoPlayerState(p1State);
    const nextP2 = cloneBingoPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;
    let nextTurnStamps = [...stampsInCurrentTurn];

    if (isFreshInThisTurn) {
      // Stempel wieder entfernen (direkte Touch-Korrektur)
      own.cells[cellIdx].stamped = false;
      own.cells[cellIdx].stampedInRound = null;
      own.stampsCount = own.cells.filter((c) => c.stamped).length;
      nextTurnStamps = nextTurnStamps.filter((i) => i !== cellIdx);

      const banner: BingoLastActionBanner = {
        id: Date.now(),
        tone: 'info',
        icon: '↩',
        headline: 'STEMPEL ENTFERNT',
        subline: `${activeName} nimmt Stempel "${own.cells[cellIdx].label}" zurück.`,
        actorPlayer: activePlayer,
      };
      setP1State(nextP1);
      setP2State(nextP2);
      setStampsInCurrentTurn(nextTurnStamps);
      setLastAction(banner);
      return;
    }

    // Stempeln!
    own.cells[cellIdx].stamped = true;
    own.cells[cellIdx].stampedInRound = roundNumber;
    own.stampsCount = own.cells.filter((c) => c.stamped).length;
    nextTurnStamps.push(cellIdx);

    const winLineNow = findWinningLine(own.cells);
    const almostNow = findAlmostBingoIndices(own.cells);

    let banner: BingoLastActionBanner;
    if (winLineNow !== null) {
      playSound('alarm');
      banner = {
        id: Date.now(),
        tone: 'alarm',
        icon: '🎉',
        headline: '3ER-REIHE VOLL!!',
        subline: `${activeName} hat 3 Stempel in einer Reihe — drücke jetzt den BINGO!-Buzzer!`,
        actorPlayer: activePlayer,
      };
    } else if (almostNow.length > 0) {
      playSound('alarm');
      banner = {
        id: Date.now(),
        tone: 'alarm',
        icon: '🔥',
        headline: 'BINGO-ALARM!',
        subline: `${activeName} stempelt "${own.cells[cellIdx].label}" — NUR NOCH 1 FELD BIS BINGO!`,
        actorPlayer: activePlayer,
      };
    } else {
      playSound('stamp');
      banner = {
        id: Date.now(),
        tone: 'stamp',
        icon: '★',
        headline: 'GESTEMPELT!',
        subline: `${activeName} stempelt "${own.cells[cellIdx].label}" (${own.stampsCount}/9).`,
        actorPlayer: activePlayer,
      };
    }

    setP1State(nextP1);
    setP2State(nextP2);
    setStampsInCurrentTurn(nextTurnStamps);
    setLastAction(banner);
  };

  // B) Aufnahme beenden / Nächster Spieler
  const handleEndTurn = () => {
    if (isGameFinished) return;
    pushSnapshot();

    const nextP1 = cloneBingoPlayerState(p1State);
    const nextP2 = cloneBingoPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    own.roundsPlayed += 1;
    const countThisTurn = stampsInCurrentTurn.length;
    playSound('next');

    let nextActive: 1 | 2 = activePlayer;
    let nextRound = roundNumber;

    if (gameMode === '1vs1') {
      if (activePlayer === 1) {
        nextActive = 2;
      } else {
        nextActive = 1;
        nextRound = roundNumber + 1;
      }
    } else {
      nextRound = roundNumber + 1;
    }

    const nextName = nextActive === 1 ? p1Name : p2Name;
    const banner: BingoLastActionBanner =
      countThisTurn > 0
        ? {
            id: Date.now(),
            tone: 'info',
            icon: '➔',
            headline: 'NÄCHSTE AUFNAHME',
            subline:
              gameMode === '1vs1'
                ? `${activeName} holt ${countThisTurn} Stempel. Jetzt wirft ${nextName}!`
                : `Runde ${nextRound} für ${nextName}!`,
            actorPlayer: activePlayer,
          }
        : {
            id: Date.now(),
            tone: 'miss',
            icon: '✕',
            headline: 'KEIN STEMPEL',
            subline:
              gameMode === '1vs1'
                ? `${activeName} bleibt ohne Treffer. Jetzt wirft ${nextName}!`
                : `${activeName} bleibt ohne Treffer in Runde ${roundNumber}.`,
            actorPlayer: activePlayer,
          };

    setP1State(nextP1);
    setP2State(nextP2);
    setActivePlayer(nextActive);
    setRoundNumber(nextRound);
    setStampsInCurrentTurn([]);
    setLastAction(banner);
  };

  // C) BINGO! Sieg auslösen
  const handleTriggerBingo = () => {
    if (isGameFinished) return;
    const curOwn = activePlayer === 1 ? p1State : p2State;
    const winLine = findWinningLine(curOwn.cells);
    if (!winLine) return;

    pushSnapshot();

    const nextP1 = cloneBingoPlayerState(p1State);
    const nextP2 = cloneBingoPlayerState(p2State);
    const own = activePlayer === 1 ? nextP1 : nextP2;
    const activeName = activePlayer === 1 ? p1Name : p2Name;

    own.roundsPlayed += 1;
    own.hasBingo = true;
    own.winningLine = winLine;

    playSound('bingo');
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}

    const banner: BingoLastActionBanner = {
      id: Date.now(),
      tone: 'bingo',
      icon: '🎉',
      headline: 'BINGO!!',
      subline: `${activeName} holt mit 3 goldenen Stempeln in einer Reihe den Sieg!`,
      actorPlayer: activePlayer,
    };

    setP1State(nextP1);
    setP2State(nextP2);
    setStampsInCurrentTurn([]);
    setLastAction(banner);
    setWinnerPlayer(activePlayer);
    setIsGameFinished(true);
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
            data-ui-id="BINGO.SETUP.BACK_BTN"
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
            data-ui-id="BINGO.RESUME.DIALOG"
            className="rounded-3xl p-5 sm:p-6 bg-amber-950/60 border-2 border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.3)] space-y-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-amber-200">
                  Unterbrochenes Spiel gefunden!
                </h2>
                <p className="text-xs sm:text-sm text-amber-100/90 mt-1">
                  <strong>{cachedSessionToResume.p1Name}</strong> ({cachedSessionToResume.p1State?.stampsCount ?? 0}/9)
                  {cachedSessionToResume.gameMode === '1vs1' && (
                    <>
                      {' '}vs. <strong>{cachedSessionToResume.p2Name}</strong> (
                      {cachedSessionToResume.p2State?.stampsCount ?? 0}/9)
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
        <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-[#21100a]/90 via-slate-900/95 to-[#0b1812]/90 border-2 border-amber-500/40 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl">
                🎱
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Weihnachts-Bingo
                </h1>
                <p className="text-xs sm:text-sm text-amber-300 font-semibold">
                  3×3 Bingo-Matrix · 3 goldene Lions-Stempel in einer Reihe gewinnen!
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
                <span>Solo-Bingo</span>
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

          {/* Kartentyp */}
          {gameMode === '1vs1' && (
            <div className="space-y-2">
              <label className="text-xs font-mono font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>Bingo-Karten-Verteilung</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSharedCardMode(true)}
                  className={`min-h-[58px] px-4 py-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    sharedCardMode
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-lg'
                      : 'bg-slate-950/60 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="text-sm font-black">Gleiche Bingo-Karte (Fair-Duell)</div>
                  <div className="text-[11px] text-slate-400">
                    Beide Spieler erhalten exakt dieselben 9 Felder
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSharedCardMode(false)}
                  className={`min-h-[58px] px-4 py-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    !sharedCardMode
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-lg'
                      : 'bg-slate-950/60 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="text-sm font-black">Eigene Zufalls-Karten</div>
                  <div className="text-[11px] text-slate-400">
                    Jeder Spieler erhält eine individuell gemischte 3×3-Karte
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartGame}
            data-ui-id="BINGO.SETUP.START_BTN"
            className="w-full min-h-[60px] py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-amber-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>🎱 Bingo-Karten mischen &amp; Spiel starten</span>
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
  const almostIndices = findAlmostBingoIndices(ownState.cells);
  const currentWinLine = findWinningLine(ownState.cells);
  const hasBingoReady = currentWinLine !== null;

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-5 space-y-3.5 animate-fadeIn">
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

      {/* Regel-Hilfe */}
      {showHelp && (
        <div className="rounded-2xl p-4 bg-slate-900/95 border border-amber-400/40 text-xs sm:text-sm text-slate-200 space-y-1.5">
          <div className="font-black text-amber-300">🎱 Spielregeln: Weihnachts-Bingo</div>
          <p>
            1. Wirf deine 3 Darts und tippe anschließend auf alle geschafften Felder deiner 3×3 Bingo-Karte (nochmaliges
            Antippen in derselben Aufnahme entfernt einen versehentlichen Stempel).
          </p>
          <p>
            2. Sobald du <strong>3 Stempel in einer Reihe</strong> hast (waagerecht, senkrecht oder diagonal), drücke
            unten den goldenen <strong>🎉 BINGO!-Buzzer</strong>!
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
          const alm = findAlmostBingoIndices(st.cells).length;

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
                      <span className="text-amber-300 font-black">🎉 BINGO-SIEGER!</span>
                    ) : isAct ? (
                      <span className={`${isP1 ? 'text-red-300' : 'text-amber-300'} font-black`}>
                        🎯 AM WURF
                      </span>
                    ) : (
                      <span className="text-slate-400">Wartet</span>
                    )}
                    {alm > 0 && !isWin && (
                      <span className="px-1.5 py-0.5 rounded bg-red-600/80 text-white text-[10px] font-black">
                        🔥 ALARM
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className={`text-2xl sm:text-3xl font-black ${isP1 ? 'text-red-300' : 'text-amber-300'}`}>
                    {st.stampsCount}
                    <span className="text-xs text-slate-400">/9</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Event Banner */}
      {lastAction && (
        <div
          className={`rounded-2xl px-4 py-2.5 border text-center transition-all ${
            lastAction.tone === 'bingo' || lastAction.tone === 'alarm'
              ? 'bg-amber-950/80 border-amber-400 text-amber-100'
              : lastAction.tone === 'stamp'
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
        <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-950/80 via-slate-900/95 to-red-950/80 border-2 border-amber-400 text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🎉🎱🏆</div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              BINGO! {winnerPlayer === 1 ? p1Name : p2Name} gewinnt!
            </h2>
            <p className="text-xs sm:text-sm text-amber-200 mt-1">
              3 goldene Lions-Stempel in einer Reihe in Runde {roundNumber}.
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
              <span>BINGO korrigieren</span>
            </button>
            <button
              type="button"
              onClick={handleStartGame}
              className="min-h-[54px] px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm cursor-pointer"
            >
              🔄 Neue Karten &amp; Revanche
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

      {/* Aktives Bingo-Touch-Feld */}
      {!isGameFinished && (
        <>
          <div className="rounded-3xl p-4 sm:p-6 bg-gradient-to-b from-[#21100a]/85 via-slate-950/95 to-slate-950 border-2 border-amber-500/35 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-mono">
              <span className="font-black text-amber-300 uppercase tracking-wider">
                🎯 {ownName} stempelt ({ownState.stampsCount}/9):
              </span>
              {stampsInCurrentTurn.length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-bold">
                  +{stampsInCurrentTurn.length} diese Aufnahme
                </span>
              )}
            </div>

            {/* 3x3 Bingo Touch-Matrix */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {ownState.cells.map((cell, idx) => {
                const isFresh = stampsInCurrentTurn.includes(idx);
                const isLocked = cell.stamped && !isFresh;
                const isAlmost = !cell.stamped && almostIndices.includes(idx);
                const isWinCell = currentWinLine?.includes(idx) ?? false;

                let cls = 'bg-slate-900/90 hover:bg-slate-800 border-white/20 text-white cursor-pointer';
                if (isWinCell) {
                  cls =
                    'bg-gradient-to-br from-amber-500/45 to-yellow-500/30 border-amber-300 text-white shadow-[0_0_24px_rgba(251,191,36,0.5)] cursor-pointer';
                } else if (isFresh) {
                  cls =
                    'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-400 text-white shadow-[0_0_18px_rgba(16,185,129,0.35)] cursor-pointer';
                } else if (isLocked) {
                  cls =
                    activePlayer === 1
                      ? 'bg-red-600/30 border-red-400/80 text-white/95 cursor-default'
                      : 'bg-amber-500/30 border-amber-400/80 text-white/95 cursor-default';
                } else if (isAlmost) {
                  cls =
                    'bg-slate-900/95 hover:bg-slate-800 border-amber-400 text-white shadow-[0_0_18px_rgba(251,191,36,0.3)] animate-pulse cursor-pointer';
                }

                return (
                  <button
                    key={`${cell.id}-${idx}`}
                    type="button"
                    onClick={() => handleCellToggle(idx)}
                    data-ui-id={`BINGO.PLAY.CELL_${idx}`}
                    className={`min-h-[86px] sm:min-h-[98px] rounded-2xl border-2 p-2 sm:p-3 flex flex-col items-center justify-between text-center active:scale-95 transition-all ${cls}`}
                  >
                    <div className="flex items-center justify-between w-full text-[10px] font-mono font-black">
                      <span className="text-base leading-none">{cell.icon}</span>
                      {cell.stamped ? (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] ${
                            isFresh
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-amber-300 text-slate-950'
                          }`}
                        >
                          {isFresh ? '★ NEU (Antippen=Undo)' : '★ FEST'}
                        </span>
                      ) : isAlmost ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px]">
                          🔥 FEHLT!
                        </span>
                      ) : (
                        <span className="text-slate-500">○</span>
                      )}
                    </div>

                    <div className="text-xs sm:text-base font-black leading-tight my-auto">
                      {cell.label}
                    </div>

                    <div className="text-[10px] font-mono text-slate-300 truncate max-w-full">
                      {cell.shortHint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Untere Aktionsleiste: BINGO-Buzzer ODER Nächster Spieler + Korrektur */}
          {hasBingoReady ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <button
                type="button"
                onClick={handleTriggerBingo}
                data-ui-id="BINGO.PLAY.BINGO_BUZZER_BTN"
                className="sm:col-span-9 min-h-[76px] px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-slate-950 border-2 border-yellow-100 font-black text-xl flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(251,191,36,0.65)] animate-pulse cursor-pointer active:scale-[0.98]"
              >
                <span>🎉 BINGO! SIEG AUSLÖSEN!</span>
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="sm:col-span-3 min-h-[76px] px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white border border-white/15 font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Korrektur</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <button
                type="button"
                onClick={handleEndTurn}
                data-ui-id="BINGO.PLAY.END_TURN_BTN"
                className="sm:col-span-9 min-h-[64px] px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 border-2 border-emerald-200 font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-[0.98]"
              >
                <span>
                  {gameMode === '1vs1'
                    ? '➔ Aufnahme beenden · Nächster Spieler'
                    : '➔ Nächste Aufnahme'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="sm:col-span-3 min-h-[64px] px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white border border-white/15 font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Korrektur</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
