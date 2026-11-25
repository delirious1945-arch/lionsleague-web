'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import {
  DARTS_99_TARGETS,
  Darts99Target,
  TOTAL_DARTS_99,
  TOTAL_ROUNDS_99,
  MAX_POINTS_99,
  DartHitValue,
  Darts99RoundDetail,
  Darts99HistoryItem,
  Darts99SessionSavePayload,
  Darts99LivePlayerStats,
  decomposeRoundPointsToDarts,
} from './types';
import { saveDarts99SessionAction } from './actions';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  User,
  Users,
  Target,
  HelpCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { generateSessionId } from '@/lib/liveSession';
import { isPlayerSlug } from '@/lib/playerSlugs';
import BoardSelectionPicker from '@/components/BoardSelectionPicker';

const CACHE_KEY = 'lions_active_99_darts_session_v1';

interface Darts99ClientProps {
  players: Player[];
  initialHistory: Darts99HistoryItem[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

interface PlayerDarts99State {
  completedRounds: Darts99RoundDetail[];
  currentTurnDarts: DartHitValue[];
  finished: boolean;
}

interface TurnSnapshot {
  activePlayer: 1 | 2;
  p1State: PlayerDarts99State;
  p2State: PlayerDarts99State;
}

const createInitialPlayerState = (): PlayerDarts99State => ({
  completedRounds: [],
  currentTurnDarts: [],
  finished: false,
});

function summarizePlayer(st: PlayerDarts99State): Darts99LivePlayerStats {
  let totalPoints = 0;
  let singles = 0;
  let doubles = 0;
  let triples = 0;
  let misses = 0;
  let dartsThrown = 0;

  const countDart = (val: DartHitValue) => {
    dartsThrown += 1;
    totalPoints += val;
    if (val === 3) triples += 1;
    else if (val === 2) doubles += 1;
    else if (val === 1) singles += 1;
    else misses += 1;
  };

  for (const r of st.completedRounds) {
    for (const d of r.darts) {
      countDart(d);
    }
  }
  for (const d of st.currentTurnDarts) {
    countDart(d);
  }

  const totalHits = singles + doubles + triples;
  const hitQuote = dartsThrown > 0 ? totalHits / dartsThrown : 0;
  const pointsPerDart = dartsThrown > 0 ? totalPoints / dartsThrown : 0;
  const currentRound = st.finished
    ? TOTAL_ROUNDS_99
    : Math.min(TOTAL_ROUNDS_99, st.completedRounds.length + 1);

  return {
    totalPoints,
    dartsThrown,
    currentRound,
    currentTurnDarts: st.currentTurnDarts,
    singles,
    doubles,
    triples,
    misses,
    hitQuote,
    pointsPerDart,
    finished: st.finished || st.completedRounds.length >= TOTAL_ROUNDS_99,
  };
}

function renderDartBadge(val: DartHitValue, targetNum: number, keyIdx: number) {
  if (val === 3) {
    return (
      <span
        key={keyIdx}
        className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 font-mono font-black text-xs sm:text-sm"
      >
        T{targetNum} (+3)
      </span>
    );
  }
  if (val === 2) {
    return (
      <span
        key={keyIdx}
        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-mono font-black text-xs sm:text-sm"
      >
        D{targetNum} (+2)
      </span>
    );
  }
  if (val === 1) {
    return (
      <span
        key={keyIdx}
        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-mono font-black text-xs sm:text-sm"
      >
        S{targetNum} (+1)
      </span>
    );
  }
  return (
    <span
      key={keyIdx}
      className="px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-300 font-mono font-black text-xs sm:text-sm"
    >
      MISS (0)
    </span>
  );
}

export default function Darts99Client({
  players,
  initialHistory,
  currentUser,
}: Darts99ClientProps) {
  const validPlayers = players.filter((p) => !p.name.startsWith('Board '));
  const isBoardUser = Boolean(currentUser?.name && currentUser.name.toLowerCase().startsWith('board'));
  const userPlayerMatch = validPlayers.find(
    (p) => p.name.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
  );
  const defaultP1 =
    !isBoardUser && userPlayerMatch
      ? userPlayerMatch.name
      : validPlayers[0]?.name || 'Sebastian Kirste';

  // Setup State
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [targetNumber, setTargetNumber] = useState<Darts99Target>(20);
  const [gameMode, setGameMode] = useState<'solo' | '1vs1'>('solo');
  const [inputMode, setInputMode] = useState<'dart' | 'round'>('dart');
  const [p1Name, setP1Name] = useState<string>(defaultP1);
  const [p2Name, setP2Name] = useState<string>(validPlayers[1]?.name || 'Dirk Ostermann');

  // Crash- & Wisch-Schutz
  const [cachedSessionToResume, setCachedSessionToResume] = useState<any | null>(null);
  const [restoredFromCache, setRestoredFromCache] = useState<boolean>(false);

  // Arretierung von Spieler 1 im Solo-Modus
  useEffect(() => {
    if (gameMode === 'solo' && !isBoardUser && userPlayerMatch) {
      setP1Name(userPlayerMatch.name);
    }
  }, [gameMode, isBoardUser, userPlayerMatch]);

  const [soundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Spiel-State
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [p1State, setP1State] = useState<PlayerDarts99State>(createInitialPlayerState);
  const [p2State, setP2State] = useState<PlayerDarts99State>(createInitialPlayerState);
  const [undoStack, setUndoStack] = useState<TurnSnapshot[]>([]);

  // Speicher- & Historien-State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [history, setHistory] = useState<Darts99HistoryItem[]>(initialHistory);

  // Board-Zuweisung
  const [activeBoard, setActiveBoard] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBoard = urlParams.get('board')?.trim().toLowerCase();
      if (urlBoard && (['1', '2', '3', '4', '5'].includes(urlBoard) || isPlayerSlug(urlBoard))) {
        return urlBoard;
      }
      return (
        localStorage.getItem('lions_tablet_board') ||
        localStorage.getItem('lions_active_board_99_darts') ||
        localStorage.getItem('lions_active_board') ||
        '1'
      ).trim().toLowerCase();
    }
    return '1';
  });

