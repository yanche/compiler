
import { assert } from "chai";
import * as utility from "../../../utility";
import RegEx from "../regex";

describe("acceptance tests for regex --- accept full input", function () {
    describe("simple concat: abc", function () {
        let regex = new RegEx("abc");
        it("accept: abc", function () {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("deny: abd", function () {
            assert.equal(regex.acceptFull("abd"), false);
        });
        it("deny: abcd", function () {
            assert.equal(regex.acceptFull("abcd"), false);
        });
        it("deny: ab", function () {
            assert.equal(regex.acceptFull("ab"), false);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.acceptFull(""), false);
        });
    });

    describe("simple OR: a|b", function () {
        let regex = new RegEx("a|b");
        it("accept: a", function () {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: b", function () {
            assert.equal(regex.acceptFull("b"), true);
        });
        it("deny: c", function () {
            assert.equal(regex.acceptFull("c"), false);
        });
        it("deny: ab", function () {
            assert.equal(regex.acceptFull("ab"), false);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.acceptFull(""), false);
        });
    });

    describe("simple REPEAT (*): a*", function () {
        let regex = new RegEx("a*");
        it("accept: a", function () {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: aaaaa", function () {
            assert.equal(regex.acceptFull("aaaaa"), true);
        });
        it("accept: [empty string]", function () {
            assert.equal(regex.acceptFull(""), true);
        });
        it("deny: b", function () {
            assert.equal(regex.acceptFull("b"), false);
        });
        it("deny: baaa", function () {
            assert.equal(regex.acceptFull("baaa"), false);
        });
    });

    describe("simple REPEAT (+): a+", function () {
        let regex = new RegEx("a+");
        it("accept: a", function () {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: aaaaa", function () {
            assert.equal(regex.acceptFull("aaaaa"), true);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.acceptFull(""), false);
        });
        it("deny: b", function () {
            assert.equal(regex.acceptFull("b"), false);
        });
        it("deny: baaa", function () {
            assert.equal(regex.acceptFull("baaa"), false);
        });
    });

    describe("simple REPEAT (?): a?", function () {
        let regex = new RegEx("a?");
        it("accept: a", function () {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("deny: aaaaa", function () {
            assert.equal(regex.acceptFull("aaaaa"), false);
        });
        it("accept: [empty string]", function () {
            assert.equal(regex.acceptFull(""), true);
        });
        it("deny: b", function () {
            assert.equal(regex.acceptFull("b"), false);
        });
        it("deny: baaa", function () {
            assert.equal(regex.acceptFull("baaa"), false);
        });
    });

    describe("simple group: a-m", function () {
        let regex = new RegEx("a-m");
        it("accept: a", function () {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: b", function () {
            assert.equal(regex.acceptFull("b"), true);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.acceptFull(""), false);
        });
        it("deny: aa", function () {
            assert.equal(regex.acceptFull("aa"), false);
        });
        it("deny: z", function () {
            assert.equal(regex.acceptFull("z"), false);
        });
    });

    describe("simple group: 2-6", function () {
        let regex = new RegEx("2-6");
        it("accept: 3", function () {
            assert.equal(regex.acceptFull("3"), true);
        });
        it("accept: 4", function () {
            assert.equal(regex.acceptFull("4"), true);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.acceptFull(""), false);
        });
        it("deny: 24", function () {
            assert.equal(regex.acceptFull("24"), false);
        });
        it("deny: 9", function () {
            assert.equal(regex.acceptFull("9"), false);
        });
        it("deny: a", function () {
            assert.equal(regex.acceptFull("a"), false);
        });
    });

    describe("simple set: [abc]", function () {
        let regex = new RegEx("[abc]");
        it("accept: a", function () {
            assert.equal(regex.acceptFull("a"), true);
        });
        it("accept: b", function () {
            assert.equal(regex.acceptFull("b"), true);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.acceptFull(""), false);
        });
        it("deny: d", function () {
            assert.equal(regex.acceptFull("d"), false);
        });
        it("deny: aa", function () {
            assert.equal(regex.acceptFull("aa"), false);
        });
    });

    describe("precedance: abc|def", function () {
        let regex = new RegEx("abc|def");
        it("deny: abcef", function () {
            assert.equal(regex.acceptFull("abcef"), false);
        });
        it("deny: abdef", function () {
            assert.equal(regex.acceptFull("abdef"), false);
        });
        it("accept: abc", function () {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("accept: def", function () {
            assert.equal(regex.acceptFull("def"), true);
        });
    });

    describe("precedance: ab(c|d)ef", function () {
        let regex = new RegEx("ab(c|d)ef");
        it("accept: abcef", function () {
            assert.equal(regex.acceptFull("abcef"), true);
        });
        it("accept: abdef", function () {
            assert.equal(regex.acceptFull("abdef"), true);
        });
        it("deny: abc", function () {
            assert.equal(regex.acceptFull("abc"), false);
        });
        it("deny: def", function () {
            assert.equal(regex.acceptFull("def"), false);
        });
    });

    describe("precedance: abc*", function () {
        let regex = new RegEx("abc*");
        it("accept: abc", function () {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("accept: abcccc", function () {
            assert.equal(regex.acceptFull("abcccc"), true);
        });
        it("deny: abcabc", function () {
            assert.equal(regex.acceptFull("abcabc"), false);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.acceptFull(""), false);
        });
    });

    describe("precedance: (abc)*", function () {
        let regex = new RegEx("(abc)*");
        it("accept: abc", function () {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("deny: abcccc", function () {
            assert.equal(regex.acceptFull("abcccc"), false);
        });
        it("accept: abcabc", function () {
            assert.equal(regex.acceptFull("abcabc"), true);
        });
        it("accept: [empty string]", function () {
            assert.equal(regex.acceptFull(""), true);
        });
    });

    describe("precedance: abc-d*", function () {
        let regex = new RegEx("abc-d*");
        it("accept: abc", function () {
            assert.equal(regex.acceptFull("abc"), true);
        });
        it("accept: abcccc", function () {
            assert.equal(regex.acceptFull("abcccc"), true);
        });
        it("accept: abcdcdcdcd", function () {
            assert.equal(regex.acceptFull("abcdcdcdcd"), true);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.acceptFull(""), false);
        });
    });

    describe("complicated case: w(a1|b2)*([c-emx-z]+qwe*rt?)w", function () {
        let regex = new RegEx("w(a1|b2)*([c-emx-z]+qwe*rt?)w");
        it("accept: wa1cqwertw", function () {
            assert.equal(regex.acceptFull("wa1cqwertw"), true);
        });
        it("accept: wa1b2b2a1cqwertw", function () {
            assert.equal(regex.acceptFull("wa1b2b2a1cqwertw"), true);
        });
        it("accept: wb2eeemmmqwertw", function () {
            assert.equal(regex.acceptFull("wb2eeemmmqwertw"), true);
        });
        it("accept: wb2eeemmmqwerw", function () {
            assert.equal(regex.acceptFull("wb2eeemmmqwerw"), true);
        });
        it("accept: wb2eeemmmqwrtw", function () {
            assert.equal(regex.acceptFull("wb2eeemmmqwrtw"), true);
        });
        it("accept: wb2eeemmmqweeeeertw", function () {
            assert.equal(regex.acceptFull("wb2eeemmmqweeeeertw"), true);
        });
        it("deny: wa12cqwertw", function () {
            assert.equal(regex.acceptFull("wa12cqwertw"), false);
        });
        it("deny: wab2cqwertw", function () {
            assert.equal(regex.acceptFull("wab2cqwertw"), false);
        });
        it("deny: wa1b2qqwertw", function () {
            assert.equal(regex.acceptFull("wa1b2qqwertw"), false);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.acceptFull(""), false);
        });
    });
});


describe("acceptance tests for regex --- accept partial input", function () {
    describe("simple concat: abc", function () {
        let regex = new RegEx("abc");
        it("accept: abcdef", function () {
            assert.equal(regex.accept("abcdef"), true);
        });
        it("deny: abd", function () {
            assert.equal(regex.accept("abd"), false);
        });
        it("deny: ab", function () {
            assert.equal(regex.accept("ab"), false);
        });
        it("deny: [empty string]", function () {
            assert.equal(regex.accept(""), false);
        });
    });
});
