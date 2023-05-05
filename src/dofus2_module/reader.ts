import { ReaderBigEndianStream } from '../utils/io/reader_stream.js';
import { FilterStartWith } from '../utils/types';

export type DofusReaderMethod = FilterStartWith<keyof DofusReader, 'read'>;

export class DofusReader extends ReaderBigEndianStream {
    readVarInt(): number {
        return this.read_var() as number;
    }
    readVarUhInt(): number {
        return this.readVarInt();
    }
    readVarShort(): number {
        return this.read_var() as number;
    }
    readVarUhShort(): number {
        return this.readVarShort();
    }
    readVarLong(): bigint {
        return this.read_var() as bigint;
    }
    readVarUhLong(): bigint {
        return this.read_var() as bigint;
    }
    readBytes(length: number): Buffer {
        return this.read_bytes(length);
    }
    readBoolean(): boolean {
        return this.read_uint8() == 1;
    }
    readByte(): number {
        return this.read_int8();
    }
    readUnsignedByte(): number {
        return this.read_uint8();
    }
    readShort(): number {
        return this.read_int16();
    }
    readUnsignedShort(): number {
        return this.read_uint16();
    }
    readInt(): number {
        return this.read_int32();
    }
    readUnsignedInt(): number {
        return this.read_uint32();
    }
    readFloat(): number {
        return this.read_float();
    }
    readDouble(): number {
        return this.read_double();
    }
    readUTF(): string {
        return this.read_string();
    }
    dynamic_reader_call(func_name: DofusReaderMethod, length: number): string | number | bigint | boolean | Buffer {
        const result = this[func_name](length);
        return result;
    }
}
