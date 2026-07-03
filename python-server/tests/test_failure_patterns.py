from analyzers.failure_patterns import detect_failure

def test_under_adduction():
    result = detect_failure(
        phonation_eff=0.3, hnr_db=8.0, register_index=0.5,
        f0_range_st=8.0, f0_contour=[220]*100
    )
    assert result["type"] == "under_adduction"

def test_hyper_adduction():
    result = detect_failure(
        phonation_eff=0.3, hnr_db=18.0, register_index=0.5,
        f0_range_st=8.0, f0_contour=[220]*100
    )
    assert result["type"] == "hyper_adduction"

def test_chest_lock():
    result = detect_failure(
        phonation_eff=0.7, hnr_db=18.0, register_index=0.8,
        f0_range_st=3.0, f0_contour=[220]*100
    )
    assert result["type"] == "chest_lock"

def test_flip_to_falsetto():
    # F0 contour with a sudden ~7 semitone jump
    f0 = [220]*50 + [330]*50
    result = detect_failure(
        phonation_eff=0.7, hnr_db=18.0, register_index=0.5,
        f0_range_st=7.0, f0_contour=f0
    )
    assert result["type"] == "flip_to_falsetto"

def test_mixed_pattern():
    # Low efficiency + low HNR (under_adduction) + high register + narrow range (chest_lock)
    result = detect_failure(
        phonation_eff=0.3, hnr_db=8.0, register_index=0.8,
        f0_range_st=3.0, f0_contour=[220]*100
    )
    assert result["type"] == "mixed_pattern"

def test_healthy_no_failure():
    result = detect_failure(
        phonation_eff=0.7, hnr_db=18.0, register_index=0.5,
        f0_range_st=10.0, f0_contour=[220]*100
    )
    assert result["type"] is None
