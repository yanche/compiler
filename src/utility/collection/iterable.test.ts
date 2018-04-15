
import * as assert from "assert";
import { where, empty, project } from "./iterable";
import { arrayEqual } from "../../testutil";
import { initArray } from "./array";

describe("where test", () => {
    it("test case 1", () => {
        const arr = Array.from(where([1, 2, 3, 4, 5], n => n % 2 === 0));
        assert.ok(arrayEqual(arr, [2, 4]));
    });

    it("index in predicate fn is correct", () => {
        const arr = Array.from(where([100, 101, 102, 103, 104], (n, i) => n === i + 100));
        assert.ok(arrayEqual(arr, [100, 101, 102, 103, 104]));
    });

    it("iterable from where can be iterated twice", () => {
        const arr = [1, 2, 3, 4, 5];
        const iter = where(arr, n => n % 2 === 0);
        assert.ok(arrayEqual(Array.from(iter), [2, 4]));
        // iterable from where can be iterated twice
        assert.ok(arrayEqual(Array.from(iter), [2, 4]));
    });

    it("no access until usage", () => {
        const accessed = initArray(5, false);
        const arr = where([1, 2, 3, 4, 5], (n, i) => {
            accessed[i] = true;
            return n % 2 === 0;
        });
        const iterator = arr[Symbol.iterator]();
        const n1 = iterator.next();
        assert.strictEqual(n1.value, 2);
        assert.strictEqual(arrayEqual(accessed.slice(0, 2), initArray(2, true)), true);
        assert.strictEqual(arrayEqual(accessed.slice(2), initArray(3, false)), true);
        const n2 = iterator.next();
        assert.strictEqual(n2.value, 4);
        assert.strictEqual(arrayEqual(accessed.slice(0, 4), initArray(4, true)), true);
        assert.strictEqual(arrayEqual(accessed.slice(4), initArray(1, false)), true);
    });
});

describe("project test", () => {
    it("test case 1", () => {
        const arr = Array.from(project([1, 2, 3, 4, 5], n => n + 100));
        assert.ok(arrayEqual(arr, [101, 102, 103, 104, 105]));
    });

    it("index in predicate fn is correct", () => {
        const arr = Array.from(project([100, 101, 102, 103, 104], (n, i) => n + i * 2));
        assert.ok(arrayEqual(arr, [100, 103, 106, 109, 112]));
    });

    it("iterable from project can be iterated twice", () => {
        const arr = [1, 2, 3, 4, 5];
        const iter = project(arr, n => n + 1);
        assert.ok(arrayEqual(Array.from(iter), [2, 3, 4, 5, 6]));
        // iterable from project can be iterated twice
        assert.ok(arrayEqual(Array.from(iter), [2, 3, 4, 5, 6]));
    });

    it("no access until usage", () => {
        const accessed = initArray(5, false);
        const arr = project([1, 2, 3, 4, 5], (n, i) => {
            accessed[i] = true;
            return n + 1;
        });
        const iterator = arr[Symbol.iterator]();
        const n1 = iterator.next();
        assert.strictEqual(n1.value, 2);
        assert.strictEqual(arrayEqual(accessed.slice(0, 1), initArray(1, true)), true);
        assert.strictEqual(arrayEqual(accessed.slice(1), initArray(4, false)), true);
        const n2 = iterator.next();
        assert.strictEqual(n2.value, 3);
        assert.strictEqual(arrayEqual(accessed.slice(0, 2), initArray(2, true)), true);
        assert.strictEqual(arrayEqual(accessed.slice(2), initArray(3, false)), true);
    });
});

describe("empty test", () => {
    it("test case 1", () => {
        assert.strictEqual(empty([1, 2, 3]), false);
        assert.strictEqual(empty([]), true);
    });

    it("only access first item", () => {
        let accessing2 = false;
        const iterable = function* () {
            yield 1;
            accessing2 = true;
            yield 2;
        }();
        assert.strictEqual(empty(iterable), false);
        assert.strictEqual(accessing2, false);
    });
});
