
import * as i from './intermediatecode';
import * as util from './util';
import * as utility from '../../utility';
import * as r from './regallocate';

function setupVtable(asm: MIPSAssembly, classlookup: util.ClassLookup): boolean {
    //pre-defined function, vtable initializer
    let setup = false;
    for (let cname of classlookup.getAllClasses()) {
        let cdef = classlookup.getClass(cname);
        let vtable = cdef.vmethodTable;
        if (vtable.length > 0) {
            let vtablelabel = cdef.getMIPSVTableLabel();
            asm.addGData(new MIPSGData_word(vtable.length).setComments(`virtual method table of class ${cname}`), vtablelabel);
            asm.addGData(new MIPSGData_emptyline());
            if (!setup) {
                //first instruction
                asm.addCode(new MIPS_la(REGS.v1, vtablelabel), MIPS_VTABLE_INIT_LABEL);
                setup = true;
            }
            else
                asm.addCode(new MIPS_la(REGS.v1, vtablelabel));
            for (let i = 0; i < vtable.length; ++i) {
                asm.addCode(new MIPS_la(REGS.v0, vtable[i].getMIPSLabel()));
                asm.addCode(new MIPS_sw(REGS.v0, new MIPSAddr_reg(4 * i, REGS.v1)));
            }
        }
    }
    if (setup) {
        asm.addCode(new MIPS_jr(REGS.ra));
        asm.addCode(new MIPS_emptyline());
    }
    return setup;
}

function predefinedCode(asm: MIPSAssembly, classlookup: util.ClassLookup, mainfnlabel: string) {
    //new line global data (asciiz)
    asm.addGData(new MIPSGData_asciiz('"\\n"'), MIPS_GDATA_NEWLINE);
    asm.addGData(new MIPSGData_emptyline());
    asm.addGData(new MIPSGData_asciiz('"true"'), MIPS_GDATA_TRUE);
    asm.addGData(new MIPSGData_emptyline());
    asm.addGData(new MIPSGData_asciiz('"false"'), MIPS_GDATA_FALSE);
    asm.addGData(new MIPSGData_emptyline());
    //pre-defined function, print integer
    asm.addCode(new MIPS_lw(REGS.a0, new MIPSAddr_reg(4, REGS.sp)).setComments('pre-defined function of print_int'), util.predefinedFn.print_int.mipslabel);
    asm.addCode(new MIPS_li(REGS.v0, 1));
    asm.addCode(new MIPS_syscall());
    asm.addCode(new MIPS_jr(REGS.ra));
    asm.addCode(new MIPS_emptyline());
    //pre-defined function, print boolean
    asm.addCode(new MIPS_lw(REGS.a0, new MIPSAddr_reg(4, REGS.sp)).setComments('pre-defined function of print_bool'), util.predefinedFn.print_bool.mipslabel);
    asm.addCode(new MIPS_beqz(REGS.a0, MIPS_CODE_PRINTFALSE));
    asm.addCode(new MIPS_la(REGS.a0, MIPS_GDATA_TRUE));
    asm.addCode(new MIPS_b(MIPS_CODE_ENDPRINTBOOL));
    asm.addCode(new MIPS_la(REGS.a0, MIPS_GDATA_FALSE), MIPS_CODE_PRINTFALSE);
    asm.addCode(new MIPS_li(REGS.v0, 4), MIPS_CODE_ENDPRINTBOOL);
    asm.addCode(new MIPS_syscall());
    asm.addCode(new MIPS_jr(REGS.ra));
    asm.addCode(new MIPS_emptyline());
    //pre-defined function, print new-line
    asm.addCode(new MIPS_la(REGS.a0, MIPS_GDATA_NEWLINE).setComments('pre-defined function of print_newline'), util.predefinedFn.print_newline.mipslabel);
    asm.addCode(new MIPS_li(REGS.v0, 4));
    asm.addCode(new MIPS_syscall());
    asm.addCode(new MIPS_jr(REGS.ra));
    asm.addCode(new MIPS_emptyline());
    //pre-defined main function
    if (setupVtable(asm, classlookup)) {
        asm.addCode(new MIPS_jal(MIPS_VTABLE_INIT_LABEL), 'main');
        asm.addCode(new MIPS_jal(mainfnlabel));
    }
    else
        asm.addCode(new MIPS_jal(mainfnlabel), 'main');
    asm.addCode(new MIPS_li(REGS.v0, 10));
    asm.addCode(new MIPS_syscall().setComments('EXIT PROGRAM'));
    asm.addCode(new MIPS_emptyline());
}

