'use client';

import React, { useEffect, useState } from 'react';
import { Image as SceneIcon, Minimize2 } from 'lucide-react';
import {
  TANNENBAUM_BALL_NUMBERS,
  TannenbaumBallNumber,
  TannenbaumDartEvent,
  TannenbaumLastActionBanner,
  TannenbaumNodeId,
  TannenbaumPlayerState,
  TannenbaumStarTarget,
  TannenbaumWinCondition,
  countTotalLit,
  getRequiredLitToWin,
} from '@/app/special/tannenbaum/types';
import './HolographicTannenbaumCockpit.css';

export type TannenbaumSceneId = 'lodge' | 'landscape';

const SCENE_STORAGE_KEY = 'lions_tannenbaum_scene_v1';
const SCENE_BACKGROUNDS: Record<TannenbaumSceneId, string> = {
  lodge: '/images/tannenbaum-winter-lodge.png',
  landscape: '/images/tannenbaum-winter-landscape.png',
};

export interface HolographicTannenbaumProps {
  boardId: string;
  p1Name: string;
  p2Name?: string;
  activeName: string;
  is1vs1: boolean;
  activePlayer: 1 | 2;
  roundNumber: number;
  tripleExtinguishEnabled: boolean;
  starTarget: TannenbaumStarTarget;
  winCondition?: TannenbaumWinCondition;
  p1: TannenbaumPlayerState;
  p2?: TannenbaumPlayerState;
  lastAction?: TannenbaumLastActionBanner | null;
  winnerPlayer?: 1 | 2 | null;
  winnerName?: string | null;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  initialScene?: TannenbaumSceneId;
}

const BALL_TARGETS: { num: TannenbaumBallNumber; x: number; y: number }[] = [
  { num: 20, x: 37, y: 20 },
  { num: 19, x: 63, y: 20 },
  { num: 18, x: 27, y: 43 },
  { num: 17, x: 50, y: 43 },
  { num: 16, x: 73, y: 43 },
  { num: 15, x: 17, y: 68 },
  { num: 14, x: 39, y: 68 },
  { num: 13, x: 61, y: 68 },
  { num: 12, x: 83, y: 68 },
];

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 3.5h-5v5M15.5 3.5h5v5M20.5 15.5v5h-5M3.5 15.5v5h5M9 9 3.8 3.8M15 9l5.2-5.2M15 15l5.2 5.2M9 15l-5.2 5.2" />
    </svg>
  );
}

function DartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.5 3 6.5.1-4 4 3.5 1.2-4 4-3.2-1.4L8 16.2M4 20l7.2-7.2" />
      <circle cx="4" cy="20" r="1.3" />
    </svg>
  );
}

function splitPlayerName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Spieler';
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

function mapDartSlot(ev: TannenbaumDartEvent): {
  cls: string;
  value: string;
  sub: string;
} {
  if (
    ev.kind === 'ball_stolen' ||
    ev.kind === 'trunk_stolen' ||
    ev.kind === 'star_stolen' ||
    ev.kind === 'triple_extinguish'
  ) {
    return { cls: 'is-steal', value: ev.label, sub: 'Geklaut' };
  }
  if (ev.kind === 'star_win') {
    return { cls: 'is-hit', value: ev.label, sub: 'Sieg' };
  }
  if (
    ev.kind === 'ball_lit' ||
    ev.kind === 'trunk_lit' ||
    ev.kind === 'triple_double_hit' ||
    ev.kind === 'star_lit'
  ) {
    return { cls: 'is-hit', value: ev.label, sub: 'An' };
  }
  if (ev.kind === 'ball_blocked_single') {
    return { cls: 'is-miss', value: ev.label, sub: 'Prallt ab' };
  }
  if (
    ev.kind === 'ball_already_lit' ||
    ev.kind === 'trunk_already_lit' ||
    ev.kind === 'star_already_lit'
  ) {
    return { cls: 'is-info', value: ev.label, sub: 'Schon an' };
  }
  return { cls: 'is-miss', value: 'MISS', sub: 'Daneben' };
}

function formatNodeBadge(node: TannenbaumNodeId | undefined, starTarget: TannenbaumStarTarget) {
  if (!node) return null;
  if (node === 'TRUNK') return 'Doppel';
  if (node === 'STAR') return starTarget;
  return node;
}

