import TypedEventEmitter, { EventMap } from 'typed-emitter';
import AppState from './index.js';
import {
    FastifySchema,
    HTTPMethods,
    RawReplyDefaultExpression,
    RawRequestDefaultExpression,
    RawServerDefault,
    RouteGenericInterface,
    RouteHandlerMethod,
} from 'fastify';
import EventEmitter from 'events';

export type AddApiUrlHandler<CustomInterface extends RouteGenericInterface> = (
    method: HTTPMethods | Array<HTTPMethods>,
    url: string,
    schema: FastifySchema,
    handler: RouteHandlerMethod<
        RawServerDefault,
        RawRequestDefaultExpression,
        RawReplyDefaultExpression,
        CustomInterface
    >,
) => void;

export type AppModuleEvent<Event extends object = {}> = TypedEventEmitter<
    {
        onImported: (app: AppModule<{}, AppModuleEvent>) => void;
        onDisposed: (app: AppModule<{}, AppModuleEvent>) => void;
    } & Event
>;

export class AppModule<Map extends object, Event extends AppModuleEvent<Map>> {
    event: Event;
    options: Record<string, any>;

    constructor(app: AppState, options: Record<string, any>) {
        this.event = new EventEmitter() as any as Event;
        this.options = options;
    }

    module_api_name(): string {
        return this.constructor.name.toLowerCase();
    }

    event_for_websocket(): Array<string> {
        return ['onImported', 'onDisposed'];
    }
}

export default abstract class Module<Map extends EventMap, Event extends AppModuleEvent<Map>> extends AppModule<
    Map,
    Event
> {}