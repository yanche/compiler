
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
        const regId = new IdGen();
        const r1 = regId.next();
        const label = new CodeLabel();
        const c1 = new CodeLine(new t.TAC_btrue(label, r1));
        const c2 = new CodeLine(new t.TAC_retreg(r1), label);
        const codelines = [c1, c2];
        assignLineNums(codelines);
        finalizeLabelRef(codelines);
        removeBranch(codelines);
        assert.strictEqual(codelines.length, 2);
        assert.strictEqual(codelines[0].tac instanceof t.TAC_noop, true);
        assert.strictEqual(codelines[1].tac instanceof t.TAC_retreg, true);
        assert.strictEqual(codelines[1].label, null);
    });

    it("all noop between jump and jump target", () => {
        const regId = new IdGen();
        const r1 = regId.next();
        const label = new CodeLabel();
        const c1 = new CodeLine(new t.TAC_btrue(label, r1));
        const c2 = new CodeLine(new t.TAC_noop());
        const c3 = new CodeLine(new t.TAC_noop());
        const c4 = new CodeLine(new t.TAC_retreg(r1), label);
        const codelines = [c1, c2, c3, c4];
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
        const regId = new IdGen();
        const r1 = regId.next();
        const label = new CodeLabel();
        const c1 = new CodeLine(new t.TAC_btrue(label, r1));
        const c2 = new CodeLine(new t.TAC_loadint(10, r1));
        const c3 = new CodeLine(new t.TAC_noop());
        const c4 = new CodeLine(new t.TAC_retreg(r1), label);
        const codelines = [c1, c2, c3, c4];
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
