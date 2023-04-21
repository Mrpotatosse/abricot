import { TypedEmitter } from 'tiny-typed-emitter';
import AppState from '.';

export interface AppModuleEvent {
    onImported: (app: AppModule) => void;
    onDisposed: (app: AppModule) => void;
}

export default class AppModule {
    event: TypedEmitter<AppModuleEvent>;

    constructor(app: AppState) {
        this.event = new TypedEmitter<AppModuleEvent>();
    }
}
