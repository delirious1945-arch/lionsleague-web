'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Player } from '@/lib/data';
import { saveTrainingSessionAction, recordAbortedSessionAction, TrainingSessionData } from './actions';
import { UserSession } from '@/app/actions';
import { 
  Trophy, Users, User, ArrowRight, RotateCcw, Volume2, VolumeX, 
  Save, Download, FileSpreadsheet, FileText, CheckCircle2, AlertCircle,
  ArrowLeft, AlertTriangle, RefreshCw
} from 'lucide-react';

interface DoppelquoteClientProps {
  players: Player[];
  initialHistory: any[];
  user?: UserSession | null;
}

const TARGETS = ['D20', 'D10', 'D16', 'D8', 'D4'];
const CACHE_KEY = 'lions_active_doppelquote_session_v2';

export default function DoppelquoteClient({ players, initialHistory, user }: DoppelquoteClientProps) {
  const router = useRouter();
  const isBoardUser = Boolean(user?.name && user.name.toLowerCase().startsWith('board'));
  const userPlayerMatch = players.find(p => p.name.toLowerCase() === user?.name?.toLowerCase());
  const defaultP1 = (!isBoardUser && userPlayerMatch) ? userPlayerMatch.name : (players[0]?.name || 'Sebastian Kirste');

  const [gameMode, setGameMode] = useState<'solo' | '1vs1'>('solo');
  const [p1Name, setP1Name] = useState<string>(defaultP1);
  const [p2Name, setP2Name] = useState<string>(players[1]?.name || 'Dirk Ostermann');
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number>(0);
  const [currentShotIndex, setCurrentShotIndex] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [history, setHistory] = useState<any[]>(initialHistory);
  const [activeTab, setActiveTab] = useState<'board' | 'table' | 'history'>('board');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isGameInitialized, setIsGameInitialized] = useState<boolean>(false);
  const [restoredFromCache, setRestoredFromCache] = useState<boolean>(false);

  // Scores State
  const [scoresP1, setScoresP1] = useState<Record<string, (number | null)[]>>({
    D20: Array(10).fill(null),
    D10: Array(10).fill(null),
    D16: Array(10).fill(null),
    D8:  Array(10).fill(null),
    D4:  Array(10).fill(null),
  });

  const [scoresP2, setScoresP2] = useState<Record<string, (number | null)[]>>({
    D20: Array(10).fill(null),
    D10: Array(10).fill(null),
    D16: Array(10).fill(null),
    D8:  Array(10).fill(null),
    D4:  Array(10).fill(null),
  });

  // Sound Synthesizer (Web Audio API)
  const playSound = (freq: number, type: OscillatorType = 'sine', duration: number = 0.1) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
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
    } catch (e) {}
  };

  const playHitSound = (hits: number) => {
    if (!soundEnabled) return;
    if (hits === 0) playSound(220, 'sawtooth', 0.1);
    else if (hits === 1) playSound(440, 'sine', 0.12);
    else if (hits === 2) {
      playSound(554.37, 'sine', 0.08);
      setTimeout(() => playSound(659.25, 'sine', 0.12), 90);
    } else if (hits === 3) {
      playSound(523.25, 'triangle', 0.1);
      setTimeout(() => playSound(659.25, 'triangle', 0.1), 100);
      setTimeout(() => playSound(783.99, 'triangle', 0.25), 200);
    }
  };

  const curTarget = TARGETS[currentTargetIndex];
  const curScores = activePlayer === 1 ? scoresP1 : scoresP2;
  const curShots = curScores[curTarget];

  // Helper zum Berechnen von Treffern und Quote
  const calcStats = (scores: Record<string, (number | null)[]>) => {
    let hits = 0;
    let thrown = 0;
    TARGETS.forEach(t => {
      scores[t].forEach(s => {
        if (s !== null) {
          hits += s;
          thrown += 3;
        }
      });
    });
    const quote = thrown > 0 ? (hits / thrown) * 100 : 0;
    return { hits, thrown, quote };
  };

  const p1Stats = calcStats(scoresP1);
  const p2Stats = calcStats(scoresP2);

  const isCompleted = (gameMode === 'solo' 
    ? TARGETS.every(t => scoresP1[t].every(s => s !== null))
    : (TARGETS.every(t => scoresP1[t].every(s => s !== null)) && TARGETS.every(t => scoresP2[t].every(s => s !== null)))
  );
  const hasStarted = (p1Stats.thrown > 0 || p2Stats.thrown > 0);
  const isGameActive = hasStarted && !isCompleted;

  // 1. Lokalen Geräte-Cache beim Start wiederherstellen
  useEffect(() => {
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && cached.scoresP1) {
          const hasScores = TARGETS.some(t => 
            (cached.scoresP1[t] && cached.scoresP1[t].some((s: any) => s !== null)) ||
            (cached.scoresP2 && cached.scoresP2[t] && cached.scoresP2[t].some((s: any) => s !== null))
          );
          if (hasScores) {
            const restoredMode = cached.gameMode || 'solo';
            setGameMode(restoredMode);
            if (!isBoardUser && userPlayerMatch && restoredMode === 'solo') {
              setP1Name(userPlayerMatch.name);
            } else if (cached.p1Name) {
              setP1Name(cached.p1Name);
            }
            if (cached.p2Name) setP2Name(cached.p2Name);
            setScoresP1(cached.scoresP1);
            if (cached.scoresP2) setScoresP2(cached.scoresP2);
            setCurrentTargetIndex(cached.currentTargetIndex ?? 0);
            setCurrentShotIndex(cached.currentShotIndex ?? 0);
            setActivePlayer(cached.activePlayer || 1);
            setNotes(cached.notes || '');
            setRestoredFromCache(true);
          }
        }
      }
    } catch (e) {
      console.error('Fehler beim Laden des Caches:', e);
    } finally {
      setIsGameInitialized(true);
    }
  }, []);

  // Automatische Fixierung auf eigenen Account im Solo-Modus (außer bei Board 1-5 Usern)
  useEffect(() => {
    if (!isBoardUser && userPlayerMatch && gameMode === 'solo') {
      setP1Name(userPlayerMatch.name);
    }
  }, [gameMode, isBoardUser, userPlayerMatch]);

  // 2. Automatisches Caching auf dem Endgerät nach jedem Wurf
  useEffect(() => {
    if (!isGameInitialized) return;

    if (hasStarted && !isCompleted) {
      const sessionData = {
        gameMode,
        p1Name,
        p2Name,
        scoresP1,
        scoresP2,
        currentTargetIndex,
        currentShotIndex,
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
    scoresP1,
    scoresP2,
    currentTargetIndex,
    currentShotIndex,
    activePlayer,
    notes,
  ]);

  // 3. Refresh-Schutz (F5, Strg+R, Tab schliessen) während aktivem Spiel
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGameActive) {
        e.preventDefault();
        e.returnValue = 'Ein aktives Trainingsspiel läuft! Wenn du die Seite schließt oder neu lädst, wird das Spiel unterbrochen.';
        return e.returnValue;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGameActive) return;
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        alert('⚠️ Seite neu laden (F5 / Strg+R) ist während eines laufenden Trainingsspiels gesperrt, um Datenverlust zu verhindern. Dein Spielstand ist sicher im lokalen Geräte-Cache gespeichert!');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGameActive]);

  // Wurf eintragen
  const handleScore = (hits: number) => {
    playHitSound(hits);

    if (gameMode === 'solo') {
      const newP1 = { ...scoresP1 };
      newP1[curTarget] = [...newP1[curTarget]];
      newP1[curTarget][currentShotIndex] = hits;
      setScoresP1(newP1);

      if (currentShotIndex < 9) {
        setCurrentShotIndex(currentShotIndex + 1);
      } else {
        if (currentTargetIndex < TARGETS.length - 1) {
          setCurrentTargetIndex(currentTargetIndex + 1);
          setCurrentShotIndex(0);
        } else {
          // Spielende Solo
          autoSavePrompt(newP1, scoresP2);
        }
      }
    } else {
      // 1 vs 1 Modus: abwechselnd je Aufnahme
      if (activePlayer === 1) {
        const newP1 = { ...scoresP1 };
        newP1[curTarget] = [...newP1[curTarget]];
        newP1[curTarget][currentShotIndex] = hits;
        setScoresP1(newP1);
        setActivePlayer(2);
      } else {
        const newP2 = { ...scoresP2 };
        newP2[curTarget] = [...newP2[curTarget]];
        newP2[curTarget][currentShotIndex] = hits;
        setScoresP2(newP2);

        if (currentShotIndex < 9) {
          setCurrentShotIndex(currentShotIndex + 1);
          setActivePlayer(1);
        } else {
          if (currentTargetIndex < TARGETS.length - 1) {
            setCurrentTargetIndex(currentTargetIndex + 1);
            setCurrentShotIndex(0);
            setActivePlayer(1);
          } else {
            // Spielende Duell
            autoSavePrompt(scoresP1, newP2);
          }
        }
      }
    }
  };

  // Korrektur (Undo)
  const handleUndo = () => {
    if (gameMode === 'solo') {
      const newP1 = { ...scoresP1 };
      if (newP1[curTarget][currentShotIndex] !== null) {
        newP1[curTarget][currentShotIndex] = null;
      } else if (currentShotIndex > 0) {
        newP1[curTarget][currentShotIndex - 1] = null;
        setCurrentShotIndex(currentShotIndex - 1);
      } else if (currentTargetIndex > 0) {
        const prevT = TARGETS[currentTargetIndex - 1];
        newP1[prevT][9] = null;
        setCurrentTargetIndex(currentTargetIndex - 1);
        setCurrentShotIndex(9);
      }
      setScoresP1(newP1);
    } else {
      if (activePlayer === 2) {
        const newP1 = { ...scoresP1 };
        newP1[curTarget][currentShotIndex] = null;
        setScoresP1(newP1);
        setActivePlayer(1);
      } else {
        const newP2 = { ...scoresP2 };
        if (currentShotIndex > 0) {
          newP2[curTarget][currentShotIndex - 1] = null;
          setScoresP2(newP2);
          setCurrentShotIndex(currentShotIndex - 1);
          setActivePlayer(2);
        } else if (currentTargetIndex > 0) {
          const prevT = TARGETS[currentTargetIndex - 1];
          newP2[prevT][9] = null;
          setScoresP2(newP2);
          setCurrentTargetIndex(currentTargetIndex - 1);
          setCurrentShotIndex(9);
          setActivePlayer(2);
        }
      }
    }
  };

  // Speichern in Supabase
  const saveSession = async (customP1 = scoresP1, customP2 = scoresP2) => {
    const p1Id = players.find(p => p.name === p1Name)?.id || null;
    const p2Id = players.find(p => p.name === p2Name)?.id || null;
    const sessionId = 'session_' + Date.now();
    const dateStr = new Date().toISOString();

    const buildPayload = (pName: string, pId: number | null, oppName: string | null, scores: Record<string, (number | null)[]>, isWin: number) => {
      let tHits = 0, tThrown = 0;
      let targetData: Record<string, { hits: number, thrown: number, quote: number }> = {};
      let bestName = '-', bestQ = -1;

      TARGETS.forEach(t => {
        const h: number = scores[t].reduce<number>((a, b) => a + (b !== null ? b : 0), 0);
        const thr: number = scores[t].filter(s => s !== null).length * 3;
        const q: number = thr > 0 ? h / thr : 0;
        targetData[t] = { hits: h, thrown: thr, quote: q };
        tHits += h;
        tThrown += thr;
        if (thr > 0 && q > bestQ) {
          bestQ = q;
          bestName = `${t} (${(q * 100).toFixed(1)}%)`;
        }
      });

      return {
        session_id: sessionId,
        player_id: pId,
        player_name: pName,
        opponent_name: oppName,
        game_mode: gameMode,
        training_date: dateStr,
        d20_hits: targetData['D20'].hits,
        d20_darts: targetData['D20'].thrown,
        d20_quote: targetData['D20'].quote,
        d10_hits: targetData['D10'].hits,
        d10_darts: targetData['D10'].thrown,
        d10_quote: targetData['D10'].quote,
        d16_hits: targetData['D16'].hits,
        d16_darts: targetData['D16'].thrown,
        d16_quote: targetData['D16'].quote,
        d8_hits: targetData['D8'].hits,
        d8_darts: targetData['D8'].thrown,
        d8_quote: targetData['D8'].quote,
        d4_hits: targetData['D4'].hits,
        d4_darts: targetData['D4'].thrown,
        d4_quote: targetData['D4'].quote,
        total_hits: tHits,
        total_darts: tThrown,
        total_quote: tThrown > 0 ? tHits / tThrown : 0,
        best_double: bestName,
        notes,
        is_winner: isWin
      };
    };

    let sessionsToSave: TrainingSessionData[] = [];
    if (gameMode === 'solo') {
      sessionsToSave.push(buildPayload(p1Name, p1Id, null, customP1, 0));
    } else {
      const h1: number = TARGETS.reduce<number>((acc, t) => acc + (customP1[t]?.reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0), 0);
      const h2: number = TARGETS.reduce<number>((acc, t) => acc + (customP2[t]?.reduce<number>((a, b) => a + (b ?? 0), 0) ?? 0), 0);
      const w1 = h1 > h2 ? 1 : (h1 === h2 ? -1 : 0);
      const w2 = h2 > h1 ? 1 : (h1 === h2 ? -1 : 0);
      sessionsToSave.push(buildPayload(p1Name, p1Id, p2Name, customP1, w1));
      sessionsToSave.push(buildPayload(p2Name, p2Id, p1Name, customP2, w2));
    }

    setSaveStatus('Speichere in Supabase Cloud...');
    const res = await saveTrainingSessionAction(sessionsToSave);

    if (res.success) {
      // Nach erfolgreichem Speichern: Cache leeren
      localStorage.removeItem(CACHE_KEY);
      setRestoredFromCache(false);
      setSaveStatus('✅ Erfolgreich in Supabase Cloud gespeichert!');
      setTimeout(() => setSaveStatus(null), 4000);
      // Lokal in Historie einfügen
      setHistory(prev => [...sessionsToSave.map(s => ({ ...s, is_aborted: 0, created_at: new Date().toISOString() })), ...prev]);
    } else {
      setSaveStatus('⚠️ Fehler beim Speichern: ' + res.error);
    }
  };

  const autoSavePrompt = (p1: any, p2: any) => {
    if (confirm('🎉 Training abgeschlossen! Möchtest du das Ergebnis jetzt direkt in der Cloud-Datenbank (Supabase) speichern?')) {
      saveSession(p1, p2);
    }
  };

  // Sichere Navigation bei laufendem Spiel
  const handleSafeNavigation = async (targetUrl: string) => {
    if (isGameActive) {
      if (!confirm('Möchtest du das aktuelle Spiel wirklich abbrechen?')) return;

      // Im Hintergrund in Datenbank als Abbruch registrieren
      const dartsThrown = gameMode === 'solo' ? p1Stats.thrown : (p1Stats.thrown + p2Stats.thrown);
      await recordAbortedSessionAction({
        player_name: p1Name,
        opponent_name: gameMode === '1vs1' ? p2Name : null,
        game_mode: gameMode,
        total_hits: gameMode === 'solo' ? p1Stats.hits : (p1Stats.hits + p2Stats.hits),
        total_darts: dartsThrown,
        reason: 'Vorzeitige Navigation / Seite verlassen',
      });

      // Cache auf dem Endgerät leeren
      localStorage.removeItem(CACHE_KEY);
      setRestoredFromCache(false);
    }
    router.push(targetUrl);
  };

  // Spiel zurücksetzen
  const resetGame = async () => {
    if (isGameActive) {
      if (!confirm('Möchtest du das aktuelle Spiel wirklich abbrechen?')) return;

      const dartsThrown = gameMode === 'solo' ? p1Stats.thrown : (p1Stats.thrown + p2Stats.thrown);
      await recordAbortedSessionAction({
        player_name: p1Name,
        opponent_name: gameMode === '1vs1' ? p2Name : null,
        game_mode: gameMode,
        total_hits: gameMode === 'solo' ? p1Stats.hits : (p1Stats.hits + p2Stats.hits),
        total_darts: dartsThrown,
        reason: 'Manueller Abbruch über "Neu" Button',
      });
    }

    localStorage.removeItem(CACHE_KEY);
    setRestoredFromCache(false);
    const empty = () => ({
      D20: Array(10).fill(null), D10: Array(10).fill(null),
      D16: Array(10).fill(null), D8:  Array(10).fill(null),
      D4:  Array(10).fill(null),
    });
    setScoresP1(empty());
    setScoresP2(empty());
    setCurrentTargetIndex(0);
    setCurrentShotIndex(0);
    setActivePlayer(1);
    setNotes('');
  };

  const curTargetHits = curShots.reduce<number>((a, b) => a + (b !== null ? b : 0), 0);
  const curTargetThrown = curShots.filter(s => s !== null).length * 3;
  const curTargetPct = curTargetThrown > 0 ? ((curTargetHits / curTargetThrown) * 100).toFixed(1) : '0.0';

  return (
    <div 
      className="max-w-[700px] mx-auto px-3 sm:px-4 py-4 flex flex-col gap-4"
      style={{ overscrollBehaviorY: 'contain' }}
    >
      {/* TOP NAVIGATION BREADCRUMB MIT BACK-BUTTON */}
      <div className="flex items-center justify-between text-xs pb-1">
        <button
          onClick={() => handleSafeNavigation('/training')}
          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-cyan-400 bg-slate-900/80 hover:bg-slate-800 border border-white/10 px-3 py-1.5 rounded-xl transition-all font-bold text-xs shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
          <span>← Zurück zur Trainingsauswahl</span>
        </button>
        <button
          onClick={() => handleSafeNavigation('/?mode=ranking')}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          <span>🏆</span> Zum Ranking
        </button>
      </div>

      {/* LOKALER GERÄTE-CACHE HINWEIS BANNER */}
      {restoredFromCache && isGameActive && (
        <div className="bg-cyan-950/70 border border-cyan-500/40 rounded-xl p-2.5 px-3.5 flex items-center justify-between text-xs text-cyan-200 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span><strong>Geräte-Cache aktiv:</strong> Laufendes Spiel wurde nahtlos aus deinem lokalen Speicher wiederhergestellt.</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-700/50">Lokal gesichert</span>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            🎯
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
              LionsDarts Trainer
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Cloud Sync
              </span>
            </h1>
            <p className="text-xs text-slate-400">Doppelquote-Ermittlung (10 Aufnahmen à 3 Darts)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSafeNavigation('/training')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
            title="Zurück zu den Trainingsspielen"
          >
            <span>🎯</span>
            <span className="hidden sm:inline">Trainingsspiele</span>
          </button>
          <Link
            href="/doppelquote/live"
            target="_blank"
            className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 transition-colors flex items-center gap-1 shadow-[0_0_15px_rgba(0,212,255,0.2)]"
            title="Live-Übersicht für TV / Beamer im neuen Tab öffnen"
          >
            <span>📺</span>
            <span className="hidden sm:inline">TV Live-Board</span>
          </Link>
          <button
            onClick={() => handleSafeNavigation('/?mode=ranking')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
            title="Zum Ranking-System"
          >
            <span>🏆</span>
            <span className="hidden sm:inline">Ranking</span>
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Ton umschalten"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* SETUP CARD (MODUS & SPIELER) */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 shadow-lg flex flex-col gap-3">
        {/* Modus Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-white/5">
          <button
            onClick={() => {
              setGameMode('solo');
              setActivePlayer(1);
              if (!isBoardUser && userPlayerMatch) {
                setP1Name(userPlayerMatch.name);
              }
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              gameMode === 'solo' 
                ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={15} /> Solo-Training
          </button>
          <button
            onClick={() => setGameMode('1vs1')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              gameMode === '1vs1' 
                ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(217,119,6,0.5)]' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={15} /> 1 vs 1 Duell
          </button>
        </div>

        {/* Spieler Auswahl */}
        <div className={`grid gap-2.5 ${gameMode === '1vs1' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                Spieler 1
              </label>
              {gameMode === 'solo' && !isBoardUser && userPlayerMatch && (
                <span className="text-[10px] text-slate-400 font-semibold">
                  (Fest mit Account verknüpft)
                </span>
              )}
            </div>

            {gameMode === 'solo' && !isBoardUser && userPlayerMatch ? (
              <div className="w-full bg-slate-950/90 border border-blue-500/40 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-white flex items-center justify-between shadow-inner">
                <span className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{p1Name}</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-950 border border-sky-800/60 px-2 py-0.5 rounded shrink-0 ml-2">
                  Angemeldet
                </span>
              </div>
            ) : (
              <select
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-white outline-none focus:border-blue-500"
              >
                {players.map(p => (
                  <option key={p.id} value={p.name}>{p.name} ({p.team})</option>
                ))}
              </select>
            )}
          </div>

          {gameMode === '1vs1' && (
            <div>
              <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Spieler 2 (Gegner)
              </label>
              <select
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-white outline-none focus:border-amber-500"
              >
                {players.map(p => (
                  <option key={p.id} value={p.name}>{p.name} ({p.team})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 1 VS 1 LIVE STATUS BANNER */}
      {gameMode === '1vs1' && (
        <div className={`p-3 rounded-xl border flex items-center justify-between font-bold text-sm shadow-md transition-all ${
          activePlayer === 1 
            ? 'bg-blue-950/80 border-blue-500/50 text-sky-200' 
            : 'bg-amber-950/80 border-amber-500/50 text-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 uppercase">Am Wurf</span>
            <span className="text-base text-white">{activePlayer === 1 ? p1Name : p2Name}</span>
          </div>
          <div className="text-xs opacity-90">
            Aufnahme {currentShotIndex + 1} / 10
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="grid grid-cols-3 p-1 bg-slate-900/60 border border-white/10 rounded-xl text-xs font-bold">
        <button
          onClick={() => setActiveTab('board')}
          className={`py-2 rounded-lg transition-all ${activeTab === 'board' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          🎯 Live Board
        </button>
        <button
          onClick={() => setActiveTab('table')}
          className={`py-2 rounded-lg transition-all ${activeTab === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          📊 Quoten
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2 rounded-lg transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          📜 Verlauf & Vorlagen
        </button>
      </div>

      {/* TARGET NAV PILLS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TARGETS.map((t, idx) => {
          const shots = scoresP1[t];
          const isDone = shots.filter(s => s !== null).length === 10;
          const isActive = idx === currentTargetIndex;
          const hits = shots.reduce<number>((a, b) => a + (b !== null ? b : 0), 0);
          const thr = shots.filter(s => s !== null).length * 3;
          const pct = thr > 0 ? ((hits / thr) * 100).toFixed(0) + '%' : '-';

          return (
            <button
              key={t}
              onClick={() => {
                setCurrentTargetIndex(idx);
                const s = curScores[t];
                const firstEmpty = s.findIndex(v => v === null);
                setCurrentShotIndex(firstEmpty !== -1 ? firstEmpty : 9);
              }}
              className={`flex-1 min-w-[58px] py-1.5 px-1 rounded-xl border text-center font-bold text-xs transition-all ${
                isActive 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] scale-105' 
                  : isDone 
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                  : 'bg-slate-900/80 border-white/5 text-slate-300'
              }`}
            >
              <div className="text-sm font-black">{t}</div>
              <div className="text-[10px] opacity-75">{isDone ? '✓ Fertig' : `${shots.filter(s => s !== null).length}/10`}</div>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: LIVE BOARD */}
      {activeTab === 'board' && (
        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
          {/* Target Hero Display */}
          <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-white/10 rounded-2xl p-4 text-center relative overflow-hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Aktuelles Doppelfeld
            </span>
            <div className="text-5xl font-black text-sky-400 tracking-wider my-1 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]">
              {curTarget}
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mt-2">
              <span>Aufnahme <strong className="text-white">{currentShotIndex + 1}</strong> von 10</span>
              <span>Treffer: <strong className="text-emerald-400">{curTargetHits} / 30</strong> ({curTargetPct}%)</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2 border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300"
                style={{ width: `${((curShots.filter(s => s !== null).length) / 10) * 100}%` }}
              />
            </div>

            {/* 10 Shot Boxes */}
            <div className="grid grid-cols-10 gap-1.5 mt-3">
              {curShots.map((val, idx) => {
                const isCurrent = idx === currentShotIndex;
                let bgCls = 'bg-slate-800 text-slate-500 border-white/5';
                if (isCurrent) bgCls = 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/50 scale-105';
                else if (val === 0) bgCls = 'bg-slate-700 text-slate-300';
                else if (val === 1) bgCls = 'bg-sky-600 text-white font-bold';
                else if (val === 2) bgCls = 'bg-emerald-600 text-white font-bold';
                else if (val === 3) bgCls = 'bg-amber-500 text-slate-950 font-black';

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentShotIndex(idx)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all border ${bgCls}`}
                  >
                    <span className="text-[8px] opacity-75">{idx + 1}</span>
                    <span>{val !== null ? val : '·'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TOUCH BUTTONS (0, 1, 2, 3 TREFFER) */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleScore(0)}
              className="py-4 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 text-white font-black text-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-lg"
            >
              0
              <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider mt-0.5">0 Treffer</span>
            </button>
            <button
              onClick={() => handleScore(1)}
              className="py-4 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 border border-sky-400 text-white font-black text-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-lg shadow-sky-900/30"
            >
              1
              <span className="text-[10px] font-semibold text-sky-200 uppercase tracking-wider mt-0.5">1 Treffer</span>
            </button>
            <button
              onClick={() => handleScore(2)}
              className="py-4 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 border border-emerald-400 text-white font-black text-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-lg shadow-emerald-900/30"
            >
              2
              <span className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wider mt-0.5">2 Treffer</span>
            </button>
            <button
              onClick={() => handleScore(3)}
              className="py-4 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 border border-amber-300 text-slate-950 font-black text-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-lg shadow-amber-900/40"
            >
              3 ⭐
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mt-0.5">Maximum!</span>
            </button>
          </div>

          {/* CONTROLS */}
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 border border-white/10 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 active:bg-slate-700"
            >
              <RotateCcw size={14} /> Wurf korrigieren
            </button>
            <button
              onClick={() => {
                const nextIdx = (currentTargetIndex + 1) % TARGETS.length;
                setCurrentTargetIndex(nextIdx);
                setCurrentShotIndex(0);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 border border-white/10 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 active:bg-slate-700"
            >
              Nächstes Doppel <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: QUOTEN & TABELLEN */}
      {activeTab === 'table' && (
        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            📊 Quoten-Tabelle: {p1Name}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold">
                  <th className="py-2 text-left pl-2">Doppel</th>
                  <th>Aufn. 1-5</th>
                  <th>Aufn. 6-10</th>
                  <th>Treffer</th>
                  <th>Quote</th>
                </tr>
              </thead>
              <tbody>
                {TARGETS.map(t => {
                  const s = scoresP1[t];
                  const first5 = s.slice(0, 5).map(v => v !== null ? v : '-').join(' ');
                  const last5 = s.slice(5, 10).map(v => v !== null ? v : '-').join(' ');
                  const hits = s.reduce<number>((a, b) => a + (b ?? 0), 0);
                  const thr = s.filter(v => v !== null).length * 3;
                  const pct = thr > 0 ? ((hits / thr) * 100).toFixed(1) + '%' : '0.0%';

                  return (
                    <tr key={t} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2.5 text-left pl-2 font-black text-sky-400">{t}</td>
                      <td className="font-mono text-slate-400">{first5}</td>
                      <td className="font-mono text-slate-400">{last5}</td>
                      <td className="font-bold text-white">{hits}</td>
                      <td className="font-bold text-emerald-400">{pct}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800/80 font-black text-white border-t-2 border-slate-600">
                  <td className="py-2.5 text-left pl-2">GESAMT</td>
                  <td colSpan={2} className="text-slate-400">{p1Stats.thrown} / 150 Darts</td>
                  <td>{p1Stats.hits}</td>
                  <td className="text-emerald-400 text-sm">{p1Stats.quote.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {gameMode === '1vs1' && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h2 className="text-sm font-bold text-amber-400 mb-2">
                📊 Quoten-Tabelle: {p2Name} (Gegner)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-bold">
                      <th className="py-2 text-left pl-2">Doppel</th>
                      <th>Aufn. 1-5</th>
                      <th>Aufn. 6-10</th>
                      <th>Treffer</th>
                      <th>Quote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TARGETS.map(t => {
                      const s = scoresP2[t];
                      const first5 = s.slice(0, 5).map(v => v !== null ? v : '-').join(' ');
                      const last5 = s.slice(5, 10).map(v => v !== null ? v : '-').join(' ');
                      const hits = s.reduce<number>((a, b) => a + (b ?? 0), 0);
                      const thr = s.filter(v => v !== null).length * 3;
                      const pct = thr > 0 ? ((hits / thr) * 100).toFixed(1) + '%' : '0.0%';

                      return (
                        <tr key={t} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2.5 text-left pl-2 font-black text-amber-400">{t}</td>
                          <td className="font-mono text-slate-400">{first5}</td>
                          <td className="font-mono text-slate-400">{last5}</td>
                          <td className="font-bold text-white">{hits}</td>
                          <td className="font-bold text-amber-400">{pct}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800/80 font-black text-white border-t-2 border-slate-600">
                      <td className="py-2.5 text-left pl-2">GESAMT</td>
                      <td colSpan={2} className="text-slate-400">{p2Stats.thrown} / 150 Darts</td>
                      <td>{p2Stats.hits}</td>
                      <td className="text-amber-400 text-sm">{p2Stats.quote.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Trainings-Notizen:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z. B. Stand, Rhythmus, bestes Doppel..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* VIEW 3: VERLAUF & VORLAGEN */}
      {activeTab === 'history' && (() => {
        const visibleHistory = history.filter(h => {
          if (Number(h.is_aborted || 0) === 1) {
            return user?.role === 'admin';
          }
          return true;
        });

        return (
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📜</span> Gespeicherte Trainings in Supabase
                {user?.role === 'admin' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Admin-Ansicht
                  </span>
                )}
              </h2>
              <span className="text-xs text-slate-400">{visibleHistory.length} Einheiten</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
              {visibleHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  Noch keine Trainingseinheiten vorhanden.
                </div>
              ) : (
                visibleHistory.map((h, idx) => {
                  const isAborted = Number(h.is_aborted || 0) === 1;
                  const dateObj = new Date(h.training_date);
                  const dStr = isNaN(dateObj.getTime()) ? h.training_date : dateObj.toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
                  const qPct = ((h.total_quote ?? 0) * 100).toFixed(1) + '%';
                  const isWin = h.is_winner === 1;

                  return (
                    <div key={idx} className={`border rounded-xl p-3 flex justify-between items-center text-xs transition-all ${
                      isAborted 
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' 
                        : 'bg-slate-950/80 border-white/5'
                    }`}>
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                          <span>{dStr}</span>
                          <span>•</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {h.game_mode === '1vs1' ? `⚔️ vs ${h.opponent_name || 'Gegner'}` : '👤 Solo'}
                          </span>
                          {isWin && <span className="text-amber-400 font-bold">🏆 Sieg</span>}
                          {isAborted && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black">
                              ⚠️ ABGEBROCHEN (Admin-Sicht)
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-white text-sm mt-0.5 flex items-center gap-2">
                          <span>{h.player_name}</span>
                          {isAborted && h.notes && (
                            <span className="text-[10px] font-normal text-rose-300/80 italic">({h.notes})</span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {isAborted ? 'Vorzeitig abgebrochen' : `Best: ${h.best_double || '-'}`}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-base font-black ${isAborted ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {qPct}
                        </div>
                        <div className="text-[10px] text-slate-400">{h.total_hits} / {h.total_darts} Darts</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DOWNLOADS */}
            <div className="pt-3 border-t border-white/10">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Druckvorlagen für das Dartboard
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/Darts_Doppelquote_Trainingsblatt_A4.xlsx"
                  download
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
                >
                  <FileSpreadsheet size={15} className="text-emerald-400" /> Excel (.xlsx)
                </a>
                <a
                  href="/Darts_Doppelquote_Trainingsblatt_A4.pdf"
                  target="_blank"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
                >
                  <FileText size={15} className="text-rose-400" /> PDF Druckblatt
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* KPI STATUS BAR */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900/90 border border-white/10 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Darts</div>
          <div className="text-lg font-black text-white mt-0.5">
            {gameMode === 'solo' ? p1Stats.thrown : (activePlayer === 1 ? p1Stats.thrown : p2Stats.thrown)} / 150
          </div>
        </div>
        <div className="bg-slate-900/90 border border-white/10 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Treffer</div>
          <div className="text-lg font-black text-white mt-0.5">
            {gameMode === 'solo' ? p1Stats.hits : (activePlayer === 1 ? p1Stats.hits : p2Stats.hits)}
          </div>
        </div>
        <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-2.5 text-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <div className="text-[10px] font-bold text-emerald-400 uppercase">Doppelquote</div>
          <div className="text-lg font-black text-emerald-300 mt-0.5">
            {(gameMode === 'solo' ? p1Stats.quote : (activePlayer === 1 ? p1Stats.quote : p2Stats.quote)).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* STATUS NOTIFICATION */}
      {saveStatus && (
        <div className="bg-slate-950 border border-emerald-500/50 rounded-xl p-3 text-center text-xs font-bold text-emerald-300 shadow-xl flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          {saveStatus}
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex gap-2">
        <button
          onClick={() => saveSession()}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all"
        >
          <Save size={16} /> In Supabase Cloud speichern
        </button>
        <button
          onClick={resetGame}
          className="py-3 px-4 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-bold text-sm active:scale-95 transition-all"
        >
          Neu
        </button>
      </div>

    </div>
  );
}
