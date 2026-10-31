# 📜 Lebendiges Änderungsprotokoll (Lions Weyhausen 2.0)
*Dieses Dokument wird täglich durch das autonome Agenten-Netzwerk und Entwicklungs-Zyklen fortgeschrieben.*

---

## 📅 Format & Leitfaden für tägliche Agenten-Einträge
Jeder Zyklus ergänzt einen neuen Tages-Abschnitt mit folgenden Kategorien:
- **🎯 Trainingsspiele & Game-Optimizer:** Verbesserungen an Spiellogik, Scoring, Undo, Regeln.
- **🎨 UI/UX-Cleaner & Farbsemantik:** Bereinigungen, Beseitigung redundanter Felder, Dartboard-Touch-Ergonomie.
- **🎥 Biomechanik & KI-Wurfanalyse:** Pose-Tracking, Winkel-Berechnungen, Nullpunkt-Kalibrierung, Video-Engine.
- **🛡️ Datenintegrität & BBDV-Standard:** Ranking-Plausibilität, Validierungsschwellen, DB-Konsistenz.
- **⚙️ Fehlende Komponenten & Handlungsbedarf:** Was fehlt den Agenten für den nächsten Schritt?

---

## [2026-10-31] – Admin-Zentrale Trainingsintegration & Strikte User-Arretierung im Single-Modus

### 🎯 Trainingsspiele & Admin-Verwaltung (`/verwaltung`)
- **AdminTrainingOverview Kachelbeschreibung erweitert:**
  - Ausführliche Erläuterung aller 4 Vereins-Trainingsmodule (Checkout Battle, PDC Challenge, Fußball Darts & Stellen & Checken).
  - Transparente Erklärung der Zählweise (+1 pro regulär beendetem Match) und der Lostopf-Qualifikation (ab 20 Partien/Monat für 5 Freigetränke, 4 Monate Sperrfrist für Gewinner).
  - Hinweis auf die interaktive Aufklapp-Funktion jedes Spielers zur Anzeige aller absolvierten Monatseinheiten.
- **Vollständige Integration aller 4 Trainingsmodule in der Admin-Zentrale:**
  - Unter „Trainingsleistungen aller Spieler“ werden neben Checkout Battle und PDC Challenge nun auch **Fußball Darts** (`training_fussball`) und **Stellen & Checken** (`training_stellen_checken`) geladen.
  - **KPI-Header:** Zeigt Gesamtsitzungen über alle 4 Module (`DQ · PDC · FB · S&C`).
  - **Filter-Pills:** Schnellumschalter für *Alle*, *Doppelquote*, *PDC Challenge*, *Fußball Darts* und *Stellen & Checken* mit jeweiligen Session-Zählern.
  - **Quick-Access Links:** Direktverlinkung zu allen 4 Trainingsmodulen im Header der Admin-Ansicht.
  - **Sitzungskarten & Detailaufklapp-Ansichten:**
    - *Fußball Darts:* Tore-Endstand mit Sieg-/Niederlagen-Badge, geworfene Darts, Ziel-Tore, Bull-Quote (Balleroberung) und Doppel-Quote (Torschüsse).
    - *Stellen & Checken:* Erreichte Punkte (von maximal 28), Checks-Quote, Sequenz-ID und vollständige 15-Runden-Aufnahmenübersicht (Target 3–101, Check-Status, erzielte Punkte).

