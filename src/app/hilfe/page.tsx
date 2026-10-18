import React from 'react';
import Link from 'next/link';
import { getSessionAction } from '@/app/actions';


export const dynamic = 'force-dynamic';

export default async function HilfePage() {
  const session = await getSessionAction();
  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fadeIn py-2 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Version 2.0 Badge */}
      <div className="flex items-center justify-between text-xs pb-1">
        <div className="flex items-center gap-2">
          <Link
            href="/?mode=ranking"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-cyan-400 bg-slate-900/80 hover:bg-slate-800 border border-white/10 px-3 py-1.5 rounded-xl transition-all font-bold text-xs shadow-sm"
          >
            <span>←</span> Zurück zum Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-semibold px-2 py-1 transition-colors"
          >
            <span>🔄</span> Hauptmenü
          </Link>
        </div>
        <span className="text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded font-mono">
          VERSION 2.0
        </span>
      </div>

      {/* Title */}
      <div className="pb-4 border-b border-white/10">

        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span>❓</span> Hilfe & Erklärungen zum Ranking
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Das Punkte- und Wertungssystem von Lions Weyhausen verständlich erklärt.
        </p>
      </div>

      {/* Card 1: Wie berechnen sich die Punkte */}
      <div className="bg-[#0b1428] border border-cyan-500/30 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
        <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
          <span>🎯</span> Wie berechnen sich die Punkte?
        </h2>
        <p className="text-slate-300 text-base leading-relaxed">
          Jeder Spieler sammelt Punkte durch seine Leistung in Einzel-Matches sowie Bonuspunkte für Specials.
          Die Berechnung basiert auf 5 gewichteten Kategorien plus einem Special-Bonus:
        </p>
        <ul className="space-y-3 text-slate-200 text-sm md:text-base pl-2">
          <li className="flex items-start gap-2.5">
            <span className="text-cyan-400 font-bold">•</span>
            <span>
              <strong className="text-white">Siegquote (Gewichtung 50%):</strong> Sieg im Best-of-5 Match = 5 Punkte gewichtet.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-cyan-400 font-bold">•</span>
            <span>
              <strong className="text-white">Gesamt-Average (Gewichtung 20%):</strong> Punkte nach gestaffeltem Average-Schlüssel.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-cyan-400 font-bold">•</span>
            <span>
              <strong className="text-white">9-Dart Average (Gewichtung 7,5%):</strong> Belohnt starke Starts in jedes Leg.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-cyan-400 font-bold">•</span>
            <span>
              <strong className="text-white">18-Dart Average (Gewichtung 7,5%):</strong> Belohnt Konstanz im mittleren Legverlauf.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-cyan-400 font-bold">•</span>
            <span>
              <strong className="text-white">Hohe Scores (Gewichtung 15%):</strong> Punkte für die Anzahl hoher Scores (80+, 100+, 140+, 180er) pro Leg.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-amber-400 font-bold">•</span>
            <span>
              <strong className="text-amber-300">Specials (Einzel & Doppel): +0,5 Pkt Bonus</strong> für jeden geworfenen Special: 180er, High Finishes (101–170), Short Games (≤ 18 Darts), Bull-Finishes und High Scores ab 141 Punkten (141–177).
            </span>
          </li>
        </ul>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3.5 text-xs text-slate-300">
          ⚠️ Die Gewichtungen können vom Admin unter <strong>Optionen</strong> jederzeit angepasst werden. Das Ranking aktualisiert sich automatisch.
        </div>
      </div>

      {/* Grid: Average Table & High Score Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Average Table */}
        <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
            <span>📊</span> Average-Punkte-Tabelle
          </h3>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-cyan-500/20 text-cyan-300 text-xs font-bold border-b border-cyan-500/30">
                  <th className="p-3">Average-Bereich</th>
                  <th className="p-3 text-center">Punkte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr className="hover:bg-white/5"><td className="p-2.5">Unter 20</td><td className="p-2.5 text-center text-slate-500">0 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">20 – 29,9</td><td className="p-2.5 text-center font-bold">1 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">30 – 39,9</td><td className="p-2.5 text-center font-bold">2 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">40 – 44,9</td><td className="p-2.5 text-center font-bold">3 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">45 – 49,9</td><td className="p-2.5 text-center font-bold">4 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">50 – 54,9</td><td className="p-2.5 text-center font-bold text-cyan-300">5 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">55 – 59,9</td><td className="p-2.5 text-center font-bold text-cyan-300">6 Pkt</td></tr>
                <tr className="hover:bg-white/5 bg-cyan-500/5"><td className="p-2.5 font-bold text-cyan-400">60 und höher</td><td className="p-2.5 text-center font-black text-cyan-400">7 Pkt</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* High Score Table */}
        <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
            <span>📈</span> High-Score-Punkte (Scores/Leg)
          </h3>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-cyan-500/20 text-cyan-300 text-xs font-bold border-b border-cyan-500/30">
                  <th className="p-3">Scores/Leg-Verhältnis</th>
                  <th className="p-3 text-center">Punkte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr className="hover:bg-white/5"><td className="p-2.5">0 Scores</td><td className="p-2.5 text-center text-slate-500">0 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">0,01 – 0,40</td><td className="p-2.5 text-center font-bold">1 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">0,41 – 0,80</td><td className="p-2.5 text-center font-bold">2 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">0,81 – 1,20</td><td className="p-2.5 text-center font-bold">3 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">1,21 – 1,60</td><td className="p-2.5 text-center font-bold">4 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">1,61 – 2,00</td><td className="p-2.5 text-center font-bold">5 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">2,01 – 2,40</td><td className="p-2.5 text-center font-bold">6 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">2,41 – 2,80</td><td className="p-2.5 text-center font-bold">7 Pkt</td></tr>
                <tr className="hover:bg-white/5"><td className="p-2.5">2,81 – 3,60</td><td className="p-2.5 text-center font-bold text-cyan-300">9 Pkt</td></tr>
                <tr className="hover:bg-white/5 bg-cyan-500/5"><td className="p-2.5 font-bold text-cyan-400">Über 3,60</td><td className="p-2.5 text-center font-black text-cyan-400">10 Pkt</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Was zählt als hoher Score */}
      <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900 border-l-4 border-cyan-400 rounded-xl p-5 text-sm text-slate-200 space-y-1.5">
        <h4 className="text-base font-bold text-cyan-300">🎯 Was zählt als hoher Score (80+)?</h4>
        <p>• <strong>80+:</strong> 80 bis 99 Punkte</p>
        <p>• <strong>100+:</strong> 100 bis 139 Punkte</p>
        <p>• <strong>140+:</strong> 140 bis 177 Punkte <em>(*178 und 179 Punkte können mit 3 Darts nicht geworfen werden; 177 = T20 + T20 + T19 ist das Maximum vor der 180)</em></p>
        <p>• <strong>180:</strong> Das Maximum (3× Triple 20)</p>
      </div>

      {/* Card 3: Vollständiges Rechenbeispiel (1:1 aus der Original-Hilfe) */}
      <div className="bg-[#0b1428] border border-amber-500/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
            Praxis-Leitfaden
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-amber-300 flex items-center gap-2">
            <span>🔢</span> Rechenbeispiel: Martin Thomas (Spieltag 22.08.2026)
          </h2>
          <p className="text-slate-300 text-sm md:text-base mt-2">
            An diesem Spieltag hat Martin Thomas zwei Einzel gegen <strong>HSV Isedarter B</strong> bestritten und am Ende ein Rating von <strong className="text-cyan-400">4,62 Punkten</strong> erzielt. So wurde dieser Wert Schritt für Schritt berechnet:
          </p>
        </div>

        {/* Grundprinzip */}
        <div className="bg-cyan-500/10 border-l-4 border-cyan-400 rounded-xl p-4 text-sm md:text-base text-slate-200 space-y-1">
          <h4 className="font-bold text-cyan-300">⚡ Grundprinzip der Gewichtung</h4>
          <p className="text-xs md:text-sm text-slate-300">
            Jede Kategorie erzielt eine Rohpunktzahl (je nach Leistung). Diese wird mit ihrer Gewichtung multipliziert, um den Beitrag am Gesamtrating zu ermitteln:
          </p>
          <div className="font-mono text-cyan-300 font-bold text-xs md:text-sm pt-1">
            Gewichtete Punkte = Erreichte Rohpunkte × (Gewichtung in % / 100)
          </div>
        </div>

        {/* Einzel 1 */}
        <div className="space-y-3">
          <h4 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
            <span>🎯</span> Einzel 1: Sieg 3:0 gegen HSV Isedarter B
          </h4>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-cyan-500/20 text-cyan-300 text-xs font-bold border-b border-cyan-500/30">
                  <th className="p-3">Kategorie</th>
                  <th className="p-3 text-center">Rohwert</th>
                  <th className="p-3 text-center">Punkte (Tabelle)</th>
                  <th className="p-3 text-center">Gewichtung</th>
                  <th className="p-3 text-center">Rechnung</th>
                  <th className="p-3 text-right">Teilergebnis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Siegquote</td>
                  <td className="p-3 text-center">Sieg 3:0 = 100%</td>
                  <td className="p-3 text-center font-bold text-cyan-300">5</td>
                  <td className="p-3 text-center">50%</td>
                  <td className="p-3 text-center text-xs font-mono">5 × 0,50</td>
                  <td className="p-3 text-right font-bold text-cyan-400">2,50 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Gesamt Avg</td>
                  <td className="p-3 text-center">44,2</td>
                  <td className="p-3 text-center font-bold text-cyan-300">3</td>
                  <td className="p-3 text-center">20%</td>
                  <td className="p-3 text-center text-xs font-mono">3 × 0,20</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,60 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">9-Dart Avg</td>
                  <td className="p-3 text-center">49,8</td>
                  <td className="p-3 text-center font-bold text-cyan-300">4</td>
                  <td className="p-3 text-center">7,5%</td>
                  <td className="p-3 text-center text-xs font-mono">4 × 0,075</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,30 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">18-Dart Avg</td>
                  <td className="p-3 text-center">57,1</td>
                  <td className="p-3 text-center font-bold text-cyan-300">6</td>
                  <td className="p-3 text-center">7,5%</td>
                  <td className="p-3 text-center text-xs font-mono">6 × 0,075</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,45 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Hohe Scores</td>
                  <td className="p-3 text-center">6 Scores / 3 Legs = 2,00</td>
                  <td className="p-3 text-center font-bold text-cyan-300">5</td>
                  <td className="p-3 text-center">15%</td>
                  <td className="p-3 text-center text-xs font-mono">5 × 0,15</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,75 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Specials</td>
                  <td className="p-3 text-center">0 Specials</td>
                  <td className="p-3 text-center text-slate-500">–</td>
                  <td className="p-3 text-center text-xs">+0,5 Bonus/Stk</td>
                  <td className="p-3 text-center text-xs font-mono">0 × 0,5</td>
                  <td className="p-3 text-right text-slate-500 font-semibold">0,00 Pkt</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-cyan-500/15 border border-cyan-400/40 rounded-xl p-3.5 text-sm font-bold text-white flex items-center justify-between">
            <span>🏆 Rating Einzel 1: 2,50 + 0,60 + 0,30 + 0,45 + 0,75 + 0,00</span>
            <span className="text-cyan-300 text-base font-black font-mono">= 4,60 Punkte</span>
          </div>
        </div>

        {/* Einzel 2 */}
        <div className="space-y-3">
          <h4 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
            <span>🎯</span> Einzel 2: Sieg 3:1 gegen HSV Isedarter B
          </h4>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-cyan-500/20 text-cyan-300 text-xs font-bold border-b border-cyan-500/30">
                  <th className="p-3">Kategorie</th>
                  <th className="p-3 text-center">Rohwert</th>
                  <th className="p-3 text-center">Punkte (Tabelle)</th>
                  <th className="p-3 text-center">Gewichtung</th>
                  <th className="p-3 text-center">Rechnung</th>
                  <th className="p-3 text-right">Teilergebnis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Siegquote</td>
                  <td className="p-3 text-center">Sieg 3:1 = 100%</td>
                  <td className="p-3 text-center font-bold text-cyan-300">5</td>
                  <td className="p-3 text-center">50%</td>
                  <td className="p-3 text-center text-xs font-mono">5 × 0,50</td>
                  <td className="p-3 text-right font-bold text-cyan-400">2,50 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Gesamt Avg</td>
                  <td className="p-3 text-center">46,1</td>
                  <td className="p-3 text-center font-bold text-cyan-300">4</td>
                  <td className="p-3 text-center">20%</td>
                  <td className="p-3 text-center text-xs font-mono">4 × 0,20</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,80 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">9-Dart Avg</td>
                  <td className="p-3 text-center">52,5</td>
                  <td className="p-3 text-center font-bold text-cyan-300">5</td>
                  <td className="p-3 text-center">7,5%</td>
                  <td className="p-3 text-center text-xs font-mono">5 × 0,075</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,375 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">18-Dart Avg</td>
                  <td className="p-3 text-center">53,6</td>
                  <td className="p-3 text-center font-bold text-cyan-300">5</td>
                  <td className="p-3 text-center">7,5%</td>
                  <td className="p-3 text-center text-xs font-mono">5 × 0,075</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,375 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Hohe Scores</td>
                  <td className="p-3 text-center">6 Scores / 4 Legs = 1,50</td>
                  <td className="p-3 text-center font-bold text-cyan-300">4</td>
                  <td className="p-3 text-center">15%</td>
                  <td className="p-3 text-center text-xs font-mono">4 × 0,15</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,60 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Specials</td>
                  <td className="p-3 text-center">0 Specials</td>
                  <td className="p-3 text-center text-slate-500">–</td>
                  <td className="p-3 text-center text-xs">+0,5 Bonus/Stk</td>
                  <td className="p-3 text-center text-xs font-mono">0 × 0,5</td>
                  <td className="p-3 text-right text-slate-500 font-semibold">0,00 Pkt</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-cyan-500/15 border border-cyan-400/40 rounded-xl p-3.5 text-sm font-bold text-white flex items-center justify-between">
            <span>🏆 Rating Einzel 2: 2,50 + 0,80 + 0,375 + 0,375 + 0,60 + 0,00</span>
            <span className="text-cyan-300 text-base font-black font-mono">= 4,65 Punkte</span>
          </div>
        </div>

        {/* Gesamtrating */}
        <div className="bg-gradient-to-r from-amber-500/15 to-amber-600/10 border-2 border-amber-400/50 rounded-2xl p-5 text-center space-y-2">
          <h4 className="text-lg font-extrabold text-amber-300">📊 Gesamtrating in der Rangliste</h4>
          <p className="text-sm text-slate-300">
            Da Martin Thomas an diesem Spieltag 2 Einzel gespielt hat, bildet das System den <strong>Durchschnitt beider Match-Ratings</strong>:
          </p>
          <div className="text-xl md:text-2xl font-black text-white font-mono tracking-wide pt-1">
            Gesamtrating = (4,60 + 4,65) ÷ 2 = <span className="text-cyan-300">4,625 ≈ 4,62 Punkte</span>
          </div>
        </div>

        {/* Detail-Blick: 0,68 Scores */}
        <div className="space-y-3 pt-2">
          <h4 className="text-base md:text-lg font-bold text-amber-300 flex items-center gap-2">
            <span>🔍</span> Detail-Blick: Wie kommt der Wert „0,68“ in der Spalte „Scores (15%)“ zustande?
          </h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            Ein häufiges Missverständnis: In der Spalte <strong>Scores (15%)</strong> der Ranglisten-Matrix steht <em>nicht</em> die Anzahl der geworfenen High-Scores (Martin hat insgesamt 12 geworfen), sondern der <strong>gewichtete Beitrag zum Gesamtrating</strong>:
          </p>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-amber-500/20 text-amber-300 text-xs font-bold border-b border-amber-500/30">
                  <th className="p-3">Match</th>
                  <th className="p-3 text-center">Geworfene Scores</th>
                  <th className="p-3 text-center">Gespielte Legs</th>
                  <th className="p-3 text-center">Quote (Scores / Leg)</th>
                  <th className="p-3 text-center">Tabellenpunkte</th>
                  <th className="p-3 text-right">Gewichtet (15%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Einzel 1 (3:0)</td>
                  <td className="p-3 text-center">6 Scores (80+)</td>
                  <td className="p-3 text-center">3 Legs</td>
                  <td className="p-3 text-center font-mono">6 ÷ 3 = <strong>2,00</strong></td>
                  <td className="p-3 text-center font-bold text-cyan-300">5 Pkt</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,75 Pkt</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">Einzel 2 (3:1)</td>
                  <td className="p-3 text-center">6 Scores (80+)</td>
                  <td className="p-3 text-center">4 Legs</td>
                  <td className="p-3 text-center font-mono">6 ÷ 4 = <strong>1,50</strong></td>
                  <td className="p-3 text-center font-bold text-cyan-300">4 Pkt</td>
                  <td className="p-3 text-right font-bold text-cyan-400">0,60 Pkt</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-cyan-500/10 border-l-4 border-cyan-400 rounded-xl p-4 text-xs md:text-sm text-slate-200 space-y-1">
            <div className="font-bold text-cyan-300">Mittelwert für die Ranglisten-Matrix:</div>
            <div>
              (0,75 Pkt + 0,60 Pkt) ÷ 2 = <strong className="text-cyan-300 font-mono text-base">0,675 ≈ 0,68 Punkte</strong>
            </div>
            <div className="text-slate-400 text-xs pt-1">
              Da in dieser Kategorie maximal 1,50 Punkte möglich sind (10 Tabellenpunkte × 15%), entspricht 0,68 Punkten einer Ausbeute von <strong>45,3 % des theoretischen Maximums</strong>.
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 text-xs md:text-sm text-slate-300 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>🎯</span> Wo sehe ich die echten Wurfzahlen und Durchschnitte?
            </div>
            <p className="text-slate-400">
              Auf der Seite <strong>Spieler</strong> gibt es in der Profil-Kachelreihe die Kennzahl <strong className="text-cyan-300">Ø Scores / Leg</strong>: Dort steht für Martin Thomas genau der sportliche Durchschnittswert: <strong className="text-cyan-300">1,71</strong> (12 Scores in 7 Legs) mit dem Zusatz <em>12 Scores (80+)</em>.
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 text-xs text-slate-400">
            💡 <strong>Warum diese Methode?</strong> Da alle 5 Gewichtungen zusammen exakt 100% ergeben, bleibt das Basis-Rating automatisch im Bereich von 0 bis ca. 7 Punkten. Der Sieg macht mit 50% genau die Hälfte des Gewichts aus. Specials bringen je +0,5 Bonuspunkte obendrauf.
          </div>
        </div>
      </div>
    </div>
  );
}
