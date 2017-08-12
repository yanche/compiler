
import { ASTNode_globaldefs } from "../../ast";
import { buildGlobalTypes, semanticAnalysize } from "../../semantic";
import { parser, prodSet, astConverter } from "../../syntax";
import lex from "../../lex";
import * as assert from "assert";

export function getSemanticResult(code: string) {
    let lexRet = lex(code, prodSet);
    assert.ok(lexRet.accept);
    let parseRet = parser.parse(lexRet.tokens);
    assert.ok(parseRet.accept);
    let ast = <ASTNode_globaldefs>astConverter.toAST(parseRet.root);
    let gRet = buildGlobalTypes(ast);
    assert.ok(gRet.result.accept);
    return semanticAnalysize(ast, gRet.classlookup, gRet.fnlookup);
}