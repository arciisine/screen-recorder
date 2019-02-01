import { Recorder } from './src';

(async function () {
  const { finish } = await Recorder.recordActiveWindow({
    file: './test.mp4',
    fps: 3,
    duration: 5
  });

  const finalOpts = await finish;

  const gifOpts = await Recorder.generateGIF(finalOpts);
  await gifOpts!.finish;
})();