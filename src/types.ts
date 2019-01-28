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
  animatedGif?: boolean;
  audio?: boolean;
  duration?: number;
  countdown?: number;
  transcode?: any;
  flags?: any;
}