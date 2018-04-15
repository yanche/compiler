import { LexIterator, Token, LexError } from "../compile";
import { arrayIterator } from "../utility";

function strictEqual(i1: any, i2: any): boolean {
    return i1 === i2;
};

//time cost: O(n^2), if copy array and sort first, it could be O(nlogn)
export function arrayEquivalent<T1, T2>(arr1: ReadonlyArray<T1>, arr2: ReadonlyArray<T2>, comparefn?: (v1: T1, v2: T2) => boolean) {
    if (arr1.length !== arr2.length) return false;
    comparefn = comparefn || strictEqual;
    const len = arr1.length;
    const metarr = new Array(len);
    for (let i = 0; i < len; ++i) {
        const item1 = arr1[i];
        let j = 0;
        for (; j < len; ++j) {
            if (metarr[j]) continue;
            const item2 = arr2[j];
            if (comparefn(item1, item2)) break;
        }
        if (j === len) return false; //not found
        metarr[j] = true;
    }
    return true;
};

export function makeLexIteratorFromArray(tokens: ReadonlyArray<Token>): LexIterator {
    return new LexIterator(arrayIterator(tokens));
}

export function readLexTokens(lexIterator: LexIterator): ReadonlyArray<Token> | LexError {
    const ret: Token[] = [];
    if (lexIterator.cur instanceof LexError) {
        return lexIterator.cur;
    }
    while (!lexIterator.done) {
        const cur = lexIterator.cur;
        if (cur instanceof LexError) {
            return cur;
        } else {
            ret.push(cur);
        }
        lexIterator.next();
    }
    return ret;
}

export function arrayEqual<T>(arr1: Array<T>, arr2: Array<T>): boolean {
    return arr1.length === arr2.length && arr1.every((item, idx) => item === arr2[idx]);
}
