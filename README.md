# @arcsine/screen-recorder

`@arcsine/screen-recorder` is a cross-platform library for recording desktop screens. The application relies upon [FFmpeg](https://www.ffmpeg.org/) as the base for recording. The primary functionality of the library is to start and stop recordings for a specific process (or active window). Additionally, the recorder supports audio recording, but has some limitations on macOS.  

OSX requires a [custom build of FFmpeg](https://github.com/arciisine/vscode-chronicler/binaries/osx/ffmpeg) to bypass choppy audio.  More information on the custom build can be found [here](https://trac.ffmpeg.org/ticket/4513))

The library works on macOS, Windows and X11-based Desktops (Linux, BSD). Wayland support is missing.

## Prereqs

* [FFmpeg](https://www.ffmpeg.org/download.html), 4.1+ with libx264 support.

## Install

```
$ npm install @arcsine/screen-recorder
```

## Usage

```js
const { Recorder } = require('@arcsine/screen-recorder');

(async () => {
    const { finish, stop } = await Recorder.recordActiveWindow({
      file: './test.mp4',
      fps: 3,
      duration: 5
    });
    
    await finish;
})();
```

## API

### Recording

The recording api is for initiating and handling screen recordings.

```typescript

class Recorder {
  static async recordActiveWindow(opts: RecordingOptions): Promise<RecordingResult>;
  static async recordWindowForProcess(pid: number, opts: RecordingOptions): Promise<RecordingResult>;
  static async recordWindow(opts: RecordingOptions): Promise<RecordingResult>;
}

interface RecordingOptions {
  // The location you want to store your output to
  file: string;
  // The framerate for recording, defaults to ffmpeg's default if not specified
  fps?: number;
  // Record audio?
  audio?: boolean;
  // How long to record for, default is until stop is called
  duration?: number;

  ffmpeg: {
    // Path to ffmpeg executable, if not specified, the library will attempt to find it on the path
    binary?: string;
    // Any specific transcoding flags  
    transcode?: any;
    // Any specific ffmpeg flags
    flags?: any;
  }
}

interface RecordingResult {
  // A promise that resolves when the recording finishes, the resolved options are returned and 
  //    are usable as inputs into the GIFCreator
  finish: Promise<RecordingOptions>;
  
  // The raw child process of the ffmpeg operation
  proc: ChildProcess;
  
  // A function to programmatically stop the recording
  //  The now parameter indicates a hard stop or a soft stop
  stop: (now?: boolean) => void;
}
```



### Animated GIF Construction

The GIF generator handles files generated from screen recordings to produce animated gifs of the output

```typescript

class GIFCreator  {
  static async generate(opts: GIFOptions): Promise<GIFResult>;
}

interface GIFOptions {
  // The file you want to convert to an animated gif
  file: string;
  // Output file defaults to the file name with a .gif extension
  output?: string;  
  // The framerate for recording, defaults to ffmpeg's default if not specified
  fps?: number;
  // The scale factor on the final gif
  scale?: number;

  ffmpeg?: {
    // Path to ffmpeg executable, if not specified, the library will attempt to find it on the path
    binary?: string;
  };
}

interface GIFResult {
  // A promise that resolves when the recording finishes, the final filename is returned
  finish: Promise<string>;
  
  // A function to programmatically stop the conversion
  //  The now parameter indicates a hard stop or a soft stop
  stop: (now?: boolean) => void;
}
```

### DownloadUtil
Additionally, the library supports the ability to dynamically download an ffmpeg binary. This is meant to be used by library consumers to allow for 
prompting of downloads if the binary is not found.

```typescript
class DownloadUtil {
  /**
   * Will download a component to the specified destination 
   */
  static async downloadComponent(opts: {
    // ffmpeg | ffplay | ffprobe
    component?: Component,
    // Where the executable should be stored
    destination: string,
    // The version you want installed, defaults to latest
    version?: string,
    // The os/arch you want to install, defaults to auto-detect
    platform?: Platform,
    // Listen on the download progress with percentage downloaded
    progress?: (pct: number) => void
  }):Promise<string>;
}
```

## Example

Recording an active window, and converting to an animated gif

```typescript
import { Recorder, GIFCreator } from './src';

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

```

## Maintainers
- [Timothy Soehnlin](https://github.com/arciisine)

## License

MIT
