
import * as utility from 'utility';
import NFA from './nfa';

export function createNFA(trans: Iterable<utility.automata.Transition>, starts: Iterable<number>, terminals: Iterable<number>): NFA {
    return new NFA(trans, starts, terminals);
}
export {NFA};
