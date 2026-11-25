'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flag, Users, Zap, Shield, RotateCcw } from 'lucide-react';
import { Player } from '@/lib/data';
import { UserSession } from '@/app/actions';
import {
  RallyGameState,
  RallyGameMode,
  RallyTargetDistance,
  RallyItemType,
  detectRallyItems,
} from './types';

interface DartsRallyClientProps {
  players: Player[];
  currentUser: UserSession;
}

const STORAGE_KEY = 'lions_active_dartsrally_session_v1';

export default function DartsRallyClient({
  players,
  currentUser,
}: DartsRallyClientProps) {
  // Game State Engine
  const [boardId, setBoardId] = useState<string>('1');
  const [mode, setMode] = useState<RallyGameMode>('single_board');
  const [targetDistance, setTargetDistance] = useState<RallyTargetDistance>(1000);
  const [status, setStatus] = useState<'setup' | 'racing' | 'finished'>('setup');

  const [teamRedScore, setTeamRedScore] = useState<number>(0);
  const [teamGoldScore, setTeamGoldScore] = useState<number>(0);
  const [activeTeam, setActiveTeam] = useState<'red' | 'gold'>('red');
  const [winnerTeam, setWinnerTeam] = useState<'red' | 'gold' | null>(null);

  // Crash & Wisch-Schutz: Session Restore
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.status === 'racing') {
          setBoardId(parsed.boardId || '1');
          setMode(parsed.mode || 'single_board');
          setTargetDistance(parsed.targetDistance || 1000);
          setTeamRedScore(parsed.teamRed?.score || 0);
          setTeamGoldScore(parsed.teamGold?.score || 0);
          setStatus('racing');
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden der Rally-Session:', e);
    }
  }, []);

  // Sync to Board Live API
  const syncToBoardLive = useCallback(
    async (currentRed: number, currentGold: number, currentWinner: 'red' | 'gold' | null) => {
      try {
        await fetch('/api/live/board', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boardId,
            sessionId: `rally-${Date.now()}`,
            gameType: 'dartsrally',
            gameTitle: 'Darts Rally (1000-Punkte-Staffel)',
            status: currentWinner ? 'completed' : 'playing',
            scoreP1: currentRed,
            scoreP2: currentGold,
            dartsrallyData: {
              targetDistance,
              teamRedScore: currentRed,
              teamGoldScore: currentGold,
              winnerTeam: currentWinner,
              mode,
            },
          }),
        });
      } catch (err) {
        console.error('Fehler beim Live-Board-Sync von Darts Rally:', err);
      }
    },
    [boardId, targetDistance, mode]
  );

  // Start Match
  const handleStartRace = () => {
    setStatus('racing');
    setTeamRedScore(0);
    setTeamGoldScore(0);
    setWinnerTeam(null);
    syncToBoardLive(0, 0, null);
  };

  // Score Submit & Item Triggering Logic
  const handleRecordScore = (
    team: 'red' | 'gold',
    rawScore: number,
    options?: {
      triplesCount?: number;
      hasBullseye?: boolean;
      hasDoubleAndTriple?: boolean;
      isTripleSameNumber?: boolean;
      hitsOn18?: number;
    }
  ) => {
    if (status !== 'racing') return;

    const detectedItems = detectRallyItems({
      score: rawScore,
      ...options,
    });

    let newRed = teamRedScore;
    let newGold = teamGoldScore;

    if (team === 'red') {
      newRed = Math.min(targetDistance, teamRedScore + rawScore);
      setTeamRedScore(newRed);
    } else {
      newGold = Math.min(targetDistance, teamGoldScore + rawScore);
      setTeamGoldScore(newGold);
    }

    let winner: 'red' | 'gold' | null = null;
    if (newRed >= targetDistance) {
      winner = 'red';
      setWinnerTeam('red');
      setStatus('finished');
    } else if (newGold >= targetDistance) {
      winner = 'gold';
      setWinnerTeam('gold');
      setStatus('finished');
    } else {
      // Switch active team im single_board
      if (mode === 'single_board') {
        setActiveTeam(team === 'red' ? 'gold' : 'red');
      }
    }

    // Persist to local storage
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          boardId,
          mode,
          targetDistance,
          status: winner ? 'finished' : 'racing',
          teamRed: { score: newRed },
          teamGold: { score: newGold },
          lastItems: detectedItems,
        })
      );
    } catch {}

    syncToBoardLive(newRed, newGold, winner);
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setStatus('setup');
    setTeamRedScore(0);
    setTeamGoldScore(0);
    setWinnerTeam(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link
          href="/special"
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zur Event-Arena</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Darts Rally
          </span>
          <span className="text-xs text-slate-400 font-mono">Board {boardId}</span>
        </div>
      </div>

      {status === 'setup' ? (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏎️</span>
            <div>
              <h1 className="text-2xl font-black text-white">Darts Rally – Setup</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                1000-Punkte-Staffel mit Items, Sabotage und Live-Sync
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Renndistanz
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[750, 1000, 1500].map((dist) => (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => setTargetDistance(dist as RallyTargetDistance)}
                    className={`py-3 rounded-xl font-black text-sm border transition-all ${
                      targetDistance === dist
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {dist} Pkt
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Spielmodus
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('single_board')}
                  className={`py-3 rounded-xl font-black text-xs border transition-all ${
                    mode === 'single_board'
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  1 Board (Staffel)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('board_vs_board')}
                  className={`py-3 rounded-xl font-black text-xs border transition-all ${
                    mode === 'board_vs_board'
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  2 Boards (Sync)
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartRace}
            className="w-full min-h-[56px] py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Flag className="w-5 h-5" />
            <span>Rennen starten</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Race Status Bar */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>🏁</span> Rennstand (Ziel: {targetDistance} Pkt)
              </h2>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rennen abbrechen</span>
              </button>
            </div>

            {/* Split Progress Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-rose-400">🔴 Team Rot: {teamRedScore} Pkt</span>
                  <span className="text-slate-400 font-mono">
                    {Math.round((teamRedScore / targetDistance) * 100)}%
                  </span>
                </div>
                <div className="h-4 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, (teamRedScore / targetDistance) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-amber-400">🟡 Team Gold: {teamGoldScore} Pkt</span>
                  <span className="text-slate-400 font-mono">
                    {Math.round((teamGoldScore / targetDistance) * 100)}%
                  </span>
                </div>
                <div className="h-4 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, (teamGoldScore / targetDistance) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {winnerTeam && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-center space-y-1">
                <span className="text-3xl">🏆</span>
                <h3 className="text-xl font-black text-emerald-300">
                  Team {winnerTeam === 'red' ? 'Rot' : 'Gold'} gewinnt die Rallye!
                </h3>
              </div>
            )}
          </div>

          {/* Quick Score Action Slot (Engine Staging Ready for UI-Agent-Spiele) */}
          {!winnerTeam && (
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Aktiver Werfer: Team {activeTeam === 'red' ? 'Rot' : 'Gold'}
                </span>
                <span className="text-xs text-amber-300">
                  Bereit für UI-Cockpit durch UI-Agent-Spiele
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[26, 41, 45, 60, 81, 85, 100, 140].map((scoreVal) => (
                  <button
                    key={scoreVal}
                    type="button"
                    onClick={() => handleRecordScore(activeTeam, scoreVal)}
                    className="min-h-[52px] rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-mono font-bold text-base transition-all"
                  >
                    +{scoreVal}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
