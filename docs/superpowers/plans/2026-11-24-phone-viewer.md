# Handy-Version Schritt 1 (Anschauen + Hochladen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine installierbare iPhone-PWA in `mobile/`, die die Mediendateien eines MEGA-Ordners als Raster zeigt, im Vollbild öffnet und neue Bilder/Videos in den Unterordner `Vom Handy` hochlädt.

**Architecture:** Statische Seite ohne Build-Schritt (ES-Module), ausgeliefert über GitHub Pages. `logic.js` enthält reine, mit `node --test` getestete Funktionen; `mega.js` kapselt Sitzung, Download mit Cache und Upload über `megajs`; `app.js` baut die Oberfläche. Am PC ändert sich kein Code.

**Tech Stack:** Vanilla JS (ES2022, Module), `megajs` 1.3.9 von `https://cdn.jsdelivr.net/npm/megajs@1.3.9/dist/main.browser-es.mjs`, Cache Storage, `node --test` (Node 22, keine npm-Abhängigkeiten).

**Spec:** `docs/superpowers/specs/2026-11-21-phone-viewer-design.md`

## Global Constraints

- Oberfläche auf Deutsch; Code, Bezeichner und Commit-Messages auf Englisch.
- Bild-Endungen genau `.png .jpg .jpeg .bmp .webp`, Video-Endungen genau `.mp4 .mkv .avi .mov .webm .m4v .wmv` (aus `mediavault/scanner.py:17-18`), Vergleich ohne Groß-/Kleinschreibung.
- Upload-Ordner heißt genau `Vom Handy`, liegt direkt im gewählten Bibliotheksordner.
- Namenskollision: `name-2.ext`, `name-3.ext` … wie `mediavault/transfer.py:unique_destination`; Vergleich ohne Groß-/Kleinschreibung (Windows-PC).
- Das Passwort wird nie gespeichert. Gespeichert werden nur: Sitzung (`localStorage['mv-session']`, `options` nur mit `email`), Ordnername (`localStorage['mv-folder']`), Sortierung (`localStorage['mv-sort']`), Caches `mv-files` und `mv-thumbs`.
- Vorschaubilder: längste Kante 300 px, JPEG Qualität 0.8. Video-Vorschaubild bei `min(2, duration/2)` Sekunden.
- Keine Bibliotheken außer `megajs`, kein Build-Schritt, kein Service Worker.
- Commits: `--author "Ben Waibel <103282803+NEXT876@users.noreply.github.com>"`, Message `<Typ>: <was>`, letzte Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `feature/phone-pwa-spike` (GitHub Pages baut aus diesem Branch, Root).

## Review Focus

1. Abgebrochener Download (App geschlossen, Netz weg) darf keinen halben Eintrag in `mv-files` hinterlassen: `cache.put` erst nach vollständigem Download (Task 2, Test über Fake-Stream in der Smoke-Prüfung).
2. Abgelaufene oder ungültige Sitzung (Passwort am PC geändert): `restoreSession` gibt `null` zurück, löscht `mv-session`, App zeigt Login statt eines Fehlers (Task 2).
3. Mehrere gleichnamige Dateien in einem Upload (iPhone liefert oft mehrfach `image.jpg`): jede bekommt einen eigenen Namen (Task 1, Test `uniqueName` mit wachsendem `taken`).
4. Nicht unterstützte Datei im Upload (`.heic`, `.pdf`): wird übersprungen und gemeldet, die übrigen laden trotzdem hoch (Task 4).
5. Ordner nicht gefunden oder leer: verständliche Meldung mit Knopf „Ordner ändern“, kein leerer Bildschirm (Task 3).

---

## Dateien

| Datei | Aufgabe |
|---|---|
| `mobile/logic.js` | Reine Funktionen: Dateityp, MIME-Typ, Medien sammeln, Ordner finden, sortieren, eindeutiger Name |
| `mobile/logic.test.js` | `node --test` für `logic.js` |
| `mobile/mega.js` | Login/Sitzung/Abmelden, `getFile`, `getThumb`, `upload` |
| `mobile/app.js` | Oberfläche: Login, Ordnerwahl, Raster, Vollbild, Upload |
| `mobile/index.html` | Markup, CSS, Meta-Tags für iOS, lädt `app.js` |
| `mobile/manifest.json`, `mobile/icon-180.png` | PWA-Installation |
| `.github/workflows/ci.yml` | Schritt `node --test mobile/` |
| `README.md` | Abschnitt „Phone viewer“ |
| `spike/` | wird gelöscht |

