import { FastifySchema, RouteGenericInterface } from 'fastify';

export const ModuleListSchema: FastifySchema = {
    description: 'List all imported module',
    tags: ['App API Endpoints'],
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                data: { type: 'array' },
            },
        },
        default: {
            description: 'Default response',
            type: 'object',
            properties: {
                reason: { type: 'string' },
            },
        },
    },
};

export const WebSocketApiSchema: FastifySchema = {
    description: 'Websocket event handler',
    tags: ['Websocket Endpoints'],
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                data: { type: 'array' },
            },
        },
        default: {
            description: 'Default response',
            type: 'object',
            properties: {
                reason: { type: 'string' },
            },
        },
    },
};
