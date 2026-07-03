import { PitchyDetector } from './pitch-detector';
import { PitchSmoother } from './pitch-smoother';
import type { PitchDetector, PitchResult } from './types';
import { frequencyToMidi, midiToNote, frequencyToCents } from './note-utils';

export type PitchCallback = (result: PitchResult | null) => void;

export class PitchEngine {
  private detector: PitchDetector;
  private smoother: PitchSmoother;
  private context: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private onPitch: PitchCallback | null = null;
  private sessionStartTime: number = 0;

  constructor() {
    this.detector = new PitchyDetector();
    this.smoother = new PitchSmoother(0.15);
  }

  async start(onPitch: PitchCallback, deviceId?: string): Promise<void> {
    if (typeof window !== 'undefined' && !window.AudioWorkletNode) {
      throw new Error('이 브라우저는 실시간 음성 분석을 지원하지 않습니다. Chrome, Safari 14.1+, Firefox 76+ 을 사용해주세요.');
    }

    this.onPitch = onPitch;
    this.sessionStartTime = performance.now();

    const audioConstraints: MediaTrackConstraints = {
      autoGainControl: false,
      noiseSuppression: false,
      echoCancellation: false,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    };
    const constraints: MediaStreamConstraints = {
      audio: audioConstraints,
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Preload pitchy before the worklet starts sending buffers
    await this.detector.ensureLoaded();

    // 48kHz 요청하되, 기기가 미지원 시 브라우저가 자동 폴백.
    // 모든 하위 계산은 this.context.sampleRate(실제값)를 사용하므로 정확도에 영향 없음.
    this.context = new AudioContext({ sampleRate: 48000 });

    await this.context.audioWorklet.addModule('/worklets/pitch-collector.js');

    this.sourceNode = this.context.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.context, 'pitch-collector');

    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'buffer') {
        this.processBuffer(event.data.buffer, event.data.rms ?? 0);
      }
    };

    this.sourceNode.connect(this.workletNode);
    // Don't connect to destination — we don't want playback
  }

  private processBuffer(buffer: Float32Array, rms: number): void {
    if (!this.context || !this.onPitch) return;

    const rawResult = this.detector.detect(buffer, this.context.sampleRate);

    if (!rawResult) {
      // 미검출: 소비자에게 null을 전달하여 차트가 gap/decay를 처리할 수 있게 함
      this.onPitch(null);
      return;
    }

    const smoothedFreq = this.smoother.push(rawResult.frequency);
    const midiNumber = frequencyToMidi(smoothedFreq);
    const note = midiToNote(midiNumber);
    const cents = frequencyToCents(smoothedFreq);

    this.onPitch({
      frequency: smoothedFreq,
      clarity: rawResult.clarity,
      note,
      midiNumber,
      cents,
      rms,
    });
  }

  getElapsedMs(): number {
    return performance.now() - this.sessionStartTime;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getAudioContext(): AudioContext | null {
    return this.context;
  }

  async stop(): Promise<void> {
    this.sourceNode?.disconnect();
    this.workletNode?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.context && this.context.state !== 'closed') {
      try { await this.context.close(); } catch { /* already closed */ }
    }
    this.sourceNode = null;
    this.workletNode = null;
    this.stream = null;
    this.context = null;
    this.smoother.reset();
    this.onPitch = null;
  }
}
