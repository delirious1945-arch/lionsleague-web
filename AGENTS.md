# 🛡️ Autonomous Development & Quality Rules (AGENTS.md)
*Gültige Leitplanken für alle Antigravity-Agenten im Projekt Lions Weyhausen Ranking Website*

---

## 1. Projektziel & Mission
Kontinuierliche, sichere und autonome Weiterentwicklung der webbasierten Dart-Ranking- und Analyseplattform der Lions Weyhausen. Ziel ist maximale Datenintegrität, präzise Ranking-Berechnungen nach BBDV-Standard und absolute Stabilität für die Spieler und Admins.

---

## 2. Allgemeine Grundregeln (Für jeden Agenten verbindlich)
1. **Sprache:** Alle Erklärungen, UI-Texte, Kommentare und Berichte sind auf **Deutsch** zu verfassen.
2. **Architektur-Respekt:** Vor jeder Codeänderung ist die bestehende Architektur (`app.py`, `database.py`, `pages/`, `analytics/`) zu analysieren.
3. **Schutz der Produktionsdaten:** Experimente und Entwicklungen finden **niemals** direkt auf `dart_data.db` statt. Änderungen werden in isolierten Bereichen (`test_env/`, separaten Branches/Workspaces) vorgenommen.
4. **Sicherheitsgrenzen:** Keine Passwörter, API-Tokens (z. B. Supabase Secrets) oder sensible Daten im Code, in Logs oder in Berichten.
5. **Kein Test-Disabling:** Niemals bestehende Tests oder Plausibilitätsprüfungen abschwächen oder deaktivieren, nur um ein Quality Gate zu passieren.
6. **Lückenlose Protokollierung:** Jede autonome Aktion erzeugt ein transparentes Protokoll nach dem definierten Übergabestandard.

---

## 3. Ranking- & Datenqualität (BBDV-Standard)
1. **Baseline-Prinzip:** Vor jeder Optimierung am Ranking-Algorithmus (z. B. Gewichtungen in `database.py`, Average-Berechnungen in `analytics/`) wird eine reproduzierbare Baseline auf einem festen Testdatensatz ermittelt.
2. **Keine Ranking-Verzerrung:** Änderungen am Ranking dürfen historische Platzierungen nicht unplausibel verschieben. Jede Anpassung muss mathematisch nachweisbar begründet sein.
3. **Plausibilitätskriterien:**
   - First-to-3 im Best-of-5 (genau 3 Gewinnlegs erforderlich).
   - Maximal 2 Einzel pro Spieler an einem Spieltag.
   - Checkouts $\le 170$ und Ausschluss von Bogey-Numbers (159, 162, 163, 165, 166, 168, 169).
   - 3-Dart-Average-Formel: $(\text{Punkte} / \text{Darts}) \times 3$.

---

## 4. Test- & Validierungsstufen (Quality Gates)
Jeder autonome Verbesserungszyklus muss folgende 4 Gates durchlaufen:
* **Gate 1 (Syntax & Imports):** Fehlerfreies Laden aller Module, keine zirkulären Abhängigkeiten.
* **Gate 2 (DB-Integrität):** Schema-Konsistenz in SQLite und Supabase-Kompatibilität, keine verwaisten Fremdschlüssel.
* **Gate 3 (Regressions- & Ranking-Tests):** Bestehende Matches und Statistiken liefern identische oder nachweisbar verbesserte Ergebnisse.
* **Gate 4 (Security & Performance):** Keine sensiblen Leaks, keine Deadlocks, Ausführungszeit unter Schwellenwert.

---

## 5. Freigabe- & Rollout-Regeln
* **Automatisches Staging:** Änderungen, die alle Quality Gates zu 100% bestehen und keine destruktiven Schemaänderungen enthalten, dürfen in das Staging-Environment übertragen werden.
* **Menschliche Freigabe erforderlich bei:**
  - Destruktiven Datenbank-Migrationen (DROP, Spaltenlöschungen).
  - Grundlegenden Änderungen am Regel- oder Punktesystem.
  - Fehlgeschlagenen Quality Gates oder Warnungen im Audit.
  - Änderungen an Authentifizierungs- oder Rollenrechten.

