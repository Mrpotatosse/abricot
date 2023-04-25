import { FilterStartWith } from '../types';
import CustomStream from './stream';

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
    read_uint64() {
        return this.dynamic_buffer_call(
            this.endian === 'big' ? 'readBigUInt64BE' : 'readBigUInt64LE',
            this.offset,
            8,
        ) as bigint;
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
