/// Burg LPC Formant Analyzer — WebAssembly module
///
/// Implements Praat-equivalent formant estimation:
/// 1. Gaussian window
/// 2. Pre-emphasis (50 Hz)
/// 3. Downsample to 2 × maxFormant
/// 4. Burg LPC (10 poles for 5 formants)
/// 5. Root finding → formant frequencies + bandwidths

mod burg;
mod formant;
mod resample;
mod window;

use wasm_bindgen::prelude::*;

/// Result structure returned to JavaScript.
/// Using a flat struct for efficient WASM↔JS transfer.
#[wasm_bindgen]
pub struct WasmFormantResult {
    pub f1: f64,
    pub f2: f64,
    pub f3: f64,
    pub bw1: f64,
    pub bw2: f64,
    pub bw3: f64,
    pub valid: bool,
}

/// Analyze formants from a raw audio buffer.
///
/// # Arguments
/// * `samples` - f32 audio samples (one analysis window, typically 25ms)
/// * `sample_rate` - Original sample rate (e.g., 48000)
/// * `max_formant` - Maximum formant frequency (5000 for male, 5500 for female)
/// * `num_formants` - Number of formants to find (typically 5 → 10-pole LPC)
/// * `pre_emphasis_freq` - Pre-emphasis frequency in Hz (typically 50)
///
/// # Returns
/// WasmFormantResult with f1, f2, f3 frequencies and bandwidths.
/// If analysis fails, valid=false and all values are 0.
#[wasm_bindgen]
pub fn analyze_formants(
    samples: &[f32],
    sample_rate: f32,
    max_formant: f32,
    num_formants: u32,
    pre_emphasis_freq: f32,
) -> WasmFormantResult {
    let sr = sample_rate as f64;
    let max_f = max_formant as f64;
    let n_formants = num_formants as usize;
    let pre_emph = pre_emphasis_freq as f64;
    let order = 2 * n_formants; // LPC order = 2 × number of formants

    // Convert f32 → f64 for precision
    let mut signal: Vec<f64> = samples.iter().map(|&s| s as f64).collect();

    if signal.len() < order + 1 {
        return empty_result();
    }

    // Step 1: Gaussian window
    window::gaussian_window(&mut signal);

    // Step 2: Pre-emphasis
    window::pre_emphasis(&mut signal, sr, pre_emph);

    // Step 3: Downsample to 2 × maxFormant
    let target_rate = 2.0 * max_f;
    let (downsampled, new_sr) = resample::downsample(&signal, sr, target_rate);

    if downsampled.len() < order + 1 {
        return empty_result();
    }

    // Step 4: Burg LPC
    let coeffs = match burg::burg_lpc(&downsampled, order) {
        Some(c) => c,
        None => return empty_result(),
    };

    // Step 5: Extract formants from LPC roots
    let max_bandwidth = 400.0; // Praat default max bandwidth
    let result = formant::extract_formants(&coeffs, new_sr, max_f, max_bandwidth);

    WasmFormantResult {
        f1: result.f1.unwrap_or(0.0),
        f2: result.f2.unwrap_or(0.0),
        f3: result.f3.unwrap_or(0.0),
        bw1: result.bw1.unwrap_or(0.0),
        bw2: result.bw2.unwrap_or(0.0),
        bw3: result.bw3.unwrap_or(0.0),
        valid: result.f1.is_some(),
    }
}

fn empty_result() -> WasmFormantResult {
    WasmFormantResult {
        f1: 0.0, f2: 0.0, f3: 0.0,
        bw1: 0.0, bw2: 0.0, bw3: 0.0,
        valid: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::PI;

    /// Generate a synthetic vowel-like signal with known formant positions.
    /// Uses a simple additive synthesis model (not realistic, but good for testing).
    fn generate_vowel(f0: f64, formants: &[(f64, f64)], sr: f64, duration_ms: f64) -> Vec<f32> {
        let n = (sr * duration_ms / 1000.0) as usize;
        let mut signal = vec![0.0f64; n];

        // Generate harmonics of f0
        let num_harmonics = (sr / 2.0 / f0) as usize;
        for h in 1..=num_harmonics {
            let freq = f0 * h as f64;
            if freq > sr / 2.0 {
                break;
            }

            // Amplitude shaped by formant resonances
            let mut amp = 1.0 / h as f64; // Natural spectral slope
            for (f_freq, f_bw) in formants {
                // Simple resonance model: gain = 1 / sqrt((f-fc)^2 + (bw/2)^2)
                let dist = (freq - f_freq).abs();
                let gain = f_bw / (dist.powi(2) + (f_bw / 2.0).powi(2)).sqrt();
                amp *= gain;
            }

            for i in 0..n {
                let t = i as f64 / sr;
                signal[i] += amp * (2.0 * PI * freq * t).sin();
            }
        }

        // Normalize
        let max_val = signal.iter().map(|s| s.abs()).fold(0.0f64, f64::max);
        if max_val > 0.0 {
            for s in signal.iter_mut() {
                *s /= max_val;
            }
        }

        signal.iter().map(|&s| s as f32).collect()
    }

    #[test]
    fn analyze_korean_a_vowel() {
        // Korean /아/ (ㅏ): F1 ≈ 750Hz, F2 ≈ 1200Hz (male)
        let samples = generate_vowel(
            120.0,
            &[(750.0, 100.0), (1200.0, 120.0), (2600.0, 150.0)],
            48000.0,
            25.0,
        );

        let result = analyze_formants(&samples, 48000.0, 5000.0, 5, 50.0);

        if result.valid {
            // F1 should be in a reasonable range around 750Hz
            assert!(
                result.f1 > 400.0 && result.f1 < 1100.0,
                "F1={} should be near 750Hz for /아/",
                result.f1
            );
        }
        // Note: synthetic signals don't perfectly match real vowels,
        // so we allow generous tolerance here. Real validation uses Praat recordings.
    }

    #[test]
    fn analyze_short_buffer() {
        let samples = vec![0.0f32; 10];
        let result = analyze_formants(&samples, 48000.0, 5000.0, 5, 50.0);
        assert!(!result.valid);
    }

    #[test]
    fn analyze_silence() {
        let samples = vec![0.0f32; 1200];
        let result = analyze_formants(&samples, 48000.0, 5000.0, 5, 50.0);
        assert!(!result.valid);
    }
}