  const [gameSessionId, setGameSessionId] = useState<string>(() =>
    generateSessionId('darts_99', activeBoard)
  );
  const liveBroadcastRef = useRef<BroadcastChannel | null>(null);

  const handleSelectBoard = (b: string) => {
    setActiveBoard(b);
    try {
      localStorage.setItem('lions_tablet_board', b);
      localStorage.setItem('lions_active_board', b);
      localStorage.setItem('lions_active_board_pdc', b);
      localStorage.setItem('lions_active_board_fussball', b);
      localStorage.setItem('lions_active_board_stellen_checken', b);
      localStorage.setItem('lions_active_board_scoring_leiter', b);
      localStorage.setItem('lions_active_board_99_darts', b);
      window.history.replaceState(null, '', `/training/99-darts?board=${b}`);
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      liveBroadcastRef.current = new BroadcastChannel(`lions_99_darts_live_sync_${activeBoard}`);
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
          (cached.p1State?.completedRounds?.length > 0 ||
            cached.p1State?.currentTurnDarts?.length > 0 ||
            cached.p2State?.completedRounds?.length > 0 ||
            cached.p2State?.currentTurnDarts?.length > 0)
        ) {
          setCachedSessionToResume(cached);
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden des 99 Darts Caches:', e);
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

  // Standby beim Verlassen/Unmount
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
      p1S: PlayerDarts99State,
      p2S: PlayerDarts99State,
      actPlayer: 1 | 2,
      overrideSessionId?: string,
      overrideTarget?: Darts99Target
    ) => {
      const sum1 = summarizePlayer(p1S);
      const sum2 = summarizePlayer(p2S);
      const activeSum = actPlayer === 1 ? sum1 : sum2;
      const tNum = overrideTarget ?? targetNumber;

      return {
        boardId: activeBoard,
        sessionId: overrideSessionId || gameSessionId,
        status: finished ? 'completed' : 'playing',
        gameType: 'darts_99' as const,
        gameMode,
        p1Name,
        p2Name,
        activePlayer: actPlayer,
        currentNumber: tNum,
        currentTarget: String(tNum),
        currentVisit: activeSum.currentRound,
        totalVisits: TOTAL_ROUNDS_99,
        scoreP1: sum1.totalPoints,
        scoreP2: sum2.totalPoints,
        darts99Data: {
          targetNumber: tNum,
          totalDarts: TOTAL_DARTS_99,
          totalRounds: TOTAL_ROUNDS_99,
          maxPoints: MAX_POINTS_99,
          p1: sum1,
          p2: sum2,
        },
        updatedAt: Date.now(),
      };
    },
    [activeBoard, gameSessionId, gameMode, p1Name, p2Name, targetNumber]
  );

