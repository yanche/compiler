
 import { assert } from "chai";
import { createLALR1Parser } from "../index";
import { validate } from "./util.test";
import { Token, noArea } from "../../../compile";
import { createProdSetWithSplitter } from "../../../productions";


describe("LALR(1) parse", function () {
    it("invalid LALR(1), valid LR(1)", function () {
        let lalr1parser = createLALR1Parser(createProdSetWithSplitter([
            "S -> a E c | a F d | b F c | b E d",
            "E -> e",
            "F -> e"
        ]));
        //lalr1parser.print();
        assert.equal(false, lalr1parser.valid);
    });

    it("valid LALR(1), valid SLR(1)", function () {
        let lalr1parser = createLALR1Parser(createProdSetWithSplitter([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]));
        //lalr1parser.print();
        assert.equal(true, lalr1parser.valid);
    });

    it("valid LALR(1), invalid SLR(1)", function () {
        let lalr1parser = createLALR1Parser(createProdSetWithSplitter([
            "S -> A a | b A c | d c | b d a",
            "A -> d"
        ]));
        // lalr1parser.print();
        // console.log(lalr1parser.valid);
        assert.equal(true, lalr1parser.valid);
    });

    it("simple 1", function () {
        let prodset = createProdSetWithSplitter([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ])
        let lalr1parser = createLALR1Parser(prodset);
        let parseret = lalr1parser.parse([
            new Token("1", prodset.getSymId("int"), noArea),
            new Token("+", prodset.getSymId("+"), noArea),
            new Token("2", prodset.getSymId("int"), noArea),
            new Token("*", prodset.getSymId("*"), noArea),
            new Token("3", prodset.getSymId("int"), noArea),
            new Token("$", prodset.getSymId("$"), noArea)
        ]);
        assert.equal(true, parseret.accept);
        validate(prodset, parseret.root!, {
            symstr: "E",
            mid: true,
            children: [
                {
                    symstr: "T",
                    mid: true,
                    children: [
                        {
                            symstr: "int",
                            mid: false,
                            rawstr: "1"
                        }
                    ]
                },
                { symstr: "+", mid: false, rawstr: "+" },
                {
                    symstr: "E",
                    mid: true,
                    children: [
                        {
                            symstr: "T",
                            mid: true,
                            children: [
                                { symstr: "int", mid: false, rawstr: "2" },
                                { symstr: "*", mid: false, rawstr: "*" },
                                {
                                    symstr: "T", mid: true, children: [
                                        { symstr: "int", mid: false, rawstr: "3" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });
});
