import Fastify, {
    FastifyInstance,
    FastifySchema,
    HTTPMethods,
    RawReplyDefaultExpression,
    RawRequestDefaultExpression,
    RawServerDefault,
    RouteGenericInterface,
    RouteHandlerMethod,
} from 'fastify';
import FastifySwagger from '@fastify/swagger';
import FastifySwaggerUi from '@fastify/swagger-ui';
import AppModule, { AppModuleEvent } from './module.js';
import { join } from 'path';
import { ROOT, SRC } from '../constants.js';
import AppConfig, { load_config } from './config.js';
import { ModuleListSchema } from './api.js';
import { ArgumentParser } from 'argparse';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

type AppModuleList = { [key: string]: AppModule<{}, AppModuleEvent> };
type AnyParameters = Array<any>;

export default class AppState {
    fastify: FastifyInstance;
    modules: AppModuleList;
    config: AppConfig;
    argument_parser: ArgumentParser;
    __runned: boolean;
    argument: any;
    package_informations: any;
    require: NodeRequire;

    constructor() {
        this.fastify = Fastify({
            logger: false,
        });

        this.require = createRequire(SRC);
        this.modules = {};
        this.package_informations = JSON.stringify(readFileSync(`${ROOT}/package.json`));

        this.argument_parser = new ArgumentParser({
            description: this.package_informations.description,
        });

        this.argument_parser.add_argument('-c', '--config', {
            default: 'app.yaml',
        });

        this.argument = this.argument_parser.parse_args();

        this.config = load_config(join(ROOT, this.argument.config));
        this.__runned = false;
    }

    async init() {
        await this.fastify.register(FastifySwagger, {
            openapi: {
                info: {
                    title: this.package_informations.name,
                    description: this.package_informations.description,
                    version: this.package_informations.version,
                    contact: {
                        name: this.package_informations.author,
                        url: this.package_informations.repository,
                    },
                },

                externalDocs: {
                    url: 'https://discord.gg/eCsBNQaP9S',
                    description: 'Discord',
                },
            },
        });

        await this.fastify.register(FastifySwaggerUi, {
            routePrefix: this.config.app.api.prefix ?? '/api',
            transformSpecification: (obj, req, res) => {
                return {
                    ...obj,
                    collectionFormat: 'multi',
                };
            },
        });

        this.fastify.setErrorHandler(async (err, req, res) => {
            return {
                reason: err.message,
            };
        });

        this.add_api_url('GET', '/app/modules/list', ModuleListSchema, async () => {
            return {
                data: Object.keys(this.modules),
            };
        });
    }

    async run() {
        await this.fastify.ready();
        this.fastify.swagger();
        this.__runned = true;
        console.log('app ready');
        this.fastify.listen({ port: this.config.app.api.port ?? 3000 });
    }

    import_module<Module extends AppModule<{}, AppModuleEvent>>(
        id: string,
        module: { new (...args: AnyParameters): Module },
        ...args: AnyParameters
    ): Module {
        if (this.modules[id] !== undefined) {
            throw `module '${id}' already exists`;
        }

        this.modules[id] = new module(...args);
        this.modules[id].event?.emit('onImported', this.modules[id]);
        return this.modules[id] as Module;
    }

    dispose_module(id: string): string {
        if (this.modules[id] === undefined) {
            throw `module '${id}' not found`;
        }
        this.modules[id].event?.emit('onDisposed', this.modules[id]);
        delete this.modules[id];
        return id;
    }

    add_api_url<CustomInterface extends RouteGenericInterface>(
        method: HTTPMethods | Array<HTTPMethods>,
        url: string,
        schema: FastifySchema,
        handler: RouteHandlerMethod<
            RawServerDefault,
            RawRequestDefaultExpression,
            RawReplyDefaultExpression,
            CustomInterface
        >,
    ) {
        this.fastify.route({
            method,
            url: `/v1/api${url}`,
            schema,
            handler,
        });
    }
}
