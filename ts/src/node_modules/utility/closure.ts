
import * as utility from "./index";

class Closure {
    private _set: Set<number>; //contains nodes
    private _owners: Set<number>; //owners
    addNode(nodenum: number): this {
        this._set.add(nodenum);
        return this;
    }
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

function createGraph(arr: Iterable<utility.Edge>): DirectedGraph {
    let map = new Map<number, Set<number>>(), allnodes = new Set<number>();
    for (let edge of arr) {
        let srcnum = edge.src, tgtnum = edge.tgt;
        let edgeset = map.get(srcnum);
        if (edgeset == null) {
            edgeset = new Set<number>();
            map.set(srcnum, edgeset);
        }
        edgeset.add(tgtnum);
        allnodes.add(tgtnum);
        allnodes.add(srcnum);
    }
    return { nodes: allnodes, edgemap: map };
}

function calcClosure(graph: DirectedGraph): Map<number, Closure> {
    let colormap = new Map<number, number>(), closuremap = new Map<number, Closure>(), nlen = graph.nodes.size;
    if (nlen === 0) return closuremap;
    for (let i of graph.nodes) colormap.set(i, 0);
    let blackidx = 0, nodenums = [...graph.nodes];
    while (blackidx < nlen) {
        calcClosureOfNode([], 0, nodenums[blackidx], colormap, graph.edgemap, closuremap);
        while (blackidx < nlen && colormap.get(nodenums[blackidx]) === 2)++blackidx;
    }
    return closuremap;
}

function calcClosureOfNode(stack: Array<number>, stacktop: number, nodenum: number, colormap: Map<number, number>, edgesmap: Map<number, Set<number>>, closuremap: Map<number, Closure>) {
    stack[stacktop] = nodenum;
    addNodesToClosure(stack, 0, stacktop, [nodenum], closuremap);
    colormap.set(nodenum, 1); //grey, in process
    let edgeset = edgesmap.get(nodenum);
    if (edgeset != null) {
        for (let adjnodenum of [...edgeset]) {
            if (adjnodenum === nodenum) continue; //self, ignore
            let adjcolor = colormap.get(adjnodenum), adjclosure = closuremap.get(adjnodenum);
            if (adjcolor === 2) //adj is black
                addNodesToClosure(stack, 0, stacktop, adjclosure.getNodes(), closuremap);
            else if (adjcolor === 1) {
                //adj is grey
                let adjidx = 0;
                while (adjidx <= stacktop && stack[adjidx] !== adjnodenum)++adjidx;
                //if (adjidx > stacktop) throw new Error('impossible code path, cannot find grey adj node in stack');
                ++adjidx;
                while (adjidx <= stacktop) {
                    let processedowners = new Set<number>();
                    for (let ownernodenum of closuremap.get(stack[adjidx++]).getOwnerNodes()) {
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
        let snodenum = nodearr[s];
        let closure = closuremap.get(snodenum);
        if (closure == null) {
            closure = new Closure();
            closure.addOwnerNode(snodenum);
            closuremap.set(snodenum, closure);
        }
        for (let i of closurenodenums) closure.addNode(i);
        ++s;
    }
}

function ex_calcClosure(arr: Iterable<utility.Edge>): Map<number, Closure> {
    return calcClosure(createGraph(arr));
}

function closureOfNodes(nodenums: Iterable<number>, closuremap: Map<number, Closure>): Set<number> {
    let ret = new Set<number>();
    for (let nodenum of nodenums) {
        for (let cnodenum of closuremap.get(nodenum).getNodes())
            ret.add(cnodenum);
    }
    return ret;
}

function calcClosureOfOneNode(edgemap: Map<number, Set<number>>, nodenum: number) {
    let set = new Set<number>().add(nodenum), queue = [nodenum];
    while (queue.length > 0) {
        let nnum = queue.pop();
        let adjset = edgemap.get(nnum);
        if (adjset == null) continue;
        for (let adjnum of adjset) {
            if (!set.has(adjnum)) {
                set.add(adjnum);
                queue.push(adjnum);
            }
        }
    }
    return set;
};

function ex_calcClosureOfOneNode(arr: Iterable<utility.Edge>, nodenum: number) {
    return calcClosureOfOneNode(createGraph(arr).edgemap, nodenum);
}

export {
    ex_calcClosure as calcClosure,
    ex_calcClosureOfOneNode as calcClosureOfOneNode,
    closureOfNodes,
    Closure
};
