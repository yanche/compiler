
import { ProdSet } from "../../productions";
import { Token, Area, LexReturn, Posi, noArea } from "../../compile";

// | * + ( ) . char [ ] -
let chnum_a = "a".charCodeAt(0);
let chnum_z = "z".charCodeAt(0);
let chnum_A = "A".charCodeAt(0);
let chnum_Z = "Z".charCodeAt(0);
let chnum_0 = "0".charCodeAt(0);
let chnum_9 = "9".charCodeAt(0);
export default function lex(input: string, prodset: ProdSet): LexReturn {
    let len = input.length, i = 0, tokens = new Array<Token>();
    while (i < len) {
        let ch = input[i];
        if (ch !== " ") {
            let symnum: number = 0;
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
                    symnum = prodset.getSymNum(ch);
                    break;
                default:
                    let chnum = ch.charCodeAt(0);
                    if (chnum >= chnum_a && chnum <= chnum_z)
                        symnum = prodset.getSymNum("l_letter");
                    else if (chnum >= chnum_A && chnum <= chnum_Z)
                        symnum = prodset.getSymNum("u_letter");
                    else if (chnum >= chnum_0 && chnum <= chnum_9)
                        symnum = prodset.getSymNum("digit");
                    else
                        return new LexReturn(false, null, "invalid token in given pattern: " + ch, 0);
            }
            tokens.push(new Token(ch, symnum, new Area(new Posi(1, i + 1), new Posi(1, i + 2))));
        }
        ++i;
    }
    tokens.push(new Token("", prodset.getSymNum("$"), noArea));
    return new LexReturn(true, tokens);
}
