
import { CodeLine } from "./index";
import { TAC_branch, TAC_noop } from "../tac";
import { finalizeLabelRef } from "./util";

// remove unnecessary branch(jump)
export function removeBranch(codelines: Array<CodeLine>): void {
    const clen = codelines.length;
    for (let i = 0; i < clen - 1; ++i) {
        const cl = codelines[i];
        const tac = cl.tac;
        if (tac instanceof TAC_branch) {
            const tidx = tac.label.owner.linenum;
            if (tidx > i) {
                let j = i + 1;
                // if all instructions before the jump target is NOOP, then this jump is unnecessary
                while (codelines[j].tac instanceof TAC_noop && j < tidx)++j;
                if (j === tidx)
                    cl.tac = new TAC_noop();
            }
        }
    }
    finalizeLabelRef(codelines);
}
