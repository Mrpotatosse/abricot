import { TypedEmitter } from 'tiny-typed-emitter';
import AppState from '../app';
import { SendMessage, ErrorMessage, attach, Message, spawn, resume } from 'frida';
import { readFileSync } from 'fs';
import MonitorModule, { MonitorModuleEvent } from '../monitor_module';

export type MessagePayloadTypeConnect = 'connect';
export type MessagePayloadTypeSend = 'send';
export type MessagePayloadTypeRecv = 'recv';
export type MessagePayloadType = MessagePayloadTypeSend | MessagePayloadTypeRecv | MessagePayloadTypeConnect;
export type Ip = `${number}.${number}.${number}.${number}`;
export type Address = `${Ip}:${number}`;

export interface SendMessageWithPayload extends SendMessage {
    payload: MessagePayload;
}

export interface MessagePayload {
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

export interface InjectorModuleEvent extends MonitorModuleEvent {
    onMessage: (message: SendMessageWithPayload, data: Buffer | null) => void;
    onErrorMessage: (message: ErrorMessage, data: Buffer | null) => void;
}

export default class InjectorModule extends MonitorModule {
    event: TypedEmitter<InjectorModuleEvent>;
    scan_script: string;

    constructor(app: AppState, script_path: string) {
        super(app);
        this.event = new TypedEmitter<InjectorModuleEvent>();
        this.scan_script = readFileSync(script_path).toString();

        app.add_api_url<{
            Body: IInjectorRequestBody;
        }>(
            'POST',
            `/${new.target.name}.injector/inject`,
            {
                description: 'Inject scan script on a process',
                tags: ['Modules API Endpoints'],
                summary: 'Execute and inject',
                body: {
                    type: 'object',
                    properties: {
                        pid: { type: 'integer' },
                    },
                },
                response: {
                    200: {
                        description: 'Successful response',
                        type: 'object',
                        properties: {
                            code: { type: 'integer' },
                            data: {
                                type: 'object',
                                properties: {
                                    pid: { type: 'integer' },
                                },
                            },
                        },
                    },
                    400: {
                        description: 'Default response',
                        type: 'object',
                        properties: {
                            code: { type: 'integer' },
                            reason: { type: 'string' },
                        },
                    },
                },
            },
            async (request, result) => {
                try {
                    const { pid } = request.body;

                    const r = await this.inject(pid);

                    return {
                        code: 200,
                        data: {
                            pid: r,
                        },
                    };
                } catch (err: any) {
                    return {
                        code: 400,
                    };
                }
            },
        );
    }

    is_send_message(message: Message): message is SendMessageWithPayload {
        return message.type === 'send';
    }

    is_error_message(message: Message): message is ErrorMessage {
        return message.type === 'error';
    }

    async spawn_and_inject(program: Array<string> | string): Promise<number> {
        const pid = await spawn(program);
        await this.inject(pid);
        resume(pid);
        return pid;
    }

    async inject(pid: number): Promise<void> {
        try {
            const session = await attach(pid);
            const script = await session.createScript(this.scan_script);
            script.message.connect((message, data) => {
                if (this.is_send_message(message)) {
                    this.event.emit('onMessage', message, data);
                } else if (this.is_error_message(message)) {
                    console.log(message);
                    this.event.emit('onErrorMessage', message, data);
                }
            });
            await script.load();
        } catch (e) {
            console.error(e);
        }
    }
}
