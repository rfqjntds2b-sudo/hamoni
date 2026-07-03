import numpy as np
import parselmouth
from parselmouth.praat import call
from scipy.fft import rfft, rfftfreq

def extract_advanced_features(signal: np.ndarray, sr: int) -> dict:
    snd = parselmouth.Sound(signal, sampling_frequency=sr)

    # --- CPPS ---
    try:
        cepstrogram = call(snd, "To PowerCepstrogram", 60, 0.002, 5000, 50)
        cpps = call(cepstrogram, "Get CPPS", False, 0.02, 0.0005, 60, 330, 0.05,
                    "Parabolic", 0.001, 0, "Exponential decay", "Robust slow")
    except Exception:
        cpps = 0.0

    # --- H1*-H2* (Iseli-Alwan correction) ---
    pitch = snd.to_pitch()
    formant = snd.to_formant_burg()
    spectrum = snd.to_spectrum()
    mid_time = snd.duration / 2
    f0_val = pitch.get_value_at_time(mid_time)
    f1_val = call(formant, "Get value at time", 1, mid_time, "Hertz", "Linear")
    f2_val = call(formant, "Get value at time", 2, mid_time, "Hertz", "Linear")

    h1_h2_star = 0.0
    if f0_val and f0_val > 0 and not np.isnan(f0_val):
        h1_amp = _get_harmonic_amp(spectrum, f0_val)
        h2_amp = _get_harmonic_amp(spectrum, f0_val * 2)
        raw_h1_h2 = h1_amp - h2_amp

        corr_h1 = _iseli_correction(f0_val, f1_val, f2_val) if f1_val and not np.isnan(f1_val) else 0
        corr_h2 = _iseli_correction(f0_val * 2, f1_val, f2_val) if f1_val and not np.isnan(f1_val) else 0
        h1_h2_star = raw_h1_h2 - corr_h1 + corr_h2

    # --- Spectral measures (FFT-based) ---
    N = len(signal)
    freqs = rfftfreq(N, 1 / sr)
    magnitudes = np.abs(rfft(signal))
    power = magnitudes ** 2

    def band_energy(low, high):
        mask = (freqs >= low) & (freqs < high)
        return np.sum(power[mask]) if np.any(mask) else 1e-20

    # Alpha Ratio
    alpha_ratio = 10 * np.log10(band_energy(1000, 5000) / max(band_energy(50, 1000), 1e-20))

    # Hammarberg Index
    mask_low = (freqs >= 0) & (freqs < 2000)
    mask_high = (freqs >= 2000) & (freqs < 5000)
    max_low = np.max(power[mask_low]) if np.any(mask_low) else 1e-20
    max_high = np.max(power[mask_high]) if np.any(mask_high) else 1e-20
    hammarberg = 10 * np.log10(max_low / max(max_high, 1e-20))

    # Spectral Slope
    def spectral_slope(low, high):
        mask = (freqs >= low) & (freqs < high)
        f = freqs[mask]
        p = 10 * np.log10(power[mask] + 1e-20)
        if len(f) < 2:
            return 0.0
        coeffs = np.polyfit(f, p, 1)
        return float(coeffs[0])

    return {
        "cpps": round(float(cpps), 1),
        "h1_h2_star": round(float(h1_h2_star), 1),
        "alpha_ratio": round(float(alpha_ratio), 1),
        "hammarberg_index": round(float(hammarberg), 1),
        "spectral_slope": {
            "0_500": round(spectral_slope(0, 500), 4),
            "500_1500": round(spectral_slope(500, 1500), 4),
        },
    }


def _get_harmonic_amp(spectrum, freq_hz: float) -> float:
    """Get amplitude at a specific frequency from Praat Spectrum."""
    try:
        bin_width = spectrum.dx
        bin_idx = int(round(freq_hz / bin_width))
        values = spectrum.values
        if bin_idx < values.shape[1]:
            real = values[0, bin_idx]
            imag = values[1, bin_idx] if values.shape[0] > 1 else 0
            return 20 * np.log10(np.sqrt(real**2 + imag**2) + 1e-20)
    except Exception:
        pass
    return 0.0


def _iseli_correction(freq_hz: float, f1: float, f2: float) -> float:
    """Simplified Iseli-Alwan (2007) formant correction for harmonic magnitudes."""
    correction = 0.0
    for fc in [f1, f2]:
        if fc and fc > 0 and not np.isnan(fc):
            ratio = freq_hz / fc
            denom = abs(1 - ratio ** 2)
            if denom > 0.01:
                correction += 20 * np.log10(1.0 / denom)
    return correction
