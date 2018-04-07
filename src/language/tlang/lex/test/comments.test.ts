
import lex from "../../lex";
import { prodSet } from "../../syntax";
 import { assert } from "chai";

describe("comments test", () => {
    it("comments, inline", () => {
        const lexRet = lex(`a // what are you`, prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 2);
        assert.strictEqual(tokens[0].rawstr, "a");
    });

    it("comments, block", () => {
        const lexRet = lex(`a /*
        this is a number
        */ cdf`, prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "cdf");
    });

    it("comments, inline inside block", () => {
        const lexRet = lex(`a /*
        // inline comment inside block comment
        */ cdf`, prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "cdf");
    });

    it("comments, inline inside block", () => {
        const lexRet = lex(`a 
        // block comment inside /*inside*/ inline comment
        cdf`, prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "cdf");
    });

    it("comments, block comment inline", () => {
        const lexRet = lex(`a /* asdlkasdjla */ b`, prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "b");
    });

    it("comments, not perfect block comment", () => {
        const lexRet = lex(`a /* * / asdlkasdjla **/ b`, prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "b");
    });
});
