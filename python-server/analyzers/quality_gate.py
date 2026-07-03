import numpy as np
import parselmouth

def check_quality(signal: np.ndarray, sr: int) -> dict:
    """3-tier quality gate: SNR, clipping, voiced ratio."""
    snd = parselmouth.Sound(signal, sampling_frequency=sr)

    # Voiced ratio + pitch detection
    pitch = snd.to_pitch(time_step=0.01)
    pitch_values = []
    for t in pitch.xs():
        v = pitch.get_value_at_time(t)
        if v > 0:
            pitch_values.append(v)
    total_frames = len(pitch.xs())
    voiced_ratio = len(pitch_values) / max(total_frames, 1)

    # SNR: voiced energy vs unvoiced energy (Praat Harmonicity-based)
    harmonicity = snd.to_harmonicity()
    hnr_values = harmonicity.values.flatten()
    hnr_valid = hnr_values[hnr_values != -200]
    if len(hnr_valid) > 0:
        snr_db = float(np.mean(hnr_valid))
    else:
        snr_db = 0.0

    # Clipping ratio
    threshold = 0.99
    clipping_ratio = float(np.mean(np.abs(signal) >= threshold))

    # 3-tier SNR classification
    passed = bool(snr_db >= 15 and clipping_ratio < 0.001 and voiced_ratio >= 0.6)
    warning = None
    if snr_db >= 15 and snr_db < 25:
        warning = "low_snr"

    return {
        "passed": passed,
        "warning": warning,
        "snr_db": round(float(snr_db), 1),
        "clipping_ratio": round(float(clipping_ratio), 4),
        "voiced_ratio": round(float(voiced_ratio), 2),
    }
