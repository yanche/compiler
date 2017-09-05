
import { MIPSRegister } from "./mipsreg";

export abstract class MIPSAddress { }

export class MIPSAddr_reg extends MIPSAddress {
    private _offset: number;
    private _reg: MIPSRegister;

    toString(): string {
        return this._offset + "(" + this._reg + ")";
    }

    constructor(offset: number, reg: MIPSRegister) {
        super();
        this._offset = offset;
        this._reg = reg;
    }
}
