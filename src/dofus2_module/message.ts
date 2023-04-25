export type DofusPacketSide = 'client' | 'server';

export type DofusPacket = {
    header: number;
    id: number;

    instance_id?: number;
    data: Buffer;
    length: number;

    side: DofusPacketSide;
};

export type DofusParsedPacket = DofusPacket & {};
