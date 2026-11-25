export type RallyTeamNumber = 1 | 2;

export type RallyGameMode = 'board_vs_board' | 'single_board';

export type RallyTargetDistance = 750 | 1000 | 1500;

export type RallyItemType =
  | 'spitzenbruch'
  | 'darttausch'
  | 'ausgebremst'
  | 'reifenplatzer'
  | 'turbo'
  | 'schild'
  | 'banana'
  | 'freeze'
  | 'fog'
  | 'rocket'
  | 'shield';

export interface RallyEffect {
  id: string;
  type: RallyItemType;
  sourceTeam: RallyTeamNumber;
  targetTeam: RallyTeamNumber;
  expiresAt?: string;
  remainingTurns?: number;
}

export interface RallyEventBanner {
  id: string;
  itemType: RallyItemType;
  actorTeam: RallyTeamNumber;
  text: string;
  detail: string;
  createdAt: string;
}

export interface RallyTeamSnapshot {
  teamName: string;
  score: number;
  members: string[];
  activeMemberIndex: number;
  totalDartsThrown: number;
  itemsUsedCount: number;
  activeBuffs: RallyEffect[];
  activeDebuffs: RallyEffect[];
}

export interface RallyLiveState {
  sessionId: string;
  boardId: string;
  board1Id?: string; // TV-Board für Team 1
  board2Id?: string; // TV-Board für Team 2
  targetDistance: RallyTargetDistance;
  gameMode: RallyGameMode;
  status: 'live' | 'finished';
  activeTeam: RallyTeamNumber;
  team1: RallyTeamSnapshot;
  team2: RallyTeamSnapshot;
  winnerTeam: RallyTeamNumber | null;
  lastEvent: RallyEventBanner | null;
  syncedAt: string;
}

export function isSchnapszahl(score: number): boolean {
  if (score < 77) return false;
  const digits = score.toString().split('');
  return digits.every((d) => d === digits[0]);
}

export function getAutoDetectedItem(score: number): RallyItemType | null {
  if (score >= 121) return 'turbo';
  if (isSchnapszahl(score)) return 'schild';
  if (score >= 100 && score <= 120) return 'ausgebremst';
  return null;
}

export const RALLY_ITEM_META: Record<
  RallyItemType,
  {
    type: RallyItemType;
    label: string;
    trigger: string;
    headline: string;
    detail: string;
  }
> = {
  spitzenbruch: {
    type: 'spitzenbruch',
    label: 'Spitzenbruch',
    trigger: '2× Triple',
    headline: 'SPITZENBRUCH',
    detail: 'Der nächste gegnerische Werfer darf nur 2 Darts werfen',
  },
  darttausch: {
    type: 'darttausch',
    label: 'Darttausch',
    trigger: 'Bullseye 50',
    headline: 'DARTTAUSCH',
    detail: 'Jeder Spieler gibt seine Darts an den Hintermann weiter',
  },
  ausgebremst: {
    type: 'ausgebremst',
    label: 'Ausgebremst',
    trigger: '100–120 Pkt',
    headline: 'AUSGEBREMST',
    detail: 'Gegnerisches Tablet für 20 Sekunden komplett gesperrt',
  },
  reifenplatzer: {
    type: 'reifenplatzer',
    label: 'Reifenplatzer',
    trigger: 'Doppel + Triple',
    headline: 'REIFENPLATZER',
    detail: '75 Punkte erfolgreich übertragen (-75 Gegner, +75 Team)',
  },
  turbo: {
    type: 'turbo',
    label: 'Turbo',
    trigger: 'Score ≥ 121',
    headline: 'TURBO-BOOSTER',
    detail: 'Doppelte Punkte für 20 Sekunden aktiviert',
  },
  schild: {
    type: 'schild',
    label: 'Schild',
    trigger: 'Schnapszahl ab 77',
    headline: 'TITAN-SCHILD',
    detail: 'Der nächste Angriff wird automatisch geblockt',
  },
  // Abwärtskompatible Aliase
  banana: {
    type: 'spitzenbruch',
    label: 'Spitzenbruch',
    trigger: '2× Triple',
    headline: 'SPITZENBRUCH',
    detail: 'Der nächste gegnerische Werfer darf nur 2 Darts werfen',
  },
  freeze: {
    type: 'darttausch',
    label: 'Darttausch',
    trigger: 'Bullseye 50',
    headline: 'DARTTAUSCH',
    detail: 'Jeder Spieler gibt seine Darts an den Hintermann weiter',
  },
  fog: {
    type: 'ausgebremst',
    label: 'Ausgebremst',
    trigger: '100–120 Pkt',
    headline: 'AUSGEBREMST',
    detail: 'Gegnerisches Tablet für 20 Sekunden komplett gesperrt',
  },
  rocket: {
    type: 'reifenplatzer',
    label: 'Reifenplatzer',
    trigger: 'Doppel + Triple',
    headline: 'REIFENPLATZER',
    detail: '75 Punkte erfolgreich übertragen',
  },
  shield: {
    type: 'schild',
    label: 'Schild',
    trigger: 'Schnapszahl ab 77',
    headline: 'TITAN-SCHILD',
    detail: 'Der nächste Angriff wird automatisch geblockt',
  },
};

