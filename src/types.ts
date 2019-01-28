import * as win from '@arcsine/process-win';

export interface Bounds {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface RecordingOptions {
  window: win.Response;
  file: string;

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
    bounds
  };
  scale?: number;
  ffmpegBinary?: string;
  fps?: number;
}