
import * as utility from "./index";

export class Closure {
    private _set: Set<number>; //contains nodes
    private _owners: Set<number>; //owners

    addNode(nodenum: number): this {
        this._set.add(nodenum);
        return this;
    }

    // the nodes share this closure
    addOwnerNode(nodenum: number): this {
        this._owners.add(nodenum);
        return this;
    }

    getNodes(): Set<number> {
        return this._set;
    }

    getOwnerNodes(): Set<number> {
        return this._owners;
    }

    constructor() {
        this._set = new Set<number>();
        this._owners = new Set<number>();
    }
}

interface DirectedGraph {
    nodes: Set<number>;
    edgemap: Map<number, Set<number>>;
}

enum Color {
    white,
    grey,
    black
}

function createGraph(arr: Iterable<utility.Edge>): DirectedGraph {
    const map = new Map<number, Set<number>>(), allnodes = new Set<number>();
    for (const edge of arr) {
        const srcnum = edge.src, tgtnum = edge.tgt;
        let edgeset: Set<number>;
        if (!map.has(srcnum)) {
            edgeset = new Set<number>();
            map.set(srcnum, edgeset);
        } else {
            edgeset = map.get(srcnum)!;
        }
        edgeset.add(tgtnum);
        allnodes.add(tgtnum).add(srcnum);
    }
    return { nodes: allnodes, edgemap: map };
}

// the closure of graph
function _calcClosure(graph: DirectedGraph): Map<number, Closure> {
    const colormap = new Map<number, Color>(), closuremap = new Map<number, Closure>(), nlen = graph.nodes.size;
    if (nlen === 0) return closuremap;
    for (const i of graph.nodes) colormap.set(i, Color.white);
    let blackidx = 0;
    const nodenums = [...graph.nodes];
    while (blackidx < nlen) {
        calcClosureOfNode([], 0, nodenums[blackidx], colormap, graph.edgemap, closuremap);
        while (blackidx < nlen && colormap.get(nodenums[blackidx]) === Color.black)++blackidx;
    }
    return closuremap;
}

// the closure of each node
// all the nodes in stack from 0 to stacktop is parent of nodenum
function calcClosureOfNode(stack: Array<number>, stacktop: number, nodenum: number, colormap: Map<number, Color>, edgesmap: Map<number, Set<number>>, closuremap: Map<number, Closure>) {
    stack[stacktop] = nodenum;
    addNodesToClosure(stack, 0, stacktop, [nodenum], closuremap);
    colormap.set(nodenum, Color.grey); //grey, in process
    const edgeset = edgesmap.get(nodenum);
    if (edgeset != null) {
        for (const adjnodenum of [...edgeset]) {
            if (adjnodenum === nodenum) continue; //self, ignore
            const adjcolor = colormap.get(adjnodenum);
            const adjclosure = closuremap.get(adjnodenum)!;
            if (adjcolor === Color.black) //adj is black
                addNodesToClosure(stack, 0, stacktop, adjclosure.getNodes(), closuremap);
            else if (adjcolor === Color.grey) {
                // adj is grey, grey means a lot from some point in stack, all nodes in a loop share the same closure
                let adjidx = 0;
                while (adjidx <= stacktop && stack[adjidx] !== adjnodenum)++adjidx;
                ++adjidx;
                while (adjidx <= stacktop) {
                    const processedowners = new Set<number>();
                    for (const ownernodenum of closuremap.get(stack[adjidx++])!.getOwnerNodes()) {
                        if (!processedowners.has(ownernodenum)) {
                            closuremap.set(ownernodenum, adjclosure);
                            adjclosure.addOwnerNode(ownernodenum);
                            processedowners.add(ownernodenum);
                        }
                    }
                }
            }
            else //adj is white, then process adj first
                calcClosureOfNode(stack, stacktop + 1, adjnodenum, colormap, edgesmap, closuremap);
        }
    }
    colormap.set(nodenum, 2); //black, finished
}

function addNodesToClosure(nodearr: Array<number>, s: number, e: number, closurenodenums: Iterable<number>, closuremap: Map<number, Closure>) {
    while (s <= e) {
        const snodenum = nodearr[s];
        let closure = closuremap.get(snodenum);
        if (closure == null) {
            closure = new Closure();
            closure.addOwnerNode(snodenum);
            closuremap.set(snodenum, closure);
        }
        for (const i of closurenodenums) closure.addNode(i);
        ++s;
    }
}

export function calcClosure(arr: Iterable<utility.Edge>): Map<number, Closure> {
    return _calcClosure(createGraph(arr));
}

export function closureOfNodes(nodenums: Iterable<number>, closuremap: Map<number, Closure>): Set<number> {
    const ret = new Set<number>();
    for (const nodenum of nodenums) {
        for (const cnodenum of closuremap.get(nodenum)!.getNodes())
            ret.add(cnodenum);
    }
    return ret;
}

function _calcClosureOfOneNode(edgemap: Map<number, Set<number>>, nodenum: number) {
    const set = new Set<number>().add(nodenum), queue = [nodenum];
    while (queue.length > 0) {
        const nnum = queue.pop()!;
        const adjset = edgemap.get(nnum);
        if (adjset === undefined) continue;
        for (const adjnum of adjset) {
            if (!set.has(adjnum)) {
                set.add(adjnum);
                queue.push(adjnum);
            }
        }
    }
    return set;
};

export function calcClosureOfOneNode(arr: Iterable<utility.Edge>, nodenum: number) {
    return _calcClosureOfOneNode(createGraph(arr).edgemap, nodenum);
}
