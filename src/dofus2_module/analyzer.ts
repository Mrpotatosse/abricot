import { ReaderBigEndianStream } from '../utils/io/reader_stream';
import { DofusPacket } from './message';

export default class DofusAnalyzer {
    reader: ReaderBigEndianStream;

    constructor() {
        this.reader = new ReaderBigEndianStream();
    }

    analyze(client_side: boolean): Array<DofusPacket> {
        const result: Array<DofusPacket> = [];

        while (this.reader.remnant_size() > 0) {
            if (this.reader.remnant_size() < 2) {
                return result;
            }

            const initial_offset = this.reader.offset;
            const header = this.reader.read_uint16();

            const static_header = header & 3;
            const message_id = header >> 2;

            if (client_side && this.reader.remnant_size() < 4) {
                this.reader.set_offset(initial_offset);
                return result;
            }

            const instance_id = client_side ? this.reader.read_uint32() : 0;

            if (this.reader.remnant_size() < static_header) {
                this.reader.set_offset(initial_offset);
                return result;
            }

            let length = 0;
            for (let i = static_header - 1; i >= 0; i--) {
                length = length | ((this.reader.read_uint8() & 255) << (i * 8));
            }

            if (this.reader.remnant_size() < length) {
                this.reader.set_offset(initial_offset);
                return result;
            }

            const data = this.reader.read_bytes(length);

            result.push({
                header: static_header,
                id: message_id,
                instance_id,
                data,
                length,
                side: client_side ? 'client' : 'server',
            });
        }

        this.reader.remove_before_offset();
        return result;
    }
}
