
import lex from "../../lex";
import { prodSet } from "../../syntax";
 import { assert } from "chai";
import { readLexTokens } from "../../../../testutil";
import { Token } from "../../../../compile";

describe("comments test", () => {
    it("comments, inline", () => {
        const lexRet = readLexTokens(lex(`a // what are you`, prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 2);
        assert.strictEqual(tokens[0].rawstr, "a");
    });

    it("comments, block", () => {
        const lexRet = readLexTokens(lex(`a /*
        this is a number
        */ cdf`, prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "cdf");
    });

    it("comments, inline inside block", () => {
        const lexRet = readLexTokens(lex(`a /*
        // inline comment inside block comment
        */ cdf`, prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "cdf");
    });

    it("comments, inline inside block", () => {
        const lexRet = readLexTokens(lex(`a 
        // block comment inside /*inside*/ inline comment
        cdf`, prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "cdf");
    });

    it("comments, block comment inline", () => {
        const lexRet = readLexTokens(lex(`a /* asdlkasdjla */ b`, prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "b");
    });

    it("comments, not perfect block comment", () => {
        const lexRet = readLexTokens(lex(`a /* * / asdlkasdjla **/ b`, prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 3);
        assert.strictEqual(tokens[0].rawstr, "a");
        assert.strictEqual(tokens[1].rawstr, "b");
    });
});