  // 4s Heartbeat während aktiven Spiels (sendet vollständigen Snapshot)
  useEffect(() => {
    if (!isGameStarted || isGameFinished) return;
    const interval = setInterval(() => {
      const payload = buildLivePayload(false, p1State, p2State, activePlayer);
      fetch('/api/live/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [isGameStarted, isGameFinished, buildLivePayload, p1State, p2State, activePlayer]);

  const broadcastLiveState = (
    started: boolean,
    finished: boolean,
    p1S: PlayerDarts99State,
    p2S: PlayerDarts99State,
    actPlayer: 1 | 2,
    overrideSessionId?: string,
    overrideTarget?: Darts99Target
  ) => {
    if (!started && !finished) return;
    const payload = buildLivePayload(
      finished,
      p1S,
      p2S,
      actPlayer,
      overrideSessionId,
      overrideTarget
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
  };

  useEffect(() => {
    if (isGameStarted || isGameFinished) {
      broadcastLiveState(isGameStarted, isGameFinished, p1State, p2State, activePlayer);
    }
  }, [
    isGameStarted,
    isGameFinished,
    activeBoard,
    gameMode,
    targetNumber,
    p1Name,
    p2Name,
    activePlayer,
    p1State,
    p2State,
  ]);

  // Cache schreiben
  useEffect(() => {
    if (
      isGameStarted &&
      !isGameFinished &&
      (p1State.completedRounds.length > 0 ||
        p1State.currentTurnDarts.length > 0 ||
        p2State.completedRounds.length > 0 ||
        p2State.currentTurnDarts.length > 0)
    ) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            isGameStarted,
            isGameFinished,
            targetNumber,
            gameMode,
            inputMode,
            p1Name,
            p2Name,
            activePlayer,
            p1State,
            p2State,
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
    targetNumber,
    gameMode,
    inputMode,
    p1Name,
    p2Name,
    activePlayer,
    p1State,
    p2State,
    undoStack,
    gameSessionId,
    activeBoard,
  ]);

  const handleResumeCachedSession = () => {
    if (!cachedSessionToResume) return;
    const c = cachedSessionToResume;
    if (c.targetNumber && (DARTS_99_TARGETS as readonly number[]).includes(Number(c.targetNumber))) {
      setTargetNumber(Number(c.targetNumber) as Darts99Target);
    }
    if (c.gameMode) setGameMode(c.gameMode);
    if (c.inputMode) setInputMode(c.inputMode);
    if (c.p1Name) setP1Name(c.p1Name);
    if (c.p2Name) setP2Name(c.p2Name);
    if (c.activePlayer) setActivePlayer(c.activePlayer);
    if (c.p1State) setP1State(c.p1State);
    if (c.p2State) setP2State(c.p2State);
    if (Array.isArray(c.undoStack)) setUndoStack(c.undoStack);
    if (c.gameSessionId) setGameSessionId(c.gameSessionId);
    if (c.activeBoard && ['1', '2', '3', '4', '5'].includes(c.activeBoard)) {
      setActiveBoard(c.activeBoard);
    }
    setIsGameStarted(true);
    setIsGameFinished(false);
    setRestoredFromCache(true);
    setCachedSessionToResume(null);
    broadcastLiveState(
      true,
      false,
      c.p1State || p1State,
      c.p2State || p2State,
      c.activePlayer || activePlayer,
      c.gameSessionId || gameSessionId,
      c.targetNumber || targetNumber
    );
  };

  const handleDiscardCachedSession = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setCachedSessionToResume(null);
    setRestoredFromCache(false);
    setP1State(createInitialPlayerState());
    setP2State(createInitialPlayerState());
    setUndoStack([]);
    setActivePlayer(1);
    setIsGameStarted(false);
    setIsGameFinished(false);
  };

  // Audio Feedback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playSound = (type: 'hit' | 'triple' | 'miss' | 'finish' | 'start') => {
    if (!soundEnabled) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      if (type === 'hit' || type === 'triple') {
        const freqs = type === 'triple' ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.05);
          gain.gain.setValueAtTime(0.16, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.24);
        });
      } else if (type === 'miss') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(185, now);
        osc.frequency.linearRampToValueAtTime(125, now + 0.14);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'finish') {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.08);
          gain.gain.setValueAtTime(0.2, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.42);
        });
      } else if (type === 'start') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {}
  };

  const startGame = () => {
    if (gameMode === '1vs1' && p1Name === p2Name) {
      alert('Bitte wähle zwei unterschiedliche Spieler für das 1 vs. 1 Duell aus.');
      return;
    }
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setRestoredFromCache(false);
    setCachedSessionToResume(null);

    const initP1 = createInitialPlayerState();
    const initP2 = createInitialPlayerState();
    setP1State(initP1);
    setP2State(initP2);
    setActivePlayer(1);
    setUndoStack([]);
    setIsSaved(false);
    setSaveError(null);
    setIsGameFinished(false);
    setIsGameStarted(true);

    const nextSessionId = generateSessionId('darts_99', activeBoard);
    setGameSessionId(nextSessionId);
    playSound('start');
    broadcastLiveState(true, false, initP1, initP2, 1, nextSessionId, targetNumber);
  };

  const determine1vs1Winner = (s1: PlayerDarts99State, s2: PlayerDarts99State): 1 | 2 | 0 => {
    const sum1 = summarizePlayer(s1);
    const sum2 = summarizePlayer(s2);
    if (sum1.totalPoints !== sum2.totalPoints) {
      return sum1.totalPoints > sum2.totalPoints ? 1 : 2;
    }
    if (sum1.triples !== sum2.triples) {
      return sum1.triples > sum2.triples ? 1 : 2;
    }
    const hits1 = sum1.singles + sum1.doubles + sum1.triples;
    const hits2 = sum2.singles + sum2.doubles + sum2.triples;
    if (hits1 !== hits2) {
      return hits1 > hits2 ? 1 : 2;
    }
    return 0;
  };

  const triggerAutoSave = async (finalP1: PlayerDarts99State, finalP2: PlayerDarts99State) => {
    setIsSaving(true);
    setSaveError(null);
    const sessionId = `d99_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const sum1 = summarizePlayer(finalP1);
    const hits1 = sum1.singles + sum1.doubles + sum1.triples;
    const p1Obj = validPlayers.find((p) => p.name === p1Name);
    const payloads: Darts99SessionSavePayload[] = [];

    if (gameMode === 'solo') {
      payloads.push({
        session_id: sessionId,
        player_id: p1Obj?.id ?? null,
        player_name: p1Name,
        opponent_name: null,
        game_mode: 'solo',
        target_number: targetNumber,
        total_points: sum1.totalPoints,
        total_darts: sum1.dartsThrown,
        total_hits: hits1,
        singles_count: sum1.singles,
        doubles_count: sum1.doubles,
        triples_count: sum1.triples,
        misses_count: sum1.misses,
        hit_quote: Number(sum1.hitQuote.toFixed(4)),
        points_per_dart: Number(sum1.pointsPerDart.toFixed(3)),
        is_winner: 1,
        round_details: finalP1.completedRounds,
        training_date: todayStr,
      });
    } else {
      const sum2 = summarizePlayer(finalP2);
      const hits2 = sum2.singles + sum2.doubles + sum2.triples;
      const p2Obj = validPlayers.find((p) => p.name === p2Name);
      const win = determine1vs1Winner(finalP1, finalP2);

      payloads.push({
        session_id: sessionId,
        player_id: p1Obj?.id ?? null,
        player_name: p1Name,
        opponent_name: p2Name,
        game_mode: '1vs1',
        target_number: targetNumber,
        total_points: sum1.totalPoints,
        total_darts: sum1.dartsThrown,
        total_hits: hits1,
        singles_count: sum1.singles,
        doubles_count: sum1.doubles,
        triples_count: sum1.triples,
        misses_count: sum1.misses,
        hit_quote: Number(sum1.hitQuote.toFixed(4)),
        points_per_dart: Number(sum1.pointsPerDart.toFixed(3)),
        is_winner: win === 1 ? 1 : 0,
        round_details: finalP1.completedRounds,
        training_date: todayStr,
      });

      payloads.push({
        session_id: sessionId,
        player_id: p2Obj?.id ?? null,
        player_name: p2Name,
        opponent_name: p1Name,
        game_mode: '1vs1',
        target_number: targetNumber,
        total_points: sum2.totalPoints,
        total_darts: sum2.dartsThrown,
        total_hits: hits2,
        singles_count: sum2.singles,
        doubles_count: sum2.doubles,
        triples_count: sum2.triples,
        misses_count: sum2.misses,
        hit_quote: Number(sum2.hitQuote.toFixed(4)),
        points_per_dart: Number(sum2.pointsPerDart.toFixed(3)),
        is_winner: win === 2 ? 1 : 0,
        round_details: finalP2.completedRounds,
        training_date: todayStr,
      });
    }

    const res = await saveDarts99SessionAction(payloads);
    setIsSaving(false);

    if (res.success) {
      setIsSaved(true);
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {}
      setRestoredFromCache(false);
      const nowIso = new Date().toISOString();
      const newHist: Darts99HistoryItem[] = payloads.map((p, i) => ({
        id: Date.now() + i,
        session_id: p.session_id,
        player_name: p.player_name,
        opponent_name: p.opponent_name ?? null,
        game_mode: p.game_mode,
        target_number: p.target_number,
        total_points: p.total_points,
        total_darts: p.total_darts,
        total_hits: p.total_hits,
        singles_count: p.singles_count,
        doubles_count: p.doubles_count,
        triples_count: p.triples_count,
        misses_count: p.misses_count,
        hit_quote: p.hit_quote,
        points_per_dart: p.points_per_dart,
        is_winner: p.is_winner,
        round_details: p.round_details,
        training_date: p.training_date,
        created_at: nowIso,
      }));
      setHistory((prev) => [...newHist, ...prev.slice(0, 28)]);
    } else {
      setSaveError(res.error || 'Fehler beim Speichern');
    }
  };

  const finalizeTurnProgression = (
    nextP1: PlayerDarts99State,
    nextP2: PlayerDarts99State,
    roundCompleted: boolean,
    sound: 'hit' | 'triple' | 'miss'
  ) => {
    if (gameMode === 'solo') {
      if (nextP1.finished) {
        setIsGameFinished(true);
        playSound('finish');
        triggerAutoSave(nextP1, nextP2);
        broadcastLiveState(true, true, nextP1, nextP2, 1);
      } else {
        playSound(sound);
        broadcastLiveState(true, false, nextP1, nextP2, 1);
      }
      return;
    }

    const p1Done = nextP1.finished;
    const p2Done = nextP2.finished;

    if (p1Done && p2Done) {
      setIsGameFinished(true);
      playSound('finish');
      triggerAutoSave(nextP1, nextP2);
      broadcastLiveState(true, true, nextP1, nextP2, activePlayer);
      return;
    }

    playSound(sound);
    let nextActive: 1 | 2 = activePlayer;
    if (roundCompleted) {
      if (activePlayer === 1 && !p2Done) nextActive = 2;
      else if (activePlayer === 2 && !p1Done) nextActive = 1;
    }

    setActivePlayer(nextActive);
    broadcastLiveState(true, false, nextP1, nextP2, nextActive);
  };

  const handleDartThrow = (val: DartHitValue) => {
    if (isGameFinished) return;
    const cur = activePlayer === 1 ? p1State : p2State;
    if (cur.finished) return;

    setUndoStack((prev) => [
      ...prev,
      {
        activePlayer,
        p1State: JSON.parse(JSON.stringify(p1State)),
        p2State: JSON.parse(JSON.stringify(p2State)),
      },
    ]);

    const nextTurnDarts = [...cur.currentTurnDarts, val];
    let nextPlayerState: PlayerDarts99State;
    let roundCompleted = false;

    if (nextTurnDarts.length >= 3) {
      roundCompleted = true;
      const pts = nextTurnDarts.reduce<number>((sum, d) => sum + d, 0);
      const nextRounds: Darts99RoundDetail[] = [
        ...cur.completedRounds,
        {
          round: cur.completedRounds.length + 1,
          darts: nextTurnDarts,
          points: pts,
        },
      ];
      nextPlayerState = {
        completedRounds: nextRounds,
        currentTurnDarts: [],
        finished: nextRounds.length >= TOTAL_ROUNDS_99,
      };
    } else {
      nextPlayerState = {
        ...cur,
        currentTurnDarts: nextTurnDarts,
      };
    }

    const nextP1 = activePlayer === 1 ? nextPlayerState : p1State;
    const nextP2 = activePlayer === 2 ? nextPlayerState : p2State;
    setP1State(nextP1);
    setP2State(nextP2);

    const sound: 'hit' | 'triple' | 'miss' =
      val === 3 ? 'triple' : val > 0 ? 'hit' : 'miss';
    finalizeTurnProgression(nextP1, nextP2, roundCompleted, sound);
  };

  const handleRoundPoints = (pts: number) => {
    if (isGameFinished) return;
    const cur = activePlayer === 1 ? p1State : p2State;
    if (cur.finished || cur.currentTurnDarts.length > 0) return;

    setUndoStack((prev) => [
      ...prev,
      {
        activePlayer,
        p1State: JSON.parse(JSON.stringify(p1State)),
        p2State: JSON.parse(JSON.stringify(p2State)),
      },
    ]);

    const darts = decomposeRoundPointsToDarts(pts);
    const nextRounds: Darts99RoundDetail[] = [
      ...cur.completedRounds,
      {
        round: cur.completedRounds.length + 1,
        darts,
        points: pts,
      },
    ];
    const nextPlayerState: PlayerDarts99State = {
      completedRounds: nextRounds,
      currentTurnDarts: [],
      finished: nextRounds.length >= TOTAL_ROUNDS_99,
    };

    const nextP1 = activePlayer === 1 ? nextPlayerState : p1State;
    const nextP2 = activePlayer === 2 ? nextPlayerState : p2State;
    setP1State(nextP1);
    setP2State(nextP2);

    const sound: 'hit' | 'triple' | 'miss' =
      pts >= 6 ? 'triple' : pts > 0 ? 'hit' : 'miss';
    finalizeTurnProgression(nextP1, nextP2, true, sound);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isGameFinished) return;
    const last = undoStack[undoStack.length - 1];
    setActivePlayer(last.activePlayer);
    setP1State(last.p1State);
    setP2State(last.p2State);
    const restoredCur = last.activePlayer === 1 ? last.p1State : last.p2State;
    if (restoredCur.currentTurnDarts.length > 0) {
      setInputMode('dart');
    }
    setUndoStack((prev) => prev.slice(0, -1));
    broadcastLiveState(true, false, last.p1State, last.p2State, last.activePlayer);
  };

  const curState = activePlayer === 1 ? p1State : p2State;
  const curSummary = summarizePlayer(curState);
  const p1Summary = summarizePlayer(p1State);
  const p2Summary = summarizePlayer(p2State);
  const currentTurnSum = curState.currentTurnDarts.reduce<number>((s, d) => s + d, 0);
  const maxRemainingPoints =
    curSummary.totalPoints + (TOTAL_DARTS_99 - curSummary.dartsThrown) * 3;
  const roundModeDisabled = curState.currentTurnDarts.length > 0;

  return (
    <div className="w-full max-w-5xl overflow-x-hidden mx-auto px-2 sm:px-6 space-y-6">
      {/* Top Navigation */}
      <div
        data-ui-id="DARTS_99.NAV.BAR"
        className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/training?board=${activeBoard}`}
            data-ui-id="DARTS_99.NAV.BACK_BTN"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors"
            title="Zurück zur Trainingsübersicht"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                99 Darts Challenge (20 · 19 · 18)
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              33 Aufnahmen à 3 Darts • Single = 1 Pkt · Double = 2 Pkt · Triple = 3 Pkt • Max. 297 Punkte
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Regeln</span>
        </button>
      </div>

      {/* Spielregeln Einklapp-Box */}
      {showHelp && (
        <div className="bg-slate-900/95 border-2 border-cyan-500/40 rounded-2xl p-5 space-y-3 text-xs sm:text-sm text-slate-200 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Spielregeln – 99 Darts Challenge</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              Schließen ✕
            </button>
          </div>
          <ul className="space-y-1.5 list-disc list-inside text-slate-300">
            <li>
              <strong>Zielzahl wählen:</strong> Vor Spielstart wird fest auf die{' '}
              <span className="font-mono font-bold text-white">20</span>,{' '}
              <span className="font-mono font-bold text-white">19</span> oder{' '}
              <span className="font-mono font-bold text-white">18</span> gespielt.
            </li>
            <li>
              <strong>99 Darts (33 Aufnahmen):</strong> Es werden genau 33 reguläre Aufnahmen à 3 Darts (= 99 Darts) auf die gewählte Zahl geworfen.
            </li>
            <li>
              <strong>Punktewertung:</strong>{' '}
              <span className="text-emerald-300 font-bold">Single = 1 Punkt</span>,{' '}
              <span className="text-cyan-300 font-bold">Double = 2 Punkte</span>,{' '}
              <span className="text-amber-300 font-bold">Triple = 3 Punkte</span>,{' '}
              <span className="text-red-300 font-bold">Miss / andere Zahl = 0 Punkte</span>. Maximalpunktzahl: <strong>297 Punkte</strong>.
            </li>
            <li>
              <strong>Eingabe am Tablet:</strong> Du kannst wahlweise jeden Dart einzeln antippen (Dart-by-Dart) oder komplette Aufnahmen von 0 bis 9 Punkten erfassen.
            </li>
          </ul>
        </div>
      )}

      {/* =====================================================================
          1. SETUP SCREEN (VOR SPIELSTART)
      ===================================================================== */}
      {!isGameStarted && (
        <div data-ui-id="DARTS_99.SETUP.CONTAINER" className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            {/* Crash- & Wisch-Schutz */}
            {cachedSessionToResume && (() => {
              const cP1Sum = cachedSessionToResume.p1State
                ? summarizePlayer(cachedSessionToResume.p1State)
                : null;
              return (
                <div className="p-5 rounded-3xl bg-amber-500/15 border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.3)] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-2xl shrink-0">
                      ⚠️
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 font-mono">
                        Unterbrochenes Spiel gefunden!
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        {cachedSessionToResume.p1Name}
                        {cachedSessionToResume.gameMode === '1vs1' && cachedSessionToResume.p2Name
                          ? ` vs. ${cachedSessionToResume.p2Name}`
                          : ''}{' '}
                        · Ziel {cachedSessionToResume.targetNumber || 20} (
                        {cP1Sum ? `${cP1Sum.totalPoints} Pkt · ${cP1Sum.dartsThrown}/99 Darts` : 'Laufend'})
                      </h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleResumeCachedSession}
                      className="min-h-[52px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs font-mono tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                    >
                      <span>▶ Spiel jetzt fortsetzen</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardCachedSession}
                      className="min-h-[52px] py-3.5 px-5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-rose-300 hover:text-white border border-rose-500/40 font-black text-xs font-mono uppercase flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>✕ Spiel verwerfen &amp; Neu beginnen</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 1. Zielzahl wählen (20, 19, 18) */}
            <div className="space-y-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                1. Zielzahl wählen (99 Darts / 33 Aufnahmen)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {DARTS_99_TARGETS.map((num) => {
                  const isSel = targetNumber === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTargetNumber(num)}
                      className={`min-h-[82px] p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isSel
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.35)] scale-[1.02]'
                          : 'bg-slate-950/70 border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span
                        className={`text-3xl sm:text-4xl font-black font-mono leading-none ${
                          isSel ? 'text-cyan-300' : 'text-slate-200'
                        }`}
                      >
                        {num}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 mt-1.5">
                        S = 1 Pkt · D = 2 Pkt · T = 3 Pkt
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Spielmodus wählen */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                2. Spielmodus wählen
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGameMode('solo')}
                  className={`min-h-[68px] p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                    gameMode === 'solo'
                      ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-950/70 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm sm:text-base">Solo-Training</div>
                    <div className="text-[11px] text-slate-400">99 Darts / 33 Aufnahmen</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('1vs1')}
                  className={`min-h-[68px] p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                    gameMode === '1vs1'
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/70 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm sm:text-base">1 vs. 1 Duell</div>
                    <div className="text-[11px] text-slate-400">Abwechselnd pro Aufnahme</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Spielerauswahl */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`space-y-2 ${gameMode === 'solo' ? 'sm:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                    {gameMode === 'solo' ? '3. Spieler' : '3. Spieler 1 (beginnt)'}
                  </label>
                  {gameMode === 'solo' && !isBoardUser && userPlayerMatch && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      ✓ Angemeldet
                    </span>
                  )}
                </div>
                {gameMode === 'solo' && !isBoardUser && userPlayerMatch ? (
                  <div className="w-full min-h-[56px] rounded-2xl bg-slate-950 border-2 border-emerald-500/50 px-4 py-3.5 text-lg sm:text-xl font-black text-white flex items-center justify-between shadow-inner">
                    <span className="flex items-center gap-2.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{userPlayerMatch.name}</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded shrink-0 ml-2">
                      Fest fixiert
                    </span>
                  </div>
                ) : (
                  <select
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                    className="w-full min-h-[56px] rounded-2xl bg-slate-950 border-2 border-white/15 px-4 py-3.5 text-lg sm:text-xl font-black text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    {validPlayers.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} {p.team ? `(${p.team})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {gameMode === '1vs1' && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                    Spieler 2 (Herausforderer)
                  </label>
                  <select
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    className="w-full min-h-[56px] rounded-2xl bg-slate-950 border-2 border-white/15 px-4 py-3.5 text-lg sm:text-xl font-black text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {validPlayers.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} {p.team ? `(${p.team})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 4. Oche / Board-Auswahl */}
            <BoardSelectionPicker
              activeBoard={activeBoard}
              onSelectBoard={handleSelectBoard}
              currentUserName={p1Name}
            />

            {/* Start Button */}
            <button
              type="button"
              onClick={startGame}
              className="w-full min-h-[64px] py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-lg sm:text-xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Target className="w-6 h-6" />
              <span>🎯 Spiel starten (99 Darts auf {targetNumber})</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. ACTIVE GAME SCREEN (TABLET OCHE-BEDIENUNG)
      ===================================================================== */}
      {restoredFromCache && isGameStarted && !isGameFinished && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span className="font-bold">Unterbrochenes Spiel aus dem lokalen Cache wiederhergestellt.</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-amber-400">
            Lokal gesichert
          </span>
        </div>
      )}

      {isGameStarted && !isGameFinished && (
        <div className="space-y-5">
          {/* Status-Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-black text-xs sm:text-sm">
                Ziel: {targetNumber}
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs sm:text-sm">
                Aufnahme {curSummary.currentRound} / {TOTAL_ROUNDS_99}
              </span>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs sm:text-sm">
                Dart {curSummary.dartsThrown} / {TOTAL_DARTS_99}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="min-h-[52px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-white/10 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Korrektur</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Spiel wirklich abbrechen?')) {
                    try {
                      localStorage.removeItem(CACHE_KEY);
                    } catch {}
                    setIsGameStarted(false);
                    sendStandbySignal();
                  }
                }}
                className="min-h-[52px] px-4 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>

          {/* Spieler-Scoreboard */}
          <div className={`grid gap-4 ${gameMode === '1vs1' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {[
              { num: 1 as const, name: p1Name, sum: p1Summary },
              ...(gameMode === '1vs1' ? [{ num: 2 as const, name: p2Name, sum: p2Summary }] : []),
            ].map((pl) => {
              const isAct = activePlayer === pl.num;
              const pct = Math.min(100, Math.round((pl.sum.dartsThrown / TOTAL_DARTS_99) * 100));
              const quotePct = (pl.sum.hitQuote * 100).toFixed(1);

              return (
                <div
                  key={pl.num}
                  className={`rounded-2xl p-4 sm:p-5 border-2 transition-all space-y-3 ${
                    isAct
                      ? 'bg-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/15'
                      : 'bg-slate-900/50 border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black text-white truncate">
                          {pl.name}
                        </span>
                        {isAct && !pl.sum.finished && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black uppercase">
                            Am Board 🎯
                          </span>
                        )}
                        {pl.sum.finished && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-200 text-[10px] font-black uppercase">
                            ✓ 99 Darts fertig
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Darts: <strong className="text-white">{pl.sum.dartsThrown}/99</strong> · Quote:{' '}
                        <strong className="text-emerald-300">{quotePct}%</strong> · Ø{' '}
                        <strong className="text-cyan-300">{pl.sum.pointsPerDart.toFixed(2)}</strong> P/D
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono leading-none">
                        {pl.sum.totalPoints}
                        <span className="text-xs sm:text-sm text-slate-400 font-sans ml-1">
                          / {MAX_POINTS_99} Pkt
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fortschrittsbalken */}
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aktive Aufnahme & Eingabe-Umschalter */}
          <div className="rounded-3xl bg-gradient-to-b from-cyan-500/15 via-slate-900 to-slate-950 border-2 border-cyan-500/40 p-5 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-cyan-300">
                  {gameMode === '1vs1' ? `Jetzt am Wurf: ${activePlayer === 1 ? p1Name : p2Name} • ` : ''}
                  Aufnahme {curSummary.currentRound} von {TOTAL_ROUNDS_99} (Ziel {targetNumber})
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {[0, 1, 2].map((idx) => {
                    const val = curState.currentTurnDarts[idx];
                    if (val !== undefined) {
                      return renderDartBadge(val, targetNumber, idx);
                    }
                    return (
                      <span
                        key={idx}
                        className={`px-3 py-1.5 rounded-xl border border-dashed font-mono font-bold text-xs sm:text-sm ${
                          idx === curState.currentTurnDarts.length
                            ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 animate-pulse'
                            : 'bg-slate-950/60 border-white/15 text-slate-500'
                        }`}
                      >
                        Dart {idx + 1} ?
                      </span>
                    );
                  })}
                  <span className="ml-1 text-xs font-mono text-slate-400">
                    Aufnahme: <strong className="text-white text-sm">{currentTurnSum} Pkt</strong>
                  </span>
                </div>
              </div>

              {/* Eingabemodus Switch */}
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setInputMode('dart')}
                    className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      inputMode === 'dart'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎯 Dart-by-Dart
                  </button>
                  <button
                    type="button"
                    disabled={roundModeDisabled}
                    onClick={() => setInputMode('round')}
                    className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      roundModeDisabled
                        ? 'opacity-40 cursor-not-allowed text-slate-500'
                        : inputMode === 'round'
                        ? 'bg-cyan-500 text-slate-950 cursor-pointer'
                        : 'text-slate-400 hover:text-white cursor-pointer'
                    }`}
                    title={
                      roundModeDisabled
                        ? 'Erst aktuelle 3-Dart-Aufnahme beenden oder korrigieren'
                        : 'Direkt Aufnahmensumme 0–9 eingeben'
                    }
                  >
                    ⚡ Aufnahme (0–9)
                  </button>
                </div>
                {roundModeDisabled && (
                  <span className="text-[10px] text-amber-300 font-mono">
                    Laufende Aufnahme zuerst beenden für 0–9 Modus
                  </span>
                )}
              </div>
            </div>

            {/* TOUCH BUTTONS: DART-BY-DART */}
            {inputMode === 'dart' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleDartThrow(3)}
                  className="min-h-[96px] py-5 px-4 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.97] border-2 border-amber-200 text-slate-950 font-black shadow-xl shadow-amber-500/25 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider opacity-85">TRIPLE</span>
                  <span className="text-3xl font-black font-mono">T{targetNumber}</span>
                  <span className="text-xs font-bold bg-slate-950/20 px-2.5 py-0.5 rounded-full">
                    +3 Punkte
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDartThrow(2)}
                  className="min-h-[96px] py-5 px-4 rounded-2xl bg-gradient-to-b from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.97] border-2 border-cyan-200 text-slate-950 font-black shadow-xl shadow-cyan-500/25 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider opacity-85">DOUBLE</span>
                  <span className="text-3xl font-black font-mono">D{targetNumber}</span>
                  <span className="text-xs font-bold bg-slate-950/20 px-2.5 py-0.5 rounded-full">
                    +2 Punkte
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDartThrow(1)}
                  className="min-h-[96px] py-5 px-4 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.97] border-2 border-emerald-300 text-slate-950 font-black shadow-xl shadow-emerald-500/25 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider opacity-85">SINGLE</span>
                  <span className="text-3xl font-black font-mono">S{targetNumber}</span>
                  <span className="text-xs font-bold bg-slate-950/20 px-2.5 py-0.5 rounded-full">
                    +1 Punkt
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDartThrow(0)}
                  className="min-h-[96px] py-5 px-4 rounded-2xl bg-gradient-to-b from-red-900 to-rose-950 hover:from-red-800 hover:to-rose-900 active:scale-[0.97] border-2 border-red-500 text-red-100 font-black shadow-xl shadow-red-950/35 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider text-red-300">
                    FEHLWURF
                  </span>
                  <span className="text-3xl font-black font-mono">MISS</span>
                  <span className="text-xs font-bold bg-black/40 px-2.5 py-0.5 rounded-full text-red-200">
                    0 Punkte
                  </span>
                </button>
              </div>
            )}

            {/* TOUCH BUTTONS: SCHNELLE AUFNAHME (0-9 PUNKTE) */}
            {inputMode === 'round' && (
              <div className="grid grid-cols-5 gap-2.5 pt-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => handleRoundPoints(pts)}
                    className={`min-h-[68px] rounded-2xl border-2 font-black font-mono text-lg sm:text-xl flex flex-col items-center justify-center active:scale-[0.96] transition-all cursor-pointer ${
                      pts === 0
                        ? 'bg-red-950/80 hover:bg-red-900 border-red-500/80 text-red-200'
                        : pts === 9
                        ? 'bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 border-amber-200 text-slate-950 shadow-lg shadow-amber-500/25'
                        : pts >= 5
                        ? 'bg-emerald-600/30 hover:bg-emerald-600/45 border-emerald-400/70 text-emerald-200'
                        : 'bg-slate-800/90 hover:bg-slate-700 border-cyan-500/30 text-white'
                    }`}
                  >
                    <span>{pts} Pkt</span>
                  </button>
                ))}
              </div>
            )}

            {/* Live-Statistik-Zeile */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-white/10 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30">
                <div className="text-[10px] text-amber-300 font-bold">TRIPLE ({targetNumber})</div>
                <div className="text-base font-black text-white">{curSummary.triples}×</div>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30">
                <div className="text-[10px] text-cyan-300 font-bold">DOUBLE ({targetNumber})</div>
                <div className="text-base font-black text-white">{curSummary.doubles}×</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                <div className="text-[10px] text-emerald-300 font-bold">SINGLE ({targetNumber})</div>
                <div className="text-base font-black text-white">{curSummary.singles}×</div>
              </div>
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/30">
                <div className="text-[10px] text-red-300 font-bold">MISS (0)</div>
                <div className="text-base font-black text-red-200">{curSummary.misses}×</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-slate-400 font-bold">MAX. ERREICHBAR</div>
                <div className="text-base font-black text-emerald-300">{maxRemainingPoints} Pkt</div>
              </div>
            </div>
          </div>

          {/* Aufnahmen-Historie (kompakt #1..#33) */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Aufnahmen-Verlauf ({curState.completedRounds.length} / {TOTAL_ROUNDS_99})</span>
              <span>Ziel {targetNumber} · 3 Darts je Aufnahme</span>
            </div>
            <div className="grid grid-cols-11 gap-1.5">
              {Array.from({ length: TOTAL_ROUNDS_99 }).map((_, idx) => {
                const roundObj = curState.completedRounds[idx];
                const isCurr = idx === curState.completedRounds.length;
                return (
                  <div
                    key={idx}
                    className={`py-1.5 px-1 rounded-lg border text-center font-mono text-[11px] font-bold ${
                      roundObj
                        ? roundObj.points >= 5
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                          : roundObj.points > 0
                          ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                          : 'bg-red-950/70 border-red-500/50 text-red-300'
                        : isCurr
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200 animate-pulse'
                        : 'bg-slate-950/60 border-white/5 text-slate-600'
                    }`}
                    title={roundObj ? `Aufnahme ${roundObj.round}: ${roundObj.points} Punkte` : `Aufnahme ${idx + 1}`}
                  >
                    <div className="text-[9px] opacity-70">#{idx + 1}</div>
                    <div>{roundObj ? roundObj.points : isCurr ? '•' : '-'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. FINISHED / AUSWERTUNGS-SCREEN
      ===================================================================== */}
      {isGameStarted && isGameFinished && (
        <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              99 Darts Challenge (Ziel {targetNumber}) beendet
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              {gameMode === 'solo' ? (
                <>
                  🎯 {p1Name}: {p1Summary.totalPoints} / {MAX_POINTS_99} Punkte!
                </>
              ) : (
                (() => {
                  const win = determine1vs1Winner(p1State, p2State);
                  if (win === 1) return <>🏆 {p1Name} gewinnt das Duell!</>;
                  if (win === 2) return <>🏆 {p2Name} gewinnt das Duell!</>;
                  return <>🤝 Unentschieden!</>;
                })()
              )}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {isSaving
                ? 'Ergebnis wird für das TV-Board & den Trainingsfleiß gespeichert...'
                : isSaved
                ? '✅ Automatisch im Vereins-Ranking, TV-Board & Trainingsfleiß gespeichert!'
                : saveError
                ? `⚠️ ${saveError}`
                : ''}
            </p>
          </div>

          <div
            className={`grid gap-4 ${
              gameMode === '1vs1' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'
            }`}
          >
            {[
              { name: p1Name, st: p1State, sum: p1Summary },
              ...(gameMode === '1vs1' ? [{ name: p2Name, st: p2State, sum: p2Summary }] : []),
            ].map((pl, idx) => {
              const hitsTotal = pl.sum.singles + pl.sum.doubles + pl.sum.triples;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-950/90 border border-white/10 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <div className="text-lg font-black text-white">{pl.name}</div>
                      <div className="text-xs text-slate-400">
                        Zielzahl {targetNumber} · {pl.sum.dartsThrown} Darts (33 Aufnahmen)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-emerald-400 font-mono">
                        {pl.sum.totalPoints}{' '}
                        <span className="text-sm text-slate-400 font-sans">/ {MAX_POINTS_99} Pkt</span>
                      </div>
                      <div className="text-xs font-bold text-cyan-300">
                        {hitsTotal}/99 Treffer ({(pl.sum.hitQuote * 100).toFixed(1)}%) ·{' '}
                        {pl.sum.pointsPerDart.toFixed(2)} Pkt/Dart
                      </div>
                    </div>
                  </div>

                  {/* T/D/S/Miss Breakdown */}
                  <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/40">
                      <div className="text-[10px] text-amber-300">Triple</div>
                      <div className="text-base font-black text-white">{pl.sum.triples}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40">
                      <div className="text-[10px] text-cyan-300">Double</div>
                      <div className="text-base font-black text-white">{pl.sum.doubles}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40">
                      <div className="text-[10px] text-emerald-300">Single</div>
                      <div className="text-base font-black text-white">{pl.sum.singles}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/40">
                      <div className="text-[10px] text-red-300">Miss</div>
                      <div className="text-base font-black text-red-200">{pl.sum.misses}</div>
                    </div>
                  </div>

                  {/* 33 Aufnahmen Grid */}
                  <div className="grid grid-cols-11 gap-1">
                    {pl.st.completedRounds.map((r) => (
                      <div
                        key={r.round}
                        className={`p-1 rounded border text-center font-mono text-[10px] font-bold ${
                          r.points >= 5
                            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                            : r.points > 0
                            ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-200'
                            : 'bg-red-950/60 border-red-500/40 text-red-300'
                        }`}
                      >
                        <div className="text-[8px] opacity-70">#{r.round}</div>
                        <div>{r.points}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={startGame}
              className="min-h-[54px] px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>🎯 Neues Spiel starten</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGameStarted(false)}
              className="min-h-[54px] px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Zielzahl / Modus wechseln
            </button>
          </div>
        </div>
      )}

      {/* Kompakte Historie der letzten 99-Darts-Partien (nur vor Spielstart sichtbar) */}
      {!isGameStarted && history.length > 0 && (
        <div className="bg-slate-900/75 border border-white/10 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
              Letzte 99-Darts Ergebnisse
            </h2>
            <span className="text-xs text-slate-500 font-mono">{history.length} Einträge</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {history.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between text-xs"
              >
                <div className="min-w-0">
                  <div className="font-black text-white truncate">{item.player_name}</div>
                  <div className="text-[11px] text-slate-400">
                    Ziel <strong className="text-cyan-300">{item.target_number}</strong> ·{' '}
                    {item.game_mode === '1vs1' ? `vs. ${item.opponent_name || 'Gegner'}` : 'Solo'}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2 font-mono">
                  <div className="text-base font-black text-emerald-400">{item.total_points} Pkt</div>
                  <div className="text-[10px] text-slate-400">
                    {item.triples_count}T / {item.doubles_count}D / {item.singles_count}S
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
