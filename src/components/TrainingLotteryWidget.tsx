'use client';

import React, { useState } from 'react';
import { Trophy, Beer, Sparkles, CheckCircle2, PartyPopper, X, Gift } from 'lucide-react';
import { LotteryWinner } from '@/lib/trainingLottery';
import { acknowledgeWinAction } from '@/app/actions/lotteryActions';

interface TrainingLotteryWidgetProps {
  bannerWinner: LotteryWinner | null;
  unacknowledgedWin: LotteryWinner | null;
  currentUser?: string;
}

export default function TrainingLotteryWidget({
  bannerWinner,
  unacknowledgedWin,
  currentUser,
}: TrainingLotteryWidgetProps) {
  const [modalOpen, setModalOpen] = useState<boolean>(!!unacknowledgedWin);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAcknowledge = async () => {
    if (!unacknowledgedWin) {
      setModalOpen(false);
      return;
    }
    setIsSubmitting(true);
    try {
      await acknowledgeWinAction(unacknowledgedWin.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
      setModalOpen(false);
    }
  };

  return (
    <>
      {/* 1. STARTSEITEN-BANNER (NUR AN TAG 1-3 DES MONATS BZW. WÄHREND DES 3-TAGE-FENSTERS) */}
      {bannerWinner && (
        <div
          data-ui-id="HOME.LOTTERY.BANNER"
          className="relative overflow-hidden w-full rounded-2xl sm:rounded-3xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-950/70 via-zinc-950 to-amber-950/70 p-4 sm:p-5 shadow-2xl text-white animate-fadeIn"
        >
          {/* Dekorative Hintergrund-Leuchteffekte */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Linke Seite: Icon + Titel + Text */}
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30 font-black">
                <Trophy className="w-6 h-6 sm:w-7 sm:h-7 animate-bounce" />
                <span className="absolute -bottom-1 -right-1 text-sm">🍻</span>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Monatsverlosung • 5 Freigetränke 🍻
                  </span>
                  <span className="text-[11px] text-zinc-400 font-semibold">
                    Auslosung für {bannerWinner.month_label}
                  </span>
                </div>

                <h3 className="text-base sm:text-xl font-black text-white leading-tight">
                  Herzlichen Glückwunsch an{' '}
                  <span className="text-amber-400 underline decoration-amber-400/60 underline-offset-2">
                    {bannerWinner.player_name}
                  </span>
                  ! 🏆
                </h3>

                <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl">
                  Mit <strong className="text-amber-300">{bannerWinner.completed_games} vollständig absolvierten Spielen</strong> im {bannerWinner.month_label} im Lostopf gezogen. Prost auf deinen Trainingsfleiß!
                </p>
              </div>
            </div>

            {/* Rechte Seite: Info-Badges */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 border-t md:border-t-0 border-zinc-800 pt-2 md:pt-0 shrink-0">
              <span className="text-[11px] font-bold text-amber-400 bg-zinc-900/90 px-3 py-1 rounded-xl border border-amber-500/30 shadow-inner">
                {bannerWinner.total_eligible_players} Spieler im Lostopf
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                4 Monate Gewinnersperre aktiv
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. PERSÖNLICHES GLÜCKWUNSCH-MODAL (WENN DER EINGELOGGTE SPIELER DER GEWINNER IST) */}
      {modalOpen && unacknowledgedWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div
            data-ui-id="HOME.LOTTERY.WINNER_MODAL"
            className="relative w-full max-w-lg bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6"
          >
            {/* Schließen-Kreuz oben rechts */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 transition-all cursor-pointer"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Pokal & Drinks Animation */}
            <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 flex items-center justify-center shadow-2xl shadow-amber-500/50">
              <Trophy className="w-12 h-12" />
              <div className="absolute -top-2 -right-2 text-3xl">🎉</div>
              <div className="absolute -bottom-2 -left-2 text-3xl">🍻</div>
            </div>

            {/* Glückwunsch-Texte */}
            <div className="space-y-2">
              <span className="text-xs uppercase font-black tracking-widest text-amber-400">
                Lions Trainings-Monatsverlosung
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Glückwunsch, {unacknowledgedWin.player_name}!
              </h2>
              <p className="text-zinc-300 text-sm max-w-md mx-auto">
                Du hast im vergangenen Monat (<strong className="text-white">{unacknowledgedWin.month_label}</strong>) sagenhafte{' '}
                <strong className="text-amber-400 font-mono">{unacknowledgedWin.completed_games} Trainingsspiele</strong> vollständig abgeschlossen!
              </p>
            </div>

            {/* Der Gewinn */}
            <div className="bg-amber-500/10 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-inner">
              <div className="text-xs uppercase font-black tracking-wider text-amber-400 flex items-center justify-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-400" />
                <span>Dein Gewinn</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white drop-shadow">
                5 Freigetränke 🍻
              </div>
              <p className="text-xs text-zinc-400">
                Zeige diese Bestätigung einfach an der Theke im Clubheim vor, um deine Freigetränke einzulösen.
              </p>
            </div>

            {/* Bestätigen-Button */}
            <div className="pt-2">
              <button
                onClick={handleAcknowledge}
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Wird gespeichert...' : 'Vielen Dank! Ich löse meine Freigetränke ein'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
