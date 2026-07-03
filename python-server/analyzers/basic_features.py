import numpy as np
import parselmouth
from parselmouth.praat import call

def extract_basic_features(signal: np.ndarray, sr: int) -> dict:
    snd = parselmouth.Sound(signal, sampling_frequency=sr)

    # Pitch
    pitch = snd.to_pitch()
    pitch_values = pitch.selected_array["frequency"]
    pitch_values = pitch_values[pitch_values > 0]
    median_hz = float(np.median(pitch_values)) if len(pitch_values) > 0 else 0
    min_hz = float(np.min(pitch_values)) if len(pitch_values) > 0 else 0
    max_hz = float(np.max(pitch_values)) if len(pitch_values) > 0 else 0
    range_st = 12 * np.log2(max_hz / max(min_hz, 1)) if min_hz > 0 else 0

    # PointProcess for jitter/shimmer
    pp = call(snd, "To PointProcess (periodic, cc)", 75, 600)
    jitter_local = call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
    jitter_rap = call(pp, "Get jitter (rap)", 0, 0, 0.0001, 0.02, 1.3)
    shimmer_local = call([snd, pp], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_apq3 = call([snd, pp], "Get shimmer (apq3)", 0, 0, 0.0001, 0.02, 1.3, 1.6)

    # HNR
    harmonicity = snd.to_harmonicity()
    hnr_values = harmonicity.values.flatten()
    hnr_valid = hnr_values[hnr_values != -200]
    hnr_db = float(np.mean(hnr_valid)) if len(hnr_valid) > 0 else 0

    # Formants
    formant = snd.to_formant_burg()
    mid_time = snd.duration / 2
    f1 = call(formant, "Get value at time", 1, mid_time, "Hertz", "Linear")
    f2 = call(formant, "Get value at time", 2, mid_time, "Hertz", "Linear")
    f3 = call(formant, "Get value at time", 3, mid_time, "Hertz", "Linear")
    f4 = call(formant, "Get value at time", 4, mid_time, "Hertz", "Linear")

    # Intensity
    intensity = snd.to_intensity()
    int_values = intensity.values.flatten()
    int_values = int_values[~np.isnan(int_values)]

    return {
        "pitch": {
            "median_hz": round(median_hz, 1),
            "min_hz": round(min_hz, 1),
            "max_hz": round(max_hz, 1),
            "range_semitones": round(float(range_st), 1),
        },
        "jitter": {
            "local": round(float(jitter_local) if not np.isnan(jitter_local) else 0, 4),
            "rap": round(float(jitter_rap) if not np.isnan(jitter_rap) else 0, 4),
        },
        "shimmer": {
            "local": round(float(shimmer_local) if not np.isnan(shimmer_local) else 0, 4),
            "apq3": round(float(shimmer_apq3) if not np.isnan(shimmer_apq3) else 0, 4),
        },
        "hnr_db": round(float(hnr_db), 1),
        "formants": {
            "f1": round(float(f1) if not np.isnan(f1) else 0),
            "f2": round(float(f2) if not np.isnan(f2) else 0),
            "f3": round(float(f3) if not np.isnan(f3) else 0),
            "f4": round(float(f4) if not np.isnan(f4) else 0),
        },
        "intensity": {
            "mean_db": round(float(np.mean(int_values)), 1) if len(int_values) > 0 else 0,
            "range_db": round(float(np.ptp(int_values)), 1) if len(int_values) > 0 else 0,
        },
    }
