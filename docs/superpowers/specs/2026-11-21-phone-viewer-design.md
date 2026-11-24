# Handy-Version, Schritt 1: Anschauen und Hochladen

Issue: NEXT876/Mediavault#21. Diese Datei wird gelöscht, sobald die Umsetzung fertig ist.

## Warum

Ben will seine Bibliothek auf dem iPhone ansehen, wenn der PC aus ist, und vom
Handy neue Bilder und Videos hinzufügen, die danach in der PC-Bibliothek landen.
Langfristig soll die Handy-Version fast alles können, was die PC-Version kann,
mit Schwerpunkt auf dem Anschauen. Dieser erste Schritt ist bewusst klein:
nur ansehen und hochladen. Danach wird weiter entschieden.

## Ziele

- Die Mediendateien aus dem MEGA-Ordner der Bibliothek als Raster mit
  Vorschaubildern zeigen, sortiert nach Datum (neueste zuerst) oder Name.
- Bilder und Videos im Vollbild öffnen; Wischen links/rechts zum
  nächsten/vorherigen Eintrag; Videos abspielen und spulen.
- Bilder und Videos aus der iPhone-Fotomediathek in den MEGA-Ordner hochladen.
- Läuft als installierte PWA auf dem iPhone (iOS 18, Safari).
- Geöffnete Dateien und Vorschaubilder bleiben auf dem Handy gespeichert und
  werden nicht erneut geladen.

## Nicht-Ziele (später)

- Wertungen, Titel, Gruppen, Suche, Zufall, Glücksrad: braucht die
  PC-Datenbank auf dem Handy (Weg B), kommt danach.
- Etwas am Handy ändern oder löschen.
- Offline-Start ohne Netz (Service Worker).
- Import-Plugins.
- Android, Desktop-Browser: dürfen funktionieren, werden aber nicht gezielt getestet.

## Anti-Ziele

- Die Medien oder Zugangsdaten landen irgendwo außer in MEGA und auf dem Handy
  (GitHub Pages enthält nur Code).
- Das Passwort wird gespeichert.
- Am PC geht etwas kaputt oder es muss PC-Code geändert werden.

## Rahmen

- Statische Seite ohne Build-Schritt, ausgeliefert über GitHub Pages aus
  diesem Repo. `megajs` 1.3.9 von jsdelivr (im Spike auf Bens iPhone geprüft:
  Login, Entschlüsseln, Teil-Download, Upload).
- iOS gibt der PWA etwa 39 GB und gewährt dauerhaften Speicher
  (`navigator.storage.persist()`), die Bibliothek ist unter 20 GB.
- Der PC nimmt neue Dateien im Bibliotheksordner beim Start selbst auf
  (`MainWindow.auto_scan_folder` → `library.scan`, durchsucht Unterordner
  rekursiv, nicht im KI-Modus). Endungen, die der PC kennt:
  Bilder `.png .jpg .jpeg .bmp .webp`, Videos `.mp4 .mkv .avi .mov .webm .m4v .wmv`.
- Der PC gleicht den Bibliotheksordner mit MEGA ab, über die Synchronisierung
  der MEGA-Desktop-App (beide Richtungen). Ben richtet sie direkt für seinen
  bisherigen lokalen Bibliotheksordner ein, damit die gespeicherten absoluten
  Pfade und Wertungen gültig bleiben. Configs ohne Abgleich bleiben nur lokal
  und sind vom Handy aus nicht sichtbar. Das README bekommt dafür einen Abschnitt.
- Spike-Langzeittest bestanden: Cache nach 3 Tagen noch da, Login mit
  gespeicherter Sitzung ohne Passwort funktioniert.

## Wege

| Weg | Was | Abwägung |
|-----|-----|----------|
| **A (gewählt)** | Handy zeigt nur die Dateien im MEGA-Ordner, lädt hoch. PC-Code bleibt unverändert. | Klein, kein Risiko für PC-Daten; dafür keine Wertungen am Handy. |
| B | Wie A, plus PC legt eine Kopie der Datenbank in den Ordner, Handy zeigt Wertungen und Gruppen. | Fühlt sich mehr nach MediaVault an, aber neuer PC-Code, gut doppelter Aufwand. |

