import * as path from 'path';
import { DownloadUtil } from './download';
import { FFmpegUtil } from './ffmpeg';
import { Recorder } from './recorder';


async function run() {
  if (process.argv.length <= 2) {
    console.error('Please specify a file name to write to');
    process.exit(1);
  }

  const opts = await FFmpegUtil.findFFmpegBinIfMissing({});
  if (!opts.ffmpeg.binary) {
    const ffmpeg = path.resolve(process.cwd(), process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    console.log('Could not find ffmpeg, downloading to ', ffmpeg);
    await DownloadUtil.downloadComponent({ destination: ffmpeg });
    opts.ffmpeg.binary = ffmpeg;
  }
  const runner = await Recorder.recordActiveWindow({
    ...opts,
    file: process.argv[2]
  });
  console.log('Recording for 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));
  console.log('Done');
  runner.stop();
}

run();