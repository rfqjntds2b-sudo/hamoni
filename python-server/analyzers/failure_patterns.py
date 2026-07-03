import numpy as np

PATTERNS = {
    "chest_lock": "가슴 레지스터에 고착된 패턴",
    "flip_to_falsetto": "팔세토로의 급격한 전환 패턴",
    "hyper_adduction": "성대 과밀착 패턴",
    "under_adduction": "성대 접촉 부족 패턴",
    "mixed_pattern": "복합 패턴",
}

def detect_failure(
    phonation_eff: float, hnr_db: float, register_index: float,
    f0_range_st: float, f0_contour: list
) -> dict:
    detected = []

    # Chest lock: high register index + narrow range
    if register_index > 0.7 and f0_range_st < 4:
        detected.append(("chest_lock", 0.8))

    # Flip to falsetto: sudden pitch jump (semitone-based, ratio of adjacent frames)
    if len(f0_contour) > 10:
        f0_arr = np.array(f0_contour, dtype=float)
        f0_arr = f0_arr[f0_arr > 0]  # filter unvoiced
        if len(f0_arr) > 1:
            semitone_jumps = np.abs(12 * np.log2(f0_arr[1:] / f0_arr[:-1]))
            max_jump_st = float(np.max(semitone_jumps))
        else:
            max_jump_st = 0
        if max_jump_st > 3:  # > 3 semitone jump
            detected.append(("flip_to_falsetto", min(max_jump_st / 6, 1.0)))

    # Hyper adduction: low efficiency + high HNR
    if phonation_eff < 0.4 and hnr_db > 15:
        detected.append(("hyper_adduction", 0.7))

    # Under adduction: low efficiency + low HNR
    if phonation_eff < 0.4 and hnr_db < 10:
        detected.append(("under_adduction", 0.75))

    if len(detected) == 0:
        return {"type": None, "confidence": 0, "description": None}
    if len(detected) >= 2:
        return {"type": "mixed_pattern", "confidence": 0.6, "description": PATTERNS["mixed_pattern"]}

    pattern_type, confidence = detected[0]
    return {
        "type": pattern_type,
        "confidence": round(confidence, 2),
        "description": PATTERNS[pattern_type],
    }
