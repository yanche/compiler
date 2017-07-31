
import * as utility from "./index";

export class Transition implements utility.Edge {
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