Ben hat A gewählt, weil es genau „anschauen und hochladen“ abdeckt und B
später ohne Umbau draufpasst.

## Entscheidungen

Von Ben:
- Weg A, nur anschauen und hochladen.

Von Claude (bitte prüfen):
- **Ort im Repo:** `mobile/` (`index.html`, `app.js`, `manifest.json`, Icon).
  Reine Logik ohne DOM (Dateityp erkennen, sortieren, eindeutigen
  Dateinamen bilden) in `mobile/logic.js`, getestet mit `node --test`
  (`mobile/logic.test.js`, keine Abhängigkeiten); CI bekommt einen Schritt dafür.
- **Login:** E-Mail und Passwort einmal eingeben, danach wird nur die Sitzung
  (ohne Passwort) im Speicher der Seite gehalten. Abmelden-Knopf löscht sie
  samt allen zwischengespeicherten Dateien.
- **Ordner:** Name beim ersten Start eingeben, wird gemerkt. Die Ansicht zeigt
  alle Mediendateien darin, auch in Unterordnern, wie der PC-Scan.
- **Uploads** gehen in den Unterordner `Vom Handy` (wird bei Bedarf angelegt).
  Der PC-Scan findet sie dort, und sie mischen sich nicht mit PC-Dateien
  gleichen Namens. Gibt es den Namen schon, wird `name-2.jpg`, `name-3.jpg` usw. vergeben
  (wie `transfer.unique_destination` am PC). Dateien mit Endungen, die der PC nicht
  kennt (z. B. `.heic`), werden abgelehnt mit Hinweis. Safari wandelt Fotos
  aus der Mediathek beim Auswählen normalerweise in JPEG um. Fortschritt pro
  Datei; nach dem Upload erscheinen sie sofort im Raster.
- **Vorschaubilder:** baut das Handy selbst, etwa 300 px, als JPEG, gespeichert
  in der Cache Storage (Schlüssel: MEGA-Knoten-ID). Bilder: die Datei wird
  geladen (meist klein, danach liegt sie auch fürs Vollbild bereit) und über
  Canvas verkleinert. Videos: `megajs` kann MEGAs eigene Vorschaubilder nicht
  laden, und ein Video-Vorschaubild bräuchte das ganze Video. Deshalb zeigt
  das Raster für Videos einen Platzhalter (▶ und Dateiname), bis das Video
  einmal geöffnet wurde; dann wird aus dem geladenen Video ein Bild bei etwa
  2 s erzeugt (wie der PC). Vom Handy hochgeladene Dateien bekommen ihr
  Vorschaubild sofort aus der lokalen Datei. Erzeugt wird der Reihe nach für
  Einträge, die ins Bild scrollen.
- **Volle Dateien:** werden beim Öffnen komplett geladen und in der Cache
  Storage abgelegt; beim nächsten Öffnen kommen sie von dort. Kein Vorabladen
  der ganzen Bibliothek. Fortschrittsanzeige beim Laden.
- **Videos** werden komplett geladen und dann als Blob abgespielt (im Spike
  getestet, Spulen sofort). `shortcut:` sehr große Videos liegen dabei ganz im
  Speicher; Streaming über Teil-Downloads erst, wenn das zum Problem wird.
- **Aussehen:** dunkles Design passend zum dunklen PC-Theme, Raster mit 3
  Spalten, Vollbildansicht schwarz. Keine Bibliothek, schlichtes CSS.
- **Pages:** dient jetzt aus `feature/phone-pwa-spike`. Nach dem Merge stellt
  Ben Pages auf `develop` um (später `main`); die URL wird
  `https://next876.github.io/Mediavault/mobile/`.
- **Spike:** `spike/` wird im selben Branch gelöscht.

## Für den Umsetzenden offen

- Aufteilung von `app.js` in Funktionen, CSS-Details, Texte der Oberfläche
  (Deutsch, wie die PC-App).
- Wie viele Vorschaubilder gleichzeitig erzeugt werden.
