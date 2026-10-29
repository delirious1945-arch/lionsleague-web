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

## [2026-10-29] – Autonomes Agenten-Netzwerk, UI-Cleaner & Trainings-Optimierung

### 🎯 Trainingsspiele & Game-Optimizer
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
- **Video-Upload-Fix (`VideoAnalyzerClient.tsx`):**
  - Lokale Videodateien werden nun sofort nach Upload im HTML5-Videoplayer angezeigt und auf Frame 0.05s initialisiert, um Standbilder für die Nullpunkt-Kalibrierung zuverlässig bereitzustellen.
  - Standbild-Freeze und Skeleton-Overlay für die Analyse vorbereitet.

### 🛡️ Quality Gates & Systemstatus
- **Gate 1 (Syntax & Turbopack Build):** PASS (Next.js 16.4.2 Production Build ohne Fehler kompiliert).
- **Gate 2 (DB-Integrität):** PASS (Keine destruktiven Migrationen).
- **Gate 3 (Regressions- & Rankingtests):** PASS (27/27 Tests fehlerfrei).
- **Gate 4 (DSGVO & Datenschutz §10):** PASS (Videoanalyse läuft 100% On-Device, keine Video-Rohdaten im Backend).

### ⚙️ Fehlende Komponenten & Handlungsbedarf (Meldung an Sebastian)
1. **[PRIO HOCH] Pixel-zu-Zentimeter Maßstab (Board-Referenz):**
   - Aktuell berechnet das System Winkel in Grad und Positionen in relativen Koordinaten (0..1). Um dem Spieler reale Abweichungen in Zentimetern (z. B. *„Körper schwankt um 2,4 cm nach links“*) anzuzeigen, wird ein Referenzmaßstab (z. B. Dartboard-Höhe 173 cm) als Skalierungsfaktor benötigt.
2. **[PRIO MITTEL] Kamera-Framerate (FPS-Kompensation):**
   - Webcams liefern meist nur 30 FPS (~10 Frames für den gesamten Wurfzyklus). Empfehlung: Für den Release-Punkt sollten Handy-Zeitlupenaufnahmen mit 60 oder 120 FPS priorisiert werden.
3. **[PRIO NIEDRIG] Autonome Wurf-Phasenerkennung:**
   - Aktuell wählt der Spieler Stand- und Release-Bild manuell per Button. Eine automatische Erkennung der Wurfumkehr (Peak der Handgelenksbeschleunigung) kann diese Phasen künftig vollautomatisch einloggen.

---

## [2026-10-28] – Architektur-Grundstein & Plattform-Konsolidierung

### 🎯 Kernsystem & Ranking
- **Plattform-Konsolidierung:** Übertragung aller BBDV-Ranking-Algorithmen und der Spielerdatenbank aus dem Python/Streamlit-Kern in die moderne Next.js 16.4 Web-Plattform (`lionsweyhausen-web`).
- **BBDV-Plausibilitätskriterien:** Verankerung der Best-of-5 First-to-3 Regeln, Max. 2 Einzel pro Spieltag und Bogey-Number-Ausschluss (159, 162, 163, 165, 166, 168, 169) in den Agenten-Leitplanken.

### 🛡️ Leitplanken & Autonome Entwicklung
- **`AGENTS.md` eingeführt:** Verbindliche Rollentrennung (Orchestrator, Analyst, Coding-Agent, QA+Security, Game-Optimizer, UI-Cleaner), Schutz der Ranking-Logik durch doppelte Bestätigung (§8) und strenge Datenschutzregeln für Video-Daten (§10).
- **Automations-Sidecar:** Einrichtung des Antigravity-Automations-Sidecars (`sidecar.json`) für den täglichen autonomen Zyklus um 02:00 Uhr.
