
import { Edge } from "./index";

export class Transition implements Edge {
    src: number;
    tgt: number;
    sym: string;

    toString(): string {
        return this.src + "-" + this.sym + "->" + this.tgt;
    }

    constructor(src: number, tgt: number, sym: string) {
        this.src = src;
        this.tgt = tgt;
        this.sym = sym;
    }
}