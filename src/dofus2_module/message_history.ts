import { BSON } from 'bson';
import { readFile, appendFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { ROOT } from '../constants.js';
import { v4 } from 'uuid';
import { ReaderBigEndianStream } from '../utils/io/reader_stream.js';
import { existsSync } from 'fs';
import { Dofus2MessageAnalyzer } from './message.js';

export class Dofus2MessageHistoryFileHistory implements Dofus2MessageAnalyzer {
    rnd_num: string;

    file_path(): string {
        return join(ROOT, 'bin', 'history', `message-${this.rnd_num}.bin`);
    }

    constructor(rnd_num?: string) {
        this.rnd_num = rnd_num ?? v4();
    }

    async push_history(...list: Array<Record<string, any>>): Promise<void> {
        const bytes = BSON.serialize({ list });

        const buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(bytes.length);

        if (!existsSync(this.file_path())) {
            await writeFile(this.file_path(), Buffer.concat([buffer, bytes]));
            return;
        }

        await appendFile(this.file_path(), Buffer.concat([buffer, bytes]));
    }

    async get_history(): Promise<Array<Record<string, any>>> {
        const bytes = await readFile(this.file_path());

        const reader = new ReaderBigEndianStream();
        reader.add(bytes, bytes.length);

        const result: Array<Record<string, any>> = [];

        while (reader.remnant_size() > 0) {
            const bson_length = reader.read_uint32();
            const bson_data = reader.read_bytes(bson_length);

            const { list } = BSON.deserialize(bson_data) as { list: Array<Record<string, any>> };
            result.push(...list);
        }

        return result;
    }
}