export function generateMIPSCode(code: i.IntermediateCode, classlookup: util.ClassLookup, mainfnlabel: string): MIPSAssembly {
    let asm = new MIPSAssembly();
    predefinedCode(asm, classlookup, mainfnlabel);
    code.toMIPS(asm);
    return asm;
}

export class MIPSAssembly {
    private _textarea: Array<MIPSCodeLine>;
    private _gdata: Array<MIPSGDataLine>;

    toString(): string {
        let dataarr = this._gdata.length === 0 ? [] : ['.data'].concat(this._gdata.map(g => g.toString()));
        return dataarr.concat('.text').concat(this._textarea.map(t => t.toString())).join('\r\n');
    }
    addCode(instruction: MIPSInstruction, label?: string): this {
        this._textarea.push(new MIPSCodeLine(instruction, label));
        return this;
    }
    addGData(gdata: MIPSGData, label?: string): this {
        this._gdata.push(new MIPSGDataLine(gdata, label));
        return this;
    }
    constructor() {
        this._textarea = new Array<MIPSCodeLine>();
        this._gdata = new Array<MIPSGDataLine>();
    }
}

class MIPSGDataLine {
    private _label: string;
    private _gdata: MIPSGData;
    toString(): string {
        let labelstr = (this._label == null) ? '' : (this._label + ':\r\n');
        return labelstr + this._gdata.toString();
    }
    constructor(gdata: MIPSGData, label?: string) {
        this._label = label;
        this._gdata = gdata;
    }
}

abstract class MIPSGData {
    protected _comments: string;
    setComments(c: string): this {
        this._comments = c;
        return this;
    }
}
//just a newline, for readability
export class MIPSGData_emptyline extends MIPSGData {
    toString(): string {
        return '';
    }
}
export class MIPSGData_word extends MIPSGData {
    private _nums: Array<number>;
    toString(): string {
        return '.word ' + this._nums.join(' ');
    }
    constructor(nums: Array<number> | number) {
        super();
        if (typeof nums === 'number') {
            let arr = new Array<number>(nums);
            for (let i = 0; i < nums; ++i) arr[i] = 0;
            this._nums = arr;
        }
        else this._nums = nums;
    }
}
export class MIPSGData_asciiz extends MIPSGData {
    private _str: string;
    toString(): string {
        return '.asciiz ' + this._str;
    }
    constructor(str: string) {
        super();
        this._str = str;
    }
}

class MIPSCodeLine {
    private _label: string;
    private _ins: MIPSInstruction;
    toString(): string {
        let labelstr = (this._label == null) ? '' : (this._label + ':\r\n');
        return labelstr + this._ins.toString();
    }
    constructor(instruction: MIPSInstruction, label?: string) {
        this._label = label;
        this._ins = instruction;
    }
}

