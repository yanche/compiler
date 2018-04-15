
import { createLALR1Parser } from "../../../parser";
import { defineSyntaxProcessor, ParseTreeMidNode, Token, ParseTreeTermNode, ASTConverter } from "../../../compile";
import * as a from "../ast";

class TLangASTConverter extends ASTConverter<a.ASTNode> {
    constructor(handlermapp: Map<number, (node: ParseTreeMidNode) => a.ASTNode>) {
        super(handlermapp);
    }
    toAST(root: ParseTreeMidNode): a.ASTNode {
        const ret = <a.ASTNode>super.toAST(root);
        ret.area = root.area;
        return ret;
    }
}

let processor = defineSyntaxProcessor([
    {
        production: "PROGRAM -> GLOBAL-STATEMENT-LIST",
        handler: straightThru
    },
    {
        production: "GLOBAL-STATEMENT-LIST -> GLOBAL-STATEMENT GLOBAL-STATEMENT-LIST",
        handler: node => {
            const left = <a.ASTNode_classdef | a.ASTNode_functiondef>childToAST(node, 0), right = <a.ASTNode_globaldefs>childToAST(node, 1);
            return new a.ASTNode_globaldefs([left].concat(right.children));
        }
    },
    {
        production: "GLOBAL-STATEMENT-LIST -> GLOBAL-STATEMENT",
        handler: node => {
            return new a.ASTNode_globaldefs([<a.ASTNode_classdef | a.ASTNode_functiondef>childToAST(node, 0)]);
        }
    },
    {
        production: "GLOBAL-STATEMENT -> FUNCTION-DEFINITION",
        handler: straightThru
    },
    {
        production: "GLOBAL-STATEMENT -> CLASS-DEFINITION",
        handler: straightThru
    },
    {
        production: "FUNCTION-DEFINITION -> void id FUNCTION-DEFINITION-MAIN",
        handler: node => {
            const ast_fnmain = <a.ASTNode_functiondef_main>childToAST(node, 2);
            return new a.ASTNode_functiondef(new a.ASTNode_type(childToken(node, 0), 0), childToken(node, 1), ast_fnmain.argumentlist, ast_fnmain.statementlist);
        }
    },
    {
        production: "FUNCTION-DEFINITION -> TYPE-ANNOTATION id FUNCTION-DEFINITION-MAIN",
        handler: node => {
            const ast_fnmain = <a.ASTNode_functiondef_main>childToAST(node, 2);
            return new a.ASTNode_functiondef(<a.ASTNode_type>childToAST(node, 0), childToken(node, 1), ast_fnmain.argumentlist, ast_fnmain.statementlist);
        }
    },
    {
        production: "FUNCTION-DEFINITION-MAIN -> ( ARGUMENT-NULLABLE-LIST ) { NULLABLE-STATEMENT-LIST }",
        handler: node => {
            return new a.ASTNode_functiondef_main(<a.ASTNode_argumentlist>childToAST(node, 1), <a.ASTNode_statementlist>childToAST(node, 4));
        }
    },
    {
        production: "NULLABLE-STATEMENT-LIST -> ",
        handler: node => new a.ASTNode_statementlist([])
    },
    {
        production: "NULLABLE-STATEMENT-LIST -> STATEMENT-LIST",
        handler: straightThru
    },
    {
        production: "TYPE-ANNOTATION -> id",
        handler: node => new a.ASTNode_type(childToken(node, 0), 0)
    },
    {
        production: "TYPE-ANNOTATION -> [ TYPE-ANNOTATION ]",
        handler: node => {
            const type = (<a.ASTNode_type>childToAST(node, 1));
            return new a.ASTNode_type(type.basetype, type.depth + 1);
        }
    },
    {
        production: "ARGUMENT-NULLABLE-LIST -> ARGUMENT-LIST",
        handler: straightThru
    },
    {
        production: "ARGUMENT-NULLABLE-LIST -> ",
        handler: node => new a.ASTNode_argumentlist([])
    },
    {
        production: "ARGUMENT-LIST -> VAR-DECLARATION , ARGUMENT-LIST",
        handler: node => {
            const left = <a.ASTNode_vardeclare>childToAST(node, 0), right = <a.ASTNode_argumentlist>childToAST(node, 2);
            return new a.ASTNode_argumentlist([left].concat((right).children));
        }
    },
    {
        production: "ARGUMENT-LIST -> VAR-DECLARATION",
        handler: node => {
            return new a.ASTNode_argumentlist([<a.ASTNode_vardeclare>childToAST(node, 0)]);
        }
    },
    {
        production: "VAR-DECLARATION -> TYPE-ANNOTATION id",
        handler: node => {
            return new a.ASTNode_vardeclare(<a.ASTNode_type>childToAST(node, 0), childToken(node, 1));
        }
    },
    {
        production: "CLASS-DEFINITION -> class id CLASS-EXTENSION { NULLABLE-CLASS-BODY }",
        handler: node => {
            return new a.ASTNode_classdef(childToken(node, 1), (<a.ASTNode_token>childToAST(node, 2)).token, <a.ASTNode_classbody>childToAST(node, 4));
        }
    },
    {
        production: "CLASS-EXTENSION -> ",
        handler: node => {
            return new a.ASTNode_token(null);
        }
    },
    {
        production: "CLASS-EXTENSION -> : id",
        handler: node => {
            return new a.ASTNode_token(childToken(node, 1));
        }
    },
    {
        production: "NULLABLE-CLASS-BODY -> CLASS-BODY",
        handler: straightThru
    },
    {
        production: "NULLABLE-CLASS-BODY -> ",
        handler: node => new a.ASTNode_classbody([])
    },
    {
        production: "CLASS-BODY -> CLASS-BODY-ITEM CLASS-BODY",
        handler: node => {
            const left = <a.ASTNode_vardeclare | a.ASTNode_functiondef | a.ASTNode_constructordef>childToAST(node, 0), right = <a.ASTNode_classbody>childToAST(node, 1);
            return new a.ASTNode_classbody([left].concat(right.children));
        }
    },
    {
        production: "CLASS-BODY -> CLASS-BODY-ITEM",
        handler: node => {
            return new a.ASTNode_classbody([<a.ASTNode_vardeclare | a.ASTNode_functiondef | a.ASTNode_constructordef>childToAST(node, 0)]);
        }
    },
    {
        production: "CLASS-BODY-ITEM -> VAR-DECLARATION ;",
        handler: straightThru
    },
    {
        production: "CLASS-BODY-ITEM -> FUNCTION-DEFINITION",
        handler: straightThru
    },
    {
        production: "CLASS-BODY-ITEM -> constructor FUNCTION-DEFINITION-MAIN",
        handler: node => {
            const right = <a.ASTNode_functiondef_main>childToAST(node, 1);
            return new a.ASTNode_constructordef(right.argumentlist, right.statementlist);
        }
    },
    {
        production: "STATEMENT-LIST -> STATEMENT STATEMENT-LIST",
        handler: node => {
            const left = <a.ASTNode_statement>childToAST(node, 0), right = <a.ASTNode_statementlist>childToAST(node, 1);
            return new a.ASTNode_statementlist([left].concat(right.children));
        }
    },
    {
        production: "STATEMENT-LIST -> STATEMENT",
        handler: node => {
            return new a.ASTNode_statementlist([<a.ASTNode_statement>childToAST(node, 0)]);
        }
    },
    {
        production: "STATEMENT -> STATEMENT-ELSE-COMPLETE",
        handler: straightThru
    },
    {
        production: "STATEMENT -> STATEMENT-ELSE-ABSENT",
        handler: straightThru
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> break ;",
        handler: node => new a.ASTNode_break()
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> continue ;",
        handler: node => new a.ASTNode_continue()
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> if ( EXPRESSION ) STATEMENT-ELSE-COMPLETE else STATEMENT-ELSE-COMPLETE",
        handler: handlerFnStmtElse
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> ;",
        handler: noop
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> EXPRESSION ;",
        handler: straightThru
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> STATEMENT-BLOCK",
        handler: straightThru
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> return ;",
        handler: node => new a.ASTNode_returnvoid()
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> return EXPRESSION ;",
        handler: node => new a.ASTNode_return(<a.ASTNode_expr>childToAST(node, 1))
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> do STATEMENT while ( EXPRESSION )",
        handler: node => new a.ASTNode_dowhile(<a.ASTNode_expr>childToAST(node, 4), <a.ASTNode_statement>childToAST(node, 1))
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> WHILE-FOR-ELSE-COMPLETE",
        handler: straightThru
    },
    {
        production: "STATEMENT-ELSE-COMPLETE -> TYPE-ANNOTATION id = EXPRESSION ;",
        handler: node => new a.ASTNode_vardefine(<a.ASTNode_type>childToAST(node, 0), childToken(node, 1), <a.ASTNode_expr>childToAST(node, 3))
    },
    {
        production: "STATEMENT-BLOCK -> { NULLABLE-STATEMENT-LIST }",
        handler: node => new a.ASTNode_statementblock(<a.ASTNode_statementlist>childToAST(node, 1))
    },
    {
        production: "WHILE-FOR-ELSE-COMPLETE -> WHILE-FOR-HEAD STATEMENT-ELSE-COMPLETE",
        handler: handlerFnWhileFor
    },
    {
        production: "WHILE-FOR-ELSE-ABSENT -> WHILE-FOR-HEAD STATEMENT-ELSE-ABSENT",
        handler: handlerFnWhileFor
    },
    {
        production: "WHILE-FOR-HEAD -> while ( EXPRESSION )",
        handler: node => childToAST(node, 2)
    },
    {
        production: "WHILE-FOR-HEAD -> for ( FOR-LOOP-INIT ; EXPRESSION ; NULLABLE-EXPRESSION )",
        handler: node => new a.ASTNode_for_head(<a.ASTNode_statement>childToAST(node, 2), <a.ASTNode_expr>childToAST(node, 4), <a.ASTNode_statement>childToAST(node, 6))
    },
    {
        production: "FOR-LOOP-INIT -> ",
        handler: noop
    },
    {
        production: "FOR-LOOP-INIT -> EXPRESSION",
        handler: straightThru
    },
    {
        production: "FOR-LOOP-INIT -> TYPE-ANNOTATION id = EXPRESSION",
        handler: node => new a.ASTNode_vardefine(<a.ASTNode_type>childToAST(node, 0), childToken(node, 1), <a.ASTNode_expr>childToAST(node, 3))
    },
    {
        production: "NULLABLE-EXPRESSION -> EXPRESSION",
        handler: straightThru
    },
    {
        production: "NULLABLE-EXPRESSION -> ",
        handler: noop
    },
    {
        production: "STATEMENT-ELSE-ABSENT -> if ( EXPRESSION ) STATEMENT",
        handler: node => new a.ASTNode_if(<a.ASTNode_expr>childToAST(node, 2), <a.ASTNode_statement>childToAST(node, 4), new a.ASTNode_noop())
    },
    {
        production: "STATEMENT-ELSE-ABSENT -> if ( EXPRESSION ) STATEMENT-ELSE-COMPLETE else STATEMENT-ELSE-ABSENT",
        handler: handlerFnStmtElse
    },
    {
        production: "STATEMENT-ELSE-ABSENT -> WHILE-FOR-ELSE-ABSENT",
        handler: straightThru
    },
    {
        production: "EXPRESSION -> LEFT-VAL = EXPRESSION",
        handler: node => new a.ASTNode_assignment(<a.ASTNode_leftval>childToAST(node, 0), <a.ASTNode_expr>childToAST(node, 2))
    },
    {
        production: "EXPRESSION -> OR-EXPRESSION",
        handler: straightThru
    },
    {
        production: "OR-EXPRESSION -> OR-EXPRESSION || AND-EXPRESSION",
        handler: childOpExpr_midterm
    },
    {
        production: "OR-EXPRESSION -> AND-EXPRESSION",
        handler: straightThru
    },
    {
        production: "AND-EXPRESSION -> AND-EXPRESSION && TESTER-EXPRESSION",
        handler: childOpExpr_midterm
    },
    {
        production: "AND-EXPRESSION -> TESTER-EXPRESSION",
        handler: straightThru
    },
    {
        production: "TESTER-EXPRESSION -> TESTER-EXPRESSION TESTER BOOP-EXPRESSION",
        handler: childOpExpr
    },
    {
        production: "TESTER-EXPRESSION -> BOOP-EXPRESSION",
        handler: straightThru
    },
    {
        production: "TESTER -> !=",
        handler: child0TokenAST
    },
    {
        production: "TESTER -> ==",
        handler: child0TokenAST
    },
    {
        production: "TESTER -> >=",
        handler: child0TokenAST
    },
    {
        production: "TESTER -> <=",
        handler: child0TokenAST
    },
    {
        production: "TESTER -> >",
        handler: child0TokenAST
    },
    {
        production: "TESTER -> <",
        handler: child0TokenAST
    },
    {
        production: "BOOP-EXPRESSION -> BOOP-EXPRESSION BOOP SHIFT-EXPRESSION",
        handler: childOpExpr
    },
    {
        production: "BOOP-EXPRESSION -> SHIFT-EXPRESSION",
        handler: straightThru
    },
    {
        production: "BOOP -> &",
        handler: child0TokenAST
    },
    {
        production: "BOOP -> |",
        handler: child0TokenAST
    },
    {
        production: "BOOP -> ^",
        handler: child0TokenAST
    },
    {
        production: "SHIFT-EXPRESSION -> SHIFT-EXPRESSION SHIFT ADD-EXPRESSION",
        handler: childOpExpr
    },
    {
        production: "SHIFT-EXPRESSION -> ADD-EXPRESSION",
        handler: straightThru
    },
    {
        production: "SHIFT -> <<",
        handler: child0TokenAST
    },
    {
        production: "SHIFT -> >>",
        handler: child0TokenAST
    },
    {
        production: "SHIFT -> >>>",
        handler: child0TokenAST
    },
    {
        production: "ADD-EXPRESSION -> ADD-EXPRESSION ADD MULT-EXPRESSION",
        handler: childOpExpr
    },
    {
        production: "ADD-EXPRESSION -> MULT-EXPRESSION",
        handler: straightThru
    },
    {
        production: "ADD -> +",
        handler: child0TokenAST
    },
    {
        production: "ADD -> -",
        handler: child0TokenAST
    },
    {
        production: "MULT-EXPRESSION -> MULT-EXPRESSION MULT UNARY-EXPRESSION",
        handler: childOpExpr
    },
    {
        production: "MULT-EXPRESSION -> UNARY-EXPRESSION",
        handler: straightThru
    },
    {
        production: "MULT -> *",
        handler: child0TokenAST
    },
    {
        production: "MULT -> /",
        handler: child0TokenAST
    },
    {
        production: "UNARY-EXPRESSION -> UNARY UNARY-EXPRESSION",
        handler: node => new a.ASTNode_unaryopexpr((<a.ASTNode_token>childToAST(node, 0)).token, <a.ASTNode_expr>childToAST(node, 1))
    },
    {
        production: "UNARY-EXPRESSION -> CALL-EXPRESSION",
        handler: straightThru
    },
    {
        production: "UNARY -> !",
        handler: child0TokenAST
    },
    {
        production: "UNARY -> ~",
        handler: child0TokenAST
    },
    {
        production: "UNARY -> -",
        handler: child0TokenAST
    },
    {
        production: "CALL-EXPRESSION -> FN-NAME ( EXPRESSION-NULLABLE-LIST )",
        handler: node => {
            return new a.ASTNode_fncall(<a.ASTNode_fnref | a.ASTNode_baseconstructorref>childToAST(node, 0), <a.ASTNode_exprlist>childToAST(node, 2));
        }
    },
    {
        production: "CALL-EXPRESSION -> new TYPE-ANNOTATION ( EXPRESSION-NULLABLE-LIST )",
        handler: node => {
            const typenode = <a.ASTNode_type>childToAST(node, 1), exprlist = <a.ASTNode_exprlist>childToAST(node, 3);
            if (typenode.depth === 0)
                return new a.ASTNode_newinstance(typenode.basetype, exprlist)
            else
                return new a.ASTNode_newarray(typenode, exprlist);
        }
    },
    {
        production: "CALL-EXPRESSION -> DIRECT-VAL",
        handler: straightThru
    },
    {
        production: "CALL-EXPRESSION -> LITERAL",
        handler: straightThru
    },
    {
        production: "FN-NAME -> id",
        handler: node => new a.ASTNode_fnref(childToken(node, 0))
    },
    {
        production: "FN-NAME -> super",
        handler: node => new a.ASTNode_baseconstructorref()
    },
    {
        production: "DIRECT-VAL -> LEFT-VAL",
        handler: straightThru
    },
    {
        production: "DIRECT-VAL -> ( EXPRESSION )",
        handler: node => childToAST(node, 1)
    },
    {
        production: "DIRECT-VAL -> DIRECT-VAL . id ( EXPRESSION-NULLABLE-LIST )",
        handler: node => new a.ASTNode_methodcall(<a.ASTNode_expr>childToAST(node, 0), childToken(node, 2), <a.ASTNode_exprlist>childToAST(node, 4))
    },
    {
        production: "LEFT-VAL -> id",
        handler: node => new a.ASTNode_varref(child0TokenAST(node).token)
    },
    {
        production: "LEFT-VAL -> DIRECT-VAL [ EXPRESSION ]",
        handler: node => new a.ASTNode_arrderef(<a.ASTNode_expr>childToAST(node, 0), <a.ASTNode_expr>childToAST(node, 2))
    },
    {
        production: "LEFT-VAL -> DIRECT-VAL . id",
        handler: node => new a.ASTNode_fieldref(<a.ASTNode_expr>childToAST(node, 0), childToken(node, 2))
    },
    {
        production: "LITERAL -> integer",
        handler: node => new a.ASTNode_literal_integer(childToken(node, 0))
    },
    {
        production: "LITERAL -> boolean",
        handler: node => new a.ASTNode_literal_boolean(childToken(node, 0))
    },
    {
        production: "LITERAL -> null",
        handler: node => new a.ASTNode_literal_null()
    },
    {
        production: "EXPRESSION-NULLABLE-LIST -> EXPRESSION-LIST",
        handler: straightThru
    },
    {
        production: "EXPRESSION-NULLABLE-LIST -> ",
        handler: node => new a.ASTNode_exprlist([])
    },
    {
        production: "EXPRESSION-LIST -> EXPRESSION , EXPRESSION-LIST",
        handler: node => {
            const left = <a.ASTNode_expr>childToAST(node, 0), right = <a.ASTNode_exprlist>childToAST(node, 2);
            return new a.ASTNode_exprlist([left].concat(right.children));
        }
    },
    {
        production: "EXPRESSION-LIST -> EXPRESSION",
        handler: node => {
            return new a.ASTNode_exprlist([<a.ASTNode_expr>childToAST(node, 0)]);
        }
    },
], createLALR1Parser, (h: Map<number, (node: ParseTreeMidNode) => a.ASTNode>) => new TLangASTConverter(h));

