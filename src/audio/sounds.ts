/**
 * Sounds werden mit der Web Audio API synthetisiert. Einzige Audiodatei ist die
 * Schlemmersonntag-Hymne; sie wird wie alles andere für den Offline-Betrieb vorgeladen.
 *
 * Mobile Browser erlauben Audio erst nach einer Benutzeraktion. Deshalb wird
 * `unlock()` beim Spielstart und bei jedem Antippen aufgerufen. Schlägt die
 * Wiedergabe fehl, passiert einfach nichts – die Spiellogik ist davon unabhängig.
 */
import type { SoundKind } from '../game/feedback';
import type { GroupId } from '../game/types';

type AudioContextConstructor = typeof AudioContext;

/** Audio Session API (Safari ab iOS 16.4) – noch nicht in den TypeScript-Typen enthalten. */
type NavigatorWithAudioSession = Navigator & { audioSession?: { type: string } };

class SoundPlayer {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private volume = 0.8;
  private primed = false;
  private playInSilentMode = true;
  private clips = new Map<string, Promise<AudioBuffer | null>>();

  /**
   * iPhone: Mit dem Audio-Session-Typ „playback“ sind die Töne auch zu hören, wenn das
   * Telefon auf lautlos steht. Nachteil: Musik, die auf demselben iPhone läuft, wird
   * dabei unterbrochen. Deshalb ist es abschaltbar. Andere Geräte ignorieren das.
   */
  setPlayInSilentMode(enabled: boolean): void {
    if (this.playInSilentMode === enabled) return;
    this.playInSilentMode = enabled;
    this.applyAudioSession();
    // Ein laufender AudioContext übernimmt den neuen Typ erst nach erneutem Aktivieren.
    const context = this.context;
    if (context?.state === 'running') {
      context
        .suspend()
        .then(() => context.resume())
        .catch(() => {});
    }
  }

  private applyAudioSession(): void {
    if (typeof navigator === 'undefined') return;
    const session = (navigator as NavigatorWithAudioSession).audioSession;
    if (!session) return;
    try {
      session.type = this.playInSilentMode ? 'playback' : 'auto';
    } catch {
      // nicht unterstützt
    }
  }

