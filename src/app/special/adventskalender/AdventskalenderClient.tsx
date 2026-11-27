'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { Player } from '@/lib/data';
import { generateSessionId } from '@/lib/liveSession';
import {
  AdventsCurseType,
  AdventsDartEvent,
  AdventsDoorNumber,
  AdventsDoorState,
  AdventsLastActionBanner,
  AdventsPlayerState,
  AdventsRewardKind,
} from './types';
import './AdventskalenderV3.css';

const CACHE_KEY = 'lions_active_adventskalender_session_v3';

interface AdventskalenderClientProps {
  players: Player[];
  currentUser?: { name?: string; role?: string; id?: number } | null;
}

type Tone = 'good' | 'jackpot' | 'social' | 'curse' | 'grinch' | 'niete';
type Curse = AdventsCurseType;
type Mode = 'duel' | 'solo';
type Status = 'playing' | 'shootout' | 'finished';
type SoundKind = 'good' | 'jackpot' | 'social' | 'grinch' | 'curse' | 'niete' | 'miss' | 'win';

interface V3Player {
  name: string;
  score: number;
  opened: number;
  shields: number;
  multiplier: number;
  grinchHits: number;
  actionsCount: number;
  curseQueue: Curse[];
  activeCurse?: Curse;
}

interface V3Reward {
  kind: AdventsRewardKind;
  icon: string;
  name: string;
  short: string;
  description: string;
  tone: Tone;
  points?: number;
  action?: 'heal' | 'double' | 'steal25' | 'steal50' | 'swap' | 'roulette' | 'shield';
  curse?: Curse;
}

interface V3Door {
  number: AdventsDoorNumber;
  target: string;
  reward: V3Reward;
  openedBy?: 0 | 1;
  openedInRound?: number;
}

interface V3Reveal {
  door: AdventsDoorNumber;
  reward: V3Reward;
  player: 0 | 1;
  resolvedText: string;
}

interface V3Session {
  version: 3;
  mode: Mode;
  doors: V3Door[];
  players: [V3Player, V3Player];
  activePlayer: 0 | 1;
  starter: 0 | 1;
  round: number;
  turnDarts: AdventsDartEvent[];
  comboProgress: Record<number, string[]>;
  status: Status;
  winner?: 0 | 1;
  lastReveal?: V3Reveal;
  lastBanner?: AdventsLastActionBanner | null;
  message?: string;
  sessionId?: string;
}

const DOOR_24_PREREQS: AdventsDoorNumber[] = [4, 6, 20];

const HIGH_IMPACT_KINDS: AdventsRewardKind[] = [
  'points_75',
  'points_65',
  'double_star',
  'shield_angel',
  'steal_50',
  'grinch_swap',
  'grinch_trap_50',
  'curse_skip_round',
  'curse_one_dart',
  'curse_wrong_hand',
  'curse_spin_360',
];

function getMaxDartsForCurse(curse?: Curse): number {
  if (curse === 'skip_round') return 0;
  if (curse === 'one_dart') return 1;
  if (curse === 'two_darts') return 2;
  return 3;
}

const curseLabels: Record<Curse, { icon: string; title: string; instruction: string }> = {
  wrong_hand: { icon: '🧙', title: 'Knecht Ruprecht', instruction: 'Mit der falschen Hand werfen!' },
  two_darts: { icon: '❄️', title: 'Schneesturm', instruction: 'Nur 2 Darts für diesen Versuch!' },
  one_dart: { icon: '🎰', title: 'Einarmiger Bandit', instruction: 'Nur 1 Dart für diesen Versuch!' },
  sitting: { icon: '🪑', title: 'Opa Hoppenstedt', instruction: 'Im Sitzen werfen!' },
  skip_round: { icon: '⛄', title: 'In der Schneewehe', instruction: 'Diese Aufnahme komplett aussetzen!' },
  spin_360: { icon: '🌀', title: 'Glühwein-Drehwurm', instruction: 'Vor jedem Dart einmal um 360° drehen!' },
};

const rewards: V3Reward[] = [
  { kind: 'points_25', icon: '🍫', name: 'Schoko-Nikolaus', short: '+25', description: '+25 Punkte', tone: 'good', points: 25 },
  { kind: 'points_35', icon: '⭐', name: 'Zimtstern-Teller', short: '+35', description: '+35 Punkte', tone: 'good', points: 35 },
  { kind: 'points_40', icon: '🥐', name: 'Vanillekipferl', short: '+40', description: '+40 Punkte', tone: 'good', points: 40 },
  { kind: 'points_50', icon: '🎁', name: 'Weihnachtspaket', short: '+50', description: '+50 Punkte', tone: 'good', points: 50 },
  { kind: 'points_55', icon: '🧝', name: 'Wichtel-Überraschung', short: '+55', description: '+55 Punkte', tone: 'good', points: 55 },
  { kind: 'points_65', icon: '🍷', name: 'Heißer Glühwein', short: '+65', description: '+65 Punkte', tone: 'jackpot', points: 65 },
  { kind: 'points_75', icon: '🦌', name: 'Rentier-Schlitten', short: '+75', description: '+75 Punkte', tone: 'jackpot', points: 75 },
  { kind: 'bell_bless_30', icon: '🔔', name: 'Glöckchen-Segen I', short: '+30', description: '+30 Punkte und alle Flüche geheilt', tone: 'good', points: 30, action: 'heal' },
  { kind: 'bell_bless_45', icon: '🔔', name: 'Glöckchen-Segen II', short: '+45', description: '+45 Punkte und alle Flüche geheilt', tone: 'good', points: 45, action: 'heal' },
  { kind: 'double_star', icon: '🌟', name: 'Weihnachtsstern', short: '×2', description: 'Die nächste erfolgreiche Punkte-Tür zählt doppelt', tone: 'jackpot', action: 'double' },
  { kind: 'steal_25', icon: '🥷', name: 'Wichtel-Dieb', short: '−25', description: '25 Punkte vom Gegner gestohlen', tone: 'social', action: 'steal25' },
  { kind: 'steal_50', icon: '🏴‍☠️', name: 'Großer Geschenke-Räuber', short: '−50', description: '50 Punkte vom Gegner gestohlen', tone: 'social', action: 'steal50' },
  { kind: 'grinch_swap', icon: '👹', name: 'Der Grinch!', short: '⇄', description: 'Die Punktestände werden bei Rückstand getauscht', tone: 'grinch', action: 'swap' },
  { kind: 'roulette_duel', icon: '🎰', name: 'Wichtel-Roulette', short: '50/50', description: 'Zufällig +60 oder −30 Punkte', tone: 'social', action: 'roulette' },
  { kind: 'shield_angel', icon: '🛡️', name: 'Schutz-Engel', short: '×2', description: 'Zwei Schutzschilde erhalten', tone: 'good', action: 'shield' },
  { kind: 'curse_wrong_hand', icon: '🧙', name: 'Knecht Ruprecht', short: 'Fluch', description: 'Der Gegner wirft seine nächste Aufnahme mit der falschen Hand', tone: 'curse', curse: 'wrong_hand' },
  { kind: 'curse_two_darts', icon: '❄️', name: 'Schneesturm', short: '2 Darts', description: 'Der Gegner hat in seiner nächsten Aufnahme nur zwei Darts', tone: 'curse', curse: 'two_darts' },
  { kind: 'curse_one_dart', icon: '🎰', name: 'Einarmiger Bandit', short: '1 Dart', description: 'Der Gegner hat in seiner nächsten Aufnahme nur einen Dart', tone: 'curse', curse: 'one_dart' },
  { kind: 'curse_sitting', icon: '🪑', name: 'Opa Hoppenstedt', short: 'Sitzen', description: 'Der Gegner muss seine nächste Aufnahme im Sitzen werfen', tone: 'curse', curse: 'sitting' },
  { kind: 'curse_skip_round', icon: '⛄', name: 'In der Schneewehe', short: 'Pause', description: 'Der Gegner muss seine nächste Aufnahme aussetzen', tone: 'curse', curse: 'skip_round' },
  { kind: 'curse_spin_360', icon: '🌀', name: 'Glühwein-Drehwurm', short: '360°', description: 'Der Gegner muss sich vor jedem Dart einmal drehen', tone: 'curse', curse: 'spin_360' },
  { kind: 'grinch_trap_30', icon: '🪤', name: 'Kleine Grinch-Falle', short: '−30', description: '30 Punkte Sofortabzug', tone: 'grinch', points: -30 },
  { kind: 'grinch_trap_50', icon: '🧊', name: 'Eiszapfen-Schock', short: '−50', description: '50 Punkte Sofortabzug', tone: 'grinch', points: -50 },
  { kind: 'niete_0', icon: '🍪', name: 'Verbrannte Plätzchen', short: 'Niete', description: 'Keine Punkte – trockene Niete', tone: 'niete' },
];

