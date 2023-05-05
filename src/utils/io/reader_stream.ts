import { FilterStartWith } from '../types/index.js';
import CustomStream from './stream.js';

export type BufferReadMethods = FilterStartWith<keyof Buffer, 'read'>;

class ReaderStream extends CustomStream {
    dynamic_buffer_call(func_name: BufferReadMethods, offset: number, byteLength: number): number | bigint {
        const result = this.buffer[func_name](offset, byteLength);
        this.offset += byteLength;
        return result;
    }

    read_int8(): number {
        return this.dynamic_buffer_call('readInt8', this.offset, 1) as number;
    }
    read_uint8(): number {
        return this.dynamic_buffer_call('readUInt8', this.offset, 1) as number;
    }

    read_int16(): number {
        return this.dynamic_buffer_call(
            this.endian === 'big' ? 'readInt16BE' : 'readInt16LE',
            this.offset,
            2,
        ) as number;
    }
    read_uint16(): number {
        return this.dynamic_buffer_call(
            this.endian === 'big' ? 'readUInt16BE' : 'readUInt16LE',
            this.offset,
            2,
        ) as number;
    }

    read_int32(): number {
        return this.dynamic_buffer_call(
            this.endian === 'big' ? 'readInt32BE' : 'readInt32LE',
            this.offset,
            4,
        ) as number;
    }
    read_uint32(): number {
        return this.dynamic_buffer_call(
            this.endian === 'big' ? 'readUInt32BE' : 'readUInt32LE',
            this.offset,
            4,
        ) as number;
    }

    read_int64(): bigint {
        return this.dynamic_buffer_call(
            this.endian === 'big' ? 'readBigInt64BE' : 'readBigInt64LE',
            this.offset,
            8,
        ) as bigint;
    }
    read_uint64(): bigint {
        return this.dynamic_buffer_call(
            this.endian === 'big' ? 'readBigUInt64BE' : 'readBigUInt64LE',
            this.offset,
            8,
        ) as bigint;
    }

    read_double(): number {
        return this.dynamic_buffer_call(
            this.endian === 'big' ? 'readDoubleBE' : 'readDoubleLE',
            this.offset,
            8,
        ) as number;
    }

    read_float(): number {
        return this.dynamic_buffer_call(
            this.endian === 'big' ? 'readFloatBE' : 'readFloatLE',
            this.offset,
            4,
        ) as number;
    }

    read_bytes(length: number): Buffer {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
    }

    read_string(): string {
        const length = this.read_uint16();
        return this.read_bytes(length).toString('utf8');
    }

    read_var(): number | bigint {
        let result = 0n;
        let byte_length = 0;
        for (let i = 0n; i < 64n; i += 7n) {
            const byte = BigInt(this.read_uint8());
            result += (byte & 127n) << i;
            byte_length += 1;
            if ((byte & 128n) === 0n) {
                return byte_length <= 4 ? Number(result) : result;
            }
        }

        throw new Error('too much data');
    }

    read_var_short(): number {
        return this.read_var() as number;
    }

    read_var_int(): number {
        return this.read_var() as number;
    }

    read_var_long(): bigint {
        return this.read_var() as bigint;
    }
}

export class ReaderBigEndianStream extends ReaderStream {
    constructor() {
        super('big');
    }
}

export class ReaderLittleEndianStream extends ReaderStream {
    constructor() {
        super('little');
    }
}

export default ReaderStream;
