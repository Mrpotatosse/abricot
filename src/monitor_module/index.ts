import { TypedEmitter } from 'tiny-typed-emitter';
import AppState from '../app';
import AppModule, { AppModuleEvent } from '../app/module';
import find from 'find-process';

export type ProcessInformations = {
    pid: number;
    ppid?: number;
    uid?: number;
    gid?: number;
    name: string;
    cmd: string;
};

export type ProcessInformationsWithBin = ProcessInformations & { bin?: string };

export type MoniteredProcessList = { [key: number]: ProcessInformations };

export interface MonitorModuleEvent extends AppModuleEvent {
    onProcessDetected: (process: ProcessInformationsWithBin) => void;
}

export default class MonitorModule extends AppModule {
    event: TypedEmitter<MonitorModuleEvent>;
    monitored_processes: MoniteredProcessList;

    constructor(app: AppState) {
        super(app);

        this.monitored_processes = {};
        this.event = new TypedEmitter<MonitorModuleEvent>();
    }

    monitor(process_name: Array<string> | string) {
        function check_same_process(a: any, b: any) {
            for (let key in a) {
                if (a[key] !== b[key]) {
                    return false;
                }
            }
            return true;
        }
        const names = Array.isArray(process_name) ? process_name : [process_name];

        setInterval(async () => {
            for (let process_name of names) {
                const processes = await find('name', process_name);
                for (let process of processes) {
                    if (!(process.pid in this.monitored_processes)) {
                        this.monitored_processes[process.pid] = process;
                        this.event.emit('onProcessDetected', process);
                    } else {
                        if (!check_same_process(this.monitored_processes[process.pid], process)) {
                            this.monitored_processes[process.pid] = process;
                            this.event.emit('onProcessDetected', process);
                        }
                    }
                }
            }
        }, 2000);
    }
}
