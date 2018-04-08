
import { Edge, NodeId, Stack } from "./index";
import { createMapBuilderOfSet, MapBuilder } from "./collectionbuilder";

export interface Closure {
    getNodes(): Set<NodeId>;
}

export function calcClosure(arr: Iterable<Edge>): ReadonlyMap<NodeId, Closure> {
    return _calcClosure(createGraph(arr));
}

export function closureOfNodes(nodeIds: Iterable<NodeId>, closureMap: ReadonlyMap<NodeId, Closure>): Set<NodeId> {
    const ret = new Set<NodeId>();
    for (const nodeId of nodeIds) {
        if (closureMap.has(nodeId)) {
            for (const cnodeId of closureMap.get(nodeId)!.getNodes())
                ret.add(cnodeId);
        }
    }
    return ret;
}

export function calcClosureOfOneNode(edges: Iterable<Edge>, nodeId: NodeId): ReadonlySet<NodeId> {
    return _calcClosureOfOneNode(createGraph(edges).edgeMap, nodeId);
}

enum Color {
    WHITE,
    GREY,
    BLACK
}

interface DirectedGraph {
    readonly nodes: ReadonlySet<NodeId>;
    readonly edgeMap: ReadonlyMap<NodeId, ReadonlySet<NodeId>>;
}

function _calcClosureOfOneNode(edgeMap: ReadonlyMap<NodeId, ReadonlySet<NodeId>>, nodeId: NodeId): ReadonlySet<NodeId> {
    const set = new Set<NodeId>().add(nodeId);
    const queue = new Stack<NodeId>(nodeId);
    while (queue.size > 0) {
        const nId = queue.pop()!;
        const adjset = edgeMap.get(nId);
        if (adjset === undefined) continue;
        for (const adjNodeId of adjset) {
            if (!set.has(adjNodeId)) {
                set.add(adjNodeId);
                queue.push(adjNodeId);
            }
        }
    }
    return set;
};

function createGraph(edges: Iterable<Edge>): DirectedGraph {
    const edgeMapBuilder = createMapBuilderOfSet<NodeId, NodeId>();
    const nodes = new Set<NodeId>();
    for (const edge of edges) {
        const srcNodeId = edge.src;
        const tgtNodeId = edge.tgt;
        edgeMapBuilder.get(srcNodeId).add(tgtNodeId);
        nodes.add(tgtNodeId).add(srcNodeId);
    }
    const edgeMap = edgeMapBuilder.complete();
    return { nodes, edgeMap };
}

// the closure of graph
function _calcClosure(graph: DirectedGraph): ReadonlyMap<NodeId, Closure> {
    const colorMapBuilder = new MapBuilder<NodeId, Color>(() => Color.WHITE);
    const closureMap = new MapBuilder<NodeId, ClosureBuilder>(nodeId => new ClosureBuilder(nodeId));
    const nlen = graph.nodes.size;
    if (nlen === 0) return closureMap.complete();
    let blackIdx = 0;
    const nodeIds = [...graph.nodes];
    while (blackIdx < nlen) {
        calcClosureOfNode(new Stack<NodeId>(), nodeIds[blackIdx], colorMapBuilder, graph.edgeMap, closureMap);
        while (blackIdx < nlen && colorMapBuilder.get(nodeIds[blackIdx]) === Color.BLACK)++blackIdx;
    }
    return closureMap.complete();
}

// the closure of each node
// all the nodes in stack from 0 to stacktop is parent of "nodeId"
function calcClosureOfNode(stack: Stack<NodeId>, nodeId: NodeId, colorMapBuilder: MapBuilder<NodeId, Color>, edgesMap: ReadonlyMap<NodeId, ReadonlySet<NodeId>>, closureMap: MapBuilder<NodeId, ClosureBuilder>) {
    stack.push(nodeId);
    addNodesToClosure(stack, [nodeId], closureMap);
    colorMapBuilder.set(nodeId, Color.GREY); // grey, in process
    const edgeSet = edgesMap.get(nodeId);
    if (edgeSet) {
        for (const adjNodeId of [...edgeSet]) {
            if (adjNodeId === nodeId) continue; // self, ignore
            const adjColor = colorMapBuilder.get(adjNodeId);
            const adjClosure = closureMap.get(adjNodeId);
            if (adjColor === Color.BLACK) // adj is black
                addNodesToClosure(stack, adjClosure.getNodes(), closureMap);
            else if (adjColor === Color.GREY) {
                // adj is grey, grey means a node from some point in stack, all nodes in a loop share the same closure
                let adjIdx = 0;
                while (adjIdx < stack.size && stack.peek(adjIdx) !== adjNodeId)++adjIdx;
                if (adjIdx >= stack.size) throw new Error(`defensive code`);
                ++adjIdx;
                while (adjIdx < stack.size) {
                    const processedOwners = new Set<NodeId>();
                    for (const ownerNodeId of closureMap.get(stack.peek(adjIdx++)!).getOwnerNodes()) {
                        if (!processedOwners.has(ownerNodeId)) {
                            closureMap.set(ownerNodeId, adjClosure);
                            adjClosure.addOwnerNode(ownerNodeId);
                            processedOwners.add(ownerNodeId);
                        }
                    }
                }
            }
            else {
                // adj is WHITE, then process adj first
                calcClosureOfNode(stack, adjNodeId, colorMapBuilder, edgesMap, closureMap);
            }
        }
    }
    colorMapBuilder.set(nodeId, Color.BLACK); // black, finished
    stack.pop();
}

function addNodesToClosure(stack: Stack<NodeId>, closedNodeIds: Iterable<NodeId>, closureMap: MapBuilder<NodeId, ClosureBuilder>) {
    let i = 0;
    while (i < stack.size) {
        const nodeId = stack.peek(i++)!;
        closureMap.get(nodeId).addNodes(closedNodeIds);
    }
}

class ClosureBuilder implements Closure {
    private _set: Set<NodeId>; //contains nodes
    private _owners: Set<NodeId>; //owners

    public addNodes(nodeIds: Iterable<NodeId>): this {
        for (const nodeId of nodeIds) {
            this._set.add(nodeId);
        }
        return this;
    }

    // the nodes share this closure
    public addOwnerNode(nodeId: NodeId): this {
        this._owners.add(nodeId);
        return this;
    }

    public getNodes(): Set<NodeId> {
        return this._set;
    }

    public getOwnerNodes(): Set<NodeId> {
        return this._owners;
    }

    constructor(nodeId: NodeId) {
        this._set = new Set<NodeId>();
        this._owners = new Set<NodeId>().add(nodeId);
    }
}
