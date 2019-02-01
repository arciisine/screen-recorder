import { Recorder, GIFCreator } from '../src';

(async function () {
  const { finish } = await Recorder.recordActiveWindow({
    file: './test.mp4',
    fps: 3,
    duration: 5
  });

  const finalOpts = await finish;

  const gifOpts = await GIFCreator.generate({
    ...finalOpts,
    scale: .25,
    output: 'funny.gif'
  });
  await gifOpts!.finish;
})();