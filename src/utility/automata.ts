
import * as utility from './index';

export class Transition implements utility.Edge {
    src: number;
    tgt: number;
    sym: string;
    stringify(): string {
        return this.src + '-' + this.sym + '->' + this.tgt;
    }
    constructor(src: number, tgt: number, sym: string) {
        sym = sym === " " ? sym : (sym || "").trim();
        if (sym.length !== 1) throw new Error(`symbol length must be 1: ${sym}`);
        this.src = src;
        this.tgt = tgt;
        this.sym = sym;
    }
}