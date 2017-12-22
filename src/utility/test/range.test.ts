
import { assert } from 'chai';
import { range } from "../index";

function arrayEqual<T>(arr1: Array<T>, arr2: Array<T>): boolean {
    return arr1.length === arr2.length && arr1.every((item, idx) => item === arr2[idx]);
}

describe("range test", () => {
    it("0->[]", () => {
        assert.ok(arrayEqual(range(0), []));
    });

    it("1->[0]", () => {
        assert.ok(arrayEqual(range(1), [0]));
    });

    it("4->[0, 1, 2, 3]", () => {
        assert.ok(arrayEqual(range(4), [0, 1, 2, 3]));
    });

    it("0,0->[]", () => {
        assert.ok(arrayEqual(range(0, 0), []));
    });

    it("0,2->[0, 1]", () => {
        assert.ok(arrayEqual(range(0, 2), [0, 1]));
    });

    it("5,9->[5, 6, 7, 8]", () => {
        assert.ok(arrayEqual(range(5, 9), [5, 6, 7, 8]));
    });

    it("9,5->[]", () => {
        assert.ok(arrayEqual(range(9, 5), []));
    });

    it("9,9->[]", () => {
        assert.ok(arrayEqual(range(9, 9), []));
    });

    it("-2,2->[-2, -1, 0, 1]", () => {
        assert.ok(arrayEqual(range(-2, 2), [-2, -1, 0, 1]));
    });
})