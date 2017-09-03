
import { flatten } from "../../../utility";

export enum ValueType {
    NEVER,
    ANY,
    CONST,
    CONST_TIMES_REG
}

export interface ValueInference {
    readonly type: ValueType;
    readonly cons?: number;
    readonly regnum?: number;
}

export const NEVER: ValueInference = {
    type: ValueType.NEVER
};

export const ANY: ValueInference = {
    type: ValueType.ANY
};

export function equal(v1: ValueInference, v2: ValueInference): boolean {
    return v1.type === v2.type && v1.cons === v2.cons && v1.regnum === v2.regnum;
}

function _merge(v1: ValueInference, v2: ValueInference): ValueInference {
    if (v1.type === ValueType.ANY || v2.type === ValueType.ANY) return ANY;
    if (v2.type === ValueType.NEVER) return v1;
    if (v1.type === ValueType.NEVER) return v2;
    if (v1.type === ValueType.CONST && v2.type === ValueType.CONST && v1.cons === v2.cons) return v1;
    if (v1.type === ValueType.CONST_TIMES_REG && v2.type === ValueType.CONST_TIMES_REG && v1.cons === v2.cons && v1.regnum === v2.regnum) return v1;
    return ANY;
}

export function merge(...params: Array<ValueInference | Array<ValueInference>>): ValueInference {
    return flatten(params).reduce(_merge);
}
