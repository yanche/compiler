
import { livenessProne } from "../livenessprone";
import { CodeLine } from "../index";
import * as t from "../../tac";
import { IdGen } from "../../../../utility";
import * as assert from "assert";
import { genCodeLines } from "./util";

describe("live-ness prone test", () => {
    it("assignment to dead register", () => {
        let regId = new IdGen();
        let r1 = regId.next();
        let codelines = genCodeLines([
            new t.TAC_loadint(10, r1)
        ]);
        livenessProne(codelines, [{ regbtmlive: [false], regtoplive: null }]);
        assert.strictEqual(codelines.length, 1);
        assert.strictEqual(codelines[0].tac instanceof t.TAC_noop, true);
    });

    it("assignment to live register", () => {
        let regId = new IdGen();
        let r1 = regId.next();
        let codelines = genCodeLines([
            new t.TAC_loadint(10, r1)
        ]);
        livenessProne(codelines, [{ regbtmlive: [true], regtoplive: null }]);
        assert.strictEqual(codelines.length, 1);
        assert.strictEqual(codelines[0].tac instanceof t.TAC_loadint, true);
    });
});
