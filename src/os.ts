import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as win from '@arcsine/win-info';

import { Util } from './util';

const exists = util.promisify(fs.exists);

export class OSUtil {

  static async findFileOnPath(name: string, extra: string[] = []) {
    const paths = (process.env.PATH || '')
      .split(path.delimiter)
      .map(x => path.resolve(x, name));

    paths.unshift(...extra);

    for (const p of paths) {
      if (await exists(p)) {
        return p;
      }
    }
    throw new Error(`Cannot find ${name} on path`);
  }

  static async openFile(file: string) {
    let cmd: string;
    const args: string[] = [`file://${file.replace(/[\\/]+/g, '/')}`];
    if (process.platform === 'darwin') {
      cmd = 'open';
    } else if (process.platform === 'win32') {
      cmd = 'cmd';
      args.unshift('/c', 'start');
    } else {
      cmd = 'xdg-open';
    }
    await Util.processToPromise(cmd, args);
  }

  static async getWindow(pid?: number) {
    const info = await (pid ? win.getByPid(pid) : win.getActive());
    const b = info.bounds!;

    if (process.platform !== 'darwin') {
      if (process.platform === 'win32') {
        const multiplier = info.screens[0].scale.x;
        b.width = Math.trunc(b.width * multiplier);
        b.height = Math.trunc(b.height * multiplier);
        b.x = Math.trunc(b.x * multiplier);
        b.y = Math.trunc(b.y * multiplier);
      }
      b.width += (b.width % 2);
      b.height += (b.height % 2);
      b.x -= (b.x % 2);
      b.y -= (b.y % 2);
    }

    return info!;
  }

  static async getMacInputDevices(ffmpegBinary: string, window: win.Response, audio = false) {
    const { stderr: text } = await Util.processToStd(ffmpegBinary, ['-f', 'avfoundation', '-list_devices', 'true', '-i', '""']);
    const matched: string[] = [];
    text.replace(/\[(\d+)\]\s+Capture\s+screen/ig, (all, index: string) => {
      matched.push(index);
      return '';
    });

    const matchedIndex = matched[window.screens[0].index];

    if (matchedIndex === undefined) {
      throw new Error('Cannot find screen recording device');
    }
    const videoIndex = matchedIndex.toString();
    let audioIndex = 'none';
    if (audio) {
      const matchedAudioIndex = /\[(\d+)\]\s+[^\n]*Microphone/ig.exec(text);
      if (!matchedAudioIndex) {
        throw new Error('Cannot find microphone recording device');
      }
      audioIndex = matchedAudioIndex[1].toString();
    }
    return { video: videoIndex, audio: audioIndex };
  }

  static async getWinDevices(ffmpegBinary: string, audio = false) {
    const { stderr: text } = await Util.processToStd(ffmpegBinary, ['-f', 'dshow', '-list_devices', 'true', '-i', 'dummy']);
    const matchedAudio = /\"(Microphone[^"]+)"/ig.exec(text);
    const out: { audio?: string, video?: string } = {};
    if (audio) {
      if (!matchedAudio) {
        throw new Error('Cannot find microphone recording device');
      } else {
        out.audio = matchedAudio[1].toString();
      }
    }
    return out;
  }
}