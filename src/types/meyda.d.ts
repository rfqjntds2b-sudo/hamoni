declare module 'meyda' {
  interface MeydaAnalyzerOptions {
    audioContext: AudioContext;
    source: AudioNode;
    bufferSize: number;
    featureExtractors: string[];
    callback: (features: Record<string, number | null>) => void;
  }
  interface MeydaAnalyzer {
    start(): void;
    stop(): void;
  }
  function createMeydaAnalyzer(options: MeydaAnalyzerOptions): MeydaAnalyzer;
  export default { createMeydaAnalyzer };
}
