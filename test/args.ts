import * as assert from 'assert';

import { Suite, Test } from '@travetto/test';
import { FFmpegUtil } from '../src/ffmpeg';

@Suite()
export class ArgsSuite {

  @Test()
  async verifyOverride() {
    const screen = {
      x: 0,
      y: 0,
      width: 1024,
      height: 768
    };

    const window = {
      bounds: screen,
      screens: [{
        ...screen,
        index: 1
      }],
      id: 0,
      title: 'self',
      owner: {
        name: 'self',
        path: 'self',
        processId: 5
      }
    };

    const findSub = (src: any[], key: string) => {
      const pos = src.indexOf(key);
      return pos >= 0 ? src[pos + 1] : undefined;
    };

    const res = await FFmpegUtil.getX11Args({
      file: 'test.mp4',
      ffmpeg: {
        flags: {}
      },
      audio: true,
      window
    });

    assert(findSub(res, '-crf') === 10);
    assert(findSub(res, '-c:v') === 'libx264');
    assert(findSub(res, '-ac') === 1);
    assert(findSub(res, '-f') === 'x11grab');

    const res2 = await FFmpegUtil.getX11Args({
      file: 'test.mp4',
      audio: true,
      ffmpeg: {
        flags: {
          f: 'x12grab',
          crf: 20,
          'c:v': 'libx265',
          ac: 2
        }
      },
      window
    });

    assert(findSub(res2, '-ac') === 2);
    assert(findSub(res2, '-crf') === 20);
    assert(findSub(res2, '-c:v') === 'libx265');
    assert(findSub(res2, '-f') === 'x12grab');
  }

}