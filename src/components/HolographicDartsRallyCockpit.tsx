'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  RallyEffect,
  RallyEventBanner,
  RallyItemType,
  RallyLiveState,
  RallyTeamNumber,
  RallyTeamSnapshot,
} from '@/app/special/dartsrally/types';
import './HolographicDartsRallyCockpit.css';

export type RallyIconName =
  | 'bolt'
  | 'flag'
  | 'shield'
  | 'target'
  | 'users'
  | 'volume'
  | 'sync';

export function RallyIcon({
  name,
  size = 18,
}: {
  name: RallyIconName;
  size?: number;
}) {
  const paths: Record<RallyIconName, ReactNode> = {
    bolt: <path d="M13 2 4.5 13H11l-1 9 8.5-12H12l1-8Z" />,
    flag: (
      <>
        <path d="M5 21V4" />
        <path d="M5 5c5-3 8 3 14 0v9c-6 3-9-3-14 0" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M17 11a4 4 0 0 0 0-8M23 21v-2a4 4 0 0 1 3-3.87" />
      </>
    ),
    volume: (
      <>
        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
      </>
    ),
    sync: (
      <>
        <path d="M20 7h-5V2" />
        <path d="M4 17h5v5" />
        <path d="M5.1 9a8 8 0 0 1 13.2-3L20 7M4 17l1.7 1A8 8 0 0 0 18.9 15" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}

export function getRallyEffect(
  team: RallyTeamSnapshot,
  type: RallyItemType,
  now: number
): RallyEffect | undefined {
  return [...(team.activeBuffs || []), ...(team.activeDebuffs || [])].find(
    (effect) =>
      effect.type === type &&
      (!effect.expiresAt || new Date(effect.expiresAt).getTime() > now)
  );
}

export function getRallySecondsLeft(
  effect: RallyEffect | undefined,
  now: number
): number | null {
  if (!effect?.expiresAt) return null;
  const remaining = Math.ceil((new Date(effect.expiresAt).getTime() - now) / 1000);
  return remaining > 0 ? remaining : null;
}

export function RallyItemEffectOverlay({
  event,
  viewingTeam,
}: {
  event: RallyEventBanner | null;
  viewingTeam?: RallyTeamNumber;
}) {
  if (!event) return null;

  const isActor = viewingTeam !== undefined ? event.actorTeam === viewingTeam : null;
  const actorName = event.sourceTeamName || (event.actorTeam === 1 ? 'Team Rot' : 'Team Gold');

  // Ist es ein Angriff gegen das betrachtende Team?
  const isAttackAgainstMe =
    isActor === false &&
    (event.itemType === 'ausgebremst' ||
      event.itemType === 'spitzenbruch' ||
      event.itemType === 'reifenplatzer' ||
      event.itemType === 'freeze' ||
      event.itemType === 'fog' ||
      event.itemType === 'banana' ||
      event.itemType === 'rocket');

  // Ist es ein Buff des Gegners?
  const isEnemyBuff = isActor === false && (event.itemType === 'turbo' || event.itemType === 'schild' || event.itemType === 'shield');

  // Eigener Vorteil / Buff
  const isOwnBenefit = isActor === true;

  return (
    <aside
      key={event.id}
      className={`rally-impact-overlay ${
        isAttackAgainstMe
          ? 'is-danger-penalty'
          : isEnemyBuff
          ? 'is-warning-alert'
          : 'is-success-boost'
      } team-${event.actorTeam}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="impact-card">
        <div className="impact-header">
          <div className="impact-badge">
            <span className={`team-pill team-${event.actorTeam}`}>{actorName}</span>
            {event.scoreThrown !== undefined && (
              <span className="score-pill">{event.scoreThrown} PKT</span>
            )}
          </div>
          <strong className="impact-title">
            {isAttackAgainstMe
              ? `🛑 GEGNER-ANGRIFF: ${event.text}`
              : isEnemyBuff
              ? `⚠️ GEGNER-ALARM: ${event.text}`
              : `🚀 ${event.text}`}
          </strong>
        </div>

        <div className="impact-body">
          {isAttackAgainstMe ? (
            <div className="penalty-box">
              <small className="penalty-label">⚠️ STRAFE FÜR EUER TEAM:</small>
              <p className="penalty-desc">
                {event.opponentPenaltyText || event.detail}
              </p>
            </div>
          ) : isOwnBenefit ? (
            <div className="benefit-box">
              <small className="benefit-label">✨ VORTEIL FÜR EUER TEAM:</small>
              <p className="benefit-desc">
                {event.teamBenefitText || event.detail}
              </p>
            </div>
          ) : (
            <div className="neutral-box">
              <p className="neutral-desc">{event.detail}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export interface HolographicDartsRallyProps {
  boardId: string;
  rally: RallyLiveState;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function TeamPanel({
  side,
  team,
  target,
  now,
  kickerLabel,
  statusBadge,
}: {
  side: 'red' | 'gold';
  team: RallyTeamSnapshot;
  target: number;
  now: number;
  kickerLabel: string;
  statusBadge: string;
}) {
  const fog = getRallyEffect(team, 'fog', now);
  const turbo = getRallyEffect(team, 'turbo', now);
  const shield = getRallyEffect(team, 'shield', now);
  const banana = getRallyEffect(team, 'banana', now);
  const frozen = getRallyEffect(team, 'freeze', now);
  const scoreConcealed = Boolean(fog);
  const pct = Math.min(100, (team.score / Math.max(1, target)) * 100);

  return (
    <section className={`team-panel ${side} ${frozen ? 'team-frozen' : ''}`}>
      <div className="team-kicker">
        <span>{kickerLabel}</span>
        <i>{statusBadge}</i>
      </div>
      <h2>{team.teamName.toUpperCase()}</h2>
      <div
        className={`mega-score ${scoreConcealed ? 'score-concealed' : ''} ${
          turbo ? 'is-turbo' : ''
        }`}
      >
        {scoreConcealed ? '•••' : team.score}
      </div>
      <div className="remaining">
        <strong>{scoreConcealed ? '—' : Math.max(0, target - team.score)}</strong>
        <span>PUNKTE BIS ZUM ZIEL</span>
      </div>
      <div className="team-meter">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="member-list">
        <small>TEAM / AKTUELLER WERFER</small>
        {team.members.map((member, index) => (
          <div
            className={index === team.activeMemberIndex ? 'active' : ''}
            key={`${member}-${index}`}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{member}</strong>
            {index === team.activeMemberIndex && <i>AM OCHE</i>}
          </div>
        ))}
      </div>
      <div className="effect-stack">
        {turbo && (
          <span className="effect-chip turbo">
            <RallyIcon name="bolt" size={14} /> TURBO ·{' '}
            {getRallySecondsLeft(turbo, now)}s
          </span>
        )}
        {shield && (
          <span className="effect-chip shield-chip">
            <RallyIcon name="shield" size={14} /> SCHILD BEREIT
          </span>
        )}
        {frozen && (
          <span className="effect-chip frozen-chip">
            FREEZE · {getRallySecondsLeft(frozen, now)}s
          </span>
        )}
        {fog && (
          <span className="effect-chip fog-chip">
            NEBEL · {getRallySecondsLeft(fog, now)}s
          </span>
        )}
        {banana && <span className="effect-chip banana-chip">NUR 2 DARTS</span>}
      </div>
    </section>
  );
}

function RaceTrack({ rally }: { rally: RallyLiveState }) {
  const redProgress = Math.min(1, rally.team1.score / Math.max(1, rally.targetDistance));
  const goldProgress = Math.min(1, rally.team2.score / Math.max(1, rally.targetDistance));

  return (
    <section className="track-wrap" aria-label="Rennfortschritt">
      <div className="finish-gantry">
        <span>FINISH</span>
        <strong>{rally.targetDistance.toLocaleString('de-DE')}</strong>
      </div>
      <div className="track">
        <div className="lane-line left" />
        <div className="lane-line right" />
        <div className="speed-light l1" />
        <div className="speed-light l2" />
        <div
          className="position-beacon red-position"
          style={{ bottom: `${18 + redProgress * 52}%` }}
        >
          <div className="position-trail" />
          <div className="timing-plaque">
            <small>R</small>
            <strong>{rally.team1.score}</strong>
          </div>
        </div>
        <div
          className="position-beacon gold-position"
          style={{ bottom: `${18 + goldProgress * 52}%` }}
        >
          <div className="position-trail" />
          <div className="timing-plaque">
            <small>G</small>
            <strong>{rally.team2.score}</strong>
          </div>
        </div>
      </div>
      <div className="track-label">
        <span>LIVE RACE POSITION</span>
        <b>SYNCED RACE CONTROL</b>
      </div>
    </section>
  );
}

export default function HolographicDartsRallyCockpit({
  boardId,
  rally,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicDartsRallyProps) {
  const [fallbackTime, setFallbackTime] = useState<string>('');
  const [now, setNow] = useState<number>(() => Date.now());
  const [effectEvent, setEffectEvent] = useState<RallyEventBanner | null>(null);
  const lastEventId = useRef<string | null>(null);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (currentTime) return;
    const update = () => {
      setFallbackTime(
        new Date().toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [currentTime]);

  useEffect(() => {
    const incoming = rally.lastEvent;
    if (!incoming?.id || incoming.id === lastEventId.current) return;
    const ageMs = Date.now() - new Date(incoming.createdAt).getTime();
    lastEventId.current = incoming.id;
    if (ageMs < 4000) {
      setEffectEvent(incoming);
    }
  }, [rally.lastEvent]);

  useEffect(() => {
    if (!effectEvent) return;
    const timer = setTimeout(() => setEffectEvent(null), 3200);
    return () => clearTimeout(timer);
  }, [effectEvent]);

  const displayTime = currentTime || fallbackTime;
  const isSingleBoard = rally.gameMode === 'single_board';

  return (
    <main className="dr-rally-root is-tv forced-dark">
      <div className="arena-board">
        <div className="monitor-background" />

        <header className="broadcast-header">
          <div className="event-id">
            <RallyIcon name="target" size={22} />
            <span>
              DARTS FUN ARENA
              <small>DARTS RALLY · BOARD {boardId}</small>
            </span>
          </div>

          <div className="race-title">
            <small>{rally.targetDistance.toLocaleString('de-DE')} PUNKTE STAFFEL</small>
            <strong>DARTS RALLY</strong>
          </div>

          <div className="live-clock">
            <span /> LIVE <strong>{displayTime || 'SYNC'}</strong>
            <RallyIcon name="sync" size={18} />
            {onToggleFullscreen && (
              <button
                type="button"
                className="dr-fullscreen-btn"
                onClick={onToggleFullscreen}
                aria-label="Vollbild umschalten"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </header>

        <div className="broadcast-grid">
          <TeamPanel
            side="red"
            team={rally.team1}
            target={rally.targetDistance}
            now={now}
            kickerLabel={isSingleBoard ? 'TEAM 01' : 'BOARD 1'}
            statusBadge={
              rally.winnerTeam === 1
                ? 'SIEGER'
                : isSingleBoard
                ? rally.activeTeam === 1
                  ? 'AM WURF'
                  : 'WARTET'
                : 'LIVE'
            }
          />

          <RaceTrack rally={rally} />

          <TeamPanel
            side="gold"
            team={rally.team2}
            target={rally.targetDistance}
            now={now}
            kickerLabel={isSingleBoard ? 'TEAM 02' : 'BOARD 2'}
            statusBadge={
              rally.winnerTeam === 2
                ? 'SIEGER'
                : isSingleBoard
                ? rally.activeTeam === 2
                  ? 'AM WURF'
                  : 'WARTET'
                : 'LIVE'
            }
          />
        </div>

        {rally.lastEvent && (
          <div key={rally.lastEvent.id} className="event-ticker">
            <div className="ticker-icon">
              <RallyIcon
                name={rally.lastEvent.itemType === 'shield' ? 'shield' : 'bolt'}
                size={20}
              />
            </div>
            <span>ITEM-EVENT</span>
            <strong>{rally.lastEvent.text}</strong>
            <p>{rally.lastEvent.detail}</p>
            <b>T{rally.lastEvent.actorTeam}</b>
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
            </div>
          </div>
        )}
      </div>

      <RallyItemEffectOverlay
        event={effectEvent}
        viewingTeam={
          rally.board1Id && boardId === rally.board1Id
            ? 1
            : rally.board2Id && boardId === rally.board2Id
            ? 2
            : undefined
        }
      />
    </main>
  );
}
