
import * as utility from '../../utility';
import * as c from '../../compile';
import * as _ from 'lodash';
import * as nfa from '../../NFA';

export class ASTNode_OR extends c.ASTNode {
    constructor(public children: Array<c.ASTNode>) { super(); }
}
export class ASTNode_Concat extends c.ASTNode {
    constructor(public children: Array<c.ASTNode>) { super(); }
}
export class ASTNode_RStar extends c.ASTNode {
    constructor(public child: c.ASTNode) { super(); }
}
export class ASTNode_RPlus extends c.ASTNode {
    constructor(public child: c.ASTNode) { super(); }
}
export class ASTNode_RQues extends c.ASTNode {
    constructor(public child: c.ASTNode) { super(); }
}
export class ASTNode_Range extends c.ASTNode {
    constructor(public lower: number, public upper: number) { super(); }
}
export class ASTNode_Single extends c.ASTNode {
    constructor(public ch: number) { super(); }
}

function process_OR(node: ASTNode_OR, idgen: utility.IdGen, start: number, terminal: number): Array<utility.automata.Transition> {
    return _.flatten(node.children.map(c => processAST(c, idgen, start, terminal)));
}
function process_CONCAT(node: ASTNode_Concat, idgen: utility.IdGen, start: number, terminal: number): Array<utility.automata.Transition> {
    let transarr = new Array<Array<utility.automata.Transition>>(), len = node.children.length, children = node.children, prevend = start;
    for (let i = 0; i < len; ++i) {
        let t = i === (len - 1) ? terminal : idgen.next()
        transarr.push(processAST(children[i], idgen, prevend, t));
        prevend = t;
    }
    return _.flatten(transarr);
}
function process_RStar(node: ASTNode_RStar, idgen: utility.IdGen, start: number, terminal: number): Array<utility.automata.Transition> {
    return processAST(node.child, idgen, start, terminal).concat(new utility.automata.Transition(start, terminal, ''), new utility.automata.Transition(terminal, start, ''));
}
function process_RPlus(node: ASTNode_RPlus, idgen: utility.IdGen, start: number, terminal: number): Array<utility.automata.Transition> {
    return processAST(node.child, idgen, start, terminal).concat(new utility.automata.Transition(terminal, start, ''));
}
function process_RQues(node: ASTNode_RQues, idgen: utility.IdGen, start: number, terminal: number): Array<utility.automata.Transition> {
    return processAST(node.child, idgen, start, terminal).concat(new utility.automata.Transition(start, terminal, ''));
}
function process_Single(node: ASTNode_Single, idgen: utility.IdGen, start: number, terminal: number): Array<utility.automata.Transition> {
    return [new utility.automata.Transition(start, terminal, String.fromCharCode(node.ch))];
}
function process_Range(node: ASTNode_Range, idgen: utility.IdGen, start: number, terminal: number): Array<utility.automata.Transition> {
    if (node.lower > node.upper) throw new Error('invalid range expression: ' + node.lower + '-' + node.upper);
    let ch1 = node.lower, ch2 = node.upper;
    let ret = new Array<utility.automata.Transition>(ch2 - ch1 + 1);
    for (let i = ch1; i <= ch2; ++i) {
        ret[i - ch1] = new utility.automata.Transition(start, terminal, String.fromCharCode(i));
    }
    return ret;
}

function processAST(node: c.ASTNode, idgen: utility.IdGen, start: number, terminal: number): Array<utility.automata.Transition> {
    if (node instanceof ASTNode_OR) return process_OR(node, idgen, start, terminal);
    else if (node instanceof ASTNode_Concat) return process_CONCAT(node, idgen, start, terminal);
    else if (node instanceof ASTNode_RStar) return process_RStar(node, idgen, start, terminal);
    else if (node instanceof ASTNode_RPlus) return process_RPlus(node, idgen, start, terminal);
    else if (node instanceof ASTNode_RQues) return process_RQues(node, idgen, start, terminal);
    else if (node instanceof ASTNode_Single) return process_Single(node, idgen, start, terminal);
    else if (node instanceof ASTNode_Range) return process_Range(node, idgen, start, terminal);
    else throw new Error('unknown ast type of node');
}

export function astToNFA(root: c.ASTNode): nfa.NFA {
    let idgen = new utility.IdGen();
    let start = idgen.next(), end = idgen.next();
    let trans = processAST(root, idgen, start, end);
    return nfa.createNFA(trans, [start], [end]);
}
