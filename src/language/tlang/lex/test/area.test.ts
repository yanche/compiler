
import lex from "../../lex";
import { prodSet } from "../../syntax";
import * as assert from "assert";
import { Area, Token } from "../../../../compile";
import { readLexTokens } from "../../../../testutil";

describe("token area test", () => {
    it("happy path", () => {
        const lexRet = readLexTokens(lex("abc", prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 2);
        compareArea(tokens[0].area, { row: 1, col: 1 }, { row: 1, col: 3 });
    });

    it("2 tokens", () => {
        const lexRet = readLexTokens(lex("abc abc", prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 3);
        compareArea(tokens[0].area, { row: 1, col: 1 }, { row: 1, col: 3 });
        compareArea(tokens[1].area, { row: 1, col: 5 }, { row: 1, col: 7 });
    });

    it("leading spaces", () => {
        const lexRet = readLexTokens(lex("     abc", prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 2);
        compareArea(tokens[0].area, { row: 1, col: 6 }, { row: 1, col: 8 });
    });

    it("on second line", () => {
        const lexRet = readLexTokens(lex(`
  abc`, prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 2);
        compareArea(tokens[0].area, { row: 2, col: 3 }, { row: 2, col: 5 });
    });

    it("with comments", () => {
        const lexRet = readLexTokens(lex(`// abc
  abc`, prodSet));
        assert.ok(Array.isArray(lexRet));
        const tokens = <ReadonlyArray<Token>>lexRet;
        assert.strictEqual(tokens.length, 2);
        compareArea(tokens[0].area, { row: 2, col: 3 }, { row: 2, col: 5 });
    });
});

interface Posi {
    row: number;
    col: number;
}
function compareArea(area: Area, start: Posi, end: Posi) {
    assert.strictEqual(area.start.row, start.row);
    assert.strictEqual(area.start.col, start.col);
    assert.strictEqual(area.end.row, end.row);
    assert.strictEqual(area.end.col, end.col);
}
