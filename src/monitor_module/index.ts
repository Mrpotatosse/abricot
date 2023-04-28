import AppState from '../app';
import AppModule, { AppModuleEvent } from '../app/module.js';
import find from 'find-process';
import { EventMap } from 'typed-emitter';

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

export type MonitorModuleEvent<Event extends EventMap = {}> = AppModuleEvent<
    {
        onProcessDetected: (process: ProcessInformationsWithBin) => void;
    } & Event
>;

export default class MonitorModule<Map extends EventMap, Event extends MonitorModuleEvent> extends AppModule<
    Map,
    Event
> {
    monitored_processes: MoniteredProcessList;

    constructor(app: AppState) {
        super(app);

        this.monitored_processes = {};
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
                const processes = await find('name', process_name, true);
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
        }, 1000);
    }
}
