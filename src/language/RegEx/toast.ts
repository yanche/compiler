
import * as c from '../../compile';
import parser from './parser';
import * as ap from './astprocess';


let handlermap = new Map<string, (node: c.ParseTreeMidNode) => c.ASTNode>();

//make the handlermap
function straightThruGen(pos: number): (node: c.ParseTreeMidNode) => c.ASTNode {
    return function (node: c.ParseTreeMidNode): c.ASTNode {
        return converter.toAST(<c.ParseTreeMidNode>node.children[pos]);
    };
}
let straightThru0 = straightThruGen(0);
let straightThru1 = straightThruGen(1);

//CONCAT & OR
function glueChildrenGen_OR(posright: number): (node: c.ParseTreeMidNode) => c.ASTNode {
    return function (node: c.ParseTreeMidNode): c.ASTNode {
        let left = childToAST(node, 0), right = childToAST(node, posright);
        let children = left instanceof ap.ASTNode_OR ? left.children : [left];
        children = children.concat(right instanceof ap.ASTNode_OR ? right.children : [right]);
        return new ap.ASTNode_OR(children);
    };
}
function single(node: c.ParseTreeMidNode): c.ASTNode {
    return new ap.ASTNode_Single((<c.ParseTreeTermNode>node.children[0]).token.rawstr.charCodeAt(0));
}
function range(node: c.ParseTreeMidNode): c.ASTNode {
    return new ap.ASTNode_Range((<c.ParseTreeTermNode>node.children[0]).token.rawstr.charCodeAt(0), (<c.ParseTreeTermNode>node.children[2]).token.rawstr.charCodeAt(0));
}

let ch_star = '*'.charCodeAt(0);
let ch_plus = '+'.charCodeAt(0);
let ch_ques = '?'.charCodeAt(0);
handlermap.set('RE -> S-RE', straightThru0);
handlermap.set('RE -> S-RE | RE', glueChildrenGen_OR(2));
handlermap.set('S-RE -> B-RE', straightThru0);
handlermap.set('S-RE -> B-RE S-RE', node => {
    let left = childToAST(node, 0), right = childToAST(node, 1);
    let children = left instanceof ap.ASTNode_Concat ? left.children : [left];
    children = children.concat(right instanceof ap.ASTNode_Concat ? right.children : [right]);
    return new ap.ASTNode_Concat(children);
});
handlermap.set('REPEAT -> ', node => null);
handlermap.set('REPEAT -> *', single);
handlermap.set('REPEAT -> +', single);
handlermap.set('REPEAT -> ?', single);
handlermap.set('B-RE -> E-RE REPEAT', node => {
    let left = childToAST(node, 0), right = childToAST(node, 1);
    if (right == null) return left;
    else {
        let sright = <ap.ASTNode_Single>right;
        if (sright.ch === ch_star) return new ap.ASTNode_RStar(left);
        else if (sright.ch === ch_plus) return new ap.ASTNode_RPlus(left);
        else if (sright.ch === ch_ques) return new ap.ASTNode_RQues(left);
        else throw new Error('impossible code path: ' + sright.ch);
    }
});
handlermap.set('E-RE -> ( RE )', straightThru1);
handlermap.set('E-RE -> SINGLE-INPUT', straightThru0);
handlermap.set('E-RE -> SET', straightThru0);
handlermap.set('SET -> P-SET', straightThru0);
handlermap.set('P-SET -> [ SET-ITEMS ]', straightThru1);
handlermap.set('SET-ITEMS -> SINGLE-INPUT', straightThru0);
handlermap.set('SET-ITEMS -> SINGLE-INPUT SET-ITEMS', glueChildrenGen_OR(1));
handlermap.set('SINGLE-INPUT -> CHAR', straightThru0);
handlermap.set('SINGLE-INPUT -> GROUP-SINGLE-INPUT', straightThru0);
handlermap.set('CHAR -> l_letter', single);
handlermap.set('CHAR -> u_letter', single);
handlermap.set('CHAR -> digit', single);
handlermap.set('GROUP-SINGLE-INPUT -> l_letter - l_letter', range);
handlermap.set('GROUP-SINGLE-INPUT -> u_letter - u_letter', range);
handlermap.set('GROUP-SINGLE-INPUT -> digit - digit', range);
//end make the handlermap


function childToAST(node: c.ParseTreeMidNode, pos: number): c.ASTNode {
    return converter.toAST(<c.ParseTreeMidNode>node.children[pos]);
}

let converter = new c.ASTConverter<c.ASTNode>(parser.prodset, handlermap);

export default converter;