function getBannerModifier(lastAction?: TannenbaumLastActionBanner | null): string {
  if (!lastAction) return '';
  if (lastAction.type === 'extinguish') return 'is-steal';
  if (lastAction.type === 'win' || lastAction.type === 'star_unlocked') return 'is-win';
  if (lastAction.type === 'lit' || lastAction.type === 'trunk') return 'is-hit';
  if (lastAction.type === 'miss') return 'is-miss';
  return '';
}

export default function HolographicTannenbaumCockpit({
  boardId,
  p1Name,
  p2Name = 'Gastspieler',
  activeName,
  is1vs1,
  activePlayer,
  roundNumber,
  tripleExtinguishEnabled,
  starTarget,
  winCondition = 'majority_6',
  p1,
  p2,
  lastAction,
  winnerPlayer,
  winnerName,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
  initialScene = 'lodge',
}: HolographicTannenbaumProps) {
  const [fallbackTime, setFallbackTime] = useState<string>('');
  const [scene, setScene] = useState<TannenbaumSceneId>(initialScene);
  const [isScenePickerOpen, setIsScenePickerOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SCENE_STORAGE_KEY);
      if (stored === 'lodge' || stored === 'landscape') {
        setScene(stored);
      }
    } catch {}
  }, []);

  const handleSelectScene = (nextScene: TannenbaumSceneId) => {
    setScene(nextScene);
    try {
      localStorage.setItem(SCENE_STORAGE_KEY, nextScene);
    } catch {}
  };

  const backgroundImage = SCENE_BACKGROUNDS[scene];

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

  const displayTime = currentTime || fallbackTime;
  const safeP2 = p2 || p1;

  const p1Lit = countTotalLit(p1.tree);
  const p2Lit = countTotalLit(safeP2.tree);
  const requiredToWin = getRequiredLitToWin(winCondition, is1vs1);

  const p1RecentlyExtinguished =
    lastAction?.type === 'extinguish' && lastAction.actorPlayer === 2
      ? lastAction.affectedNode
      : undefined;
  const p2RecentlyExtinguished =
    lastAction?.type === 'extinguish' && lastAction.actorPlayer === 1
      ? lastAction.affectedNode
      : undefined;

  const p1RecentlyLit =
    (lastAction?.type === 'lit' ||
      lastAction?.type === 'trunk' ||
      lastAction?.type === 'star_unlocked') &&
    lastAction.actorPlayer === 1
      ? lastAction.affectedNode
      : undefined;
  const p2RecentlyLit =
    (lastAction?.type === 'lit' ||
      lastAction?.type === 'trunk' ||
      lastAction?.type === 'star_unlocked') &&
    lastAction.actorPlayer === 2
      ? lastAction.affectedNode
      : undefined;

  const { firstName: p1First } = splitPlayerName(p1Name);
  const { firstName: p2First } = splitPlayerName(p2Name);

  const trunkOwner: 1 | 2 | null = p1.tree.trunk
    ? 1
    : is1vs1 && safeP2.tree.trunk
    ? 2
    : null;
  const trunkExt =
    p1RecentlyExtinguished === 'TRUNK' ||
    (is1vs1 && p2RecentlyExtinguished === 'TRUNK');

  const starOwner: 1 | 2 | null = p1.tree.star
    ? 1
    : is1vs1 && safeP2.tree.star
    ? 2
    : null;
  const starExt =
    p1RecentlyExtinguished === 'STAR' ||
    (is1vs1 && p2RecentlyExtinguished === 'STAR');

  const renderPlayerCard = (
    playerNum: 1 | 2,
    name: string,
    state: TannenbaumPlayerState,
    litCount: number
  ) => {
    const side = playerNum === 1 ? 'red' : 'gold';
    const isAct = !winnerName && activePlayer === playerNum;
    const isWinner = winnerPlayer === playerNum;
    const { firstName, lastName } = splitPlayerName(name);
    const pct = Math.min(100, Math.round((litCount / requiredToWin) * 100));
    const darts = state.currentTurnDarts || [];

    return (
      <aside
        className={`player-card player-card--${side} ${isAct ? 'is-active' : ''} ${
          isWinner ? 'is-winner' : ''
        }`}
      >
        <div className="player-accent" />
        <div className="player-card__inner">
          <div className="player-kicker">
            <span>Spieler 0{playerNum}</span>
            <i />
            {isWinner ? 'Sieger' : isAct ? 'Am Wurf' : 'Bereit'}
          </div>

          <div className="player-name">
            <strong>{firstName}</strong>
            {lastName && <span>{lastName}</span>}
          </div>

          <div className="score-block">
            <div className="score-label">Kugeln gesichert</div>
            <div className="score-line">
              <b>{litCount}</b>
              <span>/ {requiredToWin}</span>
            </div>
            <div className="progress">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="stats">
            <div>
              <span>Darts</span>
              <b>{String(state.dartsThrown).padStart(2, '0')}</b>
            </div>
            {tripleExtinguishEnabled || is1vs1 ? (
              <div>
                <span>Gestohlen</span>
                <b>{String(state.extinguishedCount).padStart(2, '0')}</b>
              </div>
            ) : (
              <div>
                <span>Runden</span>
                <b>{String(state.roundsPlayed).padStart(2, '0')}</b>
              </div>
            )}
          </div>

          <div className="throws">
            <div className="section-label">Aktuelle Aufnahme</div>
            <div className="throw-grid">
              {[0, 1, 2].map((idx) => {
                const ev = darts[idx];
                if (ev) {
                  const slot = mapDartSlot(ev);
                  return (
                    <div key={idx} className={`throw ${slot.cls}`}>
                      <span>Dart {idx + 1}</span>
                      <b>{slot.value}</b>
                      <small>{slot.sub}</small>
                    </div>
                  );
                }
                const isNext = isAct && idx === darts.length;
                return (
                  <div key={idx} className={`throw ${isNext ? 'is-next' : ''}`}>
                    <span>Dart {idx + 1}</span>
                    <b>{isNext ? '•' : '—'}</b>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    );
  };

  const renderSoloOverviewCard = () => {
    const remaining = Math.max(0, requiredToWin - p1Lit);
    return (
      <aside className="player-card player-card--gold">
        <div className="player-accent" />
        <div className="player-card__inner">
          <div className="player-kicker">
            <span>Solo-Modus</span>
            <i />
            Übersicht
          </div>

          <div className="player-name">
            <strong>Tannenbaum</strong>
            <span>Alle 11 Elemente</span>
          </div>

          <div className="tb-solo-grid">
            {TANNENBAUM_BALL_NUMBERS.map((num) => {
              const lit = p1.tree.balls[num];
              return (
                <div key={num} className={`tb-solo-node ${lit ? 'is-lit' : ''}`}>
                  <b>{num}</b>
                  <small>{lit ? 'An' : 'Offen'}</small>
                </div>
              );
            })}
          </div>

          <div className="tb-solo-specials">
            <div className={`tb-solo-node ${p1.tree.trunk ? 'is-lit' : ''}`}>
              <b>Stamm</b>
              <small>{p1.tree.trunk ? 'An' : 'Doppel'}</small>
            </div>
            <div className={`tb-solo-node ${p1.tree.star ? 'is-lit' : ''}`}>
              <b>{starTarget}</b>
              <small>{p1.tree.star ? 'An' : 'Spitze'}</small>
            </div>
          </div>

          <div className="throws">
            <div className="section-label">Verbleibend bis Sieg</div>
            <div className="stats" style={{ marginTop: '12px' }}>
              <div>
                <span>Offen</span>
                <b>{String(remaining).padStart(2, '0')}</b>
              </div>
              <div>
                <span>Spitze</span>
                <b>{starTarget}</b>
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  };

  const bannerNodeBadge = formatNodeBadge(lastAction?.affectedNode, starTarget);
  const bannerModifier = getBannerModifier(lastAction);

  const bullSubLabel = starExt
    ? 'Geklaut'
    : starOwner === 1
    ? is1vs1
      ? p1First
      : 'Erobert'
    : starOwner === 2
    ? p2First
    : 'Start';

  const trunkOwnerLabel =
    trunkOwner === 1
      ? is1vs1
        ? p1First
        : 'Erobert'
      : trunkOwner === 2
      ? p2First
      : 'Doppel';

  return (
    <main
      className={`tb-lodge-root forced-dark game--${scene} ${
        isScenePickerOpen ? 'is-setup' : 'is-started'
      }`}
      style={{ '--lodge': `url('${backgroundImage}')` } as React.CSSProperties}
    >
      <div className="atmosphere" />

      {isScenePickerOpen && (
        <section className="scene-setup" aria-labelledby="scene-title">
          <div className="setup-heading">
            <span>Board {String(boardId).padStart(2, '0')} · Kulissen-Auswahl</span>
            <h1 id="scene-title">Wähle deine Winterkulisse</h1>
            <p>Die Auswahl verändert nur die Atmosphäre. Spielregeln und Board bleiben identisch.</p>
          </div>

          <div className="scene-options" role="radiogroup" aria-label="Winterkulisse">
            <button
              type="button"
              className={`scene-option ${scene === 'lodge' ? 'is-selected' : ''}`}
              onClick={() => handleSelectScene('lodge')}
              role="radio"
              aria-checked={scene === 'lodge'}
            >
              <img
                src={SCENE_BACKGROUNDS.lodge}
                alt="Dunkle Winternacht mit verschneitem Tannenbaum"
              />
              <span className="scene-option__shade" />
              <span className="scene-option__check" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="m6 12.5 4 4L18.5 8" />
                </svg>
              </span>
              <span className="scene-option__copy">
                <small>Atmosphäre 01</small>
                <strong>Winternacht</strong>
                <em>Dramatisch · Tief · Exklusiv</em>
              </span>
            </button>

            <button
              type="button"
              className={`scene-option ${scene === 'landscape' ? 'is-selected' : ''}`}
              onClick={() => handleSelectScene('landscape')}
              role="radio"
              aria-checked={scene === 'landscape'}
            >
              <img
                src={SCENE_BACKGROUNDS.landscape}
                alt="Helle verschneite Berglandschaft mit Tannenbaum"
              />
              <span className="scene-option__shade" />
              <span className="scene-option__check" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="m6 12.5 4 4L18.5 8" />
                </svg>
              </span>
              <span className="scene-option__copy">
                <small>Atmosphäre 02</small>
                <strong>Winterlandschaft</strong>
                <em>Klar · Hell · Weit</em>
              </span>
            </button>
          </div>

          <div className="setup-footer">
            <div>
              <span>Ausgewählt</span>
              <strong>{scene === 'lodge' ? 'Winternacht' : 'Winterlandschaft'}</strong>
            </div>
            <button
              type="button"
              className="start-button"
              onClick={() => setIsScenePickerOpen(false)}
            >
              <span>Kulisse übernehmen</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h13M14 7l5 5-5 5" />
              </svg>
            </button>
          </div>
        </section>
      )}

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <div>
            <b>Lions Winter Series</b>
            <span>Special Event</span>
          </div>
        </div>

        <div className="match-meta">
          <span>Board {String(boardId).padStart(2, '0')}</span>
          <i />
          <strong>Lions Tannenbaum</strong>
          <i />
          <span>Runde {String(roundNumber).padStart(2, '0')}</span>
          <em>{is1vs1 && winCondition === 'majority_6' ? '6 / 11' : '11 / 11'}</em>
        </div>

        <div className="session">
          <span>{displayTime}</span>
          <button
            type="button"
            onClick={() => setIsScenePickerOpen(true)}
            aria-label="Winterkulisse wählen"
            title="Winterkulisse wechseln"
          >
            <SceneIcon />
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label="Vollbild umschalten"
            >
              {isFullscreen ? <Minimize2 /> : <ExpandIcon />}
            </button>
          )}
        </div>
      </header>

      <section className="game-layout">
        {renderPlayerCard(1, is1vs1 ? p1Name : activeName || p1Name, p1, p1Lit)}

        <section className="board-stage" aria-label="Tannenbaum-Spielbrett">
          <div className="versus">
            {is1vs1 ? (
              <>
                <span>
                  <i className="red-dot" /> {p1First}
                </span>
                <small>gegen</small>
                <span>
                  {p2First} <i className="gold-dot" />
                </span>
              </>
            ) : (
              <>
                <span>
                  <i className="red-dot" /> {activeName || p1Name}
                </span>
                <small>Solo</small>
              </>
            )}
          </div>

          <div className="tree-board">
            <div
              className={`bull${starOwner === 1 ? ' is-p1' : starOwner === 2 ? ' is-p2' : ''}${
                starExt ? ' is-stolen' : ''
              }`}
              aria-label={`Spitze ${starTarget}`}
            >
              <span>{bullSubLabel}</span>
              <b>{starTarget}</b>
            </div>

            {BALL_TARGETS.map(({ num, x, y }) => {
              const p1LitBall = p1.tree.balls[num];
              const p2LitBall = is1vs1 && safeP2.tree.balls[num];
              const owner: 1 | 2 | null = p1LitBall ? 1 : p2LitBall ? 2 : null;
              const isStolen =
                p1RecentlyExtinguished === String(num) ||
                (is1vs1 && p2RecentlyExtinguished === String(num));
              const isFresh =
                p1RecentlyLit === String(num) ||
                (is1vs1 && p2RecentlyLit === String(num));

              return (
                <div
                  key={num}
                  className={`target${owner === 1 ? ' is-p1' : owner === 2 ? ' is-p2' : ''}${
                    isFresh ? ' is-fresh' : ''
                  }${isStolen ? ' is-stolen' : ''}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-label={`Kugel ${num}`}
                >
                  <i className="ornament-hook" aria-hidden="true" />
                  <span>{num}</span>
                </div>
              );
            })}

            <div
              className={`rule-tag${trunkOwner === 1 ? ' is-p1' : trunkOwner === 2 ? ' is-p2' : ''}${
                trunkExt ? ' is-stolen' : ''
              }`}
            >
              <span>Stamm</span>
              <strong>{trunkOwnerLabel}</strong>
            </div>
          </div>

          <div className={`capture-banner ${bannerModifier}`}>
            <div className="capture-icon">
              <DartIcon />
            </div>
            {lastAction ? (
              <div>
                <span>{lastAction.headline}</span>
                {bannerNodeBadge && <strong>{bannerNodeBadge}</strong>}
                <p>{lastAction.subline}</p>
              </div>
            ) : (
              <div>
                <span>Spiel läuft</span>
                <strong>Bereit</strong>
                <p>
                  {is1vs1
                    ? 'Erobere Kugeln (12–20), Stamm (Doppel) & Stern — D/T stiehlt!'
                    : 'Alle 9 Kugeln (12–20), Stamm (Doppel) & Stern erobern!'}
                </p>
              </div>
            )}
          </div>

          <div className="rules">
            {is1vs1 ? (
              <>
                <span>
                  <i className="rule-fire" /> D/T stiehlt
                </span>
                <span>
                  <i className="rule-shield" /> Single prallt ab
                </span>
                <span>
                  <i className="rule-tree" /> Stamm: Doppel
                </span>
                <span>
                  <i className="rule-star" /> Spitze: {starTarget}
                </span>
              </>
            ) : (
              <>
                <span>
                  <i className="rule-tree" /> Stamm: Doppel
                </span>
                <span>
                  <i className="rule-star" /> Spitze: {starTarget}
                </span>
                <span>
                  <i className="rule-fire" /> Ziel: 11 / 11
                </span>
              </>
            )}
          </div>
        </section>

        {is1vs1
          ? renderPlayerCard(2, p2Name, safeP2, p2Lit)
          : renderSoloOverviewCard()}
      </section>

      {winnerName && (
        <div className="tb-winner-overlay">
          <div className="tb-winner-card">
            <div className="tb-winner-kicker">
              Frohe Weihnachten · Lions Winter Series
            </div>
            <h2 className="tb-winner-title">Sieg für {winnerName}</h2>
            <p className="tb-winner-sub">
              {is1vs1 && winCondition === 'majority_6'
                ? `${winnerPlayer === 2 ? p2Lit : p1Lit} von ${requiredToWin} Elementen am Lions-Tannenbaum erobert.`
                : 'Der Lions-Tannenbaum erstrahlt vollständig.'}
            </p>

            <div className="tb-winner-stats">
              <div>
                <span>Runden</span>
                <b>{roundNumber}</b>
              </div>
              <div>
                <span>Darts</span>
                <b>{winnerPlayer === 2 ? safeP2.dartsThrown : p1.dartsThrown}</b>
              </div>
              <div>
                <span>Gestohlen</span>
                <b>
                  {winnerPlayer === 2
                    ? safeP2.extinguishedCount
                    : p1.extinguishedCount}
                </b>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
