
import * as assert from "assert";
import { calcContainingArea } from "../util";
import { Area, Posi } from "../lex";

describe("calcContainingArea", () => {
    it("(1,5)-(1-10), (1,10)-(2,6)", () => {
        const startArea = new Area(new Posi(1, 5), new Posi(1, 10));
        const endArea = new Area(new Posi(1, 10), new Posi(2, 5));
        const containingArea = calcContainingArea([startArea, endArea]);
        assert.strictEqual(containingArea.start.row, 1);
        assert.strictEqual(containingArea.start.col, 5);
        assert.strictEqual(containingArea.end.row, 2);
        assert.strictEqual(containingArea.end.col, 6);
    });
    
    it("(1,5)-(1-10), (1,4)-(1,12), same row", () => {
        const startArea = new Area(new Posi(1, 5), new Posi(1, 10));
        const endArea = new Area(new Posi(1, 4), new Posi(1, 12));
        const containingArea = calcContainingArea([startArea, endArea]);
        assert.strictEqual(containingArea.start.row, 1);
        assert.strictEqual(containingArea.start.col, 5);
        assert.strictEqual(containingArea.end.row, 1);
        assert.strictEqual(containingArea.end.col, 12);
    });

    it("(1,5)-(2-10), (9,10)-(19,6), (5,1)-(6,7)", () => {
        const startArea = new Area(new Posi(1, 5), new Posi(2, 10));
        const endArea = new Area(new Posi(9, 10), new Posi(19, 6));
        const midArea = new Area(new Posi(5, 1), new Posi(6, 7));
        const containingArea = calcContainingArea([startArea, endArea, midArea]);
        assert.strictEqual(containingArea.start.row, 1);
        assert.strictEqual(containingArea.start.col, 5);
        assert.strictEqual(containingArea.end.row, 19);
        assert.strictEqual(containingArea.end.col, 6);
    });
});
