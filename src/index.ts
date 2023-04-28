import BaseApp from './app/index.js';
import { platform } from 'os';

async function main() {
    const is_win32 = platform() === 'win32';
    const app = new BaseApp();

    await app.init();

    for (let config of app.config.app.modules) {
        const module = (
            await import(config.path.startsWith('file://') || !is_win32 ? config.path : `file://${config.path}`)
        ).default;
        app.import_module(config.name, module, app, ...(config.args ?? []));
    }

    await app.run();
}

main();
