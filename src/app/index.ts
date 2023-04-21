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
import AppModule from './module';

type AppModuleList = { [key: string]: AppModule };
type AnyParameters = Array<any>;

export default class AppState {
    args: Array<string>;
    fastify: FastifyInstance;
    modules: AppModuleList;

    constructor() {
        this.args = [];
        this.fastify = Fastify({
            logger: false,
        });

        this.modules = {};
    }

    async init() {
        await this.fastify.register(FastifySwagger, {
            swagger: {
                info: {
                    title: 'Aivy',
                    description: 'easy mitm',
                    version: '0.0.1',
                    contact: {
                        name: 'MrPot',
                        url: 'https://twitter.com/blankblankee',
                    },
                },
            },
        });

        await this.fastify.register(FastifySwaggerUi, {
            routePrefix: '/api',
        });
    }

    async run() {
        await this.fastify.ready();
        this.fastify.swagger();
        this.fastify.listen({ port: 3000 });
    }

    import_module<Module extends AppModule>(
        id: string,
        module: { new (...args: AnyParameters): Module },
        ...args: AnyParameters
    ): Module {
        if (this.modules[id] !== undefined) {
            throw `module '${id}' already exists`;
        }

        this.modules[id] = new module(...args);
        this.modules[id].event.emit('onImported', this.modules[id]);
        return this.modules[id] as Module;
    }

    dispose_module(id: string): string {
        if (this.modules[id] === undefined) {
            throw `module '${id}' not found`;
        }
        this.modules[id].event.emit('onDisposed', this.modules[id]);
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
            url,
            schema,
            handler,
        });
    }
}
