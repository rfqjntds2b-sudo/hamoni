import numpy as np
from analyzers.quality_gate import check_quality

def test_clean_signal_passes(clean_sine, sample_rate):
    result = check_quality(clean_sine, sample_rate)
    assert result["passed"] is True
    assert result["warning"] is None
    assert result["snr_db"] > 25

def test_noisy_signal_warns(noisy_sine, sample_rate):
    result = check_quality(noisy_sine, sample_rate)
    assert result["passed"] is True
    assert result["warning"] == "low_snr"
    assert 15 <= result["snr_db"] <= 25

def test_very_noisy_fails(sample_rate):
    noise = 0.5 * np.random.randn(sample_rate * 2)
    result = check_quality(noise, sample_rate)
    assert result["passed"] is False

def test_clipped_signal_fails(clipped_sine, sample_rate):
    result = check_quality(clipped_sine, sample_rate)
    assert result["passed"] is False
    assert result["clipping_ratio"] > 0.001

def test_silence_fails(silence, sample_rate):
    result = check_quality(silence, sample_rate)
    assert result["passed"] is False
    assert result["voiced_ratio"] < 0.6
