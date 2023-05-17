import AppState from '../app/index.js';
import InjectorModule, {
    Address,
    InjectorModelOptions,
    InjectorModuleEvent,
    MessagePayloadTypeRecv,
    MessagePayloadTypeSend,
    ScanPayload,
    SendMessageWithPayload,
} from '../injector_module/index.js';
import Dofus2Analyzer, { Dofus2MinimalPacket, Dofus2Packet, Dofus2PacketAnalyzer } from './analyzer.js';
import {
    Dofus2BotofuRouteInterface,
    Dofus2BotofuSchema,
    Dofus2InformationsSchema,
    Dofus2MessageHistoryRouteInterface,
    Dofus2MessageHistorySchema,
    Dofus2PacketHistoryRouteInterface,
    Dofus2PacketHistorySchema,
} from './api.js';
import { join } from 'path';
import { EventMap } from 'typed-emitter';
import { existsSync } from 'fs';
import { execFile } from 'child_process';
import { ROOT } from '../constants.js';
import { Dofus2PacketAnalyzerFileHistory } from './analyzer_history.js';
import Dofus2Message, {
    BotofuJson,
    BotofuJsonMessage,
    Dofus2MessageAnalyzer,
    LowWithLodash,
    MessageOrType,
} from './message.js';
import { DofusReader } from './reader.js';
import { Dofus2MessageHistoryFileHistory } from './message_history.js';
import { JSONFile } from 'lowdb/node';

export type SendOrRecv = MessagePayloadTypeSend | MessagePayloadTypeRecv;

export type Dofus2AnalyzerListKey = `pid=${number}&host=${Address}&target=${Address}`;
export type Dofus2AnalyzerList = Record<
    Dofus2AnalyzerListKey,
    {
        packet: Dofus2PacketAnalyzer;
        message: Dofus2MessageAnalyzer;
    }
>;

export type Dofus2ModuleEvent<Event extends EventMap = {}> = InjectorModuleEvent<
    {
        onDofusPacket: (payload: SendMessageWithPayload<ScanPayload>, packet: Dofus2Packet) => void;
        onDofusPacketNotParsed: (
            payload: SendMessageWithPayload<ScanPayload>,
            packet: Dofus2Packet,
            reason: string,
        ) => void;
        onDofusMessage: (
            payload: SendMessageWithPayload<ScanPayload>,
            packet: Omit<Dofus2Packet, 'data'>,
            decoder: {
                base_data: BotofuJsonMessage;
                identifier: number | string;
                decode_type: MessageOrType;
            },
            data: Record<string, any>,
        ) => void;
    } & Event
>;

export type Dofus2ModuleOptions = {
    folder: string;
    botofu: string;
} & InjectorModelOptions;

export default class Dofus2Module<Map extends EventMap, Event extends Dofus2ModuleEvent> extends InjectorModule<
    Map,
    Event
