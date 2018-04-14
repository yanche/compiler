
import { DFA } from "../../automata";
import lex from "./lex";
import { parser, astConverter, prodSet } from "./syntax";

export default class RegEx {
    private _dfa: DFA;

    public accept(input: string): boolean { return this._dfa.accept(input, true); }

    public acceptFull(input: string): boolean { return this._dfa.accept(input); }

    public readonly pattern: string;

    constructor(pattern: string) {
        const lexret = lex(pattern, prodSet);
        if (!lexret.accept) throw new Error(lexret.error!.toString());
        const parseret = parser.parse(lexret.tokens!);
        if (!parseret.accept) throw new Error(parseret.error!.toString());
        // compile
        this._dfa = astConverter.toAST(parseret.root!).toNFA().toDFA().dfa;
        this.pattern = pattern;
    }
}
