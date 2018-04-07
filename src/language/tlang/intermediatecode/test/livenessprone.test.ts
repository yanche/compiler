
import { livenessProne } from "../livenessprone";
import * as t from "../../tac";
import { IdGen } from "../../../../utility";
 import { assert } from "chai";
import { genCodeLines } from "./util";

describe("live-ness prone test", () => {
    it("assignment to dead register", () => {
        const regId = new IdGen();
        const r1 = regId.next();
        const codelines = genCodeLines([
            new t.TAC_loadint(10, r1)
        ]);
        livenessProne(codelines, [{ regbtmlive: [false], regtoplive: null }]);
        assert.strictEqual(codelines.length, 1);
        assert.strictEqual(codelines[0].tac instanceof t.TAC_noop, true);
    });

    it("assignment to live register", () => {
        const regId = new IdGen();
        const r1 = regId.next();
        const codelines = genCodeLines([
            new t.TAC_loadint(10, r1)
        ]);
        livenessProne(codelines, [{ regbtmlive: [true], regtoplive: null }]);
        assert.strictEqual(codelines.length, 1);
        assert.strictEqual(codelines[0].tac instanceof t.TAC_loadint, true);
    });
});
