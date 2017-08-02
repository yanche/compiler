
import { ParseTreeMidNode, ParseTreeTermNode, ASTNode, defineSyntaxProcessor } from "../../compile";
import { createSLR1Parser } from "../../parser";
import * as ap from "./astprocess";

let straightThru0 = straightThruGen(0);
let straightThru1 = straightThruGen(1);

const processor = defineSyntaxProcessor([
    {
        production: "RE -> S-RE",
        handler: straightThru0
    },
    {
        production: "RE -> S-RE | RE",
        handler: glueChildrenGen_OR(2)
    },
    {
        production: "S-RE -> B-RE",
        handler: straightThru0
    },
    {
        production: "S-RE -> B-RE S-RE",
        handler: node => {
            let left = childToAST(node, 0), right = childToAST(node, 1);
            let children = left instanceof ap.ASTNode_Concat ? left.children : [left];
            children = children.concat(right instanceof ap.ASTNode_Concat ? right.children : [right]);
            return new ap.ASTNode_Concat(children);
        }
    },
    {
        production: "B-RE -> E-RE REPEAT",
        handler: node => {
            let left = childToAST(node, 0), right = childToAST(node, 1);
            if (right == null) return left;
            else {
                let sright = <ap.ASTNode_Single>right;
                if (sright.ch === ch_star) return new ap.ASTNode_RStar(left);
                else if (sright.ch === ch_plus) return new ap.ASTNode_RPlus(left);
                else if (sright.ch === ch_ques) return new ap.ASTNode_RQues(left);
                else throw new Error("impossible code path: " + sright.ch);
            }
        }
    },
    {
        production: "REPEAT -> *",
        handler: single
    },
    {
        production: "REPEAT -> +",
        handler: single
    },
    {
        production: "REPEAT -> ?",
        handler: single
    },
    {
        production: "REPEAT -> ",
        handler: node => null
    },
    {
        production: "E-RE -> ( RE )",
        handler: straightThru1
    },
    {
        production: "E-RE -> SINGLE-INPUT",
        handler: straightThru0
    },
    {
        production: "E-RE -> SET",
        handler: straightThru0
    },
    {
        production: "SET -> P-SET",
        handler: straightThru0
    },
    {
        production: "P-SET -> [ SET-ITEMS ]",
        handler: straightThru1
    },
    {
        production: "SET-ITEMS -> SINGLE-INPUT",
        handler: straightThru0
    },
    {
        production: "SET-ITEMS -> SINGLE-INPUT SET-ITEMS",
        handler: glueChildrenGen_OR(1)
    },
    {
        production: "SINGLE-INPUT -> CHAR",
        handler: straightThru0
    },
    {
        production: "SINGLE-INPUT -> GROUP-SINGLE-INPUT",
        handler: straightThru0
    },
    {
        production: "GROUP-SINGLE-INPUT -> l_letter - l_letter",
        handler: range
    },
    {
        production: "GROUP-SINGLE-INPUT -> u_letter - u_letter",
        handler: range
    },
    {
        production: "GROUP-SINGLE-INPUT -> digit - digit",
        handler: range
    },
    {
        production: "CHAR -> l_letter",
        handler: single
    },
    {
        production: "CHAR -> u_letter",
        handler: single
    },
    {
        production: "CHAR -> digit",
        handler: single
    }
], createSLR1Parser);

//make the handlermap
function straightThruGen(pos: number): (node: ParseTreeMidNode) => ASTNode {
    return function (node: ParseTreeMidNode): ASTNode {
        return processor.astConverter.toAST(<ParseTreeMidNode>node.children[pos]);
    };
}

//CONCAT & OR
function glueChildrenGen_OR(posright: number): (node: ParseTreeMidNode) => ASTNode {
    return function (node: ParseTreeMidNode): ASTNode {
        let left = childToAST(node, 0), right = childToAST(node, posright);
        let children = left instanceof ap.ASTNode_OR ? left.children : [left];
        children = children.concat(right instanceof ap.ASTNode_OR ? right.children : [right]);
        return new ap.ASTNode_OR(children);
    };
}

function single(node: ParseTreeMidNode): ASTNode {
    return new ap.ASTNode_Single((<ParseTreeTermNode>node.children[0]).token.rawstr.charCodeAt(0));
}

function range(node: ParseTreeMidNode): ASTNode {
    return new ap.ASTNode_Range((<ParseTreeTermNode>node.children[0]).token.rawstr.charCodeAt(0), (<ParseTreeTermNode>node.children[2]).token.rawstr.charCodeAt(0));
}

let ch_star = "*".charCodeAt(0);
let ch_plus = "+".charCodeAt(0);
let ch_ques = "?".charCodeAt(0);

function childToAST(node: ParseTreeMidNode, pos: number): ASTNode {
    return processor.astConverter.toAST(<ParseTreeMidNode>node.children[pos]);
}

let { prodSet, parser, astConverter } = processor;

export { prodSet, parser, astConverter };
