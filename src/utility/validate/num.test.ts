
import * as assert from "assert";
import { isInt, isNum } from "./num";

describe("validate number test", () => {
    it("isNum", () => {
        assert.strictEqual(isNum(1), true);
        assert.strictEqual(isNum(0), true);
        assert.strictEqual(isNum(-11), true);
        assert.strictEqual(isNum("abc"), false);
        assert.strictEqual(isNum(false), false);
        assert.strictEqual(isNum(true), false);
        assert.strictEqual(isNum({}), false);
        assert.strictEqual(isNum([]), false);
        assert.strictEqual(isNum(null), false);
        assert.strictEqual(isNum(undefined), false);
    });

    it("isInt", () => {
        assert.strictEqual(isInt(1), true);
        assert.strictEqual(isInt(0), true);
        assert.strictEqual(isInt(-11), true);
        assert.strictEqual(isInt(-11.5), false);
        assert.strictEqual(isInt(0.99), false);
        assert.strictEqual(isInt(123.2366), false);
        assert.strictEqual(isInt("abc"), false);
        assert.strictEqual(isInt(false), false);
        assert.strictEqual(isInt(true), false);
        assert.strictEqual(isInt({}), false);
        assert.strictEqual(isInt([]), false);
        assert.strictEqual(isInt(null), false);
        assert.strictEqual(isInt(undefined), false);
    });
});
