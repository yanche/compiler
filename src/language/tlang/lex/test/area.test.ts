
import lex from "../../lex";
import { prodSet } from "../../syntax";
import { assert } from "chai";
import { Area } from "../../../../compile";

describe("token area test", () => {
    it("happy path", () => {
        const lexRet = lex("abc", prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 2);
        compareArea(tokens[0].area, { row: 1, col: 1 }, { row: 1, col: 3 });
    });

    it("2 tokens", () => {
        const lexRet = lex("abc abc", prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 3);
        compareArea(tokens[0].area, { row: 1, col: 1 }, { row: 1, col: 3 });
        compareArea(tokens[1].area, { row: 1, col: 5 }, { row: 1, col: 7 });
    });

    it("leading spaces", () => {
        const lexRet = lex("     abc", prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 2);
        compareArea(tokens[0].area, { row: 1, col: 6 }, { row: 1, col: 8 });
    });

    it("on second line", () => {
        const lexRet = lex(`
  abc`, prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
        assert.strictEqual(tokens.length, 2);
        compareArea(tokens[0].area, { row: 2, col: 3 }, { row: 2, col: 5 });
    });

    it("with comments", () => {
        const lexRet = lex(`// abc
  abc`, prodSet);
        assert.ok(lexRet.accept);
        const tokens = lexRet.tokens;
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
