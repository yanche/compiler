
import { IdGen, flatten } from "../../utility";
import { ASTNode } from "../../compile";
import { createNFA, NFA, Transition } from "../../automata";

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

function process_OR(node: ASTNode_OR, idgen: IdGen, start: number, terminal: number): Array<Transition> {
    return flatten(node.children.map(c => processAST(c, idgen, start, terminal)));
}
function process_CONCAT(node: ASTNode_Concat, idgen: IdGen, start: number, terminal: number): Array<Transition> {
    const transarr = new Array<Array<Transition>>(), len = node.children.length, children = node.children;
    let prevend = start;
    for (let i = 0; i < len; ++i) {
        const t = i === (len - 1) ? terminal : idgen.next()
        transarr.push(processAST(children[i], idgen, prevend, t));
        prevend = t;
    }
    return flatten(transarr);
}
function process_RStar(node: ASTNode_RStar, idgen: IdGen, start: number, terminal: number): Array<Transition> {
    return processAST(node.child, idgen, start, terminal).concat(new Transition(start, terminal, ""), new Transition(terminal, start, ""));
}
function process_RPlus(node: ASTNode_RPlus, idgen: IdGen, start: number, terminal: number): Array<Transition> {
    return processAST(node.child, idgen, start, terminal).concat(new Transition(terminal, start, ""));
}
function process_RQues(node: ASTNode_RQues, idgen: IdGen, start: number, terminal: number): Array<Transition> {
    return processAST(node.child, idgen, start, terminal).concat(new Transition(start, terminal, ""));
}
function process_Single(node: ASTNode_Single, idgen: IdGen, start: number, terminal: number): Array<Transition> {
    return [new Transition(start, terminal, String.fromCharCode(node.ch))];
}
function process_Range(node: ASTNode_Range, idgen: IdGen, start: number, terminal: number): Array<Transition> {
    if (node.lower > node.upper) throw new Error("invalid range expression: " + node.lower + "-" + node.upper);
    const ch1 = node.lower, ch2 = node.upper;
    const ret = new Array<Transition>(ch2 - ch1 + 1);
    for (let i = ch1; i <= ch2; ++i) {
        ret[i - ch1] = new Transition(start, terminal, String.fromCharCode(i));
    }
    return ret;
}

function processAST(node: ASTNode, idgen: IdGen, start: number, terminal: number): Array<Transition> {
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
    const idgen = new IdGen();
    const start = idgen.next(), end = idgen.next();
    const trans = processAST(root, idgen, start, end);
    return createNFA(trans, [start], [end]);
}
