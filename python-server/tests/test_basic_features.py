from analyzers.basic_features import extract_basic_features

def test_pitch_extraction(clean_sine, sample_rate):
    features = extract_basic_features(clean_sine, sample_rate)
    assert 200 < features["pitch"]["median_hz"] < 240  # ~220Hz

def test_jitter_low_for_clean(clean_sine, sample_rate):
    features = extract_basic_features(clean_sine, sample_rate)
    assert features["jitter"]["local"] < 0.05

def test_shimmer_low_for_clean(clean_sine, sample_rate):
    features = extract_basic_features(clean_sine, sample_rate)
    assert features["shimmer"]["local"] < 0.1

def test_hnr_high_for_clean(clean_sine, sample_rate):
    features = extract_basic_features(clean_sine, sample_rate)
    assert features["hnr_db"] > 15

def test_formants_present(clean_sine, sample_rate):
    features = extract_basic_features(clean_sine, sample_rate)
    assert features["formants"]["f1"] > 0

def test_intensity_present(clean_sine, sample_rate):
    features = extract_basic_features(clean_sine, sample_rate)
    assert features["intensity"]["mean_db"] > 0
