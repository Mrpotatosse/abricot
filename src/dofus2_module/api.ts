import { FastifySchema, RouteGenericInterface } from 'fastify';
import { Dofus2PacketSide } from './analyzer.js';
import { Dofus2AnalyzerListKey, SendOrRecv } from './index.js';

export const Dofus2InformationsSchema: FastifySchema = {
    description: 'List dofus2 informations',
    tags: ['Modules API Endpoints'],
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                data: {
                    type: 'object',
                    properties: {
                        ignore_ips: { type: 'array' },
                        ports: { type: 'array' },
                        analyzer: { type: 'array' },
                    },
                },
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

export const Dofus2PacketHistorySchema: FastifySchema = {
    description: 'List dofus2 last packet history',
    tags: ['Modules API Endpoints'],
    params: {
        type: 'object',
        properties: {
            key: {
                type: 'string',
                description: 'Dofus analyzer key',
            },
        },
    },
    querystring: {
        type: 'object',
        properties: {
            side: {
                type: 'string',
                description: 'Dofus analyzer side (client or server)',
            },
            limit: {
                type: 'integer',
                description: 'Message count limit',
            },
        },
    },
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                data: {
                    type: 'object',
                    properties: {
                        messages: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    header: { type: 'integer' },
                                    id: { type: 'integer' },
                                    instance_id: { type: 'integer' },
                                    length: { type: 'integer' },
                                    side: { type: 'string' },
                                },
                            },
                        },
                    },
                },
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

export interface Dofus2PacketHistoryRouteInterface extends RouteGenericInterface {
    Params: {
        key: Dofus2AnalyzerListKey;
    };
    Querystring: {
        side?: Dofus2PacketSide;
        limit?: number;
    };
}
