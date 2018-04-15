
import lex from "../../lex";
import { prodSet } from "../../syntax";
import { flatten } from "../../../../utility";
import { LexErrorCode, Token, LexError } from "../../../../compile";
import { assert } from "chai";
import { readLexTokens } from "../../../../testutil";

describe("token test", () => {
    it("keyword & special tokens", () => {
        const tripples = [">>>"];
        const doubles = ["&&", "||", "!=", "==", ">=", "<=", ">>", "<<"];
        const singles = ["(", ")", "{", "}", ",", ":", ";", "+", "-", "*", "/", ".", "~", "[", "]", "&", "|", "!", "=", ">", "<"];
        const keywords = ["void", "class", "constructor", "while", "do", "for", "if", "else", "return", "super", "new", "null", "break", "continue"];
        const all = flatten<string>([tripples, doubles, singles, keywords]);
        const lexRet = readLexTokens(lex(all.join(" "), prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length - 1, all.length);
        const lastToken = tokens[tokens.length - 1];
        assert.strictEqual(lastToken.rawstr, "$");
        assert.strictEqual(lastToken.symId, prodSet.getSymId("$"));
        tokens.slice(0, -1).forEach((t, idx) => {
            assert.strictEqual(t.rawstr, all[idx]);
            assert.strictEqual(t.symId, prodSet.getSymId(all[idx]));
        });
    });

    it("primitive types, boolean", () => {
        const lexRet = readLexTokens(lex("true false TRUE FALSE", prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 5);
        assert.strictEqual(tokens[0].symId, prodSet.getSymId("boolean"));
        assert.strictEqual(tokens[1].symId, prodSet.getSymId("boolean"));
        assert.strictEqual(tokens[2].symId, prodSet.getSymId("id"));
        assert.strictEqual(tokens[3].symId, prodSet.getSymId("id"));
    });

    it("primitive types, integer", () => {
        const lexRet = readLexTokens(lex("0 1 100", prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 4);
        tokens.slice(0, -1).forEach(t => assert.strictEqual(t.symId, prodSet.getSymId("integer")));
    });

    it("primitive types, negative integer", () => {
        const lexRet = readLexTokens(lex("-100 -1", prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 5);
        assert.strictEqual(tokens[0].symId, prodSet.getSymId("-"));
        assert.strictEqual(tokens[1].symId, prodSet.getSymId("integer"));
        assert.strictEqual(tokens[2].symId, prodSet.getSymId("-"));
        assert.strictEqual(tokens[3].symId, prodSet.getSymId("integer"));
    });

    it("primitive types, string", () => {
        const lexRet = readLexTokens(lex(`'abc' "abc"`, prodSet));
        console.info(lexRet);
        assert.ok(!Array.isArray(lexRet));
        const lexError = <LexError>lexRet;
        assert.strictEqual(lexError.errCode, LexErrorCode.INVALID_TOKEN);
    });

    it("variables", () => {
        const lexRet = readLexTokens(lex("abc a10 a_10 _abc_ ABC A__", prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 7);
        tokens.slice(0, -1).forEach(t => assert.strictEqual(t.symId, prodSet.getSymId("id")));
    });
});
