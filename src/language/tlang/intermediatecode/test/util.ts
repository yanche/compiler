
import { CodeLine } from "../index";
import * as t from "../../tac";

// no branch code
export function genCodeLines(tac: t.TAC[]): CodeLine[] {
    return tac.map((t, idx) => {
        let cl = new CodeLine(t);
        cl.linenum = idx;
        return cl;
    });
}
