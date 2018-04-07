
import { assert } from 'chai';
import * as closure from '../closure';
import {Edge} from '../../utility';

function convToEdges(edges: Array<Array<number>>): Array<Edge> {
    const ret: Array<Edge> = [];
    for (const edge of edges) {
        ret.push({ src: edge[0], tgt: edge[1] });
    }
    return ret;
}

describe('happy', function () {
    it('1 edge 1 node', function () {
        const m = closure.calcClosure(convToEdges([[0, 0], [0, 0]]));
        const c0 = m.get(0)!;
        arrEqual([...c0.getNodes()], [0]);
        arrEqual([...c0.getOwnerNodes()], [0]);
    });

    it('1 edge', function () {
        const m = closure.calcClosure(convToEdges([[0, 1]]));
        const c0 = m.get(0)!, c1 = m.get(1)!;
        arrEqual([...c0.getNodes()], [0, 1]);
        arrEqual([...c1.getNodes()], [1]);
        arrEqual([...c0.getOwnerNodes()], [0]);
        arrEqual([...c1.getOwnerNodes()], [1]);
    });

    it('2 edges', function () {
        const m = closure.calcClosure(convToEdges([[0, 1], [1, 3]]));
        const c0 = m.get(0)!, c1 = m.get(1)!, c2 = m.get(3)!;
        arrEqual([...c0.getNodes()], [0, 1, 3]);
        arrEqual([...c1.getNodes()], [1, 3]);
        arrEqual([...c2.getNodes()], [3]);
        arrEqual([...c0.getOwnerNodes()], [0]);
        arrEqual([...c1.getOwnerNodes()], [1]);
        arrEqual([...c2.getOwnerNodes()], [3]);
    });

    it('star', function () {
        const m = closure.calcClosure(convToEdges([[0, 1], [0, 3], [0, 5]]));
        const c0 = m.get(0)!, c1 = m.get(1)!, c2 = m.get(3)!, c3 = m.get(5)!;
        arrEqual([...c0.getNodes()], [0, 1, 3, 5]);
        arrEqual([...c1.getNodes()], [1]);
        arrEqual([...c2.getNodes()], [3]);
        arrEqual([...c3.getNodes()], [5]);
        arrEqual([...c0.getOwnerNodes()], [0]);
        arrEqual([...c1.getOwnerNodes()], [1]);
        arrEqual([...c2.getOwnerNodes()], [3]);
        arrEqual([...c3.getOwnerNodes()], [5]);
    });

    it('reversed star', function () {
        const m = closure.calcClosure(convToEdges([[1, 0], [3, 0], [5, 0]]));
        const c0 = m.get(0)!, c1 = m.get(1)!, c2 = m.get(3)!, c3 = m.get(5)!;
        arrEqual([...c0.getNodes()], [0]);
        arrEqual([...c1.getNodes()], [1, 0]);
        arrEqual([...c2.getNodes()], [3, 0]);
        arrEqual([...c3.getNodes()], [5, 0]);
        arrEqual([...c0.getOwnerNodes()], [0]);
        arrEqual([...c1.getOwnerNodes()], [1]);
        arrEqual([...c2.getOwnerNodes()], [3]);
        arrEqual([...c3.getOwnerNodes()], [5]);
    });
});

describe('loop', function () {
    it('2 nodes', function () {
        const m = closure.calcClosure(convToEdges([[0, 1], [1, 0]]));
        const c0 = m.get(0)!, c1 = m.get(1)!;
        assert.equal(c0, c1);
        arrEqual([...c0.getNodes()], [0, 1]);
        arrEqual([...c0.getOwnerNodes()], [0, 1]);
    });

    it('4 nodes', function () {
        const m = closure.calcClosure(convToEdges([[0, 1], [1, 2], [2, 3], [3, 0]]));
        const c0 = m.get(0)!, c1 = m.get(1)!, c2 = m.get(2)!, c3 = m.get(3)!;
        closuresShareNodes([c0, c1, c2, c3], [0, 1, 2, 3]);
        closuresOwners([c0, c1, c2, c3], [0, 1, 2, 3]);
    });

    it('3 nodes, several hanging edges', function () {
        const m = closure.calcClosure(convToEdges([[0, 1], [1, 2], [2, 0], [2, 3], [1, 4]]));
        const c0 = m.get(0)!, c1 = m.get(1)!, c2 = m.get(2)!, c3 = m.get(3)!, c4 = m.get(4)!;
        closuresShareNodes([c0, c1, c2], [0, 1, 2, 3, 4]);
        closuresOwners([c0, c1, c2], [0, 1, 2]);
        arrEqual([...c3.getNodes()], [3]);
        arrEqual([...c3.getOwnerNodes()], [3]);
        arrEqual([...c4.getNodes()], [4]);
        arrEqual([...c4.getOwnerNodes()], [4]);
    });

    it('4 nodes, 2 loops', function () {
        const m = closure.calcClosure(convToEdges([[2, 3], [3, 0], [0, 1], [1, 2], [2, 0]]));
        const c0 = m.get(0)!, c1 = m.get(1)!, c2 = m.get(2)!, c3 = m.get(3)!;
        closuresShareNodes([c0, c1, c2, c3], [0, 1, 2, 3]);
        closuresOwners([c0, c1, c2, c3], [0, 1, 2, 3]);
    });

    it('4 nodes, 2 loops, intersect', function () {
        const m = closure.calcClosure(convToEdges([[2, 3], [3, 1], [0, 1], [1, 2], [2, 0]]));
        const c0 = m.get(0)!, c1 = m.get(1)!, c2 = m.get(2)!, c3 = m.get(3)!;
        closuresShareNodes([c0, c1, c2, c3], [0, 1, 2, 3]);
        closuresOwners([c0, c1, c2, c3], [0, 1, 2, 3]);
    });

    it('3 loops, consider process sequence', function () {
        const m = closure.calcClosure(convToEdges([[2, 3], [3, 1], [0, 1], [1, 2], [2, 0], [0, 4], [4, 5], [5, 0]]));
        const c0 = m.get(0)!, c1 = m.get(1)!, c2 = m.get(2)!, c3 = m.get(3)!, c4 = m.get(4)!, c5 = m.get(5)!;
        closuresShareNodes([c0, c1, c2, c3, c4, c5], [0, 1, 2, 3, 4, 5]);
        closuresOwners([c0, c1, c2, c3, c4, c5], [0, 1, 2, 3, 4, 5]);
    });
});

function arrEqual(arr1: Array<number>, arr2: Array<number>) {
    assert.equal(Array.isArray(arr1), true);
    assert.equal(Array.isArray(arr2), true);
    assert.equal(arr1.length, arr2.length);
    arr1.sort(comparerNum);
    arr2.sort(comparerNum);
    for (let i = 0; i < arr1.length; ++i)
        assert.equal(arr1[i], arr2[i]);
};

function closuresShareNodes(closures: Array<closure.Closure>, nodes: Array<number>) {
    for (const c of closures) arrEqual(nodes, [...c.getNodes()]);
};

function closuresOwners(closures: Array<closure.Closure>, owners: Array<number>) {
    const set = new Set<number>();
    for (const c of closures)
        for (const n of c.getOwnerNodes())
            set.add(n);
    arrEqual(owners, [...set]);
};

function comparerNum(v1: number, v2: number) { return v1 - v2; };
