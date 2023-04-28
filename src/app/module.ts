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

/*export interface AppModuleEvent {
    onImported: (app: AppModule<AppModuleEvent>) => void;
    onDisposed: (app: AppModule<AppModuleEvent>) => void;
}*/

/*export interface ExtendedModuleEvent<Event extends EventMap = {}> extends TypedEventEmitter<Event> {
    onImported: (app: AppModule) => void;
    onDisposed: (app: AppModule) => void;
}
*/
export type AppModuleEvent<Event extends EventMap = {}> = TypedEventEmitter<
    {
        onImported: (app: AppModule<{}, AppModuleEvent>) => void;
        onDisposed: (app: AppModule<{}, AppModuleEvent>) => void;
    } & Event
>;

export default class AppModule<Map extends EventMap, Event extends AppModuleEvent<Map>> {
    event: Event;

    constructor(app: AppState) {
        this.event = new EventEmitter() as Event;
    }

    module_api_name(): string {
        return this.constructor.name.toLowerCase();
    }
}
