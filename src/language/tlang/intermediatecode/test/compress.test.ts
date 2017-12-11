
import { CodeLine } from "../index";
import * as t from "../../tac";
import { IdGen } from "../../../../utility";
import * as assert from "assert";
import { CodeLabel } from "../../util";
import { finalizeLabelRef } from "../util";
import { assignLineNums, genCodeLines } from "./util";
import { compress } from "../compress";
import { inferLiveness } from "../livenessinfer";

describe("compress code lines test", () => {
    it("remove noop TAC", () => {
        let regId = new IdGen();
        let r1 = regId.next();
        let codelines = genCodeLines([
            new t.TAC_loadint(10, r1),
            new t.TAC_noop(),
            new t.TAC_retreg(r1)
        ]);
        let liveness = inferLiveness(codelines, regId.cur);
        let cret = compress(codelines, liveness, new IdGen());
        assert.strictEqual(cret.codelines.length, 2);
        assert.strictEqual(cret.codelines[0].tac instanceof t.TAC_loadint, true);
        assert.strictEqual(cret.codelines[1].tac instanceof t.TAC_retreg, true);
    });

    it("reset jump target if it's jumping to noop", () => {
        let regId = new IdGen();
        let r1 = regId.next();
        let label = new CodeLabel();
        let c1 = new CodeLine(new t.TAC_btrue(label, r1)); // jump to c3
        let c2 = new CodeLine(new t.TAC_loadint(10, r1));
        let c3 = new CodeLine(new t.TAC_noop(), label);
        let c4 = new CodeLine(new t.TAC_retreg(r1));
        let codelines = [c1, c2, c3, c4];
        finalizeLabelRef(codelines);
        assignLineNums(codelines);
        let liveness = inferLiveness(codelines, regId.cur);
        let cret = compress(codelines, liveness, new IdGen());
        assert.strictEqual(cret.codelines.length, 3);
        assert.strictEqual(cret.codelines[0].tac instanceof t.TAC_btrue, true);
        assert.strictEqual(cret.codelines[1].tac instanceof t.TAC_loadint, true);
        assert.strictEqual(cret.codelines[2].tac instanceof t.TAC_retreg, true);
        assert.strictEqual((<t.TAC_btrue>cret.codelines[0].tac).label.owner, cret.codelines[2]);
    });

    it("reset and unify jump target label", () => {
        let regId = new IdGen();
        let r1 = regId.next(), r2 = regId.next();
        let label1 = new CodeLabel();
        let label2 = new CodeLabel();
        let c1 = new CodeLine(new t.TAC_btrue(label1, r1)); // jump to c4
        let c2 = new CodeLine(new t.TAC_btrue(label2, r2)); // jump to c5
        let c3 = new CodeLine(new t.TAC_loadint(10, r1));
        let c4 = new CodeLine(new t.TAC_noop(), label1);
        let c5 = new CodeLine(new t.TAC_noop(), label2);
        let c6 = new CodeLine(new t.TAC_retreg(r1));
        let codelines = [c1, c2, c3, c4, c5, c6];
        finalizeLabelRef(codelines);
        assignLineNums(codelines);
        let liveness = inferLiveness(codelines, regId.cur);
        let cret = compress(codelines, liveness, new IdGen());
        assert.strictEqual(cret.codelines.length, 4);
        assert.strictEqual(cret.codelines[0].tac instanceof t.TAC_btrue, true);
        assert.strictEqual(cret.codelines[1].tac instanceof t.TAC_btrue, true);
        assert.strictEqual(cret.codelines[2].tac instanceof t.TAC_loadint, true);
        assert.strictEqual(cret.codelines[3].tac instanceof t.TAC_retreg, true);
        assert.strictEqual((<t.TAC_btrue>cret.codelines[0].tac).label.owner, cret.codelines[3]);
        assert.strictEqual((<t.TAC_btrue>cret.codelines[1].tac).label.owner, cret.codelines[3]); // jump to same target
        assert.strictEqual((<t.TAC_btrue>cret.codelines[1].tac).label, (<t.TAC_btrue>cret.codelines[0].tac).label); // by using same label
    });
});
