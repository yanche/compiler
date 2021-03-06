

import { CodeLine } from "./index";
import { ValueInference } from "./valueinfer";
import { TAC, TAC_ret, TAC_branch, TAC_btrue, TAC_bfalse, TAC_noop } from "../tac";

export function valueFold(codelines: Array<CodeLine>, regvinfer: Array<Array<ValueInference>>): void {
    const tlen = codelines.length;
    const newtacs = new Array<TAC>(tlen);
    const stack = [0];
    let stacktop = 1;
    while (stacktop > 0) {
        const codeseq = stack[--stacktop];
        if (newtacs[codeseq] == null) {
            const cl = codelines[codeseq];
            const newtac = cl.tac.simplify(regvinfer[codeseq]);
            newtacs[codeseq] = newtac;
            if (!(newtac instanceof TAC_ret)) {
                if (newtac instanceof TAC_branch) {
                    //the last TAC must be RET
                    if (newtac instanceof TAC_btrue || newtac instanceof TAC_bfalse)
                        stack[stacktop++] = codeseq + 1;
                    stack[stacktop++] = newtac.label.owner.linenum;
                }
                else
                    stack[stacktop++] = codeseq + 1;
            }
        }
    }
    for (let i = 0; i < tlen; ++i)
        codelines[i].tac = newtacs[i] || new TAC_noop();
}
