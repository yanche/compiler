
import { IdGen, flatten, CharCode, NodeId } from "../../utility";
import { ASTNode } from "../../compile";
import { createNFA, NFA, Transition } from "../../automata";

export abstract class ASTNode_REGEX extends ASTNode {
    public toNFATransition(idGen: IdGen, start: NodeId, terminal: NodeId): ReadonlyArray<Transition> {
        throw new Error(`not implemented`)
    }

    public toNFA(): NFA {
        const idGen = new IdGen();
        const start = idGen.next();
        const end = idGen.next();
        const trans = this.toNFATransition(idGen, start, end);
        return createNFA(trans, [start], [end]);
    }
};

export class ASTNode_OR extends ASTNode_REGEX {
    constructor(public readonly children: ReadonlyArray<ASTNode_REGEX>) { super(); }

    public toNFATransition(idGen: IdGen, start: NodeId, terminal: NodeId): ReadonlyArray<Transition> {
        return flatten(this.children.map(c => c.toNFATransition(idGen, start, terminal)));
    }
}

export class ASTNode_Concat extends ASTNode_REGEX {
    constructor(public readonly children: ReadonlyArray<ASTNode_REGEX>) { super(); }

    public toNFATransition(idGen: IdGen, start: NodeId, terminal: NodeId): ReadonlyArray<Transition> {
        const len = this.children.length;
        let prevend = start;
        return flatten(this.children.map((c, idx) => {
            const t = idx === (len - 1) ? terminal : idGen.next();
            const ret = c.toNFATransition(idGen, prevend, t);
            prevend = t;
            return ret;
        }));
    }
}

export class ASTNode_RStar extends ASTNode_REGEX {
    constructor(public readonly child: ASTNode_REGEX) { super(); }

    public toNFATransition(idGen: IdGen, start: NodeId, terminal: NodeId): ReadonlyArray<Transition> {
        return this.child.toNFATransition(idGen, start, terminal).concat(new Transition(start, terminal, ""), new Transition(terminal, start, ""));
    }
}

export class ASTNode_RPlus extends ASTNode_REGEX {
    constructor(public readonly child: ASTNode_REGEX) { super(); }

    public toNFATransition(idGen: IdGen, start: NodeId, terminal: NodeId): ReadonlyArray<Transition> {
        return this.child.toNFATransition(idGen, start, terminal).concat(new Transition(terminal, start, ""));
    }
}

export class ASTNode_RQues extends ASTNode_REGEX {
    constructor(public readonly child: ASTNode_REGEX) { super(); }

    public toNFATransition(idGen: IdGen, start: NodeId, terminal: NodeId): ReadonlyArray<Transition> {
        return this.child.toNFATransition(idGen, start, terminal).concat(new Transition(start, terminal, ""));
    }
}

export class ASTNode_Range extends ASTNode_REGEX {
    constructor(public readonly lower: CharCode, public readonly upper: CharCode) { super(); }

    public toNFATransition(idGen: IdGen, start: NodeId, terminal: NodeId): ReadonlyArray<Transition> {
        const lower = this.lower;
        const upper = this.upper;
        if (lower > upper) throw new Error(`invalid range expression: ${String.fromCharCode(lower)}-${String.fromCharCode(upper)}`);
        const ret = new Array<Transition>(upper - lower + 1);
        for (let i = lower; i <= upper; ++i) {
            ret[i - lower] = new Transition(start, terminal, String.fromCharCode(i));
        }
        return ret;
    }
}

export class ASTNode_Single extends ASTNode_REGEX {
    constructor(public readonly ch: CharCode) { super(); }

    public toNFATransition(idGen: IdGen, start: NodeId, terminal: NodeId): ReadonlyArray<Transition> {
        return [new Transition(start, terminal, String.fromCharCode(this.ch))];
    }
}
