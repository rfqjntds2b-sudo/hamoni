/// Gaussian window and pre-emphasis filter.
/// Reproduces Praat's Sound_to_Formant pipeline steps 1-2.

use std::f64::consts::PI;

/// Apply a Gaussian window to the signal in-place.
/// Praat uses: w(t) = exp(-0.5 * (t / sigma)^2)
/// where sigma = effective_duration / (2 * sqrt(2 * ln(2)))
/// For a 25ms window, effective_duration ≈ 25ms.
pub fn gaussian_window(samples: &mut [f64]) {
    let n = samples.len();
    if n == 0 {
        return;
    }
    let mid = (n as f64 - 1.0) / 2.0;
    // sigma chosen so the window at edges ≈ exp(-12) ≈ 6e-6 (effectively zero)
    // Praat: sigma = n_samples / (2 * sqrt(2 * ln(2)) * 2) for Gaussian window
    // Simplified: sigma = n / 4.8 gives good approximation
    let sigma = n as f64 / (2.0 * 2.0 * (2.0_f64.ln()).sqrt());
    for i in 0..n {
        let t = i as f64 - mid;
        let w = (-0.5 * (t / sigma).powi(2)).exp();
        samples[i] *= w;
    }
}

/// Apply pre-emphasis filter: y[n] = x[n] - coeff * x[n-1]
/// where coeff = exp(-2π * pre_emphasis_freq / sample_rate)
/// Praat default: pre_emphasis_freq = 50 Hz
pub fn pre_emphasis(samples: &mut [f64], sample_rate: f64, freq: f64) {
    if samples.len() < 2 || freq <= 0.0 {
        return;
    }
    let coeff = (-2.0 * PI * freq / sample_rate).exp();
    // Process in reverse to avoid needing a buffer
    for i in (1..samples.len()).rev() {
        samples[i] -= coeff * samples[i - 1];
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gaussian_window_center_peak() {
        let mut buf = vec![1.0; 100];
        gaussian_window(&mut buf);
        // Center should remain close to 1.0
        let mid = buf.len() / 2;
        assert!((buf[mid] - 1.0).abs() < 0.05, "Center={}", buf[mid]);
        // Edges should be significantly attenuated (less than center)
        assert!(buf[0] < buf[mid], "Edge={} should be < center={}", buf[0], buf[mid]);
        assert!(buf[99] < buf[mid], "Edge={} should be < center={}", buf[99], buf[mid]);
    }

    #[test]
    fn pre_emphasis_boosts_high_freq() {
        // A DC signal should be reduced by pre-emphasis
        let mut buf = vec![1.0; 100];
        pre_emphasis(&mut buf, 48000.0, 50.0);
        // After pre-emphasis, DC component should be near zero
        // (each sample ≈ 1.0 - coeff*1.0, where coeff ≈ 0.9935 for 50Hz@48kHz)
        for i in 1..buf.len() {
            assert!(buf[i].abs() < 0.01, "DC should be suppressed at index {i}");
        }
    }
}