### 🎥 Biomechanik & KI-Wurfanalyse (Benchmark-Upgrade nach echtem Video-Audit)
- **Trajektorien-Tracing (Blaue Wurfbahn):**
  - Vollständige Aufzeichnung der Hand- und Handgelenkspositionen über die gesamte Wurfbewegung.
  - Dynamisches Vektor-Rendering mit quadratischer Bézier-Kurvenglättung in leuchtendem Königsblau (#3b82f6) direkt auf dem Canvas.
  - Markierung des finalen Abwurf-Apex (Release-Punkt).
- **3-Dart-Überlagerung & Konsistenz-Score:**
  - Schalter zur getrennten Ansicht von Dart 1, Dart 2, Dart 3 oder gemeinsamer Überlagerung aller 3 Darts einer Aufnahme.
  - Mathematische Berechnung des Consistency-Scores (Pfad-Deckung der 3 Trajektorien).
- **Gelbe Schwerkraft-Lotlinie (Augenachse & Körperstabilität):**
  - Senkrechte, gestrichelte Referenzlinie vom dominanten Auge/Kopf vertikal zum Boden mit Zielkreis-Optik.
  - Entlarvt Vorneigungen oder Schwankungen des Oberkörpers während der Wurfbewegung.
- **Standdreieck am Oche:**
  - Visualisierung des Fußes (Sprunggelenk, Ferse, Zehenspitze) als geschlossenes Dreieck zur Überprüfung der Standruhe.
- **Winkel-HUD Badge im Benchmark-Design:**
  - Dunkle, abgerundete Pill mit weißer Typografie und dezentem Cyan-Winkelbogen direkt am Ellenbogen.
- **Erfolgreicher Real-Video-Test:**
  - Testsuite scripts/test_real_video_engine.py auf WhatsApp Video 2026-10-31 at 09.36.07.mp4 ausgeführt.
  - Alle 3 Darts (Drawback 32.0°/72.1°/53.4°, Follow-Through 8.8°/9.5°/9.9°) und Trajektorien fehlerfrei validiert (Consistency-Score 84.2/100, Lotlinien-Varianz 0.000).

### 🔒 Strikte User-Arretierung im Single-Modus (Anti-Cheat & Datenintegrität)
- **Problem behoben:** In Trainingsspielen war es stellenweise noch möglich, trotz Anmeldung einen anderen Spieler als Spieler 1 auszuwählen oder durch Moduswechsel fremde User-IDs zu übernehmen.
- **Systemweite Arretierung in allen 4 Trainingsmodulen:**
  - *Stellen & Checken (`/training/stellen-checken`):* Serverseitige Session-Übergabe in `page.tsx` aktiviert. Im `solo`-Modus ist das Dropdown vollständig durch einen festen Account-Badge (`✓ Angemeldet · Fest fixiert`) ersetzt. `useEffect` erzwingt reaktiven Re-Sync bei Moduswechseln.
  - *Fußball Darts (`/training/fussball`):* Im `1vsComputer`-Modus ist Spieler 1 unveränderlich an den angemeldeten Benutzer gebunden. Bei Umschalten von `1vs1` zurück zu `1vsComputer` wird Spieler 1 per `useEffect` automatisch wieder auf den Login-User zurückgesetzt.
  - *PDC Challenge (`/training/pdc-challenge`):* Unicode- und Whitespace-sichere Spielernamens-Normalisierung (`trim().toLowerCase()`). Im `solo`-Modus fester Badge statt Dropdown mit automatischem Re-Sync.
  - *Checkout Battle (`/doppelquote`):* Identische Normalisierung und strikte Account-Fixierung im Solo-Modus.

### 🛡️ Agenten-Regelwerk (`AGENTS.md`)
- **§12 Heuristik 5 (Authentifizierte User-Arretierung) geschärft:** Verbindliche Vorschrift für alle Agenten: Im Single-/Solo-Modus MUSS der angemeldete Account unveränderlich als Spieler 1 arretiert werden (Badge statt Dropdown, Re-Sync via `useEffect`).
- **§12 Heuristik 7 (4-Core-Sync-Pflicht für neue Trainingsmodule) hinzugefügt:** Autonome Pflicht für das Agenten-Netzwerk: Sobald ein neues Trainingsmodul entsteht, muss es zwingend in allen 4 Kernansichten synchronisiert werden (`trainingLottery.ts`, `AdminTrainingOverview.tsx`, `VerwaltungClient.tsx`, TV-Boards).

---

## [2026-10-29] – Autonomes Agenten-Netzwerk, UI-Cleaner & Trainings-Optimierung

### 🎯 Trainingsspiele & Game-Optimizer
- **Korrektur Spielzähler & Trainingsfleiß-Wertung (`src/lib/trainingLottery.ts`):**
  - **Grundsatz:** Jedes regulär gespielte Match geht ausnahmslos mit **+1** in die Zählung der absolvierten Spiele und den Lostopf für den Trainingsfleiß ein.
  - **Ursachenbehebung für Michael Kranz:** Ein restriktiver Filter (`target_goals >= 5`), der eigentlich für ein 1vs1-Leistungsranking gedacht war, hatte in den Zähl-Queries der Monatsverlosung versehentlich 10 absolvierte 3-Tore-Matches ignoriert. Dadurch sank sein Zählerstand fälschlicherweise von 29 auf 19 und stieg nach 5 Runden *Stellen & Checken* scheinbar nur auf 24.
  - **Korrektur:** Der Filter wurde in den Zähl-Queries (`getCompletedGamesByPlayerForMonth` und `getAdminTrainingOverviewData`) entfernt. Michael Kranz steht nun exakt bei **34 absolvierten Spielen** (9x Doppelquote, 9x PDC Challenge, 11x Fußball Darts, 5x Stellen & Checken).
  - **Datenbank-Stabilität:** Postgres-Array-Abfrage in `getBlockedPlayersForMonth` auf `IN ${sql(pastMonths)}` korrigiert.
- **Fußball Darts Battle (`/training/fussball`):**
  - **Ranking-Schwellenwert:** Spiele auf 3 Tore gelten als *„Warm-up / Fun“* und fließen nicht in die Vereinsrangliste ein. Erst ab **mindestens 5 Toren** (`5, 7, 10 Tore`) wird das Match für das Leistungsranking und die Monatsverlosung gewertet.
  - **Server-Filterung:** In `src/lib/trainingLottery.ts` wurde die Abfrage serverseitig mit `AND target_goals >= 5` abgesichert.
  - **Sitzungs-Identität:** Im Modus *1 vs. Computer* wird der angemeldete Spieler automatisch und unveränderlich als Spieler 1 arretiert (`✓ Angemeldeter Spieler`), um falsche Score-Zuordnungen auszuschließen.
- **Checkout Battle (`/doppelquote`):**
  - **Interaktive Touch-Korrektur:** Jede Aufnahme in den 10 Shot-Boxes kann nun direkt per Touch angewählt und durch wiederholtes Antippen zyklisch korrigiert werden (`0 -> 1 -> 2 -> 3 -> 0`), inklusive Treffer-Audio-Feedback.
  - **Größere Touch-Ziele:** Die Shot-Boxes wurden von winzigen Quadraten auf ergonomische `min-h-[54px] sm:min-h-[60px]` Schaltflächen vergrößert.
- **Automatisierte Test-Simulatoren (`scripts/simulate_training_games.ts`):**
  - Autonome Testsuite für Trainingsspiele (27 Tests) implementiert und erfolgreich ausgeführt (PDC Shanghai Bonus, Doppelrunde 1100 Pkt, 57-Dart-Abschluss, Undo-Konsistenz, Bust-Logik, Strafraum-Pässe).

### 🎨 UI/UX-Cleaner & Farbsemantik
- **PDC Challenge (`/training/pdc-challenge`):**
  - **Treffer-Farbsemantik:** Umstellung des Treffer-Buttons (`DOUBLE_HIT_BTN`) von verwirrendem Orange/Amber auf klares **Smaragdgrün** (`bg-gradient-to-r from-emerald-600 to-emerald-500`). Fehlwürfe (`DOUBLE_MISS_BTN`) erhielten eine dunkelrote Hover-Kontur.
  - **Redundanz-Beseitigung:** Der gedoppelte Punktestand im oberen Header-Banner (`PDC.MATCH.HERO_PLAYER`) wurde entfernt; der Header zeigt fokussiert den Wurfstatus und das Badge, während der laufende Score zentral im Wurfbereich steht.
  - **Fokus-Doppelkarte:** Die überladene 21-Felder-Zeitleiste (`DOUBLES_TIMELINE`) wurde entfernt. Stattdessen wurde die aktive 3-Dart-Aufnahmekarte (`DOUBLES_STATUS`) deutlich vergrößert und kontrastreich am Board hervorgehoben.
- **Checkout Battle & Stellen/Checken:**
  - Durchgängige Einführung des Lions-Standards: Treffer 1–3 in Smaragdgrün (3 Treffer mit Goldstern), Fehlwurf 0 in Dunkelgrau/Rot.
  - CHECK-Button in Stellen & Checken leuchtet in sattem Smaragdgrün, MISS in signalisierendem Dunkelrot.

### 🎥 Biomechanik & KI-Wurfanalyse
- **Anthropometrische Kalibrierung (`VideoAnalyzerClient.tsx`):**
  - Optischer Anker: Eingabe der individuellen Körpergröße des Spielers (`playerHeightCm`, Standard 180 cm) als Referenz zur Umrechnung von Bild-Pixeln in Zentimeter.
  - Skalierungsfaktoren nach Dempster/Winter für Oberarm und Unterarm integriert.
  - Wurfarm-Umschaltung (Rechts- vs. Linkshänder) mit dynamischer Auswahl der MediaPipe-Landmarks.
  - Video-Upload-Fix: Lokale Videodateien werden sofort im HTML5-Videoplayer geladen und auf Frame 0.05s für Standbild-Tracking initialisiert.
- **Biomechanik-Audit-Testsuite (`scripts/audit_biomechanics.ts`):**
  - 4/4 Tests erfolgreich (Rechts-/Linkshänder-Tracking, Winkelgrenzen, Körpergrößen-Skalierung).

### 🔮 Dart Analytics Engine (DAE) & What-if-Prognose
- **Portierung nach TypeScript (`src/lib/whatIfEngine.ts`):**
  - Vollständige Portierung der mathematischen Prognose-Engine aus Python nach TypeScript (`predictAverage`, `simulateScenario`, `requiredDoubleRate`, `requiredSetupDarts`, `estimateSetupDartsFromLegs`, `averageBand`).
  - Unit-Testsuite `scripts/test_whatif.ts` verifiziert mathematische Identität zur BBDV-Baseline.
- **Interaktiver What-If-Simulator (`WhatIfSimulatorWidget.tsx`):**
  - Neuer 4. Tab in `/analytics` („🔮 What-if-Prognose“) mit Spielerauswahl, dynamischer Auswertung realer Liga-Legs, interaktiven Range-Slidern für Setup-Darts und Doppelquote sowie Live-Berechnung von Average-Deltas.
  - Vektor-SVG-Kurve für Leistungsentwicklung bei variierender Doppelquote.
  - **Zielplaner (Umkehrrechnung):** Ermittelt exakt benötigte Doppelquote bzw. maximal erlaubte Setup-Darts für frei wählbare Ziel-Averages.

### 🛡️ Quality Gates & Systemstatus
- **Gate 1 (Syntax & Turbopack Build):** PASS (Next.js 16.4.2 Production Build ohne Fehler kompiliert).
- **Gate 2 (DB-Integrität):** PASS (Keine destruktiven Migrationen).
- **Gate 3 (Regressions- & Rankingtests):** PASS (What-if 5/5 Tests PASS, Game Sim 27/27 Tests PASS, Biomechanics 4/4 Tests PASS).
- **Gate 4 (DSGVO & Datenschutz §10):** PASS (Videoanalyse läuft 100% On-Device, keine Video-Rohdaten im Backend).

---

## [2026-10-28] – Architektur-Grundstein & Plattform-Konsolidierung

### 🎯 Kernsystem & Ranking
- **Plattform-Konsolidierung:** Übertragung aller BBDV-Ranking-Algorithmen und der Spielerdatenbank aus dem Python/Streamlit-Kern in die moderne Next.js 16.4 Web-Plattform (`lionsweyhausen-web`).
- **BBDV-Plausibilitätskriterien:** Verankerung der Best-of-5 First-to-3 Regeln, Max. 2 Einzel pro Spieltag und Bogey-Number-Ausschluss (159, 162, 163, 165, 166, 168, 169) in den Agenten-Leitplanken.

### 🛡️ Leitplanken & Autonome Entwicklung
- **`AGENTS.md` eingeführt:** Verbindliche Rollentrennung (Orchestrator, Analyst, Coding-Agent, QA+Security, Game-Optimizer, UI-Cleaner), Schutz der Ranking-Logik durch doppelte Bestätigung (§8) und strenge Datenschutzregeln für Video-Daten (§10).
- **Automations-Sidecar:** Einrichtung des Antigravity-Automations-Sidecars (`sidecar.json`) für den täglichen autonomen Zyklus um 02:00 Uhr.
