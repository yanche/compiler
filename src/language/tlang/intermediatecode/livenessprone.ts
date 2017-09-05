
import { CodeLine } from "./index";
import { LivenessInfo } from "./livenessinfer";

export function livenessProne(codelines: Array<CodeLine>, regliveness: Array<LivenessInfo>): void {
    codelines.forEach(cl => cl.tac = cl.tac.livenessProne(regliveness[cl.linenum].regbtmlive));
}
