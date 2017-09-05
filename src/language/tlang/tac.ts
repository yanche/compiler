
import { ValueInference, ValueType, ANY } from "./intermediatecode";
import * as util from "./util";
import * as m from "./mipscode";
import * as r from "./regalloc";

function reg2str(regnum: number): string {
    return "$" + regnum;
}

//three-address code
export abstract class TAC {
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        throw new Error("not implemented");
    }
    toString(): string {
        throw new Error("not implemented");
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return null;
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [];
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return this;
    }
    readReg(regnum: number): boolean {
        return false;
    }
    replReadReg(regnum: number, newregnum: number): this {
        throw new Error("not implemented");
    }
    writeReg(regnum: number): boolean {
        return false;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        throw new Error("not implemented");
    }
}
export class TAC_noop extends TAC {
    toString(): string {
        return "noop";
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [];
    }
}
export class TAC_ret extends TAC {
    toString(): string {
        return "ret";
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return last ? [] : [new m.MIPS_b(retlabel)];
    }
}
export class TAC_retreg extends TAC_ret {
    constructor(public reg: number) { super(); }
    toString(): string {
        return ["ret", reg2str(this.reg)].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let info = tmpreginfers[this.reg];
        if (info.type === ValueType.CONST) return new TAC_retint(info.cons);
        else if (info.type === ValueType.CONST_TIMES_REG && info.cons === 1) return new TAC_retreg(info.regnum);
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.reg, live: true }];
    }
    readReg(regnum: number): boolean {
        return regnum === this.reg;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.reg === regnum) this.reg = newregnum;
        else throw new Error("no read from reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        //put the return value into register v0
        let ret = new Array<m.MIPSInstruction>();
        ret.push(new m.MIPS_move(m.REGS.v0, r.toMIPSReg(this.reg, regmap)));
        if (!last) ret.push(new m.MIPS_b(retlabel));
        return ret;
    }
}
export class TAC_retint extends TAC_ret {
    constructor(public num: number) { super(); }
    toString(): string {
        return ["ret", this.num].join(" ");
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        //put the return integer into register v0
        let ret = new Array<m.MIPSInstruction>();
        ret.push(new m.MIPS_li(m.REGS.v0, this.num));
        if (!last) ret.push(new m.MIPS_b(retlabel));
        return ret;
    }
}
export class TAC_loadint extends TAC {
    //num: interger
    constructor(public num: number, public to_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.to_reg), "=", this.num].join(" ");
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return { regnum: this.to_reg, reginfo: { cons: this.num, type: ValueType.CONST } };
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let info = tmpreginfers[this.to_reg];
        if (info.type === ValueType.CONST && info.cons === this.num) return new TAC_noop();
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return tmpRegLiveness_assign(regbtmlive, [], this.to_reg, true);
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.to_reg] ? this : new TAC_noop();
    }
    writeReg(regnum: number): boolean {
        return this.to_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.to_reg === regnum) this.to_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [new m.MIPS_li(r.toMIPSReg(this.to_reg, regmap), this.num)];
    }
}
export class TAC_mov extends TAC {
    constructor(public from_reg: number, public to_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.to_reg), "=", reg2str(this.from_reg)].join(" ");
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return { regnum: this.to_reg, reginfo: tmpreginfers[this.from_reg] };
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        if (this.from_reg === this.to_reg) return new TAC_noop();
        let info1 = tmpreginfers[this.from_reg], info2 = tmpreginfers[this.to_reg];
        if (info1.type === ValueType.CONST && info2.type === ValueType.CONST && info1.cons === info2.cons) return new TAC_noop();
        else if (info1.type === ValueType.CONST_TIMES_REG && info2.type === ValueType.CONST_TIMES_REG && info1.cons === info2.cons && info1.regnum === info2.regnum) return new TAC_noop();
        else if (info1.type === ValueType.CONST) return new TAC_loadint(info1.cons, this.to_reg);
        else if (info1.type === ValueType.CONST_TIMES_REG) return new TAC_binary_int("*", info1.regnum, info1.cons, this.to_reg).simplify(tmpreginfers);
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        if (this.from_reg === this.to_reg) return [];
        return tmpRegLiveness_assign(regbtmlive, [this.from_reg], this.to_reg, true);
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.to_reg] ? this : new TAC_noop();
    }
    readReg(regnum: number): boolean {
        return this.from_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.from_reg === regnum) this.from_reg = newregnum;
        else throw new Error("no read from reg: " + regnum);
        return this;
    }
    writeReg(regnum: number): boolean {
        return this.to_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.to_reg === regnum) this.to_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [new m.MIPS_move(r.toMIPSReg(this.to_reg, regmap), r.toMIPSReg(this.from_reg, regmap))];
    }
}
export class TAC_paramint extends TAC {
    //TODO
    constructor(public num: number) { super(); }
    toString(): string {
        return ["paramint", this.num].join(" ");
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [
            //save the value into SP, thru v0
            new m.MIPS_li(m.REGS.v0, this.num),
            new m.MIPS_sw(m.REGS.v0, new m.MIPSAddr_reg(0, m.REGS.sp)),
            //SP = SP - 4
            new m.MIPS_subu(m.REGS.sp, m.REGS.sp, 4)
        ];
    }
}
export class TAC_param extends TAC {
    constructor(public reg: number) { super(); }
    toString(): string {
        return ["param", reg2str(this.reg)].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let info = tmpreginfers[this.reg];
        if (info.type === ValueType.CONST) return new TAC_paramint(info.cons);
        else if (info.type === ValueType.CONST_TIMES_REG && info.cons === 1) return new TAC_param(info.regnum);
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.reg, live: true }];
    }
    readReg(regnum: number): boolean {
        return this.reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.reg === regnum) this.reg = newregnum;
        else throw new Error("no read from reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [
            //save the value into SP
            new m.MIPS_sw(r.toMIPSReg(this.reg, regmap), new m.MIPSAddr_reg(0, m.REGS.sp)),
            //SP = SP - 4
            new m.MIPS_subu(m.REGS.sp, m.REGS.sp, 4)
        ];
    }
}
export class TAC_allocateint extends TAC {
    //TODO
    constructor(public num: number, public result_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.result_reg), "=", "allocateint", this.num].join(" ");
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return { regnum: this.result_reg, reginfo: ANY };
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.result_reg, live: false }];
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.result_reg] ? this : new TAC_noop();
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [
            //a0 is the length of required memory (bytes)
            new m.MIPS_li(m.REGS.a0, this.num),
            //system call code into v0, 9 represents the "SBRK"
            new m.MIPS_li(m.REGS.v0, 9),
            //get memory, result address in v0
            new m.MIPS_syscall(),
            //move the address into v0 into the register we assigned
            new m.MIPS_move(r.toMIPSReg(this.result_reg, regmap), m.REGS.v0)
        ];
    }
}
export class TAC_allocate extends TAC {
    constructor(public reg_bytes: number, public result_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.result_reg), "=", "allocate", reg2str(this.reg_bytes)].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let info = tmpreginfers[this.reg_bytes];
        if (info.type === ValueType.CONST) return new TAC_allocateint(info.cons, this.result_reg);
        else if (info.type === ValueType.CONST_TIMES_REG && info.cons === 1) return new TAC_allocate(info.regnum, this.result_reg);
        else return this;
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return { regnum: this.result_reg, reginfo: ANY };
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return tmpRegLiveness_assign(regbtmlive, [this.reg_bytes], this.result_reg, true);
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.result_reg] ? this : new TAC_noop();
    }
    readReg(regnum: number): boolean {
        return this.reg_bytes === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.reg_bytes === regnum) this.reg_bytes = newregnum;
        else throw new Error("no read from reg: " + regnum);
        return this;
    }
    writeReg(regnum: number): boolean {
        return this.result_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.result_reg === regnum) this.result_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [
            //a0 is the length of required memory (bytes)
            new m.MIPS_move(m.REGS.a0, r.toMIPSReg(this.reg_bytes, regmap)),
            //system call code into v0, 9 represents the "SBRK"
            new m.MIPS_li(m.REGS.v0, 9),
            //get memory, result address in v0
            new m.MIPS_syscall(),
            //move the address into v0 into the register we assigned
            new m.MIPS_move(r.toMIPSReg(this.result_reg, regmap), m.REGS.v0)
        ];
    }
}
export class TAC_fncall extends TAC {
    constructor(public fn: util.FunctionDefinition, public result_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.result_reg), "=", "call", this.fn.signiture, this.fn.argtypelist.length].join(" ");
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return { regnum: this.result_reg, reginfo: ANY };
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.result_reg, live: false }];
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.result_reg] ? this : new TAC_procedurecall(this.fn);
    }
    writeReg(regnum: number): boolean {
        return this.result_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.result_reg === regnum) this.result_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        let ret: Array<m.MIPSInstruction> = [
            //call the function(return address into $ra)
            new m.MIPS_jal(this.fn.getMIPSLabel()),
            //get the return value from v0
            new m.MIPS_move(r.toMIPSReg(this.result_reg, regmap), m.REGS.v0)
        ];
        if (this.fn.argtypelist.length > 0)
            ret.push(new m.MIPS_addu(m.REGS.sp, m.REGS.sp, 4 * this.fn.argtypelist.length));
        return ret;
    }
}
export class TAC_fncall_reg extends TAC {
    constructor(public fn_reg: number, public plen: number, public result_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.result_reg), "=", "call", reg2str(this.fn_reg), this.plen].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let info = tmpreginfers[this.fn_reg];
        if (info.type === ValueType.CONST_TIMES_REG && info.cons === 1) return new TAC_fncall_reg(info.regnum, this.plen, this.result_reg);
        else return this;
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return { regnum: this.result_reg, reginfo: ANY };
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return tmpRegLiveness_assign(regbtmlive, [this.fn_reg], this.result_reg, false);
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.result_reg] ? this : new TAC_procedurecall_reg(this.fn_reg, this.plen);
    }
    readReg(regnum: number): boolean {
        return this.fn_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.fn_reg === regnum) this.fn_reg = newregnum;
        else throw new Error("no read from reg: " + regnum);
        return this;
    }
    writeReg(regnum: number): boolean {
        return this.result_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.result_reg === regnum) this.result_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        let ret: Array<m.MIPSInstruction> = [
            //call the function by register(return address into $ra)
            new m.MIPS_jalr(r.toMIPSReg(this.fn_reg, regmap)),
            //get the return value from v0
            new m.MIPS_move(r.toMIPSReg(this.result_reg, regmap), m.REGS.v0)
        ];
        //SP = SP + 4*PLEN
        if (this.plen > 0)
            ret.push(new m.MIPS_addu(m.REGS.sp, m.REGS.sp, 4 * this.plen));
        return ret;
    }
}
export class TAC_procedurecall extends TAC {
    constructor(public fn: util.FunctionDefinition) { super(); }
    toString(): string {
        return ["call", this.fn.signiture, this.fn.argtypelist.length].join(" ");
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        //call the function(return address into $ra)
        let ret: Array<m.MIPSInstruction> = [new m.MIPS_jal(this.fn.getMIPSLabel())];
        //SP = SP + 4*PLEN
        if (this.fn.argtypelist.length > 0)
            ret.push(new m.MIPS_addu(m.REGS.sp, m.REGS.sp, 4 * this.fn.argtypelist.length));
        return ret;
    }
}
export class TAC_procedurecall_reg extends TAC {
    constructor(public fn_reg: number, public plen: number) { super(); }
    toString(): string {
        return ["call", reg2str(this.fn_reg), this.plen].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let info = tmpreginfers[this.fn_reg];
        if (info.type === ValueType.CONST_TIMES_REG && info.cons === 1) return new TAC_procedurecall_reg(info.regnum, this.plen);
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.fn_reg, live: true }];
    }
    readReg(regnum: number): boolean {
        return this.fn_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.fn_reg === regnum) this.fn_reg = newregnum;
        else throw new Error("no read from reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [
            //call the function by register(return address into $ra)
            new m.MIPS_jalr(r.toMIPSReg(this.fn_reg, regmap)),
            //SP = SP + 4*PLEN
            new m.MIPS_addu(m.REGS.sp, m.REGS.sp, 4 * this.plen)
        ];
    }
}
export class TAC_binary extends TAC {
    constructor(public op: string, public operand1_reg: number, public operand2_reg: number, public result_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.result_reg), "=", reg2str(this.operand1_reg), this.op, reg2str(this.operand2_reg)].join(" ");
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        let retinfo: ValueInference, oinfo1 = tmpreginfers[this.operand1_reg], oinfo2 = tmpreginfers[this.operand2_reg];

        if (oinfo1.type === ValueType.NEVER || oinfo2.type === ValueType.NEVER)
            throw new Error("defensive code, undefined behavior");
        else if (this.op === "*" && ((oinfo1.type === ValueType.CONST && oinfo1.cons === 0) || (oinfo2.type === ValueType.CONST && oinfo2.cons === 0))) {
            retinfo = { type: ValueType.CONST, cons: 0 };
            //TODO: MORE
        }
        else if ((this.op !== "/" || oinfo2.cons !== 0) && oinfo1.type === ValueType.CONST && oinfo2.type === ValueType.CONST) {
            retinfo = { type: ValueType.CONST, cons: bi_op(this.op, oinfo1.cons, oinfo2.cons) };
        }
        else if (this.op === "*" && oinfo1.type === ValueType.CONST_TIMES_REG && oinfo2.type === ValueType.CONST && oinfo1.regnum !== this.result_reg) {
            retinfo = { type: ValueType.CONST_TIMES_REG, cons: oinfo1.cons * oinfo2.cons, regnum: oinfo1.regnum };
        }
        else if (this.op === "*" && oinfo2.type === ValueType.CONST_TIMES_REG && oinfo1.type === ValueType.CONST && oinfo2.regnum !== this.result_reg) {
            retinfo = { type: ValueType.CONST_TIMES_REG, cons: oinfo1.cons * oinfo2.cons, regnum: oinfo2.regnum };
        }
        else if ((this.op === "+" || this.op === "-") && oinfo1.type === ValueType.CONST_TIMES_REG && oinfo2.type === ValueType.CONST_TIMES_REG && oinfo1.regnum === oinfo2.regnum && oinfo1.regnum !== this.result_reg) {
            let cons: number;
            if (this.op === "+")
                cons = oinfo1.cons + oinfo2.cons;
            else
                cons = oinfo1.cons - oinfo2.cons;
            retinfo = { type: ValueType.CONST_TIMES_REG, regnum: oinfo1.regnum, cons: cons };
        }
        else if (this.op === "*" && oinfo1.type === ValueType.CONST && oinfo2.type === ValueType.ANY && this.result_reg !== this.operand2_reg) {
            retinfo = { type: ValueType.CONST_TIMES_REG, regnum: this.operand2_reg, cons: oinfo1.cons };
        }
        else if (this.op === "*" && oinfo2.type === ValueType.CONST && oinfo1.type === ValueType.ANY && this.result_reg !== this.operand1_reg) {
            retinfo = { type: ValueType.CONST_TIMES_REG, regnum: this.operand1_reg, cons: oinfo2.cons };
        }
        else retinfo = ANY;

        return { regnum: this.result_reg, reginfo: retinfo };
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let oinfo1 = tmpreginfers[this.operand1_reg], oinfo2 = tmpreginfers[this.operand2_reg];
        if (this.op === "*" && ((oinfo1.type === ValueType.CONST && oinfo1.cons === 0) || (oinfo2.type === ValueType.CONST && oinfo2.cons === 0))) {
            return new TAC_loadint(0, this.result_reg);
            //TODO: MERGE WITH regInfoOutput
        }
        else if ((this.op !== "/" || oinfo2.cons !== 0) && oinfo1.type === ValueType.CONST && oinfo2.type === ValueType.CONST) {
            return new TAC_loadint(bi_op(this.op, oinfo1.cons, oinfo2.cons), this.result_reg).simplify(tmpreginfers);
        }
        else if (this.op === "*" && oinfo1.type === ValueType.CONST_TIMES_REG && oinfo2.type === ValueType.CONST) {
            return new TAC_binary_int("*", oinfo1.regnum, oinfo1.cons * oinfo2.cons, this.result_reg);
        }
        else if (this.op === "*" && oinfo2.type === ValueType.CONST_TIMES_REG && oinfo1.type === ValueType.CONST) {
            return new TAC_binary_int("*", oinfo2.regnum, oinfo1.cons * oinfo2.cons, this.result_reg);
        }
        else if ((this.op === "+" || this.op === "-") && oinfo1.type === ValueType.CONST_TIMES_REG && oinfo2.type === ValueType.CONST_TIMES_REG && oinfo1.regnum === oinfo2.regnum) {
            let opint = this.op === "+" ? (oinfo1.cons + oinfo2.cons) : (oinfo1.cons - oinfo2.cons);
            return new TAC_binary_int("*", oinfo1.regnum, opint, this.result_reg);
        }
        else if (this.op === "*" && oinfo1.type === ValueType.CONST) {
            if (oinfo1.cons === 1) return new TAC_mov(this.operand2_reg, this.result_reg);
            else return new TAC_binary_int("*", this.operand2_reg, oinfo1.cons, this.result_reg);
        }
        else if (this.op === "*" && oinfo2.type === ValueType.CONST) {
            if (oinfo2.cons === 1) return new TAC_mov(this.operand1_reg, this.result_reg);
            else return new TAC_binary_int("*", this.operand1_reg, oinfo2.cons, this.result_reg);
        }
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return tmpRegLiveness_assign(regbtmlive, [this.operand1_reg, this.operand2_reg], this.result_reg, true);
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.result_reg] ? this : new TAC_noop();
    }
    readReg(regnum: number): boolean {
        return this.operand1_reg === regnum || this.operand2_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (!this.readReg(regnum)) throw new Error("no read from reg: " + regnum);
        if (this.operand1_reg === regnum) this.operand1_reg = newregnum;
        if (this.operand2_reg === regnum) this.operand2_reg = newregnum;
        return this;
    }
    writeReg(regnum: number): boolean {
        return this.result_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.result_reg === regnum) this.result_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [binaryMIPS(this.op, r.toMIPSReg(this.result_reg, regmap), r.toMIPSReg(this.operand1_reg, regmap), r.toMIPSReg(this.operand2_reg, regmap))];
    }
}
export class TAC_binary_int extends TAC {
    constructor(public op: string, public operand_reg: number, public operand_int: number, public result_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.result_reg), "=", reg2str(this.operand_reg), this.op, this.operand_int].join(" ");
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        let retinfo: ValueInference, oinfo = tmpreginfers[this.operand_reg];

        if (oinfo.type === ValueType.NEVER)
            throw new Error("defensive code, unclear behavior");
        else if (this.op === "*" && ((oinfo.type === ValueType.CONST && oinfo.cons === 0) || this.operand_int === 0)) {
            retinfo = { type: ValueType.CONST, cons: 0 };
            //TODO: MORE
        }
        else if (this.op === "*" && oinfo.type === ValueType.CONST_TIMES_REG) {
            retinfo = { type: ValueType.CONST_TIMES_REG, cons: oinfo.cons * this.operand_int, regnum: oinfo.regnum };
            //TODO: MORE
        }
        else if (oinfo.type === ValueType.ANY)
            retinfo = ANY;
        else if ((this.op !== "/" || this.operand_int !== 0) && oinfo.type === ValueType.CONST) {
            retinfo = { type: ValueType.CONST, cons: bi_op(this.op, oinfo.cons, this.operand_int) };
        }
        else retinfo = ANY;

        return { regnum: this.result_reg, reginfo: retinfo };
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let oinfo = tmpreginfers[this.operand_reg];
        if (this.op === "*" && ((oinfo.type === ValueType.CONST && oinfo.cons === 0) || this.operand_int === 0)) {
            return new TAC_loadint(0, this.result_reg).simplify(tmpreginfers);
            //TODO: MERGE WITH regInfoOutput
        }
        else if (this.op === "*" && oinfo.type === ValueType.CONST_TIMES_REG) {
            let cons = oinfo.cons * this.operand_int;
            if (cons === 1) return new TAC_mov(oinfo.regnum, this.result_reg).simplify(tmpreginfers);
            else return new TAC_binary_int("*", oinfo.regnum, cons, this.result_reg);
            //TODO: MORE
        }
        else if ((this.op !== "/" || this.operand_int !== 0) && oinfo.type === ValueType.CONST) {
            return new TAC_loadint(bi_op(this.op, oinfo.cons, this.operand_int), this.result_reg).simplify(tmpreginfers);
        }
        else if (this.op === "*" && this.operand_int === 1)
            return new TAC_mov(this.operand_reg, this.result_reg);
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return tmpRegLiveness_assign(regbtmlive, [this.operand_reg], this.result_reg, true);
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.result_reg] ? this : new TAC_noop();
    }
    readReg(regnum: number): boolean {
        return this.operand_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.operand_reg !== regnum) throw new Error("no read from reg: " + regnum);
        else this.operand_reg = newregnum;
        return this;
    }
    writeReg(regnum: number): boolean {
        return this.result_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.result_reg === regnum) this.result_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [binaryMIPS(this.op, r.toMIPSReg(this.result_reg, regmap), r.toMIPSReg(this.operand_reg, regmap), this.operand_int)];
    }
}
export class TAC_unary extends TAC {
    constructor(public op: string, public operand_reg: number, public result_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.result_reg), "=", this.op, reg2str(this.operand_reg)].join(" ");
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        let retinfo: ValueInference, oinfo = tmpreginfers[this.operand_reg];

        if (oinfo.type === ValueType.NEVER)
            throw new Error("defensive code, unclear behavior");
        else if (oinfo.type === ValueType.ANY)
            retinfo = ANY;
        else if (oinfo.type === ValueType.CONST) {
            retinfo = { type: ValueType.CONST, cons: unary_op(this.op, oinfo.cons) };
        }
        else if (oinfo.type === ValueType.CONST_TIMES_REG && this.op === "-") {
            retinfo = { type: ValueType.CONST_TIMES_REG, cons: -oinfo.cons, regnum: oinfo.regnum };
        }
        else retinfo = ANY;

        return { regnum: this.result_reg, reginfo: retinfo };
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let oinfo = tmpreginfers[this.operand_reg];
        if (oinfo.type === ValueType.CONST) {
            return new TAC_loadint(unary_op(this.op, oinfo.cons), this.result_reg).simplify(tmpreginfers);
        }
        else if (oinfo.type === ValueType.CONST_TIMES_REG && this.op === "-") {
            return new TAC_binary_int("*", oinfo.regnum, -oinfo.cons, this.result_reg);
        }
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return tmpRegLiveness_assign(regbtmlive, [this.operand_reg], this.result_reg, true);
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.result_reg] ? this : new TAC_noop();
    }
    readReg(regnum: number): boolean {
        return this.operand_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.operand_reg !== regnum) throw new Error("no read from reg: " + regnum);
        else this.operand_reg = newregnum;
        return this;
    }
    writeReg(regnum: number): boolean {
        return this.result_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.result_reg === regnum) this.result_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [unaryMIPS(this.op, r.toMIPSReg(this.result_reg, regmap), r.toMIPSReg(this.operand_reg, regmap))];
    }
}
export class TAC_branch extends TAC {
    constructor(public label: util.CodeLabel) { super(); }
    toString(): string {
        return ["branch", this.label].join(" ");
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [new m.MIPS_b(this.label.toString())];
    }
}
//branch on true
export class TAC_btrue extends TAC_branch {
    constructor(label: util.CodeLabel, public reg: number) { super(label); }
    toString(): string {
        return ["branch_true", reg2str(this.reg), this.label].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let oinfo = tmpreginfers[this.reg];
        if (oinfo.type === ValueType.CONST) {
            if (oinfo.cons === 0) return new TAC_noop();
            else return new TAC_branch(this.label);
        }
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.reg, live: true }];
    }
    readReg(regnum: number): boolean {
        return this.reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.reg !== regnum) throw new Error("no read from reg: " + regnum);
        else this.reg = newregnum;
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [new m.MIPS_bne(r.toMIPSReg(this.reg, regmap), m.REGS.zero, this.label.toString())];
    }
}
//branch on false
export class TAC_bfalse extends TAC_branch {
    constructor(label: util.CodeLabel, public reg: number) { super(label); }
    toString(): string {
        return ["branch_false", reg2str(this.reg), this.label].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let oinfo = tmpreginfers[this.reg];
        if (oinfo.type === ValueType.CONST) {
            if (oinfo.cons !== 0) return new TAC_noop();
            else return new TAC_branch(this.label);
        }
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.reg, live: true }];
    }
    readReg(regnum: number): boolean {
        return this.reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.reg !== regnum) throw new Error("no read from reg: " + regnum);
        else this.reg = newregnum;
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [new m.MIPS_beq(r.toMIPSReg(this.reg, regmap), m.REGS.zero, this.label.toString())];
    }
}
export class TAC_lw extends TAC {
    constructor(public store_reg: number, public offset: number, public result_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.result_reg), "=", "word", this.offset + "(" + reg2str(this.store_reg) + ")"].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let oinfo = tmpreginfers[this.store_reg];
        if (oinfo.type === ValueType.CONST_TIMES_REG && oinfo.cons === 1) return new TAC_lw(oinfo.regnum, this.offset, this.result_reg);
        else return this;
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return { regnum: this.result_reg, reginfo: ANY };
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return tmpRegLiveness_assign(regbtmlive, [this.store_reg], this.result_reg, true);
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.result_reg] ? this : new TAC_noop();
    }
    readReg(regnum: number): boolean {
        return this.store_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.store_reg !== regnum) throw new Error("no read from reg: " + regnum);
        else this.store_reg = newregnum;
        return this;
    }
    writeReg(regnum: number): boolean {
        return this.result_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.result_reg === regnum) this.result_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [new m.MIPS_lw(r.toMIPSReg(this.result_reg, regmap), new m.MIPSAddr_reg(this.offset, r.toMIPSReg(this.store_reg, regmap)))];
    }
}
export class TAC_lb extends TAC {
    constructor(public store_reg: number, public offset: number, public result_reg: number) { super(); }
    toString(): string {
        return [reg2str(this.result_reg), "=", "byte", this.offset + "(" + reg2str(this.store_reg) + ")"].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let oinfo = tmpreginfers[this.store_reg];
        if (oinfo.type === ValueType.CONST_TIMES_REG && oinfo.cons === 1) return new TAC_lb(oinfo.regnum, this.offset, this.result_reg);
        else return this;
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return { regnum: this.result_reg, reginfo: ANY };
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return tmpRegLiveness_assign(regbtmlive, [this.store_reg], this.result_reg, true);
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.result_reg] ? this : new TAC_noop();
    }
    readReg(regnum: number): boolean {
        return this.store_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (this.store_reg !== regnum) throw new Error("no read from reg: " + regnum);
        else this.store_reg = newregnum;
        return this;
    }
    writeReg(regnum: number): boolean {
        return this.result_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.result_reg === regnum) this.result_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [new m.MIPS_lb(r.toMIPSReg(this.result_reg, regmap), new m.MIPSAddr_reg(this.offset, r.toMIPSReg(this.store_reg, regmap)))];
    }
}
export class TAC_sw extends TAC {
    constructor(public store_reg: number, public offset: number, public from_reg: number) { super(); }
    toString(): string {
        return ["word", this.offset + "(" + reg2str(this.store_reg) + ")", "=", reg2str(this.from_reg)].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let oinfo1 = tmpreginfers[this.store_reg], oinfo2 = tmpreginfers[this.from_reg];
        let sreg = this.store_reg, freg = this.from_reg;
        if (oinfo1.type === ValueType.CONST_TIMES_REG && oinfo1.cons === 1) sreg = oinfo1.regnum;
        if (oinfo2.type === ValueType.CONST_TIMES_REG && oinfo2.cons === 1) freg = oinfo2.regnum;
        if (sreg !== this.store_reg || freg !== this.from_reg) return new TAC_sw(sreg, this.offset, freg);
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.store_reg, live: true }, { regnum: this.from_reg, live: true }];
    }
    readReg(regnum: number): boolean {
        return this.store_reg === regnum || this.from_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (!this.readReg(regnum)) throw new Error("no read from reg: " + regnum);
        if (this.store_reg === regnum) this.store_reg = newregnum;
        if (this.from_reg === regnum) this.from_reg = newregnum;
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [new m.MIPS_sw(r.toMIPSReg(this.from_reg, regmap), new m.MIPSAddr_reg(this.offset, r.toMIPSReg(this.store_reg, regmap)))];
    }
}
export class TAC_sb extends TAC {
    constructor(public store_reg: number, public offset: number, public from_reg: number) { super(); }
    toString(): string {
        return ["byte", this.offset + "(" + reg2str(this.store_reg) + ")", "=", reg2str(this.from_reg)].join(" ");
    }
    simplify(tmpreginfers: Array<ValueInference>): TAC {
        let oinfo1 = tmpreginfers[this.store_reg], oinfo2 = tmpreginfers[this.from_reg];
        let sreg = this.store_reg, freg = this.from_reg;
        if (oinfo1.type === ValueType.CONST_TIMES_REG && oinfo1.cons === 1) sreg = oinfo1.regnum;
        if (oinfo2.type === ValueType.CONST_TIMES_REG && oinfo2.cons === 1) freg = oinfo2.regnum;
        if (sreg !== this.store_reg || freg !== this.from_reg) return new TAC_sb(sreg, this.offset, freg);
        else return this;
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.store_reg, live: true }, { regnum: this.from_reg, live: true }];
    }
    readReg(regnum: number): boolean {
        return this.store_reg === regnum || this.from_reg === regnum;
    }
    replReadReg(regnum: number, newregnum: number): this {
        if (!this.readReg(regnum)) throw new Error("no read from reg: " + regnum);
        if (this.store_reg === regnum) this.store_reg = newregnum;
        if (this.from_reg === regnum) this.from_reg = newregnum;
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [new m.MIPS_sb(r.toMIPSReg(this.from_reg, regmap), new m.MIPSAddr_reg(this.offset, r.toMIPSReg(this.store_reg, regmap)))];
    }
}
export class TAC_la extends TAC {
    constructor(public to_reg: number, public label: string) { super(); }
    toString(): string {
        return [reg2str(this.to_reg), "=", this.label].join(" ");
    }
    inferValue(tmpreginfers: Array<ValueInference>): { regnum: number, reginfo: ValueInference } {
        return { regnum: this.to_reg, reginfo: ANY };
    }
    liveness(regbtmlive: Array<boolean>): Array<{ regnum: number, live: boolean }> {
        return [{ regnum: this.to_reg, live: false }];
    }
    livenessProne(regbtmlive: Array<boolean>): TAC {
        return regbtmlive[this.to_reg] ? this : new TAC_noop();
    }
    writeReg(regnum: number): boolean {
        return this.to_reg === regnum;
    }
    replWriteReg(regnum: number, newregnum: number): this {
        if (this.to_reg === regnum) this.to_reg = newregnum;
        else throw new Error("no write into reg: " + regnum);
        return this;
    }
    toMIPS(regmap: Map<number, number>, retlabel: string, last: boolean): Array<m.MIPSInstruction> {
        return [
            new m.MIPS_la(r.toMIPSReg(this.to_reg, regmap), this.label)
        ];
    }
}

