export type StreamEndian = 'big' | 'little';

export default class CustomStream {
    buffer: Buffer;
    endian: StreamEndian;
    offset: number;

    constructor(endian: StreamEndian) {
        this.buffer = Buffer.alloc(0);
        this.endian = endian;
        this.offset = 0;
    }

    add(data: Buffer | null, length: number) {
        if (data !== null) {
            this.buffer = Buffer.concat([this.buffer, data.slice(0, length)]);
        }
    }

    clear() {
        this.buffer = Buffer.alloc(0);
        this.offset = 0;
    }

    size(): number {
        return this.buffer.byteLength;
    }

    remnant_size(): number {
        return this.size() - this.offset;
    }

    remove_before_offset() {
        this.buffer = this.slice(this.offset);
        this.offset = 0;
    }

    slice(start: number | undefined = undefined, end: number | undefined = undefined): Buffer {
        return this.buffer.slice(start, end);
    }

    set_offset(offset: number) {
        this.offset = offset;
    }
}
