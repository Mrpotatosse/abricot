import BaseApp from './app';

async function main() {
    const app = new BaseApp();

    await app.init();

    for (let config of app.config.app.modules) {
        const module = (await import(config.path)).default;
        app.import_module(config.name, module, app, ...(config.args ?? []));
    }

    await app.run();
}

main();