const targets: string[] = Array.from({ length: 24 }, (_, index) => {
  const number = index + 1;
  if (number === 6) return '6 + Bull';
  if (number <= 20) return `${number}`;
  if (number === 21) return 'Doppel';
  if (number === 22) return 'Triple';
  if (number === 23) return 'Bull 25';
  return '20 + 4 + Bull';
});

const comboParts: Record<number, { key: string; label: string }[]> = {
  6: [
    { key: '6', label: 'Feld 6' },
    { key: 'BULL', label: 'Bull 25 / 50' },
  ],
  24: [
    { key: '20', label: 'Feld 20' },
    { key: '4', label: 'Feld 4' },
    { key: 'BULL', label: 'Bull 25 / 50' },
  ],
};

function normalizeName(name: string): string {
  return name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makePlayer(name: string): V3Player {
  return {
    name,
    score: 0,
    opened: 0,
    shields: 0,
    multiplier: 1,
    grinchHits: 0,
    actionsCount: 0,
    curseQueue: [],
  };
}

function cloneSession(state: V3Session): V3Session {
  return JSON.parse(JSON.stringify(state)) as V3Session;
}

function createV3Session(
  mode: Mode = 'duel',
  starter: 0 | 1 = 0,
  names: [string, string] = ['Spieler 1', 'Spieler 2'],
  sessionId?: string
): V3Session {
  // Tür 6 (Nikolaus) und Tür 24 (Heiligabend) erhalten garantiert starke Boni oder Bestrafungsitems
  const highPool = shuffled(rewards.filter((r) => HIGH_IMPACT_KINDS.includes(r.kind)));
  const normalPool = rewards.filter((r) => !HIGH_IMPACT_KINDS.includes(r.kind));
  const rewardForDoor6 = highPool[0];
  const rewardForDoor24 = highPool[1];
  const remainingDeck = shuffled([...highPool.slice(2), ...normalPool]);

  let deckCursor = 0;
  const doors: V3Door[] = targets.map((target, index) => {
    const number = (index + 1) as AdventsDoorNumber;
    let reward: V3Reward;
    if (number === 6) {
      reward = { ...rewardForDoor6 };
    } else if (number === 24) {
      reward = { ...rewardForDoor24 };
    } else {
      reward = { ...remainingDeck[deckCursor] };
      deckCursor += 1;
    }
    return { number, target, reward };
  });

  return {
    version: 3,
    mode,
    doors,
    players: [
      makePlayer(names[0].trim() || 'Spieler 1'),
      makePlayer(mode === 'solo' ? 'Solo-Training' : names[1].trim() || 'Spieler 2'),
    ],
    activePlayer: mode === 'solo' ? 0 : starter,
    starter: mode === 'solo' ? 0 : starter,
    round: 1,
    turnDarts: [],
    comboProgress: { 6: [], 24: [] },
    status: 'playing',
    lastBanner: null,
    sessionId,
  };
}

function readSavedV3(): V3Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as V3Session;
    if (
      parsed &&
      parsed.version === 3 &&
      Array.isArray(parsed.doors) &&
      parsed.doors.length === 24 &&
      Array.isArray(parsed.players) &&
      parsed.players.length === 2 &&
      parsed.status !== 'finished'
    ) {
      return {
        ...parsed,
        turnDarts: Array.isArray(parsed.turnDarts) ? parsed.turnDarts : [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

function createAdventsSound(kind: SoundKind) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      type: OscillatorType = 'sine',
      gainLevel = 0.11
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(gainLevel, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    if (kind === 'good' || kind === 'social') {
      playTone(587.33, 0, 0.14, 'triangle', 0.12);
      playTone(880, 0.09, 0.22, 'sine', 0.13);
    } else if (kind === 'jackpot') {
      playTone(523.25, 0, 0.12, 'triangle', 0.13);
      playTone(659.25, 0.08, 0.12, 'triangle', 0.13);
      playTone(783.99, 0.16, 0.14, 'triangle', 0.14);
      playTone(1046.5, 0.26, 0.34, 'sine', 0.15);
    } else if (kind === 'grinch') {
      playTone(392, 0, 0.15, 'sawtooth', 0.09);
      playTone(277.18, 0.12, 0.18, 'sawtooth', 0.09);
      playTone(185, 0.26, 0.3, 'sawtooth', 0.1);
    } else if (kind === 'curse') {
      playTone(620, 0, 0.12, 'sine', 0.1);
      playTone(466.16, 0.1, 0.14, 'triangle', 0.1);
      playTone(311.13, 0.22, 0.26, 'sine', 0.11);
    } else if (kind === 'win') {
      playTone(523.25, 0, 0.14, 'triangle', 0.14);
      playTone(659.25, 0.11, 0.14, 'triangle', 0.14);
      playTone(783.99, 0.22, 0.16, 'triangle', 0.14);
      playTone(1046.5, 0.35, 0.42, 'sine', 0.16);
      playTone(1318.51, 0.5, 0.52, 'sine', 0.14);
    } else {
      playTone(180, 0, 0.15, 'sine', 0.08);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch {}
}

function toLivePlayerState(
  player: V3Player,
  round: number,
  isActive: boolean,
  turnDarts: AdventsDartEvent[]
): AdventsPlayerState {
  return {
    score: player.score,
    doorsOpened: player.opened,
    dartsThrown: player.actionsCount,
    roundsPlayed: Math.max(0, round - 1),
    grinchHits: player.grinchHits,
    shieldsCount: player.shields,
    multiplier: player.multiplier,
    activeCurses: player.activeCurse ? [player.activeCurse] : [],
    pendingCurses: [...player.curseQueue],
    currentTurnDarts: isActive ? turnDarts.map((ev) => ({ ...ev })) : [],
  };
}

function toLiveDoors(session: V3Session): AdventsDoorState[] {
  return session.doors.map((door) => ({
    number: door.number,
    isOpen: door.openedBy !== undefined,
    openedBy: door.openedBy === undefined ? null : ((door.openedBy + 1) as 1 | 2),
    openedInRound: door.openedInRound ?? null,
    reward: {
      kind: door.reward.kind,
      icon: door.reward.icon,
      title: door.reward.name,
      shortBadge: door.reward.short,
      tone: door.reward.tone,
    },
    partialHits:
      session.comboProgress[door.number]?.length
        ? [...session.comboProgress[door.number]]
        : undefined,
  }));
}

function PlayerScore({
  player: item,
  index,
  active,
  compact = false,
}: {
  player: V3Player;
  index: 0 | 1;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <article className={`score-card p${index + 1} ${active ? 'active' : ''} ${compact ? 'compact' : ''}`}>
      <div className="score-card-top">
        <span>Spieler {index + 1}</span>
        <b>{active ? 'Am Wurf' : 'Wartet'}</b>
      </div>
      <h2>{item.name}</h2>
      <strong className="big-score">{item.score}</strong>
      <div className="player-stats">
        <span>
          <b>{item.opened}</b> Türchen
        </span>
        <span>
          <b>🛡 {item.shields}</b> Schutz
        </span>
        {item.multiplier > 1 && (
          <span className="multiplier">
            <b>×2</b> bereit
          </span>
        )}
      </div>
      {(item.activeCurse || item.curseQueue.length > 0) && (
        <div className="mini-curse">
          {item.activeCurse ? curseLabels[item.activeCurse].icon : '⏳'}{' '}
          {item.activeCurse
            ? `${curseLabels[item.activeCurse].title} aktiv`
            : `${item.curseQueue.length} Fluch${item.curseQueue.length > 1 ? 'e' : ''} in Warteschlange`}
        </div>
      )}
    </article>
  );
}

function DoorButton({
  door,
  progress,
  inspect,
  onOpen,
  disabled,
  tv = false,
  lockLabel,
}: {
  door: V3Door;
  progress: string[];
  inspect: boolean;
  onOpen: () => void;
  disabled: boolean;
  tv?: boolean;
  lockLabel?: string;
}) {
  const opened = door.openedBy !== undefined;
  const isLocked = Boolean(lockLabel) && !opened;
  const isCombo = Boolean(comboParts[door.number]);
  return (
    <button
      type="button"
      className={`game-door ${opened ? `opened p${door.openedBy! + 1} tone-${door.reward.tone}` : ''} ${
        inspect && !opened && !isLocked ? 'inspected' : ''
      } ${isCombo ? 'combo-door' : ''} ${isLocked ? 'locked-door' : ''} ${tv ? 'tv-door' : ''}`}
      onClick={onOpen}
      disabled={disabled || opened || isLocked}
      aria-label={
        opened
          ? `Tür ${door.number}: ${door.reward.name}`
          : isLocked
          ? `Tür ${door.number} gesperrt: ${lockLabel}`
          : `Tür ${door.number}, Ziel ${door.target}`
      }
    >
      <span className="door-content">
        <i>{door.reward.icon}</i>
        <b>{door.reward.short}</b>
        <small>{opened ? `P${door.openedBy! + 1}` : inspect ? door.reward.name : ''}</small>
      </span>
      <span className="wood-door">
        <b>{door.number}</b>
        <small>{door.target}</small>
        <i />
        {isLocked ? (
          <span className="lock-pill">🔒 {lockLabel}</span>
        ) : (
          isCombo &&
          progress.length > 0 && (
            <span className="combo-dots">
              {comboParts[door.number].map((part) => (
                <em className={progress.includes(part.key) ? 'done' : ''} key={part.key} />
              ))}
            </span>
          )
        )}
      </span>
    </button>
  );
}

export default function AdventskalenderClient({
  players,
  currentUser,
}: AdventskalenderClientProps) {
  const validPlayers = useMemo(
    () => players.filter((p) => !p.name.startsWith('Board ')),
    [players]
  );

  const isBoardUser = Boolean(
    currentUser?.name && normalizeName(currentUser.name).startsWith('board')
  );

  const userPlayerMatch = useMemo(() => {
    if (!currentUser?.name) return undefined;
    const normalizedCurrent = normalizeName(currentUser.name);
    return validPlayers.find((p) => normalizeName(p.name) === normalizedCurrent);
  }, [currentUser?.name, validPlayers]);

  const lockedSoloName =
    !isBoardUser && currentUser?.name
      ? userPlayerMatch?.name || currentUser.name.trim()
      : null;

  const defaultP1 = lockedSoloName || validPlayers[0]?.name || 'Spieler 1';
  const defaultP2 =
    validPlayers.find((p) => normalizeName(p.name) !== normalizeName(defaultP1))?.name ||
    'Spieler 2';

  const [activeBoard, setActiveBoard] = useState<string>(() => {
    if (typeof window === 'undefined') return '1';
    const urlBoard = new URLSearchParams(window.location.search).get('board');
    if (urlBoard && ['1', '2', '3', '4', '5', 'personal'].includes(urlBoard)) {
      return urlBoard;
    }
    return (
      localStorage.getItem('lions_tablet_board') ||
      localStorage.getItem('lions_active_board_adventskalender') ||
      localStorage.getItem('lions_active_board') ||
      '1'
    );
  });

  const [view, setView] = useState<'tablet' | 'tv'>('tablet');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [savedGame, setSavedGame] = useState<V3Session | null>(null);
  const [setupOpen, setSetupOpen] = useState<boolean>(true);
  const [inspect, setInspect] = useState<boolean>(false);
  const [comboDoor, setComboDoor] = useState<number | null>(null);
  const [history, setHistory] = useState<V3Session[]>([]);

  const [setupMode, setSetupMode] = useState<Mode>('duel');
  const [setupStarter, setSetupStarter] = useState<'random' | 'p1' | 'p2'>('random');
  const [setupP1, setSetupP1] = useState<string>(defaultP1);
  const [setupP2, setSetupP2] = useState<string>(defaultP2);
  const [isGuestP1, setIsGuestP1] = useState<boolean>(validPlayers.length === 0 && !lockedSoloName);
  const [isGuestP2, setIsGuestP2] = useState<boolean>(validPlayers.length < 2);

  const [session, setSession] = useState<V3Session>(() =>
    createV3Session('duel', 0, [defaultP1, defaultP2], generateSessionId('adventskalender', '1'))
  );

  const liveBroadcastRef = useRef<BroadcastChannel | null>(null);

  // Cache-Prüfung nach dem Mounten (Hydration-sicher)
  useEffect(() => {
    const found = readSavedV3();
    if (found) {
      setSavedGame(found);
      setSetupOpen(false);
    }
  }, []);

  // Strikte User-Arretierung im Solo-Modus (AGENTS.md §12.5)
  useEffect(() => {
    if (setupMode === 'solo' && lockedSoloName) {
      setIsGuestP1(false);
      setSetupP1(lockedSoloName);
    }
  }, [setupMode, lockedSoloName]);

  const playSound = useCallback(
    (kind: SoundKind) => {
      if (soundEnabled) {
        createAdventsSound(kind);
      }
    },
    [soundEnabled]
  );

  const handleSelectBoard = (boardValue: string) => {
    setActiveBoard(boardValue);
    try {
      localStorage.setItem('lions_tablet_board', boardValue);
      localStorage.setItem('lions_active_board', boardValue);
      localStorage.setItem('lions_active_board_adventskalender', boardValue);
      window.history.replaceState(null, '', `/special/adventskalender?board=${boardValue}`);
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      liveBroadcastRef.current = new BroadcastChannel(
        `lions_adventskalender_live_sync_${activeBoard}`
      );
    } catch {}
    return () => {
      liveBroadcastRef.current?.close();
    };
  }, [activeBoard]);

  // Atomare Sicherung im localStorage nach jeder Änderung während des aktiven Spiels
  useEffect(() => {
    if (setupOpen || savedGame) return;
    try {
      if (session.status === 'finished') {
        localStorage.removeItem(CACHE_KEY);
      } else {
        localStorage.setItem(CACHE_KEY, JSON.stringify(session));
      }
    } catch {}
  }, [session, setupOpen, savedGame]);

  const buildLivePayload = useCallback(
    (state: V3Session) => {
      const is1vs1 = state.mode === 'duel';
      const p1Name = state.players[0].name;
      const p2Name = state.players[1].name;
      const winnerPlayer: 1 | 2 | null =
        state.status === 'finished' && state.winner !== undefined
          ? ((state.winner + 1) as 1 | 2)
          : null;
      const winnerDisplayName =
        winnerPlayer === 1 ? p1Name : winnerPlayer === 2 ? p2Name : null;

      let banner: AdventsLastActionBanner | null = state.lastBanner ?? null;
      if (state.lastReveal) {
        banner = {
          id: Date.now(),
          doorNumber: state.lastReveal.door,
          tone: state.lastReveal.reward.tone,
          icon: state.lastReveal.reward.icon,
          headline: `Tür ${state.lastReveal.door}: ${state.lastReveal.reward.name}`,
          subline: state.lastReveal.resolvedText,
          actorPlayer: (state.lastReveal.player + 1) as 1 | 2,
        };
      }

      return {
        boardId: activeBoard,
        sessionId: state.sessionId || generateSessionId('adventskalender', activeBoard),
        status: state.status === 'finished' ? ('completed' as const) : ('playing' as const),
        gameType: 'adventskalender' as const,
        gameTitle: 'Der verflixte Adventskalender',
        gameMode: is1vs1 ? ('1vs1' as const) : ('solo' as const),
        p1Name,
        p2Name,
        activePlayer: (state.activePlayer + 1) as 1 | 2,
        currentRound: state.round,
        scoreP1: state.players[0].score,
        scoreP2: state.players[1].score,
        winner: winnerDisplayName || undefined,
        adventskalenderData: {
          maxRounds: null,
          roundNumber: state.round,
          isSuddenDeath: state.status === 'shootout',
          doors: toLiveDoors(state),
          p1: toLivePlayerState(state.players[0], state.round, state.activePlayer === 0, state.turnDarts),
          p2: toLivePlayerState(state.players[1], state.round, state.activePlayer === 1, state.turnDarts),
          lastAction: banner,
          winnerPlayer,
          winnerName: winnerDisplayName,
        },
        updatedAt: Date.now(),
      };
    },
    [activeBoard]
  );

  const broadcastLiveState = useCallback(
    (state: V3Session) => {
      if (setupOpen || savedGame) return;
      const payload = buildLivePayload(state);
      try {
        liveBroadcastRef.current?.postMessage(payload);
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const masterBc = new BroadcastChannel(`lions_board_live_sync_${activeBoard}`);
          masterBc.postMessage(payload);
          masterBc.close();
        }
        localStorage.setItem(`lions_board_live_sync_${activeBoard}`, JSON.stringify(payload));
        if (activeBoard !== 'personal') {
          fetch('/api/live/board', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch(() => {});
        }
      } catch {}
    },
    [activeBoard, buildLivePayload, savedGame, setupOpen]
  );

  useEffect(() => {
    if (!setupOpen && !savedGame) {
      broadcastLiveState(session);
    }
  }, [session, setupOpen, savedGame, broadcastLiveState]);

  useEffect(() => {
    if (setupOpen || savedGame || activeBoard === 'personal') return;
    const interval = setInterval(() => {
      const payload = buildLivePayload(session);
      fetch('/api/live/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [activeBoard, buildLivePayload, savedGame, session, setupOpen]);

  const sendStandbySignal = useCallback(
    (bId = activeBoard, sId = session.sessionId) => {
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

        if (bId !== 'personal') {
          const payloadStr = JSON.stringify(idlePayload);
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(
              '/api/live/board',
              new Blob([payloadStr], { type: 'application/json' })
            );
          } else {
            fetch('/api/live/board', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payloadStr,
              keepalive: true,
            }).catch(() => {});
          }
        }
      } catch {}
    },
    [activeBoard, session.sessionId]
  );

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

  const active = session.players[session.activePlayer];
  const activeMaxDarts = getMaxDartsForCurse(active.activeCurse);
  const remainingDarts = Math.max(0, activeMaxDarts - session.turnDarts.length);
  const missingDoor24Prereqs = DOOR_24_PREREQS.filter(
    (num) => session.doors[num - 1]?.openedBy === undefined
  );
  const isDoor24Locked = missingDoor24Prereqs.length > 0;
  const door24LockLabel = isDoor24Locked
    ? `Erst ${missingDoor24Prereqs.join(' · ')}`
    : undefined;
  const openedCount = session.doors.filter((door) => door.openedBy !== undefined).length;
  const boardLabel = activeBoard === 'personal' ? 'Persönlicher TV' : `Board ${activeBoard}`;

  const pushHistory = () => {
    setHistory((items) => [...items.slice(-19), cloneSession(session)]);
  };

  const activateNextCurse = (playerList: [V3Player, V3Player], next: 0 | 1) => {
    if (!playerList[next].activeCurse && playerList[next].curseQueue.length > 0) {
      playerList[next].activeCurse = playerList[next].curseQueue.shift();
    }
  };

  const advanceTurn = (state: V3Session): V3Session => {
    const nextPlayers = cloneSession(state).players;
    nextPlayers[state.activePlayer].activeCurse = undefined;
    if (state.mode === 'solo') {
      activateNextCurse(nextPlayers, 0);
      return {
        ...state,
        players: nextPlayers,
        activePlayer: 0,
        round: state.round + 1,
        turnDarts: [],
      };
    }
    const next = (state.activePlayer === 0 ? 1 : 0) as 0 | 1;
    activateNextCurse(nextPlayers, next);
    return {
      ...state,
      players: nextPlayers,
      activePlayer: next,
      round: next === state.starter ? state.round + 1 : state.round,
      turnDarts: [],
    };
  };

  const blockHostile = (target: V3Player): boolean => {
    if (target.shields <= 0) return false;
    target.shields -= 1;
    return true;
  };

  const applyReward = (state: V3Session, reward: V3Reward): { state: V3Session; text: string } => {
    const cloned = cloneSession(state);
    const nextPlayers = cloned.players;
    const current = nextPlayers[state.activePlayer];
    const opponentIndex = (state.activePlayer === 0 ? 1 : 0) as 0 | 1;
    const opponent = nextPlayers[opponentIndex];
    let text = reward.description;

    if (reward.points) {
      const positive = reward.points > 0;
      const delta = positive ? reward.points * current.multiplier : reward.points;
      current.score = Math.max(0, current.score + delta);
      if (reward.tone === 'grinch') {
        current.grinchHits += 1;
      }
      if (positive && current.multiplier > 1) {
        text = `Weihnachtsstern! ${reward.points} × 2 = +${delta} Punkte`;
        current.multiplier = 1;
      }
    }

    if (reward.action === 'heal') {
      current.curseQueue = [];
      current.activeCurse = undefined;
    }
    if (reward.action === 'double') {
      current.multiplier = 2;
    }
    if (reward.action === 'shield') {
      current.shields += 2;
    }
    if (reward.action === 'roulette') {
      const delta = Math.random() < 0.5 ? 60 : -30;
      current.score = Math.max(0, current.score + delta);
      if (delta < 0) current.grinchHits += 1;
      text =
        delta > 0
          ? 'Das Roulette schenkt dir +60 Punkte!'
          : 'Das Roulette nimmt dir 30 Punkte!';
    }
    if (reward.action === 'steal25' || reward.action === 'steal50') {
      const amount = reward.action === 'steal25' ? 25 : 50;
      if (state.mode === 'solo') {
        const delta = amount * current.multiplier;
        current.score += delta;
        if (current.multiplier > 1) {
          text = `Solo-Bonus mit Weihnachtsstern! +${delta} Punkte`;
          current.multiplier = 1;
        } else {
          text = `Solo-Bonus: ${amount} zusätzliche Punkte gesichert!`;
        }
      } else if (blockHostile(opponent)) {
        text = 'Schutzschild! Der Diebstahl wurde abgewehrt.';
      } else {
        const stolen = Math.min(amount, opponent.score);
        opponent.score -= stolen;
        current.score += stolen;
        text = `${stolen} Punkte von ${opponent.name} gestohlen`;
      }
    }
    if (reward.action === 'swap') {
      if (state.mode === 'solo') {
        text = 'Im Solo-Modus gibt es keinen Gegner zum Tauschen – Glück gehabt!';
      } else if (current.score >= opponent.score) {
        text = 'Du führst bereits – der Grinch hat keine Auswirkung.';
      } else if (blockHostile(opponent)) {
        text = 'Schutzschild! Der Punktetausch wurde abgewehrt.';
      } else {
        [current.score, opponent.score] = [opponent.score, current.score];
        current.grinchHits += 1;
        text = 'Der Grinch tauscht beide Punktestände!';
      }
    }
    if (reward.curse) {
      const target = state.mode === 'solo' ? current : opponent;
      if (blockHostile(target)) {
        text = `Schutzschild! ${curseLabels[reward.curse].title} wurde abgewehrt.`;
      } else {
        target.curseQueue.push(reward.curse);
        text =
          state.mode === 'solo'
            ? `${curseLabels[reward.curse].title} wartet in deiner Fluch-Warteschlange.`
            : `${curseLabels[reward.curse].title} trifft ${opponent.name} in einer der nächsten Aufnahmen.`;
      }
    }

    return { state: { ...cloned, players: nextPlayers }, text };
  };

  const finalizeIfComplete = (state: V3Session): V3Session => {
    if (state.doors.some((door) => door.openedBy === undefined)) return state;
    if (state.mode === 'duel' && state.players[0].score === state.players[1].score) {
      return {
        ...state,
        status: 'shootout',
        message: 'Goldener Nikolaus-Shootout',
        lastBanner: {
          id: Date.now(),
          tone: 'win',
          icon: '🎅',
          headline: 'Gleichstand nach 24 Türchen!',
          subline: 'Goldener Nikolaus-Shootout auf Bullseye',
          actorPlayer: (state.activePlayer + 1) as 1 | 2,
        },
      };
    }
    const winner =
      state.mode === 'solo' || state.players[0].score > state.players[1].score ? 0 : 1;
    playSound('win');
    return { ...state, status: 'finished', winner };
  };

  const completeDoor = (number: AdventsDoorNumber, base: V3Session) => {
    const selected = base.doors[number - 1];
    if (!selected || selected.openedBy !== undefined) return;
    pushHistory();
    let next = cloneSession(base);
    next.message = undefined;
    next.doors[number - 1].openedBy = next.activePlayer;
    next.doors[number - 1].openedInRound = next.round;
    next.players[next.activePlayer].opened += 1;
    next.players[next.activePlayer].actionsCount += 1;

    const applied = applyReward(next, selected.reward);
    next = applied.state;
    next.turnDarts = [
      ...next.turnDarts,
      {
        kind: 'door_opened',
        doorNumber: number,
        label: `Tür #${number}`,
        subLabel: selected.reward.short,
        tone: selected.reward.tone,
      },
    ];
    next.lastReveal = {
      door: number,
      reward: selected.reward,
      player: next.activePlayer,
      resolvedText: applied.text,
    };
    next.lastBanner = {
      id: Date.now(),
      doorNumber: number,
      tone: selected.reward.tone,
      icon: selected.reward.icon,
      headline: `Tür ${number}: ${selected.reward.name}`,
      subline: applied.text,
      actorPlayer: (next.activePlayer + 1) as 1 | 2,
    };

    playSound(selected.reward.tone);
    setSession(finalizeIfComplete(next));
  };

  const openDoor = (number: AdventsDoorNumber) => {
    if (session.status !== 'playing' || session.lastReveal || remainingDarts <= 0) return;
    if (number === 24 && isDoor24Locked) return;
    if (comboParts[number]) {
      setComboDoor(number);
      return;
    }
    completeDoor(number, session);
  };

  const registerComboHit = (part: string) => {
    if (!comboDoor || remainingDarts <= 0) return;
    const doorNum = comboDoor as AdventsDoorNumber;
    const existing = session.comboProgress[doorNum] || [];
    if (existing.includes(part)) return;
    const next = cloneSession(session);
    next.comboProgress[doorNum] = [...existing, part];
    setComboDoor(null);
    if (next.comboProgress[doorNum].length === comboParts[doorNum].length) {
      completeDoor(doorNum, next);
    } else {
      pushHistory();
      playSound('good');
      const label = comboParts[doorNum].find((item) => item.key === part)?.label || part;
      next.players[next.activePlayer].actionsCount += 1;
      next.turnDarts = [
        ...next.turnDarts,
        {
          kind: 'door_opened',
          doorNumber: doorNum,
          label: `Tür #${doorNum}`,
          subLabel: `${label} ✓`,
          tone: 'good',
        },
      ];
      const maxDarts = getMaxDartsForCurse(next.players[next.activePlayer].activeCurse);
      const msg = `${label} für Tür ${doorNum} gesichert.`;
      const withBanner: V3Session = {
        ...next,
        message: msg,
        lastBanner: {
          id: Date.now(),
          doorNumber: doorNum,
          tone: 'good',
          icon: '🧩',
          headline: `Tür ${doorNum} · Teil-Treffer`,
          subline: msg,
          actorPlayer: (next.activePlayer + 1) as 1 | 2,
        },
      };
      setSession(next.turnDarts.length >= maxDarts ? advanceTurn(withBanner) : withBanner);
    }
  };

  const registerMiss = () => {
    if (
      session.status !== 'playing' ||
      active.activeCurse === 'skip_round' ||
      remainingDarts <= 0
    ) {
      return;
    }
    pushHistory();
    playSound('miss');
    const next = cloneSession(session);
    next.players[next.activePlayer].actionsCount += 1;
    next.turnDarts = [
      ...next.turnDarts,
      {
        kind: 'miss',
        label: 'Miss',
        subLabel: 'Kein Treffer',
        tone: 'miss',
      },
    ];
    const maxDarts = getMaxDartsForCurse(next.players[next.activePlayer].activeCurse);
    const dartNo = next.turnDarts.length;
    const withBanner: V3Session = {
      ...next,
      message: `${active.name}: Dart ${dartNo} verfehlt.`,
      lastBanner: {
        id: Date.now(),
        tone: 'miss',
        icon: '❄️',
        headline: `${active.name}: Dart ${dartNo} · Miss`,
        subline:
          dartNo >= maxDarts ? 'Aufnahme beendet' : `Noch ${maxDarts - dartNo} Dart(s) übrig`,
        actorPlayer: (next.activePlayer + 1) as 1 | 2,
      },
    };
    setSession(dartNo >= maxDarts ? advanceTurn(withBanner) : withBanner);
  };

  const finishTurnEarly = () => {
    if (session.status !== 'playing') return;
    pushHistory();
    setSession(
      advanceTurn({
        ...session,
        message: `${active.name} beendet die Aufnahme.`,
        lastBanner: {
          id: Date.now(),
          tone: 'info',
          icon: '⏭️',
          headline: `${active.name}: Aufnahme beendet`,
          subline: 'Wechsel zum nächsten Werfer',
          actorPlayer: (session.activePlayer + 1) as 1 | 2,
        },
      })
    );
  };

  const skipTurn = () => {
    if (session.status !== 'playing') return;
    pushHistory();
    playSound('curse');
    const next = cloneSession(session);
    next.players[next.activePlayer].actionsCount += 1;
    setSession(
      advanceTurn({
        ...next,
        message: `${active.name} hat ausgesetzt (Schneewehe).`,
        lastBanner: {
          id: Date.now(),
          tone: 'curse',
          icon: '⛄',
          headline: `${active.name}: Eingeschneit`,
          subline: 'Aufnahme komplett ausgesetzt',
          actorPlayer: (next.activePlayer + 1) as 1 | 2,
        },
      })
    );
  };

  const closeReveal = () => {
    setSession((current) => {
      if (current.status !== 'playing') {
        return { ...current, lastReveal: undefined };
      }
      const maxDarts = getMaxDartsForCurse(current.players[current.activePlayer].activeCurse);
      if (current.turnDarts.length >= maxDarts) {
        return advanceTurn({ ...current, lastReveal: undefined });
      }
      return { ...current, lastReveal: undefined };
    });
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setSession(previous);
    setHistory((items) => items.slice(0, -1));
  };

  const startGame = () => {
    const resolvedP1 =
      setupMode === 'solo' && lockedSoloName ? lockedSoloName : setupP1.trim() || 'Spieler 1';
    const resolvedP2 = setupP2.trim() || 'Spieler 2';
    const starter: 0 | 1 =
      setupMode === 'solo'
        ? 0
        : setupStarter === 'random'
        ? Math.random() < 0.5
          ? 0
          : 1
        : setupStarter === 'p1'
        ? 0
        : 1;
    const newSessionId = generateSessionId('adventskalender', activeBoard);
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setSession(createV3Session(setupMode, starter, [resolvedP1, resolvedP2], newSessionId));
    setHistory([]);
    setInspect(false);
    setComboDoor(null);
    setSetupOpen(false);
    setSavedGame(null);
  };

  const resumeSavedGame = () => {
    if (!savedGame) return;
    setSession({
      ...savedGame,
      sessionId: savedGame.sessionId || generateSessionId('adventskalender', activeBoard),
    });
    setSavedGame(null);
    setSetupOpen(false);
  };

  const discardSavedGame = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setSavedGame(null);
    setSetupOpen(true);
  };

  const shootoutWinner = (winner: 0 | 1) => {
    pushHistory();
    playSound('win');
    setSession({
      ...session,
      winner,
      status: 'finished',
      lastBanner: {
        id: Date.now(),
        tone: 'win',
        icon: '♛',
        headline: `${session.players[winner].name} gewinnt den Shootout!`,
        subline: 'Goldener Nikolaus-Shootout entschieden',
        actorPlayer: (winner + 1) as 1 | 2,
      },
    });
  };

  return (
    <main
      className={`ak-v3-shell view-${view}`}
      style={{ '--hall-image': "url('/images/adventskalender-hall.png')" } as React.CSSProperties}
    >
      <header className="app-header">
        <div className="event-brand">
          <Link href="/special" className="ak-back-link">
            <ArrowLeft className="w-3.5 h-3.5" />
            Zurück
          </Link>
          <span>DFA</span>
          <b>Darts Fun Arena</b>
        </div>

        <div className="game-title">
          <small>{boardLabel}</small>
          <strong>Der verflixte Adventskalender</strong>
        </div>

        <div className="header-actions">
          <label className="monitor-select">
            Monitor
            <select
              value={activeBoard}
              onChange={(event) => handleSelectBoard(event.target.value)}
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={String(num)}>
                  Board {num}
                </option>
              ))}
              <option value="personal">Persönlicher TV</option>
            </select>
          </label>

          <div className="view-switch">
            <button
              type="button"
              className={view === 'tablet' ? 'selected' : ''}
              onClick={() => setView('tablet')}
            >
              Tablet
            </button>
            <button
              type="button"
              className={view === 'tv' ? 'selected' : ''}
              onClick={() => setView('tv')}
            >
              TV
            </button>
          </div>

          <button
            type="button"
            className={`ak-sound-btn ${soundEnabled ? '' : 'muted'}`}
            onClick={() => setSoundEnabled((v) => !v)}
            aria-label={soundEnabled ? 'Ton ausschalten' : 'Ton einschalten'}
            title={soundEnabled ? 'Ton an' : 'Ton aus'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <span>{openedCount} / 24 offen</span>
        </div>
      </header>

      {view === 'tablet' ? (
        <div className="tablet-cockpit">
          <section className={`tablet-scoreboard ${session.mode === 'solo' ? 'solo' : ''}`}>
            <PlayerScore
              player={session.players[0]}
              index={0}
              active={session.activePlayer === 0}
              compact
            />
            <div className="round-medallion">
              <small>{session.mode === 'solo' ? 'Versuch' : 'Runde'}</small>
              <b>{session.round}</b>
            </div>
            {session.mode === 'duel' && (
              <PlayerScore
                player={session.players[1]}
                index={1}
                active={session.activePlayer === 1}
                compact
              />
            )}
          </section>

          {active.activeCurse && (
            <section className={`penalty-takeover curse-${active.activeCurse}`}>
              <span>{curseLabels[active.activeCurse].icon}</span>
              <div>
                <small>Aktive Strafe für {active.name}</small>
                <strong>{curseLabels[active.activeCurse].title}</strong>
                <p>{curseLabels[active.activeCurse].instruction}</p>
              </div>
              <b>!</b>
            </section>
          )}

          <section className="turn-objective">
            <div>
              <small>Aktiver Werfer</small>
              <strong>{active.name}</strong>
            </div>
            <div>
              <small>Aufgabe</small>
              <strong>
                {active.activeCurse === 'skip_round'
                  ? '0 Darts · Aussetzen'
                  : `Dart ${Math.min(session.turnDarts.length + 1, activeMaxDarts)} von ${activeMaxDarts}`}
              </strong>
            </div>
            <div>
              <small>Ziel</small>
              <strong>Bis zu {activeMaxDarts} Türen treffen</strong>
            </div>
            <button
              type="button"
              className={inspect ? 'active' : ''}
              onClick={() => setInspect((value) => !value)}
            >
              👁 {inspect ? 'Inhalte verbergen' : 'Alle Inhalte aufdecken'}
            </button>
          </section>

          {active.activeCurse !== 'skip_round' && (
            <section className="turn-tracker" aria-label="Aktuelle 3-Dart-Aufnahme">
              <div className="turn-heading">
                <div>
                  <small>Aktuelle Aufnahme</small>
                  <strong>
                    {remainingDarts > 0
                      ? `Noch ${remainingDarts} ${remainingDarts === 1 ? 'Dart' : 'Darts'} für ${active.name}`
                      : `Alle ${activeMaxDarts} Darts geworfen`}
                  </strong>
                </div>
                <span>Bis zu {activeMaxDarts} Türchen in dieser Aufnahme</span>
              </div>
              <div className="dart-slots">
                {[0, 1, 2].map((idx) => {
                  if (idx >= activeMaxDarts) {
                    return (
                      <div key={idx} className="dart-slot locked">
                        <span>Dart {idx + 1}</span>
                        <b>{active.activeCurse === 'one_dart' ? '🎰 Gesperrt' : '❄️ Gefroren'}</b>
                        <small>Fluch aktiv</small>
                      </div>
                    );
                  }
                  const ev = session.turnDarts[idx];
                  if (ev) {
                    return (
                      <div key={idx} className={`dart-slot filled tone-${ev.tone}`}>
                        <span>Dart {idx + 1}</span>
                        <b>{ev.label}</b>
                        <small>{ev.subLabel}</small>
                      </div>
                    );
                  }
                  const isCurrent = idx === session.turnDarts.length;
                  return (
                    <div key={idx} className={`dart-slot ${isCurrent ? 'current' : ''}`}>
                      <span>Dart {idx + 1}</span>
                      <b>{isCurrent ? 'Bereit' : '—'}</b>
                      <small>{isCurrent ? 'Nächster Wurf' : 'Wartet'}</small>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {active.activeCurse === 'skip_round' ? (
            <button type="button" className="skip-button" onClick={skipTurn}>
              <span>⛄</span>
              <strong>Eingeschneit! Aufnahme aussetzen</strong>
              <small>Ohne Wurf an den nächsten Spieler übergeben</small>
            </button>
          ) : (
            <section className="tablet-calendar">
              <div className="section-heading">
                <div>
                  <small>Dart {Math.min(session.turnDarts.length + 1, activeMaxDarts)} erfassen</small>
                  <h1>Welches Tür-Ziel wurde getroffen?</h1>
                </div>
                <p>
                  Pro Aufnahme 3 Darts (bis zu 3 Türen). Tür 24 öffnet sich erst nach Tür 4, 6 &amp; 20.
                </p>
              </div>
              <div className="door-grid tablet-grid">
                {session.doors.map((door) => (
                  <DoorButton
                    key={door.number}
                    door={door}
                    progress={session.comboProgress[door.number] || []}
                    inspect={inspect}
                    onOpen={() => openDoor(door.number)}
                    disabled={session.status !== 'playing' || remainingDarts <= 0}
                    lockLabel={door.number === 24 ? door24LockLabel : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          <nav className="action-bar">
            <button type="button" className="abort" onClick={() => setSetupOpen(true)}>
              Neues Spiel
            </button>
            <button type="button" className="undo" onClick={undo} disabled={!history.length}>
              ↩ Letzter Dart zurück
            </button>
            <button
              type="button"
              className="miss"
              onClick={registerMiss}
              disabled={
                session.status !== 'playing' ||
                active.activeCurse === 'skip_round' ||
                remainingDarts <= 0
              }
            >
              ✕ Dart {Math.min(session.turnDarts.length + 1, Math.max(1, activeMaxDarts))}: Miss
            </button>
            <button
              type="button"
              className="next"
              onClick={finishTurnEarly}
              disabled={session.status !== 'playing' || active.activeCurse === 'skip_round'}
            >
              ⏭ Aufnahme beenden
            </button>
          </nav>
        </div>
      ) : (
        <div className={`tv-stage ${session.mode === 'solo' ? 'solo' : ''}`}>
          <PlayerScore
            player={session.players[0]}
            index={0}
            active={session.activePlayer === 0}
          />
          <section className="tv-calendar">
            <div className="tv-title">
              <small>
                Runde {session.round} · {openedCount} von 24 geöffnet
              </small>
              <h1>
                Der verflixte
                <br />
                <em>Adventskalender</em>
              </h1>
            </div>
            {active.activeCurse && (
              <div className="tv-curse">
                <span>{curseLabels[active.activeCurse].icon}</span>
                <b>
                  {active.name}: {curseLabels[active.activeCurse].instruction}
                </b>
              </div>
            )}
            <div className="tv-cabinet">
              <div className="door-grid">
                {session.doors.map((door) => (
                  <DoorButton
                    key={door.number}
                    door={door}
                    progress={session.comboProgress[door.number] || []}
                    inspect={false}
                    onOpen={() => {}}
                    disabled
                    tv
                    lockLabel={door.number === 24 ? door24LockLabel : undefined}
                  />
                ))}
              </div>
            </div>
            <div className="tv-throws">
              <span>{active.name} ist am Wurf</span>
              {session.turnDarts.length > 0 ? (
                <span>
                  Aufnahme:{' '}
                  {session.turnDarts
                    .map((d, i) => `D${i + 1}: ${d.label}`)
                    .join(' · ')}
                  {remainingDarts > 0 ? ` · Noch ${remainingDarts} Dart(s)` : ''}
                </span>
              ) : (
                <span>
                  {session.message ||
                    `Bis zu ${activeMaxDarts} Darts (bis zu ${activeMaxDarts} Türen)`}
                </span>
              )}
            </div>
          </section>
          {session.mode === 'duel' && (
            <PlayerScore
              player={session.players[1]}
              index={1}
              active={session.activePlayer === 1}
            />
          )}
        </div>
      )}

      {session.lastReveal && (
        <div className={`reveal-overlay tone-${session.lastReveal.reward.tone}`} role="dialog" aria-modal="true">
          <div className="reveal-card">
            <span className="reveal-kicker">
              Türchen {session.lastReveal.door} · {session.players[session.lastReveal.player].name}
            </span>
            <div className="reward-icon">{session.lastReveal.reward.icon}</div>
            <h2>{session.lastReveal.reward.name}</h2>
            <p>{session.lastReveal.resolvedText}</p>
            <button type="button" onClick={closeReveal}>
              {session.status !== 'playing'
                ? 'Ergebnis ansehen'
                : remainingDarts > 0
                ? `Weiter · Noch ${remainingDarts} ${remainingDarts === 1 ? 'Dart' : 'Darts'}`
                : 'An nächsten Spieler übergeben'}
            </button>
          </div>
        </div>
      )}

      {comboDoor && (
        <div className="combo-overlay" role="dialog" aria-modal="true">
          <div>
            <span className="reveal-kicker">Kombi-Tür {comboDoor}</span>
            <h2>{comboDoor === 6 ? 'Nikolaus-Doppeltür' : 'Heiligabend-Kombination'}</h2>
            <p>Welcher Teil der Kombination wurde getroffen?</p>
            <div className="combo-options">
              {comboParts[comboDoor].map((part) => {
                const done = session.comboProgress[comboDoor]?.includes(part.key);
                return (
                  <button
                    type="button"
                    key={part.key}
                    disabled={done}
                    onClick={() => registerComboHit(part.key)}
                  >
                    <span>{done ? '✓' : '○'}</span>
                    <b>{part.label}</b>
                    <small>{done ? 'Bereits geschafft' : 'Treffer eintragen'}</small>
                  </button>
                );
              })}
            </div>
            <button type="button" className="cancel-combo" onClick={() => setComboDoor(null)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {session.status === 'shootout' && !session.lastReveal && (
        <div className="shootout-overlay" role="dialog" aria-modal="true">
          <div>
            <span>🎅</span>
            <small>Gleichstand nach 24 Türchen</small>
            <h2>Goldener Nikolaus-Shootout</h2>
            <p>Je ein Dart auf Bullseye. Wer näher am Zentrum liegt, gewinnt.</p>
            <div>
              <button type="button" onClick={() => shootoutWinner(0)}>
                {session.players[0].name} war näher
              </button>
              <button type="button" onClick={() => shootoutWinner(1)}>
                {session.players[1].name} war näher
              </button>
            </div>
          </div>
        </div>
      )}

      {session.status === 'finished' && session.winner !== undefined && !session.lastReveal && (
        <div className="winner-banner">
          <small>
            {session.mode === 'solo' ? 'Alle 24 Türchen geöffnet' : 'Der Kalender ist entschieden'}
          </small>
          <strong>♛ {session.players[session.winner].name}</strong>
          <span>
            {session.players[session.winner].score} Punkte · gewinnt den verflixten Adventskalender
          </span>
          <button type="button" onClick={() => setSetupOpen(true)}>
            Neues Spiel
          </button>
        </div>
      )}

      {savedGame && (
        <div className="resume-overlay" role="dialog" aria-modal="true">
          <div>
            <span>⚠</span>
            <small>Unterbrochenes Spiel gefunden</small>
            <h2>Letztes Duell fortsetzen?</h2>
            <p>
              {savedGame.players[0].name} ({savedGame.players[0].score} Pkt)
              {savedGame.mode === 'duel'
                ? ` vs. ${savedGame.players[1].name} (${savedGame.players[1].score} Pkt)`
                : ' (Solo)'}{' '}
              · Runde {savedGame.round} ·{' '}
              {savedGame.doors.filter((door) => door.openedBy !== undefined).length} von 24 Türchen
              geöffnet
            </p>
            <nav>
              <button type="button" onClick={resumeSavedGame}>
                ▶ Spiel jetzt fortsetzen
              </button>
              <button type="button" onClick={discardSavedGame}>
                ✕ Spiel verwerfen & Neu beginnen
              </button>
            </nav>
          </div>
        </div>
      )}

      {setupOpen && !savedGame && (
        <div className="setup-overlay" role="dialog" aria-modal="true">
          <div className="setup-card">
            <span className="reveal-kicker">Neues Spiel</span>
            <h2>Der verflixte Adventskalender</h2>
            <p>24 Türen. Ein Gewinner. Unendlich viel Schadenfreude.</p>

            <div className="setup-modes">
              <button
                type="button"
                className={setupMode === 'duel' ? 'active' : ''}
                onClick={() => setSetupMode('duel')}
              >
                <b>1 vs. 1 Duell</b>
                <small>Flüche, Diebstähle und Sabotage</small>
              </button>
              <button
                type="button"
                className={setupMode === 'solo' ? 'active' : ''}
                onClick={() => setSetupMode('solo')}
              >
                <b>Solo-Training</b>
                <small>Allein auf maximalen Highscore</small>
              </button>
            </div>

            <div className="setup-fields">
              <div className="setup-field-group">
                <div className="setup-field-header">
                  <label htmlFor="ak-p1-input">Spieler 1</label>
                  {!(setupMode === 'solo' && lockedSoloName) && validPlayers.length > 0 && (
                    <button
                      type="button"
                      className={`ak-guest-toggle ${isGuestP1 ? 'active' : ''}`}
                      onClick={() => setIsGuestP1((v) => !v)}
                    >
                      {isGuestP1 ? 'Aus Liste' : 'Gast'}
                    </button>
                  )}
                </div>

                {setupMode === 'solo' && lockedSoloName ? (
                  <div className="ak-locked-badge">
                    <span>{lockedSoloName}</span>
                    <small>✓ Angemeldet · Fest fixiert</small>
                  </div>
                ) : isGuestP1 || validPlayers.length === 0 ? (
                  <input
                    id="ak-p1-input"
                    value={setupP1}
                    placeholder="Name Spieler 1"
                    onChange={(event) => setSetupP1(event.target.value)}
                  />
                ) : (
                  <select
                    id="ak-p1-input"
                    value={setupP1}
                    onChange={(event) => setSetupP1(event.target.value)}
                  >
                    {validPlayers.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {setupMode === 'duel' && (
                <div className="setup-field-group">
                  <div className="setup-field-header">
                    <label htmlFor="ak-p2-input">Spieler 2</label>
                    {validPlayers.length > 0 && (
                      <button
                        type="button"
                        className={`ak-guest-toggle ${isGuestP2 ? 'active' : ''}`}
                        onClick={() => setIsGuestP2((v) => !v)}
                      >
                        {isGuestP2 ? 'Aus Liste' : 'Gast'}
                      </button>
                    )}
                  </div>
                  {isGuestP2 || validPlayers.length === 0 ? (
                    <input
                      id="ak-p2-input"
                      value={setupP2}
                      placeholder="Name Spieler 2"
                      onChange={(event) => setSetupP2(event.target.value)}
                    />
                  ) : (
                    <select
                      id="ak-p2-input"
                      value={setupP2}
                      onChange={(event) => setSetupP2(event.target.value)}
                    >
                      {validPlayers.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {setupMode === 'duel' && (
                <div className="setup-field-group">
                  <label htmlFor="ak-starter-select">Wer beginnt?</label>
                  <select
                    id="ak-starter-select"
                    value={setupStarter}
                    onChange={(event) =>
                      setSetupStarter(event.target.value as 'random' | 'p1' | 'p2')
                    }
                  >
                    <option value="random">🎲 Zufall (50/50)</option>
                    <option value="p1">Spieler 1 ({setupP1 || 'Spieler 1'})</option>
                    <option value="p2">Spieler 2 ({setupP2 || 'Spieler 2'})</option>
                  </select>
                </div>
              )}
            </div>

            <button type="button" className="start-game" onClick={startGame}>
              Kalender mischen &amp; Spiel starten
            </button>

            {session.players[0].actionsCount > 0 && session.status !== 'finished' && (
              <div className="setup-back-row">
                <button
                  type="button"
                  className="setup-cancel-btn"
                  onClick={() => setSetupOpen(false)}
                >
                  Zurück zum laufenden Spiel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
