import AppState from '../app/index.js';
import InjectorModule, {
    Address,
    InjectorModuleEvent,
    MessagePayloadTypeRecv,
    MessagePayloadTypeSend,
    SendMessageWithPayload,
} from '../injector_module/index.js';
import Dofus2Analyzer, { Dofus2MinimalPacket, Dofus2Packet, Dofus2PacketAnalyzer } from './analyzer.js';
import { kill, pid } from 'process';
import { ProcessInformationsWithBin } from '../monitor_module/index.js';
import {
    Dofus2BotofuRouteInterface,
    Dofus2BotofuSchema,
    Dofus2InformationsSchema,
    Dofus2PacketHistoryRouteInterface,
    Dofus2PacketHistorySchema,
} from './api.js';
import { join } from 'path';
import { EventMap } from 'typed-emitter';
import { existsSync } from 'fs';
import { execFile } from 'child_process';
import { ROOT } from '../constants.js';
import { Dofus2PacketAnalyzerFileHistory } from './analyzer_history.js';
import Dofus2Message from './message.js';
import { DofusReader } from './reader.js';

export type SendOrRecv = MessagePayloadTypeSend | MessagePayloadTypeRecv;

export type Dofus2AnalyzerListKey = `pid=${number}&host=${Address}&target=${Address}`;
export type Dofus2AnalyzerList = { [key: Dofus2AnalyzerListKey]: Dofus2PacketAnalyzer };

export type Dofus2ModuleEvent<Event extends EventMap = {}> = InjectorModuleEvent<
    {
        onDofusPacket: (packet: Dofus2Packet) => void;
        onDofusMessage: (packet: Dofus2Packet, decoder: Dofus2Message, data: Record<string, any>) => void;
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
    botofu_path: string;

    constructor(
        app: AppState,
        script_path: string,
        ports: Array<number> | number,
        process_filter: Array<string> | string,
        ignore_ips: Array<string> | string,
        game_path: string,
        botofu_path: string,
    ) {
        super(app, script_path);

        this.game_path = game_path;
        this.botofu_path = botofu_path;
        this.ports = Array.isArray(ports) ? ports : [ports];
        this.ignore_ips = Array.isArray(ignore_ips) ? ignore_ips : [ignore_ips];

        this.analyzer = {};
        this.linked_client = [];

        this.event.addListener('onImported', async () => {
            this.monitor(process_filter);
            const botofu_output = join(ROOT, 'bin', 'botofu', 'protocol.json');
            const parsed = await this.botofu(this.botofu_path, join(this.game_path, 'DofusInvoker.swf'), botofu_output);
            if (parsed) {
                Dofus2Message.dofus_data = AppState.require(botofu_output);
            }
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
        this.event.addListener('onDofusPacket', async (packet) => {
            const reader = new DofusReader();
            reader.add(packet.data, packet.length);
            const message_decoder = new Dofus2Message(reader, packet.id, 'message');
            const message = message_decoder.decode();

            this.event.emit('onDofusMessage', packet, message_decoder, message);
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
                        messages: (await this.analyzer[req.params.key].get_history())
                            .filter((x) => !req.query.side || x.side === req.query.side)
                            .slice(-(req.query.limit ?? 100)),
                    },
                };
            },
        );
        app.add_api_url<Dofus2BotofuRouteInterface>(
            'POST',
            `/${this.module_api_name()}/botofu`,
            Dofus2BotofuSchema,
            async (req, res) => {
                const r = await this.botofu(req.body.exe_path, req.body.swf_path, req.body.out_path);
                return {
                    data: {
                        success: r,
                    },
                };
            },
        );
    }

    event_for_websocket(): string[] {
        return [...super.event_for_websocket(), 'onDofusPacket', 'onDofusMessage'];
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
                this.analyzer[key] = new Dofus2PacketAnalyzerFileHistory(new Dofus2Analyzer(), new Dofus2Analyzer());
            }

            this.analyzer[key][message.payload.type].reader.add(data, message.payload.data_length);
            const packets = this.analyzer[key][message.payload.type].analyze(message.payload.type === 'send');
            this.analyzer[key].push_history(...packets.map((x) => x as Dofus2MinimalPacket));

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

    async botofu(exe_path: string, swf_path: string, out_path: string): Promise<boolean> {
        if (existsSync(exe_path) && existsSync(swf_path)) {
            return new Promise((resolve) => {
                const p = execFile(exe_path, ['--indent', '1', swf_path, out_path], (err, stdout, stderr) => {
                    if (err) {
                        resolve(false);
                    }
                });

                p.on('exit', () => {
                    resolve(true);
                });
            });
        }
        return false;
    }
}
