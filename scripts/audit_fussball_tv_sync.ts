import { getUnifiedTvBoardDataAction } from '../src/app/training/live/actions';

async function audit() {
  console.log('Testing TV-Board Fußball Data Integration...');
  const todayData = await getUnifiedTvBoardDataAction({ timeframe: 'today' });

  if (!todayData.hasTodayData) {
    throw new Error('FAIL: hasTodayData should be true because sessions exist today');
  }

  const sebMatches = todayData.todayFussballMatches.filter(m => m.player1_name.includes('Sebastian'));
  if (sebMatches.length === 0) {
    throw new Error('FAIL: Sebastian Kirste matches must appear in todayFussballMatches on TV Board');
  }

  const sebLeaderboard = todayData.todayFussballLeaderboard.find(r => r.player_name.includes('Sebastian'));
  if (!sebLeaderboard) {
    throw new Error('FAIL: Sebastian Kirste must appear in todayFussballLeaderboard on TV Board');
  }

  console.log('✅ PASS: TV-Board hasTodayData =', todayData.hasTodayData);
  console.log('✅ PASS: Sebastian Kirste Matches Count =', sebMatches.length);
  console.log('✅ PASS: Sebastian Kirste Leaderboard =', sebLeaderboard.player_name, `(${sebLeaderboard.wins}S / ${sebLeaderboard.losses}N, ${sebLeaderboard.goals_scored}:${sebLeaderboard.goals_conceded})`);
  console.log('🎉 Fußball TV-Board Sync Audit erfolgreich bestanden!');
}

audit().catch((err) => {
  console.error(err);
  process.exit(1);
});
