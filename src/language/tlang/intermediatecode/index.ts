
import { IdGen, flatten } from "../../../utility";
import * as t from "../tac";
import * as r from "../regalloc";
import * as m from "../mipscode";
//import * as tc from "./typecheck";
import * as util from "../util";
import { ValueInference, NEVER, ANY, inferValues, ValueType } from "./valueinfer";
import { valueFold } from "./valuefold";
import { inferLiveness, LivenessInfo } from "./livenessinfer";
import { livenessProne } from "./livenessprone";
import { compress } from "./compress";
import { removeBranch } from "./removebranch";
import { finalizeLabelRef } from "./util";

export { ValueInference, ValueType, ANY, LivenessInfo };

// FOR INTERMEDIATE CODE GENERATION AND OPTIMIZATION

export function generateIntermediateCode(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup): IntermediateCode {
    let code = new IntermediateCode();
    code.addVtableGData(classlookup);
    const labelIdGen = new IdGen();
    for (let fndef of flatten([fnlookup.allFn(), flatten(classlookup.getAllClasses().map(c => flatten([fnlookup.findMethods(c), fnlookup.findConstructors(c)])))])) {
        if (fndef.predefined) continue;
        let codelines = new Array<CodeLine>();
        fndef.astnode.genIntermediateCode(codelines);
        finalizeLabelRef(codelines);
        let cllen = codelines.length;
        for (let i = 0; i < cllen; ++i) {
            codelines[i].linenum = i;
        }
        let valInfers = inferValues(codelines, fndef.astnode.tmpRegAssigned, fndef.astnode.argTmpRegIdList);
        valueFold(codelines, valInfers); // fold will replace several TAC
        let liveInfers = inferLiveness(codelines, fndef.astnode.tmpRegAssigned);
        livenessProne(codelines, liveInfers); // livenessProne will replace several TAC
        removeBranch(codelines);
        // final code-lines
        let compressed = compress(codelines, liveInfers, labelIdGen);
        code.newCodePiece(fndef, fndef.astnode.tmpRegAssigned, compressed.codelines, compressed.regliveness);
    }
    return code;
}

export class IntermediateCode {
    private _codepieces: Array<CodePiece>;
    private _gdatapieces: Array<GDATA>;

    toMIPS(asm: m.MIPSAssembly): this {
        for (let gd of this._gdatapieces)
            gd.toMIPS(asm);
        for (let cp of this._codepieces)
            cp.toMIPS(asm);
        return this;
    }

    newCodePiece(fndef: util.FunctionDefinition, tmpregcount: number, codelines: Array<CodeLine>, regliveness: Array<LivenessInfo>): this {
        this._codepieces.push(new CodePiece(fndef, tmpregcount, codelines, regliveness));
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
        // regalloc will MODIFY the codelines and regliveness
        let regallocret = r.regalloc(this._codelines, this._regliveness, this._tmpregcount - 1), regset = new Set<number>();
        for (let x of regallocret.regmap) regset.add(x[1]);
        // mipsregs is the set of mips registers that will be used in this code block
        let mipsregs = [...regset].map(rnum => r.regnumToMIPSReg(rnum));
        let rlen = mipsregs.length;
        // store the $ra (return address)
        asm.addCode(new m.MIPS_sw(m.REGS.ra, new m.MIPSAddr_reg(-4 * rlen, m.REGS.sp)).setComments(this._fndef.signiture.toString()), this._fndef.getMIPSLabel());
        // store the $fp (frame point)
        asm.addCode(new m.MIPS_sw(m.REGS.fp, new m.MIPSAddr_reg(-4 * rlen - 4, m.REGS.sp)));
        for (let i = 0; i < rlen; ++i) {
            // save the value of assigned register into stack
            asm.addCode(new m.MIPS_sw(mipsregs[i], new m.MIPSAddr_reg(-4 * i, m.REGS.sp)));
        }
        // reset $fp to new frame
        asm.addCode(new m.MIPS_add(m.REGS.fp, m.REGS.sp, -4 * rlen - 8));

        // temporary 0 ~ arglen-1 are assigned to parameters;
        for (let i = 0; i < this._fndef.argtypelist.length; ++i) {
            if (regallocret.regmap.has(i))
                asm.addCode(new m.MIPS_lw(r.regnumToMIPSReg(regallocret.regmap.get(i)), new m.MIPSAddr_reg(4 + 4 * i, m.REGS.sp)));
            else if (regallocret.tmpinstack.has(i)) {
                // $t9 is a hard coded temporary register to pass value
                asm.addCode(new m.MIPS_lw(m.REGS.v0, new m.MIPSAddr_reg(4 + 4 * i, m.REGS.sp)));
                asm.addCode(new m.MIPS_sw(m.REGS.v0, new m.MIPSAddr_reg(regallocret.tmpinstack.get(i), m.REGS.fp)))
            }
        }
        // reset $sp
        asm.addCode(new m.MIPS_add(m.REGS.sp, m.REGS.sp, -4 * rlen - 8 - 4 * regallocret.tmpinstack.size));
        // function body
        let clen = this._codelines.length;
        let fnretlabel = this._fndef.getMIPSLabel_return();
        for (let i = 0; i < clen; ++i) {
            this._codelines[i].toMIPS(asm, regallocret.regmap, i === clen - 1, fnretlabel);
        }
        // restore $ra(return address)
        asm.addCode(new m.MIPS_lw(m.REGS.ra, new m.MIPSAddr_reg(8, m.REGS.fp)), fnretlabel);
        for (let i = 0; i < rlen; ++i) {
            // restore the callee saved register from stack
            asm.addCode(new m.MIPS_lw(mipsregs[rlen - 1 - i], new m.MIPSAddr_reg(12 + 4 * i, m.REGS.fp)));
        }
        // restore $sp
        asm.addCode(new m.MIPS_add(m.REGS.sp, m.REGS.fp, -8 - 4 * rlen));
        // restore $fp
        asm.addCode(new m.MIPS_lw(m.REGS.fp, new m.MIPSAddr_reg(4, m.REGS.fp)));
        // jump to register $ra
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
    private _regliveness: Array<LivenessInfo>;

    constructor(fndef: util.FunctionDefinition, tmpregcount: number, codelines: Array<CodeLine>, regliveness: Array<LivenessInfo>) {
        this._fndef = fndef;
        this._tmpregcount = tmpregcount;
        this._regliveness = regliveness;
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
export abstract class GDATA {
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
