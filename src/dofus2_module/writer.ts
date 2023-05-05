import { WriterBigEndianStream } from '../utils/io/writer_stream.js';
import { FilterStartWith } from '../utils/types';

export type DofusWriterMethod = FilterStartWith<keyof DofusWriter, 'write'>;

export class DofusWriter extends WriterBigEndianStream {
    writeVarInt() {}
    writeVarUhInt() {}
    writeVarShort() {}
    writeVarUhShort() {}
    writeVarLong() {}
    writeVarUhLong() {}
    writeBytes() {}
    writeBoolean() {}
    writeByte() {}
    writeUnsignedByte() {}
    writeShort() {}
    writeUnsignedShort() {}
    writeInt() {}
    writeUnsignedInt() {}
    writeFloat() {}
    writeDouble() {}
    writeUTF() {}
}