---

## 6. Berichterstattung an den Admin (Sebastian)
Jeder Zyklus schließt mit einem kompakten Management-Bericht ab:
1. **Was wurde analysiert?** (Metriken, Fehlerquellen, Performance)
2. **Was wurde verbessert?** (Konkrete Änderung im Code)
3. **Welche Tests wurden ausgeführt?** (Ergebnisse Gate 1–4)
4. **Baseline vs. Kandidat:** (Messbarer Vorher-/Nachher-Vergleich)
5. **Verbleibende Risiken & Freigabeempfehlung** (Auto-Rollout oder manuelle Freigabe)

---

## 7. Agenten-Netzwerk: Rollen & Rechte
*Ergänzt am 28.10.2026, erweitert am 29.10.2026 um Game-Optimizer, UI-Cleaner & Biomechanics-Agent.*

| Agent | Skills | Rechte | Grenze |
|---|---|---|---|
| **Orchestrator** | `daily-report`, Priorisierung | Aufgaben verteilen, Berichte schreiben, `CHANGELOG.md` pflegen | Keine Codeänderung |
| **Analyst** | `daily-audit`, `ranking-evaluation` | Nur lesend, nur Kopie bzw. `test_env/` | Nie auf `dart_data.db` schreiben |
| **Coding-Agent** | `safe-implementation` | Schreibt nur im eigenen Branch/Worktree | Max. 1 Verbesserung pro Zyklus, kein Merge, keine Ranking-Logik |
| **QA + Security** | `quality-gate`, `release-review` | Führt Tests aus, prüft Secrets/Rollen/Datenschutz | Darf Tests niemals abschwächen |
| **Game-Optimizer** | `game-simulation`, `flow-audit` | Testet & optimiert Trainingsspiele; steuert Unteragenten für Spielsimulationen | Keine Änderung an Ranking-/Ligamatch-Logik |
| **UI-Cleaner** | `ui-styling-only`, `ux-declutter` | Detektiert redundante/störende UI-Elemente, korrigiert Farbsemantik (Grün=Hit, Rot=Miss) | Keine Änderung an Backend-/Datenbanklogik |
| **Biomechanics-Agent** | `video-engine`, `pose-tracking-audit` | Baut & testet KI-Wurfanalyse autonom On-Device; deckt Tracking- & Berechnungsfehler auf; formuliert Bedarfsanforderungen | 100% On-Device, keine Rohvideos in DB |

1. **Trennung der Verantwortung:** Wer etwas baut, bewertet und gibt es nicht selbst frei.
2. **Unteragenten für Game-Simulation:** Der `Game-Optimizer` nutzt autonome Subagents/Simulatoren, die vollständige Spielverläufe durchspielen, Randfälle prüfen (Undo, Punkte-Obergrenzen, Abbrüche) und Fehlerberichte erzeugen.
3. **UI-Cleaner Leitplanken:** Konzentration auf Spiel-Fokus, Reduktion von visueller Überladung auf dem Dartboard/Mobile-Screen, strikte Einhaltung der Farb-Semantik: Treffer/Erfolg = Smaragdgrün, Fehlwurf/Warnung = Rot/Grau.
4. **Biomechanics-Agent Leitplanken:** Autonomes Testen von MediaPipe Pose Tracking, Nullpunkt-Kalibrierung, 5 Kernwinkeln und Release-Point. Meldet im täglichen Bericht exakt, welche mathematischen oder technischen Daten fehlen.

---

## 8. Schutz der Ranking-Logik (Doppelte Bestätigung)
1. **Ranking- und Punktelogik darf niemals ohne doppelte, ausdrückliche Bestätigung von Sebastian geändert werden.** Betroffen sind insbesondere Gewichtungen in `database.py`, Average-Berechnungen in `analytics/` (z. B. `calculate_3dart_average`) sowie Tabellen- und Ranglogik.
2. **Doppelte Bestätigung heißt:** (a) Zustimmung zum konkreten Änderungsvorschlag mit Baseline-vs-Kandidat-Vergleich **und** (b) eine zweite, separate Bestätigung unmittelbar vor der Übernahme.
3. **Vorschläge sind ausdrücklich erlaubt.** Agenten dürfen Änderungen als Bericht, Diff oder Branch-Entwurf vorschlagen, aber nicht anwenden oder in Produktion übernehmen.
4. Keine autonome Ausnahme: Auch bestandene Quality Gates ersetzen diese Bestätigung nicht.

