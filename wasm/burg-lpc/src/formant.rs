/// Formant extraction from LPC coefficients via polynomial root finding.
///
/// Given LPC coefficients [a1, ..., a_p], we form the polynomial:
///   A(z) = 1 + a1*z^-1 + ... + ap*z^-p
///
/// The roots of this polynomial correspond to resonances (formants).
/// For each root with positive imaginary part:
///   Frequency = atan2(imag, real) * sample_rate / (2π)
///   Bandwidth = -ln(|root|) * sample_rate / π

use std::f64::consts::PI;

/// A detected formant with frequency and bandwidth.
#[derive(Debug, Clone, Copy)]
pub struct Formant {
    pub frequency: f64,  // Hz
    pub bandwidth: f64,  // Hz
}

/// Result of formant analysis.
#[derive(Debug, Clone)]
pub struct FormantResult {
    pub f1: Option<f64>,
    pub f2: Option<f64>,
    pub f3: Option<f64>,
    pub bw1: Option<f64>,
    pub bw2: Option<f64>,
    pub bw3: Option<f64>,
}

impl FormantResult {
    pub fn empty() -> Self {
        Self {
            f1: None, f2: None, f3: None,
            bw1: None, bw2: None, bw3: None,
        }
    }
}

/// Extract formants from LPC coefficients.
///
/// * `lpc_coeffs` - LPC coefficients [a1, ..., a_order] from Burg's method
/// * `sample_rate` - Sample rate of the (downsampled) signal
/// * `max_freq` - Maximum formant frequency to consider (typically sample_rate / 2)
/// * `max_bandwidth` - Maximum bandwidth to accept (typically 400 Hz, Praat uses 50-600)
pub fn extract_formants(
    lpc_coeffs: &[f64],
    sample_rate: f64,
    max_freq: f64,
    max_bandwidth: f64,
) -> FormantResult {
    let order = lpc_coeffs.len();
    if order == 0 {
        return FormantResult::empty();
    }

    // Build companion matrix for the polynomial 1 + a1*z^-1 + ... + ap*z^-p
    // Equivalent to finding roots of: z^p + a1*z^(p-1) + ... + ap = 0
    let roots = find_polynomial_roots(lpc_coeffs);

    // Convert roots to formants
    let mut formants: Vec<Formant> = Vec::new();

    for (re, im) in &roots {
        // Only consider roots with positive imaginary part (conjugate pairs)
        if *im <= 0.0 {
            continue;
        }

        let freq = im.atan2(*re) * sample_rate / (2.0 * PI);
        let magnitude = (re * re + im * im).sqrt();
        let bandwidth = if magnitude > 0.0 && magnitude < 1.0 {
            -(magnitude.ln()) * sample_rate / PI
        } else {
            f64::MAX
        };

        // Filter by frequency range and bandwidth
        if freq >= 50.0 && freq <= max_freq && bandwidth > 0.0 && bandwidth <= max_bandwidth {
            formants.push(Formant { frequency: freq, bandwidth });
        }
    }

    // Sort by frequency
    formants.sort_by(|a, b| a.frequency.partial_cmp(&b.frequency).unwrap());

    // Assign F1, F2, F3
    let mut result = FormantResult::empty();
    if let Some(f) = formants.first() {
        result.f1 = Some(f.frequency);
        result.bw1 = Some(f.bandwidth);
    }
    if formants.len() > 1 {
        result.f2 = Some(formants[1].frequency);
        result.bw2 = Some(formants[1].bandwidth);
    }
    if formants.len() > 2 {
        result.f3 = Some(formants[2].frequency);
        result.bw3 = Some(formants[2].bandwidth);
    }

    result
}

/// Find roots of the LPC polynomial using the companion matrix + QR iteration.
///
/// The polynomial is: z^p + a1*z^(p-1) + ... + ap = 0
/// We build a companion matrix and find eigenvalues via Francis QR iteration.
///
/// Returns a Vec of (real, imaginary) pairs for each root.
fn find_polynomial_roots(coeffs: &[f64]) -> Vec<(f64, f64)> {
    let p = coeffs.len();
    if p == 0 {
        return Vec::new();
    }
    if p == 1 {
        // z + a1 = 0 → z = -a1
        return vec![(-coeffs[0], 0.0)];
    }

    // Build companion matrix (p × p)
    // [  0  0  ...  0  -ap    ]
    // [  1  0  ...  0  -a(p-1)]
    // [  0  1  ...  0  -a(p-2)]
    // [ ... ...     ...       ]
    // [  0  0  ...  1  -a1    ]
    let mut matrix = vec![vec![0.0; p]; p];
    for i in 1..p {
        matrix[i][i - 1] = 1.0;
    }
    for i in 0..p {
        matrix[i][p - 1] = -coeffs[p - 1 - i];
    }

    // QR iteration to find eigenvalues
    qr_eigenvalues(&mut matrix)
}

