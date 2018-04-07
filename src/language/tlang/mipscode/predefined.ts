
import { MIPSAssembly } from "./mips";
import { ClassLookup, predefinedFn } from "../util";
import * as ins from "./mipsinstruction";
import * as g from "./mipsgdata";
import { MIPSAddr_reg } from "./mipsaddr";
import { REGS } from "./mipsreg";

export function predefinedCode(asm: MIPSAssembly, classlookup: ClassLookup, mainfnlabel: string) {
    // new line global data (asciiz)
    asm.addGData(new g.MIPSGData_asciiz('"\\n"'), MIPS_GDATA_NEWLINE);
    asm.addGData(new g.MIPSGData_emptyline());
    asm.addGData(new g.MIPSGData_asciiz('"true"'), MIPS_GDATA_TRUE);
    asm.addGData(new g.MIPSGData_emptyline());
    asm.addGData(new g.MIPSGData_asciiz('"false"'), MIPS_GDATA_FALSE);
    asm.addGData(new g.MIPSGData_emptyline());
    // pre-defined function, print integer
    asm.addCode(new ins.MIPS_lw(REGS.a0, new MIPSAddr_reg(4, REGS.sp)).setComments("pre-defined function of print_int"), predefinedFn.print_int.mipslabel);
    asm.addCode(new ins.MIPS_li(REGS.v0, 1));
    asm.addCode(new ins.MIPS_syscall());
    asm.addCode(new ins.MIPS_jr(REGS.ra));
    asm.addCode(new ins.MIPS_emptyline());
    // pre-defined function, print boolean
    asm.addCode(new ins.MIPS_lw(REGS.a0, new MIPSAddr_reg(4, REGS.sp)).setComments("pre-defined function of print_bool"), predefinedFn.print_bool.mipslabel);
    asm.addCode(new ins.MIPS_beqz(REGS.a0, MIPS_CODE_PRINTFALSE));
    asm.addCode(new ins.MIPS_la(REGS.a0, MIPS_GDATA_TRUE));
    asm.addCode(new ins.MIPS_b(MIPS_CODE_ENDPRINTBOOL));
    asm.addCode(new ins.MIPS_la(REGS.a0, MIPS_GDATA_FALSE), MIPS_CODE_PRINTFALSE);
    asm.addCode(new ins.MIPS_li(REGS.v0, 4), MIPS_CODE_ENDPRINTBOOL);
    asm.addCode(new ins.MIPS_syscall());
    asm.addCode(new ins.MIPS_jr(REGS.ra));
    asm.addCode(new ins.MIPS_emptyline());
    // pre-defined function, print new-line
    asm.addCode(new ins.MIPS_la(REGS.a0, MIPS_GDATA_NEWLINE).setComments("pre-defined function of print_newline"), predefinedFn.print_newline.mipslabel);
    asm.addCode(new ins.MIPS_li(REGS.v0, 4));
    asm.addCode(new ins.MIPS_syscall());
    asm.addCode(new ins.MIPS_jr(REGS.ra));
    asm.addCode(new ins.MIPS_emptyline());
    // pre-defined main function
    if (setupVtable(asm, classlookup)) {
        asm.addCode(new ins.MIPS_jal(MIPS_VTABLE_INIT_LABEL), "main");
        asm.addCode(new ins.MIPS_jal(mainfnlabel));
    }
    else
        asm.addCode(new ins.MIPS_jal(mainfnlabel), "main");
    asm.addCode(new ins.MIPS_li(REGS.v0, 10));
    asm.addCode(new ins.MIPS_syscall().setComments("EXIT PROGRAM"));
    asm.addCode(new ins.MIPS_emptyline());
}

function setupVtable(asm: MIPSAssembly, classlookup: ClassLookup): boolean {
    //pre-defined function, vtable initializer
    let setup = false;
    for (const cname of classlookup.getAllClasses()) {
        const cdef = classlookup.getClass(cname);
        const vtable = cdef.vmethodTable;
        if (vtable.length > 0) {
            const vtablelabel = cdef.getMIPSVTableLabel();
            asm.addGData(new g.MIPSGData_word(vtable.length).setComments(`virtual method table of class ${cname}`), vtablelabel);
            asm.addGData(new g.MIPSGData_emptyline());
            if (!setup) {
                //first instruction
                asm.addCode(new ins.MIPS_la(REGS.v1, vtablelabel), MIPS_VTABLE_INIT_LABEL);
                setup = true;
            }
            else
                asm.addCode(new ins.MIPS_la(REGS.v1, vtablelabel));
            for (let i = 0; i < vtable.length; ++i) {
                asm.addCode(new ins.MIPS_la(REGS.v0, vtable[i].getMIPSLabel()));
                asm.addCode(new ins.MIPS_sw(REGS.v0, new MIPSAddr_reg(4 * i, REGS.v1)));
            }
        }
    }
    if (setup) {
        asm.addCode(new ins.MIPS_jr(REGS.ra));
        asm.addCode(new ins.MIPS_emptyline());
    }
    return setup;
}

const MIPS_VTABLE_INIT_LABEL = "__vtable_init__";
const MIPS_GDATA_NEWLINE = "__newline__";
const MIPS_GDATA_TRUE = "__true__";
const MIPS_GDATA_FALSE = "__false__";
const MIPS_CODE_PRINTFALSE = "__print_false__";
const MIPS_CODE_ENDPRINTBOOL = "__end_print_bool__";
