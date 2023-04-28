import AppModule, { AppModuleEvent } from '../app/module.js';
import AppState from 'src/app/index';
import Gun, { IGunChain, IGunInstance } from 'gun';
import {
    MemoryModuleGetRouteInterface,
    MemoryModuleGetSchema,
    MemoryModulePutRouteInterface,
    MemoryModulePutSchema,
    MemoryModuleSetRouteInterface,
    MemoryModuleSetSchema,
} from './api.js';
import { join } from 'path';
import { ROOT } from '../constants.js';
import { EventMap } from 'typed-emitter';

export type MemoryModuleEvent<Event extends EventMap = {}> = AppModuleEvent<
    {
        // to do onSet
        // to do onPut
    } & Event
>;

export default class MemoryModule<Map extends EventMap, Event extends MemoryModuleEvent> extends AppModule<Map, Event> {
    gun: IGunInstance;
    database_name: string;

    constructor(app: AppState, database_name: string) {
        super(app);
        this.gun = Gun({
            file: join(ROOT, './gun', database_name),
        });
        this.database_name = database_name;

        this.gun.get(database_name).put({});

        app.add_api_url<MemoryModuleGetRouteInterface>(
            'GET',
            `/${this.module_api_name()}/get`,
            MemoryModuleGetSchema,
            async (req, res) => {
                return {
                    data: await this.get_data(...req.query.keys),
                };
            },
        );
        app.add_api_url<MemoryModuleSetRouteInterface>(
            'POST',
            `/${this.module_api_name()}/set`,
            MemoryModuleSetSchema,
            async (req, res) => {
                return {
                    data: await this.set_data(req.body, ...req.query.keys),
                };
            },
        );
        app.add_api_url<MemoryModulePutRouteInterface>(
            'POST',
            `/${this.module_api_name()}/put`,
            MemoryModulePutSchema,
            async (req, res) => {
                return {
                    data: await this.put_data(req.body, ...req.query.keys),
                };
            },
        );
    }

    async get_data(...keys: Array<string>): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                let instance: IGunChain<any, IGunInstance<any>, IGunInstance<any>, string> = this.gun.get(
                    this.database_name,
                );

                for (let key of keys) {
                    instance = instance.get(key);
                }

                instance.once((data, key) => {
                    resolve(data);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    async set_data(value: any, ...keys: Array<string>): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                let instance: IGunChain<any, IGunInstance<any>, IGunInstance<any>, string> = this.gun.get(
                    this.database_name,
                );

                for (let key of keys) {
                    instance = instance.get(key);
                }

                const result = instance.set(value);
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
    }

    async put_data(value: any, ...keys: Array<string>): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                let instance: IGunChain<any, IGunInstance<any>, IGunInstance<any>, string> = this.gun.get(
                    this.database_name,
                );

                for (let key of keys) {
                    instance = instance.get(key);
                }

                const result = instance.put(value);
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
    }
}
