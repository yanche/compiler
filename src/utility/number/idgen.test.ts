
import { IdGen } from "./idgen";
import * as assert from "assert";

describe('IdGen', () => {
    it('general test', () => {
        const idGen = new IdGen();
        assert.strictEqual(idGen.cur, 0);
        assert.strictEqual(idGen.next(), 0);
        assert.strictEqual(idGen.next(), 1);
        assert.strictEqual(idGen.cur, 2);
    });

    it('provide start point', () => {
        const idGen = new IdGen(123);
        assert.strictEqual(idGen.cur, 123);
        assert.strictEqual(idGen.next(), 123);
        assert.strictEqual(idGen.next(), 124);
        assert.strictEqual(idGen.cur, 125);
    });

    it('provide negative start point', () => {
        const idGen = new IdGen(-123);
        assert.strictEqual(idGen.cur, -123);
        assert.strictEqual(idGen.next(), -123);
        assert.strictEqual(idGen.next(), -122);
        assert.strictEqual(idGen.cur, -121);
    });

    it('provide bad start point', () => {
        assert.throws(() => new IdGen(0.5));
    });
});
