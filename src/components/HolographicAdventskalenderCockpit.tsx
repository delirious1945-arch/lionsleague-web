'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
  AdventsCurseType,
  AdventsDartEvent,
  AdventsDoorState,
  AdventsLastActionBanner,
  AdventsPlayerState,
  countOpenDoors,
  getDoorTargetLabel,
} from '@/app/special/adventskalender/types';
import './HolographicAdventskalenderCockpit.css';

export interface HolographicAdventskalenderProps {
  boardId: string;
  p1Name: string;
  p2Name?: string;
  activeName: string;
  is1vs1: boolean;
  activePlayer: 1 | 2;
  roundNumber: number;
  maxRounds: number | null;
  isSuddenDeath: boolean;
  doors: AdventsDoorState[];
  p1: AdventsPlayerState;
  p2?: AdventsPlayerState;
  lastAction?: AdventsLastActionBanner | null;
  winnerPlayer?: 1 | 2 | 'draw' | null;
  winnerName?: string | null;
  currentTime?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const CURSE_META: Record<
  AdventsCurseType,
  { icon: string; title: string; short: string; text: string; isIce?: boolean }
> = {
  one_dart: {
    icon: '🎯',
    title: 'Einarmiger Bandit',
    short: 'Nur 1 Dart',
    text: 'Nur ein Dart – danach endet die Aufnahme.',
  },
  two_darts: {
    icon: '❄️',
    title: 'Schneesturm',
    short: 'Nur 2 Darts',
    text: 'Nur zwei Darts – Dart 3 ist eingefroren.',
    isIce: true,
  },
  sitting: {
    icon: '🪑',
    title: 'Opa Hoppenstedt',
    short: 'Im Sitzen',
    text: 'Diese Aufnahme wird im Sitzen geworfen.',
  },
  skip_round: {
    icon: '⛄',
    title: 'Eingeschneit',
    short: 'Aussetzen',
    text: 'Diese Aufnahme muss vollständig ausgesetzt werden.',
    isIce: true,
  },
  spin_360: {
    icon: '🌪️',
    title: 'Glühwein-Drehwurm',
    short: '360° Drehung',
    text: 'Vor jedem Dart einmal um 360° drehen.',
  },
  wrong_hand: {
    icon: '🧦',
    title: 'Falsche Hand',
    short: 'Falsche Hand',
    text: 'Wirf diese Aufnahme mit deiner schwachen Hand.',
  },
};

function splitPlayerName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Spieler';
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

function getSlotToneClass(ev: AdventsDartEvent): string {
  if (ev.tone === 'jackpot') return 'tone-jackpot';
  if (ev.tone === 'good') return 'tone-good';
  if (ev.tone === 'social') return 'tone-social';
  if (ev.tone === 'curse') return 'tone-curse';
  if (ev.tone === 'grinch') return 'tone-grinch';
  if (ev.tone === 'niete') return 'tone-niete';
  return 'tone-miss';
}

function CurrentTurnRow({
  darts,
  isActive,
  activeCurses = [],
}: {
  darts: AdventsDartEvent[];
  isActive: boolean;
  activeCurses?: AdventsCurseType[];
}) {
  if (activeCurses.includes('skip_round')) {
    return (
      <div className="ak-skip-box">
        <strong>⛄ Schneewehe · Runde aussetzen</strong>
        <span>0 Darts · Eingeschneit!</span>
      </div>
    );
  }

  const hasOneDartCurse = activeCurses.includes('one_dart');
  const hasTwoDartsCurse = activeCurses.includes('two_darts');

  return (
    <div className="dart-slots">
      {[0, 1, 2].map((idx) => {
        if ((hasOneDartCurse && idx >= 1) || (hasTwoDartsCurse && idx === 2)) {
          return (
            <div key={idx} className="dart-slot locked">
              <span>Dart {idx + 1}</span>
              <b>{hasOneDartCurse ? '🎯 Gesperrt' : '❄ Gefroren'}</b>
              <small>Fluch aktiv</small>
            </div>
          );
        }

        const ev = darts[idx];
        if (ev) {
          return (
            <div key={idx} className={`dart-slot filled ${getSlotToneClass(ev)}`}>
              <span>Dart {idx + 1}</span>
              <b>{ev.label}</b>
              <small>{ev.subLabel}</small>
            </div>
          );
        }

        const isCurrent = isActive && idx === darts.length;
        return (
          <div key={idx} className={`dart-slot ${isCurrent ? 'current' : ''}`}>
            <span>Dart {idx + 1}</span>
            <b>{isCurrent ? 'Bereit' : '—'}</b>
            <small>{isCurrent ? 'Nächster Wurf' : '—'}</small>
          </div>
        );
      })}
    </div>
  );
}

export default function HolographicAdventskalenderCockpit({
  boardId,
  p1Name,
  p2Name = 'Gastspieler',
  activeName,
  is1vs1,
  activePlayer,
  roundNumber,
  maxRounds,
  isSuddenDeath,
  doors,
  p1,
  p2,
  lastAction,
  winnerPlayer,
  winnerName,
  currentTime,
  isFullscreen = false,
  onToggleFullscreen,
}: HolographicAdventskalenderProps) {
  const [fallbackTime, setFallbackTime] = useState<string>('');

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
  const openCount = countOpenDoors(doors);
  const totalDoors = doors.length || 24;
  const missing24 = [4, 6, 20].filter(
    (n) => !doors.find((d) => d.number === n)?.isOpen
  );

  const activeState = is1vs1 && activePlayer === 2 ? safeP2 : p1;
  const activePlayerCurses = !winnerPlayer ? activeState.activeCurses || [] : [];
  const leadCurse = activePlayerCurses[0] ? CURSE_META[activePlayerCurses[0]] : null;

  const renderPlayerCard = (
    playerNum: 1 | 2,
    name: string,
    state: AdventsPlayerState
  ) => {
    const isAct = !winnerPlayer && activePlayer === playerNum;
    const isWinner = winnerPlayer === playerNum;
    const { firstName, lastName } = splitPlayerName(name);
    const activeCurses = state.activeCurses || [];
    const pendingCurses = state.pendingCurses || [];
    const shields = state.shieldsCount ?? 0;

    return (
      <aside
        className={`score-card p${playerNum} ${isAct ? 'active' : ''} ${
          isWinner ? 'winner' : ''
        }`}
      >
        <div className="score-card-top">
          <span>{is1vs1 ? `Spieler ${playerNum}` : 'Solo-Modus'}</span>
          <b>{isWinner ? 'Sieger' : isAct ? 'Am Wurf' : 'Wartet'}</b>
        </div>

        <h2>{firstName}</h2>
        {lastName && <div className="score-card-lastname">{lastName}</div>}

        <div className="ak-score-section">
          <span className="ak-score-label">Punkte</span>
          <strong className="big-score">{state.score}</strong>

          <div className="player-stats">
            <span>
              <b>{state.doorsOpened}</b>
              Türchen
            </span>
            <span>
              <b>🛡 {shields}</b>
              Schilde
            </span>
            {state.multiplier && state.multiplier > 1 ? (
              <span className="multiplier">
                <b>×2</b>
                bereit
              </span>
            ) : (
              <span>
                <b>{state.dartsThrown}</b>
                Darts
              </span>
            )}
          </div>

          {(shields > 0 || activeCurses.length > 0 || pendingCurses.length > 0) && (
            <div className="ak-curses-stack">
              {shields > 0 && (
                <div className="mini-curse is-shield">
                  🛡️ Schutzschild ×{shields}
                </div>
              )}
              {activeCurses.map((curse) => {
                const meta = CURSE_META[curse];
                if (!meta) return null;
                return (
                  <div
                    key={`act-${curse}`}
                    className={`mini-curse ${meta.isIce ? 'is-ice' : ''}`}
                  >
                    {meta.icon} Aktiv: {meta.title}
                  </div>
                );
              })}
              {pendingCurses.length > 0 && (
                <div className="mini-curse is-pending">
                  ⏳ Nächste Aufn.:{' '}
                  {pendingCurses
                    .map((c) => {
                      const meta = CURSE_META[c];
                      return meta ? `${meta.icon} ${meta.short}` : c;
                    })
                    .join(' + ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ak-card-throws">
          <span className="ak-throws-label">Aktuelle Aufnahme</span>
          <CurrentTurnRow
            darts={state.currentTurnDarts || []}
            isActive={isAct}
            activeCurses={activeCurses}
          />
        </div>
      </aside>
    );
  };

  return (
    <main
      className="ak-hall-root forced-dark"
      style={
        {
          '--hall-image': "url('/images/adventskalender-hall.png')",
        } as React.CSSProperties
      }
    >
      <header className="app-header">
        <div className="event-brand">
          <span>DFA</span>
          <b>Darts Fun Arena</b>
        </div>

        <div className="game-title">
          <small>Board {boardId}</small>
          <strong>Der verflixte Adventskalender</strong>
        </div>

        <div className="header-actions">
          <span
            className={`header-round-pill ${isSuddenDeath ? 'is-sudden-death' : ''}`}
          >
            {isSuddenDeath
              ? '🔥 Sudden Death'
              : maxRounds
              ? `Runde ${roundNumber}/${maxRounds}`
              : `Runde ${roundNumber}`}
          </span>
          <span>
            {openCount} / {totalDoors} offen
          </span>
          <span>{displayTime}</span>
          {onToggleFullscreen && (
            <button
              type="button"
              className="fullscreen-btn"
              onClick={onToggleFullscreen}
              aria-label="Vollbild umschalten"
            >
              {isFullscreen ? <Minimize2 /> : <Maximize2 />}
            </button>
          )}
        </div>
      </header>

      <div className={`tv-stage ${!is1vs1 ? 'is-solo' : ''}`}>
        {renderPlayerCard(1, is1vs1 ? p1Name : activeName || p1Name, p1)}

        <section className="tv-calendar" aria-label="Adventskalender-Brett">
          <div className="tv-title">
            <small>
              {isSuddenDeath
                ? 'Sudden Death'
                : maxRounds
                ? `Runde ${roundNumber} von ${maxRounds}`
                : `Runde ${roundNumber}`}
            </small>
            <h1>
              Der verflixte
              <br />
              <em>Adventskalender</em>
            </h1>
          </div>

          {leadCurse && (
            <div className={`tv-curse ${leadCurse.isIce ? 'is-ice' : ''}`}>
              <span>{leadCurse.icon}</span>
              <b>{leadCurse.title}</b>
              <small>{leadCurse.text}</small>
            </div>
          )}

          <div className="tv-cabinet">
            <div className="door-grid">
              {doors.map((door) => {
                const target = getDoorTargetLabel(door.number);
                const isHighlighted = lastAction?.doorNumber === door.number;
                const isLockedDoor =
                  door.number === 24 && !door.isOpen && missing24.length > 0;
                const ownerClass =
                  door.isOpen && is1vs1 && door.openedBy
                    ? `p${door.openedBy}`
                    : door.isOpen && !is1vs1
                    ? 'p1'
                    : '';

                return (
                  <div
                    key={door.number}
                    className={`game-door tv-door ${
                      door.isOpen ? `opened tone-${door.reward.tone} ${ownerClass}` : ''
                    } ${target.isSpecial ? 'is-special' : ''} ${
                      isLockedDoor ? 'locked-door' : ''
                    } ${isHighlighted ? 'is-highlighted' : ''}`}
                    aria-label={
                      door.isOpen
                        ? `Tür ${door.number}: ${door.reward.title}`
                        : isLockedDoor
                        ? `Tür ${door.number} gesperrt bis Tür ${missing24.join(', ')} offen`
                        : `Tür ${door.number}, Ziel ${target.label}`
                    }
                  >
                    <span className="door-content">
                      {door.isOpen ? (
                        <>
                          <i>{door.reward.icon}</i>
                          <b>{door.reward.shortBadge}</b>
                          {is1vs1 && door.openedBy && <small>P{door.openedBy}</small>}
                          <span className="door-num-tag">#{door.number}</span>
                        </>
                      ) : (
                        <>
                          <b>{door.number}</b>
                          <small>{target.isSpecial ? target.label : target.subLabel}</small>
                        </>
                      )}
                    </span>

                    <span className="wood-door">
                      <b>{door.number}</b>
                      <small>{target.isSpecial ? target.label : target.subLabel}</small>
                      <i />
                      {isLockedDoor ? (
                        <span className="lock-pill">🔒 Erst {missing24.join('·')}</span>
                      ) : (
                        Array.isArray(door.partialHits) &&
                        door.partialHits.length > 0 && (
                          <span className="combo-dots">
                            {(door.number === 6 ? ['6', 'BULL'] : ['20', '4', 'BULL']).map(
                              (key) => (
                                <em
                                  key={key}
                                  className={door.partialHits?.includes(key) ? 'done' : ''}
                                />
                              )
                            )}
                          </span>
                        )
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`tv-throws ${lastAction ? `tone-${lastAction.tone}` : ''}`}>
            {lastAction ? (
              <>
                <span>{lastAction.icon}</span>
                {lastAction.doorNumber && (
                  <span className="tv-door-badge">Tür #{lastAction.doorNumber}</span>
                )}
                <strong>{lastAction.headline}</strong>
                <span>· {lastAction.subline}</span>
              </>
            ) : (
              <span>
                🚪 24-Türchen Kalender bereit — Wirf 1–20, Doppel (21), Triple (22) oder
                Bull (23/24)
              </span>
            )}
          </div>
        </section>

        {is1vs1 && renderPlayerCard(2, p2Name, safeP2)}
      </div>

      {winnerPlayer && (
        <div className="winner-banner">
          <div className="winner-card">
            <small>Der verflixte Adventskalender</small>
            <strong className="winner-name">
              {winnerPlayer === 'draw'
                ? '🤝 Unentschieden!'
                : `♛ ${winnerName || activeName}`}
            </strong>
            <p className="winner-sub">
              {winnerPlayer === 'draw'
                ? 'Gleichstand nach allen gespielten Runden'
                : 'gewinnt den verflixten Adventskalender'}
            </p>

            {is1vs1 ? (
              <div className="winner-stats cols-2">
                <div className="winner-stat-box is-p1">
                  <span>{p1Name}</span>
                  <b>{p1.score} Pkt</b>
                  <small>{p1.doorsOpened} Türchen</small>
                </div>
                <div className="winner-stat-box is-p2">
                  <span>{p2Name}</span>
                  <b>{safeP2.score} Pkt</b>
                  <small>{safeP2.doorsOpened} Türchen</small>
                </div>
              </div>
            ) : (
              <div className="winner-stats cols-3">
                <div className="winner-stat-box is-p1">
                  <span>Punkte</span>
                  <b>{p1.score}</b>
                </div>
                <div className="winner-stat-box">
                  <span>Türchen</span>
                  <b>
                    {openCount}/{totalDoors}
                  </b>
                </div>
                <div className="winner-stat-box">
                  <span>Runden</span>
                  <b>{roundNumber}</b>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
