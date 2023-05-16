import { FastifySchema, RouteGenericInterface } from 'fastify';

export type ExecuteType = {
    pid: number;
    source?: string;
    url?: string;
    data?: Record<string, any>;
    dispose?: boolean;
};

export type ExecuteTypeMinimalWithData = Omit<ExecuteType, 'source' | 'url'>;

export type ExecuteTypeMinimalWithoutData = Omit<ExecuteTypeMinimalWithData, 'data'>;

export interface InjectorExecuteInterface extends RouteGenericInterface {
    Body: ExecuteType;
}

export const InjectorExecuteSchema: FastifySchema = {
    description: 'Inject custom script on a process',
    tags: ['Modules API Endpoints'],
    body: {
        type: 'object',
        properties: {
            pid: { type: 'integer' },
            source: { type: 'string' },
            url: { type: 'string' },
            data: { type: 'object', additionalProperties: true },
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

export interface InjectorExecuteMinimalWithDataInterface extends RouteGenericInterface {
    Body: ExecuteTypeMinimalWithData;
}

export const InjectorExecuteMinimalWithDataSchema: FastifySchema = {
    description: 'Inject custom script on a process',
    tags: ['Modules API Endpoints'],
    body: {
        type: 'object',
        properties: {
            pid: { type: 'integer' },
            data: { type: 'object', additionalProperties: true },
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

export interface InjectorExecuteMinimalWithoutDataInterface extends RouteGenericInterface {
    Body: ExecuteTypeMinimalWithoutData;
}

export const InjectorExecuteMinimalWithoutDataSchema: FastifySchema = {
    description: 'Inject custom script on a process',
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