  /** Muss aus einer Benutzeraktion heraus aufgerufen werden (Tippen, Klicken, Taste). */
  unlock(): void {
    // Der Sitzungstyp muss gesetzt sein, bevor die Audioausgabe aktiviert wird.
    this.applyAudioSession();
    const context = this.ensureContext();
    if (!context) return;
    if (context.state !== 'running') context.resume().catch(() => {});
    if (!this.primed) {
      // iOS schaltet die Ausgabe erst frei, nachdem in einer Benutzeraktion etwas abgespielt wurde.
      try {
        const source = context.createBufferSource();
        source.buffer = context.createBuffer(1, 1, 22050);
        source.connect(context.destination);
        source.start(0);
        this.primed = true;
      } catch {
        // ignorieren
      }
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.context && this.output) {
      this.output.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.02);
    }
  }

  /**
   * Spielt den Ton einer Gruppe. Die 15-Minuten-Gruppe hat eigene, ähnliche Varianten.
   * `delay` (Sekunden) erlaubt zwei Töne direkt nacheinander, z. B. bei Minute 30.
   */
  play(kind: SoundKind, group: GroupId = 'main', delay = 0): void {
    const context = this.ensureContext();
    if (!context || !this.output || this.volume === 0) return;
    if (context.state !== 'running') context.resume().catch(() => {});
    try {
      const start = context.currentTime + 0.03 + delay;
      if (kind === 'error') playBuzzer(context, this.output, start, BUZZERS[group]);
      else playChime(context, this.output, start, CHIMES[group]);
    } catch {
      // Audio ist optional.
    }
  }

  /** Sirene beim Einschalten von Malte Spezial. Liefert eine Funktion, die sie vorzeitig verstummen lässt. */
  playSiren(): () => void {
    const context = this.ensureContext();
    if (!context || !this.output || this.volume === 0) return () => {};
    if (context.state !== 'running') context.resume().catch(() => {});
    try {
      return playSiren(context, this.output, context.currentTime + 0.03);
    } catch {
      return () => {};
    }
  }

  /** Kurzes „Plopp“, wenn ein Pop-up aufgeht. */
  playPop(): void {
    const context = this.ensureContext();
    if (!context || !this.output || this.volume === 0) return;
    if (context.state !== 'running') context.resume().catch(() => {});
    try {
      playPop(context, this.output, context.currentTime + 0.03);
    } catch {
      // Audio ist optional.
    }
  }

  /** Lädt und dekodiert eine Audiodatei im Voraus, damit sie später pünktlich startet. */
  preload(url: string): Promise<AudioBuffer | null> {
    const cached = this.clips.get(url);
    if (cached) return cached;
    const context = this.ensureContext();
    if (!context) return Promise.resolve(null);
    const clip = fetch(url)
      .then((response) => response.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .catch(() => {
        this.clips.delete(url);
        return null;
      });
    this.clips.set(url, clip);
    return clip;
  }

  /**
   * Wartet, bis die Audioausgabe läuft und die Datei dekodiert ist – höchstens `timeoutMs`.
   * Auf dem Handy kann beides nach längerer Stille einen Moment dauern.
   */
  prepare(url: string, timeoutMs: number): Promise<boolean> {
    const context = this.ensureContext();
    if (!context) return Promise.resolve(false);
    const ready = Promise.all([context.state === 'running' ? undefined : context.resume(), this.preload(url)])
      .then(([, buffer]) => buffer !== null)
      .catch(() => false);
    const timeout = new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), timeoutMs));
    return Promise.race([ready, timeout]);
  }

  /** Spielt eine Audiodatei ab. Liefert eine Funktion, die sie vorzeitig ausblendet. */
  playClip(url: string, delay = 0): () => void {
    const context = this.ensureContext();
    if (!context || !this.output || this.volume === 0) return () => {};
    if (context.state !== 'running') context.resume().catch(() => {});
    const output = this.output;
    const requested = context.currentTime;
    let stop: (() => void) | null = null;
    let cancelled = false;
    this.preload(url).then((buffer) => {
      if (!buffer || cancelled) return;
      try {
        const source = context.createBufferSource();
        source.buffer = buffer;
        const gain = context.createGain();
        source.connect(gain);
        gain.connect(output);
        source.start(Math.max(context.currentTime + 0.03, requested + delay));
        stop = () => {
          const now = context.currentTime;
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.15);
          source.stop(now + 0.2);
        };
      } catch {
        // Audio ist optional.
      }
    });
    return () => {
      cancelled = true;
      try {
        stop?.();
      } catch {
        // bereits beendet
      }
    };
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === 'undefined') return null;
    const Context: AudioContextConstructor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!Context) return null;
    try {
      const context = new Context();
      const output = context.createGain();
      output.gain.value = this.volume;
      // Der Kompressor hält die Sounds laut, ohne zu übersteuern.
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 8;
      compressor.ratio.value = 4;
      output.connect(compressor);
      compressor.connect(context.destination);
      this.context = context;
      this.output = output;
      return context;
    } catch {
      return null;
    }
  }
}

/** Hüllkurve: schneller Einsatz, gehaltener Ton, kurzes Ausklingen. */
function envelope(context: AudioContext, start: number, duration: number, peak: number): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.setValueAtTime(peak, start + duration - 0.07);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  return gain;
}

interface BuzzerSpec {
  pulses: Array<{ offset: number; duration: number; pitch: number }>;
  /** Grundtonhöhe (Hz) der beiden leicht verstimmten Sägezahn-Stimmen. */
  base: number;
}

/**
 * Negativer Gameshow-Buzzer aus tiefen, leicht verstimmten Sägezahn-Impulsen.
 * - Haupttakt: zwei Stöße („mäp-määp“)
 * - 15-Minuten-Gruppe: drei kürzere, etwas höhere Stöße („mäp-mäp-määp“)
 */
const BUZZERS: Record<GroupId, BuzzerSpec> = {
  main: {
    base: 140,
    pulses: [
      { offset: 0, duration: 0.22, pitch: 1 },
      { offset: 0.3, duration: 0.6, pitch: 0.94 },
    ],
  },
  slow: {
    base: 182,
    pulses: [
      { offset: 0, duration: 0.15, pitch: 1 },
      { offset: 0.21, duration: 0.15, pitch: 1 },
      { offset: 0.42, duration: 0.5, pitch: 0.94 },
    ],
  },
};

/** Ein Tiefpassfilter nimmt die schrillen Obertöne heraus. */
function playBuzzer(context: AudioContext, output: AudioNode, start: number, spec: BuzzerSpec): void {
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  filter.Q.value = 0.8;
  filter.connect(output);

  const voices: Array<{ type: OscillatorType; frequency: number; level: number }> = [
    { type: 'sawtooth', frequency: spec.base, level: 0.45 },
    { type: 'sawtooth', frequency: spec.base * 1.05, level: 0.45 },
    { type: 'square', frequency: spec.base / 2, level: 0.3 },
  ];

  for (const pulse of spec.pulses) {
    const t = start + pulse.offset;
    const env = envelope(context, t, pulse.duration, 0.55);
    env.connect(filter);
    for (const voice of voices) {
      const oscillator = context.createOscillator();
      oscillator.type = voice.type;
      oscillator.frequency.setValueAtTime(voice.frequency * pulse.pitch, t);
      oscillator.frequency.linearRampToValueAtTime(voice.frequency * pulse.pitch * 0.97, t + pulse.duration);
      const level = context.createGain();
      level.gain.value = voice.level;
      oscillator.connect(level);
      level.connect(env);
      oscillator.start(t);
      oscillator.stop(t + pulse.duration + 0.05);
    }
  }
}

