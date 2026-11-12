'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Player } from '@/lib/data';
import {
  StellenCheckenHistoryItem,
  StellenCheckenRoundDetail,
  StellenCheckenSessionSavePayload,
  getPointsForTarget,
  getTargetTierInfo,
} from './types';
import {
  STELLEN_CHECKEN_PRESETS,
  getPresetById,
  getRandomPresetId,
  getSetupCheckoutHint,
} from './presets';
import { saveStellenCheckenSessionAction } from './actions';
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  HelpCircle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  User,
  Users,
  Tv,
  Hash,
  Shuffle,
  Target,
} from 'lucide-react';

interface StellenCheckenClientProps {
  players: Player[];
  initialHistory: StellenCheckenHistoryItem[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

interface TurnSnapshot {
  roundIdx: number;
  activePlayer: 1 | 2;
  p1Rounds: StellenCheckenRoundDetail[];
  p2Rounds: StellenCheckenRoundDetail[];
}

export default function StellenCheckenClient({
  players,
  initialHistory,
  currentUser,
}: StellenCheckenClientProps) {
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

  // Arretierung von Spieler 1 im Solo-Modus auf den angemeldeten Benutzer
  useEffect(() => {
    if (gameMode === 'solo' && !isBoardUser && userPlayerMatch) {
      setP1Name(userPlayerMatch.name);
    }
  }, [gameMode, isBoardUser, userPlayerMatch]);

  // Sequenz-Auswahl ('random' oder feste ID 1..200)
  const [presetMode, setPresetMode] = useState<'random' | 'fixed'>('random');
  const [selectedPresetId, setSelectedPresetId] = useState<number>(1);
  const [activePresetId, setActivePresetId] = useState<number>(1);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Spiel-State
  const [roundIdx, setRoundIdx] = useState<number>(0); // 0 bis 14 (15 Runden)
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [p1Rounds, setP1Rounds] = useState<StellenCheckenRoundDetail[]>([]);
  const [p2Rounds, setP2Rounds] = useState<StellenCheckenRoundDetail[]>([]);
  const [undoStack, setUndoStack] = useState<TurnSnapshot[]>([]);

  // Speicher- & Historien-State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [history, setHistory] = useState<StellenCheckenHistoryItem[]>(initialHistory);

  // Realtime Live-Synchronisation für den externen TV-Monitor (/training/stellen-checken/live)
  const [activeBoard, setActiveBoard] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lions_active_board_stellen_checken') || localStorage.getItem('lions_active_board') || '1';
    }
    return '1';
  });

  const liveBroadcastRef = useRef<BroadcastChannel | null>(null);

  const handleSelectBoard = (b: string) => {
    setActiveBoard(b);
    try {
      localStorage.setItem('lions_active_board_stellen_checken', b);
      localStorage.setItem('lions_active_board', b);
    } catch (e) {}
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      liveBroadcastRef.current = new BroadcastChannel(`lions_stellen_checken_live_sync_${activeBoard}`);
    } catch (e) {}
    return () => {
      liveBroadcastRef.current?.close();
    };
  }, [activeBoard]);

  // Standby-Reset beim Verlassen
  useEffect(() => {
    const sendStandby = () => {
      try {
        const payload = JSON.stringify({ boardId: activeBoard, status: 'idle', reset: true });
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/live/board', new Blob([payload], { type: 'application/json' }));
          navigator.sendBeacon('/api/live/stellen-checken', new Blob([payload], { type: 'application/json' }));
        } else {
          fetch('/api/live/board', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
          fetch('/api/live/stellen-checken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch (e) {}
    };

    window.addEventListener('beforeunload', sendStandby);
    return () => {
      window.removeEventListener('beforeunload', sendStandby);
      sendStandby();
    };
  }, [activeBoard]);

  // Live Sync Push
  useEffect(() => {
    if (!isGameStarted && !isGameFinished) return;

    const preset = getPresetById(activePresetId);
    const activeNum = preset?.targets?.[roundIdx] ?? 64;
    const hint = getSetupCheckoutHint(activeNum);

    const p1ChecksCount = p1Rounds.filter((r) => r.checked).length;
    const p1PointsCount = p1Rounds.reduce((sum, r) => sum + r.pointsEarned, 0);
    const p2ChecksCount = p2Rounds.filter((r) => r.checked).length;
    const p2PointsCount = p2Rounds.reduce((sum, r) => sum + r.pointsEarned, 0);

    const payload = {
      boardId: activeBoard,
      status: isGameFinished ? 'completed' : isGameStarted ? 'playing' : 'idle',
      gameType: 'stellen_checken' as const,
      gameMode,
      p1Name,
      p2Name,
      activePlayer,
      currentVisit: roundIdx + 1,
      totalVisits: 15,
      currentNumber: activeNum,
      recommendedRoute: hint,
      p1Checks: p1ChecksCount,
      p1Points: p1PointsCount,
      p2Checks: p2ChecksCount,
      p2Points: p2PointsCount,
      presetId: activePresetId,
      updatedAt: Date.now(),
    };

    try {
      liveBroadcastRef.current?.postMessage(payload);
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const masterBc = new BroadcastChannel(`lions_board_live_sync_${activeBoard}`);
        masterBc.postMessage(payload);
        masterBc.close();
      }
      localStorage.setItem(`lions_stellen_checken_live_sync_${activeBoard}`, JSON.stringify(payload));
      localStorage.setItem(`lions_board_live_sync_${activeBoard}`, JSON.stringify(payload));
      fetch('/api/live/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
      fetch('/api/live/stellen-checken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (e) {}
  }, [
    isGameStarted,
    isGameFinished,
    activeBoard,
    gameMode,
    p1Name,
    p2Name,
    activePlayer,
    roundIdx,
    activePresetId,
    p1Rounds,
    p2Rounds,
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'check' | 'miss' | 'finish' | 'start') => {
    if (!soundEnabled) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      if (type === 'check') {
        // Heller Erfolgs-Akkord
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.06);
          gain.gain.setValueAtTime(0.18, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.3);
        });
      } else if (type === 'miss') {
        // Kurzer dumpfer Ton
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.linearRampToValueAtTime(130, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'finish') {
        // Sieges-Fanfare
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.09);
          gain.gain.setValueAtTime(0.22, now + i * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.09);
          osc.stop(now + i * 0.09 + 0.48);
        });
      } else if (type === 'start') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {
      // Audio-Fehler ignorieren
    }
  };

  const activePreset = getPresetById(activePresetId);
  const currentTarget = activePreset.targets[roundIdx] ?? 40;
  const currentTier = getTargetTierInfo(currentTarget);
  const currentHint = getSetupCheckoutHint(currentTarget);

  // Live-Werte berechnen
  const p1Points = p1Rounds.reduce((acc, r) => acc + r.pointsEarned, 0);
  const p1Checks = p1Rounds.filter((r) => r.checked).length;
  const p1Quote = p1Rounds.length > 0 ? p1Checks / p1Rounds.length : 0;

  const p2Points = p2Rounds.reduce((acc, r) => acc + r.pointsEarned, 0);
  const p2Checks = p2Rounds.filter((r) => r.checked).length;
  const p2Quote = p2Rounds.length > 0 ? p2Checks / p2Rounds.length : 0;

  const startGame = (overridePresetId?: number) => {
    if (gameMode === '1vs1' && p1Name === p2Name) {
      alert('Bitte wähle zwei unterschiedliche Spieler für das 1 vs. 1 Duell aus.');
      return;
    }

    const chosenId =
      overridePresetId !== undefined
        ? overridePresetId
        : presetMode === 'random'
        ? getRandomPresetId()
        : selectedPresetId;

    setActivePresetId(chosenId);
    setRoundIdx(0);
    setActivePlayer(1);
    setP1Rounds([]);
    setP2Rounds([]);
    setUndoStack([]);
    setIsSaved(false);
    setSaveError(null);
    setIsGameFinished(false);
    setIsGameStarted(true);
    playSound('start');
  };

  const triggerAutoSave = async (
    finalP1Rounds: StellenCheckenRoundDetail[],
    finalP2Rounds: StellenCheckenRoundDetail[],
    presetIdToSave: number
  ) => {
    setIsSaving(true);
    setSaveError(null);

    const preset = getPresetById(presetIdToSave);
    const sessionId = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const p1Pts = finalP1Rounds.reduce((s, r) => s + r.pointsEarned, 0);
    const p1Chk = finalP1Rounds.filter((r) => r.checked).length;
    const p1Q = finalP1Rounds.length > 0 ? p1Chk / finalP1Rounds.length : 0;

    const p1Obj = validPlayers.find((p) => p.name === p1Name);
    const payloads: StellenCheckenSessionSavePayload[] = [];

    if (gameMode === 'solo') {
      payloads.push({
        session_id: sessionId,
        player_id: p1Obj?.id ?? null,
        player_name: p1Name,
        opponent_name: null,
        game_mode: 'solo',
        preset_id: preset.id,
        points_scored: p1Pts,
        max_possible_points: preset.maxPoints,
        checks_count: p1Chk,
        total_rounds: 15,
        check_quote: Number(p1Q.toFixed(4)),
        is_winner: 1,
        round_details: finalP1Rounds,
        training_date: todayStr,
      });
    } else {
      const p2Pts = finalP2Rounds.reduce((s, r) => s + r.pointsEarned, 0);
      const p2Chk = finalP2Rounds.filter((r) => r.checked).length;
      const p2Q = finalP2Rounds.length > 0 ? p2Chk / finalP2Rounds.length : 0;
      const p2Obj = validPlayers.find((p) => p.name === p2Name);

      // Sieger bestimmen: zuerst nach Punkten, bei Gleichstand nach Anzahl Checks
      let p1Win = 0;
      let p2Win = 0;
      if (p1Pts > p2Pts || (p1Pts === p2Pts && p1Chk > p2Chk)) {
        p1Win = 1;
      } else if (p2Pts > p1Pts || (p2Pts === p1Pts && p2Chk > p1Chk)) {
        p2Win = 1;
      }

      payloads.push({
        session_id: sessionId,
        player_id: p1Obj?.id ?? null,
        player_name: p1Name,
        opponent_name: p2Name,
        game_mode: '1vs1',
        preset_id: preset.id,
        points_scored: p1Pts,
        max_possible_points: preset.maxPoints,
        checks_count: p1Chk,
        total_rounds: 15,
        check_quote: Number(p1Q.toFixed(4)),
        is_winner: p1Win,
        round_details: finalP1Rounds,
        training_date: todayStr,
      });

      payloads.push({
        session_id: sessionId,
        player_id: p2Obj?.id ?? null,
        player_name: p2Name,
        opponent_name: p1Name,
        game_mode: '1vs1',
        preset_id: preset.id,
        points_scored: p2Pts,
        max_possible_points: preset.maxPoints,
        checks_count: p2Chk,
        total_rounds: 15,
        check_quote: Number(p2Q.toFixed(4)),
        is_winner: p2Win,
        round_details: finalP2Rounds,
        training_date: todayStr,
      });
    }

    const res = await saveStellenCheckenSessionAction(payloads);
    setIsSaving(false);

    if (res.success) {
      setIsSaved(true);
      const nowIso = new Date().toISOString();
      const newHistItems: StellenCheckenHistoryItem[] = payloads.map((p, i) => ({
        id: Date.now() + i,
        session_id: p.session_id,
        player_name: p.player_name,
        opponent_name: p.opponent_name ?? null,
        game_mode: p.game_mode,
        preset_id: p.preset_id,
        points_scored: p.points_scored,
        max_possible_points: p.max_possible_points,
        checks_count: p.checks_count,
        total_rounds: p.total_rounds,
        check_quote: p.check_quote,
        is_winner: p.is_winner,
        round_details: p.round_details,
        training_date: p.training_date,
        created_at: nowIso,
      }));
      setHistory((prev) => [...newHistItems, ...prev.slice(0, 28)]);
    } else {
      setSaveError(res.error || 'Fehler beim Speichern');
    }
  };

  const handleDecision = (checked: boolean) => {
    if (isGameFinished) return;

    const target = activePreset.targets[roundIdx];
    const ptsPossible = getPointsForTarget(target);
    const ptsEarned = checked ? ptsPossible : 0;

    // Snapshot für Undo sichern
    setUndoStack((prev) => [
      ...prev,
      {
        roundIdx,
        activePlayer,
        p1Rounds: [...p1Rounds],
        p2Rounds: [...p2Rounds],
      },
    ]);

    const detail: StellenCheckenRoundDetail = {
      round: roundIdx + 1,
      target,
      pointsPossible: ptsPossible,
      checked,
      pointsEarned: ptsEarned,
    };

    if (checked) {
      playSound('check');
    } else {
      playSound('miss');
    }

    if (gameMode === 'solo') {
      const nextP1 = [...p1Rounds, detail];
      setP1Rounds(nextP1);

      if (roundIdx + 1 >= 15) {
        setIsGameFinished(true);
        playSound('finish');
        triggerAutoSave(nextP1, [], activePresetId);
      } else {
        setRoundIdx(roundIdx + 1);
      }
    } else {
      // 1 vs. 1 Modus: Erst Spieler 1 für diese Runde, dann Spieler 2 für dieselbe Zielzahl
      if (activePlayer === 1) {
        const nextP1 = [...p1Rounds, detail];
        setP1Rounds(nextP1);
        setActivePlayer(2);
      } else {
        const nextP2 = [...p2Rounds, detail];
        setP2Rounds(nextP2);

        if (roundIdx + 1 >= 15) {
          setIsGameFinished(true);
          playSound('finish');
          triggerAutoSave(p1Rounds, nextP2, activePresetId);
        } else {
          setActivePlayer(1);
          setRoundIdx(roundIdx + 1);
        }
      }
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isGameFinished) return;
    const last = undoStack[undoStack.length - 1];
    setRoundIdx(last.roundIdx);
    setActivePlayer(last.activePlayer);
    setP1Rounds(last.p1Rounds);
    setP2Rounds(last.p2Rounds);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  // Kategorie-Aufschlüsselung für einen Spieler
  const getTierStats = (rounds: StellenCheckenRoundDetail[]) => {
    const t1 = rounds.filter((r) => r.pointsPossible === 1);
    const t2 = rounds.filter((r) => r.pointsPossible === 2);
    const t3 = rounds.filter((r) => r.pointsPossible === 3);
    return {
      t1Checks: t1.filter((r) => r.checked).length,
      t1Total: t1.length,
      t2Checks: t2.filter((r) => r.checked).length,
      t2Total: t2.length,
      t3Checks: t3.filter((r) => r.checked).length,
      t3Total: t3.length,
    };
  };

  return (
    <div className="w-full max-w-5xl overflow-x-hidden mx-auto px-2 sm:px-6 space-y-6">
      {/* Top Navigation */}
      <div data-ui-id="STELLEN.NAV.BAR" className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/training"
            data-ui-id="STELLEN.NAV.BACK_BTN"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors"
            title="Zurück zur Trainingsübersicht"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Stellen & Checken (3–101)
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              15 Aufnahmen • 1–2 Darts stellen & Doppel checken • 200 Zufalls-Sequenzen
            </p>
          </div>
        </div>

      </div>

      {/* Spielregeln Einklapp-Box */}
      {showHelp && (
        <div className="bg-slate-900/95 border-2 border-cyan-500/40 rounded-2xl p-5 space-y-3 text-xs sm:text-sm text-slate-200 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Spielregeln & Punktewertung – Stellen & Checken</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              Schließen ✕
            </button>
          </div>
          <ul className="space-y-1.5 list-disc list-inside text-slate-300">
            <li>
              <strong>Spielziel:</strong> Checke in <strong>15 Aufnahmen</strong> (je 3 Darts) so viele vorgegebene Restpunktzahlen (zwischen <strong>3 und 101</strong>) wie möglich.
            </li>
            <li>
              <strong>1 Aufnahme Zeit:</strong> Du hast pro angezeigter Zahl genau <strong>eine Aufnahme (3 Darts)</strong> Zeit, um dir ein Doppel zu stellen (oder direkt auf ein Doppel zu werfen) und zu checken.
            </li>
            <li>
              <strong>Punkte-Staffelung bei erfolgreichem Check:</strong>
              <span className="block mt-1 pl-4 space-y-1">
                <span className="block text-emerald-300 font-bold">• 3 bis 60 Punkte (inkl. direkte Doppel): +1 Punkt</span>
                <span className="block text-amber-300 font-bold">• 61 bis 80 Punkte: +2 Punkte</span>
                <span className="block text-rose-300 font-bold">• 81 bis 101 Punkte: +3 Punkte</span>
              </span>
            </li>
            <li>
              <strong>200 feste Zufalls-Sequenzen (#001 – #200):</strong> Jede Sequenz enthält 15 ausbalancierte Zahlen (6× 1 Pkt, 5× 2 Pkt, 4× 3 Pkt = maximal 28 Punkte), damit alle Runden im Verein 100 % fair vergleichbar sind.
            </li>
          </ul>
        </div>
      )}

      {/* =====================================================================
          1. SETUP SCREEN (VOR SPIELSTART)
      ===================================================================== */}
      {!isGameStarted && (
        <div data-ui-id="STELLEN.SETUP.CONTAINER" className="space-y-6">
          <div data-ui-id="STELLEN.SETUP.CARD" className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            {/* Punkteschlüssel Übersicht */}
            <div data-ui-id="STELLEN.SETUP.POINTS_OVERVIEW" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/40 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Basis & Doppel
                  </span>
                  <span className="text-lg font-black text-white">Zahlen 3 – 60</span>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-sm">
                  +1 Punkt
                </span>
              </div>

              <div className="rounded-2xl bg-amber-950/40 border border-amber-500/40 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                    Mid-Range Setup
                  </span>
                  <span className="text-lg font-black text-white">Zahlen 61 – 80</span>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-sm">
                  +2 Punkte
                </span>
              </div>

              <div className="rounded-2xl bg-rose-950/40 border border-rose-500/40 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block">
                    High Finish
                  </span>
                  <span className="text-lg font-black text-white">Zahlen 81 – 101</span>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-300 font-black text-sm">
                  +3 Punkte
                </span>
              </div>
            </div>

            {/* Spielmodus-Wahl */}
            <div data-ui-id="STELLEN.SETUP.MODE_SECTION" className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                1. Spielmodus wählen
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGameMode('solo')}
                  data-ui-id="STELLEN.SETUP.MODE_SOLO_BTN"
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
                    <div className="text-[11px] text-slate-400">
                      15 Aufnahmen auf Highscore & Quote
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('1vs1')}
                  data-ui-id="STELLEN.SETUP.MODE_1VS1_BTN"
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
                    <div className="text-[11px] text-slate-400">
                      Beide werfen auf dieselben 15 Zahlen
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Spielerauswahl */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-ui-id="STELLEN.SETUP.P1_WRAPPER" className={`space-y-2 ${gameMode === 'solo' ? 'sm:col-span-2' : ''}`}>
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
                  <div data-ui-id="STELLEN.SETUP.P1_BADGE" className="w-full min-h-[56px] rounded-2xl bg-slate-950 border-2 border-emerald-500/50 px-4 py-3.5 text-lg sm:text-xl font-black text-white flex items-center justify-between shadow-inner">
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
                    data-ui-id="STELLEN.SETUP.P1_SELECT"
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
                <div data-ui-id="STELLEN.SETUP.P2_WRAPPER" className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                    Spieler 2 (Herausforderer)
                  </label>
                  <select
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    data-ui-id="STELLEN.SETUP.P2_SELECT"
                    className="w-full rounded-xl bg-slate-950 border border-white/15 px-3.5 py-3 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
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

            {/* Sequenz-Auswahl (200 Reihenfolgen) */}
            <div data-ui-id="STELLEN.SETUP.PRESET_SECTION" className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                  2. Reihenfolge / Sequenz-ID (#001 – #200)
                </label>
                <span className="text-[11px] text-cyan-300 font-semibold">
                  200 fest hinterlegte Zufalls-Reihenfolgen (je 15 Zahlen aus 3–101)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPresetMode('random')}
                  data-ui-id="STELLEN.SETUP.PRESET_RANDOM_BTN"
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    presetMode === 'random'
                      ? 'bg-emerald-950/80 border-emerald-500 text-white'
                      : 'bg-slate-950/60 border-white/10 text-slate-400'
                  }`}
                >
                  <Shuffle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-black text-sm">Zufällige Sequenz ziehen</div>
                    <div className="text-[11px] text-slate-400">
                      Wählt bei Spielstart automatisch #001 bis #200
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetMode('fixed')}
                  data-ui-id="STELLEN.SETUP.PRESET_FIXED_BTN"
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    presetMode === 'fixed'
                      ? 'bg-purple-500/15 border-purple-400 text-white'
                      : 'bg-slate-950/60 border-white/10 text-slate-400'
                  }`}
                >
                  <Hash className="w-5 h-5 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-black text-sm">Bestimmte Sequenz-ID wählen</div>
                    <div className="text-[11px] text-slate-400">
                      Gezielt eine ID (#001 – #200) zum Nachspielen wählen
                    </div>
                  </div>
                </button>
              </div>

              {presetMode === 'fixed' && (
                <div data-ui-id="STELLEN.SETUP.PRESET_FIXED_PANEL" className="bg-slate-950/90 border border-purple-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Sequenz-ID wählen:</span>
                      <select
                        value={selectedPresetId}
                        onChange={(e) => setSelectedPresetId(Number(e.target.value))}
                        data-ui-id="STELLEN.SETUP.PRESET_SELECT"
                        className="rounded-xl bg-slate-900 border border-purple-500/40 px-3 py-1.5 text-sm font-black text-purple-300"
                      >
                        {STELLEN_CHECKEN_PRESETS.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            Sequenz {pr.code} (Startet mit: {pr.targets.slice(0, 4).join(', ')}…)
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Maximal erreichbar: <strong className="text-white">{getPresetById(selectedPresetId).maxPoints} Punkte</strong>
                    </span>
                  </div>

                  {/* Vorschau der 15 Zahlen dieser Sequenz */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {getPresetById(selectedPresetId).targets.map((num, idx) => {
                      const pts = getPointsForTarget(num);
                      return (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border ${
                            pts === 3
                              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                              : pts === 2
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          }`}
                          title={`Aufnahme ${idx + 1}: Ziel ${num} (${pts} Pkt)`}
                        >
                          <span className="text-[10px] opacity-60 mr-1">{idx + 1}.</span>
                          {num}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Oche / Board-Auswahl für Mehrscheiben-Betrieb */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>📺 Oche / TV-Monitor zuweisen:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono">
                    Board {activeBoard}
                  </span>
                </label>
                <Link
                  href={`/training/stellen-checken/live?board=${activeBoard}`}
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
              onClick={() => startGame()}
              data-ui-id="STELLEN.SETUP.START_BTN"
              className="w-full min-h-[64px] py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-lg sm:text-xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Target className="w-5 h-5" />
              <span>
                🎯 Spiel starten ({presetMode === 'random' ? 'Zufalls-Sequenz' : `Sequenz #${String(selectedPresetId).padStart(3, '0')}`})
              </span>
            </button>
          </div>

        </div>
      )}

      {/* =====================================================================
          2. ACTIVE GAME SCREEN (WÄHREND DER 15 AUFNAHMEN)
      ===================================================================== */}
      {isGameStarted && !isGameFinished && (
        <div data-ui-id="STELLEN.MATCH.CONTAINER" className="space-y-5">
          {/* Status-Bar: Sequenz-ID, Aufnahme X/15, Korrektur & Abbrechen */}
          <div data-ui-id="STELLEN.MATCH.STATUS_BAR" className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-black text-xs sm:text-sm">
                Sequenz {activePreset.code}
              </span>
              <span className="px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black text-xs sm:text-sm">
                Aufnahme {roundIdx + 1} / 15
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                data-ui-id="STELLEN.MATCH.UNDO_BTN"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Korrektur</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Spiel wirklich abbrechen?')) {
                    setIsGameStarted(false);
                  }
                }}
                data-ui-id="STELLEN.MATCH.ABORT_BTN"
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>

          {/* 15er Sequenz-Leiste (Alle 15 Ziele im Überblick) */}
          <div data-ui-id="STELLEN.MATCH.ROUNDS_STEPPER" className="bg-slate-900/80 border border-white/10 rounded-2xl p-3">
            <div className="grid grid-cols-5 sm:grid-cols-15 gap-1.5">
              {activePreset.targets.map((tNum, idx) => {
                const p1Done = p1Rounds[idx];
                const isCurrent = idx === roundIdx;
                const pts = getPointsForTarget(tNum);

                let boxClass = 'bg-slate-950/80 border-white/10 text-slate-500';
                if (isCurrent) {
                  boxClass = 'bg-amber-400 text-zinc-950 font-black border-amber-300 ring-4 ring-amber-400/50 scale-105 shadow-md shadow-amber-500/30 z-10';
                } else if (p1Done) {
                  boxClass = p1Done.checked
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 font-black shadow-sm'
                    : 'bg-red-950/40 border-red-900/60 text-red-400/80 line-through';
                }

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-1.5 text-center transition-all flex flex-col items-center justify-center ${boxClass}`}
                  >
                    <span className="text-[9px] font-mono opacity-70">R{idx + 1}</span>
                    <span className="text-xs sm:text-sm font-black font-mono">{tNum}</span>
                    <span className="text-[9px] font-bold">
                      {p1Done ? (p1Done.checked ? `+${p1Done.pointsEarned}` : '✕') : `${pts}P`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spieler-Scoreboard (Solo oder 1vs1) */}
          <div data-ui-id="STELLEN.MATCH.SCOREBOARD" className={`grid gap-4 ${gameMode === '1vs1' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Spieler 1 */}
            <div
              className={`rounded-2xl p-4 border-2 transition-all flex items-center justify-between ${
                activePlayer === 1
                  ? 'bg-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/50 border-white/10 opacity-75'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span data-ui-id="STELLEN.MATCH.P1_NAME" className="text-2xl sm:text-3xl font-black text-white">{p1Name}</span>
                  {activePlayer === 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black uppercase">
                      Am Board 🎯
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  Checks: <strong className="text-emerald-300">{p1Checks} / {p1Rounds.length}</strong> ({(p1Quote * 100).toFixed(0)}%)
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  {p1Points} <span className="text-xs text-slate-400 font-sans">Pkt</span>
                </div>
              </div>
            </div>

            {/* Spieler 2 (nur bei 1vs1) */}
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
                    <span data-ui-id="STELLEN.MATCH.P2_NAME" className="text-2xl sm:text-3xl font-black text-white">{p2Name}</span>
                    {activePlayer === 2 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-black uppercase">
                        Am Board 🎯
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    Checks: <strong className="text-emerald-300">{p2Checks} / {p2Rounds.length}</strong> ({(p2Quote * 100).toFixed(0)}%)
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                    {p2Points} <span className="text-xs text-slate-400 font-sans">Pkt</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HAUPT-ZIELANZEIGE & CHECK / MISS BUTTONS */}
          <div
            data-ui-id="STELLEN.MATCH.TARGET_HERO"
            className={`rounded-3xl bg-gradient-to-b ${currentTier.glowClass} border-2 p-6 sm:p-10 text-center space-y-6 shadow-2xl`}
          >
            <div className="flex flex-col items-center gap-2">
              <span
                className={`px-4 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider border ${currentTier.badgeClass}`}
              >
                {currentTier.label}
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

            {/* Riesige Zielzahl */}
            <div className="py-2">
              <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                Zielzahl in Aufnahme {roundIdx + 1} (3 Darts)
              </div>
              <div className="text-7xl sm:text-9xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.18)]">
                {currentTarget}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs sm:text-sm text-cyan-300 font-semibold">
                <span>💡 Stell-/Finish-Weg:</span>
                <strong className="text-white font-mono">{currentHint}</strong>
              </div>
            </div>

            {/* ZWEI GROSSE TASTEN: CHECK ODER MISS (Lions-Farbsemantik) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => handleDecision(true)}
                data-ui-id="STELLEN.MATCH.CHECK_SUCCESS_BTN"
                className="py-6 sm:py-7 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] border-2 border-emerald-300 text-slate-950 font-black text-xl sm:text-2xl shadow-xl shadow-emerald-500/30 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  <span className="tracking-wide">CHECK!</span>
                </div>
                <span className="text-xs font-black uppercase tracking-wider bg-emerald-400/80 px-3 py-0.5 rounded-full text-zinc-950">
                  +{currentTier.points} {currentTier.points === 1 ? 'Punkt' : 'Punkte'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDecision(false)}
                data-ui-id="STELLEN.MATCH.CHECK_MISS_BTN"
                className="py-6 sm:py-7 px-6 rounded-2xl bg-gradient-to-b from-red-950/80 to-zinc-900 hover:from-red-900/70 hover:to-zinc-900 active:scale-[0.98] border-2 border-red-600/80 hover:border-red-500 text-red-300 hover:text-red-200 font-black text-xl sm:text-2xl shadow-xl shadow-red-950/20 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 group-hover:scale-105 transition-transform">
                  <XCircle className="w-7 h-7 stroke-[2.5]" />
                  <span className="tracking-wide">MISS</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider bg-zinc-950/60 px-3 py-0.5 rounded-full text-red-400/90 group-hover:text-red-300">
                  0 Punkte • Nächste Zahl
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. FINISHED / AUSWERTUNGS-SCREEN (NACH 15 AUFNAHMEN)
      ===================================================================== */}
      {isGameStarted && isGameFinished && (
        <div data-ui-id="STELLEN.COMPLETION.CARD" className="bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              15 Aufnahmen beendet • Sequenz {activePreset.code}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              {gameMode === 'solo' ? (
                <>Starke Runde, {p1Name}! 🎯</>
              ) : p1Points > p2Points || (p1Points === p2Points && p1Checks > p2Checks) ? (
                <>🏆 {p1Name} gewinnt das Duell!</>
              ) : p2Points > p1Points || (p2Points === p1Points && p2Checks > p1Checks) ? (
                <>🏆 {p2Name} gewinnt das Duell!</>
              ) : (
                <>🤝 Unentschieden nach 15 Runden!</>
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

          {/* Ergebnis-Karten */}
          <div className={`grid gap-4 ${gameMode === '1vs1' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-xl mx-auto'}`}>
            {[
              { name: p1Name, rounds: p1Rounds, pts: p1Points, chks: p1Checks, quote: p1Quote },
              ...(gameMode === '1vs1'
                ? [{ name: p2Name, rounds: p2Rounds, pts: p2Points, chks: p2Checks, quote: p2Quote }]
                : []),
            ].map((pl, idx) => {
              const tierStat = getTierStats(pl.rounds);
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-950/90 border border-white/10 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <div className="text-lg font-black text-white">{pl.name}</div>
                      <div className="text-xs text-slate-400">Sequenz {activePreset.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-amber-400 font-mono">
                        {pl.pts} <span className="text-sm text-slate-400 font-sans">/ {activePreset.maxPoints} Pkt</span>
                      </div>
                      <div className="text-xs font-bold text-emerald-400">
                        {pl.chks} / 15 gecheckt ({(pl.quote * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  {/* Quoten nach Punkte-Stufe */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                      <div className="text-[10px] text-emerald-400 font-bold">3–60 (1 Pkt)</div>
                      <div className="text-sm font-black text-white mt-0.5">
                        {tierStat.t1Checks} / {tierStat.t1Total}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30">
                      <div className="text-[10px] text-amber-400 font-bold">61–80 (2 Pkt)</div>
                      <div className="text-sm font-black text-white mt-0.5">
                        {tierStat.t2Checks} / {tierStat.t2Total}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30">
                      <div className="text-[10px] text-rose-400 font-bold">81–101 (3 Pkt)</div>
                      <div className="text-sm font-black text-white mt-0.5">
                        {tierStat.t3Checks} / {tierStat.t3Total}
                      </div>
                    </div>
                  </div>

                  {/* Alle 15 Zahlen im Detail */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pl.rounds.map((r) => (
                      <span
                        key={r.round}
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border ${
                          r.checked
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-900 border-white/10 text-slate-500 line-through'
                        }`}
                      >
                        {r.target} {r.checked ? `(+${r.pointsEarned})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aktions-Buttons nach Spielende */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => startGame( getRandomPresetId() )}
              data-ui-id="STELLEN.COMPLETION.NEW_RANDOM_BTN"
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>🎲 Neues Spiel (Zufalls-Sequenz)</span>
            </button>

            <button
              type="button"
              onClick={() => startGame(activePresetId)}
              data-ui-id="STELLEN.COMPLETION.REPLAY_BTN"
              className="px-5 py-3.5 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Gleiche Sequenz ({activePreset.code}) nochmal</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGameStarted(false)}
              data-ui-id="STELLEN.COMPLETION.RESET_BTN"
              className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Modus / Spieler wechseln
            </button>

            <Link
              href="/training/live?view=stellen_checken"
              target="_blank"
              data-ui-id="STELLEN.COMPLETION.TV_BTN"
              className="px-4 py-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black text-xs sm:text-sm flex items-center gap-2 transition-all"
            >
              <Tv className="w-4 h-4" />
              <span>TV-Board ansehen</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
