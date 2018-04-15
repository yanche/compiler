
import * as assert from "assert";
import RegEx from "../regex";

describe("acceptance tests for regex --- accept full input", () => {
    describe("simple concat: abc", () => {
        const regex = new RegEx("abc");
        it("accept: abc", () => {
            assert.strictEqual(regex.acceptFull("abc"), true);
        });
        it("deny: abd", () => {
            assert.strictEqual(regex.acceptFull("abd"), false);
        });
        it("deny: abcd", () => {
            assert.strictEqual(regex.acceptFull("abcd"), false);
        });
        it("deny: ab", () => {
            assert.strictEqual(regex.acceptFull("ab"), false);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), false);
        });
    });

    describe("simple OR: a|b", () => {
        const regex = new RegEx("a|b");
        it("accept: a", () => {
            assert.strictEqual(regex.acceptFull("a"), true);
        });
        it("accept: b", () => {
            assert.strictEqual(regex.acceptFull("b"), true);
        });
        it("deny: c", () => {
            assert.strictEqual(regex.acceptFull("c"), false);
        });
        it("deny: ab", () => {
            assert.strictEqual(regex.acceptFull("ab"), false);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), false);
        });
    });

    describe("simple REPEAT (*): a*", () => {
        const regex = new RegEx("a*");
        it("accept: a", () => {
            assert.strictEqual(regex.acceptFull("a"), true);
        });
        it("accept: aaaaa", () => {
            assert.strictEqual(regex.acceptFull("aaaaa"), true);
        });
        it("accept: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), true);
        });
        it("deny: b", () => {
            assert.strictEqual(regex.acceptFull("b"), false);
        });
        it("deny: baaa", () => {
            assert.strictEqual(regex.acceptFull("baaa"), false);
        });
    });

    describe("simple REPEAT (+): a+", () => {
        const regex = new RegEx("a+");
        it("accept: a", () => {
            assert.strictEqual(regex.acceptFull("a"), true);
        });
        it("accept: aaaaa", () => {
            assert.strictEqual(regex.acceptFull("aaaaa"), true);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), false);
        });
        it("deny: b", () => {
            assert.strictEqual(regex.acceptFull("b"), false);
        });
        it("deny: baaa", () => {
            assert.strictEqual(regex.acceptFull("baaa"), false);
        });
    });

    describe("simple REPEAT (?): a?", () => {
        const regex = new RegEx("a?");
        it("accept: a", () => {
            assert.strictEqual(regex.acceptFull("a"), true);
        });
        it("deny: aaaaa", () => {
            assert.strictEqual(regex.acceptFull("aaaaa"), false);
        });
        it("accept: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), true);
        });
        it("deny: b", () => {
            assert.strictEqual(regex.acceptFull("b"), false);
        });
        it("deny: baaa", () => {
            assert.strictEqual(regex.acceptFull("baaa"), false);
        });
    });

    describe("simple group: a-m", () => {
        const regex = new RegEx("a-m");
        it("accept: a", () => {
            assert.strictEqual(regex.acceptFull("a"), true);
        });
        it("accept: b", () => {
            assert.strictEqual(regex.acceptFull("b"), true);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), false);
        });
        it("deny: aa", () => {
            assert.strictEqual(regex.acceptFull("aa"), false);
        });
        it("deny: z", () => {
            assert.strictEqual(regex.acceptFull("z"), false);
        });
    });

    describe("simple group: 2-6", () => {
        const regex = new RegEx("2-6");
        it("accept: 3", () => {
            assert.strictEqual(regex.acceptFull("3"), true);
        });
        it("accept: 4", () => {
            assert.strictEqual(regex.acceptFull("4"), true);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), false);
        });
        it("deny: 24", () => {
            assert.strictEqual(regex.acceptFull("24"), false);
        });
        it("deny: 9", () => {
            assert.strictEqual(regex.acceptFull("9"), false);
        });
        it("deny: a", () => {
            assert.strictEqual(regex.acceptFull("a"), false);
        });
    });

    describe("simple set: [abc]", () => {
        const regex = new RegEx("[abc]");
        it("accept: a", () => {
            assert.strictEqual(regex.acceptFull("a"), true);
        });
        it("accept: b", () => {
            assert.strictEqual(regex.acceptFull("b"), true);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), false);
        });
        it("deny: d", () => {
            assert.strictEqual(regex.acceptFull("d"), false);
        });
        it("deny: aa", () => {
            assert.strictEqual(regex.acceptFull("aa"), false);
        });
    });

    describe("precedance: abc|def", () => {
        const regex = new RegEx("abc|def");
        it("deny: abcef", () => {
            assert.strictEqual(regex.acceptFull("abcef"), false);
        });
        it("deny: abdef", () => {
            assert.strictEqual(regex.acceptFull("abdef"), false);
        });
        it("accept: abc", () => {
            assert.strictEqual(regex.acceptFull("abc"), true);
        });
        it("accept: def", () => {
            assert.strictEqual(regex.acceptFull("def"), true);
        });
    });

    describe("precedance: ab(c|d)ef", () => {
        const regex = new RegEx("ab(c|d)ef");
        it("accept: abcef", () => {
            assert.strictEqual(regex.acceptFull("abcef"), true);
        });
        it("accept: abdef", () => {
            assert.strictEqual(regex.acceptFull("abdef"), true);
        });
        it("deny: abc", () => {
            assert.strictEqual(regex.acceptFull("abc"), false);
        });
        it("deny: def", () => {
            assert.strictEqual(regex.acceptFull("def"), false);
        });
    });

    describe("precedance: abc*", () => {
        const regex = new RegEx("abc*");
        it("accept: abc", () => {
            assert.strictEqual(regex.acceptFull("abc"), true);
        });
        it("accept: abcccc", () => {
            assert.strictEqual(regex.acceptFull("abcccc"), true);
        });
        it("deny: abcabc", () => {
            assert.strictEqual(regex.acceptFull("abcabc"), false);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), false);
        });
    });

    describe("precedance: (abc)*", () => {
        const regex = new RegEx("(abc)*");
        it("accept: abc", () => {
            assert.strictEqual(regex.acceptFull("abc"), true);
        });
        it("deny: abcccc", () => {
            assert.strictEqual(regex.acceptFull("abcccc"), false);
        });
        it("accept: abcabc", () => {
            assert.strictEqual(regex.acceptFull("abcabc"), true);
        });
        it("accept: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), true);
        });
    });

    describe("precedance: abc-d*", () => {
        const regex = new RegEx("abc-d*");
        it("accept: abc", () => {
            assert.strictEqual(regex.acceptFull("abc"), true);
        });
        it("accept: abcccc", () => {
            assert.strictEqual(regex.acceptFull("abcccc"), true);
        });
        it("accept: abcdcdcdcd", () => {
            assert.strictEqual(regex.acceptFull("abcdcdcdcd"), true);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), false);
        });
    });

    describe("complicated case: w(a1|b2)*([c-emx-z]+qwe*rt?)w", () => {
        const regex = new RegEx("w(a1|b2)*([c-emx-z]+qwe*rt?)w");
        it("accept: wa1cqwertw", () => {
            assert.strictEqual(regex.acceptFull("wa1cqwertw"), true);
        });
        it("accept: wa1b2b2a1cqwertw", () => {
            assert.strictEqual(regex.acceptFull("wa1b2b2a1cqwertw"), true);
        });
        it("accept: wb2eeemmmqwertw", () => {
            assert.strictEqual(regex.acceptFull("wb2eeemmmqwertw"), true);
        });
        it("accept: wb2eeemmmqwerw", () => {
            assert.strictEqual(regex.acceptFull("wb2eeemmmqwerw"), true);
        });
        it("accept: wb2eeemmmqwrtw", () => {
            assert.strictEqual(regex.acceptFull("wb2eeemmmqwrtw"), true);
        });
        it("accept: wb2eeemmmqweeeeertw", () => {
            assert.strictEqual(regex.acceptFull("wb2eeemmmqweeeeertw"), true);
        });
        it("deny: wa12cqwertw", () => {
            assert.strictEqual(regex.acceptFull("wa12cqwertw"), false);
        });
        it("deny: wab2cqwertw", () => {
            assert.strictEqual(regex.acceptFull("wab2cqwertw"), false);
        });
        it("deny: wa1b2qqwertw", () => {
            assert.strictEqual(regex.acceptFull("wa1b2qqwertw"), false);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.acceptFull(""), false);
        });
    });
});


describe("acceptance tests for regex --- accept partial input", () => {
    describe("simple concat: abc", () => {
        const regex = new RegEx("abc");
        it("accept: abcdef", () => {
            assert.strictEqual(regex.accept("abcdef"), true);
        });
        it("deny: abd", () => {
            assert.strictEqual(regex.accept("abd"), false);
        });
        it("deny: ab", () => {
            assert.strictEqual(regex.accept("ab"), false);
        });
        it("deny: [empty string]", () => {
            assert.strictEqual(regex.accept(""), false);
        });
    });
});
