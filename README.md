# DAS BIERSPIEL

*60 Minuten. Alle müssen liefern!*

Das zeitbasierte Gruppenspiel zum Vorwärtskommen.

Ein zeitbasiertes Gruppenspiel als Web-App. Mehrere Teilnehmer müssen innerhalb jeder Runde eine Aufgabe in der echten Welt erfüllen. Wer geliefert hat, bekommt einen grünen **Haken**. Wer am Ende der Runde keinen Haken hat, kassiert ein **X**.

**Spielen:** https://rzcwg55cv2-cloud.github.io/dasspiel/

Die App läuft komplett im Browser, braucht kein Konto und kein Internet während des Spiels und lässt sich auf dem Smartphone als App installieren.

## Spielregeln

| | Normal | Malte Spezial |
|---|---|---|
| Rundendauer | 10 Minuten | 5 Minuten |
| Erste Spielphase | 60 Minuten (6 Runden) | 60 Minuten (12 Runden) |
| Jede Verlängerung | +30 Minuten (3 Runden) | +30 Minuten (6 Runden) |

1. Teilnehmer eintragen, Modus wählen, **SPIEL STARTEN**.
2. Wer seine Aufgabe erfüllt hat, wird angetippt und bekommt einen grünen Haken. Erneutes Antippen nimmt den Haken wieder weg, solange die Runde läuft.
3. Bei 00:00 wird die Runde automatisch ausgewertet. Wer keinen Haken hat, bekommt ein X. Die nächste Runde startet sofort.
4. Nach 60 Minuten entscheidet die Gruppe: verlängern (+30 Minuten) oder **FEIERABEND**. Während der Entscheidung steht die Zeit still. Verlängern geht beliebig oft.
   Je nachdem, wie viele X es bisher gab, kommt dabei ein passender Spruch (siehe unten).
5. Am Ende gibt es eine Rangliste, Statistiken und den kompletten Verlauf jeder Runde. Die Rangliste richtet sich nach der Gesamtzeit bis zum Haken: Pro Runde zählt die Zeit vom Rundenbeginn bis zum (zuletzt gesetzten) Haken, ein X zählt die volle Rundenzeit. Wer insgesamt am schnellsten geliefert hat, gewinnt.

Wer auf dem Startbildschirm auf den Kreis mit der Initiale tippt, kann stattdessen einen **Avatar** (Emoji) wählen.

Ein Gerät dient als Spielzentrale: Dort werden alle Teilnehmer eingetragen und alle Haken vergeben.

Eine kurze **Spielanleitung** öffnet sich auf dem Startbildschirm über „SO GEHT'S“ und jederzeit über das Menü („Spielanleitung“) – auch mitten im Spiel.

Unter dem Start-Button steht klein der **Bierbedarf** für die ersten 60 Minuten: 0,2 l pro Person und Runde ihres Takts, also z. B. 4 Personen im Modus Normal = 24 × 0,2 l = 4,8 l. Malte Spezial braucht doppelt so viel, Personen im 15-Minuten-Takt zählen mit 4 statt 6 Runden. Strafbiere sind nicht eingerechnet. Was eine Verlängerung um 30 Minuten zusätzlich braucht, steht erst bei der Verlängerungsfrage – dort samt der noch offenen Strafbiere.

Während des Spiels gibt es keinen Countdown: In der Mitte steht eine runde Uhr mit Sekundenzeiger und der aktuellen Uhrzeit, mit dem Wappen in der oberen Hälfte des Zifferblatts. Daneben steht für jeden Takt ein Kölschglas, das sich mit der laufenden Runde leert und zum Rundenende leer ist: links der 10-Minuten-Takt, rechts der 15-Minuten-Takt. Mit der nächsten Runde ist das Glas wieder voll. Spielt nur ein Takt, gibt es auch nur ein Glas. Runden enden immer zur vollen Minute: Beim Start (und nach jeder Verlängerung) wird die erste Runde bis zur nächsten vollen Minute verlängert, danach läuft der normale Takt. Beispiel: Start um 20:43:12 → Rundenenden um 20:54, 21:04, … (15er: 20:59, 21:14, …).

### Strafbier

Wer ein X bekommt, hat in der nächsten Runde seines Takts ein **STRAFBIER** offen: rot umrandet neben dem Namen. Wer es getrunken hat, tippt auf das Strafbier – es wird grün abgehakt (erneutes Antippen nimmt den Haken zurück). Das Strafbier ist ein eigener Knopf; Antippen der übrigen Zeile hakt wie gewohnt die Lieferung ab.

Ist das Strafbier am Rundenende nicht abgehakt, werden zwei draus – und wieder nicht abgehakt vier, dann acht. Ein neues X kommt jeweils noch obendrauf (zwei offene, nicht getrunken, plus neues X = fünf). Verdoppelte Strafbiere stehen ausgefüllt rot als „2× STRAFBIER“ in der Zeile, und die Rundenwechsel-Einblendung meldet „STRAFBIER VERDOPPELT“. Strafbiere aus der letzten Runde vor der Verlängerungsfrage gelten in der ersten Runde nach der Verlängerung. Die Auswertung zeigt, wer wie viele Strafbiere getrunken hat und was bei Feierabend noch offen ist.