export abstract class MIPSInstruction {
    protected _opname: string;
    protected _comments: string;
    toString(): string {
        let ins = this.toStringWithoutComments();
        return this._comments == null ? ins : ('###' + this._comments + '###\r\n' + ins);
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
//just a newline, for readability
export class MIPS_emptyline extends MIPSInstruction {
    toStringWithoutComments(): string {
        return '';
    }
    constructor() { super(''); }
}
abstract class MIPSInstruction_1Src extends MIPSInstruction {
    private _desreg: MIPSRegister;
    private _srcreg: MIPSRegister;
    toStringWithoutComments(): string {
        return this._opname + ' ' + this._desreg + ', ' + this._srcreg;
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
        return this._opname + ' ' + this._desreg + ', ' + this._src1reg + ', ' + this._src2reg;
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
        super('abs', desreg, srcreg);
    }
}
export class MIPS_neg extends MIPSInstruction_1Src {
    constructor(desreg: MIPSRegister, srcreg: MIPSRegister) {
        super('neg', desreg, srcreg);
    }
}
export class MIPS_negu extends MIPSInstruction_1Src {
    constructor(desreg: MIPSRegister, srcreg: MIPSRegister) {
        super('negu', desreg, srcreg);
    }
}
export class MIPS_not extends MIPSInstruction_1Src {
    constructor(desreg: MIPSRegister, srcreg: MIPSRegister) {
        super('not', desreg, srcreg);
    }
}
export class MIPS_add extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('add', desreg, src1reg, src2reg);
    }
}
export class MIPS_addu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('addu', desreg, src1reg, src2reg);
    }
}
export class MIPS_and extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('and', desreg, src1reg, src2reg);
    }
}
export class MIPS_nor extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('nor', desreg, src1reg, src2reg);
    }
}
export class MIPS_or extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('or', desreg, src1reg, src2reg);
    }
}
export class MIPS_div extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('div', desreg, src1reg, src2reg);
    }
}
export class MIPS_divu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('divu', desreg, src1reg, src2reg);
    }
}
export class MIPS_mul extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('mul', desreg, src1reg, src2reg);
    }
}
export class MIPS_mulo extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('mulo', desreg, src1reg, src2reg);
    }
}
export class MIPS_rem extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('rem', desreg, src1reg, src2reg);
    }
}
export class MIPS_remu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('remu', desreg, src1reg, src2reg);
    }
}
export class MIPS_rol extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('rol', desreg, src1reg, src2reg);
    }
}
export class MIPS_ror extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('ror', desreg, src1reg, src2reg);
    }
}
export class MIPS_sll extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sll', desreg, src1reg, src2reg);
    }
}
export class MIPS_sra extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sra', desreg, src1reg, src2reg);
    }
}
export class MIPS_srl extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('srl', desreg, src1reg, src2reg);
    }
}
export class MIPS_sub extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sub', desreg, src1reg, src2reg);
    }
}
export class MIPS_subu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('subu', desreg, src1reg, src2reg);
    }
}
export class MIPS_xor extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('xor', desreg, src1reg, src2reg);
    }
}
export class MIPS_seq extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('seq', desreg, src1reg, src2reg);
    }
}
export class MIPS_sne extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sne', desreg, src1reg, src2reg);
    }
}
export class MIPS_sge extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sge', desreg, src1reg, src2reg);
    }
}
export class MIPS_sgeu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sgeu', desreg, src1reg, src2reg);
    }
}
export class MIPS_sgt extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sgt', desreg, src1reg, src2reg);
    }
}
export class MIPS_sgtu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sgtu', desreg, src1reg, src2reg);
    }
}
export class MIPS_sle extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sle', desreg, src1reg, src2reg);
    }
}
export class MIPS_sleu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sleu', desreg, src1reg, src2reg);
    }
}
export class MIPS_slt extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('slt', desreg, src1reg, src2reg);
    }
}
export class MIPS_sltu extends MIPSInstruction_2Src {
    constructor(desreg: MIPSRegister, src1reg: MIPSRegister, src2reg: MIPSRegister | number) {
        super('sltu', desreg, src1reg, src2reg);
    }
}
abstract class MIPSInstruction_b extends MIPSInstruction {
    private _label: string;
    toStringWithoutComments(): string {
        return this._opname + ' ' + this._label;
    }
    constructor(opname: string, label: string) {
        super(opname);
        this._label = label;
    }
}
export class MIPS_b extends MIPSInstruction_b {
    constructor(label: string) {
        super('b', label);
    }
}
export class MIPS_j extends MIPSInstruction_b {
    constructor(label: string) {
        super('j', label);
    }
}
abstract class MIPSInstruction_1Src0Des extends MIPSInstruction {
    private _srcreg: MIPSRegister;
    toStringWithoutComments(): string {
        return this._opname + ' ' + this._srcreg;
    }
    constructor(opname: string, srcreg: MIPSRegister) {
        super(opname);
        this._srcreg = srcreg;
    }
}
export class MIPS_jr extends MIPSInstruction_1Src0Des {
    constructor(srcreg: MIPSRegister) {
        super('jr', srcreg);
    }
}
export class MIPS_jal extends MIPSInstruction_b {
    constructor(label: string) {
        super('jal', label);
    }
}
export class MIPS_jalr extends MIPSInstruction_1Src0Des {
    constructor(srcreg: MIPSRegister) {
        super('jalr', srcreg);
    }
}
abstract class MIPSInstruction_2Src_b extends MIPSInstruction {
    private _label: string;
    private _src1reg: MIPSRegister;
    private _src2reg: MIPSRegister | number;
    toStringWithoutComments(): string {
        return this._opname + ' ' + this._src1reg + ', ' + this._src2reg + ', ' + this._label;
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
        super('beq', src1reg, src2reg, label);
    }
}
export class MIPS_bne extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super('bne', src1reg, src2reg, label);
    }
}
export class MIPS_bge extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super('bge', src1reg, src2reg, label);
    }
}
export class MIPS_bgeu extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super('bgeu', src1reg, src2reg, label);
    }
}
export class MIPS_bgt extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super('bgt', src1reg, src2reg, label);
    }
}
export class MIPS_bgtu extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super('bgtu', src1reg, src2reg, label);
    }
}
export class MIPS_ble extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super('ble', src1reg, src2reg, label);
    }
}
export class MIPS_bleu extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super('bleu', src1reg, src2reg, label);
    }
}
export class MIPS_blt extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super('blt', src1reg, src2reg, label);
    }
}
export class MIPS_bltu extends MIPSInstruction_2Src_b {
    constructor(src1reg: MIPSRegister, src2reg: MIPSRegister | number, label: string) {
        super('bltu', src1reg, src2reg, label);
    }
}
abstract class MIPSInstruction_1Src_b extends MIPSInstruction {
    private _label: string;
    private _srcreg: MIPSRegister;
    toStringWithoutComments(): string {
        return this._opname + ' ' + this._srcreg + ', ' + this._label;
    }
    constructor(opname: string, srcreg: MIPSRegister, label: string) {
        super(opname);
        this._label = label;
        this._srcreg = srcreg;
    }
}
export class MIPS_beqz extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super('beqz', srcreg, label);
    }
}
export class MIPS_bnez extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super('bnez', srcreg, label);
    }
}
export class MIPS_bgez extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super('bgez', srcreg, label);
    }
}
export class MIPS_bgtz extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super('bgtz', srcreg, label);
    }
}
export class MIPS_blez extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super('blez', srcreg, label);
    }
}
export class MIPS_bltz extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super('bltz', srcreg, label);
    }
}
export class MIPS_bgezal extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super('bgezal', srcreg, label);
    }
}
export class MIPS_bgtzal extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super('bgtzal', srcreg, label);
    }
}
export class MIPS_bltzal extends MIPSInstruction_1Src_b {
    constructor(srcreg: MIPSRegister, label: string) {
        super('bltzal', srcreg, label);
    }
}
abstract class MIPSAddress { }
export class MIPSAddr_reg extends MIPSAddress {
    private _offset: number;
    private _reg: MIPSRegister;
    toString(): string {
        return this._offset + '(' + this._reg + ')';
    }
    constructor(offset: number, reg: MIPSRegister) {
        super();
        this._offset = offset;
        this._reg = reg;
    }
}
abstract class MIPSInstruction_ls extends MIPSInstruction {
    private _addr: MIPSAddress;
    private _reg: MIPSRegister;
    toStringWithoutComments(): string {
        return this._opname + ' ' + this._reg + ', ' + this._addr;
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
        return 'la ' + this._desreg + ', ' + this._label;
    }
    constructor(desreg: MIPSRegister, label: string) {
        super('la');
        this._desreg = desreg;
        this._label = label;
    }
}
export class MIPS_lb extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super('lb', desreg, addr);
    }
}
export class MIPS_lbu extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super('lbu', desreg, addr);
    }
}
export class MIPS_lh extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super('lh', desreg, addr);
    }
}
export class MIPS_lhu extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super('lhu', desreg, addr);
    }
}
export class MIPS_lw extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super('lw', desreg, addr);
    }
}
export class MIPS_lwl extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super('lwl', desreg, addr);
    }
}
export class MIPS_lwr extends MIPSInstruction_ls {
    constructor(desreg: MIPSRegister, addr: MIPSAddress) {
        super('lwr', desreg, addr);
    }
}
export class MIPS_li extends MIPSInstruction {
    private _desreg: MIPSRegister;
    private _cons: number;
    toStringWithoutComments(): string {
        return 'li ' + this._desreg + ', ' + this._cons;
    }
    constructor(desreg: MIPSRegister, cons: number) {
        super('li');
        this._desreg = desreg;
        this._cons = cons;
    }
}
export class MIPS_sb extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super('sb', srcreg, addr);
    }
}
export class MIPS_sh extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super('sh', srcreg, addr);
    }
}
export class MIPS_sw extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super('sw', srcreg, addr);
    }
}
export class MIPS_swl extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super('swl', srcreg, addr);
    }
}
export class MIPS_swr extends MIPSInstruction_ls {
    constructor(srcreg: MIPSRegister, addr: MIPSAddress) {
        super('swr', srcreg, addr);
    }
}
export class MIPS_move extends MIPSInstruction_1Src {
    constructor(desreg: MIPSRegister, srcreg: MIPSRegister) {
        super('move', desreg, srcreg);
    }
}
export class MIPS_nop extends MIPSInstruction {
    constructor() {
        super('nop');
    }
}
export class MIPS_syscall extends MIPSInstruction {
    constructor() {
        super('syscall');
    }
}



