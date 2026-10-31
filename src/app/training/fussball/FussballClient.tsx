'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import { 
  ComputerDifficulty, DIFFICULTY_CONFIGS, FussballSessionSavePayload 
} from './types';
import { saveFussballSessionAction } from './actions';
import { 
  ArrowLeft, Volume2, VolumeX, RotateCcw, Save, Trophy, 
  HelpCircle, Sparkles, RefreshCw, CheckCircle2, Bot, User, Users, Flame
} from 'lucide-react';

interface FussballClientProps {
  players: Player[];
  initialHistory: any[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

interface ShotRecord {
  dartNum: number;
  type: 'bull_hit' | 'bull_miss' | 'goal' | 'goal_miss';
  label: string;
  prevBallPossession?: 1 | 2 | null;
  prevP1Goals?: number;
  prevP2Goals?: number;
  prevStats?: {
    p1Darts: number; p1BullAttempts: number; p1BullHits: number; p1DoubleAttempts: number; p1DoubleHits: number;
    p2Darts: number; p2BullAttempts: number; p2BullHits: number; p2DoubleAttempts: number; p2DoubleHits: number;
  };
}

interface TurnHistory {
  playerNum: 1 | 2;
  shots: ShotRecord[];
  prevBallPossession: 1 | 2 | null;
  prevP1Goals: number;
  prevP2Goals: number;
}

const OFFLINE_QUEUE_KEY = 'lions_fussball_offline_queue';
const ACTIVE_GAME_KEY = 'lions_fussball_active_game';
const LOCAL_HISTORY_KEY = 'lions_fussball_local_history';

function enqueueOfflineSession(payloads: FussballSessionSavePayload[]) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: FussballSessionSavePayload[][] = raw ? JSON.parse(raw) : [];
    queue.push(payloads);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Fehler beim Einreihen in Offline-Queue:', e);
  }
}

function saveCompletedSessionToLocalArchive(payloads: FussballSessionSavePayload[]) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    const history: FussballSessionSavePayload[] = raw ? JSON.parse(raw) : [];
    const updated = [...payloads, ...history].slice(0, 50);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {}
}

function clearActiveGameCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_GAME_KEY);
  } catch (e) {}
}