function handlerFnStmtElse(node: ParseTreeMidNode): a.ASTNode_if {
    return new a.ASTNode_if(<a.ASTNode_expr>childToAST(node, 2), <a.ASTNode_statement>childToAST(node, 4), <a.ASTNode_statement>childToAST(node, 6));
}

function handlerFnWhileFor(node: ParseTreeMidNode): a.ASTNode_for | a.ASTNode_while {
    const left = <a.ASTNode_for_head | a.ASTNode_expr>childToAST(node, 0), right = <a.ASTNode_statement>childToAST(node, 1);
    if (left instanceof a.ASTNode_for_head)
        return new a.ASTNode_for(left.initstmt, left.cond, left.endstmt, right);
    else
        return new a.ASTNode_while(left, right);
}

function straightThru(node: ParseTreeMidNode): a.ASTNode {
    return childToAST(node, 0);
}

function noop(node: ParseTreeMidNode): a.ASTNode_noop {
    return new a.ASTNode_noop();
}

function childToAST(node: ParseTreeMidNode, pos: number): a.ASTNode {
    return <a.ASTNode>processor.astConverter.toAST(<ParseTreeMidNode>node.children[pos]);
}

function childToken(node: ParseTreeMidNode, pos: number): Token {
    return (<ParseTreeTermNode>node.children[pos]).token;
}

function child0TokenAST(node: ParseTreeMidNode): a.ASTNode_token {
    return new a.ASTNode_token(childToken(node, 0));
}

// function childRawStr(node: ParseTreeMidNode, pos: number): string {
//     return (<ParseTreeTermNode>node.children[pos]).token.rawstr;
// }

function childOpExpr(node: ParseTreeMidNode): a.ASTNode_opexpr {
    return new a.ASTNode_opexpr((<a.ASTNode_token>childToAST(node, 1)).token, <a.ASTNode_expr>childToAST(node, 0), <a.ASTNode_expr>childToAST(node, 2));
}
function childOpExpr_midterm(node: ParseTreeMidNode): a.ASTNode_opexpr {
    return new a.ASTNode_opexpr(childToken(node, 1), <a.ASTNode_expr>childToAST(node, 0), <a.ASTNode_expr>childToAST(node, 2));
}

let { prodSet, parser, astConverter } = processor;

export { prodSet, parser, astConverter };