export const RALLY_ITEM_OPTIONS: Array<(typeof RALLY_ITEM_META)[RallyItemType]> = [
  RALLY_ITEM_META.spitzenbruch,
  RALLY_ITEM_META.darttausch,
  RALLY_ITEM_META.ausgebremst,
  RALLY_ITEM_META.reifenplatzer,
  RALLY_ITEM_META.turbo,
  RALLY_ITEM_META.schild,
];

export function createInitialRallyTeam(
  teamName: string,
  members: string[]
): RallyTeamSnapshot {
  const cleanedMembers = members.map((m) => m.trim()).filter(Boolean);
  return {
    teamName: teamName.trim() || 'Team',
    score: 0,
    members: cleanedMembers.length > 0 ? cleanedMembers : ['Werfer 1'],
    activeMemberIndex: 0,
    totalDartsThrown: 0,
    itemsUsedCount: 0,
    activeBuffs: [],
    activeDebuffs: [],
  };
}

export function createInitialRallyState(params?: {
  sessionId?: string;
  boardId?: string;
  board1Id?: string;
  board2Id?: string;
  targetDistance?: RallyTargetDistance;
  gameMode?: RallyGameMode;
  team1Name?: string;
  team1Members?: string[];
  team2Name?: string;
  team2Members?: string[];
  now?: number;
}): RallyLiveState {
  const now = params?.now ?? Date.now();
  return {
    sessionId: params?.sessionId || `rally-${now}`,
    boardId: params?.boardId || '1',
    board1Id: params?.board1Id || '1',
    board2Id: params?.board2Id || '2',
    targetDistance: params?.targetDistance || 1000,
    gameMode: params?.gameMode || 'single_board',
    status: 'live',
    activeTeam: 1,
    team1: createInitialRallyTeam(
      params?.team1Name || 'Team Rot',
      params?.team1Members || ['Spieler 1', 'Spieler 2']
    ),
    team2: createInitialRallyTeam(
      params?.team2Name || 'Team Gold',
      params?.team2Members || ['Spieler 3', 'Spieler 4']
    ),
    winnerTeam: null,
    lastEvent: null,
    syncedAt: new Date(now).toISOString(),
  };
}

function cloneTeamSnapshot(team: RallyTeamSnapshot): RallyTeamSnapshot {
  return {
    teamName: team.teamName,
    score: team.score,
    members: [...team.members],
    activeMemberIndex: team.activeMemberIndex,
    totalDartsThrown: team.totalDartsThrown,
    itemsUsedCount: team.itemsUsedCount,
    activeBuffs: team.activeBuffs.map((e) => ({ ...e })),
    activeDebuffs: team.activeDebuffs.map((e) => ({ ...e })),
  };
}

export function cloneRallyState(state: RallyLiveState): RallyLiveState {
  return {
    sessionId: state.sessionId,
    boardId: state.boardId,
    board1Id: state.board1Id,
    board2Id: state.board2Id,
    targetDistance: state.targetDistance,
    gameMode: state.gameMode,
    status: state.status,
    activeTeam: state.activeTeam,
    team1: cloneTeamSnapshot(state.team1),
    team2: cloneTeamSnapshot(state.team2),
    winnerTeam: state.winnerTeam,
    lastEvent: state.lastEvent ? { ...state.lastEvent } : null,
    syncedAt: state.syncedAt,
  };
}

function isEffectActive(effect: RallyEffect, atMs: number): boolean {
  return !effect.expiresAt || new Date(effect.expiresAt).getTime() > atMs;
}

export function pruneExpiredEffects(
  state: RallyLiveState,
  now = Date.now()
): RallyLiveState {
  const next = cloneRallyState(state);
  next.team1.activeBuffs = next.team1.activeBuffs.filter((e) => isEffectActive(e, now));
  next.team1.activeDebuffs = next.team1.activeDebuffs.filter((e) =>
    isEffectActive(e, now)
  );
  next.team2.activeBuffs = next.team2.activeBuffs.filter((e) => isEffectActive(e, now));
  next.team2.activeDebuffs = next.team2.activeDebuffs.filter((e) =>
    isEffectActive(e, now)
  );
  return next;
}

