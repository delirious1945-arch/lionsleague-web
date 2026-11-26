'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Tv, ExternalLink } from 'lucide-react';
import { Player } from '@/lib/data';
import { UserSession } from '@/app/actions';
import {
  RALLY_ITEM_META,
  RALLY_ITEM_OPTIONS,
  RallyEventBanner,
  RallyGameMode,
  RallyItemType,
  RallyLiveState,
  RallyTargetDistance,
  RallyTeamNumber,
  applyRallyNextRunner,
  applyRallyScore,
  createInitialRallyState,
  getAutoDetectedItem,
  pruneExpiredEffects,
} from './types';
import {
  RallyIcon,
  RallyItemEffectOverlay,
  getRallyEffect,
  getRallySecondsLeft,
} from '@/components/HolographicDartsRallyCockpit';
import '@/components/HolographicDartsRallyCockpit.css';

interface DartsRallyClientProps {
  players: Player[];
  currentUser: UserSession;
}

interface SavedRallySession {
  rally: RallyLiveState;
  history: RallyLiveState[];
  controlTeam: RallyTeamNumber;
}

const STORAGE_KEY = 'lions_active_dartsrally_session_v3';

function ProgressBar({
  team,
  score,
  target,
  tone,
  concealed,
}: {
  team: string;
  score: number;
  target: number;
  tone: 'red' | 'gold';
  concealed?: boolean;
}) {
  const pct = Math.min(100, (score / Math.max(1, target)) * 100);
  return (
    <div className={`progress ${tone} ${concealed ? 'concealed' : ''}`}>
      <div className="progress-copy">
        <span>{team}</span>
        <strong>
          {concealed
            ? 'SIGNAL VERDECKT'
            : `${score.toLocaleString('de-DE')} / ${target.toLocaleString('de-DE')}`}
        </strong>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: concealed ? '100%' : `${pct}%` }}
        >
          <span className="progress-marker" />
        </div>
      </div>
    </div>
  );
}

