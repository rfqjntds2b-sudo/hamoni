/**
 * FormantProcessor — AudioWorklet that accumulates audio into a ring buffer
 * and sends analysis windows to the main thread for WASM formant extraction.
 *
 * Architecture: Worklet collects samples → sends Float32Array to main thread
 * → main thread runs Burg LPC WASM → result flows to useFormantAnalyzer hook.
 */

class FormantProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const opts = options.processorOptions || {};
    this.maxFormant = opts.maxFormant || 5000;

    // Ring buffer: 25ms window @ sampleRate (e.g. 48kHz → 1200 samples)
    this.windowSamples = Math.ceil(sampleRate * 0.025);
    this.stepSamples = Math.ceil(sampleRate * 0.01); // 10ms step
    this.ringBuffer = new Float32Array(this.windowSamples);
    // Pre-allocated extraction buffer (avoids allocation per frame)
    this._extractBuffer = new Float32Array(this.windowSamples);
    this.ringPos = 0;
    this.samplesSinceLastAnalysis = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === 'config') {
        if (event.data.maxFormant) this.maxFormant = event.data.maxFormant;
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const samples = input[0];

    // Accumulate into ring buffer
    for (let i = 0; i < samples.length; i++) {
      this.ringBuffer[this.ringPos] = samples[i];
      this.ringPos = (this.ringPos + 1) % this.windowSamples;
      this.samplesSinceLastAnalysis++;
    }

    // Send analysis window every stepSamples
    if (this.samplesSinceLastAnalysis >= this.stepSamples) {
      this.samplesSinceLastAnalysis = 0;
      this._sendWindow();
    }

    return true;
  }

  _sendWindow() {
    const buf = this._extractBuffer;
    const len = this.windowSamples;

    // Linearize ring buffer into pre-allocated extraction buffer
    for (let i = 0; i < len; i++) {
      buf[i] = this.ringBuffer[(this.ringPos + i) % len];
    }

    // RMS energy check
    let sumSq = 0;
    for (let i = 0; i < len; i++) {
      sumSq += buf[i] * buf[i];
    }
    const rms = Math.sqrt(sumSq / len);

    if (rms < 0.01) {
      this.port.postMessage({
        type: 'formant',
        valid: false,
        timestamp: currentFrame / sampleRate,
      });
      return;
    }

    // Send a copy to main thread (structured clone, no Transferable —
    // avoids detached buffer risks and copy is only 1200 floats = 4.8KB)
    this.port.postMessage({
      type: 'analyze-request',
      samples: new Float32Array(buf),
      timestamp: currentFrame / sampleRate,
    });
  }
}

registerProcessor('formant-processor', FormantProcessor);