/// Francis QR iteration (implicit double shift) for finding eigenvalues.
/// Returns eigenvalues as (real, imaginary) pairs.
fn qr_eigenvalues(matrix: &mut Vec<Vec<f64>>) -> Vec<(f64, f64)> {
    let n = matrix.len();
    if n == 0 {
        return Vec::new();
    }

    // First reduce to upper Hessenberg form
    hessenberg_reduce(matrix);

    let mut eigenvalues = Vec::with_capacity(n);
    let max_iterations = 100 * n;
    let mut m = n; // Current matrix size
    let mut iter_count = 0;

    while m > 0 && iter_count < max_iterations {
        iter_count += 1;

        // Check for convergence of bottom element
        if m == 1 {
            eigenvalues.push((matrix[0][0], 0.0));
            m = 0;
            continue;
        }

        // Check if subdiagonal element is negligible
        let sub = matrix[m - 1][m - 2].abs();
        let diag_sum = matrix[m - 1][m - 1].abs() + matrix[m - 2][m - 2].abs();
        let threshold = 1e-14 * diag_sum.max(1e-30);

        if sub <= threshold {
            // Deflation: eigenvalue found at bottom
            eigenvalues.push((matrix[m - 1][m - 1], 0.0));
            m -= 1;
            continue;
        }

        if m == 2 {
            // Solve 2×2 eigenvalue problem directly
            let a = matrix[0][0];
            let b = matrix[0][1];
            let c = matrix[1][0];
            let d = matrix[1][1];
            let (e1, e2) = solve_2x2(a, b, c, d);
            eigenvalues.push(e1);
            eigenvalues.push(e2);
            m = 0;
            continue;
        }

        // Check for 2×2 block convergence
        if m >= 3 {
            let sub2 = matrix[m - 2][m - 3].abs();
            let diag_sum2 = matrix[m - 2][m - 2].abs() + matrix[m - 3][m - 3].abs();
            if sub2 <= 1e-14 * diag_sum2.max(1e-30) {
                // 2×2 block deflation
                let a = matrix[m - 2][m - 2];
                let b = matrix[m - 2][m - 1];
                let c = matrix[m - 1][m - 2];
                let d = matrix[m - 1][m - 1];
                let (e1, e2) = solve_2x2(a, b, c, d);
                eigenvalues.push(e1);
                eigenvalues.push(e2);
                m -= 2;
                continue;
            }
        }

        // Perform implicit QR step with Wilkinson shift
        let shift = wilkinson_shift(
            matrix[m - 2][m - 2],
            matrix[m - 2][m - 1],
            matrix[m - 1][m - 2],
            matrix[m - 1][m - 1],
        );
        implicit_qr_step(matrix, m, shift);
    }

    eigenvalues
}

/// Reduce matrix to upper Hessenberg form using Householder reflections.
fn hessenberg_reduce(matrix: &mut Vec<Vec<f64>>) {
    let n = matrix.len();
    if n <= 2 {
        return;
    }

    for k in 0..(n - 2) {
        // Compute Householder vector for column k, rows k+1..n
        let mut x = vec![0.0; n - k - 1];
        for i in 0..x.len() {
            x[i] = matrix[k + 1 + i][k];
        }

        let norm: f64 = x.iter().map(|v| v * v).sum::<f64>().sqrt();
        if norm < 1e-30 {
            continue;
        }

        let sign = if x[0] >= 0.0 { 1.0 } else { -1.0 };
        x[0] += sign * norm;

        let x_norm: f64 = x.iter().map(|v| v * v).sum::<f64>();
        if x_norm < 1e-30 {
            continue;
        }

        // Apply Householder reflection from left: H * A
        for j in k..n {
            let mut dot = 0.0;
            for i in 0..x.len() {
                dot += x[i] * matrix[k + 1 + i][j];
            }
            let factor = 2.0 * dot / x_norm;
            for i in 0..x.len() {
                matrix[k + 1 + i][j] -= factor * x[i];
            }
        }

        // Apply Householder reflection from right: A * H
        for i in 0..n {
            let mut dot = 0.0;
            for j in 0..x.len() {
                dot += matrix[i][k + 1 + j] * x[j];
            }
            let factor = 2.0 * dot / x_norm;
            for j in 0..x.len() {
                matrix[i][k + 1 + j] -= factor * x[j];
            }
        }
    }
}

