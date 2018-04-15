
import { assert } from 'chai';
import { flatten } from "../index";
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
})