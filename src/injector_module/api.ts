import { FastifySchema } from 'fastify';

export const InjectorInjectSchema: FastifySchema = {
    description: 'Inject scan script on a process',
    tags: ['Modules API Endpoints'],
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
};