/// Implicit QR step with a real shift on an upper Hessenberg matrix.
fn implicit_qr_step(matrix: &mut Vec<Vec<f64>>, m: usize, shift: f64) {
    // Shifted first column
    let x = matrix[0][0] - shift;
    let y = matrix[1][0];

    for k in 0..(m - 1) {
        // Givens rotation to zero out element below diagonal
        let (c, s) = if k == 0 {
            givens(x, y)
        } else {
            givens(matrix[k][k - 1], matrix[k + 1][k - 1])
        };

        // Apply rotation from left
        let col_start = if k > 0 { k - 1 } else { 0 };
        for j in col_start..m {
            let t1 = matrix[k][j];
            let t2 = matrix[k + 1][j];
            matrix[k][j] = c * t1 - s * t2;
            matrix[k + 1][j] = s * t1 + c * t2;
        }

        // Apply rotation from right
        let row_end = (k + 3).min(m);
        for i in 0..row_end {
            let t1 = matrix[i][k];
            let t2 = matrix[i][k + 1];
            matrix[i][k] = c * t1 - s * t2;
            matrix[i][k + 1] = s * t1 + c * t2;
        }
    }
}

/// Compute Givens rotation parameters.
fn givens(a: f64, b: f64) -> (f64, f64) {
    if b.abs() < 1e-30 {
        return (1.0, 0.0);
    }
    let r = (a * a + b * b).sqrt();
    (a / r, -b / r)
}

/// Wilkinson shift: eigenvalue of 2×2 bottom-right submatrix closer to bottom-right element.
fn wilkinson_shift(a: f64, b: f64, c: f64, d: f64) -> f64 {
    let trace = a + d;
    let det = a * d - b * c;
    let disc = trace * trace - 4.0 * det;

    if disc >= 0.0 {
        let sqrt_disc = disc.sqrt();
        let e1 = (trace + sqrt_disc) / 2.0;
        let e2 = (trace - sqrt_disc) / 2.0;
        // Return eigenvalue closer to d
        if (e1 - d).abs() < (e2 - d).abs() { e1 } else { e2 }
    } else {
        // Complex eigenvalues — use real part
        trace / 2.0
    }
}

/// Solve 2×2 eigenvalue problem.
fn solve_2x2(a: f64, b: f64, c: f64, d: f64) -> ((f64, f64), (f64, f64)) {
    let trace = a + d;
    let det = a * d - b * c;
    let disc = trace * trace - 4.0 * det;

    if disc >= 0.0 {
        let sqrt_disc = disc.sqrt();
        let e1 = (trace + sqrt_disc) / 2.0;
        let e2 = (trace - sqrt_disc) / 2.0;
        ((e1, 0.0), (e2, 0.0))
    } else {
        let sqrt_disc = (-disc).sqrt();
        let re = trace / 2.0;
        let im = sqrt_disc / 2.0;
        ((re, im), (re, -im))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::burg::burg_lpc;

    #[test]
    fn extract_formants_from_known_signal() {
        // Generate signal with known formant-like resonances
        let sr = 10000.0;
        let n = 512;
        let samples: Vec<f64> = (0..n)
            .map(|i| {
                let t = i as f64 / sr;
                // Simulate a vowel-like signal with formants at ~700Hz and ~1200Hz
                let f1_component = (2.0 * PI * 700.0 * t).sin();
                let f2_component = 0.7 * (2.0 * PI * 1200.0 * t).sin();
                let f3_component = 0.3 * (2.0 * PI * 2500.0 * t).sin();
                f1_component + f2_component + f3_component
            })
            .collect();

        let coeffs = burg_lpc(&samples, 10).expect("Should compute LPC");
        let result = extract_formants(&coeffs, sr, sr / 2.0, 600.0);

        // We should find at least F1 and F2
        assert!(result.f1.is_some(), "F1 should be detected");
        if let Some(f1) = result.f1 {
            // F1 should be roughly near 700 Hz (within tolerance)
            assert!(f1 > 400.0 && f1 < 1000.0, "F1={f1} should be near 700Hz");
        }
    }

    #[test]
    fn extract_formants_empty_coeffs() {
        let result = extract_formants(&[], 10000.0, 5000.0, 600.0);
        assert!(result.f1.is_none());
    }

    #[test]
    fn solve_2x2_real_eigenvalues() {
        let (e1, e2) = solve_2x2(3.0, 1.0, 0.0, 2.0);
        // Eigenvalues of [[3,1],[0,2]] are 3 and 2
        assert!((e1.0 - 3.0).abs() < 1e-10);
        assert!((e2.0 - 2.0).abs() < 1e-10);
    }

    #[test]
    fn solve_2x2_complex_eigenvalues() {
        let (e1, e2) = solve_2x2(0.0, -1.0, 1.0, 0.0);
        // Eigenvalues of [[0,-1],[1,0]] are ±i
        assert!(e1.0.abs() < 1e-10); // real part ≈ 0
        assert!((e1.1.abs() - 1.0).abs() < 1e-10); // imaginary part ≈ ±1
        assert!(e2.0.abs() < 1e-10);
    }
}
