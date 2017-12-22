
import { CodeLine } from "../index";
import * as t from "../../tac";
import { IdGen } from "../../../../utility";
 import { assert } from "chai";
import { CodeLabel } from "../../util";
import { finalizeLabelRef } from "../util";
import { assignLineNums } from "./util";
import { removeBranch } from "../removebranch";

describe("remove branch test", () => {
    it("jump to next TAC", () => {
        let regId = new IdGen();
        let r1 = regId.next();
        let label = new CodeLabel();
        let c1 = new CodeLine(new t.TAC_btrue(label, r1));
        let c2 = new CodeLine(new t.TAC_retreg(r1), label);
        let codelines = [c1, c2];
        assignLineNums(codelines);
        finalizeLabelRef(codelines);
        removeBranch(codelines);
        assert.strictEqual(codelines.length, 2);
        assert.strictEqual(codelines[0].tac instanceof t.TAC_noop, true);
        assert.strictEqual(codelines[1].tac instanceof t.TAC_retreg, true);
        assert.strictEqual(codelines[1].label, null);
    });

    it("all noop between jump and jump target", () => {
        let regId = new IdGen();
        let r1 = regId.next();
        let label = new CodeLabel();
        let c1 = new CodeLine(new t.TAC_btrue(label, r1));
        let c2 = new CodeLine(new t.TAC_noop());
        let c3 = new CodeLine(new t.TAC_noop());
        let c4 = new CodeLine(new t.TAC_retreg(r1), label);
        let codelines = [c1, c2, c3, c4];
        assignLineNums(codelines);
        finalizeLabelRef(codelines);
        removeBranch(codelines);
        assert.strictEqual(codelines.length, 4);
        assert.strictEqual(codelines[0].tac instanceof t.TAC_noop, true);
        assert.strictEqual(codelines[1].tac instanceof t.TAC_noop, true);
        assert.strictEqual(codelines[2].tac instanceof t.TAC_noop, true);
        assert.strictEqual(codelines[3].tac instanceof t.TAC_retreg, true);
        assert.strictEqual(codelines[3].label, null);
    });

    it("not all noop between jump and jump target", () => {
        let regId = new IdGen();
        let r1 = regId.next();
        let label = new CodeLabel();
        let c1 = new CodeLine(new t.TAC_btrue(label, r1));
        let c2 = new CodeLine(new t.TAC_loadint(10, r1));
        let c3 = new CodeLine(new t.TAC_noop());
        let c4 = new CodeLine(new t.TAC_retreg(r1), label);
        let codelines = [c1, c2, c3, c4];
        assignLineNums(codelines);
        finalizeLabelRef(codelines);
        removeBranch(codelines);
        assert.strictEqual(codelines.length, 4);
        assert.strictEqual(codelines[0].tac instanceof t.TAC_btrue, true);
        assert.strictEqual(codelines[1].tac instanceof t.TAC_loadint, true);
        assert.strictEqual(codelines[2].tac instanceof t.TAC_noop, true);
        assert.strictEqual(codelines[3].tac instanceof t.TAC_retreg, true);
        assert.strictEqual(codelines[3].label, label);
    });
});
