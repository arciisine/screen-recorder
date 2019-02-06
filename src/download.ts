import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as http from 'http';
import * as yauzl from 'yauzl';
import { HttpRequest } from './net';

const fsUnlink = util.promisify(fs.unlink);
const fsStat = util.promisify(fs.stat);
const fsMkdir = util.promisify(fs.mkdir);

const API_URL = 'https://ffbinaries.com/api/v1';

const PLATFORMS = {
  'osx-64': 1,
  'linux-32': 1,
  'linux-64': 1,
  'linux-armel': 1,
  'linux-armhf': 1,
  'windows-32': 1,
  'windows-64': 1
};

type Component = 'ffmpeg' | 'ffplay' | 'ffprobe' | 'ffserver';
type Platform = keyof typeof PLATFORMS;

export class DownloadUtil {

  static async mkdirp(pth: string) {
    if (pth) {
      try {
        await fsStat(pth);
      } catch (e) {
        await this.mkdirp(path.dirname(pth));
        await fsMkdir(pth);
      }
    }
  }

  /**
    * Detects the platform of the machine the script is executed on.
    * Object can be provided to detect platform from info derived elsewhere.
    */
  static detectPlatform(): Platform {
    const type = os.type().toLowerCase();
    const arch = os.arch().toLowerCase();

    switch (type) {
      case 'darwin': return 'osx-64';
      case 'windows_nt':
        switch (arch) {
          case 'x64': return 'windows-64';
          default: return 'windows-32';
        }
      case 'linux':
        switch (arch) {
          case 'arm': case 'arm64': return 'linux-armel';
          case 'x64': return 'linux-64';
          default: return 'linux-32';
        }
    }

    throw new Error(`Unsupported platform ${type}-${arch}`);
  }

  static getBinaryFilename(component: Component, platform: Platform) {
    if (/^win/.test(platform)) {
      return `${component}.exe`;
    } else {
      return component;
    }
  }

  /**
   * List all versions available
   * */
  static async listVersions() {
    return HttpRequest.execJSON({ url: API_URL });
  }

  /**
   * Fetch version data for specific version
   */
  static async getVersionData(version: string = 'latest') {
    return HttpRequest.execJSON<{ version: string, bin: { [key: string]: { [key: string]: string } } }>({ url: `${API_URL}/version/${version}` });
  }

  /**
   * Fetch component
   */
  static async downloadComponent(opts: {
    component?: Component,
    destination: string,
    version?: string,
    platform?: Platform,
    progress?: (pct: number) => void
  }) {
    const component = opts.component || 'ffmpeg';
    const versions = await this.getVersionData(opts.version);

    const platform = opts.platform || this.detectPlatform();

    await this.mkdirp(opts.destination);

    // Download
    const zipLoc = `${os.tmpdir()}/${component}-${opts.version || 'latest'}.zip`;
    const exec = this.getBinaryFilename(component, platform);
    const binLoc = `${opts.destination}/${exec}`;

    await HttpRequest.exec({
      url: versions.bin[platform][component],
      responseHandler: (msg: http.IncomingMessage) =>
        new Promise((resolve, reject) => {
          if (opts.progress) {
            const size = parseInt(`${msg.headers['content-length']}`, 10);
            const watch = setInterval(() => {
              opts.progress!(msg.socket.bytesRead / size);
            }, 100);
            msg.on('close', () => {
              clearInterval(watch);
            });
          }

          msg
            .pipe(fs.createWriteStream(zipLoc))
            .on('error', reject)
            .on('close', resolve);
        }),
    });

    const zipFile = await new Promise<yauzl.ZipFile>(
      (resolve, reject) => yauzl.open(zipLoc, { lazyEntries: true },
        (err, zip) => err ? reject(err) : resolve(zip)));

    const zipEntry = await new Promise<yauzl.Entry>(
      (resolve, reject) => {
        zipFile.readEntry();
        zipFile.on('entry', (entry: yauzl.Entry) => {
          if (/\/$/.test(entry.fileName)) {
            zipFile.readEntry();
          } else {
            if (entry.fileName.endsWith(exec)) {
              resolve(entry);
            }
          }
        });
      }
    );

    const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
      zipFile.openReadStream(zipEntry, (err, str) => {
        err ? reject(err) : resolve(str);
      });
    });

    await new Promise((resolve, reject) => {
      stream.pipe(fs.createWriteStream(binLoc, { mode: 0o744, autoClose: true }));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    await fsUnlink(zipLoc);

    return binLoc;
  }
}