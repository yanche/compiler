
import * as m from "../mipscode";
import * as util from "../util";
import { CodeLine, LivenessInfo } from "../intermediatecode";
import * as t from "../tac";
import { regnumToMIPSReg } from "./regs";
import { RIG } from "./reginfgraph";

function convLivenessToSet(regliveness: Array<boolean>): Set<number> {
    const rlen = regliveness.length;
    const ret = new Set<number>();
    for (let i = 0; i < rlen; ++i) {
        if (regliveness[i]) {
            ret.add(i);
        }
    }
    return ret;
}

// NOTE, THIS FUNCTION WILL MODIFY INPUT (codelines)
export function regalloc(codelines: Array<CodeLine>, regliveness: Array<LivenessInfo>, maxtmpregnum: number): { regmap: Map<number, number>, tmpinstack: Map<number, number> } {
    const rig = new RIG(), clen = codelines.length;
    const reglivesets = regliveness.map(r => {
        return {
            regbtmlive: convLivenessToSet(r.regbtmlive),
            regtoplive: convLivenessToSet(r.regtoplive),
        };
    });
    for (let i = 0; i < clen; ++i) {
        rig.addRelateRegs([...reglivesets[i].regbtmlive]);
        rig.addRelateRegs([...reglivesets[i].regtoplive]);
    }
    let allo = rig.allocate();
    let fpoffset = 0;
    const stackoffsetmap = new Map<number, number>();
    let tmpregnum = maxtmpregnum + 1;
    while (!allo.succeed) {
        const snum = allo.spill;
        let i = 0;
        // new assigned reg for spilled reg cannot be spilled again (no good solution to this conflict yet)
        if (snum > maxtmpregnum) throw new Error("undefined behavior, spilled reigster cannot be spilled again: " + snum);
        const mloc = -4 * fpoffset++;
        stackoffsetmap.set(snum, mloc);
        rig.removeReg(snum);
        for (; i < codelines.length; ++i) {
            // remove spilled tmp-register in every lines
            const reginfer = reglivesets[i], cl = codelines[i];
            reginfer.regbtmlive.delete(snum);
            reginfer.regtoplive.delete(snum);
            const tac = cl.tac;
            if (tac.readReg(snum)) {
                const newreg = tmpregnum++;
                const newcl = new CodeLine(new t.TAC_lw(util.TMP_REGS_FP, mloc, newreg));
                const newreginfer = {
                    regtoplive: new Set<number>(reginfer.regtoplive),
                    regbtmlive: new Set<number>(reginfer.regtoplive).add(newreg)
                };
                // insert code line
                codelines.splice(i, 0, newcl);
                reglivesets.splice(i++, 0, newreginfer);
                // move label
                if (cl.label != null) {
                    const lb = cl.label;
                    cl.label = null;
                    newcl.label = lb;
                    lb.owner = newcl;
                }
                tac.replReadReg(snum, newreg);
                rig.addRelateRegsForOne(newreg, [...reginfer.regtoplive]);
                reginfer.regtoplive.add(newreg);
            }
            if (tac.writeReg(snum)) {
                const newreg = tmpregnum++;
                const newcl = new CodeLine(new t.TAC_sw(util.TMP_REGS_FP, mloc, newreg));
                const newreginfer = {
                    regbtmlive: new Set<number>(reginfer.regbtmlive),
                    regtoplive: new Set<number>(reginfer.regbtmlive).add(newreg)
                };
                codelines.splice(++i, 0, newcl);
                reglivesets.splice(i, 0, newreginfer);
                // ATTENTION, IF WE HAVE INSTRUCTION TO WRITE INTO SOME REGISTER AND BRANCH TO OTHER PC SIMUTANEOUSLY, WE NEED PROCESS THE "BRANCH TARGET" HERE
                // MIPS DOES NOT HAVE THESE INSTRUCTIONS
                tac.replWriteReg(snum, newreg);
                rig.addRelateRegsForOne(newreg, [...reginfer.regbtmlive]);
                reginfer.regbtmlive.add(newreg);
            }
        }
        allo = rig.allocate(); //try allocate register again
    }
    // regmap: map from tmp-reg-num -> mips reg num
    // tmpinstack: map from tmp-reg-num -> offset(to $fp) in memory
    return { regmap: allo.map, tmpinstack: stackoffsetmap };
}

export function toMIPSReg(tmpregnum: number, regmap: Map<number, number>): m.MIPSRegister {
    if (tmpregnum === util.TMP_REGS_FP) return m.REGS.fp;
    else if (!regmap.has(tmpregnum)) throw new Error("undefined regnum for given temporary: " + tmpregnum);
    else return regnumToMIPSReg(regmap.get(tmpregnum));
};

export { regnumToMIPSReg };
