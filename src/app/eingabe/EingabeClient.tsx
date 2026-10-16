'use client';

import React, { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import {
  addMatchAction,
  addDoublesMatchAction,
  addDoublesSpecialAction,
  importSpieltagAction,
  scanSpieltageDirectoryAction,
  batchImportSpieltageAction,
} from '../actions';
import { Player } from '@/lib/data';
import type {
  ScannedSpieltagItem,
  BatchImportSummary,
} from '@/lib/importSpieltag';

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
  defaultRootDir = 'C:\\Users\\sebas\\Documents\\Lions Weyhausen\\02_Liga\\Dart_Match_Image_Analyzer\\output\\spieltage',
  initialScannedSpieltage = [],
}: {
  players: Player[];
  availableSeasons: string[];
  defaultRootDir?: string;
  initialScannedSpieltage?: ScannedSpieltagItem[];
}) {
  const [activeTab, setActiveTab] = useState<
    'csv_import' | 'single' | 'doubles_match' | 'doubles_special'
  >('csv_import');

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const officialPlayers = players.filter(
    (p) => p.team === 'A-Team' || p.team === 'B-Team'
  );

  // Saison-Auswahl
  const [season, setSeason] = useState(
    availableSeasons.length > 0 ? availableSeasons[0] : '2026/2027'
  );

  // -------------------------------------------------------------
  // TAB 1: ORDNER-SCAN & BATCH-IMPORT STATE
  // -------------------------------------------------------------
  const [rootDir, setRootDir] = useState<string>(defaultRootDir);
  const [scannedList, setScannedList] = useState<ScannedSpieltagItem[]>(
    initialScannedSpieltage
  );
  const [selectedSlugs, setSelectedSlugs] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      for (const sp of initialScannedSpieltage) {
        init[sp.dir_path] = sp.is_new_candidate;
      }
      return init;
    }
  );
  const [syncBatch, setSyncBatch] = useState<boolean>(true);
  const [batchResult, setBatchResult] = useState<BatchImportSummary | null>(
    null
  );

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const handleScanDirectory = async (customSeason?: string) => {
    const targetSeason = customSeason || season;
    setIsScanning(true);
    setMessage(null);
    setBatchResult(null);
    try {
      const resp = await fetch('/api/spieltage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan',
          rootDir,
          season: targetSeason,
        }),
      });
      const res = await resp.json();
      if (res.success) {
        setScannedList(res.items);
        const nextSel: Record<string, boolean> = {};
        for (const sp of res.items) {
          nextSel[sp.dir_path] = sp.is_new_candidate;
        }
        setSelectedSlugs(nextSel);
        setMessage({
          text: `🔍 Hauptordner erfolgreich gescannt: ${res.items.length} Spieltags-Ordner gefunden.`,
          type: 'success',
        });
      } else {
        setMessage({
          text: `Fehler beim Scannen des Hauptordners: ${res.error}`,
          type: 'error',
        });
      }
    } catch (err: any) {
      setMessage({
        text: `Netzwerkfehler beim Scannen: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelectSpieltag = (dirPath: string) => {
    setSelectedSlugs((prev) => ({
      ...prev,
      [dirPath]: !prev[dirPath],
    }));
  };

  const selectAllSpieltage = () => {
    const next: Record<string, boolean> = {};
    for (const sp of scannedList) {
      next[sp.dir_path] = true;
    }
    setSelectedSlugs(next);
    setMessage(null);
  };

  const selectOnlyNewSpieltage = () => {
    const next: Record<string, boolean> = {};
    for (const sp of scannedList) {
      next[sp.dir_path] = sp.is_new_candidate;
    }
    setSelectedSlugs(next);
  };

  const deselectAllSpieltage = () => {
    setSelectedSlugs({});
  };

  const selectedSpieltageForImport = scannedList.filter(
    (sp) => !!selectedSlugs[sp.dir_path]
  );

  const handleBatchImport = async () => {
    if (selectedSpieltageForImport.length === 0) {
      setMessage({
        text: `⚠️ Es ist aktuell kein Spieltag angehakt (0 von ${scannedList.length} ausgewählt). Da alle Spieltage bereits den Status „⚪ VORHANDEN“ haben, setze bitte zuerst links einen Haken ☑️ bei den Spieltagen, die du erneut importieren möchtest (oder klicke auf „☑️ Alle auswählen“).`,
        type: 'error',
      });
      return;
    }

    setIsImporting(true);
    setMessage(null);
    setBatchResult(null);

    try {
      const resp = await fetch('/api/spieltage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_import',
          selectedSpieltage: selectedSpieltageForImport.map((sp) => ({
            dir_path: sp.dir_path,
            slug: sp.slug,
            team_display: sp.team_display,
            opp_display: sp.opp_display,
          })),
          season,
          syncLeague: syncBatch,
          rootDir,
        }),
      });
      const res = await resp.json();

      if (res.success && res.summary) {
        setBatchResult(res.summary);
        setMessage({
          text: `✅ Batch-Import abgeschlossen: ${res.summary.imported_spieltage} Spieltag(e) erfolgreich verarbeitet (${res.summary.total_created} Spiele neu angelegt, ${res.summary.total_updated} aktualisiert/ersetzt).`,
          type: 'success',
        });

        if (res.items) {
          setScannedList(res.items);
          const nextSel: Record<string, boolean> = {};
          for (const sp of res.items) {
            nextSel[sp.dir_path] = sp.is_new_candidate;
          }
          setSelectedSlugs(nextSel);
        }
      } else {
        setMessage({
          text: `❌ Fehler beim Batch-Import: ${res.error || 'Unbekannter Fehler'}`,
          type: 'error',
        });
      }
    } catch (err: any) {
      setMessage({
        text: `❌ Netzwerkfehler beim Batch-Import: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Alternative: Manuelles Drag & Drop einzelner CSV-Dateien
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{
    matchesText?: string;
    legsText?: string;
    visitsText?: string;
    statsText?: string;
    infoObj?: any;
    fileNames: string[];
    matchesCount: number;
    detectedDate?: string;
    detectedOpponent?: string;
    detectedTeam?: string;
  }>({
    fileNames: [],
    matchesCount: 0,
  });
  const [syncLeagueCsv, setSyncLeagueCsv] = useState(true);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setMessage(null);

    const names: string[] = [];
    let matchesText = '';
    let legsText = '';
    let visitsText = '';
    let statsText = '';
    let infoObj: any = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      names.push(file.name);
      const text = await file.text();
      const fnLower = file.name.toLowerCase();

      if (fnLower.endsWith('.json') || fnLower.includes('spieltag_info')) {
        try {
          infoObj = JSON.parse(text);
        } catch (e) {}
      } else if (fnLower.endsWith('matches.csv') || fnLower.includes('matches')) {
        matchesText = text;
      } else if (fnLower.endsWith('legs.csv') || fnLower.includes('legs')) {
        legsText = text;
      } else if (fnLower.endsWith('visits.csv') || fnLower.includes('visits')) {
        visitsText = text;
      } else if (
        fnLower.endsWith('statistics.csv') ||
        fnLower.endsWith('stats.csv') ||
        fnLower.includes('statistic')
      ) {
        statsText = text;
      }
    }

    let matchesCount = 0;
    let detectedDate = infoObj?.date;
    let detectedOpponent = infoObj?.opponent;
    let detectedTeam = infoObj?.team;

    if (matchesText) {
      const lines = matchesText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      matchesCount = Math.max(0, lines.length - 1);

      if (!detectedDate && lines.length > 1) {
        const firstRow = lines[1];
        const dateMatch = firstRow.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
        if (dateMatch) {
          detectedDate = dateMatch[0];
        }
      }
    }

    if (!detectedTeam) {
      for (const n of names) {
        if (n.includes('Lions-B') || n.includes('Lions B') || n.includes('Lions_B')) {
          detectedTeam = 'B-Team';
          break;
        } else if (n.includes('Lions-A') || n.includes('Lions A') || n.includes('Lions_A')) {
          detectedTeam = 'A-Team';
          break;
        }
      }
    }

    setUploadedFiles({
      matchesText,
      legsText,
      visitsText,
      statsText,
      infoObj,
      fileNames: names,
      matchesCount,
      detectedDate,
      detectedOpponent,
      detectedTeam,
    });
  };

  const handleImportSpieltag = () => {
    if (!uploadedFiles.matchesText) {
      setMessage({
        text: 'Bitte wähle mindestens die "matches.csv" Datei aus dem Spieltag aus.',
        type: 'error',
      });
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const res = await importSpieltagAction({
        season,
        spieltagInfo: uploadedFiles.infoObj,
        matchesCsvText: uploadedFiles.matchesText!,
        legsCsvText: uploadedFiles.legsText,
        visitsCsvText: uploadedFiles.visitsText,
        statisticsCsvText: uploadedFiles.statsText,
        syncLeague: syncLeagueCsv,
      });

      if (res.success) {
        setMessage({ text: res.message, type: 'success' });
        setUploadedFiles({ fileNames: [], matchesCount: 0 });
        if (fileInputRef.current) fileInputRef.current.value = '';
        const scanRes = await scanSpieltageDirectoryAction(rootDir, season);
        if (scanRes.success) {
          setScannedList(scanRes.items);
        }
      } else {
        setMessage({
          text: `Fehler beim Import: ${res.error || res.message}`,
          type: 'error',
        });
      }
    });
  };

  // -------------------------------------------------------------
  // TAB 2: SINGLES FORM STATE
  // -------------------------------------------------------------
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(
    officialPlayers[0]?.id || 0
  );
  const selectedPlayer =
    players.find((p) => p.id === selectedPlayerId) || officialPlayers[0];

  const opponents =
    selectedPlayer?.team === 'B-Team'
      ? STAFFEL_11_OPPONENTS
      : STAFFEL_7_OPPONENTS;

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
        high_finishes: highFinishes,
        short_legs: shortLegs,
        specials_count: specialsCount,
        season,
        team: selectedPlayer.team,
      });

      if (res.success) {
        setMessage({
          text: `✅ Einzel-Spielbericht für ${selectedPlayer.name} gegen ${opponent} erfolgreich gespeichert!`,
          type: 'success',
        });
      } else {
        setMessage({ text: `❌ Fehler: ${res.error}`, type: 'error' });
      }
    });
  };

  // -------------------------------------------------------------
  // TAB 3: DOUBLES MATCH FORM STATE
  // -------------------------------------------------------------
  const [dmP1Id, setDmP1Id] = useState<number>(officialPlayers[0]?.id || 0);
  const [dmP2Id, setDmP2Id] = useState<number>(
    officialPlayers[1]?.id || officialPlayers[0]?.id || 0
  );
  const dmP1 = players.find((p) => p.id === dmP1Id);
  const dmOpponents =
    dmP1?.team === 'B-Team' ? STAFFEL_11_OPPONENTS : STAFFEL_7_OPPONENTS;

  const [dmDate, setDmDate] = useState(new Date().toISOString().split('T')[0]);
  const [dmOpponent, setDmOpponent] = useState(dmOpponents[0]);
  const [dmLegsWon, setDmLegsWon] = useState(3);
  const [dmLegsLost, setDmLegsLost] = useState(1);
  const [dmAvgTotal, setDmAvgTotal] = useState(44.0);
  const [dmAvg9, setDmAvg9] = useState(46.0);
  const [dmAvg18, setDmAvg18] = useState(45.0);
  const [dmScores80, setDmScores80] = useState(3);
  const [dmScores100, setDmScores100] = useState(1);
  const [dmScores140, setDmScores140] = useState(0);
  const [dmScores180, setDmScores180] = useState(0);
  const [dmHighFinishes, setDmHighFinishes] = useState(0);
  const [dmShortLegs, setDmShortLegs] = useState(0);
  const [dmSpecialsCount, setDmSpecialsCount] = useState(0);

  const handleDoublesMatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dmP1Id === dmP2Id) {
      setMessage({
        text: '⚠️ Bitte wähle zwei unterschiedliche Spieler für das Doppel aus.',
        type: 'error',
      });
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const res = await addDoublesMatchAction({
        player1_id: dmP1Id,
        player2_id: dmP2Id,
        match_date: dmDate,
        opponent: dmOpponent,
        legs_won: dmLegsWon,
        legs_lost: dmLegsLost,
        avg_total: dmAvgTotal,
        avg_9: dmAvg9,
        avg_18: dmAvg18,
        scores_80: dmScores80,
        scores_100: dmScores100,
        scores_140: dmScores140,
        scores_180: dmScores180,
        high_finishes: dmHighFinishes,
        short_legs: dmShortLegs,
        specials_count: dmSpecialsCount,
        season,
      });

      if (res.success) {
        setMessage({
          text: `✅ Doppel-Spielbericht erfolgreich gespeichert!`,
          type: 'success',
        });
      } else {
        setMessage({ text: `❌ Fehler: ${res.error}`, type: 'error' });
      }
    });
  };

  // -------------------------------------------------------------
  // TAB 4: DOUBLES SPECIAL FORM STATE
  // -------------------------------------------------------------
  const [dsPlayerId, setDsPlayerId] = useState<number>(
    officialPlayers[0]?.id || 0
  );
  const [dsPartnerName, setDsPartnerName] = useState('');
  const [dsOpponentTeam, setDsOpponentTeam] = useState('');
  const [dsDate, setDsDate] = useState(new Date().toISOString().split('T')[0]);
  const [dsSpecialType, setDsSpecialType] = useState('180er');
  const [dsDescription, setDsDescription] = useState('');

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
          text: '✅ Doppel-Special erfolgreich eingetragen! (+0,5 Punkte Bonus gutgeschrieben)',
          type: 'success',
        });
        setDsDescription('');
      } else {
        setMessage({ text: `❌ Fehler: ${res.error}`, type: 'error' });
      }
    });
  };

  const newSpList = scannedList.filter((s) => s.is_new_candidate);
  const existingSpList = scannedList.filter((s) => !s.is_new_candidate);
  const totalMatchesFound = scannedList.reduce(
    (sum, s) => sum + s.total_matches,
    0
  );

  return (
    <div className="space-y-6 animate-fadeIn py-2 max-w-5xl mx-auto">
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
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span>📝</span> Data Entry / Eingabemaske
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            CSV-Spieltagsimport aus dem Dart Match Image Analyzer & manuelle Spielberichte.
          </p>
        </div>

        {/* Saison-Auswahl */}
        <div className="bg-[#0b1428] border border-cyan-500/30 rounded-xl p-2.5 flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-400">📅 Saison:</span>
          <select
            value={season}
            onChange={(e) => {
              const newS = e.target.value;
              setSeason(newS);
              handleScanDirectory(newS);
            }}
            className="bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
          >
            {availableSeasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {!availableSeasons.includes('2026/2027') && (
              <option value="2026/2027">2026/2027</option>
            )}
          </select>
        </div>
      </div>

      {/* Feedback Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold animate-fadeIn ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('csv_import')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'csv_import'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>📥</span> CSV-Import (DAE & Liga)
        </button>

        <button
          onClick={() => setActiveTab('single')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'single'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>🎯</span> Einzel-Spielbericht
        </button>

        <button
          onClick={() => setActiveTab('doubles_match')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'doubles_match'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>👥</span> Doppel-Spielbericht
        </button>

        <button
          onClick={() => setActiveTab('doubles_special')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'doubles_special'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span>🤝</span> Doppel-Special (Bonus)
        </button>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* TAB 1: CSV-SPIELTAGS-IMPORT (ORDNER-SCAN & BATCH-IMPORT)   */}
      {/* ---------------------------------------------------------- */}
      {activeTab === 'csv_import' && (
        <div className="bg-[#0b1428] border border-cyan-500/30 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/5 border border-cyan-500/30 rounded-xl p-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 mb-2 shadow-[0_0_12px_rgba(0,212,255,0.25)]">
              <span>⚡</span> AUTOMATISCHE SYNCHRONISATION
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              📥 Intelligenter CSV-Spieltags-Import (DAE & Lions League)
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              Durchsucht automatisch den Hauptordner und alle Unterordner des{' '}
              <b>Dart Match Image Analyzers</b>, gleicht vorhandene Spiele mit der
              Datenbank ab und zeigt dir direkt, welche Spieltage <b>NEU</b> sind.
            </p>
          </div>

          {/* 1. HAUPTORDNER-SCANNER */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                📁 Pfad zum Hauptordner (durchsucht alle Unterordner)
              </label>
              <input
                type="text"
                value={rootDir}
                onChange={(e) => setRootDir(e.target.value)}
                placeholder="C:\Users\sebas\Documents\Lions Weyhausen\02_Liga\Dart_Match_Image_Analyzer\output\spieltage"
                className="w-full bg-slate-900 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => handleScanDirectory()}
                disabled={isScanning || isImporting}
                className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 font-bold py-2.5 px-4 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>🔍</span>{' '}
                {isScanning ? 'Scanne...' : 'Hauptordner scannen'}
              </button>
            </div>
          </div>

          {/* 2. GEFUNDENE SPIELTAGE & KPI-BOXEN */}
          {scannedList.length > 0 ? (
            <div className="space-y-5">
              {/* 3 KPI Metriken */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-400">
                    🟢 Neue Spieltage
                  </div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {newSpList.length}
                  </div>
                  <div className="text-[11px] text-emerald-300/80 mt-0.5">
                    {newSpList.length > 0
                      ? 'Bereit zum Import'
                      : 'Alles aktuell'}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-white/10 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-400">
                    ⚪ Bereits vorhanden
                  </div>
                  <div className="text-2xl font-black text-slate-200 mt-1">
                    {existingSpList.length}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Bereits in Supabase gespeichert
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-400">
                    🎯 Gefundene Matches
                  </div>
                  <div className="text-2xl font-black text-cyan-300 mt-1">
                    {totalMatchesFound}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    In {scannedList.length} Spieltags-Ordnern
                  </div>
                </div>
              </div>

              {/* Schnellauswahl & Überschrift */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-b border-white/10 pb-2">
                <h3 className="text-sm font-extrabold text-white">
                  📋 Gefundene Spieltage ({scannedList.length}):
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllSpieltage}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    ☑️ Alle auswählen
                  </button>
                  <button
                    type="button"
                    onClick={selectOnlyNewSpieltage}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    🟢 Nur Neue auswählen
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllSpieltage}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    ⬜ Auswahl aufheben
                  </button>
                </div>
              </div>

              {/* Spieltags-Liste mit Checkboxen */}
              <div className="space-y-2.5">
                {scannedList.map((sp) => {
                  const isChecked = !!selectedSlugs[sp.dir_path];
                  const statusColor =
                    sp.status === 'NEW'
                      ? '#00e676'
                      : sp.status === 'PARTIAL'
                      ? '#ffd700'
                      : '#94a3b8';

                  return (
                    <div
                      key={sp.dir_path}
                      onClick={() => toggleSelectSpieltag(sp.dir_path)}
                      className={`grid grid-cols-1 md:grid-cols-12 items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_15px_rgba(0,212,255,0.12)]'
                          : 'bg-slate-900/70 border-white/10 hover:border-white/25'
                      }`}
                    >
                      {/* Checkbox + Titel + Ordner */}
                      <div className="md:col-span-7 flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectSpieltag(sp.dir_path)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 rounded accent-cyan-400 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white">
                            <span className="text-cyan-300">{sp.sp_display}</span>{' '}
                            ({sp.date_str}):{' '}
                            <span className="text-white">{sp.team_display}</span> vs.{' '}
                            <span className="text-amber-300">{sp.opp_display}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                            📂 {sp.slug} | Stand: {sp.mtime_str}
                          </div>
                        </div>
                      </div>

                      {/* Match-Anzahl */}
                      <div className="md:col-span-2 text-xs md:text-sm font-bold text-slate-200 md:text-center">
                        🎯 {sp.total_matches} Matches
                      </div>

                      {/* Status Badge */}
                      <div className="md:col-span-3 flex md:justify-end">
                        <div
                          style={{
                            background: 'rgba(13,27,42,0.85)',
                            border: `1px solid ${statusColor}`,
                            borderRadius: '8px',
                            padding: '6px 10px',
                            textAlign: 'center',
                          }}
                          className="w-full md:w-auto min-w-[165px]"
                        >
                          <div
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: statusColor,
                            }}
                          >
                            {sp.status_badge}
                          </div>
                          <div
                            style={{
                              fontSize: '0.68rem',
                              color: '#cbd5e1',
                            }}
                          >
                            {sp.status_desc}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Synchronisations-Checkbox & Batch-Import Button */}
              <div className="pt-3 border-t border-white/10 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer text-xs md:text-sm font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={syncBatch}
                    onChange={(e) => setSyncBatch(e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                  />
                  <span>
                    ✅ Automatisch in die offizielle Lions League Rangliste (
                    <code>matches</code> & <code>doubles_matches</code>)
                    synchronisieren
                  </span>
                </label>

                {selectedSpieltageForImport.length === 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs md:text-sm text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span>
                      ℹ️ Aktuell sind <b>0 Spieltage angehakt</b>, da alle{' '}
                      {scannedList.length} Spieltage bereits in Supabase
                      vorhanden sind (<b>⚪ VORHANDEN</b>). Setze oben links
                      einen Haken ☑️ bei den gewünschten Spieltagen oder klicke
                      rechts auf „Alle auswählen“, um sie erneut zu importieren:
                    </span>
                    <button
                      type="button"
                      onClick={selectAllSpieltage}
                      className="shrink-0 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      ☑️ Alle {scannedList.length} Spieltage anhaken
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBatchImport}
                  disabled={isImporting}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black py-3.5 rounded-xl text-base transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isImporting
                    ? `⏳ Importiere & Synchronisiere ${selectedSpieltageForImport.length} Spieltag(e) in Supabase...`
                    : `🚀 Alle ausgewählten Spieltage importieren (${selectedSpieltageForImport.length} von ${scannedList.length})`}
                </button>
              </div>

              {/* Direktes Feedback auch direkt unter dem Button */}
              {message && (
                <div
                  className={`p-4 rounded-xl border text-sm font-semibold animate-fadeIn ${
                    message.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Ergebnis-Details nach dem Batch-Import */}
              {batchResult && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2 text-xs md:text-sm">
                  <div className="font-bold text-emerald-300">
                    📋 Import-Protokoll:
                  </div>
                  {batchResult.results.map((r, i) => (
                    <div key={i} className="text-slate-200">
                      {r.success ? (
                        <span>
                          • 🟢 <b>{r.slug}</b> ({r.team} vs. {r.opponent}):{' '}
                          {r.created} neu, {r.updated} aktualisiert
                        </span>
                      ) : (
                        <span className="text-rose-400">
                          • ❌ <b>{r.slug}</b>: {r.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs md:text-sm text-amber-300">
              ⚠️ Keine Spieltags-CSV-Dateien (<code>*matches.csv</code>) unter{' '}
              <code>{rootDir}</code> gefunden. Bitte prüfe den Pfad und klicke auf{' '}
              <b>Hauptordner scannen</b>.
            </div>
          )}

          {/* 3. ALTERNATIVE: MANUELLER DRAG & DROP UPLOAD */}
          <details className="bg-slate-900/60 border border-white/10 rounded-xl p-4 group">
            <summary className="text-xs md:text-sm font-bold text-slate-300 hover:text-cyan-300 cursor-pointer list-none flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>📤</span> Alternative: Einzelne CSV-Dateien manuell hochladen
                (Drag & Drop)
              </span>
              <span className="text-cyan-400 group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>

            <div className="pt-4 mt-3 border-t border-white/10 space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilesSelected(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-900/60 hover:bg-slate-900/90 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.json"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
                <div className="text-3xl">📂</div>
                <p className="text-sm font-bold text-white">
                  Klicke hier zum Auswählen oder ziehe Dateien per Drag & Drop
                  hierher
                </p>
                <p className="text-xs text-slate-400">
                  Unterstützt: <code>*matches.csv</code>, <code>*legs.csv</code>,{' '}
                  <code>*visits.csv</code>, <code>*statistics.csv</code>,{' '}
                  <code>*spieltag_info.json</code>
                </p>
              </div>

              {uploadedFiles.fileNames.length > 0 && (
                <div className="bg-slate-900/90 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300">
                      Ausgewählte Dateien ({uploadedFiles.fileNames.length}):
                    </span>
                    <span className="font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                      {uploadedFiles.matchesCount} Matches erkannt
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleImportSpieltag}
                    disabled={isPending || !uploadedFiles.matchesText}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all cursor-pointer"
                  >
                    🚀 Manuell ausgewählte Dateien importieren
                  </button>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/* TAB 2: EINZEL-SPIELBERICHT (MANUELL)                       */}
      {/* ---------------------------------------------------------- */}
      {activeTab === 'single' && (
        <form
          onSubmit={handleSingleSubmit}
          className="bg-[#0b1428] border border-cyan-500/30 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl"
        >
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🎯</span> 1. Spieler & Spielauswahl
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Spieler auswählen
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
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
                Spieldatum
              </label>
              <input
                type="date"
                required
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Gegnerische Mannschaft
            </label>
            <select
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
            >
              {opponents.map((opp) => (
                <option key={opp} value={opp}>
                  {opp}
                </option>
              ))}
            </select>
          </div>

          <div className="border-b border-white/10 pt-4 pb-2">
            <h3 className="text-base font-bold text-cyan-300">
              Leg-Ergebnis (Best of 5)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Gewonnene Legs
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={legsWon}
                onChange={(e) => setLegsWon(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Verlorene Legs
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={legsLost}
                onChange={(e) => setLegsLost(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="border-b border-white/10 pt-4 pb-2">
            <h3 className="text-base font-bold text-cyan-300">Average-Werte</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Gesamt Average
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={avgTotal}
                onChange={(e) => setAvgTotal(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                9-Dart Average
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={avg9}
                onChange={(e) => setAvg9(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                18-Dart Average
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={avg18}
                onChange={(e) => setAvg18(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="border-b border-white/10 pt-4 pb-2">
            <h3 className="text-base font-bold text-cyan-300">High Scores</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">80+ Scores</label>
              <input
                type="number"
                min="0"
                value={scores80}
                onChange={(e) => setScores80(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">100+ Scores</label>
              <input
                type="number"
                min="0"
                value={scores100}
                onChange={(e) => setScores100(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">140+ Scores</label>
              <input
                type="number"
                min="0"
                value={scores140}
                onChange={(e) => setScores140(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">180er</label>
              <input
                type="number"
                min="0"
                value={scores180}
                onChange={(e) => setScores180(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="border-b border-white/10 pt-4 pb-2">
            <h3 className="text-base font-bold text-cyan-300">
              Highlights & Specials
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Höchstes Finish (z.B. 120)
              </label>
              <input
                type="number"
                min="0"
                max="170"
                value={highFinishes}
                onChange={(e) => setHighFinishes(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Short Legs (≤18 Darts)
              </label>
              <input
                type="number"
                min="0"
                value={shortLegs}
                onChange={(e) => setShortLegs(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Specials Anzahl
              </label>
              <input
                type="number"
                min="0"
                value={specialsCount}
                onChange={(e) => setSpecialsCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black py-3.5 rounded-xl text-base transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer mt-4"
          >
            {isPending ? 'Speichern...' : '🚀 Einzel-Spielbericht Speichern'}
          </button>
        </form>
      )}

      {/* ---------------------------------------------------------- */}
      {/* TAB 3: DOPPEL-SPIELBERICHT (MANUELL)                       */}
      {/* ---------------------------------------------------------- */}
      {activeTab === 'doubles_match' && (
        <form
          onSubmit={handleDoublesMatchSubmit}
          className="bg-[#0b1428] border border-cyan-500/30 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl"
        >
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>👥</span> 1. Doppel-Paarung auswählen
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Spieler 1 (Lions)
              </label>
              <select
                value={dmP1Id}
                onChange={(e) => setDmP1Id(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
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
                Spieler 2 (Lions Partner)
              </label>
              <select
                value={dmP2Id}
                onChange={(e) => setDmP2Id(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              >
                {officialPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.team === 'A-Team' ? '🦁 ' : '🐯 '}
                    {p.name} ({p.team})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Spieldatum
              </label>
              <input
                type="date"
                required
                value={dmDate}
                onChange={(e) => setDmDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Gegnerische Mannschaft
              </label>
              <select
                value={dmOpponent}
                onChange={(e) => setDmOpponent(e.target.value)}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              >
                {dmOpponents.map((opp) => (
                  <option key={opp} value={opp}>
                    {opp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-b border-white/10 pt-4 pb-2">
            <h3 className="text-base font-bold text-cyan-300">
              Leg-Ergebnis (Best of 5)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Gewonnene Legs
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={dmLegsWon}
                onChange={(e) => setDmLegsWon(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Verlorene Legs
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={dmLegsLost}
                onChange={(e) => setDmLegsLost(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="border-b border-white/10 pt-4 pb-2">
            <h3 className="text-base font-bold text-cyan-300">Average-Werte</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Gesamt Average
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={dmAvgTotal}
                onChange={(e) => setDmAvgTotal(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                9-Dart Average
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={dmAvg9}
                onChange={(e) => setDmAvg9(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                18-Dart Average
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={dmAvg18}
                onChange={(e) => setDmAvg18(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="border-b border-white/10 pt-4 pb-2">
            <h3 className="text-base font-bold text-cyan-300">High Scores</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">80+ Scores</label>
              <input
                type="number"
                min="0"
                value={dmScores80}
                onChange={(e) => setDmScores80(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">100+ Scores</label>
              <input
                type="number"
                min="0"
                value={dmScores100}
                onChange={(e) => setDmScores100(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">140+ Scores</label>
              <input
                type="number"
                min="0"
                value={dmScores140}
                onChange={(e) => setDmScores140(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">180er</label>
              <input
                type="number"
                min="0"
                value={dmScores180}
                onChange={(e) => setDmScores180(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="border-b border-white/10 pt-4 pb-2">
            <h3 className="text-base font-bold text-cyan-300">
              Highlights & Specials
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Höchstes Finish (z.B. 120)
              </label>
              <input
                type="number"
                min="0"
                max="170"
                value={dmHighFinishes}
                onChange={(e) => setDmHighFinishes(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Short Legs (≤18 Darts)
              </label>
              <input
                type="number"
                min="0"
                value={dmShortLegs}
                onChange={(e) => setDmShortLegs(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Specials Anzahl
              </label>
              <input
                type="number"
                min="0"
                value={dmSpecialsCount}
                onChange={(e) => setDmSpecialsCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black py-3.5 rounded-xl text-base transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer mt-4"
          >
            {isPending ? 'Speichern...' : '🚀 Doppel-Spielbericht Speichern'}
          </button>
        </form>
      )}

      {/* ---------------------------------------------------------- */}
      {/* TAB 4: DOPPEL-SPECIALS (BONUS)                             */}
      {/* ---------------------------------------------------------- */}
      {activeTab === 'doubles_special' && (
        <form
          onSubmit={handleDoublesSpecialSubmit}
          className="bg-[#0b1428] border border-cyan-500/30 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl"
        >
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🤝</span> 1. Doppel-Special erfassen
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Bonus-Regel: Jedes im Doppel geworfene Special bringt dem Spieler <strong>+0,5 Punkte extra</strong> im Gesamt-Ranking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Lions-Spieler (Bonus-Empfänger)
              </label>
              <select
                value={dsPlayerId}
                onChange={(e) => setDsPlayerId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
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
                Name des Partners
              </label>
              <input
                type="text"
                required
                placeholder="z. B. Dirk Ostermann"
                value={dsPartnerName}
                onChange={(e) => setDsPartnerName(e.target.value)}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Gegnerisches Team
              </label>
              <input
                type="text"
                required
                placeholder="z. B. HSV Isedarter B"
                value={dsOpponentTeam}
                onChange={(e) => setDsOpponentTeam(e.target.value)}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Spieldatum
              </label>
              <input
                type="date"
                required
                value={dsDate}
                onChange={(e) => setDsDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Art des Specials
              </label>
              <select
                value={dsSpecialType}
                onChange={(e) => setDsSpecialType(e.target.value)}
                className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="180er">180er (Maximum)</option>
                <option value="High Finish">High Finish (101–170)</option>
                <option value="Short Leg">Short Leg (≤ 18 Darts)</option>
                <option value="Bull-Finish">Bull-Finish (50 Punkte)</option>
                <option value="High Score">High Score (141–177)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Beschreibung / Details (optional)
            </label>
            <input
              type="text"
              placeholder="z. B. 116er Checkout über T20, S16, D20"
              value={dsDescription}
              onChange={(e) => setDsDescription(e.target.value)}
              className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black py-3.5 rounded-xl text-base transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer mt-4"
          >
            {isPending ? 'Eintragen...' : '🤝 Doppel-Special Eintragen (+0,5 Bonus)'}
          </button>
        </form>
      )}
    </div>
  );
}
