'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';

import { addMatchAction, addDoublesSpecialAction } from '../actions';
import { Player } from '@/lib/data';


const STAFFEL_7_OPPONENTS = [
  'Bromer Burglöwen B',
  'DC Gamsen 96 B',
  'DC Old No.7 Sülfeld D',
  'DC Wolfsjäger C',
  'Erst zart dann Dart A',
  'Riederockets MTV Vollbüttel B',
  'TSV Rethen D',
  'VfB Bullseye Fallersleben B',
  'VfL Wolfsburg e.V. F',
];

const STAFFEL_11_OPPONENTS = [
  '1.DC Didderse A',
  'Aller-Oker-Darter A',
  'Dart Kongs Triangel B',
  'FireDarter C',
  'HSV Isedarter B',
  'Mad House Fallersleben E',
  'RaZa Darts A',
  'VfL Wettmershagen B',
];

export default function EingabeClient({
  players,
  availableSeasons,
}: {
  players: Player[];
  availableSeasons: string[];
}) {
  const [activeTab, setActiveTab] = useState<'single' | 'doubles_special'>('single');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Singles Form State
  const officialPlayers = players.filter(
    (p) => p.team === 'A-Team' || p.team === 'B-Team'
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(
    officialPlayers[0]?.id || 0
  );
  const selectedPlayer =
    players.find((p) => p.id === selectedPlayerId) || officialPlayers[0];

  const opponents =
    selectedPlayer?.team === 'B-Team' ? STAFFEL_11_OPPONENTS : STAFFEL_7_OPPONENTS;

  const [season, setSeason] = useState(
    availableSeasons.length > 0 ? availableSeasons[0] : '2026/2027'
  );
  const [matchDate, setMatchDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [opponent, setOpponent] = useState(opponents[0]);
  const [legsWon, setLegsWon] = useState(3);
  const [legsLost, setLegsLost] = useState(1);
  const [avgTotal, setAvgTotal] = useState(48.5);
  const [avg9, setAvg9] = useState(52.0);
  const [avg18, setAvg18] = useState(50.0);
  const [scores80, setScores80] = useState(4);
  const [scores100, setScores100] = useState(2);
  const [scores140, setScores140] = useState(1);
  const [scores180, setScores180] = useState(0);
  const [highFinishes, setHighFinishes] = useState(0);
  const [shortLegs, setShortLegs] = useState(0);
  const [specialsCount, setSpecialsCount] = useState(0);

  // Doubles Special State
  const [dsPlayerId, setDsPlayerId] = useState<number>(officialPlayers[0]?.id || 0);
  const [dsPartnerName, setDsPartnerName] = useState('');
  const [dsOpponentTeam, setDsOpponentTeam] = useState('');
  const [dsDate, setDsDate] = useState(new Date().toISOString().split('T')[0]);
  const [dsSpecialType, setDsSpecialType] = useState('180er');
  const [dsDescription, setDsDescription] = useState('');

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    startTransition(async () => {
      setMessage(null);
      const res = await addMatchAction({
        player_id: selectedPlayer.id,
        match_date: matchDate,
        opponent,
        legs_won: legsWon,
        legs_lost: legsLost,
        avg_total: avgTotal,
        avg_9: avg9,
        avg_18: avg18,
        scores_80: scores80,
        scores_100: scores100,
        scores_140: scores140,
        scores_180: scores180,
        high_finishes: highFinishes >= 101 ? highFinishes : 0,
        short_legs: shortLegs,
        specials_count: specialsCount,
        season,
        team: selectedPlayer.team,
      });

      if (res.success) {
        setMessage({
          text: `✅ Einzel-Spielbericht für ${selectedPlayer.name} gegen ${opponent} (${legsWon}:${legsLost}) erfolgreich gespeichert!`,
          type: 'success',
        });
      } else {
        setMessage({
          text: `❌ Fehler beim Speichern: ${res.error}`,
          type: 'error',
        });
      }
    });
  };

  const handleDoublesSpecialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setMessage(null);
      const res = await addDoublesSpecialAction({
        player_id: dsPlayerId,
        partner_name: dsPartnerName,
        opponent_team: dsOpponentTeam,
        match_date: dsDate,
        special_type: dsSpecialType,
        description: dsDescription,
        season,
      });

      if (res.success) {
        setMessage({
          text: `✅ Doppel-Special erfolgreich gespeichert (+0,5 Pkt Bonus gutgeschrieben)!`,
          type: 'success',
        });
        setDsDescription('');
      } else {
        setMessage({
          text: `❌ Fehler beim Speichern: ${res.error}`,
          type: 'error',
        });
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto py-2">
      {/* Top Breadcrumb & Version 2.0 Badge */}
      <div className="flex items-center justify-between text-xs pb-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors font-semibold"
        >
          <span>←</span> Zurück zum Dashboard
        </Link>
        <span className="text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded font-mono">
          VERSION 2.0
        </span>
      </div>

      {/* Title */}
      <div className="pb-4 border-b border-white/10">

        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span>📝</span> Data Entry / Eingabemaske
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Erfassung von Einzel-Spielberichten und Doppel-Specials für die Lions League.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => {
            setActiveTab('single');
            setMessage(null);
          }}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'single'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>🎯</span> Einzel-Spielbericht erfassen
        </button>

        <button
          onClick={() => {
            setActiveTab('doubles_special');
            setMessage(null);
          }}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'doubles_special'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>🤝</span> Doppel-Special (+0,5 Pkt Bonus)
        </button>
      </div>

      {/* Notification Message */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold animate-fadeIn ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* TAB 1: Einzel-Spielbericht */}
      {activeTab === 'single' && (
        <form onSubmit={handleSingleSubmit} className="space-y-6">
          <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-6 space-y-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>👤</span> 1. Spieler & Basisdaten
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Spieler auswählen
                </label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedPlayerId(id);
                    const p = players.find((pl) => pl.id === id);
                    if (p) {
                      const opps =
                        p.team === 'B-Team' ? STAFFEL_11_OPPONENTS : STAFFEL_7_OPPONENTS;
                      setOpponent(opps[0]);
                    }
                  }}
                  className="w-full bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  {officialPlayers.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.team === 'A-Team' ? '🦁 ' : '🐯 '}
                      {p.name} ({p.team})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Saison
                </label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-400"
                >
                  {availableSeasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Spieldatum
                </label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Gegnerische Mannschaft ({selectedPlayer?.team || 'A-Team'})
              </label>
              <select
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-400"
              >
                {opponents.map((opp) => (
                  <option key={opp} value={opp}>
                    {opp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Leg-Ergebnis */}
          <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🎯</span> 2. Leg-Ergebnis (Best of 5)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Gewonnene Legs
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={legsWon}
                  onChange={(e) => setLegsWon(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-emerald-500/40 text-emerald-300 font-extrabold rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Verlorene Legs
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={legsLost}
                  onChange={(e) => setLegsLost(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-rose-500/40 text-rose-300 font-extrabold rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>
          </div>

          {/* Average-Werte */}
          <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📊</span> 3. Average-Werte
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Gesamt Average
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="150"
                  value={avgTotal}
                  onChange={(e) => setAvgTotal(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/15 text-white font-bold rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  9-Dart Average
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="150"
                  value={avg9}
                  onChange={(e) => setAvg9(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/15 text-white font-bold rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  18-Dart Average
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="150"
                  value={avg18}
                  onChange={(e) => setAvg18(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/15 text-white font-bold rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* High Scores */}
          <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🔥</span> 4. High Scores
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">80+ Scores</label>
                <input
                  type="number"
                  min="0"
                  value={scores80}
                  onChange={(e) => setScores80(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">100+ Scores</label>
                <input
                  type="number"
                  min="0"
                  value={scores100}
                  onChange={(e) => setScores100(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">140+ Scores</label>
                <input
                  type="number"
                  min="0"
                  value={scores140}
                  onChange={(e) => setScores140(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">180er</label>
                <input
                  type="number"
                  min="0"
                  value={scores180}
                  onChange={(e) => setScores180(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-cyan-500/50 text-cyan-300 font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Highlights & Specials */}
          <div className="bg-[#0b1428] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>⭐</span> 5. Highlights & Specials
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Höchstes Finish (≥ 101)
                </label>
                <input
                  type="number"
                  min="0"
                  max="170"
                  value={highFinishes}
                  onChange={(e) => setHighFinishes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Short Legs (≤ 18 Darts)
                </label>
                <input
                  type="number"
                  min="0"
                  value={shortLegs}
                  onChange={(e) => setShortLegs(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Specials Anz. (+0,5 Pkt Bonus)
                </label>
                <input
                  type="number"
                  min="0"
                  value={specialsCount}
                  onChange={(e) => setSpecialsCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-amber-500/40 text-amber-300 font-bold rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 disabled:opacity-50 text-slate-950 font-black py-4 rounded-xl text-base transition-all shadow-xl shadow-cyan-500/25 cursor-pointer"
          >
            {isPending ? 'Speichere Spielbericht...' : '🚀 Spielbericht Speichern'}
          </button>
        </form>
      )}

      {/* TAB 2: Doppel-Special */}
      {activeTab === 'doubles_special' && (
        <form onSubmit={handleDoublesSpecialSubmit} className="space-y-6">
          <div className="bg-[#0b1428] border border-amber-500/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🤝</span> Doppel-Special eintragen
            </h2>
            <p className="text-slate-400 text-sm">
              Für jedes im Doppel geworfene Special (180er, High Finish ab 101, Short Leg ≤ 18 Darts, Bull-Finish) erhält der werfende Spieler +0,5 Punkte gutgeschrieben.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Spieler (Werfer des Specials)
                </label>
                <select
                  value={dsPlayerId}
                  onChange={(e) => setDsPlayerId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                >
                  {officialPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.team === 'A-Team' ? '🦁 ' : '🐯 '}
                      {p.name} ({p.team})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Teampartner Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Martin Thomas"
                  value={dsPartnerName}
                  onChange={(e) => setDsPartnerName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Gegnerische Mannschaft
                </label>
                <input
                  type="text"
                  required
                  placeholder="z.B. DC Wolfsjäger C"
                  value={dsOpponentTeam}
                  onChange={(e) => setDsOpponentTeam(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={dsDate}
                  onChange={(e) => setDsDate(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Special Type
                </label>
                <select
                  value={dsSpecialType}
                  onChange={(e) => setDsSpecialType(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 text-amber-300 font-bold rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="180er">180er</option>
                  <option value="High Finish">High Finish (101-170)</option>
                  <option value="Short Leg">Short Leg (≤ 18 Darts)</option>
                  <option value="Bull-Finish">Bull-Finish</option>
                  <option value="High Score (141-177)">High Score (141-177)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Anmerkungen / Details
                </label>
                <input
                  type="text"
                  placeholder="z.B. 120er Finish via T20, 20, D20"
                  value={dsDescription}
                  onChange={(e) => setDsDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black py-4 rounded-xl text-base transition-all shadow-xl shadow-amber-500/25 cursor-pointer"
          >
            {isPending ? 'Speichere Doppel-Special...' : '🚀 Doppel-Special Speichern (+0,5 Pkt Bonus)'}
          </button>
        </form>
      )}
    </div>
  );
}