Prüfung der Oberfläche: Im Container sind MEGA und jsdelivr nicht erreichbar. Für die Smoke-Prüfung (Playwright, nur lokal, nicht im Repo) leitet `page.route` die `megajs`-URL auf eine Fake-Datei im Scratchpad um, die `Storage` mit einem festen Ordnerbaum nachbildet (Knoten mit `name`, `directory`, `children`, `timestamp`, `size`, `nodeId`, `download()`, `upload()`, `mkdir()`). Die echte Abnahme macht Ben auf dem iPhone über die Pages-URL `https://next876.github.io/Mediavault/mobile/`.

---

### Task 1: Reine Logik mit Tests und CI

**Files:**
- Create: `mobile/logic.js`, `mobile/logic.test.js`
- Modify: `.github/workflows/ci.yml` (nach dem Schritt „Tests“)

**Interfaces:**
- Produces (alle als named exports aus `mobile/logic.js`):
  - `UPLOAD_FOLDER = 'Vom Handy'`
  - `mediaKind(name: string): 'image' | 'video' | null`
  - `mimeType(name: string): string` – z. B. `image/jpeg`, `video/quicktime`, `video/mp4`; unbekannt → `application/octet-stream`
  - `collectMedia(folder: {children?: Node[]}): Node[]` – alle Dateien mit `mediaKind !== null`, rekursiv durch Unterordner (`directory: true`), gibt die Original-Objekte zurück
  - `findFolder(nodes: Iterable<Node>, name: string): Node | null` – nur `directory`, Name getrimmt und ohne Groß-/Kleinschreibung verglichen
  - `sortEntries(nodes: Node[], mode: 'date' | 'name'): Node[]` – neues Array; `date`: `timestamp` absteigend, Gleichstand nach Name; `name`: `localeCompare(…, 'de', {numeric: true, sensitivity: 'base'})`
  - `uniqueName(name: string, taken: Set<string>): string` – `taken` enthält Namen in Kleinbuchstaben; Funktion fügt den gewählten Namen (klein) selbst zu `taken` hinzu

- [ ] **Step 1: Tests schreiben** (`mobile/logic.test.js`, `import test from 'node:test'`, `import assert from 'node:assert/strict'`)

```js
test('mediaKind', () => {
  assert.equal(mediaKind('A.JPG'), 'image')
  assert.equal(mediaKind('clip.mov'), 'video')
  assert.equal(mediaKind('foto.heic'), null)
  assert.equal(mediaKind('ohne_endung'), null)
})
test('collectMedia walks subfolders and skips other files', () => {
  const tree = { children: [
    { name: 'a.png', directory: false },
    { name: 'notes.txt', directory: false },
    { name: 'Vom Handy', directory: true, children: [{ name: 'b.mp4', directory: false }] },
  ] }
  assert.deepEqual(collectMedia(tree).map(n => n.name), ['a.png', 'b.mp4'])
})
test('findFolder ignores case and surrounding spaces', () => {
  const nodes = [{ name: 'MediaVault ', directory: true }, { name: 'mediavault.txt', directory: false }]
  assert.equal(findFolder(nodes, 'mediavault').name, 'MediaVault ')
  assert.equal(findFolder(nodes, 'fehlt'), null)
})
test('sortEntries by date (newest first) and by name (numeric)', () => {
  const n = [{ name: 'b10.jpg', timestamp: 1 }, { name: 'b2.jpg', timestamp: 3 }, { name: 'a.jpg', timestamp: 2 }]
  assert.deepEqual(sortEntries(n, 'date').map(x => x.name), ['b2.jpg', 'a.jpg', 'b10.jpg'])
  assert.deepEqual(sortEntries(n, 'name').map(x => x.name), ['a.jpg', 'b2.jpg', 'b10.jpg'])
})
test('uniqueName counts up like the PC and remembers its picks', () => {
  const taken = new Set(['image.jpg'])
  assert.equal(uniqueName('IMAGE.jpg', taken), 'IMAGE-2.jpg')
  assert.equal(uniqueName('image.jpg', taken), 'image-3.jpg')
  assert.equal(uniqueName('neu.mov', taken), 'neu.mov')
})
```

