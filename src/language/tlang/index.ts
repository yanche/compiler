
import lex from './lex';
import pt2ast from './pt2ast';
import parser from './parser';
import * as c from '../../compile';
import * as fs from 'fs';
import semanticAnalysis from './semantic';
import * as a from './ast';
import * as utility from '../../utility';
import * as ic from './intermediatecode';
import * as m from './mipscode';
import * as util from './util';


function compile(input: string, optimizedicpath: string, icregallocpath: string, mipspath: string): Promise<c.CompileReturn> {
    return Promise.resolve().then(() => {
        let lexret = lex(input, parser.prodset);
        if (!lexret.accept) return new c.CompileReturn(false, lexret.errmsg, lexret.errcode);
        let parseret = parser.parse(lexret.tokens);
        if (!parseret.accept) return new c.CompileReturn(false, parseret.errmsg, parseret.errcode);
        let ast = <a.ASTNode_globaldefs>pt2ast.toAST(parseret.root);
        let classlookup = new util.ClassLookup();
        let fnlookup = new util.FunctionLookup();
        let tret = semanticAnalysis(ast, classlookup, fnlookup);
        if (!tret.accept) return new c.CompileReturn(false, tret.errmsg, tret.errcode);
        // let mret = ast.completenesscheck(true);
        // if (!mret.accept) return new c.CompileReturn(false, mret.errmsg, mret.errcode);
        let code = ic.generateIntermediateCode(classlookup, fnlookup);
        let iccode = code.toString();
        let mips = m.generateMIPSCode(code, classlookup, fnlookup.mainfnmipslabel);
        let mipscode = mips.toString();
        let icafterregallo = code.toString();
        return Promise.all([utility.file.writeFile(optimizedicpath, iccode), utility.file.writeFile(icregallocpath, icafterregallo), utility.file.writeFile(mipspath, mipscode)]).then(x => new c.CompileReturn(true))
        // return utility.file.writeFile(icpath, code.toString())
        //     .then(() => utility.file.writeFile(optimizedicpath, code.optimzie().toString()))
        //     .then(() => utility.file.writeFile(mipspath, code.toMIPS(classlookup).toString()))
        //     .then(() => new c.CompileReturn(true));
    }).catch((err: Error) => new c.CompileReturn(false, 'failed to write intermediate code into given file: \n' + err.stack, 0));
}

export function compileFromFile(srcfilepath: string): Promise<c.CompileReturn> {
    return utility.file.readFile(srcfilepath).then((data: Buffer) => compile(data.toString('utf8'), srcfilepath + '.optimized.ic', srcfilepath + '.optimized.regallocated.ic', srcfilepath + '.asm'));
}