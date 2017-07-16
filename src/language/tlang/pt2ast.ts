
import * as c from '../../compile';
import parser from './parser';
import * as a from './ast';
import * as prod from '../../productions';
import * as util from './util';


let handlermap = new Map<string, (node: c.ParseTreeMidNode) => a.ASTNode>();

function straightThru(node: c.ParseTreeMidNode): a.ASTNode {
    return childToAST(node, 0);
}

function noop(node: c.ParseTreeMidNode): a.ASTNode_noop {
    return new a.ASTNode_noop();
}

function childToAST(node: c.ParseTreeMidNode, pos: number): a.ASTNode {
    return <a.ASTNode>converter.toAST(<c.ParseTreeMidNode>node.children[pos]);
}

function childToken(node: c.ParseTreeMidNode, pos: number): c.Token {
    return (<c.ParseTreeTermNode>node.children[pos]).token;
}

function child0TokenAST(node: c.ParseTreeMidNode): a.ASTNode_token {
    return new a.ASTNode_token(childToken(node, 0));
}

// function childRawStr(node: c.ParseTreeMidNode, pos: number): string {
//     return (<c.ParseTreeTermNode>node.children[pos]).token.rawstr;
// }

function childOpExpr(node: c.ParseTreeMidNode): a.ASTNode_opexpr {
    return new a.ASTNode_opexpr((<a.ASTNode_token>childToAST(node, 1)).token, <a.ASTNode_expr>childToAST(node, 0), <a.ASTNode_expr>childToAST(node, 2));
}
function childOpExpr_midterm(node: c.ParseTreeMidNode): a.ASTNode_opexpr {
    return new a.ASTNode_opexpr(childToken(node, 1), <a.ASTNode_expr>childToAST(node, 0), <a.ASTNode_expr>childToAST(node, 2));
}