- [ ] **Step 2:** `node --test mobile/` → FAIL (Modul fehlt).
- [ ] **Step 3:** `mobile/logic.js` mit den Exports oben implementieren.
- [ ] **Step 4:** `node --test mobile/` → alle 5 Tests PASS.
- [ ] **Step 5:** In `.github/workflows/ci.yml` nach „Tests“ einfügen: `- name: Mobile tests` / `run: node --test mobile/` (Node ist auf `ubuntu-latest` vorinstalliert).
- [ ] **Step 6: Commit** `Feature: Phone viewer logic with tests`

---

### Task 2: MEGA-Zugriff (Sitzung, Dateien, Vorschaubilder, Upload)

**Files:**
- Create: `mobile/mega.js`

**Interfaces:**
- Consumes: `mimeType`, `mediaKind`, `uniqueName`, `UPLOAD_FOLDER` aus Task 1
- Produces (named exports):
  - `login(email: string, password: string, code?: string): Promise<Storage>` – `new Storage({email, password, secondFactorCode}).ready`, speichert danach `storage.toJSON()` mit `options = {email}` in `mv-session`
  - `restoreSession(): Promise<Storage | null>` – ohne `mv-session` → `null`; sonst `Storage.fromJSON(json)`, `await storage.reload(true)`; bei Fehler `mv-session` löschen und `null`
  - `logout(): Promise<void>` – entfernt `mv-session`, `mv-folder`, `mv-sort`, `caches.delete('mv-files')`, `caches.delete('mv-thumbs')`
  - `getFile(node, onProgress?: (loaded: number, total: number) => void): Promise<Blob>` – erst `mv-files` (Schlüssel `'./f/' + node.nodeId`), sonst `node.download({})` als Stream: `data`-Chunks sammeln, `progress`-Event (`{bytesLoaded, bytesTotal}`) an `onProgress`, bei `end` Blob mit `mimeType(node.name)` bauen, **dann** in den Cache legen; `error` → reject
  - `cachedThumb(node): Promise<Blob | null>` – nur Cache `mv-thumbs` (Schlüssel `'./t/' + node.nodeId`)
  - `makeThumb(node, blob: Blob): Promise<Blob>` – Bild: `createImageBitmap(blob)`; Video: `<video muted playsinline>` mit Object-URL, nach `loadedmetadata` auf `min(2, duration/2)` springen, nach `seeked` zeichnen; auf Canvas längste Kante 300 px, `canvas.toBlob(…, 'image/jpeg', 0.8)`, in `mv-thumbs` ablegen, Object-URL freigeben
  - `upload(folder, file: File, onProgress?): Promise<Node>` – Unterordner `UPLOAD_FOLDER` in `folder.children` suchen, sonst `folder.mkdir(UPLOAD_FOLDER)`; Name per `uniqueName(file.name, taken)` mit `taken` aus den Kindnamen des Upload-Ordners (klein); `uploadFolder.upload({name, size: file.size}, new Uint8Array(await file.arrayBuffer())).complete`; danach `makeThumb(node, file)` und die Datei selbst in `mv-files` legen
- `persist`: beim ersten erfolgreichen `login`/`restoreSession` einmal `navigator.storage.persist()` aufrufen (Ergebnis ignorieren).

