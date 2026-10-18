'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Player } from '@/lib/data';
import { UserSession } from '@/app/actions';
import {
  savePdcChallengeAction,
  recordAbortedPdcAction,
  PdcChallengeSessionData,
  PdcLeaderboardRow,
} from './actions';
import {
  RoundHitEntry,
  PART1_TARGETS,
  PART2_TARGETS,
  PART3_TARGETS,
  getPdcBadge,
} from './types';
import {
  Trophy,
  Users,
  User,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Award,
  Target,
  Tv,
} from 'lucide-react';

interface PdcChallengeClientProps {
  players: Player[];
  initialHistory: any[];
  initialLeaderboard?: PdcLeaderboardRow[];
  user?: UserSession | null;
}

const CACHE_KEY = 'lions_active_pdc_challenge_session_v2';

type GameStage = 'part1' | 'part2' | 'part3' | 'completed';

interface PlayerGameState {
  part1Rounds: Record<number, RoundHitEntry | null>; // 10..15 -> RoundHitEntry | null
  part2Hits: Record<string, boolean | null>; // D1..D20, Bull -> true/false/null
  part3Rounds: Record<number, RoundHitEntry | null>; // 15..20 -> RoundHitEntry | null
}

const createInitialPlayerState = (): PlayerGameState => ({
  part1Rounds: {
    10: null,
    11: null,
    12: null,
    13: null,
    14: null,
    15: null,
  },
  part2Hits: PART2_TARGETS.reduce((acc, t) => {
    acc[t] = null;
    return acc;
  }, {} as Record<string, boolean | null>),
  part3Rounds: {
    15: null,
    16: null,
    17: null,
    18: null,
    19: null,
    20: null,
  },
});

