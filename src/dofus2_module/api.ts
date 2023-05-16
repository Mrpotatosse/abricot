import { FastifySchema, RouteGenericInterface } from 'fastify';
import { Dofus2PacketSide } from './analyzer.js';
import { Dofus2AnalyzerListKey } from './index.js';

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
                        authorize_ports: { type: 'array' },
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

export interface Dofus2MessageHistoryRouteInterface extends RouteGenericInterface {
    Params: {
        key: Dofus2AnalyzerListKey;
    };
    Querystring: {
        limit?: number;
    };
}

export const Dofus2MessageHistorySchema: FastifySchema = {
    description: 'List dofus2 last message history',
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
                                additionalProperties: true,
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
                enum: ['client', 'server'],
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
                                    timestamp: { type: 'string', format: 'date-time' },
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

export const Dofus2BotofuSchema: FastifySchema = {
    description: 'Dofus2 botofu',
    tags: ['Modules API Endpoints'],
    body: {
        type: 'object',
        properties: {
            exe_path: { type: 'string' },
            swf_path: { type: 'string' },
            out_path: { type: 'string' },
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
                        success: {
                            type: 'boolean',
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

export interface Dofus2BotofuRouteInterface extends RouteGenericInterface {
    Body: {
        exe_path: string;
        swf_path: string;
        out_path: string;
    };
}