
import * as assert from "assert";
import { MapBuilder, TableBuilder } from "./collectionbuilder";
import { arrayEqual } from "../../testutil";

describe("MapBuilder test", () => {
    it("MapBuilder api", () => {
        const mbuilder = new MapBuilder<number, number[]>(key => [key]);
        assert.strictEqual(mbuilder.size, 0);
        const arr1 = mbuilder.get(1);
        // init by get
        assert.strictEqual(Array.isArray(arr1), true);
        assert.strictEqual(arrayEqual(arr1, [1]), true);
        assert.strictEqual(mbuilder.size, 1);
        mbuilder.get(2).push(3);
        const arr2 = mbuilder.get(2);
        assert.strictEqual(Array.isArray(arr2), true);
        assert.strictEqual(arrayEqual(arr2, [2, 3]), true);
        assert.strictEqual(mbuilder.size, 2);
        mbuilder.set(2, [5, 6]);
        const arr3 = mbuilder.get(2);
        assert.strictEqual(Array.isArray(arr3), true);
        assert.strictEqual(arrayEqual(arr3, [5, 6]), true);
        assert.strictEqual(mbuilder.size, 2);
        assert.strictEqual(mbuilder.has(2), true);
        assert.strictEqual(mbuilder.has(3), false);

        // complete and get a readonly map
        const finalMap = mbuilder.complete();
        assert.strictEqual(finalMap.size, 2);
        assert.strictEqual(arrayEqual(finalMap.get(1)!, [1]), true);
        assert.strictEqual(arrayEqual(finalMap.get(2)!, [5, 6]), true);

        // init by get
        assert.throws(() => mbuilder.get(5));
        // set new
        assert.throws(() => mbuilder.set(6, [1]));
        // set exist entry
        assert.throws(() => mbuilder.set(1, [1]));
    });
});

describe("TableBuilder test", () => {
    it("TableBuilder api", () => {
        const tbuilder = new TableBuilder<number, number, number[]>((row, column) => [row, column]);
        // init by get
        assert.strictEqual(tbuilder.hasCell(1, 2), false);
        assert.strictEqual(arrayEqual(tbuilder.getCell(1, 2), [1, 2]), true);
        assert.strictEqual(tbuilder.hasCell(1, 2), true);
        // set cell
        tbuilder.setCell(1, 2, [4, 5]);
        assert.strictEqual(arrayEqual(tbuilder.getCell(1, 2), [4, 5]), true);
        // complete get readonly interface
        const table = tbuilder.complete();
        assert.strictEqual(arrayEqual(table.getCell(1, 2), [4, 5]), true);
        assert.strictEqual(table.hasCell(1, 2), true);
        assert.strictEqual(table.hasCell(2, 2), false);
        assert.strictEqual(table.hasCell(1, 3), false);

        assert.throws(() => tbuilder.getCell(1, 4));
        assert.throws(() => tbuilder.getCell(2, 2));
        assert.throws(() => tbuilder.setCell(2, 2, [1]));
    });
});