- [ ] **Step 1:** `mobile/mega.js` mit den Exports oben schreiben; `import { Storage } from 'https://cdn.jsdelivr.net/npm/megajs@1.3.9/dist/main.browser-es.mjs'`. `shortcut:`-Kommentar an `getFile`: ganzes Video im Speicher, Streaming über Teil-Downloads erst bei Problemen mit großen Videos.
- [ ] **Step 2: Smoke-Prüfung** mit Fake-`megajs` (siehe oben) in Playwright: `login` → `mv-session` enthält kein `password`; `getFile` zweimal → `download()` nur einmal aufgerufen; Fake-Stream, der `error` statt `end` sendet → `getFile` rejectet und `caches.open('mv-files')` hat keinen Eintrag; `restoreSession` mit Fake, dessen `reload` wirft → `null` und `mv-session` entfernt; `upload` zweimal mit `image.jpg` → Namen `image.jpg`, `image-2.jpg`, `mkdir` nur einmal.
- [ ] **Step 3: Commit** `Feature: MEGA session, cached downloads and upload for phone viewer`

---

### Task 3: Oberfläche: Login, Ordner, Raster, Vollbild

**Files:**
- Create: `mobile/index.html`, `mobile/app.js`, `mobile/manifest.json`, `mobile/icon-180.png`

**Interfaces:**
- Consumes: alles aus Task 1 und 2
- Produces: `app.js` exportiert nichts; Task 4 ergänzt `app.js` um den Upload und braucht dafür `state.storage`, `state.folder`, `state.entries` und die Funktion `renderGrid()`.

Ablauf und Inhalt:
- `index.html`: Meta `viewport` mit `viewport-fit=cover`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title` „MediaVault“, `apple-touch-icon` → `icon-180.png`, `manifest`. Dunkles CSS (Hintergrund `#111`, Text `#eee`), Abstände mit `env(safe-area-inset-*)`. Drei Bereiche: Login-Formular (E-Mail, Passwort, optional 2FA), Ordnerwahl (Textfeld + Knopf), Bibliothek (Kopfleiste mit Sortier-Umschalter „Neueste / Name“, Hochladen-Knopf, Abmelden; Raster mit 3 Spalten, quadratische Kacheln, `object-fit: cover`). Vollbild-Ebene: schwarz, Bild (`object-fit: contain`) bzw. `<video controls playsinline>`, Schließen-Knopf, Fortschrittsbalken beim Laden.
- `manifest.json` wie `spike/manifest.json`, Name „MediaVault“, `short_name` „MediaVault“. `icon-180.png`: 180×180, einfarbig `#111` mit hellem „MV“, einmal per Pillow erzeugt.
- Start: `restoreSession()`; `null` → Login. Nach Login: `mv-folder` gesetzt → Bibliothek, sonst Ordnerwahl. Ordner über `findFolder(Object.values(storage.files), name)`. Nicht gefunden → Meldung „Ordner „…“ nicht gefunden.“ in der Ordnerwahl; leer → Meldung „Keine Bilder oder Videos in diesem Ordner.“ mit Knopf „Ordner ändern“.
- Raster: `sortEntries(collectMedia(folder), mv-sort || 'date')`. Kachel: `cachedThumb` → Bild; sonst Bild-Einträge per `IntersectionObserver` beim Sichtbarwerden in eine Warteschlange (max. 2 gleichzeitig): `getFile` → `makeThumb`. Video ohne Vorschaubild: Platzhalter mit ▶ und Dateiname. Fehler beim Laden einer Kachel: Kachel zeigt ⚠ statt des Bildes, Rest läuft weiter.
- Vollbild: Tippen auf Kachel öffnet; `getFile` mit Fortschritt; danach Bild oder Video (Object-URL, beim Schließen/Wechsel freigeben). Bei Videos ohne Vorschaubild danach `makeThumb` und Kachel aktualisieren. Wischen links/rechts (Touch-Start/-Ende, mind. 50 px horizontal) wechselt zum nächsten/vorherigen Eintrag der sortierten Liste; Pfeiltasten genauso.
- Abmelden: Bestätigung „Abmelden und alle gespeicherten Dateien auf diesem Gerät löschen?“, dann `logout()` und Login zeigen.
- Netzfehler bei Login: Meldung mit der Fehlermeldung von `megajs` unter dem Formular.

