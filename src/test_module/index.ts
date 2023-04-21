import { TypedEmitter } from 'tiny-typed-emitter';
import AppModule, { AppModuleEvent } from '../app/module';
import AppState from '../app';

export interface TestModuleEvent extends AppModuleEvent {
    onTest: (value: any) => void;
}

export default class TestModule extends AppModule {
    event: TypedEmitter<TestModuleEvent>;

    constructor(app: AppState) {
        super(app);

        this.event = new TypedEmitter<TestModuleEvent>();

        app.add_api_url(
            'GET',
            '/test.module/ok',
            {
                description: 'post some data',
                tags: ['Test API Endpoints'],
                summary: 'qwerty',
                params: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'user id',
                        },
                    },
                },
                response: {
                    200: {
                        description: 'Successful response',
                        type: 'object',
                        properties: {
                            hello: { type: 'string' },
                        },
                    },
                    default: {
                        description: 'Default response',
                        type: 'object',
                        properties: {
                            foo: { type: 'string' },
                        },
                    },
                },
            },
            async () => {
                return {
                    code: 200,
                };
            },
        );
    }
}
