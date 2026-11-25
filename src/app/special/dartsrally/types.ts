export type RallyTeamNumber = 1 | 2;

export type RallyGameMode = 'board_vs_board' | 'single_board';

export type RallyTargetDistance = 750 | 1000 | 1500;

export type RallyItemType =
  | 'banana'
  | 'freeze'
  | 'fog'
  | 'rocket'
  | 'turbo'
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
  banana: {
    type: 'banana',
    label: 'Banane',
    trigger: '2× Triple',
    headline: 'BANANENSCHALE',
    detail: 'Der nächste Gegner wirft nur 2 Darts',
  },
  freeze: {
    type: 'freeze',
    label: 'Frost',
    trigger: 'Bullseye 50',
    headline: 'FROST-BLITZ',
    detail: 'Gegnerisches Board für 10 Sekunden eingefroren',
  },
  fog: {
    type: 'fog',
    label: 'Nebel',
    trigger: '100+ Punkte',
    headline: 'SCHNEESTURM',
    detail: 'Gegnerischer Punktestand für 20 Sekunden verdeckt',
  },
  rocket: {
    type: 'rocket',
    label: 'Rakete',
    trigger: 'Doppel + Triple',
    headline: 'LENKRAKETE',
    detail: '75 Punkte erfolgreich übertragen',
  },
  turbo: {
    type: 'turbo',
    label: 'Turbo',
    trigger: '3× gleiche Zahl',
    headline: 'TURBO-BOOSTER',
    detail: 'Doppelte Punkte für 20 Sekunden aktiviert',
  },
  shield: {
    type: 'shield',
    label: 'Schild',
    trigger: '2× die 18',
    headline: 'EIS-SCHILD',
    detail: 'Der nächste Angriff wird automatisch geblockt',
  },
};

export const RALLY_ITEM_OPTIONS: Array<(typeof RALLY_ITEM_META)[RallyItemType]> = [
  RALLY_ITEM_META.banana,
  RALLY_ITEM_META.freeze,
  RALLY_ITEM_META.fog,
  RALLY_ITEM_META.rocket,
  RALLY_ITEM_META.turbo,
  RALLY_ITEM_META.shield,
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

  const banana = actorTeam.activeDebuffs.find((e) => e.type === 'banana');
  const turbo = actorTeam.activeBuffs.some((e) => e.type === 'turbo');

  const baseScore = Math.max(0, Math.min(180, Math.round(rawScore)));
  actorTeam.score += turbo ? baseScore * 2 : baseScore;
  actorTeam.totalDartsThrown += banana ? 2 : 3;

  if (banana) {
    actorTeam.activeDebuffs = actorTeam.activeDebuffs.filter((e) => e.id !== banana.id);
  }

  if (itemType) {
    actorTeam.itemsUsedCount += 1;
    const effectId = `fx-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const meta = RALLY_ITEM_META[itemType];
    let blocked = false;

    if (itemType === 'rocket' || itemType === 'freeze') {
      const shield = oppTeam.activeBuffs.find((e) => e.type === 'shield');
      if (shield) {
        oppTeam.activeBuffs = oppTeam.activeBuffs.filter((e) => e.id !== shield.id);
        blocked = true;
      }
    }

    if (!blocked) {
      if (itemType === 'banana') {
        oppTeam.activeDebuffs.push({
          id: effectId,
          type: itemType,
          sourceTeam: team,
          targetTeam: opponent,
          remainingTurns: 1,
        });
      } else if (itemType === 'freeze' || itemType === 'fog') {
        const duration = itemType === 'freeze' ? 10_000 : 20_000;
        oppTeam.activeDebuffs.push({
          id: effectId,
          type: itemType,
          sourceTeam: team,
          targetTeam: opponent,
          expiresAt: new Date(now + duration).toISOString(),
        });
      } else if (itemType === 'rocket') {
        const transfer = Math.min(75, oppTeam.score);
        oppTeam.score -= transfer;
        actorTeam.score += transfer;
      } else if (itemType === 'turbo' || itemType === 'shield') {
        actorTeam.activeBuffs.push({
          id: effectId,
          type: itemType,
          sourceTeam: team,
          targetTeam: team,
          expiresAt:
            itemType === 'turbo' ? new Date(now + 20_000).toISOString() : undefined,
        });
      }
    }

    next.lastEvent = {
      id: effectId,
      itemType: blocked ? 'shield' : itemType,
      actorTeam: blocked ? opponent : team,
      text: blocked ? 'ANGRIFF GEBLOCKT' : meta.headline,
      detail: blocked
        ? `${oppTeam.teamName} wehrt den Angriff mit dem Eis-Schild ab`
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
