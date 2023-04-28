import AppState from '../app/index.js';
import InjectorModule, {
    Address,
    InjectorModuleEvent,
    MessagePayloadTypeRecv,
    MessagePayloadTypeSend,
    SendMessageWithPayload,
} from '../injector_module/index.js';
import Dofus2Analyzer, { Dofus2MinimalPacket, Dofus2Packet } from './analyzer.js';
import { kill, pid } from 'process';
import { ProcessInformationsWithBin } from '../monitor_module/index.js';
import { Dofus2InformationsSchema, Dofus2PacketHistoryRouteInterface, Dofus2PacketHistorySchema } from './api.js';
import { join } from 'path';
import { EventMap } from 'typed-emitter';

export type SendOrRecv = MessagePayloadTypeSend | MessagePayloadTypeRecv;
export type Dofus2PacketAnalyzer = {
    send: Dofus2Analyzer;
    recv: Dofus2Analyzer;
    history: Array<Dofus2MinimalPacket>;
};
export type Dofus2AnalyzerListKey = `pid=${number}&host=${Address}&target=${Address}`;
export type Dofus2AnalyzerList = { [key: Dofus2AnalyzerListKey]: Dofus2PacketAnalyzer };

export type Dofus2ModuleEvent<Event extends EventMap = {}> = InjectorModuleEvent<
    {
        onDofusPacket: (packet: Dofus2Packet) => void;
    } & Event
>;

export default class Dofus2Module<Map extends EventMap, Event extends Dofus2ModuleEvent> extends InjectorModule<
    Map,
    Event
> {
    ports: Array<number>;
    analyzer: Dofus2AnalyzerList;
    ignore_ips: Array<string>;
    linked_client: Array<{ original_pid: number; fake_pid: number }>;
    game_path: string;

    constructor(
        app: AppState,
        script_path: string,
        ports: Array<number> | number,
        process_filter: Array<string> | string,
        ignore_ips: Array<string> | string,
        game_path: string,
    ) {
        super(app, script_path);

        this.game_path = game_path;
        this.ports = Array.isArray(ports) ? ports : [ports];
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

        app.add_api_url(
            'GET',
            `/${this.module_api_name()}/informations`,
            Dofus2InformationsSchema,
            async (req, res) => {
                return {
                    data: {
                        ignore_ips: this.ignore_ips,
                        ports: this.ports,
                        analyzer: Object.keys(this.analyzer),
                    },
                };
            },
        );
        app.add_api_url<Dofus2PacketHistoryRouteInterface>(
            'GET',
            `/${this.module_api_name()}/history/:key`,
            Dofus2PacketHistorySchema,
            async (req, res) => {
                return {
                    data: {
                        messages: this.analyzer[req.params.key].history
                            .filter((x) => !req.query.side || x.side === req.query.side)
                            .slice(-(req.query.limit ?? 100)),
                    },
                };
            },
        );
    }

    analyze_message(message: SendMessageWithPayload, data: Buffer | null) {
        const key: Dofus2AnalyzerListKey = `pid=${message.payload.pid}&host=${message.payload.host_ip}:${message.payload.host_port}&target=${message.payload.target_ip}:${message.payload.target_port}`;

        if (this.ignore_ips.includes(message.payload.target_ip)) {
            return;
        }

        if (!this.ports.includes(message.payload.target_port)) {
            return;
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
            if (!(key in this.analyzer)) {
                this.analyzer[key] = {
                    send: new Dofus2Analyzer(),
                    recv: new Dofus2Analyzer(),
                    history: [],
                };
            }

            this.analyzer[key][message.payload.type].reader.add(data, message.payload.data_length);
            const packets = this.analyzer[key][message.payload.type].analyze(message.payload.type === 'send');
            this.analyzer[key].history.push(...packets.map((x) => x as Dofus2MinimalPacket));
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
            if (x === process.name) {
                return process.bin ? process.bin : join(this.game_path, process.name);
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
