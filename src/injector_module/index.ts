import AppState from '../app/index.js';
import { SendMessage, ErrorMessage, attach, Message, spawn, resume, Session, Script, MessageType } from 'frida';
import { kill } from 'process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
    InjectorExecuteInterface,
    InjectorExecuteMinimalWithDataInterface,
    InjectorExecuteMinimalWithDataSchema,
    InjectorExecuteMinimalWithoutDataInterface,
    InjectorExecuteMinimalWithoutDataSchema,
    InjectorExecuteSchema,
} from './api.js';
import { EventMap } from 'typed-emitter';
import find from 'find-process';
import { AppModule, AppModuleEvent } from '../app/module.js';
import got from 'got';

export type MessagePayloadTypeConnect = 'connect';
export type MessagePayloadTypeSend = 'send';
export type MessagePayloadTypeRecv = 'recv';
export type MessagePayloadTypeRequest = 'request';
export type MessagePayloadType = MessagePayloadTypeSend | MessagePayloadTypeRecv | MessagePayloadTypeConnect;
export type ByteNumber = `${number}`;
export type Ip = `${number}.${number}.${number}.${number}`;
export type Address = `${Ip}:${number}`;

export interface SendMessageWithPayload<T extends Record<string, any> = {}> extends SendMessage {
    payload: T;
}

export interface RequestPayload {
    type: MessagePayloadTypeRequest;
}

export interface ScanPayload {
    type: MessagePayloadType;
    host_ip: Ip;
    host_port: number;
    target_ip: Ip;
    target_port: number;
    pid: number;
    data_length: number;
}

export interface IInjectorRequestBody {
    pid: number;
}

export interface IInjectorOnRequestBody extends IInjectorRequestBody {
    source?: string;
    url?: string;
    data?: Record<string, any>;
}

export type ProcessInformations = {
    pid: number;
    ppid?: number;
    uid?: number;
    gid?: number;
    name: string;
    cmd: string;
} & { bin?: string };

export type InjectorModuleEvent<Event extends EventMap = {}> = AppModuleEvent<
    {
        onMessage: (message: SendMessageWithPayload, data: Buffer | null) => void;
        onErrorMessage: (message: ErrorMessage, data: Buffer | null) => void;
        onInjected: (pid: number) => void;
        onScriptExecuted: (pid: number, name: string) => void;
    } & Event
>;

export type InjectorModelOptions = {
    scripts: {
        [key: string]: {
            path: string;
            api: boolean;
        };
    };
    ignore_ips: Array<string>;
    authorize_ports: Array<number>;
};

export default class InjectorModule<Map extends EventMap, Event extends InjectorModuleEvent> extends AppModule<
    Map,
    Event