/**
 * Kurzer, heller Erfolgston als aufsteigender Dur-Dreiklang.
 * - Haupttakt: G5 – C6 – E6
 * - 15-Minuten-Gruppe: höher und mit vier Tönen, A5 – C♯6 – E6 – A6
 */
const CHIMES: Record<GroupId, Array<{ frequency: number; offset: number }>> = {
  main: [
    { frequency: 783.99, offset: 0 },
    { frequency: 1046.5, offset: 0.09 },
    { frequency: 1318.51, offset: 0.18 },
  ],
  slow: [
    { frequency: 880, offset: 0 },
    { frequency: 1108.73, offset: 0.07 },
    { frequency: 1318.51, offset: 0.14 },
    { frequency: 1760, offset: 0.21 },
  ],
};

function playChime(
  context: AudioContext,
  output: AudioNode,
  start: number,
  notes: Array<{ frequency: number; offset: number }>,
): void {
  notes.forEach((note, index) => {
    const t = start + note.offset;
    const decay = index === notes.length - 1 ? 0.9 : 0.35;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    gain.connect(output);

    for (const [type, multiplier, level] of [
      ['sine', 1, 1],
      ['triangle', 2, 0.18],
    ] as const) {
      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = note.frequency * multiplier;
      const voice = context.createGain();
      voice.gain.value = level;
      oscillator.connect(voice);
      voice.connect(gain);
      oscillator.start(t);
      oscillator.stop(t + decay + 0.05);
    }
  });
}

/**
 * Bedrohliche Sirene: zwei an- und abschwellende Heultöne (etwa 2,5 Sekunden).
 * Sägezahn und Rechteck geben den rauen Sirenenklang, ein Dreieck eine Oktave tiefer das Volumen.
 */
function playSiren(context: AudioContext, output: AudioNode, start: number): () => void {
  const duration = 2.5;
  const low = 420;
  const high = 1050;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;
  filter.Q.value = 0.5;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.3, start + 0.18);
  gain.gain.setValueAtTime(0.3, start + duration - 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  filter.connect(gain);
  gain.connect(output);

  const voices: Array<{ type: OscillatorType; detune: number; level: number }> = [
    { type: 'sawtooth', detune: 0, level: 0.5 },
    { type: 'square', detune: 8, level: 0.22 },
    { type: 'triangle', detune: -1200, level: 0.55 },
  ];
  const oscillators = voices.map((voice) => {
    const oscillator = context.createOscillator();
    oscillator.type = voice.type;
    oscillator.detune.value = voice.detune;
    // Heulen: hoch – runter – hoch – runter
    const f = oscillator.frequency;
    f.setValueAtTime(low, start);
    f.exponentialRampToValueAtTime(high, start + 0.6);
    f.exponentialRampToValueAtTime(low, start + 1.25);
    f.exponentialRampToValueAtTime(high, start + 1.85);
    f.exponentialRampToValueAtTime(low * 0.85, start + duration);
    const level = context.createGain();
    level.gain.value = voice.level;
    oscillator.connect(level);
    level.connect(filter);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
    return oscillator;
  });

  return () => {
    const now = context.currentTime;
    if (now >= start + duration) return;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    for (const oscillator of oscillators) {
      try {
        oscillator.stop(now + 0.15);
      } catch {
        // bereits gestoppt
      }
    }
  };
}

/** Pop-up-Geräusch: ein kurzer, schnell aufsteigender Sinuston mit etwas Obertönen. */
function playPop(context: AudioContext, output: AudioNode, start: number): void {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.7, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
  gain.connect(output);
  for (const [type, multiplier, level] of [
    ['sine', 1, 1],
    ['triangle', 2, 0.25],
  ] as const) {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(380 * multiplier, start);
    oscillator.frequency.exponentialRampToValueAtTime(1150 * multiplier, start + 0.07);
    const voice = context.createGain();
    voice.gain.value = level;
    oscillator.connect(voice);
    voice.connect(gain);
    oscillator.start(start);
    oscillator.stop(start + 0.2);
  }
}

export const sounds = new SoundPlayer();
