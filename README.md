# HAMONI — Vocal Analysis & Training Engine

A browser-oriented toolkit for real-time voice analysis and vocal-training
logic. It turns a microphone signal into scientific voice metrics (pitch,
jitter, shimmer, HNR, formants, vibrato) and drives a full exercise, scoring,
and progression system on top of them.

This repository contains the **engine and logic layer only** — the DSP,
scoring, training curriculum, and supporting algorithms, with their tests.
There is no application UI or backend here.

## What's inside

| Module | Purpose |
|--------|---------|
| `src/lib/pitch` | Pitch engine — Pitchy-based detection, EMA smoothing, Meyda feature extraction, note conversion |
| `src/lib/voice` | Voice-quality DSP — period detection, jitter/shimmer, stability, vibrato, spectral & formant analysis |
| `src/lib/scoring` | Session scoring and coaching feedback (pitch accuracy, stability, long-tone) |
| `src/lib/training` | Exercise definitions, evaluator, level criteria, XP, streaks, recommender, progress tracking |
| `src/lib/vocal-analysis` | Higher-level vocal characterization |
| `src/lib/vocal-training` | Prescription engine and scale generation |
| `src/lib/voice-profile` | Voice type classification and range profiling |
| `src/lib/ear-training` | Ear-training quiz engine |
| `src/lib/rhythm-training` | Rhythm pattern analysis |
| `src/lib/audio` | Music utilities and a piano synthesizer |
| `src/i18n` | Locale dictionaries and a framework-agnostic translator (`createT`) |
| `public/worklets` | AudioWorklet processor for pitch collection |
| `wasm/burg-lpc` | Burg-method LPC (formant estimation) |
| `python-server` | Reference Python analysis server |

## DSP highlights

- **Pitch:** AudioWorklet capture → Pitchy autocorrelation (clarity ≥ 0.75) → EMA smoothing (α = 0.15)
- **Voice quality:** AnalyserNode (FFT 4096) → self-implemented period detector with octave guard → jitter/shimmer (min 10 periods) → stability EMA (α = 0.3)
- **Spectral:** Meyda features → HNR, noisiness, breathy/balanced/pressed state, with a passaggio (260–360 Hz) correction
- **Vibrato:** 4–8 Hz detection with a 50-cent minimum extent

## Getting started

```bash
npm install
npm run test        # run the test suite (Vitest)
npm run typecheck   # type-check with tsc
```

## License

Private. All rights reserved.
