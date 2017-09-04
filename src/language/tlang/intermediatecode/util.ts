
import { CodeLine } from "./intermediatecode";
import { TAC_branch } from "../tac";

export function finalizeLabelRef(codelines: Array<CodeLine>) {
    for (let cl of codelines)
        if (cl.label)
            cl.label.upstreams = new Array<CodeLine>();
    for (let cl of codelines) {
        let tac = cl.tac;
        if (tac instanceof TAC_branch)
            tac.label.upstreams.push(cl);
    }
    for (let cl of codelines) {
        if (cl.label) {
            if (cl.label.upstreams.length > 0)
                cl.label.owner = cl;
            else
                cl.label = null;
        }
    }
}
