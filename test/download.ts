import { DownloadUtil } from '../src/download';

async function run() {
  await DownloadUtil.downloadComponent({
    destination: `${__dirname}/temp`,
    progress: (pct) => {
      console.log('Completed', pct);
    }
  });
}

run();