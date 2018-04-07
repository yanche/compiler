
import { DFA } from "../../DFA";
import lex from "./lex";
import { astToNFA } from "./astprocess";
import { parser, astConverter, prodSet } from "./syntax";

export default class RegEx {
    private _dfa: DFA;
    private _pattern: string;

    accept(input: string): boolean { return this._dfa.accept(input, true); }

    acceptFull(input: string): boolean { return this._dfa.accept(input); }

    get pattern(): string { return this._pattern; }

    constructor(pattern: string) {
        const lexret = lex(pattern, prodSet);
        if (!lexret.accept) throw new Error(lexret.error.toString());
        const parseret = parser.parse(lexret.tokens);
        if (!parseret.accept) throw new Error(parseret.error.toString());
        this._dfa = astToNFA(astConverter.toAST(parseret.root)).toDFA().dfa;
        this._pattern = pattern;
    }
}
