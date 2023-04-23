import { TypedEmitter } from 'tiny-typed-emitter';
import AppState from '../app';
import InjectorModule, { InjectorModuleEvent } from '../injector_module';

export interface DofusModuleEvent extends InjectorModuleEvent {}

export default class DofusModule extends InjectorModule {
    event: TypedEmitter<DofusModuleEvent>;
    ports: Array<number>;
    injected: Array<number>;

    constructor(id: string, app: AppState, script_path: string, ports: Array<number>) {
        super(id, app, script_path);

        this.ports = ports;
        this.event = new TypedEmitter<DofusModuleEvent>();
        this.injected = [];
    }

    async inject(pid: number): Promise<number> {
        const result = await super.inject(pid);

        if (result == -1) {
            return result;
        }

        this.event.addListener('onMessage', (message, data) => {});

        return result;
    }
}