---

## 9. Zusätzliche Leitplanken für Entwicklung & Analyse
1. **Isolierte Arbeit:** Änderungen erfolgen ausschließlich in separaten Git-Branches oder Worktrees, niemals direkt auf dem Hauptzweig. Solange kein Git-Repository eingerichtet ist, wird nur in Kopien bzw. `test_env/` gearbeitet und vorab eine Sicherungskopie des Projekts erstellt.
2. **Dokumentationspflicht:** Jede relevante Änderung wird mit Grund, Dateien und Testergebnis dokumentiert.
3. **Schutz vor Daten-Leakage:** Der Referenzdatensatz (`test_env/reference_data/`) darf nicht zum Anpassen von Parametern verwendet werden. Prognosemodelle werden zeitlich getrennt validiert (Training auf früheren Spieltagen, Test auf späteren).
4. **Prognosen sind keine Fakten:** Prädiktive Analysen und What-if-Szenarien werden stets mit Datenbasis (Anzahl Legs/Spiele) und Unsicherheit ausgewiesen. Bei zu wenig Daten erfolgt ein Hinweis statt einer Zahl.
5. **Kosten- und Abbruchlimit:** Pro Zyklus gilt ein festes Limit. Nach wiederholten Fehlschlägen (Standard: 3) bricht der Zyklus ab und meldet an Sebastian.
6. **Keine Zeitsteuerung ohne Freigabe:** Geplante bzw. nächtliche Agentenläufe werden erst eingerichtet, wenn Regeln und Skills freigegeben sind, und zunächst nur als Audit und Bericht.

---

## 10. Datenschutz für Video-Daten (Video-Engine)
1. Videos von Personen sind personenbezogene Daten. Es dürfen nur Lions-Spieler **mit ausdrücklicher Einwilligung** aufgenommen und analysiert werden.
2. **Videos verbleiben auf dem Gerät des Spielers.** In die Datenbank (Supabase) werden ausschließlich berechnete Metriken zurückgespielt (z. B. Winkel, Zeitpunkte), niemals Videos, Frames oder Dateipfade.
3. Der Spieler muss seine Analysedaten jederzeit einsehen und löschen können. Zugriff nur für den Spieler selbst und Admins.
4. Keine Videos, Frames oder personenbezogenen Pfade im Repository, in Logs oder in Berichten.
5. Video-Funktionen erfordern **immer manuelle Freigabe** (personenbezogene Daten, neue Tabellen, neue Abhängigkeiten).
6. Korrelationen zwischen Wurfstil und Scoring werden als Zusammenhang mit Stichprobengröße ausgewiesen, nie als Kausalbehauptung.

---

## 11. Prognose-Basis
Prädiktive Analysen und What-if-Szenarien dürfen Liga-Daten und Trainingsdaten (`doppeltraining_app`) nutzen. Beide Quellen werden getrennt ausgewiesen und nicht ungeprüft vermischt.

---

## 12. Autonome Erkennungs- & Vorschlags-Heuristiken
*Verbindliche Audit-Kriterien für autonome Vorschläge des UI-Cleaners, Game-Optimizers und Biomechanics-Agents:*

1. **Redundanz-Scanner:**
   - Detektiert doppelte Darstellung identischer Metriken (z. B. Punkte, Aufnahme, Badge) auf demselben aktiven Viewport.
   - *Aktion:* Vorschlag zur Entfernung im oberen Header zugunsten eines aufgeräumten, aktiven Wurfbereichs.
2. **Sportliche Farbsemantik (Lions-Standard):**
   - Erfolgreiche Aktionen, Treffer, Checks und Ballbesitz MÜSSEN in **Smaragdgrün** (`emerald-500/600`, Border `emerald-300`) erstrahlen.
   - Fehlwürfe, Misses, Busts, Ballverluste und Abbrüche MÜSSEN in **Rot / Dunkelrot** (`red-500/600`, `rose-600`) oder mit deutlicher roter Kontur signalisiert werden.
