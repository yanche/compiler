
import { automata, IdGen, flatten } from "../../utility";
import { ASTNode } from "../../compile";
import { createNFA, NFA } from "../../NFA";

export class ASTNode_OR extends ASTNode {
    constructor(public children: Array<ASTNode>) { super(); }
}
export class ASTNode_Concat extends ASTNode {
    constructor(public children: Array<ASTNode>) { super(); }
}
export class ASTNode_RStar extends ASTNode {
    constructor(public child: ASTNode) { super(); }
}
export class ASTNode_RPlus extends ASTNode {
    constructor(public child: ASTNode) { super(); }
}
export class ASTNode_RQues extends ASTNode {
    constructor(public child: ASTNode) { super(); }
}
export class ASTNode_Range extends ASTNode {
    constructor(public lower: number, public upper: number) { super(); }
}
export class ASTNode_Single extends ASTNode {
    constructor(public ch: number) { super(); }
}

function process_OR(node: ASTNode_OR, idgen: IdGen, start: number, terminal: number): Array<automata.Transition> {
    return flatten(node.children.map(c => processAST(c, idgen, start, terminal)));
}
function process_CONCAT(node: ASTNode_Concat, idgen: IdGen, start: number, terminal: number): Array<automata.Transition> {
    let transarr = new Array<Array<automata.Transition>>(), len = node.children.length, children = node.children, prevend = start;
    for (let i = 0; i < len; ++i) {
        let t = i === (len - 1) ? terminal : idgen.next()
        transarr.push(processAST(children[i], idgen, prevend, t));
        prevend = t;
    }
    return flatten(transarr);
}
function process_RStar(node: ASTNode_RStar, idgen: IdGen, start: number, terminal: number): Array<automata.Transition> {
    return processAST(node.child, idgen, start, terminal).concat(new automata.Transition(start, terminal, ""), new automata.Transition(terminal, start, ""));
}
function process_RPlus(node: ASTNode_RPlus, idgen: IdGen, start: number, terminal: number): Array<automata.Transition> {
    return processAST(node.child, idgen, start, terminal).concat(new automata.Transition(terminal, start, ""));
}
function process_RQues(node: ASTNode_RQues, idgen: IdGen, start: number, terminal: number): Array<automata.Transition> {
    return processAST(node.child, idgen, start, terminal).concat(new automata.Transition(start, terminal, ""));
}
function process_Single(node: ASTNode_Single, idgen: IdGen, start: number, terminal: number): Array<automata.Transition> {
    return [new automata.Transition(start, terminal, String.fromCharCode(node.ch))];
}
function process_Range(node: ASTNode_Range, idgen: IdGen, start: number, terminal: number): Array<automata.Transition> {
    if (node.lower > node.upper) throw new Error("invalid range expression: " + node.lower + "-" + node.upper);
    let ch1 = node.lower, ch2 = node.upper;
    let ret = new Array<automata.Transition>(ch2 - ch1 + 1);
    for (let i = ch1; i <= ch2; ++i) {
        ret[i - ch1] = new automata.Transition(start, terminal, String.fromCharCode(i));
    }
    return ret;
}

function processAST(node: ASTNode, idgen: IdGen, start: number, terminal: number): Array<automata.Transition> {
    if (node instanceof ASTNode_OR) return process_OR(node, idgen, start, terminal);
    else if (node instanceof ASTNode_Concat) return process_CONCAT(node, idgen, start, terminal);
    else if (node instanceof ASTNode_RStar) return process_RStar(node, idgen, start, terminal);
    else if (node instanceof ASTNode_RPlus) return process_RPlus(node, idgen, start, terminal);
    else if (node instanceof ASTNode_RQues) return process_RQues(node, idgen, start, terminal);
    else if (node instanceof ASTNode_Single) return process_Single(node, idgen, start, terminal);
    else if (node instanceof ASTNode_Range) return process_Range(node, idgen, start, terminal);
    else throw new Error("unknown ast type of node");
}

export function astToNFA(root: ASTNode): NFA {
    let idgen = new IdGen();
    let start = idgen.next(), end = idgen.next();
    let trans = processAST(root, idgen, start, end);
    return createNFA(trans, [start], [end]);
}
