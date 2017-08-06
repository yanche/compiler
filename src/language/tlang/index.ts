
import lex from "./lex";
import { astConverter, parser, prodSet } from "./syntax";
import { CompileReturn } from "../../compile";
import semanticAnalysis from "./semantic";
import { ASTNode_globaldefs } from "./ast";
import { file } from "../../utility";
import { generateIntermediateCode } from "./intermediatecode";
import { generateMIPSCode } from "./mipscode";
import { ClassLookup, FunctionLookup } from "./util";


function compile(input: string, optimizedicpath: string, icregallocpath: string, mipspath: string): Promise<CompileReturn> {
    return Promise.resolve().then(() => {
        let lexret = lex(input, prodSet);
        if (!lexret.accept) return new CompileReturn(lexret.error);
        let parseret = parser.parse(lexret.tokens);
        if (!parseret.accept) return new CompileReturn(parseret.error);
        let ast = <ASTNode_globaldefs>astConverter.toAST(parseret.root);
        let classlookup = new ClassLookup();
        let fnlookup = new FunctionLookup();
        let tret = semanticAnalysis(ast, classlookup, fnlookup);
        if (!tret.accept) return new CompileReturn(tret.error);
        // let mret = ast.completenesscheck(true);
        // if (!mret.accept) return new CompileReturn(false, mret.errmsg, mret.errcode);
        let code = generateIntermediateCode(classlookup, fnlookup);
        let iccode = code.toString();
        let mips = generateMIPSCode(code, classlookup, fnlookup.mainfnmipslabel);
        let mipscode = mips.toString();
        let icafterregallo = code.toString();
        return Promise.all([file.writeFile(optimizedicpath, iccode), file.writeFile(icregallocpath, icafterregallo), file.writeFile(mipspath, mipscode)]).then(x => new CompileReturn())
        // return file.writeFile(icpath, code.toString())
        //     .then(() => file.writeFile(optimizedicpath, code.optimzie().toString()))
        //     .then(() => file.writeFile(mipspath, code.toMIPS(classlookup).toString()))
        //     .then(() => new CompileReturn(true));
    });
}

export function compileFromFile(srcfilepath: string): Promise<CompileReturn> {
    return file.readFile(srcfilepath).then((data: Buffer) => compile(data.toString("utf8"), srcfilepath + ".optimized.ic", srcfilepath + ".optimized.regallocated.ic", srcfilepath + ".asm"));
}
