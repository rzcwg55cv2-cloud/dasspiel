# DAS SPIEL

*60 Minuten. Alle müssen liefern!*

Das zeitbasierte Gruppenspiel zum Vorwärtskommen.

Ein zeitbasiertes Gruppenspiel als Web-App. Mehrere Teilnehmer müssen innerhalb jeder Runde eine Aufgabe in der echten Welt erfüllen. Wer geliefert hat, bekommt sein **X**. Wer am Ende der Runde kein X hat, bekommt einen **Fehler**.

**Spielen:** https://rzcwg55cv2-cloud.github.io/dasspiel/

Die App läuft komplett im Browser, braucht kein Konto und kein Internet während des Spiels und lässt sich auf dem Smartphone als App installieren.

## Spielregeln

| | Normal | Malte Spezial |
|---|---|---|
| Rundendauer | 10 Minuten | 5 Minuten |
| Erste Spielphase | 60 Minuten (6 Runden) | 60 Minuten (12 Runden) |
| Jede Verlängerung | +30 Minuten (3 Runden) | +30 Minuten (6 Runden) |

1. Teilnehmer eintragen, Modus wählen, **SPIEL STARTEN**.
2. Wer seine Aufgabe erfüllt hat, wird angetippt und bekommt ein grünes X. Erneutes Antippen nimmt das X wieder weg, solange die Runde läuft.
3. Bei 00:00 wird die Runde automatisch ausgewertet. Jedes fehlende X ist ein Fehler. Die nächste Runde startet sofort.
4. Nach 60 Minuten entscheidet die Gruppe: **+30 MINUTEN VERLÄNGERN** oder **SPIEL BEENDEN**. Während der Entscheidung steht die Zeit still. Verlängern geht beliebig oft.
5. Am Ende gibt es eine Rangliste, Statistiken und den kompletten Verlauf jeder Runde.

Ein Gerät dient als Spielzentrale: Dort werden alle Teilnehmer eingetragen und alle X vergeben.

## Auf dem Smartphone installieren

- **iPhone/iPad (Safari):** Teilen → „Zum Home-Bildschirm“
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“

Nach dem ersten Öffnen ist alles auf dem Gerät gespeichert. Danach funktioniert die App auch im Flugmodus.

Hinweise:
- Auf dem iPhone muss der Stummschalter aus sein, damit die Sounds zu hören sind.
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
- Sounds werden mit der Web Audio API erzeugt, ohne Audiodateien.
- Ein eigener Service Worker (beim Build erzeugt) speichert alle Dateien für den Offline-Betrieb.
- Die Schrift Inter ist lokal eingebunden (SIL Open Font License).

### Zuverlässiger Timer

Die Zeit wird nie heruntergezählt. Gespeichert wird nur der Startzeitpunkt der laufenden Spielphase. Daraus werden aktuelle Runde, Restzeit und Gesamtzeit berechnet. Das Intervall in der Oberfläche sorgt nur für die Anzeige.

Daraus folgt:
- Standby, Hintergrund, Neuladen oder Schließen der App verfälschen die Zeit nicht.
- Beim Wiederöffnen wird jede verpasste Runde einzeln und genau einmal ausgewertet. Ein X gilt immer nur für die Runde, in der es gesetzt wurde.
- Endet eine Spielphase, während die App geschlossen ist, erscheint beim Öffnen der Verlängerungsdialog. Es geht nicht automatisch weiter.
- Beim Wiederöffnen gibt es keine Serie von Fehlersounds, sondern eine kurze Zusammenfassung.

### Projektstruktur

```
src/
  game/                Spiellogik ohne React (vollständig getestet)
    types.ts           Datenmodell
    rules.ts           Rundendauer, Phasen, Verlängerungen
    engine.ts          Zustandsautomat: Start, X setzen, Auswertung, Verlängern, Ende
    feedback.ts        Wann welcher Sound bzw. welche Einblendung kommt
    stats.ts           Rangliste und Statistiken (aus der Rundenhistorie berechnet)
    storage.ts         Speichern/Laden mit Prüfung auf ungültige Daten
    format.ts          Zeit- und Prozentformatierung
    *.test.ts          Tests
  audio/sounds.ts      Buzzer und Erfolgston (Web Audio API)
  hooks/               React-Anbindung: Spielzustand, Einstellungen, Wake Lock
  components/          Bildschirme und Dialoge
  pwa/                 Registrierung des Service Workers
build/
  service-worker-plugin.ts   erzeugt sw.js mit allen Dateien der App
```

Die Fehlerzahlen werden nicht separat gespeichert, sondern immer aus der Rundenhistorie berechnet. So können sie nicht auseinanderlaufen.
