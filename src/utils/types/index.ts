export type FilterStartWith<Set, StartPattern extends string> = Set extends `${StartPattern}${infer _X}` ? Set : never;