handlermap.set('PROGRAM -> GLOBAL-STATEMENT-LIST', straightThru);
handlermap.set('GLOBAL-STATEMENT-LIST -> GLOBAL-STATEMENT GLOBAL-STATEMENT-LIST', node => {
    let left = <a.ASTNode_classdef | a.ASTNode_functiondef>childToAST(node, 0), right = <a.ASTNode_globaldefs>childToAST(node, 1);
    return new a.ASTNode_globaldefs([left].concat(right.children));
});
handlermap.set('GLOBAL-STATEMENT-LIST -> GLOBAL-STATEMENT', node => {
    return new a.ASTNode_globaldefs([<a.ASTNode_classdef | a.ASTNode_functiondef>childToAST(node, 0)]);
});
handlermap.set('GLOBAL-STATEMENT -> FUNCTION-DEFINITION', straightThru);
handlermap.set('GLOBAL-STATEMENT -> CLASS-DEFINITION', straightThru);
handlermap.set('FUNCTION-DEFINITION -> void id FUNCTION-DEFINITION-MAIN', node => {
    let ast_fnmain = <a.ASTNode_functiondef_main>childToAST(node, 2);
    return new a.ASTNode_functiondef(new a.ASTNode_type(childToken(node, 0), 0), childToken(node, 1), ast_fnmain.argumentlist, ast_fnmain.statementlist);
});
handlermap.set('FUNCTION-DEFINITION -> TYPE-ANNOTATION id FUNCTION-DEFINITION-MAIN', node => {
    let ast_fnmain = <a.ASTNode_functiondef_main>childToAST(node, 2);
    return new a.ASTNode_functiondef(<a.ASTNode_type>childToAST(node, 0), childToken(node, 1), ast_fnmain.argumentlist, ast_fnmain.statementlist);
});
handlermap.set('FUNCTION-DEFINITION-MAIN -> ( ARGUMENT-NULLABLE-LIST ) { NULLABLE-STATEMENT-LIST }', node => {
    return new a.ASTNode_functiondef_main(<a.ASTNode_argumentlist>childToAST(node, 1), <a.ASTNode_statementlist>childToAST(node, 4));
});
handlermap.set('NULLABLE-STATEMENT-LIST -> ', node => new a.ASTNode_statementlist([]));
handlermap.set('NULLABLE-STATEMENT-LIST -> STATEMENT-LIST', straightThru);
handlermap.set('TYPE-ANNOTATION -> id', node => new a.ASTNode_type(childToken(node, 0), 0));
handlermap.set('TYPE-ANNOTATION -> [ TYPE-ANNOTATION ]', node => {
    let type = (<a.ASTNode_type>childToAST(node, 1));
    return new a.ASTNode_type(type.basetype, type.depth + 1);
});
handlermap.set('ARGUMENT-NULLABLE-LIST -> ', node => new a.ASTNode_argumentlist([]));
handlermap.set('ARGUMENT-NULLABLE-LIST -> ARGUMENT-LIST', straightThru);
handlermap.set('ARGUMENT-LIST -> VAR-DECLARATION , ARGUMENT-LIST', node => {
    let left = <a.ASTNode_vardeclare>childToAST(node, 0), right = <a.ASTNode_argumentlist>childToAST(node, 2);
    return new a.ASTNode_argumentlist([left].concat((right).children));
});
handlermap.set('ARGUMENT-LIST -> VAR-DECLARATION', node => {
    return new a.ASTNode_argumentlist([<a.ASTNode_vardeclare>childToAST(node, 0)]);
});
handlermap.set('VAR-DECLARATION -> TYPE-ANNOTATION id', node => {
    return new a.ASTNode_vardeclare(<a.ASTNode_type>childToAST(node, 0), childToken(node, 1));
});
handlermap.set('CLASS-DEFINITION -> class id CLASS-EXTENSION { NULLABLE-CLASS-BODY }', node => {
    return new a.ASTNode_classdef(childToken(node, 1), (<a.ASTNode_token>childToAST(node, 2)).token, <a.ASTNode_classbody>childToAST(node, 4));
});
handlermap.set('CLASS-EXTENSION -> ', node => {
    return new a.ASTNode_token(null);
});
handlermap.set('CLASS-EXTENSION -> : id', node => {
    return new a.ASTNode_token(childToken(node, 1));
});
handlermap.set('NULLABLE-CLASS-BODY -> CLASS-BODY', straightThru);
handlermap.set('NULLABLE-CLASS-BODY -> ', node => new a.ASTNode_classbody([]));
handlermap.set('CLASS-BODY -> CLASS-BODY-ITEM CLASS-BODY', node => {
    let left = <a.ASTNode_vardeclare | a.ASTNode_functiondef>childToAST(node, 0), right = <a.ASTNode_classbody>childToAST(node, 1);
    return new a.ASTNode_classbody([left].concat(right.children));
});
handlermap.set('CLASS-BODY -> CLASS-BODY-ITEM', node => {
    return new a.ASTNode_classbody([<a.ASTNode_vardeclare | a.ASTNode_functiondef>childToAST(node, 0)]);
});
handlermap.set('CLASS-BODY-ITEM -> VAR-DECLARATION ;', straightThru);
handlermap.set('CLASS-BODY-ITEM -> FUNCTION-DEFINITION', straightThru);
handlermap.set('CLASS-BODY-ITEM -> constructor FUNCTION-DEFINITION-MAIN', node => {
    let right = <a.ASTNode_functiondef_main>childToAST(node, 1);
    return new a.ASTNode_functiondef(new a.ASTNode_type(new c.Token(util.Type.void.basetype, null, c.noArea), 0), childToken(node, 0), right.argumentlist, right.statementlist);
});
handlermap.set('STATEMENT-LIST -> STATEMENT STATEMENT-LIST', node => {
    let left = <a.ASTNode_statement>childToAST(node, 0), right = <a.ASTNode_statementlist>childToAST(node, 1);
    return new a.ASTNode_statementlist([left].concat(right.children));
});
handlermap.set('STATEMENT-LIST -> STATEMENT', node => {
    return new a.ASTNode_statementlist([<a.ASTNode_statement>childToAST(node, 0)]);
});
handlermap.set('STATEMENT -> STATEMENT-ELSE-COMPLETE', straightThru);
handlermap.set('STATEMENT -> STATEMENT-ELSE-ABSENT', straightThru);
handlermap.set('STATEMENT-ELSE-COMPLETE -> if ( EXPRESSION ) STATEMENT-ELSE-COMPLETE else STATEMENT-ELSE-COMPLETE', node => {
    return new a.ASTNode_if(<a.ASTNode_expr>childToAST(node, 2), <a.ASTNode_statement>childToAST(node, 4), <a.ASTNode_statement>childToAST(node, 6));
});
handlermap.set('STATEMENT-ELSE-COMPLETE -> break ;', node => new a.ASTNode_break());
handlermap.set('STATEMENT-ELSE-COMPLETE -> continue ;', node => new a.ASTNode_continue());
handlermap.set('STATEMENT-ELSE-COMPLETE -> ;', noop);
handlermap.set('STATEMENT-ELSE-COMPLETE -> EXPRESSION ;', straightThru);
handlermap.set('STATEMENT-ELSE-COMPLETE -> STATEMENT-BLOCK', straightThru);
handlermap.set('STATEMENT-ELSE-COMPLETE -> return ;', node => new a.ASTNode_returnvoid());
handlermap.set('STATEMENT-ELSE-COMPLETE -> return EXPRESSION ;', node => new a.ASTNode_return(<a.ASTNode_expr>childToAST(node, 1)));
handlermap.set('STATEMENT-ELSE-COMPLETE -> do STATEMENT while ( EXPRESSION )', node => new a.ASTNode_dowhile(<a.ASTNode_expr>childToAST(node, 4), <a.ASTNode_statement>childToAST(node, 1)));
handlermap.set('STATEMENT-ELSE-COMPLETE -> WHILE-FOR-ELSE-COMPLETE', straightThru);
handlermap.set('STATEMENT-ELSE-COMPLETE -> TYPE-ANNOTATION id = EXPRESSION ;', node => new a.ASTNode_vardefine(<a.ASTNode_type>childToAST(node, 0), childToken(node, 1), <a.ASTNode_expr>childToAST(node, 3)));
handlermap.set('WHILE-FOR-ELSE-COMPLETE -> WHILE-FOR-HEAD STATEMENT-ELSE-COMPLETE', node => {
    let left = <a.ASTNode_for_head | a.ASTNode_expr>childToAST(node, 0), right = <a.ASTNode_statement>childToAST(node, 1);
    if (left instanceof a.ASTNode_for_head)
        return new a.ASTNode_for(left.initstmt, left.cond, left.endstmt, right);
    else
        return new a.ASTNode_while(left, right);
});
handlermap.set('STATEMENT-BLOCK -> { NULLABLE-STATEMENT-LIST }', node => new a.ASTNode_statementblock(<a.ASTNode_statementlist>childToAST(node, 1)));
handlermap.set('WHILE-FOR-ELSE-ABSENT -> WHILE-FOR-HEAD STATEMENT-ELSE-ABSENT', handlermap.get('WHILE-FOR-ELSE-COMPLETE -> WHILE-FOR-HEAD STATEMENT-ELSE-COMPLETE'));
handlermap.set('WHILE-FOR-HEAD -> while ( EXPRESSION )', node => childToAST(node, 2));
handlermap.set('WHILE-FOR-HEAD -> for ( FOR-LOOP-INIT ; EXPRESSION ; NULLABLE-EXPRESSION )', node => new a.ASTNode_for_head(<a.ASTNode_statement>childToAST(node, 2), <a.ASTNode_expr>childToAST(node, 4), <a.ASTNode_statement>childToAST(node, 6)));
handlermap.set('FOR-LOOP-INIT -> ', noop);
handlermap.set('FOR-LOOP-INIT -> EXPRESSION', straightThru);
handlermap.set('FOR-LOOP-INIT -> TYPE-ANNOTATION id = EXPRESSION', node => new a.ASTNode_vardefine(<a.ASTNode_type>childToAST(node, 0), childToken(node, 1), <a.ASTNode_expr>childToAST(node, 3)));
handlermap.set('NULLABLE-EXPRESSION -> ', noop);
handlermap.set('NULLABLE-EXPRESSION -> EXPRESSION', straightThru);
handlermap.set('STATEMENT-ELSE-ABSENT -> if ( EXPRESSION ) STATEMENT', node => new a.ASTNode_if(<a.ASTNode_expr>childToAST(node, 2), <a.ASTNode_statement>childToAST(node, 4), new a.ASTNode_noop()));
handlermap.set('STATEMENT-ELSE-ABSENT -> if ( EXPRESSION ) STATEMENT-ELSE-COMPLETE else STATEMENT-ELSE-ABSENT', handlermap.get('STATEMENT-ELSE-COMPLETE -> if ( EXPRESSION ) STATEMENT-ELSE-COMPLETE else STATEMENT-ELSE-COMPLETE'));
handlermap.set('STATEMENT-ELSE-ABSENT -> WHILE-FOR-ELSE-ABSENT', straightThru);
handlermap.set('EXPRESSION -> LEFT-VAL = EXPRESSION', node => new a.ASTNode_assignment(<a.ASTNode_leftval>childToAST(node, 0), <a.ASTNode_expr>childToAST(node, 2)));
handlermap.set('EXPRESSION -> OR-EXPRESSION', straightThru);
handlermap.set('OR-EXPRESSION -> OR-EXPRESSION || AND-EXPRESSION', childOpExpr_midterm);
handlermap.set('OR-EXPRESSION -> AND-EXPRESSION', straightThru);
handlermap.set('AND-EXPRESSION -> AND-EXPRESSION && TESTER-EXPRESSION', childOpExpr_midterm);
handlermap.set('AND-EXPRESSION -> TESTER-EXPRESSION', straightThru);
handlermap.set('TESTER-EXPRESSION -> TESTER-EXPRESSION TESTER BOOP-EXPRESSION', childOpExpr);
handlermap.set('TESTER-EXPRESSION -> BOOP-EXPRESSION', straightThru);
handlermap.set('TESTER -> !=', child0TokenAST);
handlermap.set('TESTER -> ==', child0TokenAST);
handlermap.set('TESTER -> >=', child0TokenAST);
handlermap.set('TESTER -> <=', child0TokenAST);
handlermap.set('TESTER -> >', child0TokenAST);
handlermap.set('TESTER -> <', child0TokenAST);
handlermap.set('BOOP-EXPRESSION -> BOOP-EXPRESSION BOOP SHIFT-EXPRESSION', childOpExpr);
handlermap.set('BOOP-EXPRESSION -> SHIFT-EXPRESSION', straightThru);
handlermap.set('BOOP -> &', child0TokenAST);
handlermap.set('BOOP -> |', child0TokenAST);
handlermap.set('BOOP -> ^', child0TokenAST);
handlermap.set('SHIFT-EXPRESSION -> SHIFT-EXPRESSION SHIFT ADD-EXPRESSION', childOpExpr);
handlermap.set('SHIFT-EXPRESSION -> ADD-EXPRESSION', straightThru);
handlermap.set('SHIFT -> >>', child0TokenAST);
handlermap.set('SHIFT -> >>>', child0TokenAST);
handlermap.set('SHIFT -> <<', child0TokenAST);
handlermap.set('ADD-EXPRESSION -> ADD-EXPRESSION ADD MULT-EXPRESSION', childOpExpr);
handlermap.set('ADD-EXPRESSION -> MULT-EXPRESSION', straightThru);
handlermap.set('ADD -> +', child0TokenAST);
handlermap.set('ADD -> -', child0TokenAST);
handlermap.set('MULT-EXPRESSION -> MULT-EXPRESSION MULT UNARY-EXPRESSION', childOpExpr);
handlermap.set('MULT-EXPRESSION -> UNARY-EXPRESSION', straightThru);
handlermap.set('MULT -> *', child0TokenAST);
handlermap.set('MULT -> /', child0TokenAST);
handlermap.set('UNARY-EXPRESSION -> UNARY UNARY-EXPRESSION', node => new a.ASTNode_unaryopexpr((<a.ASTNode_token>childToAST(node, 0)).token, <a.ASTNode_expr>childToAST(node, 1)));
handlermap.set('UNARY-EXPRESSION -> CALL-EXPRESSION', straightThru);
handlermap.set('UNARY -> !', child0TokenAST);
handlermap.set('UNARY -> ~', child0TokenAST);
handlermap.set('UNARY -> -', child0TokenAST);
handlermap.set('CALL-EXPRESSION -> FN-NAME ( EXPRESSION-NULLABLE-LIST )', node => {
    return new a.ASTNode_fncall(<a.ASTNode_fnref | a.ASTNode_baseconstructorref>childToAST(node, 0), <a.ASTNode_exprlist>childToAST(node, 2));
});
handlermap.set('CALL-EXPRESSION -> new TYPE-ANNOTATION ( EXPRESSION-NULLABLE-LIST )', node => {
    let typenode = <a.ASTNode_type>childToAST(node, 1), exprlist = <a.ASTNode_exprlist>childToAST(node, 3);
    if (typenode.depth === 0)
        return new a.ASTNode_newinstance(typenode.basetype, exprlist)
    else
        return new a.ASTNode_newarray(typenode, exprlist);
});
handlermap.set('CALL-EXPRESSION -> DIRECT-VAL', straightThru);
handlermap.set('CALL-EXPRESSION -> LITERAL', straightThru);
handlermap.set('FN-NAME -> id', node => new a.ASTNode_fnref(childToken(node, 0)));
handlermap.set('FN-NAME -> super', node => new a.ASTNode_baseconstructorref());
handlermap.set('DIRECT-VAL -> LEFT-VAL', straightThru);
handlermap.set('DIRECT-VAL -> ( EXPRESSION )', node => childToAST(node, 1));
handlermap.set('DIRECT-VAL -> DIRECT-VAL . id ( EXPRESSION-NULLABLE-LIST )', node => new a.ASTNode_methodcall(<a.ASTNode_expr>childToAST(node, 0), childToken(node, 2), <a.ASTNode_exprlist>childToAST(node, 4)));
handlermap.set('LEFT-VAL -> id', node => new a.ASTNode_varref(child0TokenAST(node).token));
handlermap.set('LEFT-VAL -> DIRECT-VAL [ EXPRESSION ]', node => new a.ASTNode_arrderef(<a.ASTNode_expr>childToAST(node, 0), <a.ASTNode_expr>childToAST(node, 2)));
handlermap.set('LEFT-VAL -> DIRECT-VAL . id', node => new a.ASTNode_fieldref(<a.ASTNode_expr>childToAST(node, 0), childToken(node, 2)));
handlermap.set('LITERAL -> integer', node => new a.ASTNode_literal_integer(childToken(node, 0)));
handlermap.set('LITERAL -> boolean', node => new a.ASTNode_literal_boolean(childToken(node, 0)));
handlermap.set('LITERAL -> null', node => new a.ASTNode_literal_null());
handlermap.set('EXPRESSION-NULLABLE-LIST -> EXPRESSION-LIST', straightThru);
handlermap.set('EXPRESSION-NULLABLE-LIST -> ', node => new a.ASTNode_exprlist([]));
handlermap.set('EXPRESSION-LIST -> EXPRESSION , EXPRESSION-LIST', node => {
    let left = <a.ASTNode_expr>childToAST(node, 0), right = <a.ASTNode_exprlist>childToAST(node, 2);
    return new a.ASTNode_exprlist([left].concat(right.children));
});
handlermap.set('EXPRESSION-LIST -> EXPRESSION', node => {
    return new a.ASTNode_exprlist([<a.ASTNode_expr>childToAST(node, 0)]);
});


class TLangASTConverter extends c.ASTConverter<a.ASTNode>{
    constructor(prodset: prod.ProdSet, handlermapp: Map<string, (node: c.ParseTreeMidNode) => a.ASTNode>) {
        super(prodset, handlermapp);
    }
    toAST(root: c.ParseTreeMidNode): a.ASTNode {
        let ret = super.toAST(root);
        ret.area = root.area();
        return ret;
    }
}

let converter = new TLangASTConverter(parser.prodset, handlermap);

export default converter;
