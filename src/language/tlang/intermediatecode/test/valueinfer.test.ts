
import * as assert from "assert";
import { ValueInference, ValueType, merge, ANY, NEVER, equal, inferValues } from "../valueinfer";
import { CodeLine } from "../index";
import { CodeLabel } from "../../util";
import * as t from "../../tac";
import { IdGen } from "../../../../utility";
import { assignLineNums, genCodeLines } from "./util";
import { finalizeLabelRef } from "../util";

describe("type always goes up, from NEVER to ANY", () => {
    (<{
        title: string;
        into: ValueInference;
        from: ValueInference[];
        result: ValueInference;
        changed: boolean;
    }[]>[{
        title: "merge ANY into ANY",
        into: ANY,
        from: [ANY],
        result: ANY,
        changed: false,
    }, {
        title: "merge CONS into ANY",
        into: ANY,
        from: [{ type: ValueType.CONST, cons: 10 }],
        result: ANY,
        changed: false,
    }, {
        title: "merge CONS_REG into ANY",
        into: ANY,
        from: [{ type: ValueType.CONST_TIMES_REG, cons: 10, regnum: 1 }],
        result: ANY,
        changed: false,
    }, {
        title: "merge NEVER into ANY",
        into: ANY,
        from: [NEVER],
        result: ANY,
        changed: false,
    }, {
        title: "merge ANY into NEVER",
        into: NEVER,
        from: [ANY],
        result: ANY,
        changed: true,
    }, {
        title: "merge CONS into NEVER",
        into: NEVER,
        from: [{ type: ValueType.CONST, cons: 10 }],
        result: { type: ValueType.CONST, cons: 10 },
        changed: true,
    }, {
        title: "merge CONS_REG into NEVER",
        into: NEVER,
        from: [{ type: ValueType.CONST_TIMES_REG, cons: 10, regnum: 2 }],
        result: { type: ValueType.CONST_TIMES_REG, cons: 10, regnum: 2 },
        changed: true,
    }, {
        title: "merge NEVER into NEVER",
        into: NEVER,
        from: [NEVER],
        result: NEVER,
        changed: false,
    }, {
        title: "merge NEVER into CONS",
        into: { type: ValueType.CONST, cons: 10 },
        from: [NEVER],
        result: { type: ValueType.CONST, cons: 10 },
        changed: false,
    }, {
        title: "merge ANY into CONS",
        into: { type: ValueType.CONST, cons: 10 },
        from: [ANY],
        result: ANY,
        changed: true,
    }, {
        title: "merge CONS into CONS, same value",
        into: { type: ValueType.CONST, cons: 10 },
        from: [{ type: ValueType.CONST, cons: 10 }],
        result: { type: ValueType.CONST, cons: 10 },
        changed: false,
    }, {
        title: "merge CONS into CONS, different value",
        into: { type: ValueType.CONST, cons: 10 },
        from: [{ type: ValueType.CONST, cons: 20 }],
        result: ANY,
        changed: true,
    }, {
        title: "merge CONS_REG into CONS",
        into: { type: ValueType.CONST, cons: 10 },
        from: [{ type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 }],
        result: ANY,
        changed: true,
    }, {
        title: "merge NEVER into CONS_REG",
        into: { type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 },
        from: [NEVER],
        result: { type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 },
        changed: false,
    }, {
        title: "merge ANY into CONS_REG",
        into: { type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 },
        from: [ANY],
        result: ANY,
        changed: true,
    }, {
        title: "merge CONS_REG into CONS_REG, exactly same",
        into: { type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 },
        from: [{ type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 }],
        result: { type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 },
        changed: false,
    }, {
        title: "merge CONS_REG into CONS_REG, same regnum",
        into: { type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 },
        from: [{ type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 20 }],
        result: ANY,
        changed: true,
    }, {
        title: "merge CONS_REG into CONS_REG, same cons",
        into: { type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 },
        from: [{ type: ValueType.CONST_TIMES_REG, regnum: 2, cons: 10 }],
        result: ANY,
        changed: true,
    }, {
        title: "merge CONS_REG into CONS_REG, different values",
        into: { type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 },
        from: [{ type: ValueType.CONST_TIMES_REG, regnum: 2, cons: 20 }],
        result: ANY,
        changed: true,
    }, {
        title: "merge CONS into CONS_REG",
        into: { type: ValueType.CONST_TIMES_REG, regnum: 1, cons: 10 },
        from: [{ type: ValueType.CONST, cons: 10 }],
        result: ANY,
        changed: true,
    }]).forEach(params => {
        it(params.title, () => {
            const result = merge(params.into, params.from);
            assert.strictEqual(result.type, params.result.type, "result's infer type should be expected");
            assert.strictEqual(result.cons, params.result.cons, "result's infer cons should be expected");
            assert.strictEqual(result.regnum, params.result.regnum, "result's infer regnum should be expected");
            assert.strictEqual(!equal(result, params.into), params.changed, "merge result should be expected");
        });
    });
});

describe("value infer code test", () => {
    it("num const", () => {
        let num = 10, regId = new IdGen();
        let r1 = regId.next();
        let codelines = genCodeLines([new t.TAC_loadint(num, r1), new t.TAC_ret()]);
        let inferRet = inferValues(codelines, regId.cur, []);
        assert.strictEqual(inferRet.length, 2);
        assert.strictEqual(inferRet[1][r1].type, ValueType.CONST);
        assert.strictEqual(inferRet[1][r1].cons, num);
    });

    it("const times register", () => {
        let num = 10, regId = new IdGen();
        let r1 = regId.next();
        let r2 = regId.next();
        let codelines = genCodeLines([new t.TAC_loadint(num, r1), new t.TAC_binary("*", r1, r2, r1), new t.TAC_ret()]);
        let inferRet = inferValues(codelines, regId.cur, [r2]);
        assert.strictEqual(inferRet.length, 3);
        assert.strictEqual(inferRet[1][r1].type, ValueType.CONST);
        assert.strictEqual(inferRet[1][r1].cons, num);
        assert.strictEqual(inferRet[2][r1].type, ValueType.CONST_TIMES_REG);
        assert.strictEqual(inferRet[2][r1].cons, num);
        assert.strictEqual(inferRet[2][r1].regnum, r2);
    });

    it("all code line must run at least once", () => {
        let num = 10, regId = new IdGen();
        let r1 = regId.next();
        let l1 = new CodeLabel();
        let c1 = new CodeLine(new t.TAC_branch(l1));
        let c2 = new CodeLine(new t.TAC_loadint(num, r1), l1);
        let c3 = new CodeLine(new t.TAC_ret());
        let codelines = [c1, c2, c3];
        assignLineNums(codelines);
        finalizeLabelRef(codelines);
        let inferRet = inferValues(codelines, regId.cur, []);
        assert.strictEqual(inferRet.length, 3);
        assert.strictEqual(inferRet[2][r1].type, ValueType.CONST);
        assert.strictEqual(inferRet[2][r1].cons, num);
    });
});
