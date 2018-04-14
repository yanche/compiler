
import { assert } from "chai";
import RegEx from "../regex";

describe("acceptance tests for regex --- accept full input", () => {
    describe("simple concat: abc", () => {
        const regex = new RegEx("abc");
        it("accept: abc", () => {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("deny: abd", () => {
            assert.equal(regex.acceptFull("abd"), false);
        });
        it("deny: abcd", () => {
            assert.equal(regex.acceptFull("abcd"), false);
        });
        it("deny: ab", () => {
            assert.equal(regex.acceptFull("ab"), false);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.acceptFull(""), false);
        });
    });

    describe("simple OR: a|b", () => {
        const regex = new RegEx("a|b");
        it("accept: a", () => {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: b", () => {
            assert.equal(regex.acceptFull("b"), true);
        });
        it("deny: c", () => {
            assert.equal(regex.acceptFull("c"), false);
        });
        it("deny: ab", () => {
            assert.equal(regex.acceptFull("ab"), false);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.acceptFull(""), false);
        });
    });

    describe("simple REPEAT (*): a*", () => {
        const regex = new RegEx("a*");
        it("accept: a", () => {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: aaaaa", () => {
            assert.equal(regex.acceptFull("aaaaa"), true);
        });
        it("accept: [empty string]", () => {
            assert.equal(regex.acceptFull(""), true);
        });
        it("deny: b", () => {
            assert.equal(regex.acceptFull("b"), false);
        });
        it("deny: baaa", () => {
            assert.equal(regex.acceptFull("baaa"), false);
        });
    });

    describe("simple REPEAT (+): a+", () => {
        const regex = new RegEx("a+");
        it("accept: a", () => {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: aaaaa", () => {
            assert.equal(regex.acceptFull("aaaaa"), true);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.acceptFull(""), false);
        });
        it("deny: b", () => {
            assert.equal(regex.acceptFull("b"), false);
        });
        it("deny: baaa", () => {
            assert.equal(regex.acceptFull("baaa"), false);
        });
    });

    describe("simple REPEAT (?): a?", () => {
        const regex = new RegEx("a?");
        it("accept: a", () => {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("deny: aaaaa", () => {
            assert.equal(regex.acceptFull("aaaaa"), false);
        });
        it("accept: [empty string]", () => {
            assert.equal(regex.acceptFull(""), true);
        });
        it("deny: b", () => {
            assert.equal(regex.acceptFull("b"), false);
        });
        it("deny: baaa", () => {
            assert.equal(regex.acceptFull("baaa"), false);
        });
    });

    describe("simple group: a-m", () => {
        const regex = new RegEx("a-m");
        it("accept: a", () => {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: b", () => {
            assert.equal(regex.acceptFull("b"), true);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.acceptFull(""), false);
        });
        it("deny: aa", () => {
            assert.equal(regex.acceptFull("aa"), false);
        });
        it("deny: z", () => {
            assert.equal(regex.acceptFull("z"), false);
        });
    });

    describe("simple group: 2-6", () => {
        const regex = new RegEx("2-6");
        it("accept: 3", () => {
            assert.equal(regex.acceptFull("3"), true);
        });
        it("accept: 4", () => {
            assert.equal(regex.acceptFull("4"), true);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.acceptFull(""), false);
        });
        it("deny: 24", () => {
            assert.equal(regex.acceptFull("24"), false);
        });
        it("deny: 9", () => {
            assert.equal(regex.acceptFull("9"), false);
        });
        it("deny: a", () => {
            assert.equal(regex.acceptFull("a"), false);
        });
    });

    describe("simple set: [abc]", () => {
        const regex = new RegEx("[abc]");
        it("accept: a", () => {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: b", () => {
            assert.equal(regex.acceptFull("b"), true);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.acceptFull(""), false);
        });
        it("deny: d", () => {
            assert.equal(regex.acceptFull("d"), false);
        });
        it("deny: aa", () => {
            assert.equal(regex.acceptFull("aa"), false);
        });
    });

    describe("precedance: abc|def", () => {
        const regex = new RegEx("abc|def");
        it("deny: abcef", () => {
            assert.equal(regex.acceptFull("abcef"), false);
        });
        it("deny: abdef", () => {
            assert.equal(regex.acceptFull("abdef"), false);
        });
        it("accept: abc", () => {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("accept: def", () => {
            assert.equal(regex.acceptFull("def"), true);
        });
    });

    describe("precedance: ab(c|d)ef", () => {
        const regex = new RegEx("ab(c|d)ef");
        it("accept: abcef", () => {
            assert.equal(regex.acceptFull("abcef"), true);
        });
        it("accept: abdef", () => {
            assert.equal(regex.acceptFull("abdef"), true);
        });
        it("deny: abc", () => {
            assert.equal(regex.acceptFull("abc"), false);
        });
        it("deny: def", () => {
            assert.equal(regex.acceptFull("def"), false);
        });
    });

    describe("precedance: abc*", () => {
        const regex = new RegEx("abc*");
        it("accept: abc", () => {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("accept: abcccc", () => {
            assert.equal(regex.acceptFull("abcccc"), true);
        });
        it("deny: abcabc", () => {
            assert.equal(regex.acceptFull("abcabc"), false);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.acceptFull(""), false);
        });
    });

    describe("precedance: (abc)*", () => {
        const regex = new RegEx("(abc)*");
        it("accept: abc", () => {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("deny: abcccc", () => {
            assert.equal(regex.acceptFull("abcccc"), false);
        });
        it("accept: abcabc", () => {
            assert.equal(regex.acceptFull("abcabc"), true);
        });
        it("accept: [empty string]", () => {
            assert.equal(regex.acceptFull(""), true);
        });
    });

    describe("precedance: abc-d*", () => {
        const regex = new RegEx("abc-d*");
        it("accept: abc", () => {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("accept: abcccc", () => {
            assert.equal(regex.acceptFull("abcccc"), true);
        });
        it("accept: abcdcdcdcd", () => {
            assert.equal(regex.acceptFull("abcdcdcdcd"), true);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.acceptFull(""), false);
        });
    });

    describe("complicated case: w(a1|b2)*([c-emx-z]+qwe*rt?)w", () => {
        const regex = new RegEx("w(a1|b2)*([c-emx-z]+qwe*rt?)w");
        it("accept: wa1cqwertw", () => {
            assert.equal(regex.acceptFull("wa1cqwertw"), true);
        });
        it("accept: wa1b2b2a1cqwertw", () => {
            assert.equal(regex.acceptFull("wa1b2b2a1cqwertw"), true);
        });
        it("accept: wb2eeemmmqwertw", () => {
            assert.equal(regex.acceptFull("wb2eeemmmqwertw"), true);
        });
        it("accept: wb2eeemmmqwerw", () => {
            assert.equal(regex.acceptFull("wb2eeemmmqwerw"), true);
        });
        it("accept: wb2eeemmmqwrtw", () => {
            assert.equal(regex.acceptFull("wb2eeemmmqwrtw"), true);
        });
        it("accept: wb2eeemmmqweeeeertw", () => {
            assert.equal(regex.acceptFull("wb2eeemmmqweeeeertw"), true);
        });
        it("deny: wa12cqwertw", () => {
            assert.equal(regex.acceptFull("wa12cqwertw"), false);
        });
        it("deny: wab2cqwertw", () => {
            assert.equal(regex.acceptFull("wab2cqwertw"), false);
        });
        it("deny: wa1b2qqwertw", () => {
            assert.equal(regex.acceptFull("wa1b2qqwertw"), false);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.acceptFull(""), false);
        });
    });
});


describe("acceptance tests for regex --- accept partial input", () => {
    describe("simple concat: abc", () => {
        const regex = new RegEx("abc");
        it("accept: abcdef", () => {
            assert.equal(regex.accept("abcdef"), true);
        });
        it("deny: abd", () => {
            assert.equal(regex.accept("abd"), false);
        });
        it("deny: ab", () => {
            assert.equal(regex.accept("ab"), false);
        });
        it("deny: [empty string]", () => {
            assert.equal(regex.accept(""), false);
        });
    });
});
