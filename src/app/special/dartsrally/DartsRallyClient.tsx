'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Tv } from 'lucide-react';
import { Player } from '@/lib/data';
import { UserSession } from '@/app/actions';
import {
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

const STORAGE_KEY = 'lions_active_dartsrally_session_v2';
const QUICK_SCORES = [26, 41, 45, 60, 81, 85, 100, 140, 180] as const;

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

  // Setup-Konfiguration
  const [boardId, setBoardId] = useState<string>('1');
  const [mode, setMode] = useState<RallyGameMode>('single_board');
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
    const used = new Set([
      currentUser?.name?.trim() || '',
      validPlayers[0]?.name || '',
    ]);
    const pool = validPlayers.filter((p) => !used.has(p.name)).map((p) => p.name);
    if (pool.length >= 2) return [pool[0], pool[1]];
    if (pool.length === 1) return [pool[0], 'Gastspieler'];
    return ['Spieler 3', 'Spieler 4'];
  });
  const [team1Draft, setTeam1Draft] = useState<string>('');
  const [team2Draft, setTeam2Draft] = useState<string>('');

  // Laufender Spielzustand
  const [phase, setPhase] = useState<'setup' | 'racing'>('setup');
  const [rally, setRally] = useState<RallyLiveState>(() =>
    createInitialRallyState()
  );
  const [history, setHistory] = useState<RallyLiveState[]>([]);
  const [controlTeam, setControlTeam] = useState<RallyTeamNumber>(1);
  const [savedSession, setSavedSession] = useState<SavedRallySession | null>(null);

  // Eingabe & Effekte
  const [scoreInput, setScoreInput] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<RallyItemType | null>(null);
  const [error, setError] = useState<string>('');
  const [now, setNow] = useState<number>(() => Date.now());
  const [effectEvent, setEffectEvent] = useState<RallyEventBanner | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  // Initiales Board & Crash-/Wisch-Schutz prüfen
  useEffect(() => {
    try {
      const savedBoard = localStorage.getItem('lions_active_board');
      if (savedBoard && ['1', '2', '3', '4', '5'].includes(savedBoard)) {
        setBoardId(savedBoard);
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

  // 250ms-Takt für Buff-/Debuff-Sekunden-Countdowns
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

  const syncToBoardLive = useCallback(async (state: RallyLiveState) => {
    try {
      await fetch('/api/live/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: state.boardId,
          sessionId: state.sessionId,
          gameType: 'dartsrally',
          gameTitle: `Darts Rally (${state.targetDistance.toLocaleString('de-DE')} Pkt)`,
          status: state.winnerTeam ? 'completed' : 'playing',
          p1Name: state.team1.teamName,
          p2Name: state.team2.teamName,
          activePlayer: state.activeTeam,
          scoreP1: state.team1.score,
          scoreP2: state.team2.score,
          dartsrallyData: state,
        }),
      });
    } catch (err) {
      console.error('Fehler beim Live-Board-Sync von Darts Rally:', err);
    }
  }, []);

  // 12s Heartbeat während laufendem Rennen (verhindert TV-Auto-Standby)
  useEffect(() => {
    if (phase !== 'racing' || rally.winnerTeam) return;
    const heartbeat = setInterval(() => {
      const pruned = pruneExpiredEffects(rally, Date.now());
      void syncToBoardLive(pruned);
    }, 12000);
    return () => clearInterval(heartbeat);
  }, [phase, rally, syncToBoardLive]);

  const handleSelectBoard = (nextBoard: string) => {
    setBoardId(nextBoard);
    try {
      localStorage.setItem('lions_active_board', nextBoard);
    } catch {}
  };

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
    const initial = createInitialRallyState({
      boardId,
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
    setMode(savedSession.rally.gameMode || 'single_board');
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

  const handleRematch = () => {
    const rematch = createInitialRallyState({
      boardId: rally.boardId,
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

  const freeze = getRallyEffect(ownTeam, 'freeze', now);
  const banana = getRallyEffect(ownTeam, 'banana', now);
  const turbo = getRallyEffect(ownTeam, 'turbo', now);
  const shield = getRallyEffect(ownTeam, 'shield', now);
  const fogOwn = Boolean(getRallyEffect(ownTeam, 'fog', now));
  const fogOpponent = Boolean(getRallyEffect(opponent, 'fog', now));
  const frozenFor = getRallySecondsLeft(freeze, now);
  const activeRunner = ownTeam.members[ownTeam.activeMemberIndex] || 'Werfer';
  const inputDisabled = Boolean(freeze) || Boolean(rally.winnerTeam);

  const submitScore = (explicitValue?: number) => {
    if (inputDisabled) return;
    const raw = explicitValue !== undefined ? explicitValue : Number(scoreInput || 0);
    if (!Number.isFinite(raw) || raw < 0 || raw > 180) {
      setError('Bitte einen gültigen 3-Dart-Score zwischen 0 und 180 eingeben.');
      return;
    }
    setError('');
    const nextHistory = [...history.slice(-19), rally];
    const nextState = applyRallyScore(
      rally,
      effectiveTeam,
      raw,
      selectedItem || undefined,
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
      return candidate;
    });
  };

  return (
    <div className="dr-rally-root is-tablet forced-dark">
      <div className="dr-top-nav">
        <Link href="/special" className="dr-back-link">
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zur Event-Arena</span>
        </Link>

        <div className="dr-nav-actions">
          <Link
            href={`/board/${boardId}`}
            target="_blank"
            className="dr-nav-btn is-tv-link"
          >
            <Tv className="w-4 h-4" />
            <span>TV-Monitor Board {boardId}</span>
          </Link>
          {phase === 'racing' && (
            <button
              type="button"
              onClick={handleAbortToSetup}
              className="dr-nav-btn"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Setup / Neu</span>
            </button>
          )}
        </div>
      </div>

      {phase === 'setup' ? (
        <div className="dr-setup-wrap">
          {savedSession && (
            <div className="dr-resume-banner">
              <div>
                <small>⚠️ Unterbrochenes Rennen gefunden</small>
                <h2>
                  {savedSession.rally.team1.teamName} ({savedSession.rally.team1.score}) vs.{' '}
                  {savedSession.rally.team2.teamName} ({savedSession.rally.team2.score})
                </h2>
                <p>
                  Board {savedSession.rally.boardId} · Ziel{' '}
                  {savedSession.rally.targetDistance.toLocaleString('de-DE')} Punkte ·{' '}
                  {savedSession.rally.gameMode === 'single_board'
                    ? '1 Board (Wechselnd)'
                    : 'Board vs. Board'}
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
                <small>LIONS WINTER SERIES · TEAM-STAFFEL</small>
                <h1>Darts Rally – Setup</h1>
              </div>
              <span className="dr-field-label">
                Zielpunkte mit Items, Sabotage &amp; TV-Live-Rennen
              </span>
            </div>

            <div className="dr-setup-grid">
              <div className="dr-field-group">
                <span className="dr-field-label">TV-Board wählen</span>
                <div className="dr-pill-row">
                  {['1', '2', '3', '4', '5'].map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectBoard(id)}
                      className={`dr-choice-btn ${boardId === id ? 'is-active' : ''}`}
                    >
                      Board {id}
                    </button>
                  ))}
                </div>
              </div>

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

              <div className="dr-field-group">
                <span className="dr-field-label">Spielmodus</span>
                <div className="dr-pill-row">
                  <button
                    type="button"
                    onClick={() => setMode('single_board')}
                    className={`dr-choice-btn ${
                      mode === 'single_board' ? 'is-active' : ''
                    }`}
                  >
                    1 Board · Wechselnd
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('board_vs_board')}
                    className={`dr-choice-btn is-gold ${
                      mode === 'board_vs_board' ? 'is-active' : ''
                    }`}
                  >
                    Board vs. Board
                  </button>
                </div>
              </div>
            </div>

            <div className="dr-teams-grid">
              {/* Team Rot */}
              <div className="dr-team-box red">
                <span className="dr-field-label">Team 01 (Rot)</span>
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
                <span className="dr-field-label">Team 02 (Gold)</span>
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
              className="dr-start-btn"
            >
              🏁 Rennen starten ({targetDistance.toLocaleString('de-DE')} Punkte)
            </button>
          </div>
        </div>
      ) : (
        <section
          className={`tablet-stage tablet-team-${tone}`}
          aria-label="Tablet-Cockpit"
        >
          <div className="tablet-glow" />
          <div className="tablet-shell">
            <div className="tablet-screen">
              <header className="cockpit-header">
                <div className="brand-lockup">
                  <div className="brand-mark">
                    <RallyIcon name="flag" size={20} />
                  </div>
                  <div>
                    <small>DARTS RALLY</small>
                    <strong>
                      {ownTeam.teamName.toUpperCase()}{' '}
                      <span>· BOARD {rally.boardId}</span>
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
                    ↩ Korrektur
                  </button>
                  <button
                    type="button"
                    className="utility-button"
                    disabled={inputDisabled}
                    onClick={handleNextRunner}
                  >
                    Werfer wechseln
                  </button>
                </div>
              </header>

              {rally.gameMode === 'board_vs_board' && (
                <div className="dr-team-switch">
                  <button
                    type="button"
                    onClick={() => setControlTeam(1)}
                    className={`dr-choice-btn ${
                      controlTeam === 1 ? 'is-active' : ''
                    }`}
                  >
                    Steuere: {rally.team1.teamName} ({rally.team1.score})
                  </button>
                  <button
                    type="button"
                    onClick={() => setControlTeam(2)}
                    className={`dr-choice-btn is-gold ${
                      controlTeam === 2 ? 'is-active' : ''
                    }`}
                  >
                    Steuere: {rally.team2.teamName} ({rally.team2.score})
                  </button>
                </div>
              )}

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

              <div className="status-row">
                <div className="status-live">
                  <span /> LIVE · {rally.targetDistance.toLocaleString('de-DE')} PKT
                </div>
                <div className="sync-state">
                  <RallyIcon name="sync" size={14} /> TV + TABLET SYNCHRON
                </div>
                {turbo && (
                  <div className="buff">
                    <RallyIcon name="bolt" size={15} /> TURBO{' '}
                    {getRallySecondsLeft(turbo, now)}s
                  </div>
                )}
                {shield && (
                  <div className="shield">
                    <RallyIcon name="shield" size={15} /> SCHILD AKTIV
                  </div>
                )}
                {banana && <div className="banana-status">DART 3 GESPERRT</div>}
              </div>

              <div className="item-selector">
                <div className="item-selector-label">
                  <small>ITEM-ERKENNUNG</small>
                  <strong>Treffermuster markieren</strong>
                </div>
                {RALLY_ITEM_OPTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.type}
                    disabled={inputDisabled}
                    className={
                      selectedItem === item.type ? `selected ${item.type}` : ''
                    }
                    onClick={() =>
                      setSelectedItem((curr) =>
                        curr === item.type ? null : item.type
                      )
                    }
                    title={item.trigger}
                  >
                    <span>{item.label}</span>
                    <small>{item.trigger}</small>
                  </button>
                ))}
              </div>

              <div className="input-grid">
                <section className="score-panel">
                  <div className="panel-title">
                    <div>
                      <small>SCHNELLEINGABE</small>
                      <strong>Aufnahme wählen</strong>
                    </div>
                    <span>{selectedItem ? 'ITEM GEKOPPELT' : '1 TAP'}</span>
                  </div>
                  <div className="quick-grid">
                    {QUICK_SCORES.map((value) => (
                      <button
                        type="button"
                        key={value}
                        disabled={inputDisabled}
                        onClick={() => submitScore(value)}
                      >
                        {value}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="miss"
                      disabled={inputDisabled}
                      onClick={() => submitScore(0)}
                    >
                      MISS <small>0</small>
                    </button>
                  </div>
                </section>

                <section className="keypad-panel">
                  <div className="score-display">
                    <div>
                      <small>MANUELLE EINGABE</small>
                      <span>MAX 180</span>
                    </div>
                    <strong>{scoreInput || '—'}</strong>
                  </div>
                  <div className="keypad">
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
                      disabled={inputDisabled}
                      onClick={() => setScoreInput((curr) => curr.slice(0, -1))}
                    >
                      ←
                    </button>
                  </div>
                  <button
                    type="button"
                    className="confirm"
                    disabled={inputDisabled}
                    onClick={() => submitScore()}
                  >
                    <span>BESTÄTIGEN</span>
                    <small>AUFNAHME WERTEN</small>
                  </button>
                </section>
              </div>

              {error && <div className="action-error">{error}</div>}

              <button
                type="button"
                className="relay-button"
                disabled={inputDisabled}
                onClick={handleNextRunner}
              >
                <span className="relay-icon">
                  <RallyIcon name="users" size={21} />
                </span>
                <span>
                  <small>AUFNAHME BEENDET</small>
                  NÄCHSTER LÄUFER
                </span>
                <b>
                  ABKLATSCHEN <span>→</span>
                </b>
              </button>

              {freeze && (
                <div className="tablet-freeze-lock">
                  <div>
                    <RallyIcon name="bolt" size={36} />
                    <small>BOARD-FREEZE</small>
                    <strong>GEFROREN · {frozenFor}s</strong>
                    <span>WURF-STOPP</span>
                  </div>
                </div>
              )}

              {rally.winnerTeam && (
                <div className="winner-overlay">
                  <div>
                    <RallyIcon name="flag" size={44} />
                    <small>ZIELLINIE ERREICHT</small>
                    <strong>
                      {rally.winnerTeam === 1
                        ? rally.team1.teamName
                        : rally.team2.teamName}
                    </strong>
                    <span>GEWINNT DIE DARTS RALLY</span>
                    <div className="winner-scores">
                      <div>
                        <small>{rally.team1.teamName}</small>
                        <b>{rally.team1.score.toLocaleString('de-DE')} PKT</b>
                      </div>
                      <div>
                        <small>{rally.team2.teamName}</small>
                        <b>{rally.team2.score.toLocaleString('de-DE')} PKT</b>
                      </div>
                    </div>
                    <div className="winner-actions">
                      <button
                        type="button"
                        onClick={handleRematch}
                        className="dr-btn-resume"
                      >
                        🔄 Revanche starten
                      </button>
                      <button
                        type="button"
                        onClick={handleAbortToSetup}
                        className="dr-btn-discard"
                      >
                        ⚙️ Zurück zum Setup
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <RallyItemEffectOverlay event={effectEvent} />
    </div>
  );
}
