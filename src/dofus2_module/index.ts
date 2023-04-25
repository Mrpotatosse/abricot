import { TypedEmitter } from 'tiny-typed-emitter';
import AppState from '../app';
import InjectorModule, {
    Address,
    InjectorModuleEvent,
    MessagePayloadTypeRecv,
    MessagePayloadTypeSend,
    SendMessageWithPayload,
} from '../injector_module';
import DofusAnalyzer from './analyzer';
import { kill, pid } from 'process';
import { ProcessInformationsWithBin } from '../monitor_module';
import { DofusPacket } from './message';

export type SendOrRecv = MessagePayloadTypeSend | MessagePayloadTypeRecv;
export type DofusPacketAnalyzer = {
    [key in SendOrRecv]: DofusAnalyzer;
};
export type DofusAnalyzerListKey = `${number}=${Address}+${Address}`;
export type DofusAnalyzerList = { [key: DofusAnalyzerListKey]: DofusPacketAnalyzer };

export interface DofusModuleEvent extends InjectorModuleEvent {
    onDofusPacket: (packet: DofusPacket) => void;
}

export default class Dofus2Module extends InjectorModule {
    event: TypedEmitter<DofusModuleEvent>;
    ports: Array<number>;
    analyzer: DofusAnalyzerList;
    ignore_ips: Array<string>;
    linked_client: Array<{ original_pid: number; fake_pid: number }>;

    constructor(
        app: AppState,
        script_path: string,
        ports: Array<number> | number,
        process_filter: Array<string> | string,
        ignore_ips: Array<string> | string,
    ) {
        super(app, script_path);

        this.ports = Array.isArray(ports) ? ports : [ports];
        this.event = new TypedEmitter<DofusModuleEvent>();
        this.ignore_ips = Array.isArray(ignore_ips) ? ignore_ips : [ignore_ips];

        this.analyzer = {};
        this.linked_client = [];

        this.event.addListener('onImported', () => {
            this.monitor(process_filter);
        });
        this.event.addListener('onProcessDetected', async (process) => {
            if (process.ppid !== pid) {
                console.log(process, 'closed');
                await this.close_and_reopen(process);
            }
        });
        this.event.addListener('onMessage', (message, data) => {
            this.analyze_message(message, data);
        });
    }

    analyze_message(message: SendMessageWithPayload, data: Buffer | null) {
        const key: DofusAnalyzerListKey = `${message.payload.pid}=${message.payload.host_ip}:${message.payload.host_port}+${message.payload.target_ip}:${message.payload.target_port}`;

        if (this.ignore_ips.includes(message.payload.target_ip)) {
            return;
        }

        if (!this.ports.includes(message.payload.target_port)) {
            return;
        }

        if (!(key in this.analyzer)) {
            this.analyzer[key] = {
                send: new DofusAnalyzer(),
                recv: new DofusAnalyzer(),
            };
        }

        if (message.payload.type === 'connect') {
            const link = this.linked_client.find((x) => x.fake_pid === message.payload.pid);
            console.log('connect', link);
            if (link) {
                kill(link.original_pid);
                this.linked_client = this.linked_client.filter(
                    (x) => x.fake_pid !== link.fake_pid || x.original_pid !== link.original_pid,
                );
            }
        } else {
            this.analyzer[key][message.payload.type].reader.add(data, message.payload.data_length);
            const packets = this.analyzer[key][message.payload.type].analyze(message.payload.type === 'send');
            console.log(
                key,
                message.payload.type,
                'message ids:',
                packets.map((x) => x.id),
            );

            for (let packet of packets) {
                this.event.emit('onDofusPacket', packet);
            }
        }
    }

    async close_and_reopen(process: ProcessInformationsWithBin) {
        const cmd_splitted = process.cmd.split(' ').map((x) => {
            if (x === process.name && process.bin) {
                return process.bin;
            }
            return x;
        });
        const new_pid = await this.spawn_and_inject(cmd_splitted);
        console.log('opened', new_pid);
        this.linked_client.push({
            original_pid: process.pid,
            fake_pid: new_pid,
        });
    }
}
