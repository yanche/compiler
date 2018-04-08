
import { Transition } from '../index';
import NFA from './nfa';

export function createNFA(trans: Iterable<Transition>, starts: Iterable<number>, terminals: Iterable<number>): NFA {
    return new NFA(trans, starts, terminals);
}
export { NFA };
