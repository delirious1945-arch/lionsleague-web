export interface Settings {
  win_weight: number;
  avg_weight: number;
  avg9_weight: number;
  avg18_weight: number;
  scores_weight: number;
}

export interface MatchPerformance {
  win_ratio: number;
  score_ratio: number;
  pts_win: number;
  pts_avg: number;
  pts_avg9: number;
  pts_avg18: number;
  pts_scores: number;
  base_rating: number;
  specials_count: number;
  specials_bonus: number;
  total_rating: number;
  weighted_win: number;
  weighted_avg: number;
  weighted_9_18: number;
  weighted_scores: number;
}

export function getPointsForAverage(value: number): number {
  if (value < 20) return 0;
  if (value < 30) return 1;
  if (value < 40) return 2;
  if (value < 45) return 3;
  if (value < 50) return 4;
  if (value < 55) return 5;
  if (value < 60) return 6;
  return 7;
}

export function getPointsForWinRatio(ratioPercent: number): number {
  if (ratioPercent <= 0) return 0;
  if (ratioPercent <= 20) return 1;
  if (ratioPercent <= 40) return 2;
  if (ratioPercent <= 60) return 3;
  if (ratioPercent <= 80) return 4;
  return 5;
}

export function getPointsForHighScores(scoreRatio: number): number {
  if (scoreRatio <= 0) return 0;
  if (scoreRatio <= 0.4) return 1;
  if (scoreRatio <= 0.8) return 2;
  if (scoreRatio <= 1.2) return 3;
  if (scoreRatio <= 1.6) return 4;
  if (scoreRatio <= 2.0) return 5;
  if (scoreRatio <= 2.4) return 6;
  if (scoreRatio <= 2.8) return 7;
  if (scoreRatio <= 3.6) return 9;
  return 10;
}

export function calculateMatchPerformance(
  match: {
    legs_won: number;
    legs_lost: number;
    avg_total: number;
    avg_9: number;
    avg_18: number;
    scores_80: number;
    scores_100: number;
    scores_140: number;
    scores_180: number;
    specials_count?: number;
  },
  settings: Settings = {
    win_weight: 20,
    avg_weight: 20,
    avg9_weight: 20,
    avg18_weight: 20,
    scores_weight: 20,
  }
): MatchPerformance {
  const legsPlayed = match.legs_won + match.legs_lost;
  const winRatio = match.legs_won > match.legs_lost ? 100.0 : 0.0;

  const totalHighScores =
    match.scores_80 + match.scores_100 + match.scores_140 + match.scores_180;
  const scoreRatio = legsPlayed > 0 ? totalHighScores / legsPlayed : 0;

  const ptsWin = getPointsForWinRatio(winRatio);
  const ptsAvg = getPointsForAverage(Number(match.avg_total) || 0);
  const ptsAvg9 = getPointsForAverage(Number(match.avg_9) || 0);
  const ptsAvg18 = getPointsForAverage(Number(match.avg_18) || 0);
  const ptsScores = getPointsForHighScores(scoreRatio);

  const specials = Number(match.specials_count) || 0;
  const specialsBonus = specials * 0.5;

  const weightedWin = ptsWin * (settings.win_weight / 100.0);
  const weightedAvg = ptsAvg * (settings.avg_weight / 100.0);
  const weightedAvg9 = ptsAvg9 * (settings.avg9_weight / 100.0);
  const weightedAvg18 = ptsAvg18 * (settings.avg18_weight / 100.0);
  const weightedScores = ptsScores * (settings.scores_weight / 100.0);

  const baseRating =
    weightedWin + weightedAvg + weightedAvg9 + weightedAvg18 + weightedScores;
  const totalRating = baseRating + specialsBonus;

  return {
    win_ratio: winRatio,
    score_ratio: Math.round(scoreRatio * 100) / 100,
    pts_win: ptsWin,
    pts_avg: ptsAvg,
    pts_avg9: ptsAvg9,
    pts_avg18: ptsAvg18,
    pts_scores: ptsScores,
    base_rating: Math.round(baseRating * 100) / 100,
    specials_count: specials,
    specials_bonus: specialsBonus,
    total_rating: Math.round(totalRating * 100) / 100,
    weighted_win: weightedWin,
    weighted_avg: weightedAvg,
    weighted_9_18: weightedAvg9 + weightedAvg18,
    weighted_scores: weightedScores,
  };
}

export function getShortName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 1) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return fullName;
}
