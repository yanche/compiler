
import { ASTNode_globaldefs } from "../../ast";
import { buildGlobalTypes, semanticAnalysize } from "../index";
import { SemanticCheckReturn } from "../../util";
import { parser, prodSet, astConverter } from "../../syntax";
import lex from "../../lex";
 import { assert } from "chai";

export function getSemanticResult(code: string): SemanticCheckReturn {
    const lexRet = lex(code, prodSet);
    assert.ok(lexRet.accept);
    const parseRet = parser.parse(lexRet.tokens);
    assert.ok(parseRet.accept);
    const ast = <ASTNode_globaldefs>astConverter.toAST(parseRet.root);
    const gRet = buildGlobalTypes(ast);
    assert.ok(gRet.result.accept);
    return semanticAnalysize(gRet.classlookup, gRet.fnlookup);
}
