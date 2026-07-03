from analyzers.composite_indices import compute_indices

def _base_features():
    return {
        "hnr_db": 18.0, "cpps": 12.0, "h1_h2_star": 5.0,
        "alpha_ratio": -8.0, "hammarberg_index": 22.0,
        "spectral_slope": {"0_500": -0.01, "500_1500": -0.008},
        "jitter": {"local": 0.01}, "shimmer": {"local": 0.03},
        "pitch": {"median_hz": 220, "range_semitones": 10},
        "intensity": {"mean_db": 72, "range_db": 15},
    }

def _base_contours():
    # TODO: cpp_contour는 단일값 복제 — 향후 프레임별 CPP로 교체
    return {"f0_contour": [220]*100, "cpp_contour": [12]*100, "intensity_contour": [72]*100}

def test_indices_in_range():
    result = compute_indices(_base_features(), _base_contours())
    assert 0 <= result["register_index"] <= 1
    assert 0 <= result["phonation_efficiency"] <= 1
    assert 0 <= result["mix_continuity"] <= 1

def test_higher_hnr_improves_phonation_efficiency():
    f_low = {**_base_features(), "hnr_db": 5.0}
    f_high = {**_base_features(), "hnr_db": 25.0}
    c = _base_contours()
    low = compute_indices(f_low, c)["phonation_efficiency"]
    high = compute_indices(f_high, c)["phonation_efficiency"]
    assert high > low

def test_zero_inputs():
    features = {
        "hnr_db": 0, "cpps": 0, "h1_h2_star": 0,
        "alpha_ratio": 0, "hammarberg_index": 0,
        "spectral_slope": {"0_500": 0, "500_1500": 0},
        "jitter": {"local": 0}, "shimmer": {"local": 0},
        "pitch": {"median_hz": 0, "range_semitones": 0},
        "intensity": {"mean_db": 0, "range_db": 0},
    }
    contours = {"f0_contour": [], "cpp_contour": [], "intensity_contour": []}
    result = compute_indices(features, contours)
    assert 0 <= result["register_index"] <= 1
    assert 0 <= result["phonation_efficiency"] <= 1
    assert 0 <= result["mix_continuity"] <= 1
