
import { ProdSet } from "../../productions";
import { Token, Area, LexReturn, Posi, noArea, InvalidTokenError } from "../../compile";

// | * + ( ) . char [ ] -
const chnum_a = "a".charCodeAt(0);
const chnum_z = "z".charCodeAt(0);
const chnum_A = "A".charCodeAt(0);
const chnum_Z = "Z".charCodeAt(0);
const chnum_0 = "0".charCodeAt(0);
const chnum_9 = "9".charCodeAt(0);
export default function lex(input: string, prodset: ProdSet): LexReturn {
    const len = input.length;
    const tokens = new Array<Token>();
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
                    symId = prodset.getSymId(ch);
                    break;
                default:
                    const chnum = ch.charCodeAt(0);
                    if (chnum >= chnum_a && chnum <= chnum_z)
                        symId = prodset.getSymId("l_letter");
                    else if (chnum >= chnum_A && chnum <= chnum_Z)
                        symId = prodset.getSymId("u_letter");
                    else if (chnum >= chnum_0 && chnum <= chnum_9)
                        symId = prodset.getSymId("digit");
                    else
                        return new LexReturn(undefined, new InvalidTokenError(ch, new Posi(1, i + 1)));
            }
            tokens.push(new Token(ch, symId, new Area(new Posi(1, i + 1), new Posi(1, i + 2))));
        }
        ++i;
    }
    tokens.push(new Token("", prodset.getSymId("$"), noArea));
    return new LexReturn(tokens);
}
