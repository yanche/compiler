
import * as assert from "assert";
import { flatten, range, initArray, findFirst } from "./array";
import { arrayEqual } from '../../testutil';

describe("flatten test", () => {
    it("[]", () => {
        assert.ok(arrayEqual(flatten([]), []));
    });

    it("[1]", () => {
        assert.ok(arrayEqual(flatten([1]), [1]));
    });

    it("[1, 2, 3]", () => {
        assert.ok(arrayEqual(flatten([1, 2, 3]), [1, 2, 3]));
    });

    it("[[]]", () => {
        assert.ok(arrayEqual(flatten([[]]), []));
    });

    it("[[1]]", () => {
        assert.ok(arrayEqual(flatten<number>([[1]]), [1]));
    });

    it("[[1],[2]]", () => {
        assert.ok(arrayEqual(flatten<number>([[1], [2]]), [1, 2]));
    });

    it("[[1],[2,3,4]]", () => {
        assert.ok(arrayEqual(flatten<number>([[1], [2, 3, 4]]), [1, 2, 3, 4]));
    });

    it("[[1],5,6,[2,3,4],7,8]", () => {
        assert.ok(arrayEqual(flatten([[1], 5, 6, [2, 3, 4], 7, 8]), [1, 5, 6, 2, 3, 4, 7, 8]));
    });
});

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
});

describe("initArray test", () => {
    it("0 item", () => {
        assert.ok(arrayEqual(initArray(0, 1), []));
    });

    it("5 items", () => {
        assert.ok(arrayEqual(initArray(5, 1), [1, 1, 1, 1, 1]));
    });
});

describe("findFirst test", () => {
    it("match", () => {
        assert.strictEqual(findFirst([5, 7, 9], n => n % 3 === 0), 9);
    });

    it("match with default", () => {
        assert.strictEqual(findFirst([5, 7, 9], n => n % 3 === 0, 100), 9);
    });

    it("empty set", () => {
        assert.strictEqual(findFirst([], n => n % 3 === 0), undefined);
    });

    it("not match", () => {
        assert.strictEqual(findFirst([5, 7], n => n % 3 === 0), undefined);
    });

    it("not match but return default", () => {
        assert.strictEqual(findFirst([5, 7], n => n % 3 === 0, 100), 100);
    });
});
