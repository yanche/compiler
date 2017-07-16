
import * as prod from '../../productions';
import * as c from '../../compile';


let tripples = ['>>>'];
let doubles = ['&&', '||', '!=', '==', '>=', '<=', '>>', '<<'];
let singles = ['(', ')', '{', '}', ',', ':', ';', '+', '-', '*', '/', '.', '~', '[', ']', '&', '|', '!', '=', '>', '<'];
let keywords = ['void', 'class', 'constructor', 'while', 'do', 'for', 'if', 'else', 'return', 'super', 'new', 'null', 'break', 'continue'];


// | * + ( ) . char [ ] -
let chnum_a = 'a'.charCodeAt(0);
let chnum_z = 'z'.charCodeAt(0);
let chnum_A = 'A'.charCodeAt(0);
let chnum_Z = 'Z'.charCodeAt(0);
let chnum_0 = '0'.charCodeAt(0);
let chnum_9 = '9'.charCodeAt(0);
let chnum__ = '_'.charCodeAt(0);
let chnum_space = ' '.charCodeAt(0);
let chnum_return = '\r'.charCodeAt(0);
let chnum_newline = '\n'.charCodeAt(0);
let chnum_tab = '\t'.charCodeAt(0);
let chtoignore = [chnum_space, chnum_return, chnum_newline, chnum_tab];

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

function areaWithColNext(posi: c.Posi, colnext: number): c.Area {
    return new c.Area(posi, new c.Posi(posi.row, posi.col + colnext));
}

export default function lex(input: string, prodset: prod.ProdSet): c.LexReturn {
    let len = input.length, i = 0, tokens = new Array<c.Token>(), row = 1, col = 1, commentblock = false, commentline = false;

    while (i < len) {
        //go thru all space, tab, newline, till next solid character
        let gonextchar = true;
        while (gonextchar && i < len) {
            let chc = input.charCodeAt(i);
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

        let ch = input[i], chcode = input.charCodeAt(i), posi = new c.Posi(row, col);
        let next2 = input.slice(i, i + 2), next3 = input.slice(i, i + 3);
        //here commentline must be false
        let continueandmove = 0;
        if (commentblock) {
            if (next2) {
                commentblock = false;
                continueandmove = 2;
            }
            else
                continueandmove = 1;
        }
        else {
            if (next2 === '/*') {
                commentblock = true;
                continueandmove = 2;
            }
            else if (next2 === '//') {
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

        if (tripples.some(c => c === next3)) { tokens.push(new c.Token(next3, prodset.getSymNum(next3), areaWithColNext(posi, 3))); col += 2; i += 2; }
        else if (doubles.some(c => c === next2)) { tokens.push(new c.Token(next2, prodset.getSymNum(next2), areaWithColNext(posi, 2))); col++; i++; }
        else if (singles.some(c => c === ch)) tokens.push(new c.Token(ch, prodset.getSymNum(ch), areaWithColNext(posi, 1)));
        else if (isDigitChCode(chcode)) {
            let startpos = i;
            ++i;
            while (i < len && isDigitChCode(input.charCodeAt(i)))++i;
            let rawstr = input.slice(startpos, i--);
            tokens.push(new c.Token(rawstr, prodset.getSymNum('integer'), areaWithColNext(posi, rawstr.length)));
            col += i - startpos;
        }
        else if (isIdStartChCode(chcode)) {
            let startpos = i;
            ++i;
            while (i < len && isIdChCode(input.charCodeAt(i)))++i;
            let idstr = input.slice(startpos, i--);
            col += i - startpos;
            if (idstr === 'true' || idstr === 'false')
                tokens.push(new c.Token(idstr, prodset.getSymNum('boolean'), areaWithColNext(posi, idstr.length)));
            else
                tokens.push(new c.Token(idstr, keywords.some(c => c === idstr) ? prodset.getSymNum(idstr) : prodset.getSymNum('id'), areaWithColNext(posi, idstr.length)));
        }
        else return new c.LexReturn(false, null, 'unrecognized character at row: ' + posi.row + ', col: ' + posi.col, 0);

        ++i;
        ++col;
    }
    return new c.LexReturn(true, tokens);
}
