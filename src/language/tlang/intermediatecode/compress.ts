
import { CodeLine } from "./intermediatecode";
import { TAC_branch, TAC_noop } from "../tac";
import { finalizeLabelRef } from "./util";

// remove noop instruction
export function compress(codelines: Array<CodeLine>): Array<number> {
    let clen = codelines.length, lastcl: CodeLine = null;
    for (let j = clen - 1; j >= 0; --j) {
        let cl = codelines[j];
        let tac = cl.tac;
        if (tac instanceof TAC_noop) {
            if (cl.label != null) {
                if (lastcl == null) throw new Error("defensive code, jump to noop till end of code");
                if (lastcl.label == null) {
                    lastcl.label = cl.label;
                    cl.label.owner = lastcl;
                }
                else {
                    for (let ucl of cl.label.upstreams) {
                        let utac = <TAC_branch>ucl.tac;
                        utac.label = lastcl.label;
                    }
                }
                cl.label = null;
            }
        }
        else lastcl = cl;
    }
    finalizeLabelRef(codelines);
    return codelines.map((cl, idx) => { return { ignore: cl.tac instanceof TAC_noop, idx: idx } }).filter(x => !x.ignore).map(x => x.idx);
}
