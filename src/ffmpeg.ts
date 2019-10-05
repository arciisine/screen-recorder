import * as os from 'os';
import * as path from 'path';

import { Util } from './util';
import { RecordingOptions, GIFOptions, RecordingResult, GIFResult } from './types';
import { OSUtil } from './os';

export class FFmpegUtil {

  static recordingArgs = {
    common: {
      threads: 4,
    },
    audio: {
      'b:a': '384k',
      'c:a': 'aac',
      ac: 1,
      //      vbr: 3
    },
    video: {
      preset: 'ultrafast',
      crf: 10,
      pix_fmt: 'yuvj444p',
      'c:v': 'libx264',
      y: '',
    }
  };

  private static get(src: any, key: string, target: any, customKeyOverride?: string) {
    const val = src[customKeyOverride || key] || target[key];
    return val === undefined ? [] : [`-${key}`, val];
  }

  private static getAll(src: any, target: any, keys: string[] = Object.keys(target), override?: (x: string) => string) {
    return keys.reduce((acc, k) => {
      acc.push(...this.get(src, k, target, override ? override(k) : k));
      return acc;
    }, [] as string[]);
  }

  private static getCommon(opts: RecordingOptions) {
    return [
      ...this.getAll(opts.ffmpeg!.flags || {}, this.recordingArgs.common),
      ...this.getAll(opts.ffmpeg!.flags || {}, { r: opts.fps }),
    ];
  }

  static async getWin32Args(opts: RecordingOptions) {
    const getAll = this.getAll.bind(this, opts.ffmpeg!.flags || {});
    const devs = await OSUtil.getWinDevices(opts.ffmpeg!.binary!, opts.audio);
    const out: string[] = [];
    const win = opts.window;

    if (opts.duration) {
      out.unshift('-t', `${opts.duration}`);
    }

    out.push(
      ...this.getCommon(opts),
      ...getAll({
        video_size: `${win.bounds.width}x${win.bounds.height}`
      })
    );

    if (opts.audio) {
      out.push(
        ...getAll({
          f: 'dshow',
          i: `audio="${devs.audio}"`,
        })
      );
    }

    out.push(
      ...getAll({
        offset_x: `${win.bounds.x}`,
        offset_y: `${win.bounds.y}`,
        f: 'gdigrab',
        i: 'desktop',
      }),
      ...getAll(this.recordingArgs.video)
    );

    if (opts.audio) {
      out.push(
        ...getAll(this.recordingArgs.audio),
      );
    }

    return out;
  }

  static async getDarwinArgs(opts: RecordingOptions) {
    const { window: { bounds, screens } } = opts;

    const getAll = this.getAll.bind(this, (opts.ffmpeg!.flags) || {});
    const devs = await OSUtil.getMacInputDevices(opts.ffmpeg!.binary!, opts.window, opts.audio);

    const screen = screens.find(s => // Grab screen which has the top-left corner
      bounds.x >= s.x && bounds.x <= s.x + s.width &&
      bounds.y >= s.y && bounds.y <= s.y + s.height)!;

    const out: string[] = [];
    if (opts.duration) {
      out.unshift('-t', `${opts.duration}`);
    }
    out.push(
      ...getAll({
        capture_cursor: 1
      }),
      ...this.getCommon(opts),
      // '-video_size', `${bounds.width}x${bounds.height}`,
      ...getAll({
        f: 'avfoundation',
        i: `${devs.video}:${devs.audio}`
      })
    );

    if (opts.audio) {
      out.push(
        ...getAll(this.recordingArgs.audio),
      );
    }

    out.push(
      ...getAll(this.recordingArgs.video),
      ...getAll({
        vf: `'scale=${screen.width}:${screen.height}:flags=lanczos,crop=${bounds.width}:${bounds.height}:${Math.abs(screen.x - bounds.x)}:${Math.abs(screen.y - bounds.y)}'`
      })
    );

    return out;
  }

  static async getX11Args(opts: RecordingOptions) {
    const getAll = this.getAll.bind(this, opts.ffmpeg!.flags || {});
    const out: string[] = [];
    const { bounds } = opts.window;

    if (opts.duration) {
      out.unshift('-t', `${opts.duration}`);
    }

    out.push(
      ...this.getCommon(opts),
      ...getAll({
        video_size: `${bounds.width}x${bounds.height}`,
        f: 'x11grab',
        i: `:0.0+${bounds.x},${bounds.y}`
      })
    );

    if (opts.audio) {
      out.push(
        ...getAll({
          f: 'pulse',
          i: 'default',
        }),
        ...getAll(this.recordingArgs.audio),
      );
    }

    out.push(
      ...getAll(this.recordingArgs.video),
    );

    return out;
  }

  static async findFFmpegBinIfMissing<T extends { ffmpeg?: { binary?: string } }>(opts: T): Promise<T & { ffmpeg: { binary: string } }> {
    if (!opts.ffmpeg || !opts.ffmpeg.binary) {
      opts.ffmpeg = opts.ffmpeg || {};
      opts.ffmpeg.binary = await OSUtil.findFileOnPath(process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    }
    return opts as T & { ffmpeg: { binary: string } };
  }

  static async startRecording(options: RecordingOptions): Promise<RecordingResult> {
    const opts = await this.findFFmpegBinIfMissing(options);

    let args: string[];

    switch (process.platform) {
      case 'win32': args = await this.getWin32Args(opts); break;
      case 'darwin': args = await this.getDarwinArgs(opts); break;
      case 'linux':
      case 'freebsd':
      case 'openbsd':
      case 'sunos':
        args = await this.getX11Args(opts);
        break;
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }

    const { finish, kill, proc } = await Util.processToPromise(opts.ffmpeg.binary, [...args, opts.file]);
    return {
      finish: finish.then(x => opts),
      stop: (now?: boolean) => {
        if (now) {
          kill(now);
        } else {
          proc.stdin!.write('q'); // Send kill command
        }
      },
      proc
    };
  }

  static async generateGIF(options: GIFOptions): Promise<GIFResult> {
    const opts = await this.findFFmpegBinIfMissing(options);

    const ffmpeg = opts.ffmpeg.binary;
    const { bounds } = opts.window;

    let vf = `fps=${opts.fps}`;
    if (opts.scale) {
      vf = `${vf},scale=${Math.trunc(bounds.width * opts.scale)}:${Math.trunc(bounds.height * opts.scale)}`;
    } else {
      vf = `${vf},scale=${bounds.width}:${bounds.height}`;
    }

    vf = `${vf}:flags=lanczos`;

    const paletteFile = path.resolve(os.tmpdir(), `palette-gen.${Math.random()}.${Date.now()}.png`);
    const final = opts.output || (/.mp4$/.test(opts.file) ? opts.file.replace('.mp4', '.gif') : `${opts}.gif`);

    console.log('vf', vf);

    const { finish: finishPalette } = Util.processToPromise(ffmpeg, [
      '-i', opts.file,
      '-vf', `${vf},palettegen=stats_mode=diff`,
      '-y', paletteFile
    ]);

    await finishPalette;

    const { finish, kill } = Util.processToPromise(ffmpeg, [
      '-i', opts.file,
      '-i', paletteFile,
      '-lavfi', `"${vf},paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle"`,
      '-y', final
    ]);

    return { finish: finish.then(x => final), stop: kill };
  }
}