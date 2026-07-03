/* tslint:disable */
/* eslint-disable */

/**
 * Result structure returned to JavaScript.
 * Using a flat struct for efficient WASM↔JS transfer.
 */
export class WasmFormantResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    bw1: number;
    bw2: number;
    bw3: number;
    f1: number;
    f2: number;
    f3: number;
    valid: boolean;
}

/**
 * Analyze formants from a raw audio buffer.
 *
 * # Arguments
 * * `samples` - f32 audio samples (one analysis window, typically 25ms)
 * * `sample_rate` - Original sample rate (e.g., 48000)
 * * `max_formant` - Maximum formant frequency (5000 for male, 5500 for female)
 * * `num_formants` - Number of formants to find (typically 5 → 10-pole LPC)
 * * `pre_emphasis_freq` - Pre-emphasis frequency in Hz (typically 50)
 *
 * # Returns
 * WasmFormantResult with f1, f2, f3 frequencies and bandwidths.
 * If analysis fails, valid=false and all values are 0.
 */
export function analyze_formants(samples: Float32Array, sample_rate: number, max_formant: number, num_formants: number, pre_emphasis_freq: number): WasmFormantResult;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_get_wasmformantresult_bw1: (a: number) => number;
    readonly __wbg_get_wasmformantresult_bw2: (a: number) => number;
    readonly __wbg_get_wasmformantresult_bw3: (a: number) => number;
    readonly __wbg_get_wasmformantresult_f1: (a: number) => number;
    readonly __wbg_get_wasmformantresult_f2: (a: number) => number;
    readonly __wbg_get_wasmformantresult_f3: (a: number) => number;
    readonly __wbg_get_wasmformantresult_valid: (a: number) => number;
    readonly __wbg_set_wasmformantresult_bw1: (a: number, b: number) => void;
    readonly __wbg_set_wasmformantresult_bw2: (a: number, b: number) => void;
    readonly __wbg_set_wasmformantresult_bw3: (a: number, b: number) => void;
    readonly __wbg_set_wasmformantresult_f1: (a: number, b: number) => void;
    readonly __wbg_set_wasmformantresult_f2: (a: number, b: number) => void;
    readonly __wbg_set_wasmformantresult_f3: (a: number, b: number) => void;
    readonly __wbg_set_wasmformantresult_valid: (a: number, b: number) => void;
    readonly __wbg_wasmformantresult_free: (a: number, b: number) => void;
    readonly analyze_formants: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
