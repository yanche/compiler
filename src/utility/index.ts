

export * from "./number";
export * from "./closure";
export * from "./collection";
export * from "./string";

import * as validate from "./validate";

export { validate };

export type NodeId = number;

export type Index = number;

export type SymbolId = number;

export type LR0ItemId = number;

export type LR1ItemId = number;

export type ProductionId = number;

export type StateId = number;

export type CharCode = number;

export interface Edge {
    src: NodeId;
    tgt: NodeId;
}
