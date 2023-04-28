import { FilterStartWith } from '../types/index.js';
import CustomStream from './stream.js';

export type BufferWriteMethods = FilterStartWith<keyof Buffer, 'write'>;

class WriterStream extends CustomStream {}

export class WriterBigEndianStream extends WriterStream {
    constructor() {
        super('big');
    }
}

export class WriterLittleEndianStream extends WriterStream {
    constructor() {
        super('little');
    }
}

export default WriterStream;
