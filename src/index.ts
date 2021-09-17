import { exec, execFile } from 'child_process';
import find from 'find-process';
import { isRunningProc } from 'is-running-process';
import { sleep } from 'time-helpers';

export type TTorSettings = {
  path?: string;
  filename?: string;
};

class TorManager {
  private _settings: TTorSettings;

  constructor(s: TTorSettings) {
    this._settings = {
      filename: 'tor.exe',
      ...s
    };
  }

  async restart() {
    await this.stop();
    await sleep(5e3);
    await this.start();
  }

  async start() {
    try {
      return Promise.race([
        new Promise(async (resolve) => {
          if (process.platform === 'darwin') {
            exec(`brew services start tor`);
          }

          if (process.platform === 'win32') {
            if (await isRunningProc(this._settings.filename!)) {
              return resolve(true);
            }

            execFile(this._settings.filename!, [], { cwd: this._settings.path }, (err, stdout, stderr) => ({
              err,
              stdout,
              stderr
            }));
          }

          await sleep(2e3);
          resolve(true);
        }),
        new Promise((resolve) => setTimeout(() => resolve(true), 10e3))
      ]);
    } catch (e) {
      console.log(e);
    }
  }

  async stop() {
    const tors = await find('name', 'tor', true);

    return Promise.race([
      new Promise(async (resolve) => {
        tors.forEach((t) => {
          if (process.platform === 'win32') {
            exec(`taskkill /F /PID ${t.pid}`);
          }

          if (process.platform === 'darwin') {
            exec(`brew services restart tor`);
          }
          //  if (linux) {
          //   exec(`kill -${t.pid} PID`)
          // }
        });
        await sleep((1 + tors.length) * 1000);
        resolve(true);
      }),
      new Promise((resolve) => setTimeout(() => resolve(true), 10e3))
    ]);
  }
}

export { TorManager };
