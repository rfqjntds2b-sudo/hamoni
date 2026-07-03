class PitchCollectorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(2048);
    this._writeIndex = 0;
    this._bufferA = new Float32Array(2048);
    this._bufferB = new Float32Array(2048);
    this._useA = true;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0]; // 128 samples

    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._writeIndex++] = channelData[i];

      if (this._writeIndex >= 2048) {
        // Double buffering: copy to transfer buffer
        const outBuffer = this._useA ? this._bufferA : this._bufferB;
        outBuffer.set(this._buffer);
        this._useA = !this._useA;

        // Calculate RMS
        let sumSq = 0;
        for (let j = 0; j < this._buffer.length; j++) {
          sumSq += this._buffer[j] * this._buffer[j];
        }
        const rms = Math.sqrt(sumSq / this._buffer.length);

        this.port.postMessage(
          { type: 'buffer', buffer: outBuffer, rms },
          [outBuffer.buffer]
        );

        // Recreate the transferred buffer immediately
        // _useA was already toggled, so the opposite is what we just sent
        if (!this._useA) {
          this._bufferA = new Float32Array(2048);
        } else {
          this._bufferB = new Float32Array(2048);
        }

        this._writeIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('pitch-collector', PitchCollectorProcessor);
