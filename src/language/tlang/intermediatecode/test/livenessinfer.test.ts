
import { inferLiveness, LivenessInfo } from "../livenessinfer";
import { CodeLine } from "../index";
import * as t from "../../tac";
import { IdGen } from "../../../../utility";
import * as assert from "assert";
import { CodeLabel } from "../../util";
import { finalizeLabelRef } from "../util";
import { genCodeLines, assignLineNums } from "./util";

describe("live-ness inference test", () => {
    it("live-ness on assignment", () => {
        const regId = new IdGen();
        const r1 = regId.next(), r2 = regId.next(), r3 = regId.next();
        const codelines = genCodeLines([
            new t.TAC_binary("+", r1, r2, r3),
            new t.TAC_retreg(r3)
        ]);
        const liveness = inferLiveness(codelines, regId.cur);
        livenessVerify(liveness, <LivenessInfo[]>[{
            regtoplive: [true, true, false],
            regbtmlive: [false, false, true]
        }, {
            regtoplive: [false, false, true],
            regbtmlive: [false, false, false]
        }]);
    });

    it("live-ness cross multiple code lines", () => {
        const regId = new IdGen();
        const r1 = regId.next(), r2 = regId.next(), r3 = regId.next();
        const codelines = genCodeLines([
            new t.TAC_loadint(1, r1),
            new t.TAC_loadint(2, r2),
            new t.TAC_binary("+", r1, r2, r3),
            new t.TAC_retreg(r3)
        ]);
        const liveness = inferLiveness(codelines, regId.cur);
        livenessVerify(liveness, <LivenessInfo[]>[{
            regtoplive: [false, false, false],
            regbtmlive: [true, false, false]
        }, {
            regtoplive: [true, false, false],
            regbtmlive: [true, true, false]
        }, {
            regtoplive: [true, true, false],
            regbtmlive: [false, false, true]
        }, {
            regtoplive: [false, false, true],
            regbtmlive: [false, false, false]
        }]);
    });

    it("live-ness with branches", () => {
        const regId = new IdGen();
        const r1 = regId.next(), r2 = regId.next(), r3 = regId.next();
        const label = new CodeLabel();
        const cl1 = new CodeLine(new t.TAC_btrue(label, r1));
        const cl2 = new CodeLine(new t.TAC_binary("+", r2, r3, r1));
        const cl3 = new CodeLine(new t.TAC_retreg(r1), label);
        const codelines = [cl1, cl2, cl3];
        assignLineNums(codelines);
        finalizeLabelRef(codelines);
        const liveness = inferLiveness(codelines, regId.cur);
        livenessVerify(liveness, <LivenessInfo[]>[{
            regtoplive: [true, true, true],
            regbtmlive: [true, true, true]
        }, {
            regtoplive: [false, true, true],
            regbtmlive: [true, false, false]
        }, {
            regtoplive: [true, false, false],
            regbtmlive: [false, false, false]
        }]);
    });

    it("live-ness no change by self-assignment", () => {
        const regId = new IdGen();
        const r1 = regId.next(), r2 = regId.next();
        const codelines = genCodeLines([
            new t.TAC_binary("+", r1, r2, r1),
            new t.TAC_retreg(r1)
        ]);
        const liveness = inferLiveness(codelines, regId.cur);
        livenessVerify(liveness, <LivenessInfo[]>[{
            regtoplive: [true, true],
            regbtmlive: [true, false]
        }, {
            regtoplive: [true, false],
            regbtmlive: [false, false]
        }]);
    });
});

function sameBoolArray(actual: Array<boolean>, expected: Array<boolean>) {
    assert.strictEqual(actual.length, expected.length);
    for (let i = 0; i < actual.length; ++i) {
        assert.strictEqual(actual[i], expected[i]);
    }
}

function singleCLLivenessVerify(actual: LivenessInfo, expected: LivenessInfo) {
    sameBoolArray(actual.regbtmlive, expected.regbtmlive);
    sameBoolArray(actual.regtoplive, expected.regtoplive);
}

function livenessVerify(actual: Array<LivenessInfo>, expected: Array<LivenessInfo>) {
    assert.strictEqual(actual.length, expected.length);
    for (let i = 0; i < actual.length; ++i) {
        singleCLLivenessVerify(actual[i], expected[i]);
    }
}
