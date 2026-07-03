/// Downsampling with anti-aliasing filter.
/// Reproduces Praat's step 3: resample to 2 × maxFormant Hz.

/// Simple FIR lowpass filter + decimation.
/// cutoff_hz: cutoff frequency for the lowpass filter
/// target_rate: desired output sample rate (2 × max_formant)
/// Returns (downsampled_signal, new_sample_rate)
pub fn downsample(samples: &[f64], sample_rate: f64, target_rate: f64) -> (Vec<f64>, f64) {
    if target_rate >= sample_rate {
        return (samples.to_vec(), sample_rate);
    }

    let ratio = (sample_rate / target_rate).round() as usize;
    if ratio <= 1 {
        return (samples.to_vec(), sample_rate);
    }

    let actual_new_rate = sample_rate / ratio as f64;
    let cutoff = actual_new_rate / 2.0; // Nyquist of new rate

    // Design a simple windowed-sinc FIR lowpass filter
    let filter = design_lowpass(cutoff, sample_rate, 63); // 63 taps

    // Apply filter
    let filtered = convolve(samples, &filter);

    // Decimate
    let decimated: Vec<f64> = filtered.iter().step_by(ratio).copied().collect();

    (decimated, actual_new_rate)
}

/// Design a windowed-sinc lowpass FIR filter.
/// Uses Hamming window for good sidelobe suppression.
fn design_lowpass(cutoff: f64, sample_rate: f64, num_taps: usize) -> Vec<f64> {
    let mut filter = vec![0.0; num_taps];
    let mid = (num_taps - 1) as f64 / 2.0;
    let normalized_cutoff = cutoff / sample_rate;

    let mut sum = 0.0;
    for i in 0..num_taps {
        let n = i as f64 - mid;
        // Sinc function
        let sinc = if n.abs() < 1e-10 {
            2.0 * std::f64::consts::PI * normalized_cutoff
        } else {
            (2.0 * std::f64::consts::PI * normalized_cutoff * n).sin() / n
        };
        // Hamming window
        let window = 0.54 - 0.46 * (2.0 * std::f64::consts::PI * i as f64 / (num_taps - 1) as f64).cos();
        filter[i] = sinc * window;
        sum += filter[i];
    }

    // Normalize
    if sum.abs() > 1e-10 {
        for v in filter.iter_mut() {
            *v /= sum;
        }
    }

    filter
}

/// Simple FIR convolution (same length output, centered).
fn convolve(signal: &[f64], filter: &[f64]) -> Vec<f64> {
    let n = signal.len();
    let m = filter.len();
    let half = m / 2;
    let mut output = vec![0.0; n];

    for i in 0..n {
        let mut sum = 0.0;
        for j in 0..m {
            let idx = i as isize + j as isize - half as isize;
            if idx >= 0 && (idx as usize) < n {
                sum += signal[idx as usize] * filter[j];
            }
        }
        output[i] = sum;
    }

    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn downsample_48k_to_11k() {
        // 48000 / 11000 ≈ 4.36, rounds to 4 → actual rate = 12000
        let samples: Vec<f64> = (0..4800).map(|i| (i as f64 * 0.01).sin()).collect();
        let (result, new_rate) = downsample(&samples, 48000.0, 11000.0);
        assert_eq!(new_rate, 12000.0);
        assert_eq!(result.len(), 1200);
    }

    #[test]
    fn downsample_no_op_when_already_low() {
        let samples = vec![1.0; 100];
        let (result, new_rate) = downsample(&samples, 8000.0, 16000.0);
        assert_eq!(new_rate, 8000.0);
        assert_eq!(result.len(), 100);
    }
}
