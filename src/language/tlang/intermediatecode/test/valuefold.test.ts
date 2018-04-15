
import { inferValues, ValueType } from "../valueinfer";
import { valueFold } from "../valuefold";
import { CodeLine } from "../index";
import { CodeLabel } from "../../util";
import * as t from "../../tac";
import { IdGen } from "../../../../utility";
import * as assert from "assert";
import { assignLineNums, genCodeLines } from "./util";
import { finalizeLabelRef } from "../util";

describe("value fold test", () => {
    it("cannot fold", () => {
        const num = 5;
        const codelines = genCodeLines([new t.TAC_retint(num)]);
        valueFold(codelines, inferValues(codelines, 0, []));
        assert.strictEqual(codelines.length, 1);
        assert.ok(codelines[0].tac instanceof t.TAC_retint);
        assert.strictEqual((<t.TAC_retint>codelines[0].tac).num, num);
    });

    it("simple fold", () => {
        const num = 5, regId = new IdGen();
        const r1 = regId.next();
        const codelines = genCodeLines([new t.TAC_loadint(num, r1), new t.TAC_retreg(r1)]);
        valueFold(codelines, inferValues(codelines, regId.cur, []));
        assert.strictEqual(codelines.length, 2);
        assert.ok(codelines[1].tac instanceof t.TAC_retint);
        assert.strictEqual((<t.TAC_retint>codelines[1].tac).num, num);
    });

    it("branch fold", () => {
        const num1 = 5, num2 = 10, regId = new IdGen();
        const r1 = regId.next(), r2 = regId.next(), r3 = regId.next();
        const c1 = new CodeLine(new t.TAC_loadint(num1, r1));
        const c2 = new CodeLine(new t.TAC_loadint(num2, r2));
        const c3 = new CodeLine(new t.TAC_binary("<", r1, r2, r3));
        const l1 = new CodeLabel();
        const c4 = new CodeLine(new t.TAC_btrue(l1, r3));
        const c5 = new CodeLine(new t.TAC_retreg(r1));
        const c6 = new CodeLine(new t.TAC_retreg(r2), l1);
        const codelines = [c1, c2, c3, c4, c5, c6];
        assignLineNums(codelines);
        finalizeLabelRef(codelines);
        const valueInfers = inferValues(codelines, regId.cur, []);
        valueFold(codelines, valueInfers);
        assert.strictEqual(codelines.length, 6);
        assert.strictEqual(valueInfers[3][r3].type, ValueType.CONST);
        assert.strictEqual(valueInfers[3][r3].cons, 1);
        const tac4 = <t.TAC_branch>codelines[3].tac;
        assert.ok(tac4 instanceof t.TAC_branch, "btrue become branch because value is constant");
        assert.strictEqual(tac4.label, l1);
        assert.ok(codelines[4].tac instanceof t.TAC_noop, "first return should become noop");
    });

    it("fold after return", () => {
        const num = 5, regId = new IdGen();
        const r1 = regId.next();
        const codelines = genCodeLines([new t.TAC_ret(), new t.TAC_loadint(num, r1), new t.TAC_retreg(r1)]);
        valueFold(codelines, inferValues(codelines, regId.cur, []));
        assert.strictEqual(codelines.length, 3);
        assert.ok(codelines[1].tac instanceof t.TAC_noop);
        assert.ok(codelines[2].tac instanceof t.TAC_noop);
    });
});
