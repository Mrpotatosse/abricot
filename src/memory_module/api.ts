import { FastifySchema, RouteGenericInterface } from 'fastify';

export const MemoryModuleGetSchema: FastifySchema = {
    description: 'Memory module get',
    tags: ['Modules API Endpoints'],
    querystring: {
        type: 'object',
        properties: {
            keys: {
                type: 'array',
                description: 'path',
                items: { type: 'string' },
            },
        },
    },
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                data: {
                    type: ['object', 'integer', 'string', 'array'],
                    additionalProperties: true,
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

export interface MemoryModuleGetRouteInterface extends RouteGenericInterface {
    Querystring: {
        keys: Array<string>;
    };
}

export const MemoryModuleSetSchema: FastifySchema = {
    description: 'Memory module set',
    tags: ['Modules API Endpoints'],
    querystring: {
        type: 'object',
        properties: {
            keys: {
                type: 'array',
                description: 'path',
                items: { type: 'string' },
            },
        },
    },
    body: {
        type: 'object',
        properties: {
            value: {
                type: 'object',
            },
        },
    },
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                data: {
                    type: ['object', 'integer', 'string', 'array'],
                    additionalProperties: true,
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

export interface MemoryModuleSetRouteInterface extends RouteGenericInterface {
    Body: {
        value: any;
    };
    Querystring: {
        keys: Array<string>;
    };
}

export const MemoryModulePutSchema: FastifySchema = {
    description: 'Memory module put',
    tags: ['Modules API Endpoints'],
    querystring: {
        type: 'object',
        properties: {
            keys: {
                type: 'array',
                description: 'path',
                items: { type: 'string' },
            },
        },
    },
    body: {
        type: 'object',
        properties: {
            value: {
                type: 'object',
            },
        },
    },
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                data: {
                    type: ['object', 'integer', 'string', 'array'],
                    additionalProperties: true,
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

export interface MemoryModulePutRouteInterface extends RouteGenericInterface {
    Body: {
        value: any;
    };
    Querystring: {
        keys: Array<string>;
    };
}
