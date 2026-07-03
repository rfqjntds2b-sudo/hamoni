/* @ts-self-types="./burg_lpc.d.ts" */

/**
 * Result structure returned to JavaScript.
 * Using a flat struct for efficient WASM↔JS transfer.
 */
export class WasmFormantResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(WasmFormantResult.prototype);
        obj.__wbg_ptr = ptr;
        WasmFormantResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmFormantResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmformantresult_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get bw1() {
        const ret = wasm.__wbg_get_wasmformantresult_bw1(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get bw2() {
        const ret = wasm.__wbg_get_wasmformantresult_bw2(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get bw3() {
        const ret = wasm.__wbg_get_wasmformantresult_bw3(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get f1() {
        const ret = wasm.__wbg_get_wasmformantresult_f1(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get f2() {
        const ret = wasm.__wbg_get_wasmformantresult_f2(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get f3() {
        const ret = wasm.__wbg_get_wasmformantresult_f3(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    get valid() {
        const ret = wasm.__wbg_get_wasmformantresult_valid(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {number} arg0
     */
    set bw1(arg0) {
        wasm.__wbg_set_wasmformantresult_bw1(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set bw2(arg0) {
        wasm.__wbg_set_wasmformantresult_bw2(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set bw3(arg0) {
        wasm.__wbg_set_wasmformantresult_bw3(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set f1(arg0) {
        wasm.__wbg_set_wasmformantresult_f1(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set f2(arg0) {
        wasm.__wbg_set_wasmformantresult_f2(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set f3(arg0) {
        wasm.__wbg_set_wasmformantresult_f3(this.__wbg_ptr, arg0);
    }
    /**
     * @param {boolean} arg0
     */
    set valid(arg0) {
        wasm.__wbg_set_wasmformantresult_valid(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) WasmFormantResult.prototype[Symbol.dispose] = WasmFormantResult.prototype.free;

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
 * @param {Float32Array} samples
 * @param {number} sample_rate
 * @param {number} max_formant
 * @param {number} num_formants
 * @param {number} pre_emphasis_freq
 * @returns {WasmFormantResult}
 */
export function analyze_formants(samples, sample_rate, max_formant, num_formants, pre_emphasis_freq) {
    const ptr0 = passArrayF32ToWasm0(samples, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.analyze_formants(ptr0, len0, sample_rate, max_formant, num_formants, pre_emphasis_freq);
    return WasmFormantResult.__wrap(ret);
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_6ddd609b62940d55: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./burg_lpc_bg.js": import0,
    };
}

const WasmFormantResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmformantresult_free(ptr >>> 0, 1));

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('burg_lpc_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
