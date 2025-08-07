interface MediaRecorderEventMap {
  dataavailable: BlobEvent;
  error: Event;
  pause: Event;
  resume: Event;
  start: Event;
  stop: Event;
}

interface MediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

interface MediaRecorder extends EventTarget {
  readonly state: 'inactive' | 'recording' | 'paused';
  readonly stream: MediaStream;
  readonly mimeType: string;
  ondataavailable: ((event: BlobEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onpause: ((event: Event) => void) | null;
  onresume: ((event: Event) => void) | null;
  onstart: ((event: Event) => void) | null;
  onstop: ((event: Event) => void) | null;
  start(timeslice?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
  requestData(): void;
}

declare const MediaRecorder: {
  prototype: MediaRecorder;
  new(stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
  isTypeSupported(type: string): boolean;
};
