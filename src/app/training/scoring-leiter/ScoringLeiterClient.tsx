'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import {
  SCORING_LEITER_LEVELS,
  MAX_VISITS_PER_LEVEL,
  REQUIRED_HITS_PER_LEVEL,
  ScoringLeiterHistoryItem,
  ScoringLeiterLevelDetail,
  ScoringLeiterSessionSavePayload,
  calculateLevelPoints,
} from './types';
import { saveScoringLeiterSessionAction } from './actions';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  User,
  Users,
  Target,
  HelpCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { generateSessionId } from '@/lib/liveSession';

const CACHE_KEY = 'lions_active_scoring_leiter_session_v1';

interface ScoringLeiterClientProps {
  players: Player[];
  initialHistory: ScoringLeiterHistoryItem[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

interface PlayerProgressState {
  levelIdx: number; // 0..6
  hitsInLevel: number;
  visitsInLevel: boolean[];
  levelDetails: ScoringLeiterLevelDetail[];
  eliminated: boolean;
  clearedAll: boolean;
}

interface TurnSnapshot {
  activePlayer: 1 | 2;
  p1State: PlayerProgressState;
  p2State: PlayerProgressState;
}

const createInitialPlayerProgress = (): PlayerProgressState => ({
  levelIdx: 0,
  hitsInLevel: 0,
  visitsInLevel: [],
  levelDetails: [],
  eliminated: false,
  clearedAll: false,
});

function summarizePlayer(st: PlayerProgressState) {
  const levelsClearedCount = st.levelDetails.filter((d) => d.cleared).length;
  const highestClearedLevel =
    levelsClearedCount > 0 ? SCORING_LEITER_LEVELS[levelsClearedCount - 1] : 0;
  const reachedLevel = SCORING_LEITER_LEVELS[st.levelIdx] ?? 140;

  let totalScore = st.levelDetails.reduce((s, d) => s + d.pointsEarned, 0);
  // Teil-Punkte für laufende/abgebrochene Treffer nicht aufschlagen, nur volle Stufen
  const completedHits = st.levelDetails.reduce((s, d) => s + d.hits, 0);
  const completedVisits = st.levelDetails.reduce((s, d) => s + d.visits.length, 0);

  // Wenn das Spiel noch läuft (nicht im levelDetails gespeichert), aktuelle Stufe mitzählen
  const currentInDetails = st.levelDetails.some((d) => d.levelIndex === st.levelIdx);
  const totalHits = completedHits + (currentInDetails ? 0 : st.hitsInLevel);
  const totalVisits = completedVisits + (currentInDetails ? 0 : st.visitsInLevel.length);
  const hitQuote = totalVisits > 0 ? totalHits / totalVisits : 0;

  return {
    levelsClearedCount,
    highestClearedLevel,
    reachedLevel,
    totalScore,
    totalHits,
    totalVisits,
    hitQuote,
  };
}

export default function ScoringLeiterClient({
  players,
  initialHistory,
  currentUser,
}: ScoringLeiterClientProps) {
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
  const [gameMode, setGameMode] = useState<'solo' | '1vs1'>('solo');
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
  const [p1State, setP1State] = useState<PlayerProgressState>(createInitialPlayerProgress);
  const [p2State, setP2State] = useState<PlayerProgressState>(createInitialPlayerProgress);
  const [undoStack, setUndoStack] = useState<TurnSnapshot[]>([]);

  // Speicher- & Historien-State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScoringLeiterHistoryItem[]>(initialHistory);

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
        localStorage.getItem('lions_active_board_scoring_leiter') ||
        localStorage.getItem('lions_active_board') ||
        '1'
      );
    }
    return '1';
  });

  const [gameSessionId, setGameSessionId] = useState<string>(() =>
    generateSessionId('scoring_leiter', activeBoard)
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
      window.history.replaceState(null, '', `/training/scoring-leiter?board=${b}`);
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      liveBroadcastRef.current = new BroadcastChannel(`lions_scoring_leiter_live_sync_${activeBoard}`);
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
          (cached.p1State?.visitsInLevel?.length > 0 ||
            cached.p1State?.levelDetails?.length > 0 ||
            cached.p2State?.visitsInLevel?.length > 0)
        ) {
          setCachedSessionToResume(cached);
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden des Scoring-Leiter Caches:', e);
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

  // 4s Heartbeat während aktiven Spiels (sendet vollständigen Snapshot, damit Namen & Stand nie überschrieben werden!)
  useEffect(() => {
    if (!isGameStarted || isGameFinished) return;
    const interval = setInterval(() => {
      const activeState = activePlayer === 1 ? p1State : p2State;
      const targetVal = SCORING_LEITER_LEVELS[activeState.levelIdx] ?? 140;
      fetch('/api/live/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: activeBoard,
          sessionId: gameSessionId,
          status: 'playing',
          gameType: 'scoring_leiter',
          gameMode,
          p1Name,
          p2Name,
          activePlayer,
          currentNumber: targetVal,
          currentLevelIndex: activeState.levelIdx,
          hitsInLevel: activeState.hitsInLevel,
          levelVisits: activeState.visitsInLevel,
          currentVisit: Math.min(MAX_VISITS_PER_LEVEL, activeState.visitsInLevel.length + 1),
          totalVisits: MAX_VISITS_PER_LEVEL,
          eliminated: activeState.eliminated,
          clearedAll: activeState.clearedAll,
          updatedAt: Date.now(),
        }),
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [isGameStarted, isGameFinished, activeBoard, gameSessionId, gameMode, p1Name, p2Name, activePlayer, p1State, p2State]);

  const broadcastLiveState = (
    started: boolean,
    finished: boolean,
    p1S: PlayerProgressState,
    p2S: PlayerProgressState,
    actPlayer: 1 | 2,
    overrideSessionId?: string
  ) => {
    if (!started && !finished) return;
    const activeState = actPlayer === 1 ? p1S : p2S;
    const targetVal = SCORING_LEITER_LEVELS[activeState.levelIdx] ?? 140;

    const payload = {
      boardId: activeBoard,
      sessionId: overrideSessionId || gameSessionId,
      status: finished ? 'completed' : 'playing',
      gameType: 'scoring_leiter' as const,
      gameMode,
      p1Name,
      p2Name,
      activePlayer: actPlayer,
      currentNumber: targetVal,
      currentLevelIndex: activeState.levelIdx,
      hitsInLevel: activeState.hitsInLevel,
      levelVisits: activeState.visitsInLevel,
      currentVisit: Math.min(MAX_VISITS_PER_LEVEL, activeState.visitsInLevel.length + 1),
      totalVisits: MAX_VISITS_PER_LEVEL,
      p1Level: SCORING_LEITER_LEVELS[p1S.levelIdx] ?? 140,
      p1HitsInLevel: p1S.hitsInLevel,
      p2Level: SCORING_LEITER_LEVELS[p2S.levelIdx] ?? 140,
      p2HitsInLevel: p2S.hitsInLevel,
      eliminated: activeState.eliminated,
      clearedAll: activeState.clearedAll,
      updatedAt: Date.now(),
    };

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
  }, [isGameStarted, isGameFinished, activeBoard, gameMode, p1Name, p2Name, activePlayer, p1State, p2State]);

  // Cache schreiben
  useEffect(() => {
    if (
      isGameStarted &&
      !isGameFinished &&
      (p1State.visitsInLevel.length > 0 ||
        p1State.levelDetails.length > 0 ||
        p2State.visitsInLevel.length > 0)
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
  }, [isGameStarted, isGameFinished, gameMode, p1Name, p2Name, activePlayer, p1State, p2State, undoStack, gameSessionId, activeBoard]);

  const handleResumeCachedSession = () => {
    if (!cachedSessionToResume) return;
    const c = cachedSessionToResume;
    if (c.gameMode) setGameMode(c.gameMode);
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
      c.gameSessionId || gameSessionId
    );
  };

  const handleDiscardCachedSession = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setCachedSessionToResume(null);
    setRestoredFromCache(false);
    setP1State(createInitialPlayerProgress());
    setP2State(createInitialPlayerProgress());
    setUndoStack([]);
    setActivePlayer(1);
    setIsGameStarted(false);
    setIsGameFinished(false);
  };

  // Audio Feedback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playSound = (type: 'hit' | 'levelup' | 'miss' | 'finish' | 'start') => {
    if (!soundEnabled) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      if (type === 'hit' || type === 'levelup') {
        const freqs = type === 'levelup' ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.06);
          gain.gain.setValueAtTime(0.18, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.28);
        });
      } else if (type === 'miss') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.linearRampToValueAtTime(130, now + 0.16);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
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

    const initP1 = createInitialPlayerProgress();
    const initP2 = createInitialPlayerProgress();
    setP1State(initP1);
    setP2State(initP2);
    setActivePlayer(1);
    setUndoStack([]);
    setIsSaved(false);
    setSaveError(null);
    setIsGameFinished(false);
    setIsGameStarted(true);

    const nextSessionId = generateSessionId('scoring_leiter', activeBoard);
    setGameSessionId(nextSessionId);
    playSound('start');
    broadcastLiveState(true, false, initP1, initP2, 1, nextSessionId);
  };

  const determine1vs1Winner = (s1: PlayerProgressState, s2: PlayerProgressState): 1 | 2 | 0 => {
    const sum1 = summarizePlayer(s1);
    const sum2 = summarizePlayer(s2);
    if (sum1.levelsClearedCount !== sum2.levelsClearedCount) {
      return sum1.levelsClearedCount > sum2.levelsClearedCount ? 1 : 2;
    }
    if (s1.hitsInLevel !== s2.hitsInLevel) {
      return s1.hitsInLevel > s2.hitsInLevel ? 1 : 2;
    }
    if (sum1.totalVisits !== sum2.totalVisits) {
      return sum1.totalVisits < sum2.totalVisits ? 1 : 2;
    }
    return 0;
  };

  const triggerAutoSave = async (finalP1: PlayerProgressState, finalP2: PlayerProgressState) => {
    setIsSaving(true);
    setSaveError(null);
    const sessionId = `sl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const sum1 = summarizePlayer(finalP1);
    const p1Obj = validPlayers.find((p) => p.name === p1Name);
    const payloads: ScoringLeiterSessionSavePayload[] = [];

    if (gameMode === 'solo') {
      payloads.push({
        session_id: sessionId,
        player_id: p1Obj?.id ?? null,
        player_name: p1Name,
        opponent_name: null,
        game_mode: 'solo',
        highest_cleared_level: sum1.highestClearedLevel,
        reached_level: sum1.reachedLevel,
        levels_cleared_count: sum1.levelsClearedCount,
        total_score: sum1.totalScore,
        total_hits: sum1.totalHits,
        total_visits: sum1.totalVisits,
        hit_quote: Number(sum1.hitQuote.toFixed(4)),
        is_winner: 1,
        level_details: finalP1.levelDetails,
        training_date: todayStr,
      });
    } else {
      const sum2 = summarizePlayer(finalP2);
      const p2Obj = validPlayers.find((p) => p.name === p2Name);
      const win = determine1vs1Winner(finalP1, finalP2);

      payloads.push({
        session_id: sessionId,
        player_id: p1Obj?.id ?? null,
        player_name: p1Name,
        opponent_name: p2Name,
        game_mode: '1vs1',
        highest_cleared_level: sum1.highestClearedLevel,
        reached_level: sum1.reachedLevel,
        levels_cleared_count: sum1.levelsClearedCount,
        total_score: sum1.totalScore,
        total_hits: sum1.totalHits,
        total_visits: sum1.totalVisits,
        hit_quote: Number(sum1.hitQuote.toFixed(4)),
        is_winner: win === 1 ? 1 : 0,
        level_details: finalP1.levelDetails,
        training_date: todayStr,
      });

      payloads.push({
        session_id: sessionId,
        player_id: p2Obj?.id ?? null,
        player_name: p2Name,
        opponent_name: p1Name,
        game_mode: '1vs1',
        highest_cleared_level: sum2.highestClearedLevel,
        reached_level: sum2.reachedLevel,
        levels_cleared_count: sum2.levelsClearedCount,
        total_score: sum2.totalScore,
        total_hits: sum2.totalHits,
        total_visits: sum2.totalVisits,
        hit_quote: Number(sum2.hitQuote.toFixed(4)),
        is_winner: win === 2 ? 1 : 0,
        level_details: finalP2.levelDetails,
        training_date: todayStr,
      });
    }

    const res = await saveScoringLeiterSessionAction(payloads);
    setIsSaving(false);

    if (res.success) {
      setIsSaved(true);
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {}
      setRestoredFromCache(false);
      const nowIso = new Date().toISOString();
      const newHist: ScoringLeiterHistoryItem[] = payloads.map((p, i) => ({
        id: Date.now() + i,
        session_id: p.session_id,
        player_name: p.player_name,
        opponent_name: p.opponent_name ?? null,
        game_mode: p.game_mode,
        highest_cleared_level: p.highest_cleared_level,
        reached_level: p.reached_level,
        levels_cleared_count: p.levels_cleared_count,
        total_score: p.total_score,
        total_hits: p.total_hits,
        total_visits: p.total_visits,
        hit_quote: p.hit_quote,
        is_winner: p.is_winner,
        level_details: p.level_details,
        training_date: p.training_date,
        created_at: nowIso,
      }));
      setHistory((prev) => [...newHist, ...prev.slice(0, 28)]);
    } else {
      setSaveError(res.error || 'Fehler beim Speichern');
    }
  };

  const applyThrowToPlayer = (st: PlayerProgressState, success: boolean): { next: PlayerProgressState; sound: 'hit' | 'levelup' | 'miss' } => {
    const nextVisits = [...st.visitsInLevel, success];
    const nextHits = st.hitsInLevel + (success ? 1 : 0);
    const targetVal = SCORING_LEITER_LEVELS[st.levelIdx];
    const remaining = MAX_VISITS_PER_LEVEL - nextVisits.length;

    // 1. Aufstieg (2 Treffer erreicht)
    if (nextHits >= REQUIRED_HITS_PER_LEVEL) {
      const detail: ScoringLeiterLevelDetail = {
        levelIndex: st.levelIdx,
        target: targetVal,
        visits: nextVisits,
        hits: nextHits,
        cleared: true,
        eliminated: false,
        pointsEarned: calculateLevelPoints(targetVal, nextVisits.length, true),
      };
      const nextDetails = [...st.levelDetails, detail];

      if (st.levelIdx + 1 >= SCORING_LEITER_LEVELS.length) {
        return {
          next: {
            levelIdx: st.levelIdx,
            hitsInLevel: nextHits,
            visitsInLevel: nextVisits,
            levelDetails: nextDetails,
            eliminated: false,
            clearedAll: true,
          },
          sound: 'levelup',
        };
      }

      return {
        next: {
          levelIdx: st.levelIdx + 1,
          hitsInLevel: 0,
          visitsInLevel: [],
          levelDetails: nextDetails,
          eliminated: false,
          clearedAll: false,
        },
        sound: 'levelup',
      };
    }

    // 2. Rechnerisches Aus (z.B. nach 9 Aufnahmen bei 0/2 oder nach 10 Aufnahmen bei < 2/2)
    if (nextHits + remaining < REQUIRED_HITS_PER_LEVEL) {
      const detail: ScoringLeiterLevelDetail = {
        levelIndex: st.levelIdx,
        target: targetVal,
        visits: nextVisits,
        hits: nextHits,
        cleared: false,
        eliminated: true,
        pointsEarned: 0,
      };
      return {
        next: {
          levelIdx: st.levelIdx,
          hitsInLevel: nextHits,
          visitsInLevel: nextVisits,
          levelDetails: [...st.levelDetails, detail],
          eliminated: true,
          clearedAll: false,
        },
        sound: 'miss',
      };
    }

    // 3. Weiter in aktueller Stufe
    return {
      next: {
        ...st,
        hitsInLevel: nextHits,
        visitsInLevel: nextVisits,
      },
      sound: success ? 'hit' : 'miss',
    };
  };

  const handleDecision = (success: boolean) => {
    if (isGameFinished) return;

    setUndoStack((prev) => [
      ...prev,
      {
        activePlayer,
        p1State: JSON.parse(JSON.stringify(p1State)),
        p2State: JSON.parse(JSON.stringify(p2State)),
      },
    ]);

    if (gameMode === 'solo') {
      const { next, sound } = applyThrowToPlayer(p1State, success);
      setP1State(next);

      if (next.eliminated || next.clearedAll) {
        setIsGameFinished(true);
        playSound('finish');
        triggerAutoSave(next, p2State);
        broadcastLiveState(true, true, next, p2State, 1);
      } else {
        playSound(sound);
        broadcastLiveState(true, false, next, p2State, 1);
      }
      return;
    }

    // 1 vs. 1 Modus: Spieler wechseln sich pro Aufnahme ab, solange der andere noch aktiv ist
    let nextP1 = p1State;
    let nextP2 = p2State;
    let playedSound: 'hit' | 'levelup' | 'miss' = 'hit';

    if (activePlayer === 1) {
      const res = applyThrowToPlayer(p1State, success);
      nextP1 = res.next;
      playedSound = res.sound;
      setP1State(nextP1);
    } else {
      const res = applyThrowToPlayer(p2State, success);
      nextP2 = res.next;
      playedSound = res.sound;
      setP2State(nextP2);
    }

    const p1Done = nextP1.eliminated || nextP1.clearedAll;
    const p2Done = nextP2.eliminated || nextP2.clearedAll;

    if (p1Done && p2Done) {
      setIsGameFinished(true);
      playSound('finish');
      triggerAutoSave(nextP1, nextP2);
      broadcastLiveState(true, true, nextP1, nextP2, activePlayer);
      return;
    }

    playSound(playedSound);
    let nextActive: 1 | 2 = activePlayer;
    if (activePlayer === 1 && !p2Done) nextActive = 2;
    else if (activePlayer === 2 && !p1Done) nextActive = 1;

    setActivePlayer(nextActive);
    broadcastLiveState(true, false, nextP1, nextP2, nextActive);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isGameFinished) return;
    const last = undoStack[undoStack.length - 1];
    setActivePlayer(last.activePlayer);
    setP1State(last.p1State);
    setP2State(last.p2State);
    setUndoStack((prev) => prev.slice(0, -1));
    broadcastLiveState(true, false, last.p1State, last.p2State, last.activePlayer);
  };

  const curState = activePlayer === 1 ? p1State : p2State;
  const currentTarget = SCORING_LEITER_LEVELS[curState.levelIdx] ?? 140;
  const currentVisitNum = Math.min(MAX_VISITS_PER_LEVEL, curState.visitsInLevel.length + 1);
  const p1Summary = summarizePlayer(p1State);
  const p2Summary = summarizePlayer(p2State);

  return (
    <div className="w-full max-w-5xl overflow-x-hidden mx-auto px-2 sm:px-6 space-y-6">
      {/* Top Navigation */}
      <div
        data-ui-id="SCORING_LEITER.NAV.BAR"
        className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/training?board=${activeBoard}`}
            data-ui-id="SCORING_LEITER.NAV.BACK_BTN"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors"
            title="Zurück zur Trainingsübersicht"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🪜</span>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Scoring-Leiter (41–140)
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              7 Stufen • 10 Aufnahmen pro Stufe • 2 Treffer zum Aufstieg • Rechnerisches Aus
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
              <span>Spielregeln – Scoring-Leiter</span>
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
              <strong>Die 7 Stufen:</strong>{' '}
              <span className="font-mono font-bold text-white">41 → 60 → 65 → 80 → 100 → 120 → 140</span>
            </li>
            <li>
              <strong>Aufnahme (3 Darts):</strong> Es zählen nur volle 3-Dart-Aufnahmen auf beliebige Segmente. Erreichst oder übertriffst du die Zielzahl (≥ Ziel), ist das ein Treffer.
            </li>
            <li>
              <strong>Aufstiegs-Automatik:</strong> Schaffst du innerhalb von maximal <strong>10 Aufnahmen</strong> genau <strong>2 Treffer</strong>, steigst du sofort in die nächste Stufe auf (Zähler startet wieder bei 1/10).
            </li>
            <li>
              <strong>Rechnerisches Aus:</strong> Schaffst du es nicht mehr (z. B. nach 9 Aufnahmen noch 0 Treffer oder nach 10 Aufnahmen nur 1 Treffer), ist das Spiel für dich beendet.
            </li>
          </ul>
        </div>
      )}

      {/* =====================================================================
          1. SETUP SCREEN (VOR SPIELSTART)
      ===================================================================== */}
      {!isGameStarted && (
        <div data-ui-id="SCORING_LEITER.SETUP.CONTAINER" className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            {/* Crash- & Wisch-Schutz */}
            {cachedSessionToResume && (
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
                      {cachedSessionToResume.p1Name} · Stufe{' '}
                      {SCORING_LEITER_LEVELS[cachedSessionToResume.p1State?.levelIdx ?? 0]} (Treffer:{' '}
                      {cachedSessionToResume.p1State?.hitsInLevel ?? 0}/2)
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleResumeCachedSession}
                    className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs font-mono tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                  >
                    <span>▶ Spiel jetzt fortsetzen</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardCachedSession}
                    className="py-3.5 px-5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-rose-300 hover:text-white border border-rose-500/40 font-black text-xs font-mono uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>✕ Spiel verwerfen & Neu beginnen</span>
                  </button>
                </div>
              </div>
            )}

            {/* Stufen-Übersicht */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {SCORING_LEITER_LEVELS.map((val, idx) => (
                <div
                  key={val}
                  className="rounded-2xl bg-slate-950/80 border border-cyan-500/30 p-2.5 text-center"
                >
                  <span className="text-[10px] font-mono text-cyan-400 block">Stufe {idx + 1}</span>
                  <span className="text-base sm:text-lg font-black font-mono text-white">{val}</span>
                </div>
              ))}
            </div>

            {/* Spielmodus-Wahl */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                1. Spielmodus wählen
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGameMode('solo')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
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
                    <div className="text-[11px] text-slate-400">Klettere bis zur 140</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('1vs1')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
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
                    <div className="text-[11px] text-slate-400">Abwechselnd die Leiter hoch</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Spielerauswahl */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`space-y-2 ${gameMode === 'solo' ? 'sm:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                    {gameMode === 'solo' ? 'Spieler' : 'Spieler 1 (beginnt)'}
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

            {/* Oche / Board-Auswahl */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>📺 Oche / TV-Monitor zuweisen:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono">
                    Board {activeBoard}
                  </span>
                </label>
                <Link
                  href={`/board/${activeBoard}`}
                  target="_blank"
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 underline underline-offset-2"
                >
                  <span>Monitor öffnen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['1', '2', '3', '4', '5'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleSelectBoard(b)}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-black transition-all cursor-pointer ${
                      activeBoard === b
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30 scale-[1.02]'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10'
                    }`}
                  >
                    Board {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              type="button"
              onClick={startGame}
              className="w-full min-h-[64px] py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-lg sm:text-xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Target className="w-5 h-5" />
              <span>🪜 Spiel starten (Start bei 41)</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. ACTIVE GAME SCREEN (1:1 STELLEN & CHECKEN DESIGN)
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
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-black text-xs sm:text-sm">
                Stufe {curState.levelIdx + 1} / 7
              </span>
              <span className="px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black text-xs sm:text-sm">
                Aufnahme {currentVisitNum} / 10
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
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
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>

          {/* 7er Stufen-Stepper */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {SCORING_LEITER_LEVELS.map((val, idx) => {
                const detail = curState.levelDetails.find((d) => d.levelIndex === idx);
                const isCurrent = idx === curState.levelIdx && !curState.clearedAll && !curState.eliminated;

                let boxClass = 'bg-slate-950/80 border-white/10 text-slate-500';
                if (isCurrent) {
                  boxClass =
                    'bg-amber-400 text-zinc-950 font-black border-amber-300 ring-4 ring-amber-400/50 scale-105 shadow-md shadow-amber-500/30 z-10';
                } else if (detail?.cleared) {
                  boxClass = 'bg-emerald-950/90 border-emerald-500 text-emerald-300 font-black shadow-sm';
                } else if (detail?.eliminated) {
                  boxClass = 'bg-red-950/40 border-red-900/60 text-red-400/80 line-through';
                }

                return (
                  <div
                    key={val}
                    className={`rounded-xl border p-2 text-center transition-all flex flex-col items-center justify-center ${boxClass}`}
                  >
                    <span className="text-[10px] font-mono opacity-75">Stufe {idx + 1}</span>
                    <span className="text-sm sm:text-base font-black font-mono">{val}</span>
                    <span className="text-[10px] font-bold">
                      {detail ? (detail.cleared ? '✓' : '✕') : isCurrent ? `${curState.hitsInLevel}/2` : '2×'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spieler-Scoreboard */}
          <div className={`grid gap-4 ${gameMode === '1vs1' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div
              className={`rounded-2xl p-4 border-2 transition-all flex items-center justify-between ${
                activePlayer === 1
                  ? 'bg-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/50 border-white/10 opacity-75'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">{p1Name}</span>
                  {activePlayer === 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black uppercase">
                      Am Board 🎯
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  Stufe <strong className="text-emerald-300">{SCORING_LEITER_LEVELS[p1State.levelIdx]}</strong> · Treffer:{' '}
                  <strong className="text-white">{p1State.hitsInLevel} / 2</strong>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  {p1Summary.totalScore} <span className="text-xs text-slate-400 font-sans">Pkt</span>
                </div>
              </div>
            </div>

            {gameMode === '1vs1' && (
              <div
                className={`rounded-2xl p-4 border-2 transition-all flex items-center justify-between ${
                  activePlayer === 2
                    ? 'bg-slate-900 border-amber-400 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/50 border-white/10 opacity-75'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-white">{p2Name}</span>
                    {activePlayer === 2 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-black uppercase">
                        Am Board 🎯
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {p2State.eliminated ? (
                      <span className="text-red-400 font-bold">✕ Aus bei {SCORING_LEITER_LEVELS[p2State.levelIdx]}</span>
                    ) : p2State.clearedAll ? (
                      <span className="text-emerald-400 font-bold">🏆 140 Cleared</span>
                    ) : (
                      <>
                        Stufe <strong className="text-amber-300">{SCORING_LEITER_LEVELS[p2State.levelIdx]}</strong> · Treffer:{' '}
                        <strong className="text-white">{p2State.hitsInLevel} / 2</strong>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                    {p2Summary.totalScore} <span className="text-xs text-slate-400 font-sans">Pkt</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HAUPT-ZIELANZEIGE & CHECK / MISS BUTTONS */}
          <div className="rounded-3xl bg-gradient-to-b from-cyan-500/20 via-slate-900 to-slate-950 border-2 border-cyan-500/40 p-6 sm:p-10 text-center space-y-6 shadow-2xl">
            <div className="flex flex-col items-center gap-2">
              <span className="px-4 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider border bg-cyan-500/20 text-cyan-300 border-cyan-500/50">
                Stufe {curState.levelIdx + 1} von 7 • 2 Treffer zum Aufstieg
              </span>

              {gameMode === '1vs1' && (
                <div className="text-sm font-bold text-slate-300 mt-1">
                  Jetzt am Wurf:{' '}
                  <strong className="text-white underline decoration-cyan-400">
                    {activePlayer === 1 ? p1Name : p2Name}
                  </strong>
                </div>
              )}
            </div>

            <div className="py-2">
              <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                Zielpunkte in Aufnahme {currentVisitNum} / 10 (3 Darts)
              </div>
              <div className="text-7xl sm:text-9xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.18)]">
                {currentTarget}+
              </div>

              {/* 10 Aufnahmen-Dots & 2 Treffer-Status */}
              <div className="mt-4 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  {Array.from({ length: MAX_VISITS_PER_LEVEL }).map((_, i) => {
                    const v = curState.visitsInLevel[i];
                    const isCurr = i === curState.visitsInLevel.length;
                    return (
                      <span
                        key={i}
                        className={`w-3.5 h-3.5 rounded-full transition-all ${
                          v === true
                            ? 'bg-emerald-400 shadow-[0_0_10px_#00ff88]'
                            : v === false
                            ? 'bg-red-500'
                            : isCurr
                            ? 'bg-amber-300 ring-2 ring-amber-400/60 scale-110'
                            : 'bg-slate-800 border border-white/15'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-xs font-mono text-emerald-300 font-bold">
                  Aufstiegs-Treffer: {curState.hitsInLevel} / 2
                </span>
              </div>
            </div>

            {/* ZWEI GROSSE TOUCH-TASTEN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => handleDecision(true)}
                className="min-h-[84px] py-6 sm:py-7 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] border-2 border-emerald-300 text-slate-950 font-black text-xl sm:text-2xl shadow-xl shadow-emerald-500/30 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  <span className="tracking-wide">CHECK!</span>
                </div>
                <span className="text-xs font-black uppercase tracking-wider bg-emerald-400/80 px-3 py-0.5 rounded-full text-zinc-950">
                  ≥ {currentTarget} Punkte geworfen
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDecision(false)}
                className="min-h-[84px] py-6 sm:py-7 px-6 rounded-2xl bg-gradient-to-b from-red-950/80 to-zinc-900 hover:from-red-900/70 hover:to-zinc-900 active:scale-[0.98] border-2 border-red-600/80 hover:border-red-500 text-red-300 hover:text-red-200 font-black text-xl sm:text-2xl shadow-xl shadow-red-950/20 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 group-hover:scale-105 transition-transform">
                  <XCircle className="w-7 h-7 stroke-[2.5]" />
                  <span className="tracking-wide">MISS</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider bg-zinc-950/60 px-3 py-0.5 rounded-full text-red-400/90 group-hover:text-red-300">
                  &lt; {currentTarget} Punkte • Aufnahme weg
                </span>
              </button>
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
              Scoring-Leiter beendet
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              {gameMode === 'solo' ? (
                p1State.clearedAll ? (
                  <>🏆 {p1Name} hat alle 7 Stufen (bis 140) bezwungen!</>
                ) : (
                  <>
                    {p1Name}: {p1Summary.levelsClearedCount > 0 ? `Stufe ${p1Summary.highestClearedLevel} gemeistert!` : 'An Stufe 41 gescheitert'}
                  </>
                )
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

          <div className={`grid gap-4 ${gameMode === '1vs1' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-xl mx-auto'}`}>
            {[
              { name: p1Name, st: p1State, sum: p1Summary },
              ...(gameMode === '1vs1' ? [{ name: p2Name, st: p2State, sum: p2Summary }] : []),
            ].map((pl, idx) => (
              <div key={idx} className="rounded-2xl bg-slate-950/90 border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="text-lg font-black text-white">{pl.name}</div>
                    <div className="text-xs text-slate-400">
                      {pl.st.clearedAll
                        ? 'Alle 7 Stufen geschafft (140 Cleared)'
                        : `Ausgeschieden bei Stufe ${pl.sum.reachedLevel}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-amber-400 font-mono">
                      {pl.sum.totalScore} <span className="text-sm text-slate-400 font-sans">Pkt</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-400">
                      {pl.sum.totalHits} / {pl.sum.totalVisits} Treffer ({(pl.sum.hitQuote * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {SCORING_LEITER_LEVELS.map((val, lIdx) => {
                    const d = pl.st.levelDetails.find((x) => x.levelIndex === lIdx);
                    return (
                      <div
                        key={val}
                        className={`p-2 rounded-xl border text-center font-mono ${
                          d?.cleared
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : d?.eliminated
                            ? 'bg-red-500/15 border-red-500/40 text-red-300'
                            : 'bg-slate-900 border-white/10 text-slate-500'
                        }`}
                      >
                        <div className="text-xs font-black">{val}</div>
                        <div className="text-[10px]">
                          {d ? (d.cleared ? `${d.hits}/${d.visits.length}` : '✕') : '-'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={startGame}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>🪜 Neues Spiel starten</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGameStarted(false)}
              className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Modus / Spieler wechseln
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
