
import { CodeLine } from "./index";
import { range, initArray, findFirst } from "../../../utility";

export function inferLiveness(codelines: Array<CodeLine>, regcount: number) {
    // from BOTTOM to TOP
    let clen = codelines.length;
    // store the top-liveness of each code line
    let regtopliveness = range(0, clen).map(() => initArray(regcount, false));
    let stack = range(0, clen);
    let stacktop = stack.length;
    while (stacktop > 0) {
        let codeseq = stack[--stacktop];
        let cl = codelines[codeseq];
        let bliveness = makeBottomLiveness(regtopliveness, cl, clen, regcount);
        let livechangeinfo = cl.tac.liveness(bliveness);
        let newtoplive = newTopLiveness(bliveness, livechangeinfo, regcount);
        let oldtoplive = regtopliveness[codeseq];
        if (newtoplive.some((l, idx) => l !== oldtoplive[idx])) {
            regtopliveness[codeseq] = newtoplive;
            let upstream = (codeseq === 0 ? [] : [codeseq - 1]).concat(cl.branchInCL().map(l => l.linenum));
            for (let s of upstream) {
                let i = 0;
                for (; i < stacktop; ++i) {
                    if (stack[i] === s) break;
                }
                if (i === stacktop) stack[stacktop++] = s;
            }
        }
    }
    // bottom-liveness of each code line
    return range(0, clen).map(i => makeBottomLiveness(regtopliveness, codelines[i], clen, regcount));
}

function makeBottomLiveness(regtoplive: Array<Array<boolean>>, codeline: CodeLine, totalcodeline: number, regcount: number): Array<boolean> {
    let extrato = codeline.branchToCL();
    let nexts = extrato ? [extrato.linenum] : [];
    if (codeline.linenum !== totalcodeline - 1) nexts.push(codeline.linenum + 1);
    return mergeLiveness(nexts.map(i => regtoplive[i]), regcount);
}

function newTopLiveness(btm: Array<boolean>, tacliveinfo: Array<{ regnum: number; live: boolean; }>, regcount: number): Array<boolean> {
    let ret = new Array<boolean>(regcount);
    for (let i = 0; i < regcount; ++i) {
        let match = findFirst(tacliveinfo, t => t.regnum === i);
        if (match) {
            ret[i] = match.live;
        } else {
            ret[i] = btm[i];
        }
    }
    return ret;
}

function mergeLiveness(fromcl: Array<Array<boolean>>, regcount: number): Array<boolean> {
    if (fromcl.length === 0) return initArray(regcount, false);
    else if (fromcl.length === 1) return fromcl[0];
    else {
        let ret = new Array<boolean>(regcount);
        for (let i = 0; i < regcount; ++i) {
            ret[i] = fromcl.map(f => f[i]).some(t => t === true);
        }
        return ret;
    }
}
