
import * as m from "../mipscode";
import * as util from "../util";
import { CodeLine, LivenessInfo } from "../intermediatecode";
import * as t from "../tac";

function convLivenessToSet(regliveness: Array<boolean>): Set<number> {
    let rlen = regliveness.length;
    let ret = new Set<number>();
    for (let i = 0; i < rlen; ++i) {
        if (regliveness[i]) {
            ret.add(i);
        }
    }
    return ret;
}

//NOTE, THIS FUNCTION WILL MODIFY INPUT (codelines)
export function regalloc(codelines: Array<CodeLine>, regliveness: Array<LivenessInfo>, maxtmpregnum: number): { regmap: Map<number, number>, tmpinstack: Map<number, number> } {
    let rig = new RIG(), clen = codelines.length;
    let reglivesets = regliveness.map(r=>{
        return {
            regbtmlive: convLivenessToSet(r.regbtmlive),
            regtoplive: convLivenessToSet(r.regtoplive),
        };
    })
    for (let i = 0; i < clen; ++i) {
        rig.addRelateRegs([...reglivesets[i].regbtmlive]);
        rig.addRelateRegs([...reglivesets[i].regtoplive]);
    }
    let allo = rig.allocate(), fpoffset = 0, stackoffsetmap = new Map<number, number>(), tmpregnum = maxtmpregnum + 1;
    while (!allo.succeed) {
        let snum = allo.spill, i = 0;
        //new assigned reg for spilled reg cannot be spilled again (no good solution to this conflict yet)
        if (snum > maxtmpregnum) throw new Error("undefined behavior, spilled reigster cannot be spilled again: " + snum);
        let mloc = -4 * fpoffset++;
        stackoffsetmap.set(snum, mloc);
        rig.removeReg(snum);
        for (; i < codelines.length; ++i) {
            //remove spilled tmp-register in every lines
            let reginfer = reglivesets[i], cl = codelines[i];
            reginfer.regbtmlive.delete(snum);
            reginfer.regtoplive.delete(snum);
            let tac = cl.tac;
            if (tac.readReg(snum)) {
                let newreg = tmpregnum++;
                let newcl = new CodeLine(new t.TAC_lw(util.TMP_REGS_FP, mloc, newreg));
                let newreginfer = {
                    regtoplive: new Set<number>(reginfer.regtoplive),
                    regbtmlive: new Set<number>(reginfer.regtoplive).add(newreg)
                };
                // insert code line
                codelines.splice(i, 0, newcl);
                reglivesets.splice(i++, 0, newreginfer);
                // move label
                if (cl.label != null) {
                    let lb = cl.label;
                    cl.label = null;
                    newcl.label = lb;
                    lb.owner = newcl;
                }
                tac.replReadReg(snum, newreg);
                rig.addRelateRegsForOne(newreg, [...reginfer.regtoplive]);
                reginfer.regtoplive.add(newreg);
            }
            if (tac.writeReg(snum)) {
                let newreg = tmpregnum++;
                let newcl = new CodeLine(new t.TAC_sw(util.TMP_REGS_FP, mloc, newreg));
                let newreginfer = {
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
    return { regmap: allo.map, tmpinstack: stackoffsetmap };
}

//register interference graph
class RIG {
    // link between temp registers, so they cannot be assigned with same real register
    // because their values are "live" at same time
    private _map: Map<number, Set<number>>;

    removeReg(regnum: number): this {
        let s = this._map.get(regnum);
        if (s != null) {
            this._map.delete(regnum);
            for (let r of s)
                this._map.get(r).delete(regnum);
        }
        return this;
    }

    //complete linkage
    addRelateRegs(regnums: Array<number>): this {
        let rlen = regnums.length;
        if (rlen === 1) {
            this._getOrCreateSet(regnums[0]);
        }
        else {
            for (let i = 0; i < rlen - 1; ++i) {
                for (let j = i + 1; j < rlen; ++j) {
                    this._addRelatedRegs(regnums[i], regnums[j]);
                }
            }
        }
        return this;
    }

    //1->many link
    addRelateRegsForOne(regnum: number, regnums: Array<number>): this {
        if (regnums.length === 0) this._getOrCreateSet(regnum);
        else {
            let rlen = regnums.length;
            for (let i = 0; i < rlen; ++i) {
                this._addRelatedRegs(regnums[i], regnum);
            }
        }
        return this;
    }

    private _addRelatedRegs(regnum1: number, regnum2: number): this {
        if (regnum1 !== regnum2) {
            this._getOrCreateSet(regnum1).add(regnum2);
            this._getOrCreateSet(regnum2).add(regnum1);
        }
        return this;
    }

    private _getOrCreateSet(regnum: number) {
        let s = this._map.get(regnum);
        if (s == null) {
            s = new Set<number>();
            this._map.set(regnum, s);
        }
        return s;
    }

    allocate(): { succeed: boolean, spill?: number, map?: Map<number, number> } {
        let removables = new Array<number>(), unremovable = new Set<number>(), rarr = new Array<number>(), tmpcount = this._map.size, tmpmap = new Map<number, Set<number>>();
        for (let x of this._map) {
            if (x[1].size < regCount) removables.push(x[0]);
            else unremovable.add(x[0]);
            let tset = new Set<number>();
            //clone the set
            for (let n of x[1]) tset.add(n);
            tmpmap.set(x[0], tset);
        }
        while (true) {
            // remove nodes from graph marked by "removables"
            while (removables.length > 0) {
                let rnum = removables.pop();
                rarr.push(rnum);
                for (let n of tmpmap.get(rnum)) {
                    let s = tmpmap.get(n);
                    s.delete(rnum);
                    if (s.size < regCount && unremovable.has(n)) {
                        removables.push(n);
                        unremovable.delete(n);
                    }
                }
                tmpmap.delete(rnum);
            }
            if (rarr.length === tmpcount)
                break;
            else {
                let maxsize = -1, maxnum = -1;
                for (let t of tmpmap) {
                    if (maxsize < t[1].size) {
                        maxsize = t[1].size;
                        maxnum = t[0];
                    }
                }
                if (maxnum === -1 || maxsize === -1) throw new Error("defensive code, impossible code path");
                // find the node with most neighbors and mark it as "removable"
                removables.push(maxnum);
                unremovable.delete(maxnum);
            }
        }
        if (tmpmap.size !== 0) throw new Error("defensive code, impossible code path " + tmpmap.size);
        let regmap = new Map<number, number>(), i = rarr.length - 1;
        while (i >= 0) {
            let rnum = rarr[i];
            let nei = this._map.get(rnum);
            // assignedneibor: list of neighbor nodes that already got real register allocation
            let assignedneibor = new Array<number>(), regs = new Array<boolean>(regCount);
            for (let j = i + 1; j < rarr.length; ++j) {
                if (nei.has(rarr[j]))
                    assignedneibor.push(rarr[j]);
            }
            for (let n of assignedneibor) regs[regmap.get(n)] = true;
            let j = 0;
            for (; j < regCount; ++j) {
                if (regs[j] !== true) {
                    // assign the register to temporary
                    regmap.set(rnum, j);
                    break;
                }
            }
            // if no valid assignment
            if (j === regCount)
                return { succeed: false, spill: rnum };
            --i;
        }
        return { succeed: true, map: regmap };
    }

    constructor() {
        this._map = new Map<number, Set<number>>();
    }
}

export function toMIPSReg(tmpnum: number, regmap: Map<number, number>): m.MIPSRegister {
    if (tmpnum === util.TMP_REGS_FP) return m.REGS.fp;
    else if (!regmap.has(tmpnum)) throw new Error("undefined regnum for given temporary: " + tmpnum);
    else return regnumToMIPSReg(regmap.get(tmpnum));
};

const regCount = 7;

export function regnumToMIPSReg(regnum: number): m.MIPSRegister {
    switch (regnum) {
        case 0: return m.REGS.t0;
        case 1: return m.REGS.t1;
        case 2: return m.REGS.t2;
        case 3: return m.REGS.t3;
        case 4: return m.REGS.t4;
        case 5: return m.REGS.t5;
        case 6: return m.REGS.t6;
        default: throw new Error("invalid regnum: " + regnum);
    }
}
