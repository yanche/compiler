
import { ParseTreeMidNode, ParseTreeTermNode, defineSyntaxProcessor } from "../../compile";
import { createSLR1Parser } from "../../parser";
import { ASTNode_OR, ASTNode_Single, ASTNode_Range, ASTNode_Concat, ASTNode_RStar, ASTNode_RPlus, ASTNode_RQues, ASTNode_REGEX } from "./astprocess";
import { PTN2ASTNConverter } from "../../compile/ast";

const straightThru0 = straightThruGen(0);
const straightThru1 = straightThruGen(1);

const processor = defineSyntaxProcessor<ASTNode_REGEX>([
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
            const left = childToAST(node, 0);
            const right = childToAST(node, 1);
            let children = left instanceof ASTNode_Concat ? left.children : [left];
            children = children.concat(right instanceof ASTNode_Concat ? right.children : [right]);
            return new ASTNode_Concat(children);
        }
    },
    {
        production: "B-RE -> E-RE REPEAT",
        handler: node => {
            const left = childToAST(node, 0);
            const right = childToAST(node, 1);
            if (right instanceof ASTNode_Empty) return left;
            else {
                const sright = <ASTNode_Single>right;
                if (sright.ch === ch_star) return new ASTNode_RStar(left);
                else if (sright.ch === ch_plus) return new ASTNode_RPlus(left);
                else if (sright.ch === ch_ques) return new ASTNode_RQues(left);
                else throw new Error(`unknown character for REPEAT: ${sright.ch}`);
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
        handler: node => new ASTNode_Empty()
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

// make the handlermap
function straightThruGen(pos: number): PTN2ASTNConverter {
    return (node: ParseTreeMidNode): ASTNode_REGEX => {
        return childToAST(node, pos);
    };
}

// CONCAT & OR
function glueChildrenGen_OR(posright: number): PTN2ASTNConverter {
    return (node: ParseTreeMidNode): ASTNode_REGEX => {
        const left = childToAST(node, 0);
        const right = childToAST(node, posright);
        let children = left instanceof ASTNode_OR ? left.children : [left];
        children = children.concat(right instanceof ASTNode_OR ? right.children : [right]);
        return new ASTNode_OR(children);
    };
}

function single(node: ParseTreeMidNode): ASTNode_REGEX {
    return new ASTNode_Single((<ParseTreeTermNode>node.children[0]).token.rawstr.charCodeAt(0));
}

function range(node: ParseTreeMidNode): ASTNode_REGEX {
    return new ASTNode_Range((<ParseTreeTermNode>node.children[0]).token.rawstr.charCodeAt(0), (<ParseTreeTermNode>node.children[2]).token.rawstr.charCodeAt(0));
}

const ch_star = "*".charCodeAt(0);
const ch_plus = "+".charCodeAt(0);
const ch_ques = "?".charCodeAt(0);

function childToAST(node: ParseTreeMidNode, pos: number): ASTNode_REGEX {
    return processor.astConverter.toAST(<ParseTreeMidNode>node.children[pos]);
}

class ASTNode_Empty extends ASTNode_REGEX {}

const { prodSet, parser, astConverter } = processor;

export { prodSet, parser, astConverter };
