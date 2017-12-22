
import lex from "../../lex";
import { prodSet } from "../../syntax";
import { flatten } from "../../../../utility";
import { LexErrorCode } from "../../../../compile";
 import { assert } from "chai";

describe("token test", () => {
    it("keyword & special tokens", () => {
        let tripples = [">>>"];
        let doubles = ["&&", "||", "!=", "==", ">=", "<=", ">>", "<<"];
        let singles = ["(", ")", "{", "}", ",", ":", ";", "+", "-", "*", "/", ".", "~", "[", "]", "&", "|", "!", "=", ">", "<"];
        let keywords = ["void", "class", "constructor", "while", "do", "for", "if", "else", "return", "super", "new", "null", "break", "continue"];
        let all = flatten([tripples, doubles, singles, keywords]);
        let lexRet = lex(all.join(" "), prodSet);
        assert.ok(lexRet.accept);
        assert.strictEqual(lexRet.tokens.length - 1, all.length);
        let lastToken = lexRet.tokens[lexRet.tokens.length - 1];
        assert.strictEqual(lastToken.rawstr, "");
        assert.strictEqual(lastToken.symnum, prodSet.getSymNum("$"));
        lexRet.tokens.slice(0, -1).forEach((t, idx) => {
            assert.strictEqual(t.rawstr, all[idx]);
            assert.strictEqual(t.symnum, prodSet.getSymNum(all[idx]));
        });
    });

    it("primitive types, boolean", () => {
        let lexRet = lex("true false TRUE FALSE", prodSet);
        assert.ok(lexRet.accept);
        let tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 5);
        assert.strictEqual(tokens[0].symnum, prodSet.getSymNum("boolean"));
        assert.strictEqual(tokens[1].symnum, prodSet.getSymNum("boolean"));
        assert.strictEqual(tokens[2].symnum, prodSet.getSymNum("id"));
        assert.strictEqual(tokens[3].symnum, prodSet.getSymNum("id"));
    });

    it("primitive types, integer", () => {
        let lexRet = lex("0 1 100", prodSet);
        assert.ok(lexRet.accept);
        let tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 4);
        tokens.slice(0, -1).forEach(t => assert.strictEqual(t.symnum, prodSet.getSymNum("integer")));
    });

    it("primitive types, negative integer", () => {
        let lexRet = lex("-100 -1", prodSet);
        assert.ok(lexRet.accept);
        let tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 5);
        assert.strictEqual(tokens[0].symnum, prodSet.getSymNum("-"));
        assert.strictEqual(tokens[1].symnum, prodSet.getSymNum("integer"));
        assert.strictEqual(tokens[2].symnum, prodSet.getSymNum("-"));
        assert.strictEqual(tokens[3].symnum, prodSet.getSymNum("integer"));
    });

    it("primitive types, string", () => {
        let lexRet = lex(`'abc' "abc"`, prodSet);
        assert.ok(!lexRet.accept);
        assert.strictEqual(lexRet.error.errCode, LexErrorCode.INVALID_TOKEN);
    });

    it("variables", () => {
        let lexRet = lex("abc a10 a_10 _abc_ ABC A__", prodSet);
        assert.ok(lexRet.accept);
        let tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 7);
        tokens.slice(0, -1).forEach(t => assert.strictEqual(t.symnum, prodSet.getSymNum("id")));
    });
});
