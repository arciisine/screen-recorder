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
  fps?: number;
  audio?: boolean;
  duration?: number;

  window: win.Response;

  ffmpeg?: {
    binary?: string;
    transcode?: any;
    flags?: any;
  };
}

export interface GIFOptions {
  file: string;
  output?: string;
  fps?: number;
  scale?: number;

  window: {
    bounds: Bounds
  };

  ffmpeg?: {
    binary?: string;
  };
}

export interface RecordingResult {
  finish: Promise<RecordingOptions>;
  proc: ChildProcess;
  stop: (now?: boolean) => void;
}

export interface GIFResult {
  finish: Promise<string>;
  stop: (now?: boolean) => void;
}