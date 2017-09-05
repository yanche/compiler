
import { IdGen } from "../../../utility";
import { CodeLine } from "./index";
import { TAC_branch, TAC_noop } from "../tac";
import { finalizeLabelRef } from "./util";
import { LivenessInfo } from "./livenessinfer";

// remove noop instruction
export function compress(codelines: Array<CodeLine>, liveInfers: Array<LivenessInfo>) {
    let clen = codelines.length, lastcl: CodeLine = null;
    // move the LABEL on tac.noop to its next following tac
    for (let j = clen - 1; j >= 0; --j) {
        let cl = codelines[j];
        let tac = cl.tac;
        if (tac instanceof TAC_noop) {
            if (cl.label) {
                if (!lastcl) throw new Error("defensive code, jump to noop till end of code");
                if (!lastcl.label) {
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
    // keep the non tac.noop instructions
    let keepCLidx = codelines.map((cl, idx) => { return { ignore: cl.tac instanceof TAC_noop, idx: idx } }).filter(x => !x.ignore).map(x => x.idx);
    let compressedCodelines = new Array<CodeLine>(keepCLidx.length), compressedRegLiveness = new Array<LivenessInfo>(keepCLidx.length);
    let labelidgen = new IdGen();
    for (let i = 0; i < keepCLidx.length; ++i) {
        let idx = keepCLidx[i];
        let cl = codelines[idx];
        // reset the number on labels
        if (cl.label) cl.label.num = labelidgen.next();
        compressedCodelines[i] = cl;
        compressedRegLiveness[i] = liveInfers[idx];
    }
    return {
        codelines: compressedCodelines,
        regliveness: compressedRegLiveness
    };
}