export class MIPSRegister {
    private _num: number;
    private _name: string;
    toString(): string {
        return '$' + this._name;
    }
    constructor(num: number, name: string) {
        this._name = name;
        this._num = num;
    }
}
function genMIPSReg(num: number, name: string): MIPSRegister {
    return new MIPSRegister(num, name);
}
const REGS = {
    zero: genMIPSReg(0, 'zero'),
    at: genMIPSReg(1, 'at'),
    v0: genMIPSReg(2, 'v0'),
    v1: genMIPSReg(3, 'v1'),
    a0: genMIPSReg(4, 'a0'),
    a1: genMIPSReg(5, 'a1'),
    a2: genMIPSReg(6, 'a2'),
    a3: genMIPSReg(7, 'a3'),
    t0: genMIPSReg(8, 't0'),
    t1: genMIPSReg(9, 't1'),
    t2: genMIPSReg(10, 't2'),
    t3: genMIPSReg(11, 't3'),
    t4: genMIPSReg(12, 't4'),
    t5: genMIPSReg(13, 't5'),
    t6: genMIPSReg(14, 't6'),
    t7: genMIPSReg(15, 't7'),
    s0: genMIPSReg(16, 's0'),
    s1: genMIPSReg(17, 's1'),
    s2: genMIPSReg(18, 's2'),
    s3: genMIPSReg(19, 's3'),
    s4: genMIPSReg(20, 's4'),
    s5: genMIPSReg(21, 's5'),
    s6: genMIPSReg(22, 's6'),
    s7: genMIPSReg(23, 's7'),
    t8: genMIPSReg(24, 't8'),
    t9: genMIPSReg(25, 't9'),
    k0: genMIPSReg(26, 'k0'),
    k1: genMIPSReg(27, 'k1'),
    gp: genMIPSReg(28, 'gp'),
    sp: genMIPSReg(29, 'sp'),
    fp: genMIPSReg(30, 'fp'),
    ra: genMIPSReg(31, 'ra'),
};
const MIPS_VTABLE_INIT_LABEL = '__vtable_init__';
const MIPS_GDATA_NEWLINE = '__newline__';
const MIPS_GDATA_TRUE = '__true__';
const MIPS_GDATA_FALSE = '__false__';
const MIPS_CODE_PRINTFALSE = '__print_false__';
const MIPS_CODE_ENDPRINTBOOL = '__end_print_bool__';

export {REGS};
