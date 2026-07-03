import numpy as np
from scipy.io import wavfile
from scipy.signal import resample
import io

TARGET_SR = 44100

def load_wav(file_bytes: bytes) -> tuple[np.ndarray, int]:
    """Load WAV from bytes, return (signal, sample_rate)."""
    sr, data = wavfile.read(io.BytesIO(file_bytes))
    # Convert to float64 normalized [-1, 1]
    if data.dtype == np.int16:
        data = data.astype(np.float64) / 32768.0
    elif data.dtype == np.int32:
        data = data.astype(np.float64) / 2147483648.0
    elif data.dtype == np.float32:
        data = data.astype(np.float64)
    # Mono
    if data.ndim > 1:
        data = data.mean(axis=1)
    # Resample to target
    if sr != TARGET_SR:
        num_samples = int(len(data) * TARGET_SR / sr)
        data = resample(data, num_samples)
        sr = TARGET_SR
    return data, sr
