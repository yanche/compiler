
import { flatten, range, initArray } from "../../../utility";
import { CodeLine } from "./intermediatecode";

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

export function merge(...params: Array<ValueInference | Array<ValueInference>>): ValueInference {
    return flatten(params).reduce((v1: ValueInference, v2: ValueInference): ValueInference => {
        if (v1.type === ValueType.ANY || v2.type === ValueType.ANY) return ANY;
        if (v2.type === ValueType.NEVER) return v1;
        if (v1.type === ValueType.NEVER) return v2;
        if (v1.type === ValueType.CONST && v2.type === ValueType.CONST && v1.cons === v2.cons) return v1;
        if (v1.type === ValueType.CONST_TIMES_REG && v2.type === ValueType.CONST_TIMES_REG && v1.cons === v2.cons && v1.regnum === v2.regnum) return v1;
        return ANY;
    });
}

// return: all code lines' register value inference information (contains the info before executing that code line (top-infer))
export function inferValues(codelines: Array<CodeLine>, regcount: number, initAnyValRegs: Array<number>): Array<Array<ValueInference>> {
    let clen = codelines.length;
    let clValInfers = new Array<Array<ValueInference>>(clen);
    for (let i = 0; i < clen; ++i) {
        clValInfers[i] = initArray(regcount, NEVER);
    }
    let line1Init = new Array<ValueInference>(regcount);
    for (let i = 0; i < regcount; ++i)line1Init[i] = NEVER;
    // set the value type of arguments to "ANY"
    for (let i of initAnyValRegs) line1Init[i] = ANY;
    let stack = range(0, clen).reverse(), stacktop = clen;
    while (stacktop > 0) {
        let codeseq = stack[--stacktop];
        let cl = codelines[codeseq];
        let srcInfers = makeTopValInfers(codeseq, clValInfers, codelines, line1Init);
        let postTAC = cl.tac.inferValue(srcInfers);
        let originInfers = clValInfers[codeseq];
        let changed = false;
        for (let i = 0; i < regcount; ++i) {
            let newInfer = (postTAC && i === postTAC.regnum) ? postTAC.reginfo : srcInfers[i];
            if (!equal(originInfers[i], newInfer)) {
                changed = true;
                originInfers[i] = newInfer;
            }
        }
        if (changed) {
            let extrato = cl.branchToCL();
            let tocodelines = extrato ? [extrato.linenum] : [];
            if (codeseq !== clen - 1)
                tocodelines.push(codeseq + 1);
            for (let ln of tocodelines) {
                let j = 0;
                for (; j < stacktop; ++j) {
                    if (stack[j] === ln) break;
                }
                // to be processed
                if (j === stacktop) stack[stacktop++] = ln;
            }
        }
    }
    return makeAllCLTopValInfers(clValInfers, codelines, line1Init);
}

// fromRegValInfers: Array< code line value inference >
function mergeMulCodeLineRegs(fromRegValInfers: Array<Array<ValueInference>>): Array<ValueInference> {
    let rlen = fromRegValInfers[0].length;
    let ret = new Array<ValueInference>(rlen);
    for (let i = 0; i < rlen; ++i) {
        ret[i] = merge(fromRegValInfers.map(f => f[i]));
    }
    return ret;
}

function makeTopValInfers(linenum: number, bottomValInfers: Array<Array<ValueInference>>, codelines: Array<CodeLine>, line1Init: Array<ValueInference>) {
    let cl = codelines[linenum];
    let from = cl.branchInCL().map(c => c.linenum);
    if (linenum > 0) from = from.concat(linenum - 1);
    let frominfers = from.map(ln => bottomValInfers[ln]);
    if (linenum === 0) frominfers.push(line1Init);
    return mergeMulCodeLineRegs(frominfers);
}

function makeAllCLTopValInfers(bottomValInfers: Array<Array<ValueInference>>, codelines: Array<CodeLine>, line1Init: Array<ValueInference>): Array<Array<ValueInference>> {
    let clen = codelines.length;
    let ret = new Array<Array<ValueInference>>(clen);
    for (let i = 0; i < clen; ++i) {
        ret[i] = makeTopValInfers(i, bottomValInfers, codelines, line1Init);
    }
    return ret;
}
