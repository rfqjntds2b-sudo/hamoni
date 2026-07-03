import pytest
import numpy as np

@pytest.fixture
def sample_rate():
    return 44100

@pytest.fixture
def clean_sine(sample_rate):
    """Clean 220Hz sine + harmonics with amplitude envelope (voice-like), SNR high"""
    t = np.linspace(0, 2, sample_rate * 2, endpoint=False)
    # Voice-like signal: F0 + harmonics with natural rolloff + amplitude modulation
    signal = np.zeros_like(t)
    for h in range(1, 15):
        signal += (1.0 / h) * np.sin(2 * np.pi * 220 * h * t)
    # Amplitude envelope (gradual onset/offset)
    envelope = np.ones_like(t)
    onset = int(0.1 * sample_rate)
    envelope[:onset] = np.linspace(0, 1, onset)
    envelope[-onset:] = np.linspace(1, 0, onset)
    signal *= envelope * 0.3
    # Add tiny noise for SNR estimation to work
    signal += 0.0005 * np.random.randn(len(t))
    return signal.astype(np.float64)

@pytest.fixture
def noisy_sine(sample_rate):
    """220Hz harmonics + moderate noise, SNR ~15-20dB"""
    t = np.linspace(0, 2, sample_rate * 2, endpoint=False)
    signal = np.zeros_like(t)
    for h in range(1, 15):
        signal += (1.0 / h) * np.sin(2 * np.pi * 220 * h * t)
    signal *= 0.3
    noise = 0.03 * np.random.randn(len(t))
    return (signal + noise).astype(np.float64)

@pytest.fixture
def clipped_sine(sample_rate):
    """Heavily clipped signal"""
    t = np.linspace(0, 2, sample_rate * 2, endpoint=False)
    signal = np.zeros_like(t)
    for h in range(1, 10):
        signal += (1.0 / h) * np.sin(2 * np.pi * 220 * h * t)
    signal *= 2.0  # overdrive
    return np.clip(signal, -1.0, 1.0).astype(np.float64)

@pytest.fixture
def silence(sample_rate):
    """Pure silence"""
    return np.zeros(sample_rate * 2, dtype=np.float64)
