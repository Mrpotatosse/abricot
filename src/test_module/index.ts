/**
 * this is more like a template than a test
 */

import Module, { AppModuleEvent } from '../app/module.js';
import AppState from '../app/index.js';
import { EventMap } from 'typed-emitter';

export type TestModuleEvent<Event extends EventMap = {}> = AppModuleEvent<
    {
        onTest: (value: any) => void;
    } & Event
>;

export default class TestModule<Map extends EventMap, Event extends TestModuleEvent> extends Module<Map, Event> {
    constructor(app: AppState) {
        super(app, {});

        this.event.addListener('onTest', 10 as any);

        app.add_api_url(
            'GET',
            '/testmodule/ok',
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
