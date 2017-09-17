
import { inferLiveness, LivenessInfo } from "../livenessinfer";
import { CodeLine } from "../index";
import * as t from "../../tac";
import { IdGen } from "../../../../utility";
import * as assert from "assert";
import { CodeLabel } from "../../util";
import { finalizeLabelRef } from "../util";

describe("live-ness inference test", () => {
    it("live-ness on assignment", () => {
        let regId = new IdGen();
        let r1 = regId.next(), r2 = regId.next(), r3 = regId.next();
        let codelines = genCodeLines([
            new t.TAC_binary("+", r1, r2, r3),
            new t.TAC_retreg(r3)
        ]);
        let liveness = inferLiveness(codelines, regId.cur);
        livenessVerify(liveness, <LivenessInfo[]>[{
            regtoplive: [true, true, false],
            regbtmlive: [false, false, true]
        }, {
            regtoplive: [false, false, true],
            regbtmlive: [false, false, false]
        }]);
    });

    it("live-ness cross multiple code lines", () => {
        let regId = new IdGen();
        let r1 = regId.next(), r2 = regId.next(), r3 = regId.next();
        let codelines = genCodeLines([
            new t.TAC_loadint(1, r1),
            new t.TAC_loadint(2, r2),
            new t.TAC_binary("+", r1, r2, r3),
            new t.TAC_retreg(r3)
        ]);
        let liveness = inferLiveness(codelines, regId.cur);
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
        let regId = new IdGen();
        let r1 = regId.next(), r2 = regId.next(), r3 = regId.next();
        let label = new CodeLabel();
        let cl1 = new CodeLine(new t.TAC_btrue(label, r1));
        let cl2 = new CodeLine(new t.TAC_binary("+", r2, r3, r1));
        let cl3 = new CodeLine(new t.TAC_retreg(r1), label);
        cl1.linenum = 0;
        cl2.linenum = 1;
        cl3.linenum = 2;
        let codelines = [cl1, cl2, cl3];
        finalizeLabelRef(codelines);
        let liveness = inferLiveness(codelines, regId.cur);
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
        let regId = new IdGen();
        let r1 = regId.next(), r2 = regId.next();
        let codelines = genCodeLines([
            new t.TAC_binary("+", r1, r2, r1),
            new t.TAC_retreg(r1)
        ]);
        let liveness = inferLiveness(codelines, regId.cur);
        livenessVerify(liveness, <LivenessInfo[]>[{
            regtoplive: [true, true],
            regbtmlive: [true, false]
        }, {
            regtoplive: [true, false],
            regbtmlive: [false, false]
        }]);
    });
});

// no branch code
function genCodeLines(tac: t.TAC[]): CodeLine[] {
    return tac.map((t, idx) => {
        let cl = new CodeLine(t);
        cl.linenum = idx;
        return cl;
    });
}

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
