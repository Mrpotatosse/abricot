import { FastifySchema, RouteGenericInterface } from 'fastify';

export interface OpenAiModuleQueryRouteInterface extends RouteGenericInterface {
    Body: {
        question: string;
    };
}

export const OpenAiModuleQuerySchema: FastifySchema = {
    description: 'Ai module query',
    tags: ['Modules API Endpoints'],
    body: {
        type: 'object',
        properties: {
            question: {
                type: 'string',
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
