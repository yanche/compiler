
import * as assert from "assert";
import { Stack } from "./stack";

describe("stack test", () => {
    it("initialize with data", () => {
        const stack = new Stack(1, 2, 3);
        assert.strictEqual(stack.size, 3);
        assert.strictEqual(stack.peek(0), 1);
        assert.strictEqual(stack.peek(1), 2);
        assert.strictEqual(stack.peek(2), 3);
    });

    it("push", () => {
        const stack = new Stack(1, 2, 3);
        assert.strictEqual(stack.size, 3);
        stack.push(4);
        assert.strictEqual(stack.size, 4);
        assert.strictEqual(stack.peek(3), 4);
    });

    it("pop", () => {
        const stack = new Stack(4, 5, 6);
        assert.strictEqual(stack.size, 3);
        const poped = stack.pop();
        assert.strictEqual(stack.size, 2);
        assert.strictEqual(poped, 6);
        assert.strictEqual(stack.peek(0), 4);
        assert.strictEqual(stack.peek(1), 5);
    });
});
