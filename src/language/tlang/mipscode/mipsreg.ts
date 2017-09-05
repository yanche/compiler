
export class MIPSRegister {
    private _num: number;
    private _name: string;

    toString(): string {
        return "$" + this._name;
    }

    constructor(num: number, name: string) {
        this._name = name;
        this._num = num;
    }
}

export const REGS = {
    zero: genMIPSReg(0, "zero"),
    at: genMIPSReg(1, "at"),
    v0: genMIPSReg(2, "v0"),
    v1: genMIPSReg(3, "v1"),
    a0: genMIPSReg(4, "a0"),
    a1: genMIPSReg(5, "a1"),
    a2: genMIPSReg(6, "a2"),
    a3: genMIPSReg(7, "a3"),
    t0: genMIPSReg(8, "t0"),
    t1: genMIPSReg(9, "t1"),
    t2: genMIPSReg(10, "t2"),
    t3: genMIPSReg(11, "t3"),
    t4: genMIPSReg(12, "t4"),
    t5: genMIPSReg(13, "t5"),
    t6: genMIPSReg(14, "t6"),
    t7: genMIPSReg(15, "t7"),
    s0: genMIPSReg(16, "s0"),
    s1: genMIPSReg(17, "s1"),
    s2: genMIPSReg(18, "s2"),
    s3: genMIPSReg(19, "s3"),
    s4: genMIPSReg(20, "s4"),
    s5: genMIPSReg(21, "s5"),
    s6: genMIPSReg(22, "s6"),
    s7: genMIPSReg(23, "s7"),
    t8: genMIPSReg(24, "t8"),
    t9: genMIPSReg(25, "t9"),
    k0: genMIPSReg(26, "k0"),
    k1: genMIPSReg(27, "k1"),
    gp: genMIPSReg(28, "gp"),
    sp: genMIPSReg(29, "sp"),
    fp: genMIPSReg(30, "fp"),
    ra: genMIPSReg(31, "ra"),
};

function genMIPSReg(num: number, name: string): MIPSRegister {
    return new MIPSRegister(num, name);
}
