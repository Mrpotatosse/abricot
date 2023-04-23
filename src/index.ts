import BaseApp from './app';

async function main() {
    const app = new BaseApp();

    await app.init();

    for (let config of app.config.app.modules) {
        const module = (await import(config.path)).default;
        app.import_module(config.name, module, app, ...(config.args ?? []));
    }
    // todo: dynamic import module from yaml/json config file
    /**
     * something like this
     *
     *
     * for (let config in modules_config) {
     *   const module = (await import(config.path)).default;
     *   app.import_module(config.name, module, app, ...config.args);
     * }
     *
     *
     * config:
     *      name: string
     *      path: string
     *      args: Array<object>
     *
     */

    //app.import_module('test', TestModule, app);
    //app.import_module('hook', InjectorModule, app);
    //app.import_module('dofus', DofusModule, app);

    await app.run();
}

main();
