import { TypedEmitter } from 'tiny-typed-emitter';
import AppModule, { AppModuleEvent } from '../app/module';
import AppState from '../app';
import { attach, resume, spawn } from 'frida';

export interface IInjectorRequestBody {
    path: string;
}

export interface InjectorModuleEvent extends AppModuleEvent {}

export default class InjectorModule extends AppModule {
    event: TypedEmitter<InjectorModuleEvent>;

    constructor(app: AppState) {
        super(app);
        this.event = new TypedEmitter<InjectorModuleEvent>();

        app.add_api_url<{
            Body: IInjectorRequestBody;
        }>(
            'POST',
            '/injector',
            {
                description: 'Execute and inject a script',
                tags: ['Injector API Endpoints'],
                summary: 'Execute and inject',
                body: {
                    type: 'object',
                    properties: {
                        path: { type: 'string' },
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
                                    path: { type: 'string' },
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
                    const { path } = request.body;

                    const pid = await this.spawn_and_hook(path);

                    return {
                        code: 200,
                        data: {
                            path,
                            pid,
                        },
                    };
                } catch (err: any) {
                    console.log(err);
                    return {
                        code: 400,
                    };
                }
            },
        );
    }

    async spawn_and_hook(path: string): Promise<number> {
        const pid = await spawn(path);
        const session = await attach(pid);
        resume(pid);
        return pid;
    }

    /*get_network_interface() {
        const device = platform();
        switch (device) {
            case 'darwin': // macOS
                return 'en0';
            case 'linux': // Linux
                return 'eth0';
            case 'win32': // Windows
                return 'Ethernet';
            default:
                throw new Error(`Unsupported platform: ${device}`);
        }
    }*/
}
