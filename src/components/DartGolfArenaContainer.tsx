'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Monitor, RotateCcw, Tablet, Undo2 } from 'lucide-react';
import {
  GOLF_BOT_CONFIGS,
  GolfBotDifficulty,
  GolfGameMode,
  GolfHoleDefinition,
  GolfHolesCount,
  GolfPlayerState,
  MAX_STROKES_PER_HOLE,
  createInitialGolfPlayerState,
  generateGolfCourse,
  isValidThreeDartScore,
  simulateGolfBotVisit,
} from '@/app/special/dartsgolf/types';
import { generateSessionId } from '@/lib/liveSession';
import './dart-golf-monitor.css';

const CACHE_KEY = 'lions_active_dartsgolf_v4';

export interface GolfPlayer {
  id: string;
  playerName: string;
  initials: string;
  isBot: boolean;
  penaltyPoints: number;
  totalStrokes: number;
  currentHole: number;
  currentHoleStrokes: number;
  remainingDistance: number;
  holeFinished: boolean;
  scores: Record<number, number>;
  holedByHole: Record<number, boolean>;
}

interface GolfSnapshot {
  currentHoleIndex: number;
  activePlayerIndex: 0 | 1;
  players: [GolfPlayer, GolfPlayer];
  message: string;
  isGameFinished: boolean;
}

interface SavedGolfSession {
  version: 4;
  gameMode: GolfGameMode;
  botDifficulty: GolfBotDifficulty;
  holesCount: GolfHolesCount;
  holes: GolfHoleDefinition[];
  currentHoleIndex: number;
  activePlayerIndex: 0 | 1;
  players: [GolfPlayer, GolfPlayer];
  activeBoard: string;
  sessionId: string;
}

function formatPenalty(points: number): string {
  if (points <= 0) return '0';
  return `−${points}`;
}

interface DartGolfArenaContainerProps {
  players?: { id?: number | string; name: string }[];
  currentUser?: { name?: string; role?: string } | null;
  initialPlayerName?: string;
  initialOpponentName?: string;
}

function normalizeName(name: string): string {
  return name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function createPlayerRecord(
  id: string,
  name: string,
  isBot: boolean,
  startDistance: number
): GolfPlayer {
  return {
    id,
    playerName: name.trim() || (id === 'p1' ? 'Spieler 1' : 'Spieler 2'),
    initials: makeInitials(name),
    isBot,
    penaltyPoints: 0,
    totalStrokes: 0,
    currentHole: 1,
    currentHoleStrokes: 0,
    remainingDistance: startDistance,
    holeFinished: false,
    scores: {},
    holedByHole: {},
  };
}

function clonePlayers(list: [GolfPlayer, GolfPlayer]): [GolfPlayer, GolfPlayer] {
  return [
    { ...list[0], scores: { ...list[0].scores }, holedByHole: { ...list[0].holedByHole } },
    { ...list[1], scores: { ...list[1].scores }, holedByHole: { ...list[1].holedByHole } },
  ];
}

export function calculateRemainingDistance(remainingDistance: number, throwValue: number) {
  return Math.abs(remainingDistance - throwValue);
}

function FlagIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 21V3m0 1h10l-2.5 3L16 10H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 21h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <FlagIcon className="w-5 h-5" />
      </span>
      <div>
        <strong>DART GOLF</strong>
        <span>DARTS FUN ARENA</span>
      </div>
    </div>
  );
}

