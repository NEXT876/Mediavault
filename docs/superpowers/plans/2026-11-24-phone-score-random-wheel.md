# Handy-Version Schritt 2: Score, Zufall, Glücksrad, MediaVault-Look

Issue: NEXT876/Mediavault#21. Baut auf `mobile/` (Schritt 1) auf. Wird gelöscht,
sobald umgesetzt.

## Ausgangslage

- Die Handy-App sieht nur die Dateien im MEGA-Ordner. Score, Gruppen, Titel,
  Ansichten stehen in der PC-Datenbank `~/.mediavault/data/<config>.json`, die
  nicht in MEGA liegt. Pfade darin sind bei lokalen Configs absolut.
- Score am PC: Bewertung 1–5 ändert den Score um −10/−5/0/+5/+10 (1–100),
  zählt Ansicht und Bewertung hoch, setzt `last_watched`; dazu manuelles Setzen.
- Zufall am PC: Normal/Smart für die aktuelle Ansicht, Alles/Alles Smart,
  Aus Gruppen; Smart-Gewicht `(score+20) · 0,85^ansichten`, ×0,3 wenn heute
  gesehen, ×0,6 wenn diese Woche; die letzten 2 Treffer sind gesperrt.
- Glücksrad am PC: Einträge (eine Zeile je Eintrag), gespeicherte Listen in
  `~/.mediavault/wheel_configs.json`, „Alle Gruppen“/„Gruppen wählen“,
  12 Segmentfarben, Zeiger oben, Drehung 3,9–5,3 s mit OutQuart.
- Look am PC: Paletten dark/light/neon in `gui/theme.py`, Karten mit
  Score-Badge (Stufen ≥75/≥50/≥25/sonst), Sidebar „Ansichten / Zufall / Extras“.

## Architektur: Daten zwischen PC und Handy

Ein Ordner `_MediaVault` im Bibliotheksordner (kein Punkt am Anfang: die
MEGA-App synchronisiert Namen mit „.“ standardmäßig nicht).

- **PC → Handy:** `_MediaVault/phone.json` (Export). Pro Eintrag: Pfad relativ
  zum Bibliotheksordner, Titel, Typ, Score, Gruppe, Ansichten, letzte Ansicht,
  Bewertungen. Dazu Gruppenliste, gespeicherte Glücksrad-Listen, Theme-Name und
  `applied` (Namen bereits übernommener Handy-Dateien).
- **Handy → PC:** jede Sammlung von Änderungen ist eine neue Datei
  `_MediaVault/changes/<zeit>-<zufall>.json` mit Ereignissen
  `rate` (1–5), `set` (Score), `view`, je mit Pfad und Zeitpunkt. Das Handy
  überschreibt nie eine Datei, der PC ist der einzige Schreiber seiner
  Datenbank. Dadurch keine Sync-Konflikte.
- **PC übernimmt** beim Start, beim Config-Wechsel und beim Stick-Anstecken
  (nach dem Ordner-Scan, damit vom Handy hochgeladene Dateien schon Einträge
  haben): Ereignisse in Zeitreihenfolge anwenden (gleiche Regeln wie die
  Bewertungsknöpfe am PC) → Datenbank speichern → Export mit `applied`
  schreiben → Änderungsdateien löschen. Schon in `applied` genannte Dateien
  werden übersprungen (kein doppeltes Anwenden nach Absturz). Beim Schließen
  schreibt der PC den Export neu.
- **Handy zeigt** Export + eigene noch nicht übernommene Ereignisse (lokale
  Warteschlange und hochgeladene Dateien, die noch nicht in `applied` stehen).
  Hochladen gebündelt: wenn die App in den Hintergrund geht und spätestens 20 s
  nach der letzten Änderung; fehlgeschlagene Uploads bleiben in der
  Warteschlange.
- Ordner ohne `_MediaVault/phone.json` (keine MediaVault-Config): ansehen,
  hochladen, Zufall (nur Normal) und Glücksrad gehen, Score wird nicht gezeigt.

## Aufgaben

1. **PC: `mediavault/phone.py`** – `write_export(db, location, …)`,
   `apply_changes(db, location) -> int`; eingehängt in
   `MainWindow.auto_scan_folder` (danach `phone.sync`) und `closeEvent`.
   Tests `tests/test_phone.py` (Export-Format, Pfade lokal/Stick, Einträge
   außerhalb des Ordners übersprungen, rate/set/view, Reihenfolge,
   Ereignis für unbekannten Pfad wird verworfen und geloggt, `applied` verhindert
   Doppelanwendung, kaputte Datei wird beiseitegelegt statt Absturz).
2. **Handy-Logik (`mobile/logic.js`)** – relativer Pfad eines Knotens,
   Ereignisse anwenden (identisch zum PC), Score-Stufe, Smart-Gewichte und
   Zufallswahl mit Sperre der letzten 2, Glücksrad-Zielwinkel. Tests.
3. **Handy-Daten (`mobile/mega.js`)** – Bibliothekswurzel finden (Ordner oder
   Vorfahre mit `_MediaVault/phone.json`), Export laden, Änderungsdatei
   hochladen; `_MediaVault` in Ordnerliste und Raster ausblenden.
Reihenfolge der Umsetzung: 1, 2+3, 7 (Gerüst mit Navigation), 4, 5, 6, 8.

4. **Score in der App** – Badge auf jeder Kachel; in der Vollbildansicht
   „Score 86 · 3× angesehen · 2 Bewertungen“, Knöpfe 1–5 und Score direkt
   setzen; Öffnen zählt als Ansicht; Warteschlange + Upload.
5. **Zufall** – Normal, Smart (aktueller Tab), Alles, Alles Smart, Aus Gruppen;
   öffnet die Vollbildansicht mit „🎲 Nochmal“.
6. **Glücksrad** – Canvas-Rad mit den 12 PC-Farben, Zeiger, Drehen per Knopf
   oder Tippen aufs Rad, Ergebnis-Karte, Eintrags-Editor, PC-Listen,
   Alle Gruppen / Gruppen wählen; Editor-Inhalt wird gemerkt.
7. **MediaVault-Look und Bedienung** – Paletten aus `theme.py` als
   CSS-Variablen, Karten/Badges/Knöpfe wie am PC, Titel „MediaVault“.
   iPhone: Navigation unten (Bilder, Videos, Zufall, Glücksrad, Mehr),
   Daumenbereich, ≥44 px Ziele. iPad/Querformat: Seitenleiste wie am PC,
   mehr Rasterspalten, Rad und Editor nebeneinander.
8. **Prüfen** – `/gui-design-review` mit Screenshots iPhone und iPad,
   `/ponytail:ponytail-review` des Branches, Funde beheben, README,
   Spec/Plan/Spike löschen, PR nach `develop` (nicht mergen).

Umsetzung: je Aufgabe ein Subagent (effort high), danach Review.

## Entscheidungen von Ben

Export + Änderungsdateien; Öffnen am Handy zählt als Ansicht; Glücksrad-Listen
vom PC nur lesen; Farbschema wie am PC eingestellt (Export), ohne Export Dunkel.
