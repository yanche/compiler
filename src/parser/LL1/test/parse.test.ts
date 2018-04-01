
import { assert } from "chai";
import { createLL1Parser } from "../index";
import { Token, noArea } from "../../../compile";
import { createProdSetWithSplitter } from "../../../productions";
import { ParseTreeNodeLiteral, validateParseTree } from "../../testcommon";
import { ErrorCode } from "../../error";

describe("LL(1) parse", () => {
    it("simple 1", () => {
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
        assert.equal(validateParseTree(parseret.root!, expectedTree, prodset).result, true);
    });

    it("too many tokens error", () => {
        const prodset = createProdSetWithSplitter([
            "E -> int"
        ]);
        const ll1parser = createLL1Parser(prodset);
        const parseret = ll1parser.parse([
            new Token("1", prodset.getSymId("int"), noArea),
            new Token("3", prodset.getSymId("int"), noArea),
            new Token("$", prodset.getSymId("$"), noArea)
        ]);
        assert.equal(parseret.accept, false);
        assert.equal(parseret.error!.errCode, ErrorCode.TOO_MANY_TOKENS);
    });

    it("need more tokens error", () => {
        const prodset = createProdSetWithSplitter([
            "E -> int int"
        ]);
        const ll1parser = createLL1Parser(prodset);
        const parseret = ll1parser.parse([
            new Token("1", prodset.getSymId("int"), noArea),
            new Token("$", prodset.getSymId("$"), noArea)
        ]);
        assert.equal(parseret.accept, false);
        assert.equal(parseret.error!.errCode, ErrorCode.NEED_MODE_TOKENS);
    });

    it("input not acceptable error", () => {
        const prodset = createProdSetWithSplitter([
            "E -> int double"
        ]);
        const ll1parser = createLL1Parser(prodset);
        const parseret = ll1parser.parse([
            new Token("1", prodset.getSymId("int"), noArea),
            new Token("2", prodset.getSymId("int"), noArea),
            new Token("$", prodset.getSymId("$"), noArea)
        ]);
        assert.equal(parseret.accept, false);
        assert.equal(parseret.error!.errCode, ErrorCode.INPUT_NOT_ACCEPTABLE);
    });
});
