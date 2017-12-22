
import lex from "./lex";
import { astConverter, parser, prodSet } from "./syntax";
import { CompileReturn, CompileError } from "../../compile";
import { semanticAnalysize, buildGlobalTypes } from "./semantic";
import { ASTNode_globaldefs } from "./ast";
import { file } from "../../utility";
import { generateIntermediateCode } from "./intermediatecode";
import { generateMIPSCode } from "./mipscode";
import { ClassLookup, FunctionLookup } from "./util";

export enum CompileOutputFlag {
    IntermediateCode = 1,
    ICAfterRegAlloc = 2,
    MIPS = 4,
}

export function compile(input: string, flag: CompileOutputFlag): {
    intermediateCode?: string;
    icAfterRegAlloc?: string;
    mips?: string;
    error?: CompileError;
} {
    let lexret = lex(input, prodSet);
    if (!lexret.accept) return { error: lexret.error };
    let parseret = parser.parse(lexret.tokens);
    if (!parseret.accept) return { error: parseret.error };
    let ast = <ASTNode_globaldefs>astConverter.toAST(parseret.root);
    let gret = buildGlobalTypes(ast);
    if (!gret.result.accept) return { error: gret.result.error };
    let classlookup = gret.classlookup;
    let fnlookup = gret.fnlookup;
    let tret = semanticAnalysize(classlookup, fnlookup);
    if (!tret.accept) return { error: tret.error };
    let code = generateIntermediateCode(classlookup, fnlookup);
    let iccode = flag & CompileOutputFlag.IntermediateCode ? code.toString() : "";
    let mips = generateMIPSCode(code, classlookup, fnlookup.mainfnmipslabel);
    let mipscode = flag & CompileOutputFlag.MIPS ? mips.toString() : "";
    let icafterregallo = flag & CompileOutputFlag.ICAfterRegAlloc ? code.toString() : "";
    return {
        intermediateCode: iccode,
        icAfterRegAlloc: icafterregallo,
        mips: mipscode
    };
}

export function compileFromFile(srcfilepath: string): Promise<CompileReturn> {
    return file.readFile(srcfilepath)
        .then((data: Buffer) => {
            const compret = compile(data.toString("utf8"), CompileOutputFlag.ICAfterRegAlloc | CompileOutputFlag.IntermediateCode | CompileOutputFlag.MIPS);
            if (compret.error) {
                return new CompileReturn(compret.error);
            } else {
                return Promise.all([
                    file.writeFile(srcfilepath + ".optimized.ic", compret.intermediateCode),
                    file.writeFile(srcfilepath + ".optimized.regallocated.ic", compret.icAfterRegAlloc),
                    file.writeFile(srcfilepath + ".asm", compret.mips)
                ])
                    .then(() => new CompileReturn());
            }
        });
}
