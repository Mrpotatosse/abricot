import { TypedEmitter } from 'tiny-typed-emitter';
import AppModule, { AppModuleEvent } from '../app/module';
import AppState from '../app';
import { attach } from 'frida';
import { readFileSync } from 'fs';

export interface IInjectorRequestBody {
    pid: number;
}

export interface InjectorModuleEvent extends AppModuleEvent {}

export default class InjectorModule extends AppModule {
    event: TypedEmitter<InjectorModuleEvent>;
    scan_script: string;

    constructor(app: AppState) {
        super(app);
        this.event = new TypedEmitter<InjectorModuleEvent>();
        this.scan_script = readFileSync('e:/abricot/src/injector_module/scan_script.js').toString();

        app.add_api_url<{
            Body: IInjectorRequestBody;
        }>(
            'POST',
            '/injector.inject',
            {
                description: 'Execute and inject a script',
                tags: ['Injector API Endpoints'],
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
                    console.log(err);
                    return {
                        code: 400,
                    };
                }
            },
        );
    }

    async inject(pid: number): Promise<number> {
        try {
            const session = await attach(pid);
            const script = await session.createScript(this.scan_script);
            script.message.connect((mes, data) => {
                console.log('mes', mes, 'data', data);
            });
            await script.load();
            return pid;
        } catch (e) {
            console.log('inject', e);
            return -1;
        }
    }
}
