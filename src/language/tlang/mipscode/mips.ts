
import { MIPSInstruction } from "./mipsinstruction";
import { MIPSGData } from "./mipsgdata";

export class MIPSAssembly {
    private _textarea: Array<MIPSCodeLine>;
    private _gdata: Array<MIPSGDataLine>;

    toString(): string {
        let dataarr = this._gdata.length === 0 ? [] : [".data"].concat(this._gdata.map(g => g.toString()));
        return dataarr.concat(".text").concat(this._textarea.map(t => t.toString())).join("\r\n");
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
        let labelstr = this._label ? (this._label + ":\r\n") : "";
        return labelstr + this._gdata.toString();
    }

    constructor(gdata: MIPSGData, label?: string) {
        this._label = label;
        this._gdata = gdata;
    }
}

class MIPSCodeLine {
    private _label: string;
    private _ins: MIPSInstruction;

    toString(): string {
        let labelstr = this._label ? (this._label + ":\r\n") : "";
        return labelstr + this._ins.toString();
    }

    constructor(instruction: MIPSInstruction, label?: string) {
        this._label = label;
        this._ins = instruction;
    }
}
