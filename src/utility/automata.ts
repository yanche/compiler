
import * as utility from './index';

export class Transition implements utility.Edge {
    src: number;
    tgt: number;
    str: string;
    stringify(): string {
        return this.src + '-' + this.str + '->' + this.tgt;
    }
    constructor(src: number, tgt: number, str: string) {
        this.src = src;
        this.tgt = tgt;
        this.str = str;
    }
}