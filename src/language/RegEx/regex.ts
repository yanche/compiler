
import { DFA } from "../../DFA";
import lex from "./lex";
import parser from "./parser";
import prodset from "./prodset";
import { astToNFA } from "./astprocess";
import astConverter from "./toast";

export default class RegEx {
    private _dfa: DFA;
    private _pattern: string;

    accept(input: string): boolean { return this._dfa.accept(input, true); }
    
    acceptFull(input: string): boolean { return this._dfa.accept(input); }

    get pattern(): string { return this._pattern; }

    constructor(pattern: string) {
        let lexret = lex(pattern, prodset);
        if (!lexret.accept) throw new Error("lex analyzer not accept: " + lexret.errmsg);
        let parseret = parser.parse(lexret.tokens);
        if (!parseret.accept) throw new Error("syntax analyzer not accept: " + parseret.errmsg);
        this._dfa = astToNFA(astConverter.toAST(parseret.root)).toDFA().dfa;
        this._pattern = pattern;
    }
}
