
import lex from "./lex";
import { astConverter, parser, prodSet } from "./syntax";
import { CompileError } from "../../compile";
import { semanticAnalysize, buildGlobalTypes } from "./semantic";
import { ASTNode_globaldefs } from "./ast";
import { generateIntermediateCode } from "./intermediatecode";
import { generateMIPSCode } from "./mipscode";

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
    const lexret = lex(input, prodSet);
    if (!lexret.accept) return { error: lexret.error };
    const parseret = parser.parse(lexret.tokens);
    if (!parseret.accept) return { error: parseret.error };
    const ast = <ASTNode_globaldefs>astConverter.toAST(parseret.root);
    const gret = buildGlobalTypes(ast);
    if (!gret.result.accept) return { error: gret.result.error };
    const classlookup = gret.classlookup;
    const fnlookup = gret.fnlookup;
    const tret = semanticAnalysize(classlookup, fnlookup);
    if (!tret.accept) return { error: tret.error };
    const code = generateIntermediateCode(classlookup, fnlookup);
    const iccode = flag & CompileOutputFlag.IntermediateCode ? code.toString() : "";
    const mips = generateMIPSCode(code, classlookup, fnlookup.mainfnmipslabel);
    const mipscode = flag & CompileOutputFlag.MIPS ? mips.toString() : "";
    const icafterregallo = flag & CompileOutputFlag.ICAfterRegAlloc ? code.toString() : "";
    return {
        intermediateCode: iccode,
        icAfterRegAlloc: icafterregallo,
        mips: mipscode
    };
}
