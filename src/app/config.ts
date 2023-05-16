import { parse } from 'yaml';
import { readFileSync } from 'fs';
import template from 'string-template';
import { ROOT, SRC } from '../constants.js';

type AppConfig = {
    app: {
        api: AppConfigApi;
        modules: Array<AppConfigModule>;
    };
};

type AppConfigApi = {
    prefix: string;
    ip: string;
    port: number;
    ws: string;
};

type AppConfigModule = {
    name: string;
    path: string;
    args?: Array<any>;
};

export const load_config = (path: string): AppConfig => {
    const config = template(readFileSync(path).toString(), {
        src: SRC,
        root: ROOT,
    });
    return parse(config) as AppConfig;
};

export default AppConfig;
