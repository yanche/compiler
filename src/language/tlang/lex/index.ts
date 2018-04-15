
import { ProdSet } from "../../../productions";
import { Token, noArea, Posi, Area, InvalidTokenError, LexError, LexIterator } from "../../../compile";

export default function lex(input: string, prodset: ProdSet): LexIterator {
    return new LexIterator(lexGenerator(input, prodset));
}

const tripples = [">>>"];
const doubles = ["&&", "||", "!=", "==", ">=", "<=", ">>", "<<"];
const singles = ["(", ")", "{", "}", ",", ":", ";", "+", "-", "*", "/", ".", "~", "[", "]", "&", "|", "!", "=", ">", "<"];
const keywords = ["void", "class", "constructor", "while", "do", "for", "if", "else", "return", "super", "new", "null", "break", "continue"];

// | * + ( ) . char [ ] -
const chnum_a = "a".charCodeAt(0);
const chnum_z = "z".charCodeAt(0);
const chnum_A = "A".charCodeAt(0);
const chnum_Z = "Z".charCodeAt(0);
const chnum_0 = "0".charCodeAt(0);
const chnum_9 = "9".charCodeAt(0);
const chnum__ = "_".charCodeAt(0);
const chnum_space = " ".charCodeAt(0);
const chnum_return = "\r".charCodeAt(0);
const chnum_newline = "\n".charCodeAt(0);
const chnum_tab = "\t".charCodeAt(0);
const chtoignore = [chnum_space, chnum_return, chnum_newline, chnum_tab];

function isDigitChCode(chcode: number): boolean {
    return chnum_0 <= chcode && chcode <= chnum_9;
}

//start character of an id (variable, function, class)
function isIdStartChCode(chcode: number): boolean {
    return chnum__ === chcode || (chnum_A <= chcode && chcode <= chnum_Z) || (chnum_a <= chcode && chcode <= chnum_z)
}

function isIdChCode(chcode: number): boolean {
    return isIdStartChCode(chcode) || isDigitChCode(chcode);
}

function areaWithColNext(posi: Posi, strlen: number): Area {
    return new Area(posi, new Posi(posi.row, posi.col + strlen - 1));
}

function* lexGenerator(input: string, prodset: ProdSet): IterableIterator<LexError | Token> {
    const len = input.length;
    let row = 1, col = 1, commentblock = false, commentline = false;
    let i = 0;

    while (i < len) {
        //go thru all space, tab, newline, till next solid character
        let gonextchar = true;
        while (gonextchar && i < len) {
            const chc = input.charCodeAt(i);
            gonextchar = commentline || chtoignore.some(ch => ch === chc);
            if (gonextchar) {
                //ignore character, go to next
                ++i;
                col += (chc === chnum_tab ? 4 : 1);
                if (chc === chnum_newline) {
                    col = 1;
                    ++row;
                    commentline = false;
                }
            }
        }
        if (i === len) break;

        const ch = input[i], chcode = input.charCodeAt(i), posi = new Posi(row, col);
        const next2 = input.slice(i, i + 2), next3 = input.slice(i, i + 3);
        //here commentline must be false
        let continueandmove = 0;
        if (commentblock) {
            if (next2 === "*/") {
                commentblock = false;
                continueandmove = 2;
            }
            else
                continueandmove = 1;
        }
        else {
            if (next2 === "/*") {
                commentblock = true;
                continueandmove = 2;
            }
            else if (next2 === "//") {
                commentline = true;
                continueandmove = 2;
            }
        }
        if (continueandmove !== 0) {
            i += continueandmove;
            col += continueandmove;
            //ignore character(s) because of comments
            continue;
        }

        if (tripples.some(c => c === next3)) {
            yield new Token(next3, prodset.getSymId(next3), areaWithColNext(posi, 3));
            col += 2;
            i += 2;
        }
        else if (doubles.some(c => c === next2)) {
            yield new Token(next2, prodset.getSymId(next2), areaWithColNext(posi, 2));
            col++;
            i++;
        }
        else if (singles.some(c => c === ch)) {
            yield new Token(ch, prodset.getSymId(ch), areaWithColNext(posi, 1));
        }
        else if (isDigitChCode(chcode)) {
            const startpos = i;
            ++i;
            while (i < len && isDigitChCode(input.charCodeAt(i)))++i;
            const rawstr = input.slice(startpos, i--);
            yield new Token(rawstr, prodset.getSymId("integer"), areaWithColNext(posi, rawstr.length));
            col += i - startpos;
        }
        else if (isIdStartChCode(chcode)) {
            const startpos = i;
            ++i;
            while (i < len && isIdChCode(input.charCodeAt(i)))++i;
            const idstr = input.slice(startpos, i--);
            col += i - startpos;
            if (idstr === "true" || idstr === "false") {
                yield new Token(idstr, prodset.getSymId("boolean"), areaWithColNext(posi, idstr.length));
            }
            else {
                yield new Token(idstr, keywords.some(c => c === idstr) ? prodset.getSymId(idstr) : prodset.getSymId("id"), areaWithColNext(posi, idstr.length));
            }
        }
        else return yield new InvalidTokenError(ch, posi);

        ++i;
        ++col;
    }
    yield new Token("$", prodset.getSymId("$"), noArea);
}
