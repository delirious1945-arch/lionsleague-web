'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Player } from '@/lib/data';
import { 
  saveTrainingSessionAction, 
  recordAbortedSessionAction, 
  updateEstimatedDoubleQuoteAction, 
  checkPlayerNeedsReEstimateAction,
  ReEstimateCheckResult,
  TrainingSessionData 
} from './actions';
import { UserSession } from '@/app/actions';
import { 
  Trophy, Users, User, ArrowRight, RotateCcw, Volume2, VolumeX, 
  Save, Download, FileSpreadsheet, FileText, CheckCircle2, AlertCircle,
  ArrowLeft, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Target, Play, Settings, Tv, Award, Lock
} from 'lucide-react';
import { getPlayerPhotoUrl, getPlayerInitials } from '@/lib/avatar';

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
  const userPlayerMatch = players.find(p => p.name.trim().toLowerCase() === user?.name?.trim().toLowerCase());
  const defaultP1 = (!isBoardUser && userPlayerMatch) ? userPlayerMatch.name : (players[0]?.name || 'Sebastian Kirste');

  const [gameMode, setGameMode] = useState<'solo' | '1vs1'>('solo');
  const [p1Name, setP1Name] = useState<string>(defaultP1);
  const [p2Name, setP2Name] = useState<string>(players[1]?.name || 'Dirk Ostermann');

  // Arretierung von Spieler 1 im Solo-Modus auf den angemeldeten Benutzer
  useEffect(() => {
    if (gameMode === 'solo' && !isBoardUser && userPlayerMatch) {
      setP1Name(userPlayerMatch.name);
    }
  }, [gameMode, isBoardUser, userPlayerMatch]);
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
  const [gameSessionId, setGameSessionId] = useState<string>(() => 'dq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
  const [isSavedInCloud, setIsSavedInCloud] = useState<boolean>(false);
  const [expandedSessionKey, setExpandedSessionKey] = useState<string | number | null>(null);
  const [adminPlayerFilter, setAdminPlayerFilter] = useState<string>('all');
  const [isMatchStarted, setIsMatchStarted] = useState<boolean>(false);
  const [showSetupSettings, setShowSetupSettings] = useState<boolean>(false);

  // Selbsteinschätzung Doppelquote
  const [playerEstimates, setPlayerEstimates] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {};
    players.forEach((p) => {
      if (p.estimated_double_quote !== null && p.estimated_double_quote !== undefined) {
        init[p.name] = p.estimated_double_quote;
      }
    });
    return init;
  });

  const [showEstimateModal, setShowEstimateModal] = useState<boolean>(false);
  const [modalTargetPlayer, setModalTargetPlayer] = useState<string>(defaultP1);
  const [modalInputValue, setModalInputValue] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSavingEstimate, setIsSavingEstimate] = useState<boolean>(false);
  const [hasPromptedPlayers, setHasPromptedPlayers] = useState<Record<string, boolean>>({});
  const [reEstimateData, setReEstimateData] = useState<Record<string, ReEstimateCheckResult | null>>({});
  const [hasCheckedReEstimate, setHasCheckedReEstimate] = useState<Record<string, boolean>>({});

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
  const isPlaying = (isMatchStarted || hasStarted) && !isCompleted;
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
          if (hasScores || cached.isMatchStarted) {
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
            if (cached.gameSessionId) setGameSessionId(cached.gameSessionId);
            if (cached.isSavedInCloud) setIsSavedInCloud(true);
            setRestoredFromCache(true);
            setIsMatchStarted(true);
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

    if ((hasStarted || isMatchStarted) && !isCompleted) {
      const sessionData = {
        gameSessionId,
        isSavedInCloud,
        isMatchStarted,
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
    } else if (!hasStarted && !isMatchStarted) {
      localStorage.removeItem(CACHE_KEY);
    }
  }, [
    isGameInitialized,
    hasStarted,
    isCompleted,
    isMatchStarted,
    gameSessionId,
    isSavedInCloud,
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

  // Automatische Synchronisation mit Server-Props
  useEffect(() => {
    setPlayerEstimates(prev => {
      const updated = { ...prev };
      players.forEach((p) => {
        if (p.estimated_double_quote !== null && p.estimated_double_quote !== undefined) {
          if (updated[p.name] === undefined || updated[p.name] === null) {
            updated[p.name] = p.estimated_double_quote;
          }
        }
      });
      return updated;
    });
  }, [players]);

  // Automatische Abfrage vor dem ersten Start für Spieler ohne hinterlegte Selbsteinschätzung (Solo & 1vs1)
  // Sowie erneute Aufforderung bei dauerhafter Zielübertreffung (Re-Estimate)
  useEffect(() => {
    if (hasStarted) return;

    // 1. Spieler 1 prüfen: Falls noch gar keine Selbsteinschätzung hinterlegt ist
    if (p1Name && !playerEstimates[p1Name]) {
      if (!hasPromptedPlayers[p1Name]) {
        setModalTargetPlayer(p1Name);
        setModalInputValue('');
        setModalError(null);
        setShowEstimateModal(true);
        setHasPromptedPlayers(prev => ({ ...prev, [p1Name]: true }));
      }
      return;
    }

    // 1b. Spieler 1 prüfen: Status (gesperrt / freigeschaltet / Steigerung) ermitteln
    if (p1Name && playerEstimates[p1Name] && !hasCheckedReEstimate[p1Name]) {
      setHasCheckedReEstimate(prev => ({ ...prev, [p1Name]: true }));
      checkPlayerNeedsReEstimateAction(p1Name).then((res) => {
        setReEstimateData(prev => ({ ...prev, [p1Name]: res }));
        if (res.needsReEstimate && !hasPromptedPlayers[p1Name]) {
          setModalTargetPlayer(p1Name);
          setModalInputValue(String(res.suggestedEstimate));
          setModalError(null);
          setShowEstimateModal(true);
          setHasPromptedPlayers(prev => ({ ...prev, [p1Name]: true }));
        }
      });
      return;
    }

    // 2. Bei 1vs1: Spieler 2 prüfen (sobald Spieler 1 erledigt ist und Modal nicht offen ist)
    if (gameMode === '1vs1' && p2Name && !showEstimateModal) {
      if (!playerEstimates[p2Name]) {
        if (!hasPromptedPlayers[p2Name]) {
          setModalTargetPlayer(p2Name);
          setModalInputValue('');
          setModalError(null);
          setShowEstimateModal(true);
          setHasPromptedPlayers(prev => ({ ...prev, [p2Name]: true }));
        }
        return;
      }
      if (playerEstimates[p2Name] && !hasCheckedReEstimate[p2Name]) {
        setHasCheckedReEstimate(prev => ({ ...prev, [p2Name]: true }));
        checkPlayerNeedsReEstimateAction(p2Name).then((res) => {
          setReEstimateData(prev => ({ ...prev, [p2Name]: res }));
          if (res.needsReEstimate && !hasPromptedPlayers[p2Name]) {
            setModalTargetPlayer(p2Name);
            setModalInputValue(String(res.suggestedEstimate));
            setModalError(null);
            setShowEstimateModal(true);
            setHasPromptedPlayers(prev => ({ ...prev, [p2Name]: true }));
          }
        });
      }
    }
  }, [p1Name, p2Name, gameMode, hasStarted, playerEstimates, hasPromptedPlayers, hasCheckedReEstimate, showEstimateModal]);

  // Numpad-Handler für freie Zahleneingabe (0 bis 9)
  const handleNumpadPress = (digit: string) => {
    setModalError(null);
    setModalInputValue(prev => {
      // Keine führende 0 erlauben
      if (!prev && digit === '0') return '';
      const next = prev + digit;
      const num = parseInt(next, 10);
      // Maximal 100% erlauben
      if (num > 100) return prev;
      return next;
    });
  };

  const handleNumpadBackspace = () => {
    setModalError(null);
    setModalInputValue(prev => prev.slice(0, -1));
  };

  const handleNumpadClear = () => {
    setModalError(null);
    setModalInputValue('');
  };

  const handleConfirmEstimate = async () => {
    const num = parseInt(modalInputValue, 10);
    if (isNaN(num) || num < 1 || num > 100) {
      setModalError('Bitte eine ganze Zahl zwischen 1 und 100 ohne Komma eingeben.');
      return;
    }
    setIsSavingEstimate(true);
    const targetPlayer = modalTargetPlayer;
    const res = await updateEstimatedDoubleQuoteAction(targetPlayer, num);
    setIsSavingEstimate(false);
    if (res.success) {
      // 1. Lokalen State und Server-Props sofort synchronisieren
      setPlayerEstimates(prev => ({ ...prev, [targetPlayer]: num }));
      setReEstimateData(prev => ({ ...prev, [targetPlayer]: null }));
      router.refresh();

      // 2. Bei 1vs1 prüfen: Braucht der andere Spieler auch noch eine Selbsteinschätzung oder Re-Estimate?
      if (gameMode === '1vs1') {
        const otherPlayer = targetPlayer === p1Name ? p2Name : p1Name;
        if (otherPlayer && !playerEstimates[otherPlayer]) {
          // Nahtlos direkt für Spieler 2 öffnen
          setModalTargetPlayer(otherPlayer);
          setModalInputValue('');
          setModalError(null);
          setHasPromptedPlayers(prev => ({ ...prev, [otherPlayer]: true }));
          return;
        }
        if (otherPlayer && reEstimateData[otherPlayer]?.needsReEstimate && !hasPromptedPlayers[otherPlayer]) {
          setModalTargetPlayer(otherPlayer);
          setModalInputValue(String(reEstimateData[otherPlayer]!.suggestedEstimate));
          setModalError(null);
          setHasPromptedPlayers(prev => ({ ...prev, [otherPlayer]: true }));
          return;
        }
      }

      // 3. Wenn alle Spieler versorgt sind: Modal schliessen & direkt ins Spiel starten
      setShowEstimateModal(false);
      setModalInputValue('');
      setModalError(null);
      setIsMatchStarted(true);
      setShowSetupSettings(false);
    } else {
      setModalError(res.error || 'Fehler beim Speichern in der Datenbank');
    }
  };

  // Expliziter Startbutton-Handler
  const handleStartMatch = () => {
    // 1. Prüfen, ob Spieler 1 eine Selbsteinschätzung benötigt
    if (!playerEstimates[p1Name]) {
      setModalTargetPlayer(p1Name);
      setModalInputValue('');
      setModalError(null);
      setShowEstimateModal(true);
      return;
    }
    // 1b. Prüfen, ob Spieler 1 eine Re-Estimate-Aufforderung offen hat
    if (reEstimateData[p1Name]?.needsReEstimate && !hasPromptedPlayers[p1Name]) {
      setModalTargetPlayer(p1Name);
      setModalInputValue(String(reEstimateData[p1Name]!.suggestedEstimate));
      setModalError(null);
      setShowEstimateModal(true);
      setHasPromptedPlayers(prev => ({ ...prev, [p1Name]: true }));
      return;
    }

    // 2. Bei 1vs1 prüfen, ob Spieler 2 eine Selbsteinschätzung oder Re-Estimate benötigt
    if (gameMode === '1vs1') {
      if (!playerEstimates[p2Name]) {
        setModalTargetPlayer(p2Name);
        setModalInputValue('');
        setModalError(null);
        setShowEstimateModal(true);
        return;
      }
      if (reEstimateData[p2Name]?.needsReEstimate && !hasPromptedPlayers[p2Name]) {
        setModalTargetPlayer(p2Name);
        setModalInputValue(String(reEstimateData[p2Name]!.suggestedEstimate));
        setModalError(null);
        setShowEstimateModal(true);
        setHasPromptedPlayers(prev => ({ ...prev, [p2Name]: true }));
        return;
      }
    }

    // Beide Spieler sind startbereit: Spiel aktivieren
    setIsMatchStarted(true);
    setShowSetupSettings(false);
    playHitSound(1);
  };

  // Tastatur-Bedienung für das Numpad (0-9, Backspace, Delete/C, Enter, Escape)
  useEffect(() => {
    if (!showEstimateModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumpadPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleNumpadBackspace();
      } else if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleNumpadClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmEstimate();
      } else if (e.key === 'Escape' && playerEstimates[modalTargetPlayer]) {
        e.preventDefault();
        setShowEstimateModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEstimateModal, modalInputValue, modalTargetPlayer, playerEstimates]);


  // Wurf eintragen
  const handleScore = (hits: number) => {
    const curPlayer = (gameMode === 'solo' || activePlayer === 1) ? p1Name : p2Name;
    if (!playerEstimates[curPlayer]) {
      setModalTargetPlayer(curPlayer);
      setModalInputValue('');
      setModalError('Bitte gib zuerst deine geschätzte Doppelquote an, bevor du startest.');
      setShowEstimateModal(true);
      return;
    }

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


  // Direkte Touch-Korrektur auf einer Shot-Box: Waehlt die Aufnahme an oder schaltet bei erneutem Antippen Treffer durch (0 -> 1 -> 2 -> 3 -> 0)
  const handleDirectShotClick = (idx: number) => {
    const curVal = curShots[idx];
    if (currentShotIndex === idx && curVal !== null) {
      const nextVal = (curVal + 1) % 4;
      playHitSound(nextVal);
      if (gameMode === 'solo' || activePlayer === 1) {
        const newP1 = { ...scoresP1 };
        newP1[curTarget] = [...newP1[curTarget]];
        newP1[curTarget][idx] = nextVal;
        setScoresP1(newP1);
      } else {
        const newP2 = { ...scoresP2 };
        newP2[curTarget] = [...newP2[curTarget]];
        newP2[curTarget][idx] = nextVal;
        setScoresP2(newP2);
      }
    } else {
      setCurrentShotIndex(idx);
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
    if (isSavedInCloud) {
      setSaveStatus('ℹ️ Dieses Spiel wurde bereits in der Cloud gespeichert.');
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    const p1Id = players.find(p => p.name === p1Name)?.id || null;
    const p2Id = players.find(p => p.name === p2Name)?.id || null;
    const sessionId = gameSessionId;
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
        is_winner: isWin,
        estimated_quote: playerEstimates[pName] ?? null
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
      setIsSavedInCloud(true);
      // Nach erfolgreichem Speichern: Cache leeren
      localStorage.removeItem(CACHE_KEY);
      setRestoredFromCache(false);
      setSaveStatus('✅ Erfolgreich in Supabase Cloud gespeichert!');
      setTimeout(() => setSaveStatus(null), 4000);
      // Lokal in Historie einfügen
      setHistory(prev => {
        const filtered = prev.filter(h => h.session_id !== sessionId);
        return [...sessionsToSave.map(s => ({ ...s, is_aborted: 0, created_at: new Date().toISOString() })), ...filtered];
      });

      // Nach Abschluss des Spiels direkt prüfen, ob die Quote nun dauerhaft übertroffen wurde
      checkPlayerNeedsReEstimateAction(p1Name).then((p1Check) => {
        if (p1Check.needsReEstimate) {
          setReEstimateData(prev => ({ ...prev, [p1Name]: p1Check }));
          setHasPromptedPlayers(prev => ({ ...prev, [p1Name]: false }));
        }
      });
      if (gameMode === '1vs1' && p2Name) {
        checkPlayerNeedsReEstimateAction(p2Name).then((p2Check) => {
          if (p2Check.needsReEstimate) {
            setReEstimateData(prev => ({ ...prev, [p2Name]: p2Check }));
            setHasPromptedPlayers(prev => ({ ...prev, [p2Name]: false }));
          }
        });
      }
    } else {
      setSaveStatus('⚠️ Fehler beim Speichern: ' + res.error);
    }
  };

  const autoSavePrompt = (p1: any, p2: any) => {
    const s1 = calcStats(p1);
    const est1 = playerEstimates[p1Name];
    let compMsg = '';
    if (est1 !== null && est1 !== undefined) {
      const diff = Number((s1.quote - est1).toFixed(1));
      const sign = diff >= 0 ? '+' : '';
      compMsg = `\n\n🎯 Deine Selbsteinschätzung: ${est1}%\nErreichte Doppelquote: ${s1.quote.toFixed(1)}%\nDifferenz: ${sign}${diff}% (${diff >= 0 ? 'Übertroffen! 🌟' : 'Knapp darunter'})`;
    }
    if (confirm(`🎉 Training abgeschlossen!${compMsg}\n\nMöchtest du das Ergebnis jetzt direkt in der Cloud-Datenbank (Supabase) speichern?`)) {
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
        session_id: gameSessionId,
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
        session_id: gameSessionId,
        player_name: p1Name,
        opponent_name: gameMode === '1vs1' ? p2Name : null,
        game_mode: gameMode,
        total_hits: gameMode === 'solo' ? p1Stats.hits : (p1Stats.hits + p2Stats.hits),
        total_darts: dartsThrown,
        reason: 'Manueller Abbruch über "Neu" Button',
      });
    }

    setGameSessionId('dq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    setIsSavedInCloud(false);
    setSaveStatus(null);
    localStorage.removeItem(CACHE_KEY);
    setRestoredFromCache(false);
    setIsMatchStarted(false);
    setShowSetupSettings(false);
    setActiveTab('board');
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

  const curPlayerName = (gameMode === 'solo' || activePlayer === 1) ? p1Name : p2Name;
  const curPlayerPhoto = getPlayerPhotoUrl(curPlayerName);
  const curPlayerInitials = getPlayerInitials(curPlayerName);
  const curPlayerEstimate = playerEstimates[curPlayerName];

  // Wiederverwendbare Quoten-Tabellen für Tabelle-Tab & Spielende
  const renderQuotenTables = () => (
    <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-left">
      <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
        <span>📊</span> Quoten-Tabelle: {p1Name}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="border-b border-zinc-700 text-zinc-400 font-bold">
              <th className="py-2.5 text-left pl-2">Doppel</th>
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
                <tr key={t} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="py-2.5 text-left pl-2 font-black text-amber-400 text-sm">{t}</td>
                  <td className="font-mono text-zinc-400">{first5}</td>
                  <td className="font-mono text-zinc-400">{last5}</td>
                  <td className="font-bold text-white">{hits}</td>
                  <td className="font-bold text-amber-400">{pct}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-800 font-black text-white border-t-2 border-zinc-700">
              <td className="py-2.5 text-left pl-2">GESAMT</td>
              <td colSpan={2} className="text-zinc-400">{p1Stats.thrown} / 150 Darts</td>
              <td>{p1Stats.hits}</td>
              <td className="text-amber-400 text-sm">{p1Stats.quote.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {gameMode === '1vs1' && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <h2 className="text-sm sm:text-base font-black text-white mb-2 flex items-center gap-2">
            <span>📊</span> Quoten-Tabelle: {p2Name} (Gegner)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-400 font-bold">
                  <th className="py-2.5 text-left pl-2">Doppel</th>
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
                    <tr key={t} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                      <td className="py-2.5 text-left pl-2 font-black text-amber-400 text-sm">{t}</td>
                      <td className="font-mono text-zinc-400">{first5}</td>
                      <td className="font-mono text-zinc-400">{last5}</td>
                      <td className="font-bold text-white">{hits}</td>
                      <td className="font-bold text-amber-400">{pct}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-800 font-black text-white border-t-2 border-zinc-700">
                  <td className="py-2.5 text-left pl-2">GESAMT</td>
                  <td colSpan={2} className="text-zinc-400">{p2Stats.thrown} / 150 Darts</td>
                  <td>{p2Stats.hits}</td>
                  <td className="text-amber-400 text-sm">{p2Stats.quote.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
          Trainings-Notizen:
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="z. B. Stand, Rhythmus, bestes Doppel..."
          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
          rows={2}
        />
      </div>
    </div>
  );

  return (
    <div 
      className="dq-container max-w-[760px] mx-auto px-3 sm:px-4 py-4 flex flex-col gap-4 text-white"
      style={{ overscrollBehaviorY: 'contain' }}
    >
      {/* EINGABEMASKE: SELBSTEINSCHÄTZUNG DOPPELQUOTE (0 BIS 9 NUMPAD OHNE VORLAGE) */}
      {showEstimateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-900 border-2 border-amber-400 rounded-3xl p-5 sm:p-7 max-w-sm w-full shadow-2xl shadow-amber-500/20 text-center space-y-4">
            {/* Icon */}
            {reEstimateData[modalTargetPlayer]?.type === 'unlocked_increase' ? (
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30 animate-pulse">
                🚀
              </div>
            ) : reEstimateData[modalTargetPlayer]?.type === 'unlocked_decrease' ? (
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
                📉
              </div>
            ) : (
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
                🎯
              </div>
            )}

            {/* Header & Frage */}
            <div>
              {reEstimateData[modalTargetPlayer]?.type === 'unlocked_increase' ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-black uppercase tracking-widest text-amber-400 shadow-sm">
                    <span>🌟</span> Leistungssteigerung erkannt
                  </div>
                  <div className="text-xs font-bold text-zinc-400">
                    {modalTargetPlayer} {gameMode === '1vs1' ? (modalTargetPlayer === p1Name ? '(Spieler 1)' : '(Spieler 2)') : ''}
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                    Passe deine Selbsteinschätzung an!
                  </h2>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1.5 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Bisherige Schätzung:</span>
                      <span className="font-mono font-bold text-zinc-300">{reEstimateData[modalTargetPlayer]?.currentEstimate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Schnitt letzte {reEstimateData[modalTargetPlayer]?.recentGamesCount} Spiele:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {reEstimateData[modalTargetPlayer]?.averageRecentQuote}%
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 pt-1.5 border-t border-amber-500/20 leading-relaxed">
                      Du triffst dauerhaft auf oder über deiner Schätzung (drüber oder ±1%)! Bitte passe deinen Zielwert nach oben an.
                    </p>
                  </div>
                </div>
              ) : reEstimateData[modalTargetPlayer]?.type === 'unlocked_decrease' ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black uppercase tracking-widest text-amber-400 shadow-sm">
                    <span>📉</span> Korrektur nach unten freigeschaltet
                  </div>
                  <div className="text-xs font-bold text-zinc-400">
                    {modalTargetPlayer} {gameMode === '1vs1' ? (modalTargetPlayer === p1Name ? '(Spieler 1)' : '(Spieler 2)') : ''}
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                    Selbsteinschätzung korrigieren
                  </h2>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1.5 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Bisherige Schätzung:</span>
                      <span className="font-mono font-bold text-zinc-300">{reEstimateData[modalTargetPlayer]?.currentEstimate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Schnitt letzte {reEstimateData[modalTargetPlayer]?.recentGamesCount} Spiele:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {reEstimateData[modalTargetPlayer]?.averageRecentQuote}%
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 pt-1.5 border-t border-amber-500/20 leading-relaxed">
                      Du hast deine Schätzung in den letzten Spielen zu oft verfehlt. Du kannst deinen Zielwert jetzt realistisch anpassen.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-[11px] uppercase font-black tracking-widest text-amber-400">
                    Selbsteinschätzung · {modalTargetPlayer} {gameMode === '1vs1' ? (modalTargetPlayer === p1Name ? '(Spieler 1)' : '(Spieler 2)') : ''}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-1 leading-snug">
                    Wie schätzt du dein Doppelquotenniveau ein?
                  </h2>
                  <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                    Tippe deinen geschätzten Prozentwert (1–100%) über das Zahlenfeld ein. Diese Abfrage erfolgt nur <strong>einmalig</strong> und wird fest in der Datenbank gespeichert!
                  </p>
                </>
              )}
            </div>

            {/* Display der eingegebenen Prozentzahl */}
            <div className="space-y-1.5">
              <div className="w-full max-w-[240px] mx-auto bg-zinc-950 border-2 border-amber-500/50 rounded-2xl py-3 px-4 flex items-center justify-center gap-1 shadow-inner">
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-wider text-white">
                  {modalInputValue || <span className="text-zinc-600 font-normal">--</span>}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  %
                </span>
              </div>

              {modalError && (
                <div className="text-xs font-bold text-rose-400 animate-fadeIn">
                  {modalError}
                </div>
              )}
            </div>

            {/* 0 bis 9 Touch-Numpad (ohne Vorlagen) */}
            <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto select-none touch-manipulation pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumpadPress(String(digit))}
                  className="h-13 sm:h-14 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700 active:bg-amber-500 active:text-zinc-950 active:scale-95 text-white text-2xl font-black border border-zinc-700 shadow-md transition-all flex items-center justify-center cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              {/* C (Löschen / Clear) */}
              <button
                type="button"
                onClick={handleNumpadClear}
                title="Eingabe löschen"
                className="h-13 sm:h-14 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-600 active:text-white active:scale-95 text-rose-400 text-lg font-black border border-rose-500/30 shadow-md transition-all flex items-center justify-center cursor-pointer"
              >
                C
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => handleNumpadPress('0')}
                className="h-13 sm:h-14 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700 active:bg-amber-500 active:text-zinc-950 active:scale-95 text-white text-2xl font-black border border-zinc-700 shadow-md transition-all flex items-center justify-center cursor-pointer"
              >
                0
              </button>

              {/* ⌫ (Backspace) */}
              <button
                type="button"
                onClick={handleNumpadBackspace}
                title="Letzte Ziffer löschen"
                className="h-13 sm:h-14 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500 active:text-zinc-950 text-amber-400 text-xl font-black border border-amber-500/30 shadow-md transition-all flex items-center justify-center cursor-pointer"
              >
                ⌫
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {playerEstimates[modalTargetPlayer] && (
                <button
                  type="button"
                  onClick={() => setShowEstimateModal(false)}
                  className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
              )}
              <button
                type="button"
                disabled={isSavingEstimate || !modalInputValue}
                onClick={handleConfirmEstimate}
                className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-zinc-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingEstimate ? (
                  <span>Speichere...</span>
                ) : (
                  <>
                    <span>
                      {reEstimateData[modalTargetPlayer]?.type === 'unlocked_increase'
                        ? 'Neue Einschätzung übernehmen & starten'
                        : reEstimateData[modalTargetPlayer]?.type === 'unlocked_decrease'
                        ? 'Angepasste Einschätzung übernehmen'
                        : 'Einschätzung bestätigen & starten'}
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION: SLIM LEISTE WENN SPIEL AKTIV, ANSONSTEN HEADER MIT TABS */}
      {isPlaying ? (
        <div
          data-ui-id="CHECKOUT.NAV.PLAYING_BAR"
          className="flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-700/80 rounded-2xl p-3 px-4 shadow-xl text-xs"
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSafeNavigation('/training')}
              data-ui-id="CHECKOUT.NAV.BACK_BTN"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
              title="Zurück zur Trainingsauswahl"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Trainingsauswahl</span>
            </button>

            <button
              onClick={() => setShowSetupSettings(!showSetupSettings)}
              data-ui-id="CHECKOUT.NAV.SETUP_BTN"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
              title="Setup anpassen"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Setup ({gameMode === 'solo' ? 'Solo' : '1 vs 1'})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              data-ui-id="CHECKOUT.NAV.SOUND_BTN"
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700'
              }`}
              title={soundEnabled ? 'Ton an' : 'Ton aus'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <Link
              href="/doppelquote/live"
              target="_blank"
              data-ui-id="CHECKOUT.NAV.TV_BTN"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="TV Live-Board öffnen"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TV Board</span>
            </Link>

            <button
              onClick={resetGame}
              data-ui-id="CHECKOUT.NAV.RESET_BTN"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
              title="Spiel abbrechen / neu starten"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Neu</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          data-ui-id="CHECKOUT.NAV.SETUP_BAR"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-700/80 rounded-2xl p-4 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSafeNavigation('/training')}
              data-ui-id="CHECKOUT.NAV.BACK_BTN"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Zurück zur Trainingsauswahl</span>
            </button>

            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3 text-amber-400" /> Checkout Battle Routine
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>🎯</span> Checkout Battle (Doppelquote)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              data-ui-id="CHECKOUT.NAV.SOUND_BTN"
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700'
              }`}
              title={soundEnabled ? 'Ton an' : 'Ton aus'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <Link
              href="/doppelquote/live"
              target="_blank"
              data-ui-id="CHECKOUT.NAV.TV_BTN"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="TV Live-Board öffnen"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV Live-Board</span>
            </Link>

            <button
              onClick={resetGame}
              data-ui-id="CHECKOUT.NAV.RESET_BTN"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Neu</span>
            </button>
          </div>
        </div>
      )}

      {/* TABS: NUR SICHTBAR WENN KEIN SPIEL AKTIV LÄUFT */}
      {!isPlaying && (
        <div
          data-ui-id="CHECKOUT.NAV.TABS_BAR"
          className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto text-xs font-bold"
        >
          <button
            onClick={() => setActiveTab('board')}
            data-ui-id="CHECKOUT.NAV.TAB_BOARD"
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'board'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Wurf-Board & Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            data-ui-id="CHECKOUT.NAV.TAB_TABLE"
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'table'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Quoten & Tabellen</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            data-ui-id="CHECKOUT.NAV.TAB_HISTORY"
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <span>📜</span>
            <span>Verlauf</span>
          </button>
        </div>
      )}

      {/* LOKALER GERÄTE-CACHE HINWEIS BANNER */}
      {restoredFromCache && isGameActive && (
        <div className="bg-zinc-900 border border-amber-500/40 rounded-xl p-2.5 px-3.5 flex items-center justify-between text-xs text-amber-200 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span><strong>Geräte-Cache aktiv:</strong> Laufendes Spiel wurde nahtlos aus deinem lokalen Speicher wiederhergestellt.</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 text-amber-400">Lokal gesichert</span>
        </div>
      )}

      {/* VORGELAGERTES MATCH-SETUP (VOR SPIELSTART) */}
      {!isPlaying && !isCompleted && activeTab === 'board' && (
        <div className="space-y-5 animate-fadeIn" data-ui-id="CHECKOUT.SETUP.CARD">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Vorgelagertes Match-Setup
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                  Spieler & Modus festlegen
                </h2>
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                Offizielles Checkout Battle (150 Darts)
              </div>
            </div>

            {/* Modus Auswahl */}
            <div className="space-y-2" data-ui-id="CHECKOUT.SETUP.MODE_TOGGLE">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Spielmodus wählen:
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  data-ui-id="CHECKOUT.SETUP.MODE_SOLO_BTN"
                  onClick={() => {
                    setGameMode('solo');
                    setActivePlayer(1);
                    if (!isBoardUser && userPlayerMatch) {
                      setP1Name(userPlayerMatch.name);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    gameMode === 'solo'
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black shadow-lg shadow-amber-500/20'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Solo-Training</span>
                </button>

                <button
                  type="button"
                  data-ui-id="CHECKOUT.SETUP.MODE_1VS1_BTN"
                  onClick={() => setGameMode('1vs1')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    gameMode === '1vs1'
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black shadow-lg shadow-amber-500/20'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>1 vs 1 Duell</span>
                </button>
              </div>
            </div>

            {/* Spieler Dropdowns */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Spieler 1 */}
                <div className="space-y-1.5" data-ui-id="CHECKOUT.SETUP.P1_WRAPPER">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-white">
                      Spieler 1 am Oche:
                    </label>
                    {gameMode === 'solo' && !isBoardUser && userPlayerMatch && (
                      <span className="text-[10px] text-zinc-400 font-semibold">
                        (Fest mit Account verknüpft)
                      </span>
                    )}
                  </div>
                  {gameMode === 'solo' && !isBoardUser && userPlayerMatch ? (
                    <div className="w-full bg-zinc-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white flex items-center justify-between shadow-inner">
                      <span className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{userPlayerMatch.name}</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded shrink-0 ml-2">
                        Fest fixiert
                      </span>
                    </div>
                  ) : (
                    <select
                      value={p1Name}
                      onChange={(e) => setP1Name(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {players.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} {p.team && p.team !== 'Kein Team' ? `(${p.team})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Spieler 2 (nur Duell) */}
                {gameMode === '1vs1' ? (
                  <div className="space-y-1.5" data-ui-id="CHECKOUT.SETUP.P2_WRAPPER">
                    <label className="text-xs font-bold uppercase tracking-wider text-white">
                      Spieler 2 (Gegner):
                    </label>
                    <select
                      value={p2Name}
                      onChange={(e) => setP2Name(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {players.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} {p.team && p.team !== 'Kein Team' ? `(${p.team})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-center">
                    🎯 Einzeltraining: 50 Aufnahmen auf Doppel D20, D10, D16, D8, D4.
                  </div>
                )}
              </div>
            </div>

            {/* Selbsteinschätzung Doppelquotenniveau */}
            <div className="space-y-2 pt-2 border-t border-zinc-800" data-ui-id="CHECKOUT.SETUP.ESTIMATE_BOX">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Zielvorgabe (Selbsteinschätzung Doppelquote):
              </div>
              <div className={`grid gap-2.5 ${gameMode === '1vs1' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Spieler 1 */}
                <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border transition-all ${
                  reEstimateData[p1Name]?.type === 'unlocked_increase'
                    ? 'border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : reEstimateData[p1Name]?.type === 'unlocked_decrease'
                    ? 'border-amber-500/40'
                    : 'border-zinc-800'
                }`}>
                  <div className="min-w-0 pr-2">
                    <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                      <span>{p1Name}</span>
                      {reEstimateData[p1Name]?.type === 'unlocked_increase' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-400/40 px-1.5 py-0.5 rounded font-black flex items-center gap-1">
                          🚀 {reEstimateData[p1Name]?.needsReEstimate ? 'Steigerung!' : 'Bestätigt (±1%)'}
                        </span>
                      )}
                      {reEstimateData[p1Name]?.type === 'unlocked_decrease' && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400/90 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          📉 Ziel verfehlt
                        </span>
                      )}
                      {playerEstimates[p1Name] && reEstimateData[p1Name]?.isLocked && (
                        <span className="text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-zinc-500" /> Fixiert
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>Niveau:</span>
                      <span className={playerEstimates[p1Name] ? "text-amber-400 font-mono font-black text-sm" : "text-amber-400/80 font-bold"}>
                        {playerEstimates[p1Name] ? `${playerEstimates[p1Name]}%` : 'Nicht festgelegt'}
                      </span>
                      {reEstimateData[p1Name] && reEstimateData[p1Name]!.averageRecentQuote > 0 && (
                        <span className="text-[11px] text-zinc-400">
                          (Schnitt: <strong className="text-amber-400 font-mono">{reEstimateData[p1Name]?.averageRecentQuote}%</strong>)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Button: Gesperrt vs Anpassen vs Festlegen */}
                  {!playerEstimates[p1Name] ? (
                    <button
                      type="button"
                      data-ui-id="CHECKOUT.SETUP.ESTIMATE_P1_BTN"
                      onClick={() => {
                        setModalTargetPlayer(p1Name);
                        setModalInputValue('');
                        setModalError(null);
                        setShowEstimateModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all shrink-0 cursor-pointer"
                    >
                      ⚠️ Festlegen
                    </button>
                  ) : reEstimateData[p1Name]?.isLocked ? (
                    <button
                      type="button"
                      data-ui-id="CHECKOUT.SETUP.ESTIMATE_P1_BTN"
                      onClick={() => {
                        alert(reEstimateData[p1Name]?.lockReason || 'Dieser Zielwert ist aktuell gesperrt. Er kann erst angepasst werden, wenn du ihn dauerhaft erreichst (drüber / ±1%) oder nach 5–7 Spielen deutlich verfehlst.');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-400 border border-zinc-800 text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                      title={reEstimateData[p1Name]?.lockReason || 'Zielwert ist gesperrt'}
                    >
                      <Lock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Gesperrt</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-ui-id="CHECKOUT.SETUP.ESTIMATE_P1_BTN"
                      onClick={() => {
                        setModalTargetPlayer(p1Name);
                        setModalInputValue(
                          reEstimateData[p1Name]?.suggestedEstimate
                            ? String(reEstimateData[p1Name]!.suggestedEstimate)
                            : (playerEstimates[p1Name] ? String(playerEstimates[p1Name]) : '')
                        );
                        setModalError(null);
                        setShowEstimateModal(true);
                      }}
                      className={reEstimateData[p1Name]?.type === 'unlocked_increase'
                        ? "px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 shrink-0 cursor-pointer animate-pulse flex items-center gap-1.5"
                        : "px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                      }
                    >
                      <span>{reEstimateData[p1Name]?.type === 'unlocked_increase' ? '🚀 Anpassen' : '📉 Anpassen'}</span>
                    </button>
                  )}
                </div>

                {/* Spieler 2 (nur 1vs1) */}
                {gameMode === '1vs1' && (
                  <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border transition-all ${
                    reEstimateData[p2Name]?.type === 'unlocked_increase'
                      ? 'border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : reEstimateData[p2Name]?.type === 'unlocked_decrease'
                      ? 'border-amber-500/40'
                      : 'border-zinc-800'
                  }`}>
                    <div className="min-w-0 pr-2">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                        <span>{p2Name}</span>
                        {reEstimateData[p2Name]?.type === 'unlocked_increase' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-400/40 px-1.5 py-0.5 rounded font-black flex items-center gap-1">
                            🚀 {reEstimateData[p2Name]?.needsReEstimate ? 'Steigerung!' : 'Bestätigt (±1%)'}
                          </span>
                        )}
                        {reEstimateData[p2Name]?.type === 'unlocked_decrease' && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400/90 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                            📉 Ziel verfehlt
                          </span>
                        )}
                        {playerEstimates[p2Name] && reEstimateData[p2Name]?.isLocked && (
                          <span className="text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-zinc-500" /> Fixiert
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>Niveau:</span>
                        <span className={playerEstimates[p2Name] ? "text-amber-400 font-mono font-black text-sm" : "text-amber-400/80 font-bold"}>
                          {playerEstimates[p2Name] ? `${playerEstimates[p2Name]}%` : 'Nicht festgelegt'}
                        </span>
                        {reEstimateData[p2Name] && reEstimateData[p2Name]!.averageRecentQuote > 0 && (
                          <span className="text-[11px] text-zinc-400">
                            (Schnitt: <strong className="text-amber-400 font-mono">{reEstimateData[p2Name]?.averageRecentQuote}%</strong>)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Button: Gesperrt vs Anpassen vs Festlegen */}
                    {!playerEstimates[p2Name] ? (
                      <button
                        type="button"
                        data-ui-id="CHECKOUT.SETUP.ESTIMATE_P2_BTN"
                        onClick={() => {
                          setModalTargetPlayer(p2Name);
                          setModalInputValue('');
                          setModalError(null);
                          setShowEstimateModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all shrink-0 cursor-pointer"
                      >
                        ⚠️ Festlegen
                      </button>
                    ) : reEstimateData[p2Name]?.isLocked ? (
                      <button
                        type="button"
                        data-ui-id="CHECKOUT.SETUP.ESTIMATE_P2_BTN"
                        onClick={() => {
                          alert(reEstimateData[p2Name]?.lockReason || 'Dieser Zielwert ist aktuell gesperrt. Er kann erst angepasst werden, wenn du ihn dauerhaft erreichst (drüber / ±1%) oder nach 5–7 Spielen deutlich verfehlst.');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-400 border border-zinc-800 text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                        title={reEstimateData[p2Name]?.lockReason || 'Zielwert ist gesperrt'}
                      >
                        <Lock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Gesperrt</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-ui-id="CHECKOUT.SETUP.ESTIMATE_P2_BTN"
                        onClick={() => {
                          setModalTargetPlayer(p2Name);
                          setModalInputValue(
                            reEstimateData[p2Name]?.suggestedEstimate
                              ? String(reEstimateData[p2Name]!.suggestedEstimate)
                              : (playerEstimates[p2Name] ? String(playerEstimates[p2Name]) : '')
                          );
                          setModalError(null);
                          setShowEstimateModal(true);
                        }}
                        className={reEstimateData[p2Name]?.type === 'unlocked_increase'
                          ? "px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 shrink-0 cursor-pointer animate-pulse flex items-center gap-1.5"
                          : "px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                        }
                      >
                        <span>{reEstimateData[p2Name]?.type === 'unlocked_increase' ? '🚀 Anpassen' : '📉 Anpassen'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Großer prominenter Startbutton */}
            <div className="pt-2">
              <button
                type="button"
                data-ui-id="CHECKOUT.SETUP.START_BTN"
                onClick={handleStartMatch}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-zinc-950 font-black text-lg sm:text-xl shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-3 cursor-pointer select-none"
              >
                <Play className="w-6 h-6 fill-current" />
                <span>SPIEL STARTEN</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Disziplin Übersicht Kacheln */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-zinc-800" data-ui-id="CHECKOUT.SETUP.TARGETS_OVERVIEW">
              {TARGETS.map(t => (
                <div key={t} className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-base font-black text-amber-400">{t}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">10 Runden (30 D.)</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SETUP ANPASSEN WÄHREND DES SPIELS */}
      {isPlaying && showSetupSettings && (
        <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-black uppercase text-white">Setup anpassen</span>
            </div>
            <button
              onClick={() => setShowSetupSettings(false)}
              className="text-xs font-bold text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              ✕ Schließen
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-zinc-400 block">Spieler 1:</span>
              <span className="text-white font-bold text-sm">{p1Name}</span>
            </div>
            {gameMode === '1vs1' && (
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 block">Spieler 2 (Gegner):</span>
                <span className="text-white font-bold text-sm">{p2Name}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSetupSettings(false)}
            className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>✓ Einstellungen schließen & weiterspielen</span>
          </button>
        </div>
      )}

      {/* GROSSE HERO-ANZEIGE: WER IST AM ZUG */}
      {isPlaying && (
        <div
          data-ui-id="CHECKOUT.MATCH.HERO_PLAYER"
          className="p-4 sm:p-5 rounded-3xl border-2 border-zinc-700/80 bg-zinc-900 shadow-2xl transition-all duration-300 relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 bg-amber-400" />

          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
              {/* Foto / Initialen mit Live Pulse */}
              <div className="relative shrink-0">
                {curPlayerPhoto ? (
                  <img
                    src={curPlayerPhoto}
                    alt={curPlayerName}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 ring-4 ring-amber-500/20 shadow-xl"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-amber-400 ring-4 ring-amber-500/20 bg-zinc-950 flex items-center justify-center text-2xl sm:text-3xl font-black text-amber-400 shadow-xl">
                    {curPlayerInitials}
                  </div>
                )}
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-amber-400" />
                  <span className="relative inline-flex rounded-full h-4 w-4 border-2 border-zinc-950 bg-amber-400" />
                </span>
              </div>

              {/* Spieler Name & Badge */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm">
                    🎯 JETZT AM WURF {gameMode === '1vs1' ? `· SPIELER ${activePlayer}` : ''}
                  </span>
                  {curPlayerEstimate && (
                    <span className="text-[10px] font-bold text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                      Ziel: {curPlayerEstimate}%
                    </span>
                  )}
                </div>
                <div className="text-2xl sm:text-4xl font-black text-white tracking-wide truncate mt-1">
                  {curPlayerName}
                </div>
              </div>
            </div>


          </div>

          {/* 1 vs 1 Duell Score-Vergleich */}
          {gameMode === '1vs1' && (
            <div className="mt-3.5 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-2 text-xs" data-ui-id="CHECKOUT.MATCH.DUEL_BAR">
              <div className={`p-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-between ${
                activePlayer === 1 
                  ? 'bg-zinc-800 border-2 border-amber-400 text-white font-black shadow-md' 
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-400 font-semibold'
              }`}>
                <div className="truncate flex items-center gap-1.5">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    activePlayer === 1 ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-amber-400'
                  }`}>P1</span>
                  <span className="truncate">{p1Name}</span>
                </div>
                <div className="font-mono text-amber-400 text-xs shrink-0 ml-1">
                  {p1Stats.hits} Tr. ({p1Stats.quote.toFixed(0)}%)
                </div>
              </div>

              <div className={`p-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-between ${
                activePlayer === 2 
                  ? 'bg-zinc-800 border-2 border-amber-400 text-white font-black shadow-md' 
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-400 font-semibold'
              }`}>
                <div className="truncate flex items-center gap-1.5">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    activePlayer === 2 ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-amber-400'
                  }`}>P2</span>
                  <span className="truncate">{p2Name}</span>
                </div>
                <div className="font-mono text-amber-400 text-xs shrink-0 ml-1">
                  {p2Stats.hits} Tr. ({p2Stats.quote.toFixed(0)}%)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TARGET NAV PILLS */}
      {isPlaying && (
        <div className="flex gap-1.5 overflow-x-auto pb-1" data-ui-id="CHECKOUT.MATCH.TARGET_NAV">
          {TARGETS.map((t, idx) => {
            const shots = scoresP1[t];
            const isDone = shots.filter(s => s !== null).length === 10;
            const isActive = idx === currentTargetIndex;

            return (
              <button
                key={t}
                onClick={() => {
                  setCurrentTargetIndex(idx);
                  const s = curScores[t];
                  const firstEmpty = s.findIndex(v => v === null);
                  setCurrentShotIndex(firstEmpty !== -1 ? firstEmpty : 9);
                }}
                className={`flex-1 min-w-[58px] py-2 px-1 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-amber-500 border-amber-400 text-zinc-950 font-black shadow-lg shadow-amber-500/20 scale-105' 
                    : isDone 
                    ? 'bg-zinc-800 border-zinc-700 text-white font-bold' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="text-sm font-black">{t}</div>
                <div className="text-[10px] opacity-75">{isDone ? '✓ Fertig' : `${shots.filter(s => s !== null).length}/10`}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* VIEW 1: LIVE BOARD */}
      {isPlaying && activeTab === 'board' && (
        <div
          data-ui-id="CHECKOUT.MATCH.BOARD_CARD"
          className="bg-zinc-900 border border-zinc-700/80 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-center"
        >
          {/* Target Hero Display */}
          <div
            data-ui-id="CHECKOUT.MATCH.CURRENT_TARGET"
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 mb-1">
              <span className="uppercase tracking-widest">Aktuelles Doppelfeld</span>
              {playerEstimates[(gameMode === 'solo' || activePlayer === 1) ? p1Name : p2Name] && (
                <span className="text-amber-400 bg-zinc-900 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  🎯 Ziel: {playerEstimates[(gameMode === 'solo' || activePlayer === 1) ? p1Name : p2Name]}%
                </span>
              )}
            </div>
            <div className="text-5xl sm:text-6xl font-black text-amber-400 tracking-wider my-1 drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              {curTarget}
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-zinc-400 mt-2">
              <span>Aufnahme <strong className="text-white">{currentShotIndex + 1}</strong> von 10</span>
              <span>Treffer: <strong className="text-amber-400">{curTargetHits} / 30</strong> ({curTargetPct}%)</span>
            </div>

            {/* Progress Bar */}
            <div
              data-ui-id="CHECKOUT.MATCH.PROGRESS_BAR"
              className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-2 border border-zinc-700"
            >
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                style={{ width: `${((curShots.filter(s => s !== null).length) / 10) * 100}%` }}
              />
            </div>

            {/* 10 Shot Boxes (Größer mit direkter Touch-Korrektur & Smaragdgrün-Semantik) */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mt-3" data-ui-id="CHECKOUT.MATCH.SHOT_BOXES">
              {curShots.map((val, idx) => {
                const isCurrent = idx === currentShotIndex;
                let bgCls = 'bg-zinc-950/80 text-zinc-600 border-zinc-800';
                if (isCurrent) {
                  bgCls = 'bg-amber-400 text-zinc-950 font-black border-amber-300 ring-4 ring-amber-400/50 scale-105 shadow-lg shadow-amber-500/30 z-10';
                } else if (val === 0) {
                  bgCls = 'bg-red-950/30 text-red-400/80 border-red-900/40 line-through';
                } else if (val === 1) {
                  bgCls = 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60 font-black shadow-sm';
                } else if (val === 2) {
                  bgCls = 'bg-emerald-900/80 text-emerald-200 border-emerald-500 font-black shadow-sm';
                } else if (val === 3) {
                  bgCls = 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-zinc-950 font-black border-emerald-300 shadow-md shadow-emerald-500/30';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDirectShotClick(idx)}
                    title={`Aufnahme ${idx + 1} anwählen oder antippen zum Durchschalten`}
                    className={`min-h-[54px] sm:min-h-[60px] rounded-xl flex flex-col items-center justify-center p-1 text-sm sm:text-base transition-all border-2 ${bgCls} cursor-pointer active:scale-95`}
                  >
                    <span className="text-[10px] sm:text-xs font-bold uppercase opacity-80">#{idx + 1}</span>
                    <span className="text-base sm:text-lg font-black font-mono">
                      {val !== null ? val : '·'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

                    {/* TOUCH BUTTONS (0, 1, 2, 3 TREFFER - Smaragdgrün & Rot/Miss) */}
          <div className="grid grid-cols-2 gap-3" data-ui-id="CHECKOUT.MATCH.INPUT_GRID">
            <button
              onClick={() => handleScore(0)}
              data-ui-id="CHECKOUT.MATCH.INPUT_0"
              className="py-5 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 hover:from-red-950/40 hover:to-zinc-900 border-2 border-zinc-700 hover:border-red-700/60 text-zinc-300 hover:text-red-300 font-black text-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-md cursor-pointer group"
            >
              <span className="group-hover:scale-110 transition-transform">0</span>
              <span className="text-xs font-bold text-zinc-400 group-hover:text-red-400/80 uppercase tracking-wider mt-0.5">0 Treffer (Miss)</span>
            </button>
            <button
              onClick={() => handleScore(1)}
              data-ui-id="CHECKOUT.MATCH.INPUT_1"
              className="py-5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 active:scale-95 border-2 border-emerald-600/70 text-emerald-300 font-black text-2xl flex flex-col items-center justify-center transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <span>1</span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-0.5">1 Treffer</span>
            </button>
            <button
              onClick={() => handleScore(2)}
              data-ui-id="CHECKOUT.MATCH.INPUT_2"
              className="py-5 rounded-2xl bg-emerald-900/90 hover:bg-emerald-800 active:scale-95 border-2 border-emerald-500 text-emerald-200 font-black text-2xl flex flex-col items-center justify-center transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <span>2</span>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider mt-0.5">2 Treffer</span>
            </button>
            <button
              onClick={() => handleScore(3)}
              data-ui-id="CHECKOUT.MATCH.INPUT_3"
              className="py-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 active:scale-95 border-2 border-emerald-300 text-zinc-950 font-black text-2xl flex flex-col items-center justify-center transition-all shadow-xl shadow-emerald-500/30 cursor-pointer"
            >
              <span>3 ⭐</span>
              <span className="text-xs font-black text-zinc-950 uppercase tracking-wider mt-0.5">Maximum!</span>
            </button>
          </div>

          {/* CONTROLS */}
          <div className="flex gap-2" data-ui-id="CHECKOUT.MATCH.CONTROLS_BAR">
            <button
              onClick={handleUndo}
              data-ui-id="CHECKOUT.MATCH.UNDO_BTN"
              className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:bg-zinc-700 transition-colors cursor-pointer"
            >
              <RotateCcw size={14} /> Wurf korrigieren
            </button>
            <button
              onClick={() => {
                const nextIdx = (currentTargetIndex + 1) % TARGETS.length;
                setCurrentTargetIndex(nextIdx);
                setCurrentShotIndex(0);
              }}
              data-ui-id="CHECKOUT.MATCH.NEXT_TARGET_BTN"
              className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:bg-zinc-700 transition-colors cursor-pointer"
            >
              Nächstes Doppel <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ABSCHLUSS-KARTE (WENN SPIEL BEENDET IST) */}
      {isCompleted && activeTab === 'board' && (
        <div
          data-ui-id="CHECKOUT.COMPLETION.CARD"
          className="bg-zinc-900 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-fadeIn"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20">
            🏆
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              Trainingseinheit abgeschlossen
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              🎉 Checkout Battle beendet!
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Alle 5 Doppelfelder (150 Darts) wurden geworfen.
            </p>
          </div>

          {/* Resultate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
              <span className="text-xs font-bold text-zinc-400 block">{p1Name}</span>
              <div className="text-3xl font-black text-amber-400 font-mono mt-1">
                {p1Stats.quote.toFixed(1)}%
              </div>
              <span className="text-xs text-zinc-400 mt-1 block">
                {p1Stats.hits} Treffer / 150 Darts
              </span>
              {playerEstimates[p1Name] && (
                <div className="mt-2 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                  Ziel: <strong className="text-white">{playerEstimates[p1Name]}%</strong> (
                  <span className={p1Stats.quote >= playerEstimates[p1Name]! ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                    {(p1Stats.quote - playerEstimates[p1Name]!).toFixed(1)}%
                  </span>)
                </div>
              )}
            </div>

            {gameMode === '1vs1' && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                <span className="text-xs font-bold text-zinc-400 block">{p2Name}</span>
                <div className="text-3xl font-black text-amber-400 font-mono mt-1">
                  {p2Stats.quote.toFixed(1)}%
                </div>
                <span className="text-xs text-zinc-400 mt-1 block">
                  {p2Stats.hits} Treffer / 150 Darts
                </span>
                {playerEstimates[p2Name] && (
                  <div className="mt-2 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                    Ziel: <strong className="text-white">{playerEstimates[p2Name]}%</strong> (
                    <span className={p2Stats.quote >= playerEstimates[p2Name]! ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                      {(p2Stats.quote - playerEstimates[p2Name]!).toFixed(1)}%
                    </span>)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
            <button
              onClick={() => saveSession()}
              disabled={isSavedInCloud}
              data-ui-id="CHECKOUT.COMPLETION.SAVE_BTN"
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isSavedInCloud
                  ? 'bg-zinc-800 text-amber-400 border border-zinc-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-zinc-950 font-black shadow-lg shadow-amber-500/20 active:scale-[0.98]'
              }`}
            >
              {isSavedInCloud ? (
                <>
                  <CheckCircle2 size={16} className="text-amber-400" /> Bereits in Cloud gespeichert
                </>
              ) : (
                <>
                  <Save size={16} /> In Supabase Cloud speichern
                </>
              )}
            </button>
            <button
              onClick={resetGame}
              data-ui-id="CHECKOUT.COMPLETION.NEW_GAME_BTN"
              className="py-3 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-sm transition-all cursor-pointer"
            >
              Neues Spiel starten
            </button>
          </div>

          {/* Quoten-Tabelle direkt darunter */}
          <div className="pt-4 text-left">
            {renderQuotenTables()}
          </div>
        </div>
      )}

      {/* VIEW 2: QUOTEN & TABELLEN */}
      {activeTab === 'table' && renderQuotenTables()}

      {/* VIEW 3: VERLAUF */}
      {activeTab === 'history' && (() => {
        const isAdmin = user?.role === 'admin';
        const currentUserName = user?.name?.trim().toLowerCase();

        // Unique players for admin filter
        const uniquePlayers = Array.from(
          new Set(
            history
              .map(h => h.player_name)
              .filter(Boolean)
          )
        ).sort();

        const visibleHistory = history.filter(h => {
          const isAborted = Number(h.is_aborted || 0) === 1;
          if (isAdmin) {
            if (adminPlayerFilter !== 'all') {
              const matchesPlayer =
                h.player_name?.toLowerCase() === adminPlayerFilter.toLowerCase() ||
                h.opponent_name?.toLowerCase() === adminPlayerFilter.toLowerCase();
              if (!matchesPlayer) return false;
            }
            return true;
          }

          // Regular player: ONLY see own games!
          if (!currentUserName) return false;
          if (isAborted) return false;
          return (
            h.player_name?.toLowerCase() === currentUserName ||
            (h.opponent_name && h.opponent_name?.toLowerCase() === currentUserName)
          );
        });

        return (
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
            {/* Header & Role Info */}
            {isAdmin ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        <span>📜</span> Trainingsverlauf
                      </h2>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                        👑 Admin: Alle Verläufe
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Als Admin kannst du alle Verläufe aller Spieler einsehen und analysieren.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/verwaltung"
                      className="text-[11px] text-amber-400 hover:text-amber-300 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-bold"
                    >
                      ⚙️ Admin-Bereich
                    </Link>
                    <span className="text-xs text-zinc-400 font-mono">{visibleHistory.length} Einheiten</span>
                  </div>
                </div>

                {/* Admin Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
                  <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <Users size={13} className="text-amber-400" />
                    Spieler filtern:
                  </span>
                  <select
                    value={adminPlayerFilter}
                    onChange={(e) => setAdminPlayerFilter(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="all">🌐 Alle Spieler ({history.length})</option>
                    {uniquePlayers.map((p) => {
                      const cnt = history.filter(h => h.player_name === p || h.opponent_name === p).length;
                      return (
                        <option key={p} value={p}>
                          {p} ({cnt})
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={() => setAdminPlayerFilter('all')}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      adminPlayerFilter === 'all'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 font-bold'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    Alle ({history.length})
                  </button>
                  {user?.name && (
                    <button
                      onClick={() => setAdminPlayerFilter(user.name)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        adminPlayerFilter.toLowerCase() === user.name.toLowerCase()
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 font-bold'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                      }`}
                    >
                      Nur meine ({history.filter(h => h.player_name?.toLowerCase() === user.name.toLowerCase() || h.opponent_name?.toLowerCase() === user.name.toLowerCase()).length})
                    </button>
                  )}
                </div>
              </div>
            ) : user ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>📜</span> Mein Trainingsverlauf
                  </h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Persönliche Trainingseinheiten von <strong className="text-white">{user.name}</strong>
                  </p>
                </div>
                <span className="text-xs text-zinc-400 font-mono">{visibleHistory.length} Einheiten</span>
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                <div className="text-2xl">🔒</div>
                <div className="text-sm font-bold text-white">Privater Trainingsverlauf</div>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Trainingsverläufe sind geschützt: Jeder Spieler sieht nur seine eigenen Trainingseinheiten.
                  Bitte melde dich an, um deinen persönlichen Verlauf einzusehen.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {visibleHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500">
                  Noch keine Trainingseinheiten vorhanden.
                </div>
              ) : (
                visibleHistory.map((h, idx) => {
                  const isAborted = Number(h.is_aborted || 0) === 1;
                  const dateObj = new Date(h.training_date);
                  const dStr = isNaN(dateObj.getTime()) ? h.training_date : dateObj.toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
                  const qPct = ((h.total_quote ?? 0) * 100).toFixed(1) + '%';
                  const isWin = h.is_winner === 1;
                  const sessionKey = h.session_id ? `${h.session_id}_${h.player_name}` : (h.id || idx);
                  const isExpanded = expandedSessionKey === sessionKey;

                  return (
                    <div
                      key={sessionKey}
                      onClick={() => !isAborted && setExpandedSessionKey(isExpanded ? null : sessionKey)}
                      className={`border rounded-2xl p-3.5 flex flex-col gap-2 text-xs transition-all ${
                        !isAborted ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-850' : ''
                      } ${
                        isAborted 
                          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' 
                          : isExpanded
                          ? 'bg-zinc-900 border-amber-500/50 shadow-lg shadow-amber-500/10'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                            <span>{dStr}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
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
                          <div className="text-zinc-400 text-[11px] flex items-center gap-1 mt-0.5">
                            {isAborted ? (
                              <span>Vorzeitig abgebrochen</span>
                            ) : (
                              <>
                                <span className="text-amber-400 font-semibold">Best: {h.best_double || '-'}</span>
                                <span className="text-zinc-600">•</span>
                                <span className="text-amber-400/80 text-[10px]">
                                  {isExpanded ? 'Klicken zum Einklappen' : 'Klicken für Details'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={`text-base font-black font-mono ${isAborted ? 'text-rose-400' : 'text-amber-400'}`}>
                              {qPct}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">{h.total_hits} / {h.total_darts} Darts</div>
                          </div>
                          {!isAborted && (
                            <div className="text-zinc-400 pl-1">
                              {isExpanded ? <ChevronUp size={16} className="text-amber-400" /> : <ChevronDown size={16} />}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AUFGEKLAPPTE DETAIL-STATISTIK DER DOPPEL */}
                      {isExpanded && !isAborted && (
                        <div className="pt-3 border-t border-zinc-800 space-y-2.5 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-bold gap-1">
                            <span className="text-amber-400 flex items-center gap-1.5">
                              <Target size={13} className="text-amber-400" />
                              Trefferquote je Doppelfeld (10 Runden à 3 Darts):
                            </span>
                            <div className="flex items-center gap-2 text-[10px]">
                              {h.estimated_quote !== null && h.estimated_quote !== undefined && (
                                <span className="bg-zinc-950 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                                  🎯 Einschätzung: {h.estimated_quote}%
                                </span>
                              )}
                              <span className="text-zinc-400">
                                Bester Wert: <strong className="text-amber-400">{h.best_double || '-'}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                            {TARGETS.map((t) => {
                              const key = t.toLowerCase();
                              const hits = Number(h[`${key}_hits`] ?? 0);
                              const darts = Number(h[`${key}_darts`] ?? (h.total_darts ? Math.round(h.total_darts / 5) : 30));
                              const quote = Number(h[`${key}_quote`] ?? (darts > 0 ? hits / darts : 0));
                              const pct = (quote * 100).toFixed(1);
                              const isBest = h.best_double && h.best_double.startsWith(t);

                              return (
                                <div
                                  key={t}
                                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                                    isBest
                                      ? 'bg-amber-500/10 border-amber-400/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/30'
                                      : 'bg-zinc-900 border-zinc-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-black text-white">{t}</span>
                                    {isBest ? (
                                      <span className="text-[10px] font-black text-zinc-950 bg-amber-400 px-1 py-0.2 rounded" title="Bestes Feld">
                                        TOP 🌟
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-zinc-500">30 Darts</span>
                                    )}
                                  </div>

                                  <div className="my-1.5">
                                    <div className="text-base font-black text-amber-400 font-mono">
                                      {pct}%
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400">
                                      {hits} / {darts} Hits
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                                    <div
                                      className="h-full rounded-full transition-all bg-gradient-to-r from-amber-500 to-yellow-400"
                                      style={{ width: `${Math.min(100, Math.max(0, quote * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {h.notes && (
                            <div className="text-[11px] text-zinc-300 italic bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                              💬 Notiz: {h.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* DOWNLOADS */}
            <div className="pt-3 border-t border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Druckvorlagen für das Dartboard
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/Darts_Doppelquote_Trainingsblatt_A4.xlsx"
                  download
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-white hover:bg-zinc-700 transition-colors"
                >
                  <FileSpreadsheet size={15} className="text-amber-400" /> Excel (.xlsx)
                </a>
                <a
                  href="/Darts_Doppelquote_Trainingsblatt_A4.pdf"
                  target="_blank"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-white hover:bg-zinc-700 transition-colors"
                >
                  <FileText size={15} className="text-zinc-300" /> PDF Druckblatt
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* KPI STATUS BAR (NUR SICHTBAR WENN EIN SPIEL LÄUFT) */}
      {isPlaying && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-zinc-400 uppercase">Darts</div>
            <div className="text-lg font-black text-white mt-0.5 font-mono">
              {gameMode === 'solo' ? p1Stats.thrown : (activePlayer === 1 ? p1Stats.thrown : p2Stats.thrown)} / 150
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-zinc-400 uppercase">Treffer</div>
            <div className="text-lg font-black text-white mt-0.5 font-mono">
              {gameMode === 'solo' ? p1Stats.hits : (activePlayer === 1 ? p1Stats.hits : p2Stats.hits)}
            </div>
          </div>
          <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-2.5 text-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <div className="text-[10px] font-bold text-amber-400 uppercase">Doppelquote</div>
            <div className="text-lg font-black text-amber-400 mt-0.5 font-mono">
              {(gameMode === 'solo' ? p1Stats.quote : (activePlayer === 1 ? p1Stats.quote : p2Stats.quote)).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* STATUS NOTIFICATION */}
      {saveStatus && (
        <div className="bg-zinc-900 border border-amber-500/50 rounded-2xl p-3 text-center text-xs font-bold text-amber-400 shadow-xl flex items-center justify-center gap-2 animate-bounce">
          <CheckCircle2 size={16} />
          {saveStatus}
        </div>
      )}

      {/* ACTION BUTTONS (WÄHREND DES SPIELS) */}
      {isPlaying && (
        <div className="flex gap-2">
          <button
            onClick={() => saveSession()}
            disabled={isSavedInCloud}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isSavedInCloud
                ? 'bg-zinc-800 text-amber-400 border border-zinc-700 cursor-not-allowed opacity-90'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black shadow-lg shadow-amber-500/20 active:scale-[0.98]'
            }`}
          >
            {isSavedInCloud ? (
              <>
                <CheckCircle2 size={16} className="text-amber-400" /> Bereits in Cloud gespeichert
              </>
            ) : (
              <>
                <Save size={16} /> In Supabase Cloud speichern
              </>
            )}
          </button>
          <button
            onClick={resetGame}
            className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white font-bold text-sm active:scale-95 transition-all cursor-pointer"
          >
            Neu
          </button>
        </div>
      )}

    </div>
  );
}