export default function FussballClient({ players, initialHistory, currentUser }: FussballClientProps) {
  const isBoardUser = Boolean(currentUser?.name && currentUser.name.toLowerCase().startsWith('board'));
  const userPlayerMatch = players.find(
    (p) => p.name.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
  );
  const defaultPlayerName = !isBoardUser && userPlayerMatch ? userPlayerMatch.name : (players[0]?.name || 'Sebastian Kirste');
  // Setup State
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<'1vs1' | '1vsComputer'>('1vsComputer');
  const [p1Name, setP1Name] = useState<string>(defaultPlayerName);
  const [p2Name, setP2Name] = useState<string>(players[1]?.name || 'Dirk Ostermann');
  const [computerDifficulty, setComputerDifficulty] = useState<ComputerDifficulty>('bezirksliga');
  const [targetGoals, setTargetGoals] = useState<number>(5);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Arretierung von Spieler 1 im 1vsComputer-Modus auf den angemeldeten Benutzer
  useEffect(() => {
    if (gameMode === '1vsComputer' && !isBoardUser && userPlayerMatch) {
      setP1Name(userPlayerMatch.name);
    }
  }, [gameMode, isBoardUser, userPlayerMatch]);

  // In-Game State
  const [p1Goals, setP1Goals] = useState<number>(0);
  const [p2Goals, setP2Goals] = useState<number>(0);
  const [ballPossession, setBallPossession] = useState<1 | 2 | null>(null);
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1); // 1 = P1, 2 = P2/Computer
  const [currentDart, setCurrentDart] = useState<1 | 2 | 3>(1);
  const [currentTurnShots, setCurrentTurnShots] = useState<ShotRecord[]>([]);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [tickerMessage, setTickerMessage] = useState<string>('Anpfiff! Wirf auf Bull, um den Ball zu erobern.');
  const [tickerHistory, setTickerHistory] = useState<string[]>([]);
  
  // Statistiken
  const [stats, setStats] = useState({
    p1Darts: 0, p1BullAttempts: 0, p1BullHits: 0, p1DoubleAttempts: 0, p1DoubleHits: 0,
    p2Darts: 0, p2BullAttempts: 0, p2BullHits: 0, p2DoubleAttempts: 0, p2DoubleHits: 0,
  });

  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Touch-Cooldown zur Verhinderung von Ghost-Clicks auf "Match abbrechen" nach Sofortiger Revanche
  const rematchCooldownRef = useRef<boolean>(false);

  // Auto-Sync von Offline-Spielen bei Wiederverbindung / Start
  const syncOfflineQueue = async () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return;
      const queue: FussballSessionSavePayload[][] = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      const remaining: FussballSessionSavePayload[][] = [];
      for (const item of queue) {
        try {
          const res = await saveFussballSessionAction(item);
          if (!res || !res.success) {
            remaining.push(item);
          }
        } catch (e) {
          remaining.push(item);
        }
      }

      if (remaining.length === 0) {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
      } else {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      }
    } catch (e) {
      console.error('Fehler bei Offline-Sync:', e);
    }
  };

  useEffect(() => {
    syncOfflineQueue();
    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const [historyStack, setHistoryStack] = useState<TurnHistory[]>([]);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Aktiven Spielstand im Cache sichern (Schutz vor versehentlichem Tab-Schließen)
  useEffect(() => {
    if (isGameStarted && !gameOver && (stats.p1Darts > 0 || stats.p2Darts > 0)) {
      try {
        localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify({
          gameMode,
          p1Name,
          p2Name,
          computerDifficulty,
          targetGoals,
          p1Goals,
          p2Goals,
          ballPossession,
          currentTurn,
          currentDart,
          stats,
          updatedAt: Date.now()
        }));
      } catch (e) {}
    }
  }, [isGameStarted, gameOver, stats, p1Goals, p2Goals, ballPossession, currentTurn, currentDart, gameMode, p1Name, p2Name, computerDifficulty, targetGoals]);

  // Sound Synthesizer (Web Audio API)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playTone = (freq: number, type: OscillatorType = 'sine', duration: number = 0.1, delay: number = 0) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }, delay);
    } catch (e) {}
  };

  // Sound: Balleroberung (Pfeifen-Triller)
  const playWhistle = () => {
    playTone(1200, 'triangle', 0.08, 0);
    playTone(1500, 'triangle', 0.12, 90);
  };

  // Sound: Tor-Jubel
  const playGoalSound = () => {
    playTone(523.25, 'triangle', 0.12, 0);   // C5
    playTone(659.25, 'triangle', 0.12, 110); // E5
    playTone(783.99, 'triangle', 0.15, 220); // G5
    playTone(1046.50, 'triangle', 0.35, 340); // C6
  };

  // Sound: Schlusspfiff (Spielende)
  const playGameOverSound = () => {
    playTone(1200, 'triangle', 0.15, 0);
    playTone(1200, 'triangle', 0.15, 200);
    playTone(1500, 'triangle', 0.45, 400);
  };

  // Sound: Fehlwurf
  const playMissSound = () => {
    playTone(180, 'sawtooth', 0.12, 0);
  };

  // Ticker hinzufügen
  const addTicker = (msg: string) => {
    setTickerMessage(msg);
    setTickerHistory(prev => [msg, ...prev.slice(0, 15)]);
  };

  // Match abbrechen
  const handleAbortMatch = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Blockiere Touch-Bleed-through / Ghost-Clicks direkt nach "Sofortige Revanche"
    if (rematchCooldownRef.current) return;

    // Wenn noch kein Dart geworfen wurde, sofort ohne Bestätigung abbrechen
    if (stats.p1Darts === 0 && stats.p2Darts === 0) {
      clearActiveGameCache();
      setIsGameStarted(false);
      return;
    }

    if (confirm('Möchtest du das laufende Spiel wirklich abbrechen? Der bisherige Spielstand geht verloren.')) {
      clearActiveGameCache();
      setIsGameStarted(false);
    }
  };

  // Spiel starten
  const handleStartGame = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // 600ms Schutzzeit gegen versehentliches Auslösen von Elementen an derselben Touch-Position
    rematchCooldownRef.current = true;
    setTimeout(() => {
      rematchCooldownRef.current = false;
    }, 600);

    clearActiveGameCache();
    setIsGameStarted(true);
    setP1Goals(0);
    setP2Goals(0);
    setBallPossession(null);
    setCurrentTurn(1);
    setCurrentDart(1);
    setCurrentTurnShots([]);
    setGameOver(false);
    setWinner(null);
    setHistoryStack([]);
    setSaveStatus(null);
    const initialStats = {
      p1Darts: 0, p1BullAttempts: 0, p1BullHits: 0, p1DoubleAttempts: 0, p1DoubleHits: 0,
      p2Darts: 0, p2BullAttempts: 0, p2BullHits: 0, p2DoubleAttempts: 0, p2DoubleHits: 0,
    };
    setStats(initialStats);
    statsRef.current = initialStats;
    playWhistle();
    addTicker(`Anpfiff! Erstes Team bei ${targetGoals} Toren gewinnt. ${p1Name} hat die 1. Aufnahme.`);
  };

  // Spielername für Anzeige
  const getP2DisplayName = () => {
    if (gameMode === '1vsComputer') {
      const cfg = DIFFICULTY_CONFIGS[computerDifficulty];
      return `Computer (${cfg.name})`;
    }
    return p2Name;
  };

  // Dart eintragen (Menschlicher Spieler)
  const recordDartAction = (actionType: 'bull_hit' | 'bull_miss' | 'goal' | 'goal_miss') => {
    if (gameOver || isBotThinking) return;

    const isP1 = currentTurn === 1;
    const activeName = isP1 ? p1Name : getP2DisplayName();

    // Snapshots VOR diesem Wurf sichern (für exaktes Undo)
    const prevBallPossession = ballPossession;
    const prevP1Goals = p1Goals;
    const prevP2Goals = p2Goals;
    const prevStats = { ...stats };

    let newBallPossession = ballPossession;
    let newP1Goals = p1Goals;
    let newP2Goals = p2Goals;
    let shotLabel = '';

    // Stats aktualisieren
    const newStats = { ...statsRef.current };
    if (isP1) {
      newStats.p1Darts += 1;
      if (actionType === 'bull_hit' || actionType === 'bull_miss') {
        newStats.p1BullAttempts += 1;
        if (actionType === 'bull_hit') newStats.p1BullHits += 1;
      } else {
        newStats.p1DoubleAttempts += 1;
        if (actionType === 'goal') newStats.p1DoubleHits += 1;
      }
    } else {
      newStats.p2Darts += 1;
      if (actionType === 'bull_hit' || actionType === 'bull_miss') {
        newStats.p2BullAttempts += 1;
        if (actionType === 'bull_hit') newStats.p2BullHits += 1;
      } else {
        newStats.p2DoubleAttempts += 1;
        if (actionType === 'goal') newStats.p2DoubleHits += 1;
      }
    }
    statsRef.current = newStats;
    setStats(newStats);

    if (actionType === 'bull_hit') {
      playWhistle();
      newBallPossession = currentTurn;
      setBallPossession(currentTurn);
      shotLabel = '🎯 Bull (Ball geholt!)';
      addTicker(`⚽ Balleroberung! ${activeName} trifft Bull und hat jetzt den Ball!`);
    } else if (actionType === 'bull_miss') {
      playMissSound();
      shotLabel = '❌ Kein Bull';
      addTicker(`${activeName} verfehlt Bull. Ball bleibt beim Gegner / frei.`);
    } else if (actionType === 'goal') {
      playGoalSound();
      shotLabel = '⚽ TOR!';
      if (isP1) {
        newP1Goals += 1;
        setP1Goals(newP1Goals);
      } else {
        newP2Goals += 1;
        setP2Goals(newP2Goals);
      }
      addTicker(`🥅 TOOOOOOR! ${activeName} trifft das Doppel! Spielstand: ${newP1Goals}:${newP2Goals}`);
    } else if (actionType === 'goal_miss') {
      playMissSound();
      shotLabel = '❌ Daneben';
      addTicker(`${activeName} verzieht am Doppel. Ballbesitz bleibt aber erhalten!`);
    }

    const shotRecord: ShotRecord = {
      dartNum: currentDart,
      type: actionType,
      label: shotLabel,
      prevBallPossession,
      prevP1Goals,
      prevP2Goals,
      prevStats
    };

    const newShots = [...currentTurnShots, shotRecord];
    setCurrentTurnShots(newShots);

    // Prüfen, ob Spiel gewonnen ist
    if (newP1Goals >= targetGoals) {
      endGame(1, newP1Goals, newP2Goals, newStats);
      return;
    }
    if (newP2Goals >= targetGoals) {
      endGame(2, newP1Goals, newP2Goals, newStats);
      return;
    }

    // Nächster Dart oder Rundenwechsel
    if (currentDart < 3) {
      setCurrentDart((currentDart + 1) as 1 | 2 | 3);
    } else {
      // Aufnahme beendet -> Rundenwechsel
      finishTurn(newShots, newBallPossession, newP1Goals, newP2Goals);
    }
  };

  // Aufnahme abschließen & Spielerwechsel
  const finishTurn = (shots: ShotRecord[], currentPossession: 1 | 2 | null, curP1G: number, curP2G: number) => {
    const nextPlayer: 1 | 2 = currentTurn === 1 ? 2 : 1;

    // History für Undo sichern
    setHistoryStack(prev => [{
      playerNum: currentTurn,
      shots,
      prevBallPossession: ballPossession,
      prevP1Goals: curP1G,
      prevP2Goals: curP2G
    }, ...prev]);

    setCurrentTurn(nextPlayer);
    setCurrentDart(1);
    setCurrentTurnShots([]);

    const nextName = nextPlayer === 1 ? p1Name : getP2DisplayName();
    const hasBall = currentPossession === nextPlayer;
    if (hasBall) {
      addTicker(`Spielerwechsel: ${nextName} ist dran und hat den Ball! Sofort 3 Darts auf Doppel!`);
    } else {
      addTicker(`Spielerwechsel: ${nextName} ist dran und muss auf Bull werfen, um den Ball zu erobern.`);
    }

    // Falls Computer an der Reihe ist -> Bot ausführen!
    if (gameMode === '1vsComputer' && nextPlayer === 2) {
      executeBotTurn(currentPossession, curP1G, curP2G);
    }
  };

  // Computer KI Wurf-Logik
  const executeBotTurn = async (initialPossession: 1 | 2 | null, currentP1G: number, currentP2G: number) => {
    setIsBotThinking(true);
    const cfg = DIFFICULTY_CONFIGS[computerDifficulty];
    const botName = `Computer (${cfg.name})`;

    let botPossession = initialPossession;
    let bP1G = currentP1G;
    let bP2G = currentP2G;
    let botShots: ShotRecord[] = [];

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    for (let dart = 1; dart <= 3; dart++) {
      await delay(700);

      const hasBall = botPossession === 2;
      let action: 'bull_hit' | 'bull_miss' | 'goal' | 'goal_miss' = 'bull_miss';
      let label = '';

      if (!hasBall) {
        // Muss auf Bull werfen
        const roll = Math.random();
        if (roll < cfg.bullChance) {
          action = 'bull_hit';
          label = '🎯 Bull (Ball geholt!)';
          botPossession = 2;
          setBallPossession(2);
          playWhistle();
          addTicker(`⚽ ${botName} trifft Bull und erobert den Ball!`);
        } else {
          action = 'bull_miss';
          label = '❌ Kein Bull';
          playMissSound();
          addTicker(`${botName} wirft auf Bull... verfehlt!`);
        }
      } else {
        // Hat den Ball -> schießt auf Doppel
        const roll = Math.random();
        if (roll < cfg.doubleChance) {
          action = 'goal';
          label = '⚽ TOR!';
          bP2G += 1;
          setP2Goals(bP2G);
          playGoalSound();
          addTicker(`🥅 TOOOOOOR für ${botName}! Neuer Spielstand: ${bP1G}:${bP2G}`);
        } else {
          action = 'goal_miss';
          label = '❌ Daneben';
          playMissSound();
          addTicker(`${botName} schießt aufs Doppel... knapp daneben! Ballbesitz bleibt.`);
        }
      }

      botShots.push({ dartNum: dart, type: action, label });
      setCurrentTurnShots([...botShots]);
      setCurrentDart((Math.min(dart + 1, 3)) as 1 | 2 | 3);

      // Stats für Bot updaten
      const botUpdatedStats = {
        ...statsRef.current,
        p2Darts: statsRef.current.p2Darts + 1,
        p2BullAttempts: statsRef.current.p2BullAttempts + (action === 'bull_hit' || action === 'bull_miss' ? 1 : 0),
        p2BullHits: statsRef.current.p2BullHits + (action === 'bull_hit' ? 1 : 0),
        p2DoubleAttempts: statsRef.current.p2DoubleAttempts + (action === 'goal' || action === 'goal_miss' ? 1 : 0),
        p2DoubleHits: statsRef.current.p2DoubleHits + (action === 'goal' ? 1 : 0),
      };
      statsRef.current = botUpdatedStats;
      setStats(botUpdatedStats);

      // Gewonnen?
      if (bP2G >= targetGoals) {
        setIsBotThinking(false);
        endGame(2, bP1G, bP2G, botUpdatedStats);
        return;
      }
    }

    await delay(500);
    setIsBotThinking(false);
    setCurrentTurn(1);
    setCurrentDart(1);
    setCurrentTurnShots([]);

    const p1HasBall = botPossession === 1;
    if (p1HasBall) {
      addTicker(`Du bist wieder dran (${p1Name})! Du hast noch den Ballbesitz! Feuere auf Doppel!`);
    } else {
      addTicker(`Du bist wieder dran (${p1Name})! Hol dir den Ball mit Bull / Bullseye zurück.`);
    }
  };

  // Spielende
  const endGame = async (winningPlayer: 1 | 2, finalP1G: number, finalP2G: number, passedStats?: typeof stats) => {
    const finalStats = passedStats || statsRef.current;
    clearActiveGameCache();
    setGameOver(true);
    setWinner(winningPlayer);
    playGameOverSound();

    const winnerName = winningPlayer === 1 ? p1Name : getP2DisplayName();
    addTicker(`🏆 ABPFIFF! ${winnerName} gewinnt das Fußball-Match mit ${finalP1G}:${finalP2G}!`);

    // Automatisch in Supabase Cloud speichern
    const sessionId = 'fussball_' + Date.now();
    const dateStr = new Date().toISOString();
    const p1PlayerObj = players.find(p => p.name === p1Name);
    const p2PlayerObj = players.find(p => p.name === p2Name);

    const p1Payload: FussballSessionSavePayload = {
      session_id: sessionId,
      player_id: p1PlayerObj?.id || null,
      player_name: p1Name,
      opponent_name: getP2DisplayName(),
      is_computer: gameMode === '1vsComputer' ? 1 : 0,
      computer_level: gameMode === '1vsComputer' ? DIFFICULTY_CONFIGS[computerDifficulty].name : null,
      game_mode: gameMode,
      target_goals: targetGoals,
      goals_scored: finalP1G,
      goals_conceded: finalP2G,
      darts_thrown: finalStats.p1Darts,
      bull_hits: finalStats.p1BullHits,
      bull_attempts: finalStats.p1BullAttempts,
      double_hits: finalStats.p1DoubleHits,
      double_attempts: finalStats.p1DoubleAttempts,
      is_winner: winningPlayer === 1 ? 1 : 0,
      training_date: dateStr
    };

    let payloads: FussballSessionSavePayload[] = [p1Payload];

    if (gameMode === '1vs1') {
      const p2Payload: FussballSessionSavePayload = {
        session_id: sessionId,
        player_id: p2PlayerObj?.id || null,
        player_name: p2Name,
        opponent_name: p1Name,
        is_computer: 0,
        computer_level: null,
        game_mode: '1vs1',
        target_goals: targetGoals,
        goals_scored: finalP2G,
        goals_conceded: finalP1G,
        darts_thrown: finalStats.p2Darts,
        bull_hits: finalStats.p2BullHits,
        bull_attempts: finalStats.p2BullAttempts,
        double_hits: finalStats.p2DoubleHits,
        double_attempts: finalStats.p2DoubleAttempts,
        is_winner: winningPlayer === 2 ? 1 : 0,
        training_date: dateStr
      };
      payloads.push(p2Payload);
    }

    // 1. Immer lokal im Browser sichern (Ausfallsicherheit)
    saveCompletedSessionToLocalArchive(payloads);

    setSaveStatus('Speichere Ergebnis automatisch in Supabase Cloud...');
    try {
      const res = await saveFussballSessionAction(payloads);
      if (res && res.success) {
        if (targetGoals >= 5) {
          setSaveStatus('✅ Spiel in Supabase Cloud gespeichert & für das Leistungsranking gewertet!');
        } else {
          setSaveStatus('ℹ️ Warm-up Spiel abgeschlossen (nicht im Leistungsranking gewertet, da unter 5 Toren).');
        }
      } else {
        enqueueOfflineSession(payloads);
        setSaveStatus('💾 Spiel lokal im Browser gesichert! Wird synchronisiert, sobald wieder Verbindung besteht.');
      }
    } catch (err) {
      enqueueOfflineSession(payloads);
      setSaveStatus('💾 Offline-Modus: Spiel lokal gesichert! Automatische Synchronisation bei Internetverbindung.');
    }
  };

  // Wurf rückgängig machen (Undo - setzt Ballbesitz, Tore & Stats exakt zurück)
  const handleUndo = () => {
    if (gameOver || isBotThinking) return;

    if (currentTurnShots.length > 0) {
      // 1. Wurf innerhalb der aktuellen Aufnahme rückgängig machen
      const lastShot = currentTurnShots[currentTurnShots.length - 1];

      setCurrentTurnShots(prev => prev.slice(0, -1));
      setCurrentDart(lastShot.dartNum as 1 | 2 | 3);

      // Ballbesitz komplett auf den Zustand VOR diesem Wurf zurücksetzen!
      if (lastShot.prevBallPossession !== undefined) {
        setBallPossession(lastShot.prevBallPossession);
      }
      if (lastShot.prevP1Goals !== undefined) {
        setP1Goals(lastShot.prevP1Goals);
      }
      if (lastShot.prevP2Goals !== undefined) {
        setP2Goals(lastShot.prevP2Goals);
      }
      if (lastShot.prevStats) {
        statsRef.current = lastShot.prevStats;
        setStats(lastShot.prevStats);
      }

      addTicker(`Dart ${lastShot.dartNum} rückgängig gemacht (Eingabe zurückgesetzt).`);
    } else if (historyStack.length > 0) {
      // 2. Wenn noch kein Dart in der neuen Aufnahme geworfen wurde, vorherige Aufnahme zurückholen (1vs1 & 1vsComputer)
      const lastTurn = historyStack[0];
      setHistoryStack(prev => prev.slice(1));

      setCurrentTurn(lastTurn.playerNum);
      const remainingShots = lastTurn.shots.slice(0, -1);
      const undoneShot = lastTurn.shots[lastTurn.shots.length - 1];

      setCurrentTurnShots(remainingShots);
      setCurrentDart(lastTurn.shots.length as 1 | 2 | 3);

      if (undoneShot.prevBallPossession !== undefined) {
        setBallPossession(undoneShot.prevBallPossession);
      }
      if (undoneShot.prevP1Goals !== undefined) {
        setP1Goals(undoneShot.prevP1Goals);
      }
      if (undoneShot.prevP2Goals !== undefined) {
        setP2Goals(undoneShot.prevP2Goals);
      }
      if (undoneShot.prevStats) {
        statsRef.current = undoneShot.prevStats;
        setStats(undoneShot.prevStats);
      }

      const prevPlayerName = lastTurn.playerNum === 1 ? p1Name : p2Name;
      addTicker(`Aufnahme von ${prevPlayerName} zurückgeholt (Dart ${lastTurn.shots.length}).`);
    }
  };

  // Status-Checks für aktuellen Werfer
  const isCurrentP1 = currentTurn === 1;
  const currentWerferName = isCurrentP1 ? p1Name : getP2DisplayName();
  const currentWerferHasBall = ballPossession === currentTurn;

  return (
    <div className="w-full max-w-4xl overflow-x-hidden mx-auto px-2 sm:px-4 py-4 space-y-4 select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <Link
          href="/training"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Trainingsmenü</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            ⚽
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-2">
              Fußball Darts Battle
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400">Hol dir den Ball mit Bull • Schieß Tore über Doppel</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Sound"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Spielregeln"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </div>

      {/* SETUP SCREEN (VOR DEM ANPFIFF) */}
      {!isGameStarted ? (
        <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">
              Match-Konfiguration
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Bereit für den Anpfiff?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Triff <strong>Single Bull (25)</strong> oder <strong>Bullseye (50)</strong>, um in Ballbesitz zu kommen. Danach zählt jedes getroffene <strong>Doppel</strong> als Tor!
            </p>
          </div>

          {/* Modus Auswahl */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Spielmodus
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameMode('1vsComputer')}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  gameMode === '1vsComputer'
                    ? 'bg-emerald-950/80 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white scale-[1.02]'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-6 h-6 text-emerald-400" />
                <span className="font-black text-sm">1 vs. Computer</span>
                <span className="text-[10px] text-slate-400">Mit 5 Schwierigkeitsstufen</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('1vs1')}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  gameMode === '1vs1'
                    ? 'bg-blue-950/80 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] text-white scale-[1.02]'
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-6 h-6 text-blue-400" />
                <span className="font-black text-sm">1 vs. 1 Duell</span>
                <span className="text-[10px] text-slate-400">Gegen Teamkollegen am Board</span>
              </button>
            </div>
          </div>

          {/* Spieler Auswahl */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                  Spieler 1 (Heimteam)
                </label>
                {gameMode === '1vsComputer' && !isBoardUser && userPlayerMatch && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    ✓ Angemeldet
                  </span>
                )}
              </div>
              {gameMode === '1vsComputer' && !isBoardUser && userPlayerMatch ? (
                <div className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white flex items-center justify-between shadow-inner">
                  <span className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
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
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  {players.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.team})</option>
                  ))}
                </select>
              )}
            </div>

            {gameMode === '1vs1' ? (
              <div>
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1.5">
                  Spieler 2 (Gastteam)
                </label>
                <select
                  value={p2Name}
                  onChange={(e) => setP2Name(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-amber-500"
                >
                  {players.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.team})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                  Computer-Schwierigkeit
                </label>
                <select
                  value={computerDifficulty}
                  onChange={(e) => setComputerDifficulty(e.target.value as ComputerDifficulty)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-500"
                >
                  {(Object.keys(DIFFICULTY_CONFIGS) as ComputerDifficulty[]).map(key => {
                    const cfg = DIFFICULTY_CONFIGS[key];
                    return (
                      <option key={key} value={key}>
                        {cfg.badge} • {cfg.name} (Bull: {Math.round(cfg.bullChance * 100)}% / Doppel: {Math.round(cfg.doubleChance * 100)}%)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Computer-Stufen Vorschau wenn Bot gewählt */}
          {gameMode === '1vsComputer' && (
            <div className="bg-slate-950/70 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-300">Ausgewählte KI-Stufe:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {DIFFICULTY_CONFIGS[computerDifficulty].badge}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {DIFFICULTY_CONFIGS[computerDifficulty].description}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] font-mono">
                <div className="bg-slate-900 p-2 rounded-lg border border-white/5">
                  <span className="text-slate-500 block">Bull-Quote (Balleroberung):</span>
                  <span className="text-white font-bold text-sm">
                    {Math.round(DIFFICULTY_CONFIGS[computerDifficulty].bullChance * 100)} %
                  </span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-white/5">
                  <span className="text-slate-500 block">Doppel-Quote (Torabschluss):</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {Math.round(DIFFICULTY_CONFIGS[computerDifficulty].doubleChance * 100)} %
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Ziel-Tore */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Ziel-Tore zum Sieg
              </label>
              <span className="text-[11px] text-amber-400 font-bold">
                ⭐ Offizielles Vereins-Ranking ab mindestens 5 Toren!
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[3, 5, 7, 10].map(val => {
                const isRanking = val >= 5;
                const isSelected = targetGoals === val;

                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTargetGoals(val)}
                    className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-2 border-emerald-300 text-slate-950 font-black shadow-lg shadow-emerald-500/30 scale-105'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base font-black">{val} Tore</span>
                    <span className={`text-[10px] font-bold ${
                      isSelected
                        ? 'text-slate-950'
                        : isRanking
                        ? 'text-emerald-400'
                        : 'text-zinc-500'
                    }`}>
                      {isRanking ? '✓ Ranking-Wertung' : 'Warm-up / Fun (kein Ranking)'}
                    </span>
                  </button>
                );
              })}
            </div>
            {targetGoals < 5 && (
              <p className="text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5">
                ⚠️ <strong>Hinweis Warm-up:</strong> Ein Spiel auf 3 Tore gilt als kurzes Warm-up und wird <strong>nicht</strong> in das offizielle Leistungsranking bzw. die Monatsverlosung aufgenommen. Wähle mindestens 5 Tore für die Ranglistenwertung.
              </p>
            )}
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartGame}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>⚽</span>
            <span>ANPFIFF! MATCH STARTEN</span>
          </button>
        </div>
      ) : (

        /* ================= SPIEL-BILDSCHIRM (LIVE MATCH) ================= */
        <div className="space-y-4">
          
          {/* Stadion Anzeigetafel */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl text-center relative overflow-hidden">
            {/* Hintergrund Rasen-Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/25 via-transparent to-transparent pointer-events-none" />

            {/* Scoreboard Header */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3">
              <span>Heimteam</span>
              <span className="text-emerald-400 font-mono">Erster bei {targetGoals} Toren</span>
              <span>Gastteam</span>
            </div>

            {/* Spielstand & Teams */}
            <div className="grid grid-cols-3 items-center gap-2">
              {/* Team 1 */}
              <div className="text-left flex flex-col">
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {p1Name}
                </span>
                <span className="text-[10px] text-sky-400 font-semibold">
                  {stats.p1Darts} Darts geworfen
                </span>
                {ballPossession === 1 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full w-fit mt-1 animate-pulse">
                    ⚽ IM BALLBESITZ
                  </span>
                )}
              </div>

              {/* Tore Center */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl sm:text-6xl font-black text-white font-mono drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  {p1Goals}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-600">:</span>
                <span className="text-4xl sm:text-6xl font-black text-white font-mono drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  {p2Goals}
                </span>
              </div>

              {/* Team 2 */}
              <div className="text-right flex flex-col items-end">
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {getP2DisplayName()}
                </span>
                <span className="text-[10px] text-amber-400 font-semibold">
                  {stats.p2Darts} Darts geworfen
                </span>
                {ballPossession === 2 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full w-fit mt-1 animate-pulse">
                    ⚽ IM BALLBESITZ
                  </span>
                )}
              </div>
            </div>

            {/* Ballbesitz Status Banner */}
            <div className={`mt-4 p-2.5 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 shadow-inner transition-all ${
              ballPossession === 1
                ? 'bg-blue-950/70 border-sky-500/40 text-sky-300'
                : ballPossession === 2
                ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-white/10 text-slate-400'
            }`}>
              <span>⚽</span>
              <span>
                {ballPossession === 1
                  ? `Ballbesitz: ${p1Name}`
                  : ballPossession === 2
                  ? `Ballbesitz: ${getP2DisplayName()}`
                  : 'Freier Ball! Niemand hat den Ballbesitz.'}
              </span>
            </div>
          </div>

          {/* Aktuelle Aufnahme & Darts (Dart 1, Dart 2, Dart 3) */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Aktuell am Board
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span className="text-emerald-400">🎯</span>
                  <span>{currentWerferName}</span>
                  {currentWerferHasBall ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      🔥 TORSCHUSS-MODUS (DOPPEL)
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                      ⚔️ BALLEROBERUNG (BULL)
                    </span>
                  )}
                </h3>
              </div>

              {/* Darts Indikatoren */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(dartNum => {
                  const shot = currentTurnShots.find(s => s.dartNum === dartNum);
                  const isCurrent = currentDart === dartNum && !gameOver && !isBotThinking;

                  let badgeColor = 'bg-slate-800 text-slate-500 border-white/5';
                  if (shot) {
                    if (shot.type === 'goal') badgeColor = 'bg-emerald-600 text-white border-emerald-400 font-bold';
                    else if (shot.type === 'bull_hit') badgeColor = 'bg-sky-600 text-white border-sky-400 font-bold';
                    else badgeColor = 'bg-slate-700 text-slate-300 border-white/10';
                  } else if (isCurrent) {
                    badgeColor = 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/50 scale-105';
                  }

                  return (
                    <div
                      key={dartNum}
                      className={`px-3 py-2 rounded-xl border text-center text-xs transition-all ${badgeColor}`}
                    >
                      <span className="text-[9px] opacity-75 block">Dart {dartNum}</span>
                      <span className="font-bold text-xs">
                        {shot ? (shot.type === 'goal' ? '⚽ TOR' : shot.type === 'bull_hit' ? '🎯 BULL' : '❌ FEHL') : `Wurf ${dartNum}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* INTERAKTIVE WURF-BUTTONS */}
            {!gameOver ? (
              isBotThinking ? (
                /* Computer wirft gerade */
                <div className="py-8 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-white/5 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl mx-auto">
                    🤖
                  </div>
                  <div className="text-sm font-black text-white">
                    {getP2DisplayName()} wirft Dart {currentDart} von 3...
                  </div>
                  <p className="text-xs text-slate-400">
                    {ballPossession === 2 ? 'Computer schießt auf Doppel!' : 'Computer zielt auf Bull für Balleroberung...'}
                  </p>
                </div>
              ) : (
                /* Mensch wirft */
                <div className="space-y-3">
                  <div className="text-center text-xs font-bold text-slate-300">
                    {currentWerferHasBall ? (
                      <span className="text-emerald-400">
                        🔥 Du hast den Ball! Triff ein beliebiges Doppel für ein TOR!
                      </span>
                    ) : (
                      <span className="text-amber-400">
                        ⚠️ Du musst erst Bull (25 oder 50) treffen, um den Ball zu holen!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {currentWerferHasBall ? (
                      /* Buttons wenn im Ballbesitz -> Doppel */
                      <>
                        <button
                          type="button"
                          onClick={() => recordDartAction('goal')}
                          className="py-6 rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border-2 border-emerald-400 text-white font-black text-xl flex flex-col items-center justify-center gap-1 shadow-xl shadow-emerald-900/40 active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="text-3xl">⚽</span>
                          <span>TOOOOOOR!</span>
                          <span className="text-[10px] text-emerald-200 uppercase tracking-widest font-bold">
                            Beliebiges Doppel getroffen
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => recordDartAction('goal_miss')}
                          className="py-6 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-slate-600 text-slate-300 font-bold text-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="text-2xl">❌</span>
                          <span>Daneben</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                            Ballbesitz bleibt erhalten
                          </span>
                        </button>
                      </>
                    ) : (
                      /* Buttons wenn NICHT im Ballbesitz -> Bull */
                      <>
                        <button
                          type="button"
                          onClick={() => recordDartAction('bull_hit')}
                          className="py-6 rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 border-2 border-sky-400 text-white font-black text-xl flex flex-col items-center justify-center gap-1 shadow-xl shadow-sky-900/40 active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="text-3xl">🎯</span>
                          <span>BULL GETROFFEN!</span>
                          <span className="text-[10px] text-sky-200 uppercase tracking-widest font-bold">
                            Ball geholt! Sofort Torchance!
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => recordDartAction('bull_miss')}
                          className="py-6 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-slate-600 text-slate-300 font-bold text-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="text-2xl">❌</span>
                          <span>Kein Bull</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                            Balleroberung verfehlt
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            ) : (
              /* Spielende Anzeige */
              <div className="py-6 text-center space-y-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto shadow-lg animate-bounce">
                  🏆
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">
                    Abpfiff & Siegerehrung
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {winner === 1 ? p1Name : getP2DisplayName()} gewinnt das Match!
                  </h3>
                  <p className="text-sm text-slate-300 mt-1 font-mono">
                    Endstand: {p1Goals} : {p2Goals}
                  </p>
                </div>

                {saveStatus && (
                  <div className="p-3 bg-slate-900/90 rounded-xl text-xs font-bold text-emerald-300 border border-emerald-500/30">
                    {saveStatus}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={(e) => handleStartGame(e)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleStartGame(e);
                    }}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer select-none"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Sofortige Revanche</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      clearActiveGameCache();
                      setIsGameStarted(false);
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all cursor-pointer select-none"
                  >
                    Neues Match konfigurieren
                  </button>
                </div>
              </div>
            )}

            {/* Live Ticker */}
            <div className="bg-slate-950/80 rounded-2xl p-3 border border-white/5 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Stadion-Ticker</span>
              </div>
              <p className="text-xs font-bold text-slate-200">
                {tickerMessage}
              </p>
            </div>

            {/* Spiel-Aktionen: Wurf korrigieren & Spiel abbrechen */}
            {!gameOver && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleAbortMatch}
                  className="px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer select-none"
                >
                  Match abbrechen
                </button>

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={
                    isBotThinking ||
                    (currentTurnShots.length === 0 && historyStack.length === 0)
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Wurf korrigieren</span>
                </button>
              </div>
            )}

          </div>

          {/* Match-Statistiken */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 space-y-2">
              <span className="font-black text-sky-400 block truncate">{p1Name}</span>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Darts gesamt:</span>
                  <span className="font-bold text-white">{stats.p1Darts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bull-Treffer:</span>
                  <span className="text-emerald-400 font-bold">
                    {stats.p1BullHits} / {stats.p1BullAttempts} ({stats.p1BullAttempts > 0 ? Math.round((stats.p1BullHits / stats.p1BullAttempts) * 100) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tore / Doppel:</span>
                  <span className="text-sky-400 font-bold">
                    {stats.p1DoubleHits} / {stats.p1DoubleAttempts} ({stats.p1DoubleAttempts > 0 ? Math.round((stats.p1DoubleHits / stats.p1DoubleAttempts) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 space-y-2 text-right">
              <span className="font-black text-amber-400 block truncate">{getP2DisplayName()}</span>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Darts gesamt:</span>
                  <span className="font-bold text-white">{stats.p2Darts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bull-Treffer:</span>
                  <span className="text-emerald-400 font-bold">
                    {stats.p2BullHits} / {stats.p2BullAttempts} ({stats.p2BullAttempts > 0 ? Math.round((stats.p2BullHits / stats.p2BullAttempts) * 100) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tore / Doppel:</span>
                  <span className="text-amber-400 font-bold">
                    {stats.p2DoubleHits} / {stats.p2DoubleAttempts} ({stats.p2DoubleAttempts > 0 ? Math.round((stats.p2DoubleHits / stats.p2DoubleAttempts) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* REGELN MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>⚽</span>
                <span>Spielregeln: Fußball</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <span className="font-black text-emerald-400 block">1. Balleroberung (Bull / Bullseye):</span>
                <p>
                  Zu Beginn hat niemand den Ball. Um in Ballbesitz zu kommen, wirfst du auf <strong>Single Bull (25)</strong> oder <strong>Bullseye (50)</strong>. Beide zählen gleich!
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <span className="font-black text-sky-400 block">2. Torschuss (Doppel-Felder):</span>
                <p>
                  Sobald du den Ball erobert hast (auch innerhalb derselben 3 Darts!), darfst du auf <strong>beliebige Doppel</strong> werfen. Jeder Doppel-Treffer zählt <strong>1 Tor</strong>!
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <span className="font-black text-amber-400 block">3. Ballbesitz behalten:</span>
                <p>
                  Du bleibst so lange im Ballbesitz, bis dein Gegner an der Reihe ist und seinerseits das Bull trifft. Verfehlst du ein Doppel, behältst du trotzdem den Ball!
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <span className="font-black text-purple-400 block">4. Spielende:</span>
                <p>
                  Wer zuerst die eingestellte Anzahl an Toren (z.B. 5 Tore) erzielt, gewinnt das Match!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
            >
              Verstanden, weiter zum Spiel!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
