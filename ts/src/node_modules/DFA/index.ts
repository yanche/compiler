
import * as utility from 'utility';
import DFA from './dfa';

export function createDFA(trans: Iterable<utility.automata.Transition>, start: number, terminals: Iterable<number>): DFA {
    return new DFA(trans, start, terminals);
}
export {DFA};
