import * as child_process from 'child_process';

export class Util {

  static processToPromise(cmd: string, args: any[], opts?: child_process.SpawnOptions) {

    console.info([cmd, ...args].join(' '));

    const proc = child_process.spawn(cmd, args, {
      shell: true,
      ...opts
    });

    proc.stderr.on('data', x => console.debug(x.toString().trim()));

    const kill = (now: boolean = false) => {
      if (!now) {
        (proc as any).quitting = !now;
        proc.kill('SIGTERM');
      } else {
        proc.kill('SIGKILL');
      }
    };

    const done = () => kill.bind(null, false);

    process.on('exit', done);

    const finish = new Promise<string>((resolve, reject) => {
      proc.once('error', () => {
        reject(new Error(`Cannot start ${cmd}`));
      });

      proc.once('exit', (code) => {
        process.removeListener('exit', done);
        if (code && !(proc as any).quitting) {
          console.error(`Invalid exit status: ${code}`);
          reject(new Error(`Invalid exit status: ${code}`));
        } else {
          console.info('Successfully terminated');
          resolve();
        }
      });
    });

    return { finish, kill, proc };
  }

  static async processToStd(cmd: string, args: string[], opts?: child_process.SpawnOptions, throwError = false) {
    const { proc, finish } = await this.processToPromise(cmd, args, opts);
    const output = { stdout: [] as Buffer[], stderr: [] as Buffer[], success: false };
    proc.stderr.removeAllListeners('data');

    proc.stdout.on('data', v => output.stdout.push(v));
    proc.stderr.on('data', v => output.stderr.push(v));

    try {
      await finish;
      output.success = true;
    } catch (e) {
      if (throwError) {
        throw new Error(Buffer.concat(output.stderr).toString());
      }
    }

    return {
      success: output.success,
      stderr: Buffer.concat(output.stderr).toString(),
      stdout: Buffer.concat(output.stdout).toString()
    };
  }
}