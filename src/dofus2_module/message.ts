import NodeCache from 'node-cache';
import { DofusReader, DofusReaderMethod } from './reader.js';
import { DofusWriterMethod } from './writer.js';

export type BotofuJsonEnumerationMembers = {
    [key: string]: string;
};

export type BotofuJsonEnumeration = {
    entries_type: string;
    members: BotofuJsonEnumerationMembers;
    name: string;
};

export type BotofuJsonMessage = {
    fields: Array<BotofuJsonField>;
    name: string;
    namespace: string;
    protocolID: number;
    super: string;
    super_serialize: string;
    supernamespace: string;
    use_hash_function: boolean;
};

export type BotofuJsonField = {
    boolean_byte_wrapper_position?: number;
    bounds?: BotofuJsonFieldLimit;
    constant_length?: number;
    default_value?: string;
    is_vector?: boolean;
    name?: string;
    namespace?: string;
    null_checked?: boolean;
    position?: number;
    prefixed_by_type_id?: boolean;
    self_serialize_method?: string;
    type?: string;
    type_namespace?: string;
    use_boolean_byte_wrapper?: boolean;
    write_false_if_null_method?: DofusWriterMethod;
    write_length_method?: DofusWriterMethod;
    write_method?: DofusWriterMethod;
    write_type_id_method?: DofusWriterMethod;
};

export type BotofuJsonFieldLimit = {
    low?: number;
    up?: number;
};

export type BotofuJsonDate = {
    day: number;
    full: string;
    hour: number;
    minute: number;
    month: number;
    year: number;
};

export type BotofuJsonVersionMajorMinor = {
    major: number;
    minor: number;
};

export type BotofuJsonVersion = {
    client: {
        build: {
            date: BotofuJsonDate;
        };
        patch: number;
    } & BotofuJsonVersionMajorMinor;
    parser: BotofuJsonVersionMajorMinor;
    protocol: {
        date: BotofuJsonDate;
        version: BotofuJsonVersionMajorMinor;
    };
};

export type BotofuJson = {
    default: {
        field: BotofuJsonField;
    };
    enumerations: Array<BotofuJsonEnumeration>;
    messages: Array<BotofuJsonMessage>;
    types: Array<BotofuJsonMessage>;
};

export default class Dofus2Message {
    static readonly cache: NodeCache = new NodeCache();
    static dofus_data: BotofuJson;

    reader: DofusReader;
    base_data: BotofuJsonMessage;
    identifier: number | string;
    decode_type: 'type' | 'message';

    static get_message(identitifer: string | number): BotofuJsonMessage | undefined {
        if (!Dofus2Message.dofus_data) {
            return undefined;
        }
        const key = `dofus.messages.${identitifer}`;

        let message: BotofuJsonMessage | undefined = Dofus2Message.cache.get<BotofuJsonMessage>(key);
        if (message === undefined) {
            message = Dofus2Message.dofus_data.messages.find((x) => {
                if (typeof identitifer === 'string') {
                    return x.name === identitifer;
                }
                if (typeof identitifer === 'number') {
                    return x.protocolID === identitifer;
                }

                return false;
            });

            if (message) {
                Dofus2Message.cache.set<BotofuJsonMessage>(key, message);
            }
            return message;
        }
        return message;
    }

    static get_type(identitifer: string | number): BotofuJsonMessage | undefined {
        if (!Dofus2Message.dofus_data) {
            return undefined;
        }
        const key = `dofus.types.${identitifer}`;

        let message: BotofuJsonMessage | undefined = Dofus2Message.cache.get<BotofuJsonMessage>(key);
        if (message === undefined) {
            message = Dofus2Message.dofus_data.types.find((x) => {
                if (typeof identitifer === 'string') {
                    return x.name === identitifer;
                }
                if (typeof identitifer === 'number') {
                    return x.protocolID === identitifer;
                }

                return false;
            });

            if (message) {
                Dofus2Message.cache.set<BotofuJsonMessage>(key, message);
            }
            return message;
        }
        return message;
    }

    static wrapper_get_flag(flag: number, offset: number): boolean {
        return (flag & (1 << offset)) !== 0;
    }

    static writer_to_reader(writer?: DofusWriterMethod): DofusReaderMethod {
        return (writer?.replace('write', 'read') as DofusReaderMethod) ?? 'readByte';
    }

    constructor(reader: DofusReader, identifier: number | string, type: 'message' | 'type') {
        this.reader = reader;
        this.identifier = identifier;
        this.decode_type = type;

        const base_data =
            type === 'message' ? Dofus2Message.get_message(identifier) : Dofus2Message.get_type(identifier);
        if (base_data) {
            this.base_data = base_data;
        } else {
            throw new Error(`message with id: ${identifier} is not found on protocol.`);
        }
    }

    read_element(
        field: BotofuJsonField,
        metadata: BotofuJsonMessage | undefined,
    ): string | number | bigint | boolean | Buffer | Record<string, any> | null {
        if (!metadata) {
            return this.reader.dynamic_reader_call(Dofus2Message.writer_to_reader(field.write_method), 0);
        }

        if (field.write_false_if_null_method) {
            if (
                this.reader.dynamic_reader_call(Dofus2Message.writer_to_reader(field.write_false_if_null_method), 0) ===
                0
            ) {
                return null;
            }
        }

        if (field.prefixed_by_type_id) {
            const id = this.reader.dynamic_reader_call(
                Dofus2Message.writer_to_reader(field.write_type_id_method),
                0,
            ) as number;
            return new Dofus2Message(this.reader, id, 'type').decode();
        }

        return new Dofus2Message(this.reader, metadata.name, 'type').decode();
    }

    decode(): Record<string, any> {
        const result: Record<string, any> = {};

        if (this.base_data.super_serialize) {
            Object.assign(result, new Dofus2Message(this.reader, this.base_data.super, this.decode_type).decode());
        }

        const bools = this.base_data.fields
            .filter((field) => field.use_boolean_byte_wrapper)
            .sort((f1, f2) => (f1.boolean_byte_wrapper_position ?? 0) - (f2.boolean_byte_wrapper_position ?? 0));

        let flag = 0;
        for (let bool of bools) {
            const w_pos = (bool.boolean_byte_wrapper_position ?? 0) - 1;

            if (w_pos % 8 === 0) {
                flag = this.reader.read_uint8();
            }

            result[bool.name ?? ''] = Dofus2Message.wrapper_get_flag(flag, w_pos % 8);
        }

        const fields = this.base_data.fields
            .filter((field) => !field.use_boolean_byte_wrapper)
            .sort((f1, f2) => (f1.position ?? 0) - (f2.position ?? 0));

        for (let field of fields) {
            const metadata = Dofus2Message.get_type(field.type ?? '');

            if (field.is_vector || field.type === 'ByteArray') {
                const length = field.constant_length
                    ? field.constant_length
                    : (this.reader.dynamic_reader_call(
                          Dofus2Message.writer_to_reader(field.write_length_method),
                          0,
                      ) as number);

                if (field.type === 'ByteArray') {
                    result[field?.name ?? ''] = this.reader.readBytes(length);
                } else {
                    result[field?.name ?? ''] = [];
                    for (let _ in [...Array(length).keys()]) {
                        result[field?.name ?? ''].push(this.read_element(field, metadata));
                    }
                }
            } else {
                result[field?.name ?? ''] = this.read_element(field, metadata);
            }
        }

        return result;
    }
}