export default function DartsRallyClient({
  players,
  currentUser,
}: DartsRallyClientProps) {
  const validPlayers = useMemo(
    () => players.filter((p) => !p.name.startsWith('Board ')),
    [players]
  );

  // Setup-Konfiguration: 2 TV-Boards für Board vs. Board
  const [boardId, setBoardId] = useState<string>('1');
  const [board1Id, setBoard1Id] = useState<string>('1');
  const [board2Id, setBoard2Id] = useState<string>('2');
  const [mode, setMode] = useState<RallyGameMode>('board_vs_board');
  const [targetDistance, setTargetDistance] = useState<RallyTargetDistance>(1000);
  const [team1Name, setTeam1Name] = useState<string>('Team Rot');
  const [team2Name, setTeam2Name] = useState<string>('Team Gold');
  const [team1Members, setTeam1Members] = useState<string[]>(() => {
    const first = currentUser?.name?.trim() || validPlayers[0]?.name || 'Spieler 1';
    const second =
      validPlayers.find((p) => p.name !== first)?.name || 'Spieler 2';
    return [first, second];
  });
  const [team2Members, setTeam2Members] = useState<string[]>(() => {
    const candidateA = validPlayers.find(
      (p) => p.name !== currentUser?.name?.trim()
    )?.name;
    const candidateB = validPlayers.find(
      (p) => p.name !== currentUser?.name?.trim() && p.name !== candidateA
    )?.name;
    return [candidateA || 'Spieler 3', candidateB || 'Spieler 4'];
  });

  const [team1Draft, setTeam1Draft] = useState<string>('');
  const [team2Draft, setTeam2Draft] = useState<string>('');

  // Laufender Spielzustand
  const [phase, setPhase] = useState<'setup' | 'racing'>('setup');
  const [rally, setRally] = useState<RallyLiveState>(() =>
    createInitialRallyState({ board1Id: '1', board2Id: '2', gameMode: 'board_vs_board' })
  );
  const [history, setHistory] = useState<RallyLiveState[]>([]);
  const [controlTeam, setControlTeam] = useState<RallyTeamNumber>(1);
  const [savedSession, setSavedSession] = useState<SavedRallySession | null>(null);

  // Radar für Tablet 2: Laufendes Rennen auf dem eigenen Board aufspüren
  const [discoveredLiveRally, setDiscoveredLiveRally] = useState<{
    serverState: RallyLiveState;
    detectedOnBoard: string;
    recommendedTeam: RallyTeamNumber;
  } | null>(null);
  const [dismissedSessionId, setDismissedSessionId] = useState<string | null>(null);

  // Eingabe & Effekte (Ausschließlich vergrößertes Numpad)
  const [scoreInput, setScoreInput] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<RallyItemType | null>(null);
  const [error, setError] = useState<string>('');
  const [now, setNow] = useState<number>(() => Date.now());
  const [effectEvent, setEffectEvent] = useState<RallyEventBanner | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  // Initiales Board & Crash-/Wisch-Schutz & URL-Parameter prüfen
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlBoard = searchParams.get('board')?.trim();
      if (urlBoard && ['1', '2', '3', '4', '5'].includes(urlBoard)) {
        setBoardId(urlBoard);
        if (urlBoard === '2') {
          setControlTeam(2);
          setBoard2Id('2');
        } else if (urlBoard === '1') {
          setControlTeam(1);
          setBoard1Id('1');
        }
      } else {
        const savedBoard = localStorage.getItem('lions_active_board');
        if (savedBoard && ['1', '2', '3', '4', '5'].includes(savedBoard)) {
          setBoardId(savedBoard);
        }
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedRallySession;
        if (parsed?.rally && parsed.rally.status === 'live' && !parsed.rally.winnerTeam) {
          setSavedSession(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {}
  }, []);

  const persistSession = useCallback(
    (nextRally: RallyLiveState, nextHistory: RallyLiveState[], nextTeam: RallyTeamNumber) => {
      try {
        if (nextRally.winnerTeam) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              rally: nextRally,
              history: nextHistory.slice(-20),
              controlTeam: nextTeam,
            })
          );
        }
      } catch {}
    },
    []
  );

  // Live-Sync an BEIDE TV-Boards bei Board vs. Board
  const syncToBoardLive = useCallback(
    async (state: RallyLiveState) => {
      try {
        const targetBoards =
          state.gameMode === 'board_vs_board'
            ? Array.from(
                new Set([state.board1Id || board1Id, state.board2Id || board2Id].filter(Boolean))
              )
            : [state.boardId || boardId];

        await Promise.all(
          targetBoards.map((bid) =>
            fetch('/api/live/board', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                boardId: bid,
                sessionId: state.sessionId,
                gameType: 'dartsrally',
                gameTitle: `Darts Rally (${state.targetDistance.toLocaleString('de-DE')} Pkt)`,
                status: state.winnerTeam ? 'completed' : 'playing',
                p1Name: state.team1.teamName,
                p2Name: state.team2.teamName,
                activePlayer: state.activeTeam,
                scoreP1: state.team1.score,
                scoreP2: state.team2.score,
                dartsrallyData: { ...state, boardId: bid },
              }),
            })
          )
        );
      } catch (err) {
        console.error('Fehler beim Live-Board-Sync von Darts Rally:', err);
      }
    },
    [board1Id, board2Id, boardId]
  );

  // 1. SETUP-RADAR: Fragt alle 1.5s ab, ob auf diesem Board bereits ein Rennen gestartet wurde (Tablet 2 Auto-Find)
  useEffect(() => {
    if (phase !== 'setup') return;
    let isCancelled = false;

    const checkLiveRadar = async () => {
      try {
        const res = await fetch(`/api/live/board?board=${boardId}&t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (
          !isCancelled &&
          data.gameType === 'dartsrally' &&
          data.status === 'playing' &&
          data.dartsrallyData
        ) {
          const srv = data.dartsrallyData as RallyLiveState;
          if (srv.sessionId && srv.sessionId !== dismissedSessionId && !srv.winnerTeam) {
            let recTeam: RallyTeamNumber = 1;
            if (srv.board2Id === boardId) {
              recTeam = 2;
            } else if (srv.board1Id === boardId) {
              recTeam = 1;
            } else {
              recTeam = boardId === '2' ? 2 : 1;
            }
            setDiscoveredLiveRally({
              serverState: srv,
              detectedOnBoard: boardId,
              recommendedTeam: recTeam,
            });
          }
        }
      } catch {}
    };

    void checkLiveRadar();
    const interval = setInterval(checkLiveRadar, 1500);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [phase, boardId, dismissedSessionId]);

  // 2. BIDIREKTIONALER LIVE-SYNC WÄHREND DES RENNENS: Fragt jede Sekunde den Server nach Updates vom gegnerischen Tablet ab
  useEffect(() => {
    if (phase !== 'racing' || rally.winnerTeam) return;
    let isCancelled = false;

    const syncFromServer = async () => {
      try {
        const targetBoard =
          controlTeam === 1
            ? (rally.board1Id || board1Id)
            : (rally.board2Id || board2Id);

        const res = await fetch(`/api/live/board?board=${targetBoard}&t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (
          !isCancelled &&
          data.gameType === 'dartsrally' &&
          data.dartsrallyData
        ) {
          const srv = data.dartsrallyData as RallyLiveState;
          if (srv.sessionId === rally.sessionId) {
            const hasServerChange =
              srv.team1.score !== rally.team1.score ||
              srv.team2.score !== rally.team2.score ||
              srv.team1.totalDartsThrown !== rally.team1.totalDartsThrown ||
              srv.team2.totalDartsThrown !== rally.team2.totalDartsThrown ||
              srv.winnerTeam !== rally.winnerTeam ||
              srv.activeTeam !== rally.activeTeam ||
              Boolean(srv.lastEvent?.id && srv.lastEvent.id !== rally.lastEvent?.id);

            if (hasServerChange) {
              setRally(srv);
              persistSession(srv, history, controlTeam);
              if (srv.lastEvent?.id && srv.lastEvent.id !== lastEventIdRef.current) {
                lastEventIdRef.current = srv.lastEvent.id;
                setEffectEvent(srv.lastEvent);
              }
            }
          }
        }
      } catch {}
    };

    const poll = setInterval(syncFromServer, 1000);
    return () => {
      isCancelled = true;
      clearInterval(poll);
    };
  }, [phase, rally, controlTeam, board1Id, board2Id, history, persistSession]);

  // 250ms-Takt für Buff-/Debuff-Countdowns
  useEffect(() => {
    if (phase !== 'racing') return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [phase]);

  // Item-Effekt-Overlay triggern
  useEffect(() => {
    const incoming = rally.lastEvent;
    if (!incoming?.id || incoming.id === lastEventIdRef.current) return;
    lastEventIdRef.current = incoming.id;
    setEffectEvent(incoming);
  }, [rally.lastEvent]);

  useEffect(() => {
    if (!effectEvent) return;
    const timer = setTimeout(() => setEffectEvent(null), 2600);
    return () => clearTimeout(timer);
  }, [effectEvent]);

  // 12s Heartbeat
  useEffect(() => {
    if (phase !== 'racing' || rally.winnerTeam) return;
    const heartbeat = setInterval(() => {
      const pruned = pruneExpiredEffects(rally, Date.now());
      void syncToBoardLive(pruned);
    }, 12000);
    return () => clearInterval(heartbeat);
  }, [phase, rally, syncToBoardLive]);

  const addMemberToTeam = (teamNum: RallyTeamNumber, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    if (teamNum === 1) {
      if (!team1Members.includes(clean)) {
        setTeam1Members((prev) => [...prev, clean]);
      }
      setTeam1Draft('');
    } else {
      if (!team2Members.includes(clean)) {
        setTeam2Members((prev) => [...prev, clean]);
      }
      setTeam2Draft('');
    }
  };

  const removeMemberFromTeam = (teamNum: RallyTeamNumber, idx: number) => {
    if (teamNum === 1) {
      if (team1Members.length <= 1) return;
      setTeam1Members((prev) => prev.filter((_, i) => i !== idx));
    } else {
      if (team2Members.length <= 1) return;
      setTeam2Members((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleStartRace = () => {
    const activeBoardForTablet =
      mode === 'board_vs_board' ? (controlTeam === 1 ? board1Id : board2Id) : boardId;

    const initial = createInitialRallyState({
      boardId: activeBoardForTablet,
      board1Id,
      board2Id,
      targetDistance,
      gameMode: mode,
      team1Name,
      team1Members,
      team2Name,
      team2Members,
    });
    lastEventIdRef.current = null;
    setEffectEvent(null);
    setRally(initial);
    setHistory([]);
    setControlTeam(1);
    setScoreInput('');
    setSelectedItem(null);
    setError('');
    setSavedSession(null);
    setPhase('racing');
    persistSession(initial, [], 1);
    void syncToBoardLive(initial);
  };

  const handleResumeSession = () => {
    if (!savedSession) return;
    lastEventIdRef.current = savedSession.rally.lastEvent?.id || null;
    setRally(savedSession.rally);
    setHistory(savedSession.history || []);
    setBoardId(savedSession.rally.boardId || '1');
    setBoard1Id(savedSession.rally.board1Id || '1');
    setBoard2Id(savedSession.rally.board2Id || '2');
    setMode(savedSession.rally.gameMode || 'board_vs_board');
    setTargetDistance(savedSession.rally.targetDistance || 1000);
    setControlTeam(savedSession.controlTeam || savedSession.rally.activeTeam || 1);
    setSavedSession(null);
    setPhase('racing');
    void syncToBoardLive(savedSession.rally);
  };

  const handleDiscardSaved = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSavedSession(null);
  };

  const handleAbortToSetup = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setPhase('setup');
    setHistory([]);
    setScoreInput('');
    setSelectedItem(null);
    setError('');
  };

  const handleJoinDiscoveredRally = (discovered: {
    serverState: RallyLiveState;
    detectedOnBoard: string;
    recommendedTeam: RallyTeamNumber;
  }) => {
    lastEventIdRef.current = discovered.serverState.lastEvent?.id || null;
    setRally(discovered.serverState);
    setHistory([]);
    setBoardId(discovered.detectedOnBoard);
    setBoard1Id(discovered.serverState.board1Id || '1');
    setBoard2Id(discovered.serverState.board2Id || '2');
    setMode(discovered.serverState.gameMode || 'board_vs_board');
    setTargetDistance(discovered.serverState.targetDistance || 1000);
    setControlTeam(discovered.recommendedTeam);
    setDiscoveredLiveRally(null);
    setPhase('racing');
    persistSession(discovered.serverState, [], discovered.recommendedTeam);
  };

  const handleDismissDiscoveredRally = (sessionId: string) => {
    setDismissedSessionId(sessionId);
    setDiscoveredLiveRally(null);
  };

  const handleRematch = () => {
    const rematch = createInitialRallyState({
      boardId: rally.boardId,
      board1Id: rally.board1Id,
      board2Id: rally.board2Id,
      targetDistance: rally.targetDistance,
      gameMode: rally.gameMode,
      team1Name: rally.team1.teamName,
      team1Members: rally.team1.members,
      team2Name: rally.team2.teamName,
      team2Members: rally.team2.members,
    });
    lastEventIdRef.current = null;
    setEffectEvent(null);
    setRally(rematch);
    setHistory([]);
    setControlTeam(1);
    setScoreInput('');
    setSelectedItem(null);
    setError('');
    persistSession(rematch, [], 1);
    void syncToBoardLive(rematch);
  };

  const effectiveTeam: RallyTeamNumber =
    rally.gameMode === 'single_board' ? rally.activeTeam : controlTeam;

  const ownTeam = effectiveTeam === 1 ? rally.team1 : rally.team2;
  const opponent = effectiveTeam === 1 ? rally.team2 : rally.team1;
  const tone = effectiveTeam === 1 ? 'red' : 'gold';

  const ausgebremst =
    getRallyEffect(ownTeam, 'ausgebremst', now) ||
    getRallyEffect(ownTeam, 'freeze', now);
  const spitzenbruch =
    getRallyEffect(ownTeam, 'spitzenbruch', now) ||
    getRallyEffect(ownTeam, 'banana', now);
  const turbo = getRallyEffect(ownTeam, 'turbo', now);
  const shield =
    getRallyEffect(ownTeam, 'schild', now) || getRallyEffect(ownTeam, 'shield', now);
  const fogOwn = Boolean(
    getRallyEffect(ownTeam, 'fog', now) || getRallyEffect(ownTeam, 'ausgebremst', now)
  );
  const fogOpponent = Boolean(
    getRallyEffect(opponent, 'fog', now) || getRallyEffect(opponent, 'ausgebremst', now)
  );
  const frozenFor = getRallySecondsLeft(ausgebremst, now);
  const activeRunner = ownTeam.members[ownTeam.activeMemberIndex] || 'Werfer';
  const inputDisabled = Boolean(ausgebremst) || Boolean(rally.winnerTeam);

  // Automatische Score-Erkennung für alle 6 Items (≥121 Turbo, 100-120 Ausgebremst, 80/90 Reifenplatzer, 26 Spitzenbruch, 50 Darttausch, Schnapszahl Schild)
  const currentTypedScore = Number(scoreInput || 0);
  const autoDetectedItem = getAutoDetectedItem(currentTypedScore);
  const activeEffectiveItem = autoDetectedItem;

  const submitScore = (explicitValue?: number) => {
    if (inputDisabled) return;
    const raw = explicitValue !== undefined ? explicitValue : Number(scoreInput || 0);
    if (!Number.isFinite(raw) || raw < 0 || raw > 180) {
      setError('Bitte einen gültigen Score zwischen 0 und 180 eingeben.');
      return;
    }
    setError('');
    const nextHistory = [...history.slice(-19), rally];
    const nextState = applyRallyScore(
      rally,
      effectiveTeam,
      raw,
      undefined,
      Date.now()
    );
    const nextControl =
      nextState.gameMode === 'single_board' ? nextState.activeTeam : controlTeam;
    setHistory(nextHistory);
    setRally(nextState);
    setControlTeam(nextControl);
    setScoreInput('');
    setSelectedItem(null);
    persistSession(nextState, nextHistory, nextControl);
    void syncToBoardLive(nextState);
  };

  const handleNextRunner = () => {
    if (inputDisabled) return;
    setError('');
    const nextHistory = [...history.slice(-19), rally];
    const nextState = applyRallyNextRunner(rally, effectiveTeam, Date.now());
    setHistory(nextHistory);
    setRally(nextState);
    persistSession(nextState, nextHistory, controlTeam);
    void syncToBoardLive(nextState);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    const nextHistory = history.slice(0, -1);
    const nextControl =
      prev.gameMode === 'single_board' ? prev.activeTeam : controlTeam;
    lastEventIdRef.current = prev.lastEvent?.id || null;
    setRally(prev);
    setHistory(nextHistory);
    setControlTeam(nextControl);
    setError('');
    persistSession(prev, nextHistory, nextControl);
    void syncToBoardLive(prev);
  };

  const addDigit = (digit: string) => {
    setError('');
    setScoreInput((prev) => {
      const candidate = prev === '0' ? digit : (prev + digit).slice(0, 3);
      if (Number(candidate) > 180) return prev;
      return candidate;
    });
  };

  return (
    <div className="dr-rally-root is-tablet forced-dark">
      {/* Oben: Kompakte Navigation */}
      <div className="dr-top-nav">
        <Link href="/special" className="dr-back-link">
          <ArrowLeft className="w-4 h-4" />
          <span>Event-Arena</span>
        </Link>

        <div className="dr-nav-actions">
          {mode === 'board_vs_board' ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/board/${board1Id}`}
                target="_blank"
                className="dr-nav-btn is-tv-link"
              >
                <Tv className="w-3.5 h-3.5 text-rose-400" />
                <span>TV 1 (Board {board1Id})</span>
              </Link>
              <Link
                href={`/board/${board2Id}`}
                target="_blank"
                className="dr-nav-btn is-tv-link"
              >
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                <span>TV 2 (Board {board2Id})</span>
              </Link>
            </div>
          ) : (
            <Link
              href={`/board/${boardId}`}
              target="_blank"
              className="dr-nav-btn is-tv-link"
            >
              <Tv className="w-4 h-4" />
              <span>TV Board {boardId}</span>
            </Link>
          )}

          {phase === 'racing' && (
            <button
              type="button"
              onClick={handleAbortToSetup}
              className="dr-nav-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Setup</span>
            </button>
          )}
        </div>
      </div>

      {phase === 'setup' ? (
        <div className="dr-setup-wrap">
          {/* Radar-Banner für Tablet 2 Auto-Join */}
          {discoveredLiveRally && (
            <div className="dr-live-radar-banner">
              <div className="radar-info">
                <span className="radar-badge">📡 LIVE-RENNEN GEFUNDEN</span>
                <h3>
                  {discoveredLiveRally.serverState.team1.teamName} (TV {discoveredLiveRally.serverState.board1Id || '1'})
                  {' '}vs.{' '}
                  {discoveredLiveRally.serverState.team2.teamName} (TV {discoveredLiveRally.serverState.board2Id || '2'})
                </h3>
                <p>
                  Ziel: {discoveredLiveRally.serverState.targetDistance.toLocaleString('de-DE')} Punkte ·{' '}
                  Stand: 🔴 {discoveredLiveRally.serverState.team1.score} : 🟡 {discoveredLiveRally.serverState.team2.score} Pkt
                </p>
              </div>
              <div className="radar-actions">
                <button
                  type="button"
                  onClick={() => handleJoinDiscoveredRally(discoveredLiveRally)}
                  className="dr-btn-radar-join"
                >
                  ▶ Als {discoveredLiveRally.recommendedTeam === 1 ? discoveredLiveRally.serverState.team1.teamName : discoveredLiveRally.serverState.team2.teamName} beitreten
                </button>
                <button
                  type="button"
                  onClick={() => handleDismissDiscoveredRally(discoveredLiveRally.serverState.sessionId)}
                  className="dr-btn-radar-dismiss"
                >
                  ✕ Ignorieren
                </button>
              </div>
            </div>
          )}

          {savedSession && (
            <div className="dr-resume-banner">
              <div>
                <small>⚠️ Unterbrochenes Rennen gefunden</small>
                <h2>
                  {savedSession.rally.team1.teamName} ({savedSession.rally.team1.score}) vs.{' '}
                  {savedSession.rally.team2.teamName} ({savedSession.rally.team2.score})
                </h2>
                <p>
                  Ziel {savedSession.rally.targetDistance.toLocaleString('de-DE')} Punkte ·{' '}
                  {savedSession.rally.gameMode === 'single_board'
                    ? `1 Board (${savedSession.rally.boardId})`
                    : `Board ${savedSession.rally.board1Id || 1} vs. Board ${savedSession.rally.board2Id || 2}`}
                </p>
              </div>
              <div className="dr-resume-actions">
                <button
                  type="button"
                  onClick={handleResumeSession}
                  className="dr-btn-resume"
                >
                  ▶ Rennen jetzt fortsetzen
                </button>
                <button
                  type="button"
                  onClick={handleDiscardSaved}
                  className="dr-btn-discard"
                >
                  ✕ Verwerfen
                </button>
              </div>
            </div>
          )}

          <div className="dr-setup-card">
            <div className="dr-setup-hero">
              <div>
                <small>LIONS WINTER SERIES · HIGHSPEED-STAFFEL</small>
                <h1>Darts Rally – Setup</h1>
              </div>
              <span className="dr-field-label">
                Renndistanz, 2 TV-Monitore &amp; Motorsport-Items
              </span>
            </div>

            <div className="dr-setup-grid">
              {/* Spielmodus */}
              <div className="dr-field-group">
                <span className="dr-field-label">Spielmodus</span>
                <div className="dr-pill-row">
                  <button
                    type="button"
                    onClick={() => setMode('board_vs_board')}
                    className={`dr-choice-btn is-gold ${
                      mode === 'board_vs_board' ? 'is-active' : ''
                    }`}
                  >
                    Board vs. Board (2 TVs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('single_board')}
                    className={`dr-choice-btn ${
                      mode === 'single_board' ? 'is-active' : ''
                    }`}
                  >
                    1 Board · Wechselnd
                  </button>
                </div>
              </div>

              {/* Renndistanz */}
              <div className="dr-field-group">
                <span className="dr-field-label">Renndistanz</span>
                <div className="dr-pill-row">
                  {([750, 1000, 1500] as RallyTargetDistance[]).map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => setTargetDistance(dist)}
                      className={`dr-choice-btn is-gold ${
                        targetDistance === dist ? 'is-active' : ''
                      }`}
                    >
                      {dist.toLocaleString('de-DE')} Pkt
                    </button>
                  ))}
                </div>
              </div>

              {/* TV-Board Zuordnung bei Board vs. Board */}
              {mode === 'board_vs_board' ? (
                <>
                  <div className="dr-field-group">
                    <span className="dr-field-label text-rose-400 font-bold">
                      🔴 TV-Board für Team 1 (Rot)
                    </span>
                    <div className="dr-pill-row">
                      {['1', '2', '3', '4', '5'].map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setBoard1Id(id)}
                          className={`dr-choice-btn ${board1Id === id ? 'is-active' : ''}`}
                        >
                          Board {id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="dr-field-group">
                    <span className="dr-field-label text-amber-400 font-bold">
                      🟡 TV-Board für Team 2 (Gold)
                    </span>
                    <div className="dr-pill-row">
                      {['1', '2', '3', '4', '5'].map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setBoard2Id(id)}
                          className={`dr-choice-btn is-gold ${
                            board2Id === id ? 'is-active' : ''
                          }`}
                        >
                          Board {id}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="dr-field-group">
                  <span className="dr-field-label">TV-Board wählen</span>
                  <div className="dr-pill-row">
                    {['1', '2', '3', '4', '5'].map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setBoardId(id)}
                        className={`dr-choice-btn ${boardId === id ? 'is-active' : ''}`}
                      >
                        Board {id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Teamaufstellung */}
            <div className="dr-teams-grid">
              {/* Team Rot */}
              <div className="dr-team-box red">
                <span className="dr-field-label">
                  Team 01 (Rot) {mode === 'board_vs_board' && `· TV Board ${board1Id}`}
                </span>
                <input
                  type="text"
                  value={team1Name}
                  onChange={(e) => setTeam1Name(e.target.value)}
                  className="dr-input"
                  placeholder="Teamname Rot"
                />
                <div className="dr-member-list">
                  {team1Members.map((member, idx) => (
                    <span key={`${member}-${idx}`} className="dr-member-pill">
                      {member}
                      {team1Members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMemberFromTeam(1, idx)}
                          aria-label={`${member} entfernen`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <select
                  className="dr-input"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addMemberToTeam(1, e.target.value);
                  }}
                >
                  <option value="">+ Lions-Spieler hinzufügen …</option>
                  {validPlayers.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="dr-add-row">
                  <input
                    type="text"
                    value={team1Draft}
                    onChange={(e) => setTeam1Draft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addMemberToTeam(1, team1Draft);
                      }
                    }}
                    className="dr-input"
                    placeholder="Gastspieler eingeben …"
                  />
                  <button
                    type="button"
                    onClick={() => addMemberToTeam(1, team1Draft)}
                    className="dr-add-btn"
                  >
                    + Hinzufügen
                  </button>
                </div>
              </div>

              {/* Team Gold */}
              <div className="dr-team-box gold">
                <span className="dr-field-label">
                  Team 02 (Gold) {mode === 'board_vs_board' && `· TV Board ${board2Id}`}
                </span>
                <input
                  type="text"
                  value={team2Name}
                  onChange={(e) => setTeam2Name(e.target.value)}
                  className="dr-input"
                  placeholder="Teamname Gold"
                />
                <div className="dr-member-list">
                  {team2Members.map((member, idx) => (
                    <span key={`${member}-${idx}`} className="dr-member-pill">
                      {member}
                      {team2Members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMemberFromTeam(2, idx)}
                          aria-label={`${member} entfernen`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <select
                  className="dr-input"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addMemberToTeam(2, e.target.value);
                  }}
                >
                  <option value="">+ Lions-Spieler hinzufügen …</option>
                  {validPlayers.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="dr-add-row">
                  <input
                    type="text"
                    value={team2Draft}
                    onChange={(e) => setTeam2Draft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addMemberToTeam(2, team2Draft);
                      }
                    }}
                    className="dr-input"
                    placeholder="Gastspieler eingeben …"
                  />
                  <button
                    type="button"
                    onClick={() => addMemberToTeam(2, team2Draft)}
                    className="dr-add-btn"
                  >
                    + Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartRace}
              className="dr-start-btn cursor-pointer"
            >
              🏁 Rennen starten ({targetDistance.toLocaleString('de-DE')} Punkte)
            </button>
          </div>
        </div>
      ) : (
        /* AKTIVES TABLET-COCKPIT (Kompakt & Vergrößertes Numpad) */
        <section
          className={`tablet-stage tablet-team-${tone} is-compact`}
          aria-label="Tablet-Cockpit"
        >
          <div className="tablet-glow" />
          <div className="tablet-shell">
            <div className="tablet-screen">
              {/* Kompakter Header */}
              <header className="cockpit-header">
                <div className="brand-lockup">
                  <div className="brand-mark">
                    <RallyIcon name="flag" size={18} />
                  </div>
                  <div>
                    <small>DARTS RALLY</small>
                    <strong>
                      {ownTeam.teamName.toUpperCase()}{' '}
                      <span>
                        · {mode === 'board_vs_board' ? `TV ${effectiveTeam === 1 ? rally.board1Id || board1Id : rally.board2Id || board2Id}` : `BOARD ${rally.boardId}`}
                      </span>
                    </strong>
                  </div>
                </div>

                <div className="current-runner">
                  <small>AM OCHE</small>
                  <strong>{activeRunner}</strong>
                </div>

                <div className="cockpit-header-actions">
                  <button
                    type="button"
                    className="utility-button"
                    disabled={history.length === 0}
                    onClick={handleUndo}
                  >
                    ↩ Undo
                  </button>
                  <button
                    type="button"
                    className="utility-button"
                    disabled={inputDisabled}
                    onClick={handleNextRunner}
                  >
                    Werfer
                  </button>
                </div>
              </header>

              {/* Umschalter welches Team dieses Tablet bedient (Board vs Board) */}
              {rally.gameMode === 'board_vs_board' && (
                <div className="dr-team-switch">
                  <button
                    type="button"
                    onClick={() => setControlTeam(1)}
                    className={`dr-choice-btn ${controlTeam === 1 ? 'is-active' : ''}`}
                  >
                    Steuere: {rally.team1.teamName} (TV {rally.board1Id || board1Id})
                  </button>
                  <button
                    type="button"
                    onClick={() => setControlTeam(2)}
                    className={`dr-choice-btn is-gold ${controlTeam === 2 ? 'is-active' : ''}`}
                  >
                    Steuere: {rally.team2.teamName} (TV {rally.board2Id || board2Id})
                  </button>
                </div>
              )}

              {/* Rennstrecken-Fortschrittsbalken */}
              <div className="race-strip">
                <ProgressBar
                  concealed={fogOwn}
                  score={ownTeam.score}
                  target={rally.targetDistance}
                  team={ownTeam.teamName.toUpperCase()}
                  tone={tone}
                />
                <div className="gap-pill">
                  <span>
                    {ownTeam.score >= opponent.score ? 'VORSPRUNG' : 'RÜCKSTAND'}
                  </span>
                  <strong>
                    {ownTeam.score >= opponent.score ? '+' : '−'}
                    {Math.abs(ownTeam.score - opponent.score)}
                  </strong>
                </div>
                <ProgressBar
                  concealed={fogOpponent}
                  score={opponent.score}
                  target={rally.targetDistance}
                  team={opponent.teamName.toUpperCase()}
                  tone={tone === 'red' ? 'gold' : 'red'}
                />
              </div>

              {/* Status & Buffs */}
              <div className="status-row">
                <div className="status-live">
                  <span /> {rally.targetDistance.toLocaleString('de-DE')} PKT
                </div>
                {turbo && (
                  <div className="buff">
                    <RallyIcon name="bolt" size={14} /> TURBO {getRallySecondsLeft(turbo, now)}s
                  </div>
                )}
                {shield && (
                  <div className="shield">
                    <RallyIcon name="shield" size={14} /> SCHILD AKTIV
                  </div>
                )}
                {spitzenbruch && (
                  <div className="banana-status">💥 SPITZENBRUCH (NUR 2 DARTS)</div>
                )}
              </div>

              {/* Statische Trigger-Legende (Reine Zahlen-Logik, keine Klick-Buttons) */}
              <div className="trigger-cheat-sheet" aria-label="Item Trigger Übersicht">
                <div className="trigger-cheat-header">
                  <span>⚡ SCORE-TRIGGER (VOLLAUTOMATISCH)</span>
                  <small>Einfach Score tippen & werten</small>
                </div>
                <div className="trigger-cheat-grid">
                  <div className={`trigger-pill turbo ${autoDetectedItem === 'turbo' ? 'is-active' : ''}`}>
                    <span className="pill-name">🚀 Turbo (×2)</span>
                    <strong className="pill-target">≥ 121 Pkt</strong>
                  </div>
                  <div className={`trigger-pill ausgebremst ${autoDetectedItem === 'ausgebremst' ? 'is-active' : ''}`}>
                    <span className="pill-name">🛑 Freeze (20s)</span>
                    <strong className="pill-target">100–120 Pkt</strong>
                  </div>
                  <div className={`trigger-pill reifenplatzer ${autoDetectedItem === 'reifenplatzer' ? 'is-active' : ''}`}>
                    <span className="pill-name">🚗💥 Platzer (-75)</span>
                    <strong className="pill-target">80 / 90 Pkt</strong>
                  </div>
                  <div className={`trigger-pill schild ${autoDetectedItem === 'schild' ? 'is-active' : ''}`}>
                    <span className="pill-name">🛡️ Schild</span>
                    <strong className="pill-target">55, 66, 77, 88, 99</strong>
                  </div>
                  <div className={`trigger-pill darttausch ${autoDetectedItem === 'darttausch' ? 'is-active' : ''}`}>
                    <span className="pill-name">🔄 Tausch</span>
                    <strong className="pill-target">50 Pkt (Bull)</strong>
                  </div>
                  <div className={`trigger-pill spitzenbruch ${autoDetectedItem === 'spitzenbruch' ? 'is-active' : ''}`}>
                    <span className="pill-name">💥 Bruch (2 Darts)</span>
                    <strong className="pill-target">26 Pkt (1-20-5)</strong>
                  </div>
                </div>
              </div>

              {/* Großes zentrales Manuelles Numpad (Schnelleingabe komplett entfernt) */}
              <div className="input-grid is-keypad-only">
                <section className="keypad-panel">
                  {/* Großes Display */}
                  <div className="score-display">
                    <div className="score-display-meta">
                      <small>PUNKTE-EINGABE</small>
                      <span>MAX 180</span>
                    </div>
                    <strong className="score-display-val">{scoreInput || '0'}</strong>
                    {activeEffectiveItem && (
                      <span className="auto-detect-pill">
                        ⚡ {RALLY_ITEM_META[activeEffectiveItem].headline} (
                        {RALLY_ITEM_META[activeEffectiveItem].trigger})
                      </span>
                    )}
                  </div>

                  {/* Große Tasten */}
                  <div className="keypad is-enlarged">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        type="button"
                        key={digit}
                        disabled={inputDisabled}
                        onClick={() => addDigit(String(digit))}
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="key-clear"
                      disabled={inputDisabled}
                      onClick={() => {
                        setScoreInput('');
                        setError('');
                      }}
                    >
                      C
                    </button>
                    <button
                      type="button"
                      disabled={inputDisabled}
                      onClick={() => addDigit('0')}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      className="key-backspace"
                      disabled={inputDisabled}
                      onClick={() => setScoreInput((curr) => curr.slice(0, -1))}
                    >
                      ←
                    </button>
                  </div>

                  {/* Aktionen: 0 (Miss) & Bestätigen */}
                  <div className="keypad-actions">
                    <button
                      type="button"
                      className="miss-btn"
                      disabled={inputDisabled}
                      onClick={() => submitScore(0)}
                    >
                      0 (MISS)
                    </button>
                    <button
                      type="button"
                      className="confirm"
                      disabled={inputDisabled}
                      onClick={() => submitScore()}
                    >
                      <span>AUFNAHME WERTEN (ENTER)</span>
                    </button>
                  </div>
                </section>
              </div>

              {error && <div className="action-error">{error}</div>}

              {/* Stafetten-Buzzer unten */}
              <button
                type="button"
                className="relay-button"
                disabled={inputDisabled}
                onClick={handleNextRunner}
              >
                <span className="relay-icon">
                  <RallyIcon name="users" size={20} />
                </span>
                <span>
                  <small>AUFNAHME BEENDET</small>
                  NÄCHSTER LÄUFER
                </span>
                <b>
                  ABKLATSCHEN <span>→</span>
                </b>
              </button>

              {/* Freeze-Sperre bei Ausgebremst */}
              {ausgebremst && (
                <div className="tablet-freeze-lock">
                  <div>
                    <RallyIcon name="bolt" size={36} />
                    <small>BOXENSTOPP / AUSGEBREMST</small>
                    <strong>GESPERRT · {frozenFor}s</strong>
                    <span>WURF-STOPP</span>
                  </div>
                </div>
              )}

              {/* Sieger-Screen */}
              {rally.winnerTeam && (
                <div className="tablet-winner-screen">
                  <div>
                    <small>RENNDEKLASSIERUNG</small>
                    <h2>
                      {rally.winnerTeam === 1
                        ? rally.team1.teamName.toUpperCase()
                        : rally.team2.teamName.toUpperCase()}{' '}
                      GEWINNT DIE RALLYE!
                    </h2>
                    <p>
                      Endstand: {rally.team1.score} zu {rally.team2.score} Punkte ·{' '}
                      {rally.targetDistance.toLocaleString('de-DE')} Pkt erreicht
                    </p>
                    <div className="winner-actions">
                      <button
                        type="button"
                        onClick={handleRematch}
                        className="dr-btn-resume"
                      >
                        🏁 Revanche starten
                      </button>
                      <button
                        type="button"
                        onClick={handleAbortToSetup}
                        className="dr-btn-discard"
                      >
                        Zum Setup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <RallyItemEffectOverlay event={effectEvent} viewingTeam={controlTeam} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