### Schlemmersonntag

Einmal pro Spiel geht zu einem zufälligen Zeitpunkt in der ersten Stunde mit einem kurzen „Plopp“ ein kleines Pop-up auf: **„Kennen Sie schon den Schlemmersonntag?“** Dazu laufen die ersten 10 Sekunden der Schlemmersonntag-Hymne, danach verschwindet alles von selbst (oder vorher per ×). Der Zeitpunkt liegt immer 30 Sekunden nach einer vollen Minute, also nie auf einem Rundenende, und bleibt auch nach dem Neuladen gleich. Er kommt garantiert: War die App gerade zu (Display aus, andere App), wird er nachgeholt, sobald sie wieder offen ist – spätestens bei der Verlängerungsfrage. Die Hymne folgt den Sound-Einstellungen (Lautstärke; auch bei lautlos); mit ausgeschaltetem Sound kommt nur das Pop-up.

### Unnützes Wissen

Einmal pro 10-Minuten-Abschnitt ploppt mitten im Spiel ein Pop-up mit **unnützem Wissen** auf – 50 echte, aber völlig sinnlose Fakten („UNNÜTZES WISSEN“) und 50 frei erfundene, alberne Bier-„Fakten“ („UNNÜTZES BIERWISSEN“), alle in `src/game/bierwissen.ts`. Der Zeitpunkt im Abschnitt ist zufällig, liegt aber immer mindestens 90 Sekunden vor bzw. nach jedem Rundenende (in allen Takten, auch Malte Spezial) und 2 Minuten vom Schlemmersonntag entfernt; der Schlemmersonntag hat immer Vorrang. Die Fakten werden gemischt und wiederholen sich erst, wenn alle 100 gezeigt wurden – auch über mehrere Spiele hinweg. Mit Plopp, verschwindet nach 7–12 Sekunden von selbst.

### Malte Spezial

Wer **MALTE SPEZIAL** anhakt, sieht die App sofort in bedrohlichem Dunkelrot: Die beiden Rundumleuchten links und rechts vom Schriftzug fangen an zu drehen, eine Sirene heult, das Display bebt kurz, das Handy vibriert, der Bildschirmrand glüht im Herzschlag-Takt, und statt „SPIEL STARTEN“ steht **BRACE FOR IMPACT** zwischen zwei Rundumleuchten auf dem Button. Das bleibt das ganze Spiel über inklusive aller Verlängerungsfragen. Erst mit dem Ergebnis färbt sich die App wieder zurück. Grüne Haken bleiben auch im roten Design grün.

### 15-Minuten-Takt

Im Modus Normal können einzelne Personen im 15-Minuten-Takt mitspielen:

1. Haken bei **15-MINUTEN-TAKT** setzen.
2. In der Teilnehmerliste bei den betreffenden Personen auf **15** tippen (Umschalter „10 | 15“).

Im Spiel läuft der 15-Minuten-Takt (grün) neben bzw. unter dem 10-Minuten-Takt (gelb), mit eigenem Timer und eigenem Glas: 4 Runden in den ersten 60 Minuten, 2 Runden pro Verlängerung. Beide Takte starten gleichzeitig und enden gemeinsam mit jeder Spielphase. Der 15-Minuten-Takt hat eigene, ähnliche Töne (Buzzer mit drei statt zwei Stößen, höherer Erfolgston). Bei Minute 30, 60, … enden beide Runden zugleich – dann gibt es eine gemeinsame Einblendung, erst den Ton des 10-Minuten-Takts und kurz danach den der 15er. Die Auswertung zeigt Ranglisten, Übersicht und Verlauf getrennt je Takt.

Malte Spezial bleibt ein eigener Modus ohne 15-Minuten-Takt. Mindestens eine Person muss im 10-Minuten-Takt spielen.

### Sprüche bei der Verlängerungsfrage

Die Stufe richtet sich nach dem Anteil der X an allen Teilnehmer-Runden. Weil X eher selten sind, liegen die Grenzen niedrig:

| Stufe | X-Anteil | Button |
|---|---|---|
| 🏆 Perfekt | kein einziges X | EHRENRUNDE! (+30 MIN.) |
| 😎 Läuft gut | genau 1 X oder bis 6 % | EHRENRUNDE! (+30 MIN.) |
| 🤷 Durchwachsen | bis 15 % | WEITER GEHT’S (+30 MIN.) |
| 😬 Viele X | über 15 % | REVANCHE! (+30 MIN.) |

Beispiel mit 4 Teilnehmern und 6 Runden (24 Teilnehmer-Runden): 1 X = läuft gut, 2–3 X = durchwachsen, ab 4 X = viele X.

