
import { ProdSet } from "../../productions";
import { Token, Area, Posi, noArea, InvalidTokenError, LexError } from "../../compile";
import { LexIterator } from "../../compile/lex";

export default function lex(input: string, prodSet: ProdSet): LexIterator {
    return new LexIterator(lexGenerator(input, prodSet));
}

function* lexGenerator(input: string, prodSet: ProdSet): IterableIterator<LexError | Token> {
    const len = input.length;
    let i = 0;
    while (i < len) {
        const ch = input[i];
        if (ch !== " ") {
            let symId: number = 0;
            switch (ch) {
                case "|":
                case "*":
                case "+":
                case "?":
                case "(":
                case ")":
                case ".":
                case "[":
                case "]":
                case "-":
                    symId = prodSet.getSymId(ch);
                    break;
                default:
                    const chnum = ch.charCodeAt(0);
                    if (chnum >= chnum_a && chnum <= chnum_z)
                        symId = prodSet.getSymId("l_letter");
                    else if (chnum >= chnum_A && chnum <= chnum_Z)
                        symId = prodSet.getSymId("u_letter");
                    else if (chnum >= chnum_0 && chnum <= chnum_9)
                        symId = prodSet.getSymId("digit");
                    else
                        return new InvalidTokenError(ch, new Posi(1, i + 1));
            }
            yield new Token(ch, symId, new Area(new Posi(1, i + 1), new Posi(1, i + 2)));
        }
        ++i;
    }
    return new Token("$", prodSet.getSymId("$"), noArea);
}

// | * + ( ) . char [ ] -
const chnum_a = "a".charCodeAt(0);
const chnum_z = "z".charCodeAt(0);
const chnum_A = "A".charCodeAt(0);
const chnum_Z = "Z".charCodeAt(0);
const chnum_0 = "0".charCodeAt(0);
const chnum_9 = "9".charCodeAt(0);
