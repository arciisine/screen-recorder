import * as win from '@arcsine/win-info';
import { ChildProcess } from 'child_process';

export interface Bounds {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface RecordingOptions {
  file: string;
  window: win.Response;

  ffmpegBinary?: string;
  fps?: number;
  audio?: boolean;
  duration?: number;
  countdown?: number;
  transcode?: any;
  flags?: any;
}

export interface GIFOptions {
  file: string;
  window: {
    bounds: Bounds
  };
  scale?: number;
  ffmpegBinary?: string;
  fps?: number;
}

export interface RecordingResult {
  finish: Promise<RecordingOptions>;
  proc: ChildProcess;
  stop: () => void;
}

export interface GIFResult {
  finish: Promise<string>;
  stop: (now?: boolean) => void;
}