> {
    readonly analyzer_list: Dofus2AnalyzerList = {};

    event_for_websocket(): string[] {
        return [...super.event_for_websocket(), 'onDofusPacket', 'onDofusMessage', 'onDofusPacketNotParsed'];
    }

    constructor(app: AppState, options: Dofus2ModuleOptions) {
        super(app, options);

        this.event.addListener('onImported', async () => {
            const botofu_output = join(ROOT, 'bin', 'botofu', 'protocol.json');
            const parsed = await this.botofu(options.botofu, join(options.folder, 'DofusInvoker.swf'), botofu_output);
            if (parsed) {
                const adapter = new JSONFile<BotofuJson>(botofu_output);
                Dofus2Message.dofus_data = new LowWithLodash<BotofuJson>(adapter, {
                    default: {
                        field: {},
                    },
                    enumerations: [],
                    messages: [],
                    types: [],
                });

                await Dofus2Message.dofus_data.read();
            }
        });
        this.event.addListener(
            'onMessage',
            async (m, d) => await this.analyze_message(m as SendMessageWithPayload<ScanPayload>, d),
        );
        this.event.addListener('onDofusPacket', async (m, p) => await this.decode_packet(m, p));

        app.add_api_url('GET', `/dofus2/informations`, Dofus2InformationsSchema, async (req, res) => {
            return {
                data: {
                    ignore_ips: this.options.ignore_ips,
                    authorize_ports: this.options.authorize_ports,
                    analyzer: Object.keys(this.analyzer_list),
                },
            };
        });
        app.add_api_url<Dofus2PacketHistoryRouteInterface>(
            'GET',
            `/dofus2/history/:key`,
            Dofus2PacketHistorySchema,
            async (req, res) => {
                return {
                    data: {
                        messages: (await this.analyzer_list[req.params.key].packet.get_history())
                            .filter((x) => !req.query.side || x.side === req.query.side)
                            .slice(-(req.query.limit ?? 100)),
                    },
                };
            },
        );
        app.add_api_url<Dofus2MessageHistoryRouteInterface>(
            'GET',
            `/dofus2/message_history/:key`,
            Dofus2MessageHistorySchema,
            async (req, res) => {
                return {
                    data: {
                        messages: (await this.analyzer_list[req.params.key].message.get_history()).slice(
                            -(req.query.limit ?? 100),
                        ),
                    },
                };
            },
        );
        app.add_api_url<Dofus2BotofuRouteInterface>('POST', `/dofus2/botofu`, Dofus2BotofuSchema, async (req, res) => {
            const r = await this.botofu(req.body.exe_path, req.body.swf_path, req.body.out_path);
            return {
                data: {
                    success: r,
                },
            };
        });
    }

    async decode_packet(message: SendMessageWithPayload<ScanPayload>, packet: Dofus2Packet) {
        const key: Dofus2AnalyzerListKey = `pid=${message.payload.pid}&host=${message.payload.host_ip}:${message.payload.host_port}&target=${message.payload.target_ip}:${message.payload.target_port}`;

        try {
            const reader = new DofusReader();
            reader.add(packet.data, packet.length);
            let message_decoder: Dofus2Message | null = new Dofus2Message(reader, packet.id, 'message');
            let data: Record<string, any> | null = message_decoder.decode();
            /// to do: improve with better optimization for with memory
            /*this.analyzer_list[key].message.push_history({
                __name__: message_decoder.base_data.name,
                __id__: message_decoder.base_data.protocolID,
                __side__: packet.side,
                ...data,
            });*/
            this.event.emit('onDofusMessage', message, packet, message_decoder, data);
            message_decoder = null;
            data = null;
        } catch (e: any) {
            console.error(e);
            this.event.emit('onDofusPacketNotParsed', message, packet, e.message);
        }
    }

    async analyze_message(message: SendMessageWithPayload<ScanPayload>, data: Buffer | null) {
        const key: Dofus2AnalyzerListKey = `pid=${message.payload.pid}&host=${message.payload.host_ip}:${message.payload.host_port}&target=${message.payload.target_ip}:${message.payload.target_port}`;

        if (!this.is_accepted_packet(message)) {
            return;
        }

        if (!this.analyzer_list[key]) {
            const packet_history = new Dofus2PacketAnalyzerFileHistory(new Dofus2Analyzer(), new Dofus2Analyzer());
            this.analyzer_list[key] = {
                packet: packet_history,
                message: new Dofus2MessageHistoryFileHistory(packet_history.rnd_num),
            };
        }

        if (message.payload.type !== 'connect') {
            this.analyzer_list[key].packet[message.payload.type].reader.add(data, message.payload.data_length);
            const packets = this.analyzer_list[key].packet[message.payload.type].analyze(
                message.payload.type === 'send',
            );
            await this.analyzer_list[key].packet.push_history(...packets.map((x) => x as Dofus2MinimalPacket));

            for (let packet of packets) {
                this.event.emit('onDofusPacket', message, packet);
            }
        }
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
