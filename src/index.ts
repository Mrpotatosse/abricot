import BaseApp from './app';
import InjectorModule from './injector_module';
import TestModule from './test_module';

async function main() {
    const app = new BaseApp();
    await app.init();

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

    app.import_module('test', TestModule, app);
    app.import_module('hook', InjectorModule, app);

    await app.run();
}

main();
