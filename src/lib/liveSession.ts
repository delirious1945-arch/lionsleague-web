/**
 * Generiert eine eineindeutige Session-ID für ein Trainingsspiel auf einem Board.
 * Format: [gameType]_b[boardId]_[timestamp]_[randomSalt]
 * Beispiel: doppelquote_b1_1731492000123_8f4x2
 */
export function generateSessionId(gameType: string, boardId: string | number): string {
  const b = String(boardId || '1');
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  return `${gameType}_b${b}_${ts}_${rand}`;
}
