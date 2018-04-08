
import { Edge } from "../utility";
export * from "./DFA/index";
export * from "./NFA/index";

export class Transition implements Edge {
    public toString(): string {
        return this.src + "-" + this.sym + "->" + this.tgt;
    }

    constructor(public readonly src: number, public readonly tgt: number, public readonly sym: string) { }
}
