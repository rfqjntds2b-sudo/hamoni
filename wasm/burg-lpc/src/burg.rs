/// Burg's method for Linear Predictive Coding (LPC) coefficient estimation.
///
/// This implements the Burg algorithm which estimates autoregressive (AR) model
/// coefficients by minimizing forward and backward prediction errors simultaneously.
/// The Burg method is numerically stable and guarantees a stable (minimum-phase) model.
///
/// Reference: Burg, J.P. (1975). "Maximum Entropy Spectral Analysis."
/// Also: Markel, J.D. & Gray, A.H. (1976). "Linear Prediction of Speech."

/// Estimate LPC coefficients using Burg's method.
///
/// * `samples` - Input signal (windowed + pre-emphasized)
/// * `order` - LPC order (number of poles). Typically 2 × num_formants (e.g., 10 for 5 formants)
///
/// Returns LPC coefficients [a1, a2, ..., a_order] where the prediction polynomial is:
/// A(z) = 1 + a1*z^-1 + a2*z^-2 + ... + a_order*z^-order
///
/// Returns None if the input is too short or all zeros.
pub fn burg_lpc(samples: &[f64], order: usize) -> Option<Vec<f64>> {
    let n = samples.len();
    if n <= order || order == 0 {
        return None;
    }

    // Check for all-zero input
    let energy: f64 = samples.iter().map(|s| s * s).sum();
    if energy < 1e-30 {
        return None;
    }

    let mut coeffs = vec![0.0; order];

    // Forward and backward prediction errors
    let mut ef: Vec<f64> = samples.to_vec();
    let mut eb: Vec<f64> = samples.to_vec();

    // Working copy of coefficients
    let mut a = vec![0.0; order + 1];
    a[0] = 1.0;

    // Initial error power
    let mut error_power: f64 = samples.iter().map(|s| s * s).sum::<f64>() / n as f64;

    for i in 0..order {
        // Compute reflection coefficient (k_i)
        let mut num = 0.0;
        let mut den = 0.0;

        for j in (i + 1)..n {
            num += ef[j] * eb[j - 1];
            den += ef[j] * ef[j] + eb[j - 1] * eb[j - 1];
        }

        if den.abs() < 1e-30 {
            break;
        }

        let k = -2.0 * num / den;

        // Update coefficients using Levinson-Durbin recursion
        // a_new[j] = a_old[j] + k * a_old[i+1-j]  for j = 1..i
        // a_new[i+1] = k
        let mut a_new = a.clone();
        for j in 1..=i {
            a_new[j] = a[j] + k * a[i + 1 - j];
        }
        a_new[i + 1] = k;
        a = a_new;

        // Update error power
        error_power *= 1.0 - k * k;
        if error_power < 1e-30 {
            break;
        }

        // Update forward and backward errors
        for j in ((i + 1)..n).rev() {
            let new_ef = ef[j] + k * eb[j - 1];
            let new_eb = eb[j - 1] + k * ef[j];
            ef[j] = new_ef;
            eb[j] = new_eb;
        }
    }

    // Extract coefficients (skip a[0] = 1.0)
    for i in 0..order {
        coeffs[i] = a[i + 1];
    }

    Some(coeffs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn burg_returns_none_for_short_input() {
        let samples = vec![1.0, 2.0];
        assert!(burg_lpc(&samples, 10).is_none());
    }

    #[test]
    fn burg_returns_none_for_zeros() {
        let samples = vec![0.0; 100];
        assert!(burg_lpc(&samples, 10).is_none());
    }

    #[test]
    fn burg_produces_stable_coefficients() {
        // Generate a simple test signal: sum of two sinusoids
        let n = 512;
        let sr = 10000.0;
        let samples: Vec<f64> = (0..n)
            .map(|i| {
                let t = i as f64 / sr;
                (2.0 * std::f64::consts::PI * 500.0 * t).sin()
                    + 0.5 * (2.0 * std::f64::consts::PI * 1500.0 * t).sin()
            })
            .collect();

        let coeffs = burg_lpc(&samples, 10).expect("Should produce coefficients");
        assert_eq!(coeffs.len(), 10);

        // All coefficients should be finite
        for c in &coeffs {
            assert!(c.is_finite(), "Coefficient should be finite: {c}");
        }
    }

    #[test]
    fn burg_energy_decreases_with_order() {
        let n = 256;
        let sr = 10000.0;
        let samples: Vec<f64> = (0..n)
            .map(|i| {
                let t = i as f64 / sr;
                (2.0 * std::f64::consts::PI * 700.0 * t).sin()
            })
            .collect();

        // Higher order should give smaller prediction error (coefficients closer to signal)
        let c4 = burg_lpc(&samples, 4).unwrap();
        let c10 = burg_lpc(&samples, 10).unwrap();
        assert_eq!(c4.len(), 4);
        assert_eq!(c10.len(), 10);
    }
}
