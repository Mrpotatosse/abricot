import AppState from '../app/index.js';
import MemoryModule, { MemoryModuleEvent } from '../memory_module/index.js';
import { OpenAI } from 'langchain/llms/openai';
import { HNSWLib } from 'langchain/vectorstores';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { RetrievalQAChain } from 'langchain/chains';
import { initial_prompt } from './prompt_template.js';
import { ChainValues } from 'langchain/schema.js';
import { join } from 'path';
import { ROOT } from '../constants.js';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { EventMap } from 'typed-emitter';
import { OpenAiModuleQueryRouteInterface, OpenAiModuleQuerySchema } from './api.js';

const DATABASE_MEMORY_KEY = 'tmp_vector_mem';
const TMP_STORE_PATH = join(ROOT, 'bin', DATABASE_MEMORY_KEY);

export type AiModuleEvent<Event extends EventMap = {}> = MemoryModuleEvent<
    {
        onTest: (value: any) => void;
    } & Event
>;

export default class OpenAIModule<Map extends EventMap, Event extends AiModuleEvent> extends MemoryModule<Map, Event> {
    openai: OpenAI;
    model: string;
    vector_memory?: HNSWLib;
    chain?: RetrievalQAChain;

    constructor(
        app: AppState,
        database_name: string,
        api_key: string,
        model: string,
        assistant_name: string,
        assistant_goal: string,
    ) {
        super(app, database_name);

        this.openai = new OpenAI({
            openAIApiKey: api_key,
        });
        this.model = model;
        this.event.addListener('onImported', async () => {
            const saved_data = await this.get_data(this.database_name, DATABASE_MEMORY_KEY);
            if (saved_data) {
                this.decompress_folder(saved_data, TMP_STORE_PATH);
                this.vector_memory = await HNSWLib.load(
                    TMP_STORE_PATH,
                    new OpenAIEmbeddings({
                        openAIApiKey: api_key,
                    }),
                );
            } else {
                const rec = app.require('langchain/text_splitter').RecursiveCharacterTextSplitter;
                const text_splitter = new rec();
                const docs = await text_splitter.createDocuments([
                    await initial_prompt.format({
                        assistant_name,
                        assistant_goal,
                    }),
                ]);
                this.vector_memory = await HNSWLib.fromDocuments(
                    docs,
                    new OpenAIEmbeddings({
                        openAIApiKey: api_key,
                    }),
                );
                await this.save_data();
            }
            this.chain = RetrievalQAChain.fromLLM(this.openai, this.vector_memory.asRetriever());
        });

        app.add_api_url<OpenAiModuleQueryRouteInterface>(
            'POST',
            `/${this.module_api_name()}/query`,
            OpenAiModuleQuerySchema,
            async (req, res) => {
                const r = await this.ask(req.body.question);
                return {
                    data: r,
                };
            },
        );
    }

    async ask(question: string): Promise<ChainValues | undefined> {
        if (this.chain) {
            return await this.chain.call({
                query: question,
            });
        }
        return undefined;
    }

    async save_data() {
        await this.vector_memory?.save(TMP_STORE_PATH);

        const memory_bin = this.compress_folder(TMP_STORE_PATH);
        this.set_data(memory_bin, this.database_name, DATABASE_MEMORY_KEY);
    }

    compress_folder(path: string): Buffer {
        const dir_files = readdirSync(path);
        const result: any = {};
        for (let file of dir_files) {
            result[file] = readFileSync(join(path, file)).toString('base64');
        }
        return Buffer.from(JSON.stringify(result));
    }

    decompress_folder(buffer: Buffer, path: string) {
        const data = JSON.parse(buffer.toString('utf-8'));
        for (let key in data) {
            writeFileSync(join(path, key), Buffer.from(data[key], 'base64'));
        }
    }
}
