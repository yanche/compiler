
import { assert } from "chai";
import { createLL1Parser } from "../index";
import { Token, noArea } from "../../../compile";
import { createProdSetWithSplitter } from "../../../productions";
import { ParseTreeNodeLiteral, validateParseTree } from "../../testcommon";


describe("LL(1) parse", function () {
    it("simple 1", function () {
        const prodset = createProdSetWithSplitter([
            "E -> T X",
            "X -> + E | ",
            "T -> int Y | ( E )",
            "Y -> | * T"
        ]);
        const ll1parser = createLL1Parser(prodset);
        const parseret = ll1parser.parse([
            new Token("1", prodset.getSymId("int"), noArea),
            new Token("+", prodset.getSymId("+"), noArea),
            new Token("2", prodset.getSymId("int"), noArea),
            new Token("*", prodset.getSymId("*"), noArea),
            new Token("3", prodset.getSymId("int"), noArea),
            new Token("$", prodset.getSymId("$"), noArea)
        ]);
        const expectedTree: ParseTreeNodeLiteral = {
            symbol: "E",
            children: [
                {
                    symbol: "T",
                    children: [
                        {
                            symbol: "int",
                            token: "1"
                        },
                        {
                            symbol: "Y",
                            children: []
                        }
                    ]
                },
                {
                    symbol: "X",
                    children: [
                        {
                            symbol: "+",
                            token: "+"
                        },
                        {
                            symbol: "E",
                            children: [
                                {
                                    symbol: "T",
                                    children: [
                                        {
                                            symbol: "int",
                                            token: "2"
                                        },
                                        {
                                            symbol: "Y",
                                            children: [
                                                {
                                                    symbol: "*",
                                                    token: "*"
                                                },
                                                {
                                                    symbol: "T",
                                                    children: [
                                                        {
                                                            symbol: "int",
                                                            token: "3"
                                                        },
                                                        {
                                                            symbol: "Y",
                                                            children: []
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    symbol: "X",
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        assert.equal(parseret.accept, true);
        assert.equal(validateParseTree(parseret.root, expectedTree, prodset).result, true);
    });
});
