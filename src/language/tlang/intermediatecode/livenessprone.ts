
import { CodeLine } from "./index";

export function livenessProne(codelines: Array<CodeLine>, regbtmlive: Array<Array<boolean>>): void {
    codelines.forEach(cl => cl.tac = cl.tac.livenessProne(regbtmlive[cl.linenum]));
}