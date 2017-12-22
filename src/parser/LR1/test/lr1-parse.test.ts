
 import { assert } from "chai";
import * as utility from "../../../utility";
import { createLR1Parser } from "../index";
import { validate } from "./util.test";
import { Token, noArea } from "../../../compile";
import { createProdSetWithSplitter } from "../../../productions";


describe("LR(1) parse", function () {
    it("invalid LALR(1), valid LR(1)", function () {
        let lr1parser = createLR1Parser(createProdSetWithSplitter([
            "S -> a E c | a F d | b F c | b E d",
            "E -> e",
            "F -> e"
        ]));
        //lr1parser.print();
        assert.equal(true, lr1parser.isValid());
    });

    it("valid LALR(1), valid SLR(1)", function () {
        let lr1parser = createLR1Parser(createProdSetWithSplitter([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]));
        //lr1parser.print();
        assert.equal(true, lr1parser.isValid());
    });

    it("valid LALR(1), invalid SLR(1)", function () {
        let lr1parser = createLR1Parser(createProdSetWithSplitter([
            "S -> A a | b A c | d c | b d a",
            "A -> d"
        ]));
        // lr1parser.print();
        // console.log(lr1parser.isValid());
        assert.equal(true, lr1parser.isValid());
    });

    it("simple 1", function () {
        let prodset = createProdSetWithSplitter([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]);
        let lr1parser = createLR1Parser(prodset);
        let parseret = lr1parser.parse([
            new Token("1", prodset.getSymNum("int"), noArea),
            new Token("+", prodset.getSymNum("+"), noArea),
            new Token("2", prodset.getSymNum("int"), noArea),
            new Token("*", prodset.getSymNum("*"), noArea),
            new Token("3", prodset.getSymNum("int"), noArea),
            new Token("$", prodset.getSymNum("$"), noArea)
        ]);
        assert.equal(true, parseret.accept);
        validate(prodset, parseret.root, {
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
