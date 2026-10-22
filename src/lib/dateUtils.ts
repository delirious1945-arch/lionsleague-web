/**
 * Hilfsfunktionen für Zeitstempel und Schutz vor fehlerhaften Geräte-Uhren.
 */

/**
 * Stellt sicher, dass ein Trainings-Zeitstempel valide und synchron mit der Server-Zeit ist.
 * Falls ein Endgerät (z. B. Tablet vor Ort) eine falsche Systemzeit hat (Abweichung > 30 Minuten),
 * wird automatisch der verlässliche, sekundengenaue Server-Zeitstempel verwendet.
 */
export function sanitizeTrainingDate(clientDate?: string | null): string {
  const now = new Date();
  if (!clientDate) {
    return now.toISOString();
  }

  const clientTime = new Date(clientDate).getTime();
  if (isNaN(clientTime)) {
    return now.toISOString();
  }

  // Toleranz: Maximal 30 Minuten Abweichung zwischen Endgerät und Server
  const diffMs = Math.abs(now.getTime() - clientTime);
  const maxDiffMs = 30 * 60 * 1000; // 30 Minuten

  if (diffMs > maxDiffMs) {
    console.warn(
      `[Timestamp Guard] Abweichung erkannt! Client-Zeit: "${clientDate}", Server-Zeit: "${now.toISOString()}" (Differenz: ${Math.round(diffMs / 60000)} Min). Verwende verlässliche Server-Zeit.`
    );
    return now.toISOString();
  }

  return clientDate;
}
