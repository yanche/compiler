
import { inferValues, ValueType } from "../valueinfer";
import { valueFold } from "../valuefold";
import { CodeLine } from "../index";
import { CodeLabel } from "../../util";
import * as t from "../../tac";
import { IdGen } from "../../../../utility";
import * as assert from "assert";

describe("value fold test", () => {
    it("cannot fold", () => {
        let num = 5;
        let c1 = new CodeLine(new t.TAC_retint(num));
        c1.linenum = 0;
        let codelines = [c1];
        valueFold(codelines, inferValues(codelines, 0, []));
        assert.strictEqual(codelines.length, 1);
        assert.ok(codelines[0].tac instanceof t.TAC_retint);
        assert.strictEqual((<t.TAC_retint>codelines[0].tac).num, num);
    });

    it("simple fold", () => {
        let num = 5, regId = new IdGen();
        let r1 = regId.next();
        let c1 = new CodeLine(new t.TAC_loadint(num, r1));
        c1.linenum = 0;
        let c2 = new CodeLine(new t.TAC_retreg(r1));
        c2.linenum = 1;
        let codelines = [c1, c2];
        valueFold(codelines, inferValues(codelines, regId.cur, []));
        assert.strictEqual(codelines.length, 2);
        assert.ok(codelines[1].tac instanceof t.TAC_retint);
        assert.strictEqual((<t.TAC_retint>codelines[1].tac).num, num);
    });

    it("branch fold", () => {
        let num1 = 5, num2 = 10, regId = new IdGen();
        let r1 = regId.next(), r2 = regId.next(), r3 = regId.next();
        let c1 = new CodeLine(new t.TAC_loadint(num1, r1));
        c1.linenum = 0;
        let c2 = new CodeLine(new t.TAC_loadint(num2, r2));
        c2.linenum = 1;
        let c3 = new CodeLine(new t.TAC_binary("<", r1, r2, r3));
        c3.linenum = 2;
        let l1 = new CodeLabel();
        l1.num = 0;
        let c4 = new CodeLine(new t.TAC_btrue(l1, r3));
        c4.linenum = 3;
        l1.upstreams = [c4];
        let c5 = new CodeLine(new t.TAC_retreg(r1));
        c5.linenum = 4;
        let c6 = new CodeLine(new t.TAC_retreg(r2), l1);
        c6.linenum = 5;
        l1.owner = c6;
        let codelines = [c1, c2, c3, c4, c5, c6];
        let valueInfers = inferValues(codelines, regId.cur, []);
        valueFold(codelines, valueInfers);
        assert.strictEqual(codelines.length, 6);
        assert.strictEqual(valueInfers[3][r3].type, ValueType.CONST);
        assert.strictEqual(valueInfers[3][r3].cons, 1);
        let tac4 = <t.TAC_branch>codelines[3].tac;
        assert.ok(tac4 instanceof t.TAC_branch, "btrue become branch because value is constant");
        assert.strictEqual(tac4.label, l1);
        assert.ok(codelines[4].tac instanceof t.TAC_noop, "first return should become noop");
    });

    it("fold after return", () => {
        let num = 5, regId = new IdGen();
        let r1 = regId.next();
        let c1 = new CodeLine(new t.TAC_ret());
        c1.linenum = 0;
        let c2 = new CodeLine(new t.TAC_loadint(num, r1));
        c2.linenum = 1;
        let c3 = new CodeLine(new t.TAC_retreg(r1));
        c3.linenum = 2;
        let codelines = [c1, c2, c3];
        valueFold(codelines, inferValues(codelines, regId.cur, []));
        assert.strictEqual(codelines.length, 3);
        assert.ok(codelines[1].tac instanceof t.TAC_noop);
        assert.ok(codelines[2].tac instanceof t.TAC_noop);
    });
});
