import { getUnifiedTvBoardDataAction } from '../src/app/training/live/actions';

async function audit() {
  console.log('Testing TV-Board Fußball Data Integration...');
  const todayData = await getUnifiedTvBoardDataAction({ timeframe: 'today' });

  if (todayData.availableArchiveDays.length === 0) {
    throw new Error('FAIL: availableArchiveDays should not be empty');
  }

  // Falls heute noch keine Spiele gespielt wurden, teste den jüngsten Archiv-Spieltag
  const targetData = todayData.hasTodayData
    ? todayData
    : await getUnifiedTvBoardDataAction({
        timeframe: 'archive',
        customDate: todayData.availableArchiveDays[0].dateStr,
      });

  const sebMatches = targetData.todayFussballMatches.filter(m => m.player1_name.includes('Sebastian'));
  if (sebMatches.length === 0) {
    throw new Error('FAIL: Sebastian Kirste matches must appear in todayFussballMatches on TV Board');
  }

  const sebLeaderboard = targetData.todayFussballLeaderboard.find(r => r.player_name.includes('Sebastian'));
  if (!sebLeaderboard) {
    throw new Error('FAIL: Sebastian Kirste must appear in todayFussballLeaderboard on TV Board');
  }

  console.log('✅ PASS: TV-Board hasTodayData =', todayData.hasTodayData);
  console.log('✅ PASS: Active Dataset Date =', targetData.selectedDateStr);
  console.log('✅ PASS: Sebastian Kirste Matches Count =', sebMatches.length);
  console.log('✅ PASS: Sebastian Kirste Leaderboard =', sebLeaderboard.player_name, `(${sebLeaderboard.wins}S / ${sebLeaderboard.losses}N, ${sebLeaderboard.goals_scored}:${sebLeaderboard.goals_conceded})`);
  console.log('🎉 Fußball TV-Board Sync Audit erfolgreich bestanden!');
}

audit().catch((err) => {
  console.error(err);
  process.exit(1);
});