> {
    linked_client: Array<{ original_pid: number; fake_pid: number }> = [];
    injection_session: { [key: number]: Session } = {};

    event_for_websocket(): string[] {
        return [...super.event_for_websocket(), 'onMessage', 'onErrorMessage', 'onInjected', 'onScriptExecuted'];
    }

    /**
     *
     * @param app
     * @param options
     *
     */
    constructor(app: AppState, options: InjectorModelOptions) {
        super(app, options);

        this.options = {
            ...options,
            scripts: options.scripts
                ? Object.keys(options.scripts).reduce((acc, curr) => {
                      return { ...acc, [curr]: readFileSync(resolve(options.scripts[curr].path)) };
                  }, {})
                : {},
            ignore_ips: options.ignore_ips
                ? Array.isArray(options.ignore_ips)
                    ? options.ignore_ips
                    : [options.ignore_ips]
                : [],
            authorize_ports: options.authorize_ports
                ? Array.isArray(options.authorize_ports)
                    ? options.authorize_ports
                    : [options.authorize_ports]
                : [],
        };

        for (let script of Object.keys(options.scripts)) {
            if (options.scripts[script].api) {
                app.add_api_url<InjectorExecuteMinimalWithDataInterface>(
                    'POST',
                    `/injector/execute_${script}`,
                    InjectorExecuteMinimalWithDataSchema,
                    async (request, result) => {
                        try {
                            await this.execute_loaded_script(
                                script,
                                request.body.pid,
                                request.body.data ?? {},
                                request.body.dispose,
                            );
                        } catch (e) {
                            console.error(e);
                        }

                        return {
                            code: 200,
                            data: {
                                pid: request.body.pid,
                            },
                        };
                    },
                );
            }
        }

        app.add_api_url<InjectorExecuteInterface>(
            'POST',
            `/injector/execute`,
            InjectorExecuteSchema,
            async (request, result) => {
                const source = request.body.source ?? (await got.get(request.body.url ?? '')).body;

                await this.execute_script(
                    request.body.source ?? request.body.url ?? '',
                    source,
                    request.body.pid,
                    request.body.data ?? {},
                );

                return {
                    code: 200,
                    data: {
                        pid: request.body.pid,
                    },
                };
            },
        );

        app.add_api_url<InjectorExecuteMinimalWithoutDataInterface>(
            'POST',
            `/injector/scan`,
            InjectorExecuteMinimalWithoutDataSchema,
            async (request, result) => {
                await this.scan(request.body.pid);

                return {
                    code: 200,
                    data: {
                        pid: request.body.pid,
                    },
                };
            },
        );

        app.add_api_url<InjectorExecuteMinimalWithoutDataInterface>(
            'POST',
            `/injector/reopen`,
            InjectorExecuteMinimalWithoutDataSchema,
            async (request, result) => {
                const pid = await this.reopen(request.body.pid);

                return {
                    code: 200,
                    data: {
                        pid,
                    },
                };
            },
        );
    }

    is_accepted_packet(message: SendMessageWithPayload<ScanPayload>): boolean {
        if (this.options.ignore_ips.includes(message.payload.target_ip)) {
            return false;
        }

        if (!this.options.authorize_ports.includes(message.payload.target_port)) {
            return false;
        }

        return true;
    }

    is_send_message<T extends Record<string, any>>(message: Message): message is SendMessageWithPayload<T> {
        return message.type === 'send';
    }

    is_error_message(message: Message): message is ErrorMessage {
        return message.type === 'error';
    }

    async execute_loaded_script(name: string, pid: number, data: Record<string, any>, dispose?: boolean) {
        const source = this.options.scripts[name];

        return this.execute_script(name, source, pid, data, dispose);
    }

    async execute_script(name: string, source: string, pid: number, data: Record<string, any>, dispose?: boolean) {
        await this.inject_on(
            pid,
            source,
            (script, message) => {
                if (this.is_send_message<RequestPayload>(message)) {
                    script.post(data);
                }

                this.event.emit('onScriptExecuted', pid, name);
            },
            dispose,
        );
    }

    async inject_on(
        pid: number,
        source: string,
        connect_callback: (script: Script, message: Message, data: Buffer | null) => void,
        dispose?: boolean,
    ): Promise<void> {
        if (!this.injection_session[pid]) {
            this.injection_session[pid] = await attach(pid);
        }

        const script = await this.injection_session[pid].createScript(source);

        const connect_callback_with_event_emitter = async (script: Script, message: Message, data: Buffer | null) => {
            if (this.is_send_message(message)) {
                this.event.emit('onMessage', message, data);
            } else if (this.is_error_message(message)) {
                console.error(message);
                this.event.emit('onErrorMessage', message, data);
            }
            connect_callback(script, message, data);

            if (dispose) {
                await script.unload();
            }
        };

        script.message.connect(
            async (message, data) => await connect_callback_with_event_emitter(script, message, data),
        );

        await script.load();

        this.event.emit('onInjected', pid);
    }

    async scan(pid: number) {
        await this.inject_on(pid, this.options.scripts['scan'] ?? '', (_, message, data) => {
            if (this.is_send_message<ScanPayload>(message) && this.is_accepted_packet(message)) {
                if (message.payload.type === 'connect') {
                    const link = this.linked_client.find((x) => x.fake_pid === message.payload.pid);

                    if (link) {
                        ///// remove comments - kill original
                        kill(link.original_pid);
                    }

                    this.linked_client = this.linked_client.filter((x) => x !== link);
                }
            }
        });
    }

    async reopen(pid: number): Promise<number> {
        const process_informations: ProcessInformations | undefined = (await find('pid', pid)).shift();
        const program =
            process_informations?.cmd.split(' ').map((x, i) => {
                return i === 0 ? process_informations?.bin ?? x : x;
            }) ?? [];

        const npid = await spawn(program);
        await this.scan(npid);
        resume(npid);

        this.linked_client.push({
            original_pid: pid,
            fake_pid: npid,
        });

        return npid;
    }
}
