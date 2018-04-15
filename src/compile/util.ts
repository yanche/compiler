
import { selectOnes } from "../utility";
import { Area } from "./lex";

export function calcContainingArea(areas: ReadonlyArray<Area>): Area {
    const [startArea, endArea] = selectOnes(areas, (area1, area2) => {
        const start1 = area1.start;
        const start2 = area2.start;
        return start1.row < start2.row ? area1 :
            (start1.row > start2.row ? area2 :
                (start1.col < start2.col ? area1 : area2));
    }, (area1, area2) => {
        const end1 = area1.end;
        const end2 = area2.end;
        return end1.row > end2.row ? area1 :
            (end1.row < end2.row ? area2 :
                (end1.col > end2.col ? area1 : area2));
    });
    return new Area(startArea.start, endArea.end);
}
