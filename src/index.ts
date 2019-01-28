import { RecordingOptions } from './types';
import { FFmpegUtil } from './ffmpeg';
import { OSUtil } from './os';

type UserOptions = Exclude<RecordingOptions, 'window'>;

export class Recorder {
  static async recordActiveWindow(opts: UserOptions) {
    const final = { ...opts, window: await OSUtil.getWindow() };
    return FFmpegUtil.launchProcess(final);
  }

  static async recordWindowForPID(pid: number, opts: UserOptions) {
    const final = { ...opts, window: await OSUtil.getWindow(pid) };
    return FFmpegUtil.launchProcess(final);
  }
}