
import { MIPSRegister } from "./mipsreg";
import { MIPSAddress } from "./mipsaddr";

export abstract class MIPSInstruction {
    protected _opname: string;
    protected _comments: string;

    toString(): string {
        let ins = this.toStringWithoutComments();
        return this._comments == null ? ins : ("###" + this._comments + "###\r\n" + ins);
    }

    toStringWithoutComments(): string {
        return this._opname;
    }

    setComments(c: string): this {
        this._comments = c;
        return this;
    }

    constructor(opname: string) { this._opname = opname; }
}

// just a newline, for readability
export class MIPS_emptyline extends MIPSInstruction {
    toStringWithoutComments(): string {
        return "";
    }

    constructor() { super(""); }
}

abstract class MIPSInstruction_1Src extends MIPSInstruction {
    private _desreg: MIPSRegister;
    private _srcreg: MIPSRegister;

    toStringWithoutComments(): string {
        return this._opname + " " + this._desreg + ", " + this._srcreg;
    }

    constructor(opname: string, desreg: MIPSRegister, srcreg: MIPSRegister) {
        super(opname);
        this._desreg = desreg;
        this._srcreg = srcreg;
    }
}

abstract class MIPSInstruction_2Src extends MIPSInstruction {
    private _desreg: MIPSRegister;
    private _src1reg: MIPSRegister;
    private _src2reg: MIPSRegister | number;

    toStringWithoutComments(): string {
        return this._opname + " " + this._desreg + ", " + this._src1reg + ", " + this._src2reg;
    }

    constructor(opname: string, desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super(opname);
        this._desreg = desreg;
        this._src1reg = src1reg;
        this._src2reg = src2reg;
    }
}

export class MIPS_abs extends MIPSInstruction_1Src {
    constructor(desreg: MIPSRegister, srcreg: MIPSRegister) {
        super("abs", desreg, srcreg);
    }
}

export class MIPS_neg extends MIPSInstruction_1Src {
    constructor(desreg: MIPSRegister, srcreg: MIPSRegister) {
        super("neg", desreg, srcreg);
    }
}

export class MIPS_negu extends MIPSInstruction_1Src {
    constructor(desreg: MIPSRegister, srcreg: MIPSRegister) {
        super("negu", desreg, srcreg);
    }
}

export class MIPS_not extends MIPSInstruction_1Src {
    constructor(desreg: MIPSRegister, srcreg: MIPSRegister) {
        super("not", desreg, srcreg);
    }
}

export class MIPS_add extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("add", desreg, src1reg, src2reg);
    }
}

export class MIPS_addu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("addu", desreg, src1reg, src2reg);
    }
}

export class MIPS_and extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("and", desreg, src1reg, src2reg);
    }
}

export class MIPS_nor extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("nor", desreg, src1reg, src2reg);
    }
}

export class MIPS_or extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("or", desreg, src1reg, src2reg);
    }
}

export class MIPS_div extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("div", desreg, src1reg, src2reg);
    }
}

export class MIPS_divu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("divu", desreg, src1reg, src2reg);
    }
}

export class MIPS_mul extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("mul", desreg, src1reg, src2reg);
    }
}

export class MIPS_mulo extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("mulo", desreg, src1reg, src2reg);
    }
}

export class MIPS_rem extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("rem", desreg, src1reg, src2reg);
    }
}

export class MIPS_remu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("remu", desreg, src1reg, src2reg);
    }
}

export class MIPS_rol extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("rol", desreg, src1reg, src2reg);
    }
}

export class MIPS_ror extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("ror", desreg, src1reg, src2reg);
    }
}

export class MIPS_sll extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sll", desreg, src1reg, src2reg);
    }
}

export class MIPS_sra extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sra", desreg, src1reg, src2reg);
    }
}

export class MIPS_srl extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("srl", desreg, src1reg, src2reg);
    }
}

export class MIPS_sub extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sub", desreg, src1reg, src2reg);
    }
}

export class MIPS_subu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("subu", desreg, src1reg, src2reg);
    }
}

export class MIPS_xor extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("xor", desreg, src1reg, src2reg);
    }
}

export class MIPS_seq extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("seq", desreg, src1reg, src2reg);
    }
}

export class MIPS_sne extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sne", desreg, src1reg, src2reg);
    }
}

export class MIPS_sge extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sge", desreg, src1reg, src2reg);
    }
}

export class MIPS_sgeu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sgeu", desreg, src1reg, src2reg);
    }
}

export class MIPS_sgt extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sgt", desreg, src1reg, src2reg);
    }
}

export class MIPS_sgtu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sgtu", desreg, src1reg, src2reg);
    }
}

export class MIPS_sle extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sle", desreg, src1reg, src2reg);
    }
}

export class MIPS_sleu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sleu", desreg, src1reg, src2reg);
    }
}

export class MIPS_slt extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("slt", desreg, src1reg, src2reg);
    }
}

export class MIPS_sltu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super("sltu", desreg, src1reg, src2reg);
    }
}

abstract class MIPSInstruction_b extends MIPSInstruction {
    private _label: string;

    toStringWithoutComments(): string {
        return this._opname + " " + this._label;
    }

    constructor(opname: string, label: string) {
        super(opname);
        this._label = label;
    }
}

export class MIPS_b extends MIPSInstruction_b {
    constructor(label: string) {
        super("b", label);
    }
}

export class MIPS_j extends MIPSInstruction_b {
    constructor(label: string) {
        super("j", label);
    }
}

abstract class MIPSInstruction_1Src0Des extends MIPSInstruction {
    private _srcreg: MIPSRegister;

    toStringWithoutComments(): string {
        return this._opname + " " + this._srcreg;
    }

    constructor(opname: string, srcreg: MIPSRegister) {
        super(opname);
        this._srcreg = srcreg;
    }
}

export class MIPS_jr extends MIPSInstruction_1Src0Des {
    constructor(srcreg: MIPSRegister) {
        super("jr", srcreg);
    }
}

export class MIPS_jal extends MIPSInstruction_b {
    constructor(label: string) {
        super("jal", label);
    }
}

export class MIPS_jalr extends MIPSInstruction_1Src0Des {
    constructor(srcreg: MIPSRegister) {
        super("jalr", srcreg);
    }
}

abstract class MIPSInstruction_2Src_b extends MIPSInstruction {
    private _label: string;
    private _src1reg: MIPSRegister;
    private _src2reg: MIPSRegister | number;

    toStringWithoutComments(): string {
        return this._opname + " " + this._src1reg + ", " + this._src2reg + ", " + this._label;
    }

    constructor(opname: string, src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super(opname);
        this._label = label;
        this._src1reg = src1reg;
        this._src2reg = src2reg;
    }
}

export class MIPS_beq extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("beq", src1reg, src2reg, label);
    }
}

export class MIPS_bne extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("bne", src1reg, src2reg, label);
    }
}

export class MIPS_bge extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("bge", src1reg, src2reg, label);
    }
}

export class MIPS_bgeu extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("bgeu", src1reg, src2reg, label);
    }
}

export class MIPS_bgt extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("bgt", src1reg, src2reg, label);
    }
}

export class MIPS_bgtu extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("bgtu", src1reg, src2reg, label);
    }
}

export class MIPS_ble extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("ble", src1reg, src2reg, label);
    }
}

export class MIPS_bleu extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("bleu", src1reg, src2reg, label);
    }
}

export class MIPS_blt extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("blt", src1reg, src2reg, label);
    }
}

export class MIPS_bltu extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super("bltu", src1reg, src2reg, label);
    }
}

abstract class MIPSInstruction_1Src_b extends MIPSInstruction {
    private _label: string;
    private _srcreg: MIPSRegister;

    toStringWithoutComments(): string {
        return this._opname + " " + this._srcreg + ", " + this._label;
    }

    constructor(opname: string, srcreg: MIPSRegister, label: string) {
        super(opname);
        this._label = label;
        this._srcreg = srcreg;
    }
}

export class MIPS_beqz extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super("beqz", srcreg, label);
    }
}

export class MIPS_bnez extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super("bnez", srcreg, label);
    }
}

export class MIPS_bgez extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super("bgez", srcreg, label);
    }
}

export class MIPS_bgtz extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super("bgtz", srcreg, label);
    }
}

export class MIPS_blez extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super("blez", srcreg, label);
    }
}

export class MIPS_bltz extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super("bltz", srcreg, label);
    }
}

export class MIPS_bgezal extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super("bgezal", srcreg, label);
    }
}

export class MIPS_bgtzal extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super("bgtzal", srcreg, label);
    }
}

export class MIPS_bltzal extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super("bltzal", srcreg, label);
    }
}

abstract class MIPSInstruction_ls extends MIPSInstruction {
    private _addr: MIPSAddress;
    private _reg: MIPSRegister;

    toStringWithoutComments(): string {
        return this._opname + " " + this._reg + ", " + this._addr;
    }

    constructor(opname: string, reg: MIPSRegister, addr: MIPSAddress) {
        super(opname);
        this._reg = reg;
        this._addr = addr;
    }
}

export class MIPS_la extends MIPSInstruction {
    private _desreg: MIPSRegister;
    private _label: string;

    toStringWithoutComments(): string {
        return "la " + this._desreg + ", " + this._label;
    }

    constructor(desreg: MIPSRegister, label: string) {
        super("la");
        this._desreg = desreg;
        this._label = label;
    }
}

export class MIPS_lb extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super("lb", desreg, addr);
    }
}

export class MIPS_lbu extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super("lbu", desreg, addr);
    }
}

export class MIPS_lh extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super("lh", desreg, addr);
    }
}

export class MIPS_lhu extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super("lhu", desreg, addr);
    }
}

export class MIPS_lw extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super("lw", desreg, addr);
    }
}

export class MIPS_lwl extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super("lwl", desreg, addr);
    }
}

export class MIPS_lwr extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super("lwr", desreg, addr);
    }
}

export class MIPS_li extends MIPSInstruction {
    private _desreg: MIPSRegister;
    private _cons: number;

    toStringWithoutComments(): string {
        return "li " + this._desreg + ", " + this._cons;
    }

    constructor(desreg: MIPSRegister, cons: number) {
        super("li");
        this._desreg = desreg;
        this._cons = cons;
    }
}

export class MIPS_sb extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super("sb", srcreg, addr);
    }
}

export class MIPS_sh extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super("sh", srcreg, addr);
    }
}

export class MIPS_sw extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super("sw", srcreg, addr);
    }
}

export class MIPS_swl extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super("swl", srcreg, addr);
    }
}

export class MIPS_swr extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super("swr", srcreg, addr);
    }
}

export class MIPS_move extends MIPSInstruction_1Src {
    constructor(desreg: MIPSRegister, srcreg: MIPSRegister) {
        super("move", desreg, srcreg);
    }
}

export class MIPS_nop extends MIPSInstruction {
    constructor() {
        super("nop");
    }
}

export class MIPS_syscall extends MIPSInstruction {
    constructor() {
        super("syscall");
    }
}