export function applyRallyScore(
  state: RallyLiveState,
  team: RallyTeamNumber,
  rawScore: number,
  itemType?: RallyItemType,
  now = Date.now()
): RallyLiveState {
  const next = pruneExpiredEffects(state, now);
  if (next.status === 'finished' || next.winnerTeam !== null) {
    return next;
  }

  const actorKey = team === 1 ? 'team1' : 'team2';
  const oppKey = team === 1 ? 'team2' : 'team1';
  const opponent: RallyTeamNumber = team === 1 ? 2 : 1;

  const actorTeam = next[actorKey];
  const oppTeam = next[oppKey];

  const spitzenbruch = actorTeam.activeDebuffs.find(
    (e) => e.type === 'spitzenbruch' || e.type === 'banana'
  );
  const turbo = actorTeam.activeBuffs.some((e) => e.type === 'turbo');

  const baseScore = Math.max(0, Math.min(180, Math.round(rawScore)));
  actorTeam.score += turbo ? baseScore * 2 : baseScore;
  actorTeam.totalDartsThrown += spitzenbruch ? 2 : 3;

  if (spitzenbruch) {
    actorTeam.activeDebuffs = actorTeam.activeDebuffs.filter(
      (e) => e.id !== spitzenbruch.id
    );
  }

  // Automatisches Item ableiten falls kein manuelles Item gewählt
  const effectiveItem = itemType || getAutoDetectedItem(baseScore) || undefined;

  if (effectiveItem) {
    actorTeam.itemsUsedCount += 1;
    const effectId = `fx-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const meta = RALLY_ITEM_META[effectiveItem];
    let blocked = false;

    // Angriffe, die vom Schild geblockt werden können
    if (
      effectiveItem === 'reifenplatzer' ||
      effectiveItem === 'rocket' ||
      effectiveItem === 'ausgebremst' ||
      effectiveItem === 'freeze' ||
      effectiveItem === 'fog'
    ) {
      const shield = oppTeam.activeBuffs.find(
        (e) => e.type === 'schild' || e.type === 'shield'
      );
      if (shield) {
        oppTeam.activeBuffs = oppTeam.activeBuffs.filter((e) => e.id !== shield.id);
        blocked = true;
      }
    }

    if (!blocked) {
      if (effectiveItem === 'spitzenbruch' || effectiveItem === 'banana') {
        oppTeam.activeDebuffs.push({
          id: effectId,
          type: 'spitzenbruch',
          sourceTeam: team,
          targetTeam: opponent,
          remainingTurns: 1,
        });
      } else if (
        effectiveItem === 'ausgebremst' ||
        effectiveItem === 'freeze' ||
        effectiveItem === 'fog'
      ) {
        oppTeam.activeDebuffs.push({
          id: effectId,
          type: 'ausgebremst',
          sourceTeam: team,
          targetTeam: opponent,
          expiresAt: new Date(now + 20_000).toISOString(),
        });
      } else if (effectiveItem === 'reifenplatzer' || effectiveItem === 'rocket') {
        const transfer = Math.min(75, oppTeam.score);
        oppTeam.score -= transfer;
        actorTeam.score += transfer;
      } else if (effectiveItem === 'turbo') {
        actorTeam.activeBuffs.push({
          id: effectId,
          type: 'turbo',
          sourceTeam: team,
          targetTeam: team,
          expiresAt: new Date(now + 20_000).toISOString(),
        });
      } else if (effectiveItem === 'schild' || effectiveItem === 'shield') {
        actorTeam.activeBuffs.push({
          id: effectId,
          type: 'schild',
          sourceTeam: team,
          targetTeam: team,
        });
      } else if (effectiveItem === 'darttausch') {
        // Darttausch ist ein globales Event: Jeder wechselt Darts
      }
    }

    next.lastEvent = {
      id: effectId,
      itemType: blocked ? 'schild' : effectiveItem,
      actorTeam: blocked ? opponent : team,
      text: blocked ? 'ANGRIFF GEBLOCKT' : meta.headline,
      detail: blocked
        ? `${oppTeam.teamName} wehrt den Angriff mit dem Titan-Schild ab!`
        : meta.detail,
      createdAt: new Date(now).toISOString(),
    };
  }

  const winnerTeam: RallyTeamNumber | null =
    next.team1.score >= next.targetDistance
      ? 1
      : next.team2.score >= next.targetDistance
      ? 2
      : null;

  if (winnerTeam) {
    next.status = 'finished';
    next.winnerTeam = winnerTeam;
  } else if (next.gameMode === 'single_board') {
    next.activeTeam = opponent;
  }

  next.syncedAt = new Date(now).toISOString();
  return next;
}

export function applyRallyNextRunner(
  state: RallyLiveState,
  team: RallyTeamNumber,
  now = Date.now()
): RallyLiveState {
  const next = pruneExpiredEffects(state, now);
  const teamKey = team === 1 ? 'team1' : 'team2';
  const count = Math.max(next[teamKey].members.length, 1);
  next[teamKey].activeMemberIndex = (next[teamKey].activeMemberIndex + 1) % count;
  next.syncedAt = new Date(now).toISOString();
  return next;
}
