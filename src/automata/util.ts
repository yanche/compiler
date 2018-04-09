
import { Edge, NodeId } from "../utility";

export class Transition implements Edge {
    public toString(): string {
        return this.src + "-" + this.sym + "->" + this.tgt;
    }

    constructor(public readonly src: NodeId, public readonly tgt: NodeId, public readonly sym: string) {
    }
}