function bi_op(op: string, num1: number, num2: number): number {
    switch (op) {
        case "||": return num1 === 0 && num2 === 0 ? 0 : 1;
        case "&&": return num1 === 0 || num2 === 0 ? 0 : 1;
        case "==": return num1 === num2 ? 1 : 0;
        case "!=": return num1 !== num2 ? 1 : 0;
        case ">=": return num1 >= num2 ? 1 : 0;
        case "<=": return num1 <= num2 ? 1 : 0;
        case ">": return num1 > num2 ? 1 : 0;
        case "<": return num1 < num2 ? 1 : 0;
        case "&": return num1 & num2;
        case "|": return num1 | num2;
        case "^": return num1 ^ num2;
        case "+": return num1 + num2;
        case "-": return num1 - num2;
        case "*": return num1 * num2;
        case "/": return Math.floor(num1 / num2);
        case ">>": return num1 >> num2;
        case ">>>": return num1 >>> num2;
        case "<<": return num1 << num2;
        default: throw new Error("unknown op: " + op);
    }
}
function unary_op(op: string, num: number): number {
    switch (op) {
        case "~": return ~num;
        case "!": return num === 0 ? 1 : 0;
        case "-": return -num;
        default: throw new Error("unknown op: " + op);
    }
}
//deadignore: true for a=b+c
//            false for a=fib(1,2)
function tmpRegLiveness_assign(regbtmlive: Array<boolean>, rhs_reg: Array<number>, lhs_reg: number, deadignore: boolean): Array<{ regnum: number, live: boolean }> {
    if (!regbtmlive[lhs_reg] && deadignore) return [];
    let r = rhs_reg.map(r => { return { regnum: r, live: true } });
    if (rhs_reg.some(r => r == lhs_reg)) return r;
    else return [{ regnum: lhs_reg, live: false }].concat(r);
}
function binaryMIPS(op: string, desreg: m.MIPSRegister, srcreg1: m.MIPSRegister, srcreg2: m.MIPSRegister | number): m.MIPSInstruction {
    switch (op) {
        case "|":
        case "||": return new m.MIPS_or(desreg, srcreg1, srcreg2);
        case "&":
        case "&&": return new m.MIPS_and(desreg, srcreg1, srcreg2);
        case "==": return new m.MIPS_seq(desreg, srcreg1, srcreg2);
        case "!=": return new m.MIPS_sne(desreg, srcreg1, srcreg2);
        case ">=": return new m.MIPS_sge(desreg, srcreg1, srcreg2);
        case "<=": return new m.MIPS_sle(desreg, srcreg1, srcreg2);
        case ">": return new m.MIPS_sgt(desreg, srcreg1, srcreg2);
        case "<": return new m.MIPS_slt(desreg, srcreg1, srcreg2);
        case "^": return new m.MIPS_xor(desreg, srcreg1, srcreg2);
        case "+": return new m.MIPS_add(desreg, srcreg1, srcreg2);
        case "-": return new m.MIPS_sub(desreg, srcreg1, srcreg2);
        case "/": return new m.MIPS_div(desreg, srcreg1, srcreg2);
        case "*": return new m.MIPS_mulo(desreg, srcreg1, srcreg2);
        case ">>": return new m.MIPS_sra(desreg, srcreg1, srcreg2);
        case ">>>": return new m.MIPS_srl(desreg, srcreg1, srcreg2);
        case "<<": return new m.MIPS_sll(desreg, srcreg1, srcreg2);
        default: throw new Error("unknown op: " + op);
    }
}
function unaryMIPS(op: string, desreg: m.MIPSRegister, srcreg: m.MIPSRegister): m.MIPSInstruction {
    switch (op) {
        case "~": return new m.MIPS_not(desreg, srcreg);
        case "!": return new m.MIPS_seq(desreg, srcreg, m.REGS.zero);
        case "-": return new m.MIPS_mulo(desreg, srcreg, -1);
        default: throw new Error("unknown op: " + op);
    }
}
