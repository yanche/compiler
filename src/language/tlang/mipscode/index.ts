
import { IntermediateCode } from "../intermediatecode";
import { ClassLookup } from "../util";
import { predefinedCode } from "./predefined";
import { MIPSAssembly } from "./mips";

export function generateMIPSCode(code: IntermediateCode, classlookup: ClassLookup, mainfnlabel: string): MIPSAssembly {
    let asm = new MIPSAssembly();
    predefinedCode(asm, classlookup, mainfnlabel);
    code.toMIPS(asm);
    return asm;
}

export * from "./mipsinstruction";
export * from "./mipsreg";
export * from "./mipsaddr";
export { MIPSAssembly }