export default function PdcChallengeClient({
  players,
  initialHistory,
  initialLeaderboard = [],
  user,
}: PdcChallengeClientProps) {
  const router = useRouter();
  const isBoardUser = Boolean(user?.name && user.name.toLowerCase().startsWith('board'));
  const userPlayerMatch = players.find(
    (p) => p.name.toLowerCase() === user?.name?.toLowerCase()
  );
  const defaultP1 =
    !isBoardUser && userPlayerMatch
      ? userPlayerMatch.name
      : players[0]?.name || 'Sebastian Kirste';

  // Game Setup
  const [gameMode, setGameMode] = useState<'solo' | '1vs1'>('solo');
  const [p1Name, setP1Name] = useState<string>(defaultP1);
  const [p2Name, setP2Name] = useState<string>(players[1]?.name || 'Dirk Ostermann');
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);

  // Flow State
  const [stage, setStage] = useState<GameStage>('part1');
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number>(0);

  // Scores
  const [stateP1, setStateP1] = useState<PlayerGameState>(createInitialPlayerState());
  const [stateP2, setStateP2] = useState<PlayerGameState>(createInitialPlayerState());

  // Shanghai Confirmation Modal (wenn 6 eingegeben wird)
  const [shanghaiPromptTarget, setShanghaiPromptTarget] = useState<number | null>(null);

  // UI / App State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [history, setHistory] = useState<any[]>(initialHistory);
  const [leaderboard, setLeaderboard] = useState<PdcLeaderboardRow[]>(initialLeaderboard);
  const [activeTab, setActiveTab] = useState<'game' | 'summary' | 'leaderboard' | 'history'>('game');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isGameInitialized, setIsGameInitialized] = useState<boolean>(false);
  const [shanghaiNotice, setShanghaiNotice] = useState<string | null>(null);

  // Web Audio Synthesizer
  const playSound = (freq: number, type: OscillatorType = 'sine', duration: number = 0.1) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const playHitSound = (multiplier: number) => {
    if (!soundEnabled) return;
    if (multiplier === 0) {
      playSound(220, 'sawtooth', 0.12);
    } else if (multiplier <= 3) {
      playSound(440, 'sine', 0.12);
    } else if (multiplier <= 6) {
      playSound(554.37, 'sine', 0.09);
      setTimeout(() => playSound(659.25, 'sine', 0.14), 100);
    } else {
      playSound(523.25, 'triangle', 0.08);
      setTimeout(() => playSound(659.25, 'triangle', 0.08), 90);
      setTimeout(() => playSound(783.99, 'triangle', 0.22), 180);
    }
  };

  const playDoubleHitSound = (isBull = false) => {
    if (!soundEnabled) return;
    if (isBull) {
      playSound(523.25, 'triangle', 0.1);
      setTimeout(() => playSound(659.25, 'triangle', 0.1), 100);
      setTimeout(() => playSound(783.99, 'triangle', 0.1), 200);
      setTimeout(() => playSound(1046.5, 'triangle', 0.3), 300);
    } else {
      playSound(587.33, 'sine', 0.09);
      setTimeout(() => playSound(880, 'sine', 0.18), 100);
    }
  };

  const playShanghaiFanfare = () => {
    if (!soundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => playSound(freq, 'triangle', 0.22), idx * 110);
    });
  };

  // Helper zum Berechnen der Scores pro Spieler
  const calculatePlayerStats = (state: PlayerGameState) => {
    let scorePart1 = 0;
    let shanghaisPart1 = 0;
    let dartsThrownPart1 = 0;

    PART1_TARGETS.forEach((target) => {
      const entry = state.part1Rounds[target];
      if (entry !== null) {
        dartsThrownPart1 += 3;
        scorePart1 += entry.multiplier * target + (entry.isShanghai ? 100 : 0);
        if (entry.isShanghai) shanghaisPart1 += 1;
      }
    });

    let scorePart2 = 0;
    let doublesHit = 0;
    let dartsThrownPart2 = 0;

    PART2_TARGETS.forEach((target) => {
      const hit = state.part2Hits[target];
      if (hit !== null) {
        dartsThrownPart2 += 1;
        if (hit === true) {
          doublesHit += 1;
          scorePart2 += target === 'Bull' ? 100 : 50;
        }
      }
    });

    let scorePart3 = 0;
    let shanghaisPart3 = 0;
    let dartsThrownPart3 = 0;

    PART3_TARGETS.forEach((target) => {
      const entry = state.part3Rounds[target];
      if (entry !== null) {
        dartsThrownPart3 += 3;
        scorePart3 += entry.multiplier * target + (entry.isShanghai ? 100 : 0);
        if (entry.isShanghai) shanghaisPart3 += 1;
      }
    });

    const totalScore = scorePart1 + scorePart2 + scorePart3;
    const totalDartsThrown = dartsThrownPart1 + dartsThrownPart2 + dartsThrownPart3;
    const totalShanghais = shanghaisPart1 + shanghaisPart3;
    const badge = getPdcBadge(totalScore);

    return {
      scorePart1,
      shanghaisPart1,
      dartsThrownPart1,
      scorePart2,
      doublesHit,
      dartsThrownPart2,
      scorePart3,
      shanghaisPart3,
      dartsThrownPart3,
      totalScore,
      totalDartsThrown,
      totalShanghais,
      badge,
    };
  };

  const p1Stats = useMemo(() => calculatePlayerStats(stateP1), [stateP1]);
  const p2Stats = useMemo(() => calculatePlayerStats(stateP2), [stateP2]);

  const activeStats = activePlayer === 1 ? p1Stats : p2Stats;

  const isCompleted =
    gameMode === 'solo'
      ? p1Stats.totalDartsThrown >= 57
      : p1Stats.totalDartsThrown >= 57 && p2Stats.totalDartsThrown >= 57;

  const hasStarted = p1Stats.totalDartsThrown > 0 || p2Stats.totalDartsThrown > 0;
  const isGameActive = hasStarted && !isCompleted;

  // 1. Lokalen Geräte-Cache beim Start wiederherstellen
  useEffect(() => {
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && cached.stateP1) {
          setGameMode(cached.gameMode || 'solo');
          if (!isBoardUser && userPlayerMatch && cached.gameMode === 'solo') {
            setP1Name(userPlayerMatch.name);
          } else if (cached.p1Name) {
            setP1Name(cached.p1Name);
          }
          if (cached.p2Name) setP2Name(cached.p2Name);
          setStateP1(cached.stateP1);
          if (cached.stateP2) setStateP2(cached.stateP2);
          setStage(cached.stage || 'part1');
          setCurrentTargetIndex(cached.currentTargetIndex ?? 0);
          setActivePlayer(cached.activePlayer || 1);
          setNotes(cached.notes || '');
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden des PDC Caches:', e);
    } finally {
      setIsGameInitialized(true);
    }
  }, []);

  // Automatische Fixierung auf eigenen Account im Solo-Modus
  useEffect(() => {
    if (!isBoardUser && userPlayerMatch && gameMode === 'solo') {
      setP1Name(userPlayerMatch.name);
    }
  }, [gameMode, isBoardUser, userPlayerMatch]);

  // 2. Automatisches Caching auf dem Endgerät
  useEffect(() => {
    if (!isGameInitialized) return;

    if (hasStarted && !isCompleted) {
      const sessionData = {
        gameMode,
        p1Name,
        p2Name,
        stateP1,
        stateP2,
        stage,
        currentTargetIndex,
        activePlayer,
        notes,
        updatedAt: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(sessionData));
    } else if (!hasStarted) {
      localStorage.removeItem(CACHE_KEY);
    }
  }, [
    isGameInitialized,
    hasStarted,
    isCompleted,
    gameMode,
    p1Name,
    p2Name,
    stateP1,
    stateP2,
    stage,
    currentTargetIndex,
    activePlayer,
    notes,
  ]);

  // 3. Refresh-Schutz (F5, Strg+R, Tab schliessen)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGameActive) {
        e.preventDefault();
        e.returnValue =
          'Ein aktives Trainingsspiel läuft! Wenn du die Seite schließt oder neu lädst, wird das Spiel unterbrochen.';
        return e.returnValue;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGameActive) return;
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        alert(
          '⚠️ Seite neu laden (F5 / Strg+R) ist während eines laufenden Spiels gesperrt. Dein Spielstand ist sicher im lokalen Geräte-Cache!'
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGameActive]);

  // Wurf eintragen: Teil 1 oder Teil 3 (Shanghai Multiplier 0..9)
  const commitShanghaiRound = (multiplier: number, isShanghai: boolean) => {
    const isPart1 = stage === 'part1';
    const targets = isPart1 ? PART1_TARGETS : PART3_TARGETS;
    const currentTarget = targets[currentTargetIndex];

    if (isShanghai) {
      playShanghaiFanfare();
      setShanghaiNotice(`🌟 SHANGHAI AUF DIE ${currentTarget}! +100 BONUS-PUNKTE! 🌟`);
      setTimeout(() => setShanghaiNotice(null), 3500);
    } else {
      playHitSound(multiplier);
    }

    const currentState = activePlayer === 1 ? { ...stateP1 } : { ...stateP2 };
    const roundsMap = isPart1
      ? { ...currentState.part1Rounds }
      : { ...currentState.part3Rounds };

    roundsMap[currentTarget] = { multiplier, isShanghai };

    if (isPart1) {
      currentState.part1Rounds = roundsMap;
    } else {
      currentState.part3Rounds = roundsMap;
    }

    if (activePlayer === 1) {
      setStateP1(currentState);
    } else {
      setStateP2(currentState);
    }

    // Nächste Aufnahme oder nächster Spieler
    if (gameMode === '1vs1' && activePlayer === 1) {
      // Spieler 2 ist am Zug für dasselbe Target
      setActivePlayer(2);
    } else {
      // Weiter zum nächsten Target
      if (gameMode === '1vs1') setActivePlayer(1);

      if (currentTargetIndex < targets.length - 1) {
        setCurrentTargetIndex(currentTargetIndex + 1);
      } else {
        // Abschnitt abgeschlossen!
        if (isPart1) {
          setStage('part2');
          setCurrentTargetIndex(0);
        } else {
          // Spielende!
          setStage('completed');
          handleGameEnd(currentState, activePlayer === 1 ? stateP2 : currentState);
        }
      }
    }
  };

  const handleShanghaiInput = (multiplier: number) => {
    const isPart1 = stage === 'part1';
    const targets = isPart1 ? PART1_TARGETS : PART3_TARGETS;
    const currentTarget = targets[currentTargetIndex];

    // Wenn 6 eingegeben wird -> Nachfragen, ob per Shanghai geworfen
    if (multiplier === 6) {
      setShanghaiPromptTarget(currentTarget);
      return;
    }

    // Bei allen anderen Werten direkt committen
    commitShanghaiRound(multiplier, false);
  };

  // Wurf eintragen: Teil 2 (Doppelrunde)
  const handleDoubleDart = (isHit: boolean) => {
    const currentTarget = PART2_TARGETS[currentTargetIndex];
    playDoubleHitSound(currentTarget === 'Bull' && isHit);

    const currentState = activePlayer === 1 ? { ...stateP1 } : { ...stateP2 };
    const hitsMap = { ...currentState.part2Hits };
    hitsMap[currentTarget] = isHit;
    currentState.part2Hits = hitsMap;

    if (activePlayer === 1) {
      setStateP1(currentState);
    } else {
      setStateP2(currentState);
    }

    // In 1 vs 1: abwechselnd je Doppel
    if (gameMode === '1vs1' && activePlayer === 1) {
      setActivePlayer(2);
    } else {
      if (gameMode === '1vs1') setActivePlayer(1);

      if (currentTargetIndex < PART2_TARGETS.length - 1) {
        setCurrentTargetIndex(currentTargetIndex + 1);
      } else {
        // Teil 2 abgeschlossen -> Weiter zu Teil 3
        setStage('part3');
        setCurrentTargetIndex(0);
      }
    }
  };

  // Korrektur (Undo)
  const handleUndo = () => {
    if (stage === 'part1' || stage === 'part3') {
      const isPart1 = stage === 'part1';
      const targets = isPart1 ? PART1_TARGETS : PART3_TARGETS;
      const currentTarget = targets[currentTargetIndex];

      if (gameMode === '1vs1' && activePlayer === 2) {
        // Zurück zu Spieler 1 für aktuelles Target
        setActivePlayer(1);
        const newP1 = { ...stateP1 };
        const roundsMap = isPart1 ? { ...newP1.part1Rounds } : { ...newP1.part3Rounds };
        roundsMap[currentTarget] = null;
        if (isPart1) newP1.part1Rounds = roundsMap;
        else newP1.part3Rounds = roundsMap;
        setStateP1(newP1);
      } else if (currentTargetIndex > 0) {
        // Vorheriges Target
        const prevTargetIdx = currentTargetIndex - 1;
        const prevTarget = targets[prevTargetIdx];
        setCurrentTargetIndex(prevTargetIdx);

        if (gameMode === '1vs1') {
          setActivePlayer(2);
          const newP2 = { ...stateP2 };
          const roundsMap = isPart1 ? { ...newP2.part1Rounds } : { ...newP2.part3Rounds };
          roundsMap[prevTarget] = null;
          if (isPart1) newP2.part1Rounds = roundsMap;
          else newP2.part3Rounds = roundsMap;
          setStateP2(newP2);
        } else {
          const newP1 = { ...stateP1 };
          const roundsMap = isPart1 ? { ...newP1.part1Rounds } : { ...newP1.part3Rounds };
          roundsMap[prevTarget] = null;
          if (isPart1) newP1.part1Rounds = roundsMap;
          else newP1.part3Rounds = roundsMap;
          setStateP1(newP1);
        }
      } else if (!isPart1 && stage === 'part3') {
        // Von Teil 3 Anfang zurück zu Teil 2 Bull
        setStage('part2');
        setCurrentTargetIndex(PART2_TARGETS.length - 1);
        if (gameMode === '1vs1') {
          setActivePlayer(2);
          const newP2 = { ...stateP2 };
          newP2.part2Hits['Bull'] = null;
          setStateP2(newP2);
        } else {
          const newP1 = { ...stateP1 };
          newP1.part2Hits['Bull'] = null;
          setStateP1(newP1);
        }
      }
    } else if (stage === 'part2') {
      if (gameMode === '1vs1' && activePlayer === 2) {
        setActivePlayer(1);
        const currentTarget = PART2_TARGETS[currentTargetIndex];
        const newP1 = { ...stateP1 };
        newP1.part2Hits[currentTarget] = null;
        setStateP1(newP1);
      } else if (currentTargetIndex > 0) {
        const prevTargetIdx = currentTargetIndex - 1;
        const prevTarget = PART2_TARGETS[prevTargetIdx];
        setCurrentTargetIndex(prevTargetIdx);

        if (gameMode === '1vs1') {
          setActivePlayer(2);
          const newP2 = { ...stateP2 };
          newP2.part2Hits[prevTarget] = null;
          setStateP2(newP2);
        } else {
          const newP1 = { ...stateP1 };
          newP1.part2Hits[prevTarget] = null;
          setStateP1(newP1);
        }
      } else {
        // Von Teil 2 D1 zurück zu Teil 1 Target 15
        setStage('part1');
        setCurrentTargetIndex(PART1_TARGETS.length - 1);
        if (gameMode === '1vs1') {
          setActivePlayer(2);
          const newP2 = { ...stateP2 };
          newP2.part1Rounds[15] = null;
          setStateP2(newP2);
        } else {
          const newP1 = { ...stateP1 };
          newP1.part1Rounds[15] = null;
          setStateP1(newP1);
        }
      }
    }
  };

  // Speichern in Supabase
  const saveSession = async (customP1 = stateP1, customP2 = stateP2) => {
    const stats1 = calculatePlayerStats(customP1);
    const stats2 = calculatePlayerStats(customP2);

    const p1Id = players.find((p) => p.name === p1Name)?.id || null;
    const p2Id = players.find((p) => p.name === p2Name)?.id || null;
    const sessionId = 'pdc_' + Date.now();
    const dateStr = new Date().toISOString();

    const buildPayload = (
      pName: string,
      pId: number | null,
      oppName: string | null,
      stats: ReturnType<typeof calculatePlayerStats>,
      isWin: number
    ): PdcChallengeSessionData => ({
      session_id: sessionId,
      player_id: pId,
      player_name: pName,
      opponent_name: oppName,
      game_mode: gameMode,
      training_date: dateStr,
      score_part1: stats.scorePart1,
      score_part2: stats.scorePart2,
      score_part3: stats.scorePart3,
      total_score: stats.totalScore,
      shanghai_count: stats.totalShanghais,
      doubles_hit: stats.doublesHit,
      badge_color: stats.badge.name,
      notes,
      is_winner: isWin,
      is_aborted: 0,
    });

    let sessionsToSave: PdcChallengeSessionData[] = [];
    if (gameMode === 'solo') {
      sessionsToSave.push(buildPayload(p1Name, p1Id, null, stats1, 0));
    } else {
      const w1 = stats1.totalScore > stats2.totalScore ? 1 : stats1.totalScore === stats2.totalScore ? -1 : 0;
      const w2 = stats2.totalScore > stats1.totalScore ? 1 : stats1.totalScore === stats2.totalScore ? -1 : 0;
      sessionsToSave.push(buildPayload(p1Name, p1Id, p2Name, stats1, w1));
      sessionsToSave.push(buildPayload(p2Name, p2Id, p1Name, stats2, w2));
    }

    setSaveStatus('Speichere PDC Challenge in Supabase...');
    const res = await savePdcChallengeAction(sessionsToSave);

    if (res.success) {
      localStorage.removeItem(CACHE_KEY);
      setSaveStatus('✅ Erfolgreich in Supabase Cloud gespeichert!');
      setTimeout(() => setSaveStatus(null), 4000);
      setHistory((prev) => [
        ...sessionsToSave.map((s) => ({
          ...s,
          is_aborted: 0,
          created_at: new Date().toISOString(),
        })),
        ...prev,
      ]);
    } else {
      setSaveStatus('⚠️ Fehler beim Speichern: ' + res.error);
    }
  };

  const handleGameEnd = (p1State: PlayerGameState, p2State: PlayerGameState) => {
    setActiveTab('summary');
    if (confirm('🎉 PDC Challenge abgeschlossen! Möchtest du dein Ergebnis jetzt direkt in der Cloud-Datenbank (Supabase) speichern?')) {
      saveSession(p1State, p2State);
    }
  };

  // Sichere Navigation bei laufendem Spiel
  const handleSafeNavigation = async (targetUrl: string) => {
    if (isGameActive) {
      if (!confirm('Möchtest du das aktuelle Spiel wirklich abbrechen?')) return;

      await recordAbortedPdcAction({
        player_name: p1Name,
        opponent_name: gameMode === '1vs1' ? p2Name : null,
        game_mode: gameMode,
        current_score: p1Stats.totalScore,
        part1_score: p1Stats.scorePart1,
        part2_score: p1Stats.scorePart2,
        part3_score: p1Stats.scorePart3,
        reason: 'Vorzeitige Navigation / Seite verlassen',
      });

      localStorage.removeItem(CACHE_KEY);
    }
    router.push(targetUrl);
  };

  // Spiel zurücksetzen
  const resetGame = async () => {
    if (isGameActive) {
      if (!confirm('Möchtest du das aktuelle Spiel wirklich abbrechen?')) return;

      await recordAbortedPdcAction({
        player_name: p1Name,
        opponent_name: gameMode === '1vs1' ? p2Name : null,
        game_mode: gameMode,
        current_score: p1Stats.totalScore,
        part1_score: p1Stats.scorePart1,
        part2_score: p1Stats.scorePart2,
        part3_score: p1Stats.scorePart3,
        reason: 'Manueller Abbruch über "Neu" Button',
      });
    }

    localStorage.removeItem(CACHE_KEY);
    setStateP1(createInitialPlayerState());
    setStateP2(createInitialPlayerState());
    setStage('part1');
    setCurrentTargetIndex(0);
    setActivePlayer(1);
    setShanghaiPromptTarget(null);
    setNotes('');
    setSaveStatus(null);
    setActiveTab('game');
  };

  // Aktuelles Target Label
  const currentTargetLabel = useMemo(() => {
    if (stage === 'part1') return `${PART1_TARGETS[currentTargetIndex]}`;
    if (stage === 'part2') return `${PART2_TARGETS[currentTargetIndex]}`;
    if (stage === 'part3') return `${PART3_TARGETS[currentTargetIndex]}`;
    return 'Fertig';
  }, [stage, currentTargetIndex]);

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-5 animate-fadeIn">
      {/* SHANGHAI FRAGE MODAL (wenn 6 eingegeben wird) */}
      {shanghaiPromptTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 via-[#0d172e] to-slate-950 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl shadow-amber-500/30">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30">
              🌟
            </div>

            <div>
              <span className="text-xs uppercase font-black tracking-widest text-amber-400">
                Aufnahme-Prüfung auf die {shanghaiPromptTarget}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                6 Treffer erzielt!
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Wurde die 6 per <strong>Shanghai</strong> geworfen?
                <br />
                <span className="text-xs text-amber-300 font-semibold">
                  (Genau 1x Single, 1x Double und 1x Triple = +100 Bonus-Punkte)
                </span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setShanghaiPromptTarget(null);
                  commitShanghaiRound(6, true);
                }}
                className="py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 font-black text-sm sm:text-base flex flex-col items-center justify-center gap-1 shadow-xl shadow-amber-500/30 cursor-pointer"
              >
                <span>🌟 Ja, Shanghai!</span>
                <span className="text-xs font-mono text-slate-900 font-bold">
                  +{shanghaiPromptTarget * 6 + 100} Punkte
                </span>
              </button>

              <button
                onClick={() => {
                  setShanghaiPromptTarget(null);
                  commitShanghaiRound(6, false);
                }}
                className="py-4 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border-2 border-slate-600 text-white font-black text-sm sm:text-base flex flex-col items-center justify-center gap-1 shadow-lg cursor-pointer"
              >
                <span>❌ Nein, reguläre 6</span>
                <span className="text-xs font-mono text-slate-300">
                  +{shanghaiPromptTarget * 6} Punkte
                </span>
              </button>
            </div>

            <button
              onClick={() => setShanghaiPromptTarget(null)}
              className="text-xs text-slate-400 hover:text-white underline pt-2 cursor-pointer"
            >
              Abbrechen / Wurf korrigieren
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSafeNavigation('/training')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zurück zur Trainingsauswahl</span>
          </button>

          <div>
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" /> PDC Training Routine
            </span>
            <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>🎯</span> PDC Challenge (57 Darts)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? 'Sound aktiviert' : 'Sound stummgeschaltet'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <Link
            href="/training/pdc-challenge/live"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="TV Live-Board öffnen"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV Live-Board</span>
          </Link>

          <button
            onClick={resetGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Neu</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('game')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'game'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Wurf-Board</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'summary'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Übersicht & Abzeichen</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'leaderboard'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Bestenliste</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>📜</span>
          <span>Historie ({history.length})</span>
        </button>
      </div>

      {/* Speichern Status Toast */}
      {saveStatus && (
        <div className="p-3 bg-amber-950/80 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-200 text-center animate-bounce">
          {saveStatus}
        </div>
      )}

      {/* Shanghai Fanfare Toast */}
      {shanghaiNotice && (
        <div className="p-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-2 border-white rounded-2xl text-slate-950 font-black text-center text-sm sm:text-base shadow-2xl shadow-amber-500/50 animate-pulse">
          {shanghaiNotice}
        </div>
      )}

      {/* MODE & PLAYER SELECTION */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-white/5">
            <button
              disabled={hasStarted}
              onClick={() => setGameMode('solo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                gameMode === 'solo'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              } ${hasStarted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Solo-Modus</span>
            </button>

            <button
              disabled={hasStarted}
              onClick={() => setGameMode('1vs1')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                gameMode === '1vs1'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              } ${hasStarted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>1 vs 1 Duell</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Fortschritt:</span>
            <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/40">
              {p1Stats.totalDartsThrown} / 57 Darts
            </span>
          </div>
        </div>

        {/* Players Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Spieler 1 */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              activePlayer === 1 && gameMode === '1vs1'
                ? 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-500/30'
                : 'bg-slate-950/60 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Spieler 1 {gameMode === 'solo' && '(Du)'}
              </span>
              <span className="font-mono font-black text-amber-300 text-sm">
                {p1Stats.totalScore} Pkt
              </span>
            </div>

            {gameMode === 'solo' && !isBoardUser && userPlayerMatch ? (
              <div className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white">
                {p1Name} <span className="text-[10px] text-slate-400">(Angemeldet)</span>
              </div>
            ) : (
              <select
                disabled={hasStarted}
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400 disabled:opacity-60 cursor-pointer"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.team})
                  </option>
                ))}
              </select>
            )}

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Abzeichen:</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${p1Stats.badge.badgeClass}`}>
                {p1Stats.badge.name}
              </span>
            </div>
          </div>

          {/* Spieler 2 */}
          {gameMode === '1vs1' && (
            <div
              className={`p-3 rounded-xl border transition-all ${
                activePlayer === 2
                  ? 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-500/30'
                  : 'bg-slate-950/60 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Spieler 2 (Gegner)
                </span>
                <span className="font-mono font-black text-cyan-300 text-sm">
                  {p2Stats.totalScore} Pkt
                </span>
              </div>

              <select
                disabled={hasStarted}
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400 disabled:opacity-60 cursor-pointer"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.team})
                  </option>
                ))}
              </select>

              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Abzeichen:</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${p2Stats.badge.badgeClass}`}>
                  {p2Stats.badge.name}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: BOARD / WURFBOARD */}
      {activeTab === 'game' && (
        <div className="space-y-5">
          {/* Section Progress Stepper */}
          <div className="grid grid-cols-3 gap-2">
            <div
              className={`p-3 rounded-xl border transition-all ${
                stage === 'part1'
                  ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                  : p1Stats.dartsThrownPart1 >= 18
                  ? 'bg-slate-900/60 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900/40 border-white/5 text-slate-500'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider">Teil 1 (18 Darts)</div>
              <div className="text-xs sm:text-sm font-black text-white">Shanghai 10–15</div>
              <div className="text-[11px] font-mono mt-1 text-slate-400">
                Score: <span className="text-amber-400 font-bold">{activeStats.scorePart1}</span>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border transition-all ${
                stage === 'part2'
                  ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                  : p1Stats.dartsThrownPart2 >= 21
                  ? 'bg-slate-900/60 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900/40 border-white/5 text-slate-500'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider">Teil 2 (21 Darts)</div>
              <div className="text-xs sm:text-sm font-black text-white">Doppel D1–D20 + Bull</div>
              <div className="text-[11px] font-mono mt-1 text-slate-400">
                Score: <span className="text-amber-400 font-bold">{activeStats.scorePart2}</span> ({activeStats.doublesHit}/21)
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border transition-all ${
                stage === 'part3'
                  ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                  : p1Stats.dartsThrownPart3 >= 18
                  ? 'bg-slate-900/60 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900/40 border-white/5 text-slate-500'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider">Teil 3 (18 Darts)</div>
              <div className="text-xs sm:text-sm font-black text-white">Shanghai 15–20</div>
              <div className="text-[11px] font-mono mt-1 text-slate-400">
                Score: <span className="text-amber-400 font-bold">{activeStats.scorePart3}</span>
              </div>
            </div>
          </div>

          {/* AKTIVER WURFBEREICH */}
          {stage !== 'completed' ? (
            <div className="bg-gradient-to-b from-[#0b162c] via-[#09142b] to-[#060e1f] border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
              {/* Header Target Display */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    {gameMode === '1vs1' ? (
                      <span>Am Board: {activePlayer === 1 ? p1Name : p2Name}</span>
                    ) : (
                      <span>Aktives Ziel (3 Darts)</span>
                    )}
                  </div>
                  <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-1">
                    🎯 Ziel: <span className="text-amber-400 font-mono">{currentTargetLabel}</span>
                  </div>
                </div>

                {/* Live Badge Preview Card */}
                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-center sm:text-right min-w-[180px]">
                  <div className="text-[10px] text-slate-400 uppercase font-black">Aktueller Score</div>
                  <div className="text-2xl font-black text-amber-300 font-mono">
                    {activeStats.totalScore} Pkt
                  </div>
                  <div className="mt-1 flex items-center justify-center sm:justify-end gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${activeStats.badge.badgeClass}`}>
                      {activeStats.badge.name}
                    </span>
                    {activeStats.badge.nextThreshold && (
                      <span className="text-[10px] text-slate-400">
                        ({activeStats.badge.nextThreshold - activeStats.totalScore} Pkt bis nächste Stufe)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* STAGE 1 & 3: SHANGHAI WURFBEREICH (EINGABE DER ANZAHL 0 BIS 9) */}
              {(stage === 'part1' || stage === 'part3') && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-xs uppercase font-bold text-slate-400">
                      Aufnahme mit 3 Darts auf die {currentTargetLabel}
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white">
                      Wie viele Treffer wurden mit den 3 Darts erzielt?
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                      Wähle die Summe der Treffer (Multiplikatoren: Single = 1, Double = 2, Triple = 3).
                      <br />
                      <span className="text-amber-300 font-bold">
                        Bei 6 Treffern fragt das System nach Shanghai (+100 Bonus)!
                      </span>
                    </p>
                  </div>

                  {/* 10 Button Grid (0 bis 9) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 max-w-2xl mx-auto pt-2">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => {
                      const targetNum = Number(currentTargetLabel);
                      const basePts = val * targetNum;
                      const isSix = val === 6;

                      let btnStyle =
                        val === 0
                          ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300'
                          : isSix
                          ? 'bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 border-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                          : val >= 7
                          ? 'bg-purple-900/60 hover:bg-purple-800 border-purple-500/50 text-purple-200'
                          : val >= 4
                          ? 'bg-blue-900/60 hover:bg-blue-800 border-blue-500/50 text-blue-200'
                          : 'bg-emerald-900/60 hover:bg-emerald-800 border-emerald-500/50 text-emerald-200';

                      return (
                        <button
                          key={val}
                          onClick={() => handleShanghaiInput(val)}
                          className={`py-3.5 sm:py-4 px-2 rounded-2xl border-2 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${btnStyle}`}
                        >
                          <div className="flex items-center gap-1 text-lg sm:text-2xl font-black">
                            <span>{val}</span>
                            {isSix && <span className="text-xs">🌟</span>}
                          </div>
                          <div
                            className={`text-[10px] font-mono font-bold ${
                              isSix ? 'text-slate-950' : 'text-slate-300'
                            }`}
                          >
                            {basePts} Pkt
                          </div>
                          {isSix ? (
                            <div className="text-[9px] uppercase font-black text-slate-950 bg-yellow-300 px-1.5 py-0.2 rounded mt-0.5">
                              Shanghai?
                            </div>
                          ) : (
                            <div className="text-[9px] text-slate-400">
                              {val === 0 ? 'Fehlwurf' : `${val}x`}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STAGE 2: DOPPELRUNDE (D1-D20 + BULL) */}
              {stage === 'part2' && (
                <div className="space-y-6">
                  {/* Timeline der 21 Doppel */}
                  <div className="overflow-x-auto pb-2">
                    <div className="flex items-center gap-1.5 min-w-max justify-center">
                      {PART2_TARGETS.map((t, idx) => {
                        const currentState = activePlayer === 1 ? stateP1 : stateP2;
                        const hit = currentState.part2Hits[t];
                        const isCur = currentTargetIndex === idx;

                        let style = 'bg-slate-900 border-slate-700 text-slate-500';
                        if (hit === true) {
                          style = 'bg-emerald-600 border-emerald-400 text-white font-black shadow-md shadow-emerald-500/30';
                        } else if (hit === false) {
                          style = 'bg-red-950/60 border-red-800 text-red-400';
                        } else if (isCur) {
                          style = 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300 scale-110';
                        }

                        return (
                          <div
                            key={t}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${style}`}
                          >
                            {t === 'Bull' ? 'B' : t.replace('D', '')}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 text-center text-xs text-slate-300">
                    {currentTargetLabel === 'Bull' ? (
                      <span>🎯 <strong>Bullseye (Inner Bull / Rot):</strong> Genau 1 Dart! Treffer = <strong>100 Punkte</strong>.</span>
                    ) : (
                      <span>🎯 <strong>{currentTargetLabel}:</strong> Genau 1 Dart auf dieses Doppel! Treffer = <strong>50 Punkte</strong>.</span>
                    )}
                  </div>

                  {/* Action Buttons Doppel */}
                  <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
                    <button
                      onClick={() => handleDoubleDart(false)}
                      className="py-6 px-4 rounded-3xl bg-slate-800 hover:bg-slate-700 active:scale-95 border-2 border-slate-700 text-slate-200 font-black text-lg transition-all shadow-xl cursor-pointer flex flex-col items-center justify-center gap-1"
                    >
                      <span className="text-2xl">❌</span>
                      <span>Daneben</span>
                      <span className="text-xs font-mono text-slate-400">0 Punkte</span>
                    </button>

                    <button
                      onClick={() => handleDoubleDart(true)}
                      className="py-6 px-4 rounded-3xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 border-2 border-emerald-400 text-white font-black text-lg transition-all shadow-xl shadow-emerald-900/40 cursor-pointer flex flex-col items-center justify-center gap-1"
                    >
                      <span className="text-2xl">🎯</span>
                      <span>TREFFER!</span>
                      <span className="text-xs font-mono text-emerald-200">
                        +{currentTargetLabel === 'Bull' ? 100 : 50} Punkte
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Undo & Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Letzte Aufnahme korrigieren</span>
                </button>

                <div className="text-slate-400 text-[11px]">
                  Darts geworfen: <strong className="text-white">{activeStats.totalDartsThrown} / 57</strong>
                </div>
              </div>
            </div>
          ) : (
            /* GAME COMPLETED CELEBRATION CARD */
            <div className="bg-gradient-to-b from-[#0e1e3e] via-[#09142b] to-[#060e1f] border-2 border-amber-400 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/30">
                🏆
              </div>

              <div>
                <span className="text-xs uppercase font-black tracking-widest text-amber-400">
                  Herzlichen Glückwunsch!
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                  PDC Challenge abgeschlossen!
                </h2>
                <p className="text-slate-300 text-sm mt-2 max-w-md mx-auto">
                  Du hast alle 57 Darts geworfen. Hier ist deine offizielle Leistungsbewertung!
                </p>
              </div>

              {/* Score & Badge Highlight */}
              <div className="max-w-md mx-auto bg-slate-900/90 border border-white/10 rounded-2xl p-6 space-y-3">
                <div className="text-xs uppercase font-bold text-slate-400">Erreichte Gesamtpunktzahl</div>
                <div className="text-5xl font-black text-amber-300 font-mono">
                  {p1Stats.totalScore}
                </div>
                <div>
                  <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-black ${p1Stats.badge.badgeClass}`}>
                    {p1Stats.badge.name}es Abzeichen
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => saveSession()}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>In Supabase Cloud speichern</span>
                </button>

                <button
                  onClick={resetGame}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Neues Spiel starten</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUMMARY & BADGES */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Badge Matrix Reference */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-white">
                Offizielle PDC / JDC Leistungsabzeichen-Skala
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { name: 'Weiß', range: '0–149 Pkt', class: 'bg-slate-200 text-slate-900 border border-white' },
                { name: 'Lila', range: '150–299 Pkt', class: 'bg-purple-600 text-white' },
                { name: 'Gelb', range: '300–449 Pkt', class: 'bg-yellow-500 text-slate-950' },
                { name: 'Grün', range: '450–599 Pkt', class: 'bg-emerald-600 text-white' },
                { name: 'Blau', range: '600–699 Pkt', class: 'bg-blue-600 text-white' },
                { name: 'Rot', range: '700–849 Pkt', class: 'bg-red-600 text-white' },
                { name: 'Schwarz', range: '850–1249 Pkt', class: 'bg-slate-900 text-white border border-slate-600' },
                { name: 'Gold', range: '1250+ Pkt', class: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black' },
              ].map((b) => (
                <div
                  key={b.name}
                  className={`p-3 rounded-xl border border-white/5 flex flex-col justify-between ${
                    p1Stats.badge.name === b.name ? 'ring-2 ring-amber-400 bg-amber-500/10' : 'bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">{b.name}</span>
                    <span className={`w-3 h-3 rounded-full ${b.class}`} />
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-400 mt-2">
                    {b.range}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detaillierte Punkte-Tabelle Spieler 1 */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-black text-white flex items-center justify-between">
              <span>📊 Wurf-Analyse: {p1Name}</span>
              <span className="text-amber-400 font-mono">{p1Stats.totalScore} Punkte</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400">Teil 1 (Shanghai 10–15):</span>
                <div className="text-lg font-black text-white font-mono mt-1">
                  {p1Stats.scorePart1} Pkt
                </div>
                <div className="text-[11px] text-amber-400">
                  {p1Stats.shanghaisPart1}x Shanghai Bonus
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400">Teil 2 (Doppel D1–D20 + Bull):</span>
                <div className="text-lg font-black text-white font-mono mt-1">
                  {p1Stats.scorePart2} Pkt
                </div>
                <div className="text-[11px] text-emerald-400">
                  {p1Stats.doublesHit} von 21 Doppeln getroffen
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400">Teil 3 (Shanghai 15–20):</span>
                <div className="text-lg font-black text-white font-mono mt-1">
                  {p1Stats.scorePart3} Pkt
                </div>
                <div className="text-[11px] text-amber-400">
                  {p1Stats.shanghaisPart3}x Shanghai Bonus
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-white">
                PDC Challenge Vereins-Bestenliste
              </h3>
            </div>
            <Link
              href="/training/pdc-challenge/live"
              target="_blank"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>Vollbild TV-Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Noch keine Spiele in der Bestenliste eingetragen. Schließe deine erste PDC Challenge ab!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 px-3">Rang</th>
                    <th className="py-2.5 px-3">Spieler</th>
                    <th className="py-2.5 px-3 text-right">Highscore</th>
                    <th className="py-2.5 px-3 text-center">Abzeichen</th>
                    <th className="py-2.5 px-3 text-right">Spiele</th>
                    <th className="py-2.5 px-3 text-right">Ø Punkte</th>
                    <th className="py-2.5 px-3 text-right">Shanghais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {leaderboard.map((row) => {
                    const badge = getPdcBadge(row.best_score);
                    return (
                      <tr key={row.player_name} className="hover:bg-white/5">
                        <td className="py-2.5 px-3 font-bold text-amber-400">
                          #{row.rank}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          {row.player_name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-300">
                          {row.best_score}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-black ${badge.badgeClass}`}>
                            {badge.name}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {row.sessions_count}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {row.avg_score}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-400">
                          {row.total_shanghais}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>📜</span> Historie aller Spiele
            </h3>
            <span className="text-xs text-slate-400">{history.length} Einträge</span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Noch keine gespeicherten Spiele vorhanden.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => {
                const badge = getPdcBadge(h.total_score);
                const isAborted = Boolean(h.is_aborted);
                return (
                  <div
                    key={h.id || i}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs ${
                      isAborted
                        ? 'bg-red-950/20 border-red-800/40 opacity-75'
                        : 'bg-slate-950/60 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-sm">{h.player_name}</span>
                      {h.opponent_name && (
                        <span className="text-slate-400 text-xs">vs. {h.opponent_name}</span>
                      )}
                      {isAborted && (
                        <span className="px-2 py-0.5 rounded bg-red-900/60 text-red-300 text-[10px] font-bold">
                          Abgebrochen
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="font-black text-amber-300 text-sm">
                        {h.total_score} Pkt
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${badge.badgeClass}`}>
                        {badge.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {h.training_date ? new Date(h.training_date).toLocaleDateString('de-DE') : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
