import Dofus2Analyzer, { Dofus2MinimalPacket, Dofus2PacketAnalyzer } from './analyzer.js';
import { BSON } from 'bson';
import { readFile, appendFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { ROOT } from '../constants.js';
import { v4 } from 'uuid';
import { ReaderBigEndianStream } from '../utils/io/reader_stream.js';
import { existsSync } from 'fs';

export class Dofus2PacketAnalyzerFileHistory implements Dofus2PacketAnalyzer {
    send: Dofus2Analyzer;
    recv: Dofus2Analyzer;

    rnd_num: string;

    file_path(): string {
        return join(ROOT, 'bin', 'history', `${this.rnd_num}.bin`);
    }

    constructor(send: Dofus2Analyzer, recv: Dofus2Analyzer) {
        this.send = send;
        this.recv = recv;

        this.rnd_num = v4();
    }

    async push_history(...list: Array<Dofus2MinimalPacket>): Promise<void> {
        const bytes = BSON.serialize({ list });

        const buffer = Buffer.alloc(2);
        buffer.writeUint16BE(bytes.length);

        if (!existsSync(this.file_path())) {
            await writeFile(this.file_path(), Buffer.concat([buffer, bytes]));
            return;
        }

        await appendFile(this.file_path(), Buffer.concat([buffer, bytes]));
    }

    async get_history(): Promise<Array<Dofus2MinimalPacket>> {
        const bytes = await readFile(this.file_path());

        const reader = new ReaderBigEndianStream();
        reader.add(bytes, bytes.length);

        const result: Array<Dofus2MinimalPacket> = [];

        while (reader.remnant_size() > 0) {
            const bson_length = reader.read_uint16();
            const bson_data = reader.read_bytes(bson_length);

            const { list } = BSON.deserialize(bson_data) as { list: Array<Dofus2MinimalPacket> };
            result.push(...list);
        }

        return result;
    }
}
