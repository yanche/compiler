
import { regCount } from "./regs";

// register interference graph
export class RIG {
    // link between temp registers, so they cannot be assigned with same real register
    // because their values are "live" at same time
    private _map: Map<number, Set<number>>;

    removeReg(regnum: number): this {
        const s = this._map.get(regnum);
        if (s) {
            this._map.delete(regnum);
            for (const r of s)
                this._map.get(r).delete(regnum);
        }
        return this;
    }

    // complete linkage
    addRelateRegs(regnums: Array<number>): this {
        const rlen = regnums.length;
        if (rlen === 1) {
            this._getOrCreateSet(regnums[0]);
        }
        else {
            for (let i = 0; i < rlen - 1; ++i) {
                for (let j = i + 1; j < rlen; ++j) {
                    this._addRelatedRegs(regnums[i], regnums[j]);
                }
            }
        }
        return this;
    }

    // 1->many link
    addRelateRegsForOne(regnum: number, regnums: Array<number>): this {
        if (regnums.length === 0) this._getOrCreateSet(regnum);
        else {
            const rlen = regnums.length;
            for (let i = 0; i < rlen; ++i) {
                this._addRelatedRegs(regnums[i], regnum);
            }
        }
        return this;
    }

    private _addRelatedRegs(regnum1: number, regnum2: number): this {
        if (regnum1 !== regnum2) {
            this._getOrCreateSet(regnum1).add(regnum2);
            this._getOrCreateSet(regnum2).add(regnum1);
        }
        return this;
    }

    private _getOrCreateSet(regnum: number) {
        let s = this._map.get(regnum);
        if (s == null) {
            s = new Set<number>();
            this._map.set(regnum, s);
        }
        return s;
    }

    allocate(): { succeed: boolean, spill?: number, map?: Map<number, number> } {
        const removables = new Array<number>(), unremovable = new Set<number>(), rarr = new Array<number>(), tmpregcount = this._map.size, tmpmap = new Map<number, Set<number>>();
        for (const x of this._map) {
            // less than regCount neighbors
            if (x[1].size < regCount) removables.push(x[0]);
            else unremovable.add(x[0]);
            const tset = new Set<number>();
            // clone the set
            for (const n of x[1]) tset.add(n);
            tmpmap.set(x[0], tset);
        }
        while (true) {
            // remove nodes from graph marked by "removables"
            while (removables.length > 0) {
                const rnum = removables.pop();
                rarr.push(rnum);
                for (const n of tmpmap.get(rnum)) {
                    const s = tmpmap.get(n);
                    s.delete(rnum);
                    if (s.size < regCount && unremovable.has(n)) {
                        // now neighbor count is less than regCount, move to "removables"
                        removables.push(n);
                        unremovable.delete(n);
                    }
                }
                tmpmap.delete(rnum);
            }
            if (rarr.length === tmpregcount)
                break;
            else {
                let maxsize = -1, maxnum = -1;
                for (const t of tmpmap) {
                    if (maxsize < t[1].size) {
                        maxsize = t[1].size;
                        maxnum = t[0];
                    }
                }
                if (maxnum === -1 || maxsize === -1) throw new Error("defensive code, impossible code path");
                // find the node with most neighbors and mark it as "removable"
                removables.push(maxnum);
                unremovable.delete(maxnum);
            }
        }
        if (tmpmap.size !== 0) throw new Error("defensive code, impossible code path " + tmpmap.size);
        const regmap = new Map<number, number>();
        let i = rarr.length - 1;
        while (i >= 0) {
            const rnum = rarr[i];
            const nei = this._map.get(rnum);
            // assignedneibor: list of neighbor nodes that already got real register allocation
            const assignedneibor = new Array<number>(), regs = new Array<boolean>(regCount);
            for (let j = i + 1; j < rarr.length; ++j) {
                if (nei.has(rarr[j]))
                    assignedneibor.push(rarr[j]);
            }
            for (const n of assignedneibor) regs[regmap.get(n)] = true;
            let j = 0;
            for (; j < regCount; ++j) {
                if (regs[j] !== true) {
                    // assign the register to temporary
                    regmap.set(rnum, j);
                    break;
                }
            }
            // if no valid assignment
            if (j === regCount)
                return { succeed: false, spill: rnum };
            --i;
        }
        return { succeed: true, map: regmap };
    }

    constructor() {
        this._map = new Map<number, Set<number>>();
    }
}
