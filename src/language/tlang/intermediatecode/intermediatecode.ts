
import { IdGen, flatten } from "../../../utility";
import * as t from "../tac";
import * as r from "../regallocate";
import * as m from "../mipscode";
//import * as tc from "./typecheck";
import * as util from "../util";
import { ValueInference, NEVER, ANY, inferValues } from "./valueinfer";
import { valueFold } from "./valuefold";

//FOR INTERMEDIATE CODE GENERATION AND OPTIMIZATION

function livenessInference(codelines: Array<CodeLine>, regvinfer: Array<CodeLineRegInfoInferences>) {
    //from BOTTOM to TOP
    let clen = codelines.length;
    for (let i = 0; i < clen; ++i)codelines[i].linenum = i;
    let stack = codelines.filter(c => c.tac instanceof t.TAC_ret).map(c => c.linenum);
    let stacktop = stack.length;
    while (stacktop > 0) {
        let codeseq = stack[--stacktop];
        let cl = codelines[codeseq];
        let extrato = cl.branchToCL();
        let nexts = extrato == null ? [] : [extrato.linenum];
        if (codeseq !== clen - 1) nexts.push(codeseq + 1);
        if (inferBottomTmpRegLiveness(nexts.map(i => regvinfer[i].top_live || new Set<number>()), regvinfer[codeseq])) {
            if (inferTopTmpRegLiveness(cl.tac, regvinfer[codeseq])) {
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
    }
}

function inferBottomTmpRegLiveness(fromcl: Iterable<Iterable<number>>, regvinfer: CodeLineRegInfoInferences): boolean {
    let changed = false, lives = new Set<number>();
    for (let s of fromcl)
        for (let l of s)
            lives.add(l);
    if (regvinfer.bottom_live == null) {
        regvinfer.bottom_live = lives;
        changed = true;
    }
    else {
        for (let l of lives) {
            if (!regvinfer.bottom_live.has(l)) {
                regvinfer.bottom_live.add(l);
                changed = true;
            }
        }
    }
    return changed;
}

function inferTopTmpRegLiveness(tac: t.TAC, regvinfer: CodeLineRegInfoInferences): boolean {
    let charr = tac.tmpRegLiveness(regvinfer.bottom_live), changed = false, tmpset = new Set<number>(regvinfer.bottom_live);
    for (let c of charr) {
        if (c.live) tmpset.add(c.regnum);
        else tmpset.delete(c.regnum);
    }
    if (regvinfer.top_live == null) {
        regvinfer.top_live = tmpset;
        changed = true;
    }
    else {
        for (let n of tmpset) {
            if (!regvinfer.top_live.has(n)) {
                regvinfer.top_live.add(n);
                changed = true;
            }
        }
    }
    return changed;
}

function livenessProne(codelines: Array<CodeLine>, regvinfer: Array<CodeLineRegInfoInferences>) {
    let tlen = codelines.length;
    for (let i = 0; i < tlen; ++i) {
        let cl = codelines[i];
        cl.tac = cl.tac.livenessProne(regvinfer[i].bottom_live);
    }
}

//remove unnecessary branch(jump)
function removeBranch(codelines: Array<CodeLine>) {
    let clen = codelines.length;
    for (let i = 0; i < clen; ++i)codelines[i].linenum = i;
    for (let i = 0; i < clen - 1; ++i) {
        let cl = codelines[i];
        let tac = cl.tac;
        if (tac instanceof t.TAC_branch) {
            let tidx = tac.label.owner.linenum;
            if (tidx > i) {
                let j = i + 1;
                //if all instructions before the jump target is NOOP, then this jump is unnecessary
                while (codelines[j].tac instanceof t.TAC_noop && j < tidx)++j;
                if (j === tidx)
                    cl.tac = new t.TAC_noop();
            }
        }
    }
    finalizeLabelRef(codelines);
}

//remove noop instruction
function compress(codelines: Array<CodeLine>): Array<number> {
    let clen = codelines.length, lastcl: CodeLine = null;
    for (let j = clen - 1; j >= 0; --j) {
        let cl = codelines[j];
        let tac = cl.tac;
        if (tac instanceof t.TAC_noop) {
            if (cl.label != null) {
                if (lastcl == null) throw new Error("defensive code, jump to noop till end of code");
                if (lastcl.label == null) {
                    lastcl.label = cl.label;
                    cl.label.owner = lastcl;
                }
                else {
                    for (let ucl of cl.label.upstreams) {
                        let utac = <t.TAC_branch>ucl.tac;
                        utac.label = lastcl.label;
                    }
                }
                cl.label = null;
            }
        }
        else lastcl = cl;
    }
    finalizeLabelRef(codelines);
    return codelines.map((cl, idx) => { return { ignore: cl.tac instanceof t.TAC_noop, idx: idx } }).filter(x => !x.ignore).map(x => x.idx);
}

function finalizeLabelRef(codelines: Array<CodeLine>) {
    for (let cl of codelines)
        if (cl.label)
            cl.label.upstreams = new Array<CodeLine>();
    for (let cl of codelines) {
        let tac = cl.tac;
        if (tac instanceof t.TAC_branch)
            tac.label.upstreams.push(cl);
    }
    for (let cl of codelines) {
        if (cl.label) {
            if (cl.label.upstreams.length > 0)
                cl.label.owner = cl;
            else
                cl.label = null;
        }
    }
}

export function generateIntermediateCode(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup): IntermediateCode {
    let code = new IntermediateCode(), labelidgen = new IdGen();
    code.addVtableGData(classlookup);
    for (let fndef of flatten([fnlookup.allFn(), flatten(classlookup.getAllClasses().map(c => flatten([fnlookup.findMethods(c), fnlookup.findConstructors(c)])))])) {
        if (fndef.predefined) continue;
        let codelines = new CodeLineCollector();
        fndef.astnode.genIntermediateCode(codelines);
        finalizeLabelRef(codelines._arr);
        let cllen = codelines._arr.length;
        //each code-line would have one reg-info-inference record (one for input one for output)
        let clvalueinfer = new Array<CodeLineRegInfoInferences>(cllen);
        for (let i = 0; i < cllen; ++i) {
            codelines._arr[i].linenum = i;
            clvalueinfer[i] = new CodeLineRegInfoInferences(fndef.astnode.tmpRegAssigned);
        }
        let valInfers = inferValues(codelines._arr, fndef.astnode.tmpRegAssigned, fndef.astnode.argTmpRegIdList);
        valueFold(codelines._arr, valInfers); //fold will replace several TAC
        livenessInference(codelines._arr, clvalueinfer);
        livenessProne(codelines._arr, clvalueinfer); //livenessProne will replace several TAC
        removeBranch(codelines._arr);
        //final code-lines
        let fcl = compress(codelines._arr);
        let compressed_codelines = new Array<CodeLine>(), compressed_reginfer = new Array<CodeLineRegInfoInferences>();
        for (let i = 0; i < fcl.length; ++i) {
            let idx = fcl[i];
            let cl = codelines._arr[idx];
            if (cl.label != null) cl.label.num = labelidgen.next();
            compressed_codelines.push(cl);
            compressed_reginfer.push(clvalueinfer[idx]);
        }
        code.newCodePiece(fndef, fndef.astnode.tmpRegAssigned, compressed_codelines, compressed_reginfer);
    }
    return code;
}

export class CodeLineRegInfoInferences {
    top_live: Set<number>;
    bottom_live: Set<number>;
    constructor(regcount: number) {
        this.top_live = null;
        this.bottom_live = null;
    }
}

export class CodeLineCollector {
    _arr: Array<CodeLine>;

    add(tac: t.TAC, label?: util.CodeLabel): this {
        this._arr.push(new CodeLine(tac, label));
        return this;
    }

    constructor() {
        this._arr = new Array<CodeLine>();
    }
}

export class IntermediateCode {
    private _codepieces: Array<CodePiece>;
    private _gdatapieces: Array<GDATA>;
    private _labelidgen: IdGen;

    toMIPS(asm: m.MIPSAssembly): this {
        for (let gd of this._gdatapieces)
            gd.toMIPS(asm);
        for (let cp of this._codepieces)
            cp.toMIPS(asm);
        return this;
    }

    newCodePiece(fndef: util.FunctionDefinition, tmpregcount: number, codelines: Array<CodeLine>, tmpreginfer: Array<CodeLineRegInfoInferences>): this {
        this._codepieces.push(new CodePiece(fndef, tmpregcount, codelines, tmpreginfer));
        return this;
    }

    toString(): string {
        let gdata = ".data\r\n" + this._gdatapieces.map(gdata => gdata.toString()).join("\r\n\r\n");
        let text = ".text\r\n" + this._codepieces.map(cp => cp.toString()).join("\r\n\r\n");
        return gdata + "\r\n\r\n" + text;
    }

    addGData(gdata: GDATA): this {
        this._gdatapieces.push(gdata);
        return this;
    }

    addVtableGData(classlookup: util.ClassLookup): this {
        for (let classname of classlookup.getAllClasses()) {
            this.addGData(new GDATA_VTABLE(classlookup.getClass(classname)));
        }
        return this;
    }

    constructor() {
        this._codepieces = new Array<CodePiece>();
        this._gdatapieces = new Array<GDATA>();
        this._labelidgen = new IdGen();
    }
}

// function lineNum2Str(linenum: number, minlen: number): string {
//     let linestr = linenum + ":";
//     let arr = new Array<string>(Math.max(minlen - linestr.length, 0) + 1);
//     for (let i = 0; i < arr.length - 1; ++i) arr[i] = " ";
//     arr[arr.length - 1] = linestr;
//     return arr.join("");
// }

// export function fnLabel(fnsigniture: string): string {
//     if (fnsigniture === "main") return fnsigniture;
//     else if (fnsigniture === tc.predefinedFn.print_int.signiture) return m.MIPS_FN_PRINT_INT;
//     else if (fnsigniture === tc.predefinedFn.print_bool.signiture) return m.MIPS_FN_PRINT_BOOL;
//     else if (fnsigniture === tc.predefinedFn.print_newline.signiture) return m.MIPS_FN_PRINT_NEWLINE;
//     else return "fnlabel_" + fnsigniture;
// }

// export function gdataLabel(labelname: string): string {
//     return "gdata_" + labelname;
// }

export class CodePiece {
    toMIPS(asm: m.MIPSAssembly): this {
        //regalloc will MODIFY the codelines and tmpreginfer
        let regallocret = r.regalloc(this._codelines, this._tmpreginfer, this._tmpregcount - 1), regset = new Set<number>();
        for (let x of regallocret.regmap) regset.add(x[1]);
        //mipsregs is the set of mips registers that will be used in this code block
        let mipsregs = [...regset].map(rnum => r.regnumToMIPSReg(rnum));
        let rlen = mipsregs.length;
        //store the $ra
        asm.addCode(new m.MIPS_sw(m.REGS.ra, new m.MIPSAddr_reg(-4 * rlen, m.REGS.sp)).setComments(this._fndef.signiture.toString()), this._fndef.getMIPSLabel());
        //store the $fp
        asm.addCode(new m.MIPS_sw(m.REGS.fp, new m.MIPSAddr_reg(-4 * rlen - 4, m.REGS.sp)));
        for (let i = 0; i < rlen; ++i) {
            //save the value of assigned register into stack
            asm.addCode(new m.MIPS_sw(mipsregs[i], new m.MIPSAddr_reg(-4 * i, m.REGS.sp)));
        }
        //reset $fp
        asm.addCode(new m.MIPS_add(m.REGS.fp, m.REGS.sp, -4 * rlen - 8));

        //temporary 0 ~ arglen-1 are assigned to parameters;
        for (let i = 0; i < this._fndef.argtypelist.length; ++i) {
            if (regallocret.regmap.has(i))
                asm.addCode(new m.MIPS_lw(r.regnumToMIPSReg(regallocret.regmap.get(i)), new m.MIPSAddr_reg(4 + 4 * i, m.REGS.sp)));
            else if (regallocret.tmpinstack.has(i)) {
                //$t9 is a hard coded temporary register to pass value
                asm.addCode(new m.MIPS_lw(m.REGS.v0, new m.MIPSAddr_reg(4 + 4 * i, m.REGS.sp)));
                asm.addCode(new m.MIPS_sw(m.REGS.v0, new m.MIPSAddr_reg(regallocret.tmpinstack.get(i), m.REGS.fp)))
            }
        }
        //reset $sp
        asm.addCode(new m.MIPS_add(m.REGS.sp, m.REGS.sp, -4 * rlen - 8 - 4 * regallocret.tmpinstack.size));
        //function body
        let clen = this._codelines.length;
        for (let i = 0; i < clen; ++i) {
            this._codelines[i].toMIPS(asm, regallocret.regmap, i === clen - 1, this._fndef.getMIPSLabel_return());
        }
        asm.addCode(new m.MIPS_lw(m.REGS.ra, new m.MIPSAddr_reg(8, m.REGS.fp)), this._fndef.getMIPSLabel_return());
        for (let i = 0; i < rlen; ++i) {
            //restore the callee saved register from stack
            asm.addCode(new m.MIPS_lw(mipsregs[rlen - 1 - i], new m.MIPSAddr_reg(12 + 4 * i, m.REGS.fp)));
        }
        asm.addCode(new m.MIPS_add(m.REGS.sp, m.REGS.fp, -8 - 4 * rlen));
        asm.addCode(new m.MIPS_lw(m.REGS.fp, new m.MIPSAddr_reg(4, m.REGS.fp)));
        asm.addCode(new m.MIPS_jr(m.REGS.ra));
        asm.addCode(new m.MIPS_emptyline());
        return this;
    }
    toString(): string {
        return this._fndef.signiture + "\r\n" + this._codelines.join("\r\n");
    }
    private _fndef: util.FunctionDefinition;
    private _tmpregcount: number;
    private _codelines: Array<CodeLine>;
    private _tmpreginfer: Array<CodeLineRegInfoInferences>
    constructor(fndef: util.FunctionDefinition, tmpregcount: number, codelines: Array<CodeLine>, tmpreginfer: Array<CodeLineRegInfoInferences>) {
        this._fndef = fndef;
        this._tmpregcount = tmpregcount;
        this._tmpreginfer = tmpreginfer;
        this._codelines = codelines;
    }
}

export class CodeLine {
    linenum: number;

    toMIPS(asm: m.MIPSAssembly, regmap: Map<number, number>, last: boolean, retlabel: string): this {
        //livetemp: ignore fp, sp, if any
        let ins = this.tac.toMIPS(regmap, retlabel, last);
        let label = this.label == null ? null : this.label.toString();
        if (ins.length === 0) {
            if (label != null)
                asm.addCode(new m.MIPS_nop(), label);
        }
        else {
            asm.addCode(ins[0], label);
            for (let i = 1; i < ins.length; ++i)
                asm.addCode(ins[i]);
        }
        return this;
    }
    branchInCL(): Array<CodeLine> {
        if (!this.label) return [];
        else return this.label.upstreams;
    }
    branchToCL(): CodeLine {
        let tac = this.tac;
        if (tac instanceof t.TAC_branch) {
            let retcl = tac.label.owner;
            if (!retcl) throw new Error("defensive code, label point to nothing, branchToCL is supposed to be called under label-complete mode");
            return retcl;
        }
        else return null;
    }
    toString(): string {
        let labelstr = "";
        if (this.label != null)
            labelstr = this.label + " :\r\n";
        return labelstr + this.tac.toString();
    }
    constructor(public tac: t.TAC, public label?: util.CodeLabel) { }
}


//global data block
abstract class GDATA {
    toString(): string {
        throw new Error("not implemented");
    }

    toMIPS(asm: m.MIPSAssembly): this {
        throw new Error("not implemented");
    }
}

class GDATA_VTABLE extends GDATA {
    private _vtable: Array<util.FunctionDefinition>;
    private _vtable_label: string;

    constructor(classdef: util.ClassDefinition) {
        super();
        this._vtable = classdef.vmethodTable;
        //use mips label
        this._vtable_label = classdef.getMIPSVTableLabel();
    }

    toString(): string {
        return [this._vtable_label + " :"].concat(this._vtable.map(fndef => fndef.signiture.toString())).join("\r\n");
    }

    toMIPS(asm: m.MIPSAssembly): this {
        //noaction, vtable & vtable-setup will be processed as a "predefined block" of mips code generation
        return this;
    }
}