Pro Stufe gibt es drei Sprüche, dazu Sprüche mit Namen („Malte zahlt den Kranz.“) und ab der zweiten Verlängerung eigene Überschriften. Alle Texte und Grenzen stehen in `src/game/sayings.ts`.

## Auf dem Smartphone installieren

- **iPhone/iPad (Safari):** Teilen → „Zum Home-Bildschirm“
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“

Nach dem ersten Öffnen ist alles auf dem Gerät gespeichert. Danach funktioniert die App auch im Flugmodus.

Hinweise:
- Sind die Sounds an, kommen die Töne auch, wenn das iPhone auf lautlos steht (ab iOS 16.4). Läuft auf demselben iPhone Musik, wird sie dabei unterbrochen. Mit ausgeschalteten Sounds stört die App laufende Musik nicht. Die Medienlautstärke muss aufgedreht sein.
- Während des Spiels bleibt der Bildschirm nach Möglichkeit an (Screen Wake Lock). Wird das Handy trotzdem gesperrt, läuft die Zeit korrekt weiter. Beim Entsperren werden verpasste Runden nachgetragen.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) 20.19 oder neuer.

```bash
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5173
npm test           # Tests der Spiellogik
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen (inkl. Offline-Funktion)
```

Zum Testen auf dem Handy im selben WLAN: `npm run dev -- --host` und die angezeigte Netzwerkadresse öffnen.

## Veröffentlichung

Jeder Push auf `main` startet den Workflow `.github/workflows/deploy.yml`. Er führt die Tests aus, baut die App und legt das Ergebnis auf den Branch `gh-pages`. GitHub Pages liefert diesen Branch aus (Einstellung unter *Settings → Pages → Deploy from a branch → `gh-pages` / root*).

## Technik

- React 19, TypeScript, Vite, Tailwind CSS 4
- Kein Backend und keine externen Dienste. Der Spielstand liegt im `localStorage`.
- Sounds werden mit der Web Audio API erzeugt, ohne Audiodateien. Für den Lautlos-Modus setzt die App auf dem iPhone den Audio-Session-Typ `playback`.
- Ein eigener Service Worker (beim Build erzeugt) speichert alle Dateien für den Offline-Betrieb.
- Die Schrift Inter ist lokal eingebunden (SIL Open Font License).

### Zuverlässiger Timer

Die Zeit wird nie heruntergezählt. Gespeichert wird nur der Startzeitpunkt der laufenden Spielphase. Daraus werden aktuelle Runde, Restzeit und Gesamtzeit berechnet. Das Intervall in der Oberfläche sorgt nur für die Anzeige.

Daraus folgt:
- Standby, Hintergrund, Neuladen oder Schließen der App verfälschen die Zeit nicht.
- Beim Wiederöffnen wird jede verpasste Runde einzeln und genau einmal ausgewertet. Ein X gilt immer nur für die Runde, in der es gesetzt wurde.
- Endet eine Spielphase, während die App geschlossen ist, erscheint beim Öffnen der Verlängerungsdialog. Es geht nicht automatisch weiter.
- Beim Wiederöffnen gibt es keine Serie von X-Sounds, sondern eine kurze Zusammenfassung.

### Projektstruktur

```
src/
  game/                Spiellogik ohne React (vollständig getestet)
    types.ts           Datenmodell
    rules.ts           Rundendauer, Phasen, Verlängerungen
    engine.ts          Zustandsautomat: Start, Haken setzen, Auswertung, Verlängern, Ende –
                       mit zwei parallelen Rundenspuren (10- und 15-Minuten-Takt)
    feedback.ts        Wann welcher Sound bzw. welche Einblendung kommt
    penalties.ts       Strafbiere (aus der Rundenhistorie abgeleitet)
    beer.ts            Bierbedarf vor Spielbeginn
    schlemmersonntag.ts  Zeitpunkt des Schlemmersonntag-Pop-ups
    bierwissen.ts      100 Fakten (50 echt, 50 Bier-Quatsch) und wann sie aufploppen
    sayings.ts         Sprüche für die Verlängerungsfrage
    stats.ts           Rangliste und Statistiken (aus der Rundenhistorie berechnet)
    storage.ts         Speichern/Laden mit Prüfung auf ungültige Daten
    format.ts          Zeit- und Prozentformatierung
    *.test.ts          Tests
  audio/sounds.ts      Buzzer und Erfolgston (Web Audio API)
  hooks/               React-Anbindung: Spielzustand, Einstellungen, Wake Lock
  components/          Bildschirme, Dialoge und die Spielanleitung (GuideSheet)
  pwa/                 Registrierung des Service Workers
build/
  service-worker-plugin.ts   erzeugt sw.js mit allen Dateien der App
```

Die X-Zahlen werden nicht separat gespeichert, sondern immer aus der Rundenhistorie berechnet. So können sie nicht auseinanderlaufen.
