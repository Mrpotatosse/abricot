import { TypedEmitter } from 'tiny-typed-emitter';
import AppState from '.';

export interface AppModuleEvent {
    onImported: (app: AppModule) => void;
    onDisposed: (app: AppModule) => void;
}

export default class AppModule {
    id: string;
    event: TypedEmitter<AppModuleEvent>;

    constructor(id: string, app: AppState) {
        this.id = id;
        this.event = new TypedEmitter<AppModuleEvent>();
    }
}
