
import * as assert from "assert";
import { ValueInference, ValueType, merge, ANY, NEVER, equal } from "../valueinfer";

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
