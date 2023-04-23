import { TypedEmitter } from 'tiny-typed-emitter';
import AppState from '../app';
import InjectorModule, { InjectorModuleEvent } from '../injector_module';

export interface DofusModuleEvent extends InjectorModuleEvent {}

export default class DofusModule extends InjectorModule {
    event: TypedEmitter<DofusModuleEvent>;
    ports: Array<number>;

    constructor(app: AppState, script_path: string, ports: Array<number>, process_filter: Array<string>) {
        super(app, script_path);

        this.ports = ports;
        this.event = new TypedEmitter<DofusModuleEvent>();

        this.event.addListener('onImported', () => {
            this.monitor(process_filter);
        });
        this.event.addListener('onProcessDetected', (process) => {
            this.inject(process.pid);
        });
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
