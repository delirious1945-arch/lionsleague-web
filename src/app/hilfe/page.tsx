import React from 'react';

export default function HilfePage() {
  return (
    <div className="space-y-8 animate-fadeIn py-2 max-w-5xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span>❓</span> Hilfe & Erklärungen zum Ranking
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Das Punkte- und Wertungssystem der Lions League verständlich erklärt.
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
    </div>
  );
}