export default function DartGolfArenaContainer({
  players: rosterPlayers = [],
  currentUser,
  initialPlayerName,
  initialOpponentName,
}: DartGolfArenaContainerProps) {
  const validPlayers = useMemo(
    () => rosterPlayers.filter((p) => p.name && !p.name.startsWith('Board ')),
    [rosterPlayers]
  );

  const isBoardUser = Boolean(
    currentUser?.name && normalizeName(currentUser.name).startsWith('board')
  );

  const userPlayerMatch = useMemo(() => {
    if (!currentUser?.name) return undefined;
    const norm = normalizeName(currentUser.name);
    return validPlayers.find((p) => normalizeName(p.name) === norm);
  }, [currentUser?.name, validPlayers]);

  const lockedSoloName =
    !isBoardUser && currentUser?.name
      ? userPlayerMatch?.name || currentUser.name.trim()
      : null;

  const defaultP1 =
    lockedSoloName ||
    initialPlayerName?.trim() ||
    validPlayers[0]?.name ||
    'Spieler 1';

  const defaultP2 =
    validPlayers.find((p) => normalizeName(p.name) !== normalizeName(defaultP1))?.name ||
    initialOpponentName?.trim() ||
    'Spieler 2';

  // UI & Ansichten
  const [view, setView] = useState<'tablet' | 'monitor'>('tablet');
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);

  // Setup-Konfiguration
  const [gameMode, setGameMode] = useState<GolfGameMode>('1vsComputer');
  const [botDifficulty, setBotDifficulty] = useState<GolfBotDifficulty>('clubmeister');
  const [holesCount, setHolesCount] = useState<GolfHolesCount>(9);
  const [p1Name, setP1Name] = useState<string>(defaultP1);
  const [p2Name, setP2Name] = useState<string>(defaultP2);
  const [isGuestP1, setIsGuestP1] = useState<boolean>(
    validPlayers.length === 0 && !lockedSoloName
  );
  const [isGuestP2, setIsGuestP2] = useState<boolean>(validPlayers.length < 2);
  const [activeBoard, setActiveBoard] = useState<string>(() => {
    if (typeof window === 'undefined') return '1';
    const urlBoard = new URLSearchParams(window.location.search).get('board');
    if (urlBoard && ['1', '2', '3', '4', '5'].includes(urlBoard)) return urlBoard;
    return (
      localStorage.getItem('lions_tablet_board') ||
      localStorage.getItem('lions_active_board_dartsgolf') ||
      localStorage.getItem('lions_active_board') ||
      '1'
    );
  });

  // Strikte User-Arretierung im 1vsComputer-Modus (AGENTS.md §12.5)
  useEffect(() => {
    if (gameMode === '1vsComputer' && lockedSoloName) {
      setIsGuestP1(false);
      setP1Name(lockedSoloName);
    }
  }, [gameMode, lockedSoloName]);

  // Laufender Spielzustand
  const [holes, setHoles] = useState<GolfHoleDefinition[]>(() => generateGolfCourse(9));
  const [currentHoleIndex, setCurrentHoleIndex] = useState<number>(0);
  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const [matchPlayers, setMatchPlayers] = useState<[GolfPlayer, GolfPlayer]>(() => [
    createPlayerRecord('p1', defaultP1, false, 150),
    createPlayerRecord('p2', defaultP2, true, 150),
  ]);
  const [score, setScore] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [undoStack, setUndoStack] = useState<GolfSnapshot[]>([]);
  const [isBotThrowing, setIsBotThrowing] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>(() =>
    generateSessionId('dartsgolf', '1')
  );
  const [cachedResume, setCachedResume] = useState<SavedGolfSession | null>(null);

  const holeAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Crash- & Wisch-Schutz prüfen
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedGolfSession;
      if (
        parsed &&
        parsed.version === 4 &&
        Array.isArray(parsed.holes) &&
        parsed.holes.length >= 9 &&
        Array.isArray(parsed.players) &&
        parsed.players.length === 2
      ) {
        setCachedResume(parsed);
      }
    } catch {}
  }, []);

  // Atomare Sicherung im localStorage während eines aktiven Spiels
  useEffect(() => {
    if (!isGameStarted) return;
    try {
      if (isGameFinished) {
        localStorage.removeItem(CACHE_KEY);
      } else {
        const payload: SavedGolfSession = {
          version: 4,
          gameMode,
          botDifficulty,
          holesCount,
          holes,
          currentHoleIndex,
          activePlayerIndex,
          players: matchPlayers,
          activeBoard,
          sessionId,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      }
    } catch {}
  }, [
    isGameStarted,
    isGameFinished,
    gameMode,
    botDifficulty,
    holesCount,
    holes,
    currentHoleIndex,
    activePlayerIndex,
    matchPlayers,
    activeBoard,
    sessionId,
  ]);

  useEffect(() => {
    return () => {
      if (holeAdvanceTimerRef.current) clearTimeout(holeAdvanceTimerRef.current);
    };
  }, []);

  // Live-Board-Sync (/api/live/board + BroadcastChannel)
  useEffect(() => {
    if (!isGameStarted) return;
    const toLiveState = (pl: GolfPlayer): GolfPlayerState => {
      const base = createInitialGolfPlayerState(holes[0]?.startDistance ?? 150);
      return {
        ...base,
        currentDistance: pl.remainingDistance,
        currentHoleStrokes: pl.currentHoleStrokes,
        currentHoleHoledOut: pl.holeFinished && pl.remainingDistance === 0,
        currentHolePickedUp: pl.holeFinished && pl.remainingDistance > 0,
        totalStrokes: pl.totalStrokes,
        scoreToPar: -pl.penaltyPoints,
        completedHoles: Object.entries(pl.scores).map(([holeNo, penalty]) => {
          const def = holes.find((h) => h.holeNumber === Number(holeNo));
          const par = def?.par ?? 4;
          const holed = Boolean(pl.holedByHole[Number(holeNo)]);
          return {
            holeNumber: Number(holeNo),
            par,
            startDistance: def?.startDistance ?? 150,
            strokes: penalty,
            toPar: -penalty,
            overshoots: 0,
            holedOut: holed,
            pickedUp: !holed,
            shots: [],
          };
        }),
      };
    };

    const winnerPlayer = isGameFinished
      ? matchPlayers[0].penaltyPoints < matchPlayers[1].penaltyPoints
        ? 1
        : matchPlayers[1].penaltyPoints < matchPlayers[0].penaltyPoints
        ? 2
        : ('draw' as const)
      : null;
    const winnerName =
      winnerPlayer === 1
        ? matchPlayers[0].playerName
        : winnerPlayer === 2
        ? matchPlayers[1].playerName
        : winnerPlayer === 'draw'
        ? 'Unentschieden'
        : undefined;

    const payload = {
      boardId: activeBoard,
      sessionId,
      status: isGameFinished ? ('completed' as const) : ('playing' as const),
      gameType: 'dartsgolf' as const,
      gameTitle: `Darts-Golf (${holes.length} Holes)`,
      gameMode: '1vs1',
      p1Name: matchPlayers[0].playerName,
      p2Name: matchPlayers[1].playerName,
      activePlayer: (activePlayerIndex + 1) as 1 | 2,
      currentRound: currentHoleIndex + 1,
      scoreP1: matchPlayers[0].penaltyPoints,
      scoreP2: matchPlayers[1].penaltyPoints,
      winner: winnerName,
      dartsgolfData: {
        holesCount: holes.length as GolfHolesCount,
        currentHoleIndex,
        coursePar: holes.reduce((acc, h) => acc + h.par, 0),
        holes,
        isComputer: gameMode === '1vsComputer',
        computerLevel: botDifficulty,
        p1: toLiveState(matchPlayers[0]),
        p2: toLiveState(matchPlayers[1]),
        lastAction: message
          ? {
              id: Date.now(),
              tone: 'drive' as const,
              icon: '⛳',
              headline: message,
              subline: `Loch ${currentHoleIndex + 1} von ${holes.length}`,
              actorPlayer: (activePlayerIndex + 1) as 1 | 2,
            }
          : null,
        winnerPlayer,
        winnerName: winnerName ?? null,
      },
      updatedAt: Date.now(),
    };

    try {
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
  }, [
    isGameStarted,
    isGameFinished,
    activeBoard,
    sessionId,
    holes,
    currentHoleIndex,
    activePlayerIndex,
    matchPlayers,
    gameMode,
    botDifficulty,
    message,
  ]);

  const currentHole = holes[currentHoleIndex] || holes[0];
  const activePlayer = matchPlayers[activePlayerIndex];

  const scoreNumber = Number(score);
  const isValid =
    score !== '' && Number.isInteger(scoreNumber) && isValidThreeDartScore(scoreNumber);

  const helper = useMemo(() => {
    if (isBotThrowing) {
      return `🤖 ${activePlayer.playerName} zielt auf die Fahne (${activePlayer.remainingDistance} m)...`;
    }
    if (score === '') return 'Wurfwert zwischen 0 und 180 eingeben';
    if (!isValidThreeDartScore(scoreNumber)) {
      return `⚠️ ${scoreNumber} ist kein möglicher 3-Dart-Score`;
    }
    const next = calculateRemainingDistance(activePlayer.remainingDistance, scoreNumber);
    if (next === 0) return '⛳ Perfekt – dieser Wurf locht direkt ein!';
    if (scoreNumber > activePlayer.remainingDistance) {
      return `💨 Übers Grün geflogen! Neuer Rest: ${next} Meter`;
    }
    return `Danach noch ${next} Meter bis zum Loch`;
  }, [
    isBotThrowing,
    activePlayer.playerName,
    activePlayer.remainingDistance,
    score,
    scoreNumber,
  ]);

  const handleSelectBoard = (board: string) => {
    setActiveBoard(board);
    try {
      localStorage.setItem('lions_tablet_board', board);
      localStorage.setItem('lions_active_board', board);
      localStorage.setItem('lions_active_board_dartsgolf', board);
    } catch {}
  };

  const applyShot = useCallback(
    (throwVal: number) => {
      if (!isGameStarted || isGameFinished || activePlayer.holeFinished) return;

      if (holeAdvanceTimerRef.current) {
        clearTimeout(holeAdvanceTimerRef.current);
        holeAdvanceTimerRef.current = null;
      }

      const snapshot: GolfSnapshot = {
        currentHoleIndex,
        activePlayerIndex,
        players: clonePlayers(matchPlayers),
        message,
        isGameFinished,
      };
      setUndoStack((prev) => [...prev.slice(-19), snapshot]);

      const nextList = clonePlayers(matchPlayers);
      const shooter = nextList[activePlayerIndex];
      const otherIndex: 0 | 1 = activePlayerIndex === 0 ? 1 : 0;
      const other = nextList[otherIndex];
      const hole = holes[currentHoleIndex];
      const nextStrokes = shooter.currentHoleStrokes + 1;
      const nextDistance = calculateRemainingDistance(shooter.remainingDistance, throwVal);
      const holedOut = nextDistance === 0;
      const reachedMax = !holedOut && nextStrokes >= MAX_STROKES_PER_HOLE;

      shooter.currentHoleStrokes = nextStrokes;
      shooter.remainingDistance = nextDistance;
      shooter.totalStrokes += 1;

      let statusText = `${shooter.playerName}: ${throwVal} m geworfen – noch ${nextDistance} m Rest`;
      if (throwVal > snapshot.players[activePlayerIndex].remainingDistance && !holedOut) {
        statusText = `💨 ${shooter.playerName}: Übers Grün! Neuer Rest ${nextDistance} m`;
      }

      let holeCompletedNow = false;
      let nextHoleStarter: 0 | 1 = activePlayerIndex;

      if (holedOut) {
        // Sobald ein Spieler einlocht, ist das Loch sofort beendet; Gegner erhält 1 Minuspunkt pro Restmeter
        const opponentPenalty = other.remainingDistance;
        shooter.holeFinished = true;
        shooter.scores = { ...shooter.scores, [hole.holeNumber]: 0 };
        shooter.holedByHole = { ...shooter.holedByHole, [hole.holeNumber]: true };

        other.holeFinished = true;
        other.penaltyPoints += opponentPenalty;
        other.scores = { ...other.scores, [hole.holeNumber]: opponentPenalty };
        other.holedByHole = { ...other.holedByHole, [hole.holeNumber]: false };

        holeCompletedNow = true;
        nextHoleStarter = activePlayerIndex;
        statusText = `⛳ ${shooter.playerName} locht ein! ${other.playerName} erhält ${
          opponentPenalty > 0
            ? `−${opponentPenalty} Minuspunkte (${opponentPenalty} m Rest)`
            : '0 Minuspunkte'
        }.`;
      } else if (reachedMax) {
        shooter.holeFinished = true;
        if (other.holeFinished) {
          // Beide haben Max-Schläge erreicht -> beide bekommen Restentfernung als Minuspunkte
          shooter.penaltyPoints += shooter.remainingDistance;
          shooter.scores = { ...shooter.scores, [hole.holeNumber]: shooter.remainingDistance };
          shooter.holedByHole = { ...shooter.holedByHole, [hole.holeNumber]: false };

          other.penaltyPoints += other.remainingDistance;
          other.scores = { ...other.scores, [hole.holeNumber]: other.remainingDistance };
          other.holedByHole = { ...other.holedByHole, [hole.holeNumber]: false };

          holeCompletedNow = true;
          nextHoleStarter = 0;
          statusText = `🛑 Beide erreichen Max (${MAX_STROKES_PER_HOLE} Schläge) – Restmeter als Minuspunkte gezählt.`;
        } else {
          statusText = `🛑 ${shooter.playerName} erreicht Max (${MAX_STROKES_PER_HOLE} Schläge) – ${other.playerName} wirft noch.`;
        }
      }

      setMatchPlayers(nextList);
      setScore('');
      setMessage(statusText);

      if (holeCompletedNow) {
        holeAdvanceTimerRef.current = setTimeout(() => {
          if (currentHoleIndex + 1 >= holes.length) {
            setIsGameFinished(true);
            setMessage('🏁 Runde abgeschlossen! Endstand steht fest.');
          } else {
            const nextIdx = currentHoleIndex + 1;
            const nextHoleObj = holes[nextIdx];
            setCurrentHoleIndex(nextIdx);
            setActivePlayerIndex(nextHoleStarter);
            setMatchPlayers((prev) => [
              {
                ...prev[0],
                currentHole: nextHoleObj.holeNumber,
                currentHoleStrokes: 0,
                remainingDistance: nextHoleObj.startDistance,
                holeFinished: false,
              },
              {
                ...prev[1],
                currentHole: nextHoleObj.holeNumber,
                currentHoleStrokes: 0,
                remainingDistance: nextHoleObj.startDistance,
                holeFinished: false,
              },
            ]);
            setMessage(
              `🚩 Loch ${nextHoleObj.holeNumber} (Par ${nextHoleObj.par} · ${nextHoleObj.startDistance} m)`
            );
          }
        }, 1400);
      } else if (!nextList[otherIndex].holeFinished) {
        setActivePlayerIndex(otherIndex);
      } else {
        setActivePlayerIndex(activePlayerIndex);
      }
    },
    [
      isGameStarted,
      isGameFinished,
      activePlayer.holeFinished,
      currentHoleIndex,
      activePlayerIndex,
      matchPlayers,
      message,
      holes,
    ]
  );

  // Automatischer Computer-Zug im 1vsComputer-Modus
  useEffect(() => {
    if (
      !isGameStarted ||
      isGameFinished ||
      gameMode !== '1vsComputer' ||
      activePlayerIndex !== 1 ||
      matchPlayers[0].holeFinished ||
      matchPlayers[1].holeFinished
    ) {
      setIsBotThrowing(false);
      return;
    }

    setIsBotThrowing(true);
    const timer = setTimeout(() => {
      const botShot = simulateGolfBotVisit(matchPlayers[1].remainingDistance, botDifficulty);
      setIsBotThrowing(false);
      applyShot(botShot.value);
    }, 1050);

    return () => clearTimeout(timer);
  }, [
    isGameStarted,
    isGameFinished,
    gameMode,
    activePlayerIndex,
    matchPlayers,
    botDifficulty,
    applyShot,
  ]);

  function startNewMatch() {
    if (holeAdvanceTimerRef.current) {
      clearTimeout(holeAdvanceTimerRef.current);
      holeAdvanceTimerRef.current = null;
    }
    const course = generateGolfCourse(holesCount);
    const firstDist = course[0].startDistance;
    const resolvedP1 =
      gameMode === '1vsComputer' && lockedSoloName
        ? lockedSoloName
        : p1Name.trim() || 'Spieler 1';
    const resolvedP2 =
      gameMode === '1vsComputer'
        ? `Computer (${GOLF_BOT_CONFIGS[botDifficulty].name})`
        : p2Name.trim() || 'Spieler 2';

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}

    setHoles(course);
    setCurrentHoleIndex(0);
    setActivePlayerIndex(0);
    setMatchPlayers([
      createPlayerRecord('p1', resolvedP1, false, firstDist),
      createPlayerRecord('p2', resolvedP2, gameMode === '1vsComputer', firstDist),
    ]);
    setUndoStack([]);
    setScore('');
    setIsGameFinished(false);
    setIsGameStarted(true);
    setSessionId(generateSessionId('dartsgolf', activeBoard));
    setCachedResume(null);
    setMessage(`🚩 Loch 1 (Par ${course[0].par} · ${firstDist} m) — ${resolvedP1} schlägt ab!`);
  }

  function resumeFromCache() {
    if (!cachedResume) return;
    setGameMode(cachedResume.gameMode);
    setBotDifficulty(cachedResume.botDifficulty);
    setHolesCount(cachedResume.holesCount);
    setHoles(cachedResume.holes);
    setCurrentHoleIndex(cachedResume.currentHoleIndex);
    setActivePlayerIndex(cachedResume.activePlayerIndex);
    setMatchPlayers(cachedResume.players);
    setActiveBoard(cachedResume.activeBoard || '1');
    setSessionId(cachedResume.sessionId || generateSessionId('dartsgolf', '1'));
    setIsGameFinished(false);
    setIsGameStarted(true);
    setCachedResume(null);
    setScore('');
    setMessage('Spielstand wiederhergestellt.');
  }

  function discardCache() {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setCachedResume(null);
  }

  function returnToSetup() {
    if (holeAdvanceTimerRef.current) {
      clearTimeout(holeAdvanceTimerRef.current);
      holeAdvanceTimerRef.current = null;
    }
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setIsGameStarted(false);
    setIsGameFinished(false);
    setScore('');
    setMessage('');
  }

  function undoLastShot() {
    const prev = undoStack.at(-1);
    if (!prev) return;
    if (holeAdvanceTimerRef.current) {
      clearTimeout(holeAdvanceTimerRef.current);
      holeAdvanceTimerRef.current = null;
    }
    setCurrentHoleIndex(prev.currentHoleIndex);
    setActivePlayerIndex(prev.activePlayerIndex);
    setMatchPlayers(prev.players);
    setMessage(prev.message || 'Letzter Schlag zurückgenommen.');
    setIsGameFinished(prev.isGameFinished);
    setUndoStack((stack) => stack.slice(0, -1));
    setScore('');
  }

  function addDigit(digit: string) {
    if (isBotThrowing) return;
    setMessage('');
    setScore((current) => {
      if (current === '' && digit === '0') return '0';
      const next = current === '0' ? digit : current + digit;
      return Number(next) <= 180 ? next : current;
    });
  }

  // Aktiver Scoreboard-Block (Front Nine 1–9 oder Back Nine 10–18)
  const visibleNineStart = currentHoleIndex < 9 ? 0 : 9;
  const visibleHoles = holes.slice(visibleNineStart, visibleNineStart + 9);
  const nineTitle = visibleNineStart === 0 ? 'Front Nine (1–9)' : 'Back Nine (10–18)';

  // Siegerermittlung bei Spielende (wenigste Minuspunkte gewinnen)
  const winnerText = useMemo(() => {
    if (!isGameFinished) return '';
    if (matchPlayers[0].penaltyPoints < matchPlayers[1].penaltyPoints) {
      return `🏆 ${matchPlayers[0].playerName} gewinnt (${formatPenalty(
        matchPlayers[0].penaltyPoints
      )} Minuspunkte)!`;
    }
    if (matchPlayers[1].penaltyPoints < matchPlayers[0].penaltyPoints) {
      return `🏆 ${matchPlayers[1].playerName} gewinnt (${formatPenalty(
        matchPlayers[1].penaltyPoints
      )} Minuspunkte)!`;
    }
    return `🤝 Unentschieden (${formatPenalty(matchPlayers[0].penaltyPoints)} Minuspunkte)!`;
  }, [isGameFinished, matchPlayers]);

  return (
    <div className="dart-golf-scope min-h-screen relative">
      {/* View Switcher Bar */}
      <nav className="view-switcher" aria-label="Ansicht wählen">
        <Link
          href="/special"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-400 hover:text-white text-xs font-bold mr-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Arena</span>
        </Link>
        <button
          type="button"
          className={view === 'tablet' ? 'active' : ''}
          onClick={() => setView('tablet')}
          disabled={!isGameStarted}
        >
          <span className="flex items-center gap-1.5">
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet · Oche</span>
          </span>
        </button>
        <button
          type="button"
          className={view === 'monitor' ? 'active' : ''}
          onClick={() => setView('monitor')}
          disabled={!isGameStarted}
        >
          <span className="flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5" />
            <span>Monitor · Live 16:9</span>
          </span>
        </button>
        {isGameStarted && (
          <button
            type="button"
            onClick={returnToSetup}
            className="text-amber-400 hover:text-amber-300 ml-1 px-2.5 py-1 text-xs font-bold"
            title="Zurück zur Spielerauswahl / Neues Spiel"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </nav>

      {/* =========================================================================
          ANSICHT 0: SPIELMODUS & SPIELERAUSWAHL (LOBBY)
          ========================================================================= */}
      {!isGameStarted && (
        <main className="setup-shell">
          <div className="setup-card">
            <div className="setup-card-header">
              <Brand />
              <div className="connection">
                <span /> EVENT-ARENA BEREIT
              </div>
            </div>

            <div className="setup-intro">
              <h1>Darts-Golf (9 / 18 Holes)</h1>
              <p>
                Wähle zuerst den Spielmodus und wer gegeneinander spielt, bevor das erste Loch
                eröffnet wird.
              </p>
            </div>

            <span className="setup-section-label">1. Spielmodus wählen</span>
            <div className="mode-grid">
              <button
                type="button"
                className={`mode-btn ${gameMode === '1vsComputer' ? 'active' : ''}`}
                onClick={() => setGameMode('1vsComputer')}
              >
                <strong>Single Player · Gegen Computer</strong>
                <span>Du spielst direkt gegen einen konfigurierbaren Golf-Bot</span>
              </button>
              <button
                type="button"
                className={`mode-btn ${gameMode === '1vs1' ? 'active' : ''}`}
                onClick={() => setGameMode('1vs1')}
              >
                <strong>1 vs. 1 Duell</strong>
                <span>Zwei Spieler treten abwechselnd an jedem Loch gegeneinander an</span>
              </button>
            </div>

            {gameMode === '1vsComputer' && (
              <>
                <span className="setup-section-label">2. Computer-Schwierigkeitsgrad</span>
                <div className="bot-grid">
                  {(['caddy', 'clubmeister', 'tourpro', 'legend'] as GolfBotDifficulty[]).map(
                    (diff) => {
                      const cfg = GOLF_BOT_CONFIGS[diff];
                      return (
                        <button
                          type="button"
                          key={diff}
                          className={`bot-btn ${botDifficulty === diff ? 'active' : ''}`}
                          onClick={() => setBotDifficulty(diff)}
                        >
                          <div className="bot-btn-top">
                            <strong>{cfg.name}</strong>
                            <em>{cfg.handicapLabel}</em>
                          </div>
                          <small>{cfg.subtitle}</small>
                        </button>
                      );
                    }
                  )}
                </div>
              </>
            )}

            <span className="setup-section-label">
              {gameMode === '1vsComputer' ? '3.' : '2.'} Kurs-Länge
            </span>
            <div className="holes-toggle">
              <button
                type="button"
                className={`holes-btn ${holesCount === 9 ? 'active' : ''}`}
                onClick={() => setHolesCount(9)}
              >
                ⛳ 9 Löcher (Par 36 · Kompakt)
              </button>
              <button
                type="button"
                className={`holes-btn ${holesCount === 18 ? 'active' : ''}`}
                onClick={() => setHolesCount(18)}
              >
                🏆 18 Löcher (Par 72 · Turnier)
              </button>
            </div>

            <span className="setup-section-label">
              {gameMode === '1vsComputer' ? '4.' : '3.'} Spieler-Aufstellung
            </span>
            <div className="setup-players">
              <div className="setup-field">
                <div className="setup-field-top">
                  <label htmlFor="golf-p1">Spieler 1</label>
                  {!(gameMode === '1vsComputer' && lockedSoloName) && validPlayers.length > 0 && (
                    <button
                      type="button"
                      className={`guest-toggle-btn ${isGuestP1 ? 'active' : ''}`}
                      onClick={() => setIsGuestP1((v) => !v)}
                    >
                      {isGuestP1 ? 'Aus Liste' : 'Gast'}
                    </button>
                  )}
                </div>

                {gameMode === '1vsComputer' && lockedSoloName ? (
                  <div className="locked-player-badge">
                    <span>{lockedSoloName}</span>
                    <small>✓ Angemeldet · Fest fixiert</small>
                  </div>
                ) : isGuestP1 || validPlayers.length === 0 ? (
                  <input
                    id="golf-p1"
                    value={p1Name}
                    placeholder="Name Spieler 1"
                    onChange={(e) => setP1Name(e.target.value)}
                  />
                ) : (
                  <select
                    id="golf-p1"
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                  >
                    {validPlayers.map((p) => (
                      <option key={p.id ?? p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="setup-field">
                <div className="setup-field-top">
                  <label htmlFor="golf-p2">
                    {gameMode === '1vsComputer' ? 'Gegner (Computer)' : 'Spieler 2'}
                  </label>
                  {gameMode === '1vs1' && validPlayers.length > 0 && (
                    <button
                      type="button"
                      className={`guest-toggle-btn ${isGuestP2 ? 'active' : ''}`}
                      onClick={() => setIsGuestP2((v) => !v)}
                    >
                      {isGuestP2 ? 'Aus Liste' : 'Gast'}
                    </button>
                  )}
                </div>

                {gameMode === '1vsComputer' ? (
                  <div className="locked-player-badge">
                    <span>🤖 {GOLF_BOT_CONFIGS[botDifficulty].name}</span>
                    <small>{GOLF_BOT_CONFIGS[botDifficulty].handicapLabel}</small>
                  </div>
                ) : isGuestP2 || validPlayers.length === 0 ? (
                  <input
                    id="golf-p2"
                    value={p2Name}
                    placeholder="Name Spieler 2"
                    onChange={(e) => setP2Name(e.target.value)}
                  />
                ) : (
                  <select
                    id="golf-p2"
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                  >
                    {validPlayers.map((p) => (
                      <option key={p.id ?? p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="setup-board-row">
              <span className="setup-section-label" style={{ margin: 0 }}>
                Board-Monitor
              </span>
              <div className="board-pills">
                {['1', '2', '3', '4', '5'].map((b) => (
                  <button
                    type="button"
                    key={b}
                    className={`board-pill ${activeBoard === b ? 'active' : ''}`}
                    onClick={() => handleSelectBoard(b)}
                  >
                    Board {b}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="start-match-btn" onClick={startNewMatch}>
              ⛳ Spiel starten · Loch 1 eröffnen
            </button>
          </div>
        </main>
      )}

      {/* =========================================================================
          ANSICHT 1: TABLET OCHE CONTROLLER
          ========================================================================= */}
      {isGameStarted && view === 'tablet' && (
        <main className="tablet-shell animate-fadeIn">
          <div className="portrait-tablet">
            <header className="portrait-header">
              <Brand />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undoLastShot}
                  disabled={undoStack.length === 0 || isBotThrowing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 text-xs font-bold disabled:opacity-30"
                  title="Letzten bestätigten Schlag rückgängig machen"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Schlag zurück</span>
                </button>
                <div className="connection">
                  <span /> BOARD {activeBoard}
                </div>
              </div>
            </header>

            {/* Klare 1-vs-1 / Spieler-vs-Bot Restentfernungen & Zuganzeige direkt in den Kacheln */}
            <section className="tablet-match-distances" aria-label="Aktuelle Entfernungen">
              {matchPlayers.map((pl, idx) => {
                const isAct = idx === activePlayerIndex && !isGameFinished;
                return (
                  <div
                    key={pl.id}
                    className={`tablet-player-pill ${isAct ? 'active' : ''} ${
                      pl.holeFinished && pl.remainingDistance === 0 ? 'holed' : ''
                    }`}
                  >
                    <div>
                      <div className="tablet-pill-head">
                        <small>{pl.playerName}</small>
                        {isAct && (
                          <span className="tablet-turn-badge">
                            <i className="turn-pulse" /> AM ZUG
                          </span>
                        )}
                      </div>
                      <span className="tablet-pill-meta">
                        Schlag {pl.currentHoleStrokes} · Minuspunkte:{' '}
                        {formatPenalty(pl.penaltyPoints)}
                      </span>
                    </div>
                    <strong>
                      {pl.holeFinished && pl.remainingDistance === 0
                        ? '⛳ Im Loch'
                        : `${pl.remainingDistance} m`}
                    </strong>
                  </div>
                );
              })}
            </section>

            <section className="distance-summary">
              <div className="hole-compact">
                <span>
                  LOCH {currentHole.holeNumber}/{holes.length}
                </span>
                <b>PAR {currentHole.par}</b>
              </div>
              <div className="remaining-compact">
                <span>RESTENTFERNUNG</span>
                <strong>
                  {activePlayer.remainingDistance}
                  <small>m</small>
                </strong>
              </div>
              <div className="stroke-compact">
                <span>AKTUELL</span>
                <b>SCHLAG {activePlayer.currentHoleStrokes + 1}</b>
              </div>
            </section>

            <section className="portrait-input">
              <div className="score-display score-display--valid">
                <div>
                  <small>WURFWERT (0–180)</small>
                  <span>{score || '–'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScore('')}
                  disabled={!score || isBotThrowing}
                >
                  LEEREN
                </button>
              </div>
              <p className="input-helper">{message || helper}</p>

              {/* Größere Lücke zwischen Schnellauswahl und Ziffernblock; ⌫ über der 3; 0 unten links; ✓ auf ehemaligem ⌫ */}
              <div className="key-layout">
                <div className="key-group">
                  <div className="key-group-head--quick">
                    <span className="key-label">SCHNELLAUSWAHL</span>
                  </div>
                  <div className="quick-grid">
                    {[26, 41, 45, 60, 81, 85, 95, 100, 121, 140, 160, 180].map((value) => (
                      <button
                        type="button"
                        key={value}
                        disabled={isBotThrowing || activePlayer.holeFinished}
                        onClick={() => {
                          setMessage('');
                          setScore(String(value));
                        }}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="key-group key-group--numpad">
                  <div className="key-group-head--numpad">
                    <span className="key-label">ZIFFERNBLOCK</span>
                    <button
                      type="button"
                      className="numpad-back-top"
                      aria-label="Letzte Ziffer löschen"
                      disabled={!score || isBotThrowing}
                      onClick={() => setScore((value) => value.slice(0, -1))}
                    >
                      ⌫
                    </button>
                  </div>
                  <div className="numpad">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((value) => (
                      <button
                        type="button"
                        key={value}
                        disabled={isBotThrowing || activePlayer.holeFinished}
                        onClick={() => addDigit(value)}
                      >
                        {value}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="numpad-zero"
                      disabled={isBotThrowing || activePlayer.holeFinished}
                      onClick={() => addDigit('0')}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      className="numpad-confirm"
                      aria-label="Wurfwert bestätigen"
                      disabled={!isValid || isBotThrowing || activePlayer.holeFinished}
                      onClick={() => applyShot(scoreNumber)}
                    >
                      <Check className="w-6 h-6" strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      )}

      {/* =========================================================================
          ANSICHT 2: MONITOR 16:9 LIVE ARENA
          ========================================================================= */}
      {isGameStarted && view === 'monitor' && (
        <main className="monitor-shell animate-fadeIn">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="monitor-course"
            src="/dart-golf-course.png"
            alt="Golfplatz mit Fairway und Grün"
          />
          <div className="monitor-shade" />

          <header className="monitor-header">
            <Brand />
            <div className="monitor-hole">
              LOCH {currentHole.holeNumber}/{holes.length}{' '}
              <span>
                PAR {currentHole.par} · {currentHole.startDistance} M
              </span>
            </div>
            <div className="live-badge">
              <span /> BOARD {activeBoard} · LIVE
            </div>
          </header>

          {/* Spieler 1 links, Gegner rechts direkt über dem Club Scorecard Board */}
          <div className="monitor-bottom-dock">
            <section className="monitor-players-hud" aria-label="Entfernung beider Spieler zum Loch">
              {matchPlayers.map((pl, idx) => {
                const progressPct = Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      ((currentHole.startDistance - pl.remainingDistance) /
                        Math.max(1, currentHole.startDistance)) *
                        100
                    )
                  )
                );
                const isAct = idx === activePlayerIndex && !isGameFinished;
                const holedNow = pl.holeFinished && pl.remainingDistance === 0;

                return (
                  <article
                    key={pl.id}
                    className={`monitor-player-card ${isAct ? 'active' : ''} ${
                      holedNow ? 'holed' : ''
                    }`}
                  >
                    <div className="monitor-player-top">
                      <div className="monitor-player-ident">
                        <b>0{idx + 1}</b>
                        <strong>{pl.playerName.toUpperCase()}</strong>
                      </div>
                      <span className="monitor-player-badge">
                        {holedNow ? '⛳ EINGELOCHT' : isAct ? 'AM ZUG' : 'WARTET'}
                      </span>
                    </div>

                    <div className="monitor-player-distance">
                      <div className="monitor-player-meters">
                        <strong>{holedNow ? '0 m' : pl.remainingDistance}</strong>
                        {!holedNow && <span>METER ZUM LOCH</span>}
                      </div>
                      <div className="monitor-player-meta">
                        <b>MINUSPKT: {formatPenalty(pl.penaltyPoints)}</b>
                        <span>Schlag {pl.currentHoleStrokes}</span>
                      </div>
                    </div>

                    <div className="monitor-progress-track">
                      <div
                        className="monitor-progress-fill"
                        style={{ width: `${holedNow ? 100 : progressPct}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Club-Scoreboard unten inklusive REST-Spalte & Minuspunkte */}
            <section className="scoreboard">
              <div className="scoreboard-title">
                <div>
                  <span>CLUB SCORECARD</span>
                  <strong>{nineTitle}</strong>
                </div>
                <div className="legend">
                  <i className="birdie" /> EINGELOCHT (0){' '}
                  <i className="bogey" /> MINUSPUNKTE (−1 PRO METER REST)
                </div>
              </div>

              <div className="score-table">
                <div className="score-row score-row--head">
                  <span>SPIELER</span>
                  <span>REST</span>
                  {visibleHoles.map(({ holeNumber }) => (
                    <span
                      className={holeNumber === currentHole.holeNumber ? 'current-hole' : ''}
                      key={holeNumber}
                    >
                      {holeNumber}
                    </span>
                  ))}
                  <span>GES.</span>
                </div>

                {matchPlayers.map((pl, idx) => (
                  <div
                    key={pl.id}
                    className={`score-row ${
                      activePlayerIndex === idx && !isGameFinished ? 'score-row--active' : ''
                    }`}
                  >
                    <span>
                      <b>0{idx + 1}</b>
                      <strong>{pl.playerName.toUpperCase()}</strong>
                      <small>
                        {pl.holeFinished && pl.remainingDistance === 0
                          ? 'IM LOCH'
                          : activePlayerIndex === idx
                          ? 'AM ZUG'
                          : 'WARTET'}
                      </small>
                    </span>
                    <span className="rest-col">
                      {pl.holeFinished && pl.remainingDistance === 0
                        ? '⛳ 0m'
                        : `${pl.remainingDistance} m`}
                    </span>
                    {visibleHoles.map(({ holeNumber }) => {
                      const val = pl.scores[holeNumber];
                      const holed = pl.holedByHole?.[holeNumber];
                      return (
                        <span
                          key={holeNumber}
                          className={
                            val === undefined ? '' : holed ? 'under' : val > 0 ? 'over' : ''
                          }
                        >
                          {val === undefined ? '•' : holed ? '⛳ 0' : `−${val}`}
                        </span>
                      );
                    })}
                    <span className={pl.penaltyPoints > 0 ? 'total-penalty' : 'total-under'}>
                      {formatPenalty(pl.penaltyPoints)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* Crash- & Wisch-Schutz Dialog */}
      {cachedResume && !isGameStarted && (
        <div className="golf-overlay" role="dialog" aria-modal="true">
          <div className="golf-modal">
            <span className="setup-section-label" style={{ marginTop: 0 }}>
              ⚠️ Unterbrochenes Spiel gefunden
            </span>
            <h2>Letztes Darts-Golf fortsetzen?</h2>
            <p>
              {cachedResume.players[0].playerName} ({cachedResume.players[0].remainingDistance} m)
              vs. {cachedResume.players[1].playerName} (
              {cachedResume.players[1].remainingDistance} m) · Loch{' '}
              {cachedResume.currentHoleIndex + 1} von {cachedResume.holes.length}
            </p>
            <div className="golf-modal-actions">
              <button type="button" className="golf-btn-primary" onClick={resumeFromCache}>
                ▶ Fortsetzen
              </button>
              <button type="button" className="golf-btn-secondary" onClick={discardCache}>
                ✕ Verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spielende Dialog */}
      {isGameFinished && (
        <div className="golf-overlay" role="dialog" aria-modal="true">
          <div className="golf-modal">
            <span className="setup-section-label" style={{ marginTop: 0 }}>
              ⛳ {holes.length} Löcher beendet
            </span>
            <h2>{winnerText}</h2>
            <p>
              {matchPlayers[0].playerName}: {formatPenalty(matchPlayers[0].penaltyPoints)}{' '}
              Minuspunkte ({matchPlayers[0].totalStrokes} Schläge) ·{' '}
              {matchPlayers[1].playerName}: {formatPenalty(matchPlayers[1].penaltyPoints)}{' '}
              Minuspunkte ({matchPlayers[1].totalStrokes} Schläge)
            </p>
            <div className="golf-modal-actions">
              <button type="button" className="golf-btn-primary" onClick={returnToSetup}>
                Neues Spiel einrichten
              </button>
              <button
                type="button"
                className="golf-btn-secondary"
                onClick={() => {
                  setIsGameFinished(false);
                  setView('monitor');
                }}
              >
                Scorecard ansehen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