3. **Dartboard-Touch-Ergonomie:**
   - Interaktive Touch-Elemente für Spieler am Board müssen mindestens `52px` Höhe besitzen.
   - Aufnahmen-Listen müssen direkte Touch-Korrekturen (Antippen zum Weiterschalten/Umschalten) unterstützen, ohne Umwege über Sub-Menüs.
4. **Schutz der Leistungsrangliste (Schwellenwert-Logik):**
   - Kurzspiele (z. B. Fußball auf 3 Tore) gelten als *Warm-up / Fun* und dürfen nicht in das offizielle Leistungsranking einfließen.
   - Mindest-Schwellenwerte (z. B. $\ge 5$ Tore, $\ge 30$ Darts) müssen serverseitig in Auswertungen und Queries erzwungen werden.
5. **Authentifizierte User-Arretierung (Strikter Single-Modus-Schutz):**
   - In allen Single-, Solo- und Computer-Spielen (`solo`, `1vsComputer`) MUSS der angemeldete Spieler unveränderlich als Spieler 1 fixiert sein.
   - Das Dropdown-Menü wird durch einen fixierten Account-Badge (`✓ Angemeldet · Fest fixiert`) ersetzt.
   - Reaktiver Re-Sync per `useEffect`: Beim Umschalten von Duell-Modi (`1vs1`) zurück in den Single-Modus wird Spieler 1 automatisch wieder auf den angemeldeten User zurückgesetzt.
   - Spielernamen-Matching MUSS mit Unicode- und Whitespace-Normalisierung (`trim().toLowerCase()`) erfolgen.
6. **Biomechanik-Engine (KI-Wurfanalyse):**
   - Autonome Prüfung der MediaPipe Landmark-Erkennung (Confidence $\ge 0.7$).
   - Validierung der 5 Kernwinkel (Stand-, Rückzug-, Release-, Nachhalte-, Neigungswinkel) relativ zum kalibrierten Nullpunkt.
   - Autonome Identifikation technischer Lücken (z. B. fehlende Kalibrierungs-Distanz, Kamera-FPS) und Formulierung als konkreter Handlungsbedarf an den Admin.
7. **Obligatorische Integration neuer Trainingsmodule (4-Core-Sync-Pflicht):**
   - Sobald ein neues Trainingsspiel implementiert oder erweitert wird, MUSS das Agenten-Netzwerk dieses vollautomatisch in den **4 Core-Verwaltungs- und TV-Ansichten** synchronisieren:
     1. `src/lib/trainingLottery.ts` (Zählweise +1 pro regulärem Spiel für den 20-Spiele-Lostopf)
     2. `src/components/AdminTrainingOverview.tsx` (Eigene Tabellenspalte, Tooltip, Spieler-Aufklapphistorie)
     3. `src/app/verwaltung/page.tsx` & `src/app/verwaltung/VerwaltungClient.tsx` (Datenabfrage, KPI-Zusammenfassung, Filter-Pills, Quick-Links und Session-Card mit aufklappbaren Detailwerten)
     4. Live-Boards / TV-Ansichten (TV-Board-Kompatibilität und Live-Ticker).
   - Kein neues Trainingsmodul darf isoliert ohne vollständige Integration in die Admin-Zentrale existieren.

---

## 13. Tägliche Dokumentationspflicht (`CHANGELOG.md`)
1. Nach jedem autonomen Entwicklungs- oder Optimierungszyklus MUSS das lebendige Dokument [`CHANGELOG.md`](file:///C:/Users/sebas/Documents/Lions%20Weyhausen/02_Liga/lionsweyhausen-web/CHANGELOG.md) mit einem neuen Tagesabschnitt fortgeschrieben werden.
2. Jede Änderung ist unter den Kategorien *Trainingsspiele*, *UI/UX-Cleaner*, *Biomechanik*, *Datenintegrität* und *Fehlende Komponenten* transparent zu protokollieren.
3. Der tägliche Management-Bericht an Sebastian (§6) verlinkt direkt auf das aktualisierte `CHANGELOG.md`.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
