
import { MIPSRegister, REGS } from "../mipscode";

export const regCount = 7;

export function regnumToMIPSReg(regnum: number): MIPSRegister {
    switch (regnum) {
        case 0: return REGS.t0;
        case 1: return REGS.t1;
        case 2: return REGS.t2;
        case 3: return REGS.t3;
        case 4: return REGS.t4;
        case 5: return REGS.t5;
        case 6: return REGS.t6;
        default: throw new Error("invalid regnum: " + regnum);
    }
}
