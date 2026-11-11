import { getUnifiedTvBoardDataAction } from '../src/app/training/live/actions';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

async function main() {
  const data = await getUnifiedTvBoardDataAction({ timeframe: 'today' });
  console.log('Generating HTML snapshot with real DB data...');

  const html = `<!DOCTYPE html>
<html lang="de" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920, initial-scale=1.0">
  <title>Vereinsheim-TV • Gesamtübersicht (4 Spiele)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brandGold: '#F59E0B',
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@700;800;900&display=swap');
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at 50% 0%, #151c2e 0%, #060913 70%, #020408 100%);
      color: #f8fafc;
      margin: 0;
      padding: 0;
      overflow: hidden;
      width: 1920px;
      height: 1080px;
      box-sizing: border-box;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .pulse-live {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.9); }
    }
  </style>
</head>
<body class="p-4 flex flex-col justify-between">

  <!-- TOP BAR / HEADER -->
  <header class="flex items-center justify-between gap-4 bg-slate-900/80 border border-white/10 rounded-2xl px-5 py-3 backdrop-blur-xl shadow-2xl shrink-0">
    <!-- Links: Vereins-Logo & Live TV Badge -->
    <div class="flex items-center gap-3.5">
      <div class="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-lg">
        🦁
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs uppercase font-black tracking-widest text-amber-400">LIONS WEYHAUSEN</span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[10px] font-black text-red-400">
            <span class="w-2 h-2 rounded-full bg-red-500 pulse-live"></span>
            LIVE VEREINSHEIM-TV
          </span>
        </div>
        <h1 class="text-lg font-black text-white tracking-tight">Trainings-Zentrale • TV Live-Board</h1>
      </div>
    </div>

    <!-- Mitte: Navigation mit neuer Gesamtübersicht (4 Spiele) aktiv -->
    <div class="flex items-center bg-black/50 border border-white/15 p-1 rounded-2xl gap-1 shadow-inner">
      <div class="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center gap-1.5">
        <span>🏆</span>
        <span>Gesamtübersicht (4 Spiele)</span>
      </div>
      <div class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 flex items-center gap-1.5">
        <span>🎯 Checkout Battle</span>
      </div>
      <div class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 flex items-center gap-1.5">
        <span>🏆 PDC Challenge</span>
      </div>
      <div class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 flex items-center gap-1.5">
        <span>⚽ Fußball</span>
      </div>
      <div class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 flex items-center gap-1.5">
        <span>🎲 Stellen & Checken</span>
      </div>
      <div class="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-1.5">
        <span>📅 Archiv</span>
      </div>
    </div>

    <!-- Rechts: Status-Kompakt & Zeit -->
    <div class="flex items-center gap-4">
      <div class="text-right text-[11px] text-slate-400">
        <div class="text-white font-mono font-bold">${data.todayDoppelLeaderboard.length} Doppel • ${data.todayPdcLeaderboard.length} PDC • ${data.todayFussballMatches.length} Fußball • ${data.todayStellenCheckenLeaderboard.length} St. & Ch.</div>
        <div class="text-slate-500">Heutiger Trainingstag • Live aktualisiert</div>
      </div>
      <div class="px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 font-mono font-black text-amber-300 text-sm">
        ${data.lastUpdate || '14:15:00'} Uhr
      </div>
    </div>
  </header>

  <!-- 4-QUADRANTEN GESAMTÜBERSICHT (2x2 GRID) -->
  <main class="grid grid-cols-2 gap-4 flex-1 my-3 overflow-hidden">

    <!-- 1. OBEN LINKS: CHECKOUT BATTLE (DOPPELQUOTE) -->
    <section class="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] p-4 flex flex-col justify-between shadow-xl overflow-hidden">
      <div>
        <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.07]">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-lg">
              🎯
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-black text-white">Checkout Battle</h2>
                <span class="text-[10px] px-2 py-0.2 rounded-full bg-amber-400/[0.08] text-amber-300 font-bold border border-amber-400/20">
                  Doppelquote
                </span>
              </div>
              <p class="text-[10px] text-slate-400">10 Runden à 3 Darts (D20, D10, D16, D8, D4)</p>
            </div>
          </div>
          <span class="px-2 py-1 rounded-lg bg-white/[0.04] text-amber-300 border border-white/10 text-[10px] font-bold">
            Details →
          </span>
        </div>

        ${data.todayDoppelLeaderboard.length === 0 ? `
          <div class="h-44 flex flex-col items-center justify-center text-center p-4 bg-white/[0.01] rounded-2xl border border-dashed border-white/[0.08]">
            <div class="text-2xl mb-1">🎯</div>
            <div class="text-xs font-bold text-slate-300">Noch keine Checkout-Spiele heute</div>
            <p class="text-[10px] text-slate-500 mt-0.5">Sobald ein Spieler wirft, erscheint die Wertung hier live.</p>
          </div>
        ` : `
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-white/[0.07] text-slate-400 text-[10px] uppercase font-mono">
                <th class="py-1.5 px-2 text-center w-10">Pl.</th>
                <th class="py-1.5 px-2">Spieler</th>
                <th class="py-1.5 px-2 text-center">Treffer</th>
                <th class="py-1.5 px-2 text-right">Doppelquote</th>
                <th class="py-1.5 px-2 text-right">Bestes</th>
                <th class="py-1.5 px-2 text-right text-slate-500">Zeit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              ${data.todayDoppelLeaderboard.slice(0, 4).map(r => `
                <tr class="hover:bg-white/[0.03]">
                  <td class="py-2 px-2 text-center font-bold text-amber-300">#${r.rank}</td>
                  <td class="py-2 px-2 font-black text-white">${r.player_name}</td>
                  <td class="py-2 px-2 text-center font-mono text-slate-300">${r.total_hits}/${r.total_darts}</td>
                  <td class="py-2 px-2 text-right font-mono font-black text-amber-300">${r.quote_percent.toFixed(1)}%</td>
                  <td class="py-2 px-2 text-right text-amber-200 text-[11px]">${r.best_double}</td>
                  <td class="py-2 px-2 text-right text-slate-500 text-[10px] font-mono">${r.time_label || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
      <div class="text-[10px] text-slate-500 pt-2 border-t border-white/[0.05] flex justify-between">
        <span>Wertung: BBDV-Offiziell</span>
        <span>Top-Doppel des Tages</span>
      </div>
    </section>

    <!-- 2. OBEN RECHTS: PDC CHALLENGE (57 DARTS) -->
    <section class="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] p-4 flex flex-col justify-between shadow-xl overflow-hidden">
      <div>
        <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.07]">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-lg">
              🏆
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-black text-white">PDC Challenge</h2>
                <span class="text-[10px] px-2 py-0.2 rounded-full bg-amber-400/[0.08] text-amber-300 font-bold border border-amber-400/20">
                  57 Darts
                </span>
              </div>
              <p class="text-[10px] text-slate-400">Shanghai 10–15, Doppel D1–D20 + Bull, Shanghai 15–20</p>
            </div>
          </div>
          <span class="px-2 py-1 rounded-lg bg-white/[0.04] text-amber-300 border border-white/10 text-[10px] font-bold">
            Details →
          </span>
        </div>

        ${data.todayPdcLeaderboard.length === 0 ? `
          <div class="h-44 flex flex-col items-center justify-center text-center p-4 bg-white/[0.01] rounded-2xl border border-dashed border-white/[0.08]">
            <div class="text-2xl mb-1">🏆</div>
            <div class="text-xs font-bold text-slate-300">Noch keine PDC-Challenges heute</div>
            <p class="text-[10px] text-slate-500 mt-0.5">Sobald ein Spieler die Challenge absolviert, erscheint sie hier.</p>
          </div>
        ` : `
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-white/[0.07] text-slate-400 text-[10px] uppercase font-mono">
                <th class="py-1.5 px-2 text-center w-10">Pl.</th>
                <th class="py-1.5 px-2">Spieler</th>
                <th class="py-1.5 px-2 text-right">Punkte</th>
                <th class="py-1.5 px-2 text-center">Abzeichen</th>
                <th class="py-1.5 px-2 text-center">Shanghai</th>
                <th class="py-1.5 px-2 text-right text-slate-500">Zeit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              ${data.todayPdcLeaderboard.slice(0, 4).map(r => `
                <tr class="hover:bg-white/[0.03]">
                  <td class="py-2 px-2 text-center font-bold text-amber-300">#${r.rank}</td>
                  <td class="py-2 px-2 font-black text-white">${r.player_name}</td>
                  <td class="py-2 px-2 text-right font-mono font-black text-amber-300 text-sm">${r.best_score}</td>
                  <td class="py-2 px-2 text-center">
                    <span class="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      ${r.best_badge}
                    </span>
                  </td>
                  <td class="py-2 px-2 text-center font-mono text-amber-200">${r.total_shanghais}</td>
                  <td class="py-2 px-2 text-right text-slate-500 text-[10px] font-mono">${r.time_label || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
      <div class="text-[10px] text-slate-500 pt-2 border-t border-white/[0.05] flex justify-between">
        <span>Highscore-Fokus (Max 1475)</span>
        <span>Gold ab 550 • Silber ab 400</span>
      </div>
    </section>

    <!-- 3. UNTEN LINKS: FUßBALL DARTS (MATCHBOARD & DUELLE) -->
    <section class="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] p-4 flex flex-col justify-between shadow-xl overflow-hidden">
      <div>
        <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.07]">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-lg">
              ⚽
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-black text-white">Fußball Darts</h2>
                <span class="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/25">
                  1vs1 & vs. Computer
                </span>
              </div>
              <p class="text-[10px] text-slate-400">Balleroberung auf Bull & Tore über Doppel • Wertung ab 5 Toren</p>
            </div>
          </div>
          <span class="px-2 py-1 rounded-lg bg-white/[0.04] text-amber-300 border border-white/10 text-[10px] font-bold">
            Details →
          </span>
        </div>

        ${data.todayFussballLeaderboard.length === 0 ? `
          <div class="h-44 flex flex-col items-center justify-center text-center p-4 bg-white/[0.01] rounded-2xl border border-dashed border-white/[0.08]">
            <div class="text-2xl mb-1">⚽</div>
            <div class="text-xs font-bold text-slate-300">Noch keine Fußball-Matches heute</div>
            <p class="text-[10px] text-slate-500 mt-0.5">Spiele ab 5 Toren erscheinen hier live.</p>
          </div>
        ` : `
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-white/[0.07] text-slate-400 text-[10px] uppercase font-mono">
                <th class="py-1.5 px-2 text-center w-10">Pl.</th>
                <th class="py-1.5 px-2">Spieler</th>
                <th class="py-1.5 px-2 text-center">Spiele</th>
                <th class="py-1.5 px-2 text-center">Tore</th>
                <th class="py-1.5 px-2 text-right">Siegquote</th>
                <th class="py-1.5 px-2 text-right text-slate-500">Zeit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              ${data.todayFussballLeaderboard.slice(0, 3).map(r => `
                <tr class="hover:bg-white/[0.03]">
                  <td class="py-2 px-2 text-center font-bold text-amber-300">#${r.rank}</td>
                  <td class="py-2 px-2 font-black text-white">${r.player_name}</td>
                  <td class="py-2 px-2 text-center font-mono text-slate-300">${r.matches_count} <span class="text-[10px] text-slate-500">(${r.wins}S/${r.losses}N)</span></td>
                  <td class="py-2 px-2 text-center font-mono font-bold text-slate-200">${r.goals_scored}:${r.goals_conceded}</td>
                  <td class="py-2 px-2 text-right font-mono font-black text-amber-300">${r.win_rate.toFixed(1)}%</td>
                  <td class="py-2 px-2 text-right text-slate-500 text-[10px] font-mono">${r.last_time || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Match Ticker -->
          <div class="mt-2.5 pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-2">
            ${data.todayFussballMatches.slice(0, 2).map(m => `
              <div class="p-2 bg-slate-950/70 border border-white/5 rounded-xl flex items-center justify-between text-[11px]">
                <div class="truncate pr-1">
                  <div class="font-bold text-white truncate">${m.player1_name} <span class="text-slate-500 font-normal">vs.</span> ${m.player2_name}</div>
                  <div class="text-[9px] text-slate-500 font-mono">${m.time_label} • ${m.darts_thrown} Darts ${m.is_computer ? '• <span class="text-cyan-300">vs. Computer</span>' : ''}</div>
                </div>
                <div class="px-2 py-0.5 rounded bg-black/60 border border-white/10 font-mono font-black text-amber-300 shrink-0">
                  ${m.player1_goals}:${m.player2_goals}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
      <div class="text-[10px] text-slate-500 pt-2 border-t border-white/[0.05] flex justify-between">
        <span>Inkl. 1vsComputer ab 5 Ziel-Toren</span>
        <span>Lostopf-Sync: +1 Spiel je Match</span>
      </div>
    </section>

    <!-- 4. UNTEN RECHTS: STELLEN & CHECKEN (3–101 PUNKTEJAGD) -->
    <section class="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.09] p-4 flex flex-col justify-between shadow-xl overflow-hidden">
      <div>
        <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.07]">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-amber-400/[0.08] border border-amber-400/25 flex items-center justify-center text-lg">
              🎲
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-black text-white">Stellen & Checken</h2>
                <span class="text-[10px] px-2 py-0.2 rounded-full bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/25">
                  3–101 Finish
                </span>
              </div>
              <p class="text-[10px] text-slate-400">15 Runden Finish-Jagd • +1 (3–60), +2 (61–80), +3 (81–101)</p>
            </div>
          </div>
          <span class="px-2 py-1 rounded-lg bg-white/[0.04] text-amber-300 border border-white/10 text-[10px] font-bold">
            Details →
          </span>
        </div>

        ${(!data.todayStellenCheckenLeaderboard || data.todayStellenCheckenLeaderboard.length === 0) ? `
          <div class="h-44 flex flex-col items-center justify-center text-center p-4 bg-white/[0.01] rounded-2xl border border-dashed border-white/[0.08]">
            <div class="text-2xl mb-1">🎲</div>
            <div class="text-xs font-bold text-slate-300">Noch keine Stellen & Checken Runden heute</div>
            <p class="text-[10px] text-slate-500 mt-0.5">Starte am Board eine 15-Runden-Sequenz.</p>
          </div>
        ` : `
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-white/[0.07] text-slate-400 text-[10px] uppercase font-mono">
                <th class="py-1.5 px-2 text-center w-10">Pl.</th>
                <th class="py-1.5 px-2">Spieler</th>
                <th class="py-1.5 px-2 text-center">Sequenz</th>
                <th class="py-1.5 px-2 text-right">Punkte</th>
                <th class="py-1.5 px-2 text-right">Checks (15 R.)</th>
                <th class="py-1.5 px-2 text-right text-slate-500">Zeit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              ${data.todayStellenCheckenLeaderboard.slice(0, 4).map(r => `
                <tr class="hover:bg-white/[0.03]">
                  <td class="py-2 px-2 text-center font-bold text-amber-300">#${r.rank}</td>
                  <td class="py-2 px-2 font-black text-white">${r.player_name}</td>
                  <td class="py-2 px-2 text-center font-mono text-amber-200 text-[11px]">#${String(r.preset_id).padStart(3, '0')}</td>
                  <td class="py-2 px-2 text-right font-mono font-black text-amber-300 text-sm">${r.points_scored} <span class="text-[10px] text-slate-400 font-normal">/ ${r.max_possible_points}</span></td>
                  <td class="py-2 px-2 text-right font-mono text-slate-300">${r.checks_count}/${r.total_rounds} (${r.quote_percent.toFixed(0)}%)</td>
                  <td class="py-2 px-2 text-right text-slate-500 text-[10px] font-mono">${r.time_label || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
      <div class="text-[10px] text-slate-500 pt-2 border-t border-white/[0.05] flex justify-between">
        <span>Sequenz-Modus 3–101</span>
        <span>Max. 28 Punkte je Durchgang</span>
      </div>
    </section>

  </main>

  <!-- FOOTER STATUSBAR -->
  <footer class="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 border border-white/5 rounded-xl px-4 py-2 shrink-0">
    <div class="flex items-center gap-3">
      <span class="flex items-center gap-1.5 text-emerald-400 font-bold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 pulse-live"></span>
        TV-Board synchronisiert
      </span>
      <span>•</span>
      <span>BBDV-Trainingszentrum Lions Weyhausen</span>
    </div>
    <div class="font-mono text-slate-400">
      4-Quadrant Layout • 1920x1080 Full HD
    </div>
  </footer>

</body>
</html>`;

  const previewPath = path.join(process.cwd(), 'public', 'tv_board_screenshot_view.html');
  fs.writeFileSync(previewPath, html, 'utf8');
  console.log('Saved preview HTML to:', previewPath);

  const artifactDir = 'C:\\Users\\sebas\\.gemini\\antigravity\\brain\\be951aa0-3cf0-4451-a459-2809e8bc97f4';
  const outPngPath = path.join(artifactDir, 'vereinsheim_tv_gesamtuebersicht_4spiele.png');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const fileUrl = 'file:///' + previewPath.replace(/\\/g, '/');
  const cmd = `"${chromePath}" --headless=new --disable-gpu --screenshot="${outPngPath}" --window-size=1920,1080 --hide-scrollbars "${fileUrl}"`;
  
  console.log('Running Chrome headless to capture 1920x1080 screenshot...');
  execSync(cmd);
  console.log('Screenshot captured successfully to:', outPngPath);
}

main().catch(console.error);
