import numpy as np
from utils.normalize import min_max_norm

# Normalization ranges (based on clinical literature)
NORMS = {
    "h1_h2": (-10, 15),
    "slope": (-0.03, 0.0),
    "alpha": (-15, 5),
    "hammarberg": (0, 40),
    "hnr": (0, 30),
    "cpp": (0, 20),
    "jitter": (0, 0.05),
    "shimmer": (0, 0.15),
}

def compute_indices(features: dict, contours: dict) -> dict:
    # Register Index
    h1h2_n = min_max_norm(features["h1_h2_star"], *NORMS["h1_h2"])
    slope_n = min_max_norm(features["spectral_slope"]["0_500"], *NORMS["slope"])
    alpha_n = min_max_norm(features["alpha_ratio"], *NORMS["alpha"])
    hamm_n = min_max_norm(features["hammarberg_index"], *NORMS["hammarberg"])
    hnr_n = min_max_norm(features["hnr_db"], *NORMS["hnr"])
    register_index = h1h2_n * 0.35 + slope_n * 0.25 + alpha_n * 0.15 + hamm_n * 0.15 + hnr_n * 0.10

    # Phonation Efficiency
    cpp_n = min_max_norm(features["cpps"], *NORMS["cpp"])
    jitter_n = 1 - min_max_norm(features["jitter"]["local"], *NORMS["jitter"])
    shimmer_n = 1 - min_max_norm(features["shimmer"]["local"], *NORMS["shimmer"])
    perturbation = (jitter_n + shimmer_n) / 2
    phonation_eff = cpp_n * 0.40 + hnr_n * 0.30 + perturbation * 0.30

    # Mix Continuity
    f0_c = np.array(contours.get("f0_contour", []), dtype=float)
    cpp_c = np.array(contours.get("cpp_contour", []), dtype=float)
    int_c = np.array(contours.get("intensity_contour", []), dtype=float)

    # transition_smoothness: low 2nd derivative of F0
    if len(f0_c) > 2:
        d2 = np.diff(f0_c, n=2)
        trans_smooth = 1 - min_max_norm(float(np.std(d2)), 0, 50)
    else:
        trans_smooth = 0.5

    # CPP retention: min/mean ratio
    # TODO: cpp_contour는 단일값 복제 — 향후 프레임별 CPP로 교체
    cpp_ret = float(np.min(cpp_c) / max(np.mean(cpp_c), 1e-10)) if len(cpp_c) > 0 else 0.5

    # energy consistency: 1 / CV
    if len(int_c) > 1 and np.mean(int_c) > 0:
        cv = float(np.std(int_c) / np.mean(int_c))
        energy_cons = 1 - min_max_norm(cv, 0, 0.5)
    else:
        energy_cons = 0.5

    # pitch stability: 1 / std in semitones
    if len(f0_c) > 1:
        median_f0 = np.median(f0_c)
        if median_f0 > 0:
            f0_st = 12 * np.log2(f0_c / median_f0 + 1e-10)
            pitch_stab = 1 - min_max_norm(float(np.std(f0_st)), 0, 5)
        else:
            pitch_stab = 0.5
    else:
        pitch_stab = 0.5

    mix_cont = trans_smooth * 0.35 + cpp_ret * 0.25 + energy_cons * 0.20 + pitch_stab * 0.20

    return {
        "register_index": round(float(np.clip(register_index, 0, 1)), 2),
        "phonation_efficiency": round(float(np.clip(phonation_eff, 0, 1)), 2),
        "mix_continuity": round(float(np.clip(mix_cont, 0, 1)), 2),
    }
