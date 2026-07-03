from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
import parselmouth
import time

from utils.audio import load_wav
from analyzers.quality_gate import check_quality
from analyzers.basic_features import extract_basic_features
from analyzers.advanced_features import extract_advanced_features
from analyzers.composite_indices import compute_indices
from analyzers.failure_patterns import detect_failure

app = FastAPI(title="HAMONI Voice Analysis Server")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    start = time.time()
    file_bytes = await audio.read()

    try:
        signal, sr = load_wav(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid WAV file: {e}")

    # Quality gate
    qg = check_quality(signal, sr)
    if not qg["passed"]:
        reasons = []
        if qg["snr_db"] < 15:
            reasons.append(f"SNR {qg['snr_db']}dB < 15dB")
        if qg["clipping_ratio"] >= 0.001:
            reasons.append(f"clipping {qg['clipping_ratio']*100:.1f}% >= 0.1%")
        if qg["voiced_ratio"] < 0.6:
            reasons.append(f"voiced ratio {qg['voiced_ratio']} < 0.6")
        return JSONResponse(
            status_code=422,
            content={"error": f"Quality gate failed: {', '.join(reasons)}", "quality_gate": qg}
        )

    try:
        # Feature extraction
        basic = extract_basic_features(signal, sr)
        advanced = extract_advanced_features(signal, sr)
        features = {**basic, **advanced}

        # Contours for mix continuity
        snd = parselmouth.Sound(signal, sampling_frequency=sr)
        pitch_obj = snd.to_pitch(time_step=0.01)
        f0_contour = [float(pitch_obj.get_value_at_time(t)) for t in pitch_obj.xs()]
        f0_contour = [v for v in f0_contour if v > 0]

        intensity_obj = snd.to_intensity()
        int_contour = [float(intensity_obj.get_value(t)) for t in intensity_obj.xs()]
        int_contour = [v for v in int_contour if not np.isnan(v)]

        contours = {
            "f0_contour": f0_contour,
            "cpp_contour": [features["cpps"]] * max(len(f0_contour), 1),  # TODO: simplified — 향후 프레임별 CPP로 교체
            "intensity_contour": int_contour,
        }

        indices = compute_indices(features, contours)
        failure = detect_failure(
            phonation_eff=indices["phonation_efficiency"],
            hnr_db=features["hnr_db"],
            register_index=indices["register_index"],
            f0_range_st=features["pitch"]["range_semitones"],
            f0_contour=f0_contour,
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Analysis pipeline error: {str(e)}"}
        )

    elapsed = round((time.time() - start) * 1000)

    return {
        "quality_gate": qg,
        "features": features,
        "indices": indices,
        "failure_pattern": failure,
        "metadata": {
            "duration_seconds": round(len(signal) / sr, 1),
            "sample_rate": sr,
            "analysis_time_ms": elapsed,
        },
    }
