
import * as assert from "assert";
import { startsWith } from "./index";

describe("startsWith test", () => {
    it("'', '', true", () => {
        assert.ok(startsWith("", ""));
    });

    it("'abc', '', true", () => {
        assert.ok(startsWith("abc", ""));
    });

    it("' ', ' ', true", () => {
        assert.ok(startsWith(" ", " "));
    });

    it("'abc', ' ', false", () => {
        assert.ok(!startsWith("abc", " "));
    });

    it("'abc', 'abc', true", () => {
        assert.ok(startsWith("abc", "abc"));
    });

    it("'abc', 'a', true", () => {
        assert.ok(startsWith("abc", "a"));
    });

    it("'abc', 'c', false", () => {
        assert.ok(!startsWith("abc", "c"));
    });

    it("'abc', 'abcd', false", () => {
        assert.ok(!startsWith("abc", "abcd"));
    });

    it("'', 'abcd', false", () => {
        assert.ok(!startsWith("", "abcd"));
    });
})