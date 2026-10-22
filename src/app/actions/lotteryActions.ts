'use server';

import {
  getActiveBannerWinner,
  getUnacknowledgedWinForPlayer,
  acknowledgeLotteryWin,
  getCurrentMonthProgressForPlayer,
  executeMonthlyLottery,
  LotteryWinner,
  PlayerMonthProgress,
  formatMonthKey,
  getPreviousMonth,
} from '@/lib/trainingLottery';
import { getSessionAction } from '@/app/actions';
import { revalidatePath } from 'next/cache';

export interface LotteryInitialData {
  bannerWinner: LotteryWinner | null;
  unacknowledgedWin: LotteryWinner | null;
  monthProgress: PlayerMonthProgress | null;
}

/**
 * Ruft alle Verlosungsdaten für die Startseite und den Trainingsmodus ab.
 */
export async function getLotteryDataAction(): Promise<LotteryInitialData> {
  try {
    const session = await getSessionAction();
    const playerName = session?.name || '';

    const bannerWinner = await getActiveBannerWinner();
    const unacknowledgedWin = playerName ? await getUnacknowledgedWinForPlayer(playerName) : null;
    const monthProgress = await getCurrentMonthProgressForPlayer(playerName);

    return {
      bannerWinner,
      unacknowledgedWin,
      monthProgress,
    };
  } catch (err) {
    console.error('Fehler in getLotteryDataAction:', err);
    return {
      bannerWinner: null,
      unacknowledgedWin: null,
      monthProgress: null,
    };
  }
}

/**
 * Bestätigt den Erhalt / das Lesen des Glückwunsch-Modals durch den Gewinner.
 */
export async function acknowledgeWinAction(lotteryId: number) {
  try {
    const res = await acknowledgeLotteryWin(lotteryId);
    revalidatePath('/');
    revalidatePath('/training');
    return res;
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export interface LotteryDrawResult {
  success: boolean;
  message?: string;
  error?: string;
  alreadyDrawn?: boolean;
  winner?: any;
}

/**
 * Manuelle Ziehung für Administratoren (z.B. für Tests oder historische Monate).
 */
export async function triggerManualLotteryDrawAction(customMonthKey?: string): Promise<LotteryDrawResult> {
  try {
    const session = await getSessionAction();
    if (session?.role !== 'admin') {
      return { success: false, error: 'Nur Administratoren dürfen die Verlosung manuell auslösen.' };
    }

    const target = customMonthKey || getPreviousMonth().monthKey;
    const res = await executeMonthlyLottery(target);
    revalidatePath('/');
    revalidatePath('/training');

    if (res.success) {
      return {
        success: true,
        message: res.message || 'Auslosung erfolgreich durchgeführt!',
        alreadyDrawn: res.alreadyDrawn,
        winner: res.winner,
      };
    } else {
      return {
        success: false,
        error: res.message || 'Kein Gewinner ermittelt.',
        message: res.message,
      };
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Ruft die Admin-Trainingsübersicht für einen bestimmten Monat ab.
 */
export async function getAdminTrainingOverviewAction(monthKey?: string) {
  try {
    const session = await getSessionAction();
    if (session?.role !== 'admin') {
      return { success: false, error: 'Zugriff verweigert (nur für Administratoren).' };
    }
    const { getAdminTrainingOverviewData } = await import('@/lib/trainingLottery');
    const data = await getAdminTrainingOverviewData(monthKey);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