- [ ] **Step 1:** Dateien schreiben.
- [ ] **Step 2: Smoke-Prüfung** (Playwright, Fake-`megajs`, iPhone-Emulation `devices['iPhone 13']`): Login → Ordnerwahl → Ordner eingeben → Raster zeigt alle Fake-Dateien in Datumsreihenfolge; Umschalter „Name“ ändert die Reihenfolge und bleibt nach Neuladen; Seite neu laden → ohne Login direkt Raster; falscher Ordnername → Meldung; Kachel antippen → Vollbild, Wischen → nächster Eintrag; keine `pageerror`-Events. Screenshot von Raster und Vollbild ansehen.
- [ ] **Step 3: Commit** `Feature: Phone viewer UI with grid and fullscreen view`

---

### Task 4: Hochladen

**Files:**
- Modify: `mobile/app.js`, `mobile/index.html` (verstecktes `<input type="file" accept="image/*,video/*" multiple>`)

**Interfaces:**
- Consumes: `upload` (Task 2), `mediaKind` (Task 1), `state`, `renderGrid()` (Task 3)

- Hochladen-Knopf öffnet die Dateiauswahl. Dateien mit `mediaKind(file.name) === null` werden nicht hochgeladen; am Ende Meldung „Übersprungen (Format kennt MediaVault nicht): a.heic, b.pdf“. Übrige nacheinander mit `upload(state.folder, file, …)`; Anzeige „Lade hoch 2/5 …“ mit Fortschritt. Ein Fehler bei einer Datei wird gesammelt und am Ende genannt („Fehlgeschlagen: …“), die restlichen laufen weiter. Danach `renderGrid()`, neue Einträge stehen bei Sortierung „Neueste“ oben.

- [ ] **Step 1:** Implementieren.
- [ ] **Step 2: Smoke-Prüfung:** Upload von `a.jpg`, `a.jpg`, `x.heic` über `setInputFiles` → Fake-Ordner `Vom Handy` enthält `a.jpg`, `a-2.jpg`; Meldung nennt `x.heic`; beide neuen Kacheln zeigen sofort ein Vorschaubild; ein Fake-Upload, der wirft → Meldung „Fehlgeschlagen“, die andere Datei ist trotzdem da.
- [ ] **Step 3: Commit** `Feature: Upload from phone into "Vom Handy" folder`

---

### Task 5: Aufräumen, README, Abnahme auf dem iPhone

**Files:**
- Delete: `spike/`
- Modify: `README.md` (neuer Abschnitt `## Phone viewer` nach `## Cloud storage with rclone`)
- Delete (nach Bens Abnahme): `docs/superpowers/specs/2026-11-21-phone-viewer-design.md`, `docs/superpowers/plans/2026-11-24-phone-viewer.md`

- README-Abschnitt (Englisch, kurz): was die Handy-Version kann (ansehen, hochladen nach `Vom Handy`); Einrichtung: MEGA-Desktop-App, Synchronisierung für den bestehenden Bibliotheksordner einrichten (Dateien nicht verschieben, sonst passen die gespeicherten Pfade nicht mehr), URL öffnen, „Zum Home-Bildschirm“, mit MEGA anmelden, Ordnernamen eingeben; Uploads erscheinen am PC beim nächsten Start von MediaVault (nicht in KI-Configs). Hinweis: nur Configs, deren Ordner mit MEGA abgeglichen wird, sind auf dem Handy sichtbar.

- [ ] **Step 1:** `spike/` löschen, README-Abschnitt schreiben. `node --test mobile/` → PASS; `ruff check mediavault tests` und `pytest -q` → unverändert grün.
- [ ] **Step 2: Commit + Push** `Docs: Phone viewer setup, remove spike`; warten bis „pages build and deployment“ für den Commit `success` meldet.
- [ ] **Step 3: Abnahme durch Ben** auf dem iPhone unter `https://next876.github.io/Mediavault/mobile/`: Login, Raster, Vollbild, Wischen, Video spulen, Upload eines Fotos und eines Videos, danach PC: MEGA-App hat abgeglichen, MediaVault zeigt die Dateien nach dem Start.
- [ ] **Step 4:** Spec und Plan löschen, Commit `Chore: Remove finished phone viewer spec and plan`, PR nach `develop` mit Vorlage `.github/pull_request_template.md`, Titel `Feature: Phone viewer with upload (step 1)`. Ben danach: GitHub Pages auf `develop` umstellen.
