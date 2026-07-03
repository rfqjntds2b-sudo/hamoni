import numpy as np
from scipy.signal import lfilter
from analyzers.advanced_features import extract_advanced_features

def _make_vowel(sr, f0, f1, f2, duration=1.0, h1_boost=0, h2_boost=0):
    """Synthesize a vowel with controllable H1/H2 amplitudes and formants."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    signal = np.zeros_like(t)
    for h in range(1, 30):
        freq = f0 * h
        if freq > sr / 2:
            break
        amp = 1.0 / h
        if h == 1:
            amp *= 10 ** (h1_boost / 20)
        if h == 2:
            amp *= 10 ** (h2_boost / 20)
        signal += amp * np.sin(2 * np.pi * freq * t)
    # Formant filter (simple resonance)
    for fc, bw in [(f1, 80), (f2, 100)]:
        w = 2 * np.pi * fc / sr
        r = np.exp(-np.pi * bw / sr)
        b = [1.0]
        a = [1, -2 * r * np.cos(w), r ** 2]
        signal = lfilter(b, a, signal)
    signal /= np.max(np.abs(signal)) + 1e-10
    return signal * 0.8

def test_h1h2_positive_when_h1_dominates(sample_rate):
    signal = _make_vowel(sample_rate, f0=220, f1=700, f2=1200, h1_boost=6, h2_boost=0)
    features = extract_advanced_features(signal, sample_rate)
    assert features["h1_h2_star"] > 0

def test_h1h2_negative_when_h2_dominates(sample_rate):
    signal = _make_vowel(sample_rate, f0=220, f1=700, f2=1200, h1_boost=-6, h2_boost=12)
    features = extract_advanced_features(signal, sample_rate)
    assert features["h1_h2_star"] < 0

def test_formant_correction_makes_difference(sample_rate):
    signal = _make_vowel(sample_rate, f0=220, f1=700, f2=1200, h1_boost=3, h2_boost=0)
    features = extract_advanced_features(signal, sample_rate)
    assert features["h1_h2_star"] != 0

def test_cpps_positive_for_clean(clean_sine, sample_rate):
    features = extract_advanced_features(clean_sine, sample_rate)
    assert features["cpps"] > 0

def test_alpha_ratio_present(clean_sine, sample_rate):
    features = extract_advanced_features(clean_sine, sample_rate)
    assert "alpha_ratio" in features

def test_hammarberg_present(clean_sine, sample_rate):
    features = extract_advanced_features(clean_sine, sample_rate)
    assert "hammarberg_index" in features

def test_spectral_slope_present(clean_sine, sample_rate):
    features = extract_advanced_features(clean_sine, sample_rate)
    assert "0_500" in features["spectral_slope"]
    assert "500_1500" in features["spectral_slope"]
