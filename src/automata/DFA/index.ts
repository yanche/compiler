
import { Transition } from '../index';
import DFA from './dfa';

export function createDFA(trans: Iterable<Transition>, start: number, terminals: Iterable<number>): DFA {
    return new DFA(trans, start, terminals);
}
export { DFA };
