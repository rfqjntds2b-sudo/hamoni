import numpy as np
from scipy.io import wavfile
import io
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_analyze_clean_wav():
    sr = 44100
    t = np.linspace(0, 2, sr * 2, endpoint=False)
    # Voice-like signal with harmonics
    signal = np.zeros_like(t)
    for h in range(1, 15):
        signal += (1.0 / h) * np.sin(2 * np.pi * 220 * h * t)
    signal *= 0.3
    signal += 0.0005 * np.random.randn(len(t))
    signal_int16 = (signal * 32767).astype(np.int16)
    buf = io.BytesIO()
    wavfile.write(buf, sr, signal_int16)
    buf.seek(0)

    r = client.post("/analyze", files={"audio": ("test.wav", buf, "audio/wav")})
    assert r.status_code == 200
    data = r.json()
    assert data["quality_gate"]["passed"] is True
    assert "features" in data
    assert "indices" in data
    assert "failure_pattern" in data
    assert "metadata" in data

def test_analyze_bad_quality():
    sr = 44100
    noise = (np.random.randn(sr * 2) * 16000).astype(np.int16)
    buf = io.BytesIO()
    wavfile.write(buf, sr, noise)
    buf.seek(0)

    r = client.post("/analyze", files={"audio": ("noise.wav", buf, "audio/wav")})
    assert r.status_code == 422
    data = r.json()
    assert "error" in data
