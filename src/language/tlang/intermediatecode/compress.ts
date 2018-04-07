
import { IdGen } from "../../../utility";
import { CodeLine } from "./index";
import { TAC_branch, TAC_noop } from "../tac";
import { finalizeLabelRef } from "./util";
import { LivenessInfo } from "./livenessinfer";

// remove noop instruction
export function compress(codelines: Array<CodeLine>, liveInfers: Array<LivenessInfo>, labelIdGen: IdGen) {
    const clen = codelines.length;
    let lastcl: CodeLine = null;
    // move the LABEL on tac.noop to its next following tac
    for (let j = clen - 1; j >= 0; --j) {
        const cl = codelines[j];
        const tac = cl.tac;
        if (tac instanceof TAC_noop) {
            if (cl.label) {
                if (!lastcl) throw new Error("defensive code, jump to noop till end of code");
                if (!lastcl.label) {
                    lastcl.label = cl.label;
                    cl.label.owner = lastcl;
                }
                else {
                    for (const ucl of cl.label.upstreams) {
                        const utac = <TAC_branch>ucl.tac;
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
    const keepCLidx = codelines.map((cl, idx) => { return { ignore: cl.tac instanceof TAC_noop, idx: idx } }).filter(x => !x.ignore).map(x => x.idx);
    const compressedCodelines = new Array<CodeLine>(keepCLidx.length), compressedRegLiveness = new Array<LivenessInfo>(keepCLidx.length);
    for (let i = 0; i < keepCLidx.length; ++i) {
        const idx = keepCLidx[i];
        const cl = codelines[idx];
        // reset the number on labels
        if (cl.label) cl.label.num = labelIdGen.next();
        compressedCodelines[i] = cl;
        compressedRegLiveness[i] = liveInfers[idx];
    }
    return {
        codelines: compressedCodelines,
        regliveness: compressedRegLiveness
    };
}
