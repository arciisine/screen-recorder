import { RecordingOptions, GIFOptions } from './types';
import { FFmpegUtil } from './ffmpeg';
import { OSUtil } from './os';

type UserOptions = Exclude<RecordingOptions, 'window'>;

export class Recorder {
  static async recordActiveWindow(opts: UserOptions) {
    const final = { ...opts, window: await OSUtil.getWindow() };
    return FFmpegUtil.startRecording(final);
  }

  static async recordWindowForPID(pid: number, opts: UserOptions) {
    const final = { ...opts, window: await OSUtil.getWindow(pid) };
    return FFmpegUtil.startRecording(final);
  }

  static async recordWindow(opts: RecordingOptions) {
    return FFmpegUtil.startRecording(opts);
  }

  static async generateGIF(opts: GIFOptions) {
    return FFmpegUtil.generateGIF(opts);
  }
}