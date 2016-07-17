
var dfa = require('dfa');

var scount = 0;
var state0 = new dfa.State(scount++);
var state1 = new dfa.State(scount++);
var state2 = new dfa.State(scount++);
var state3 = new dfa.State(scount++);
state0.transition('a', state1);
state1.transition('b', state2);
state2.transition('c', state3);
state3.transition('c', state3);
state3.transition('d', state3);
state3.terminal(true);

var str = 'abcccdcdcdddcc';
console.log(dfa.test(state0, str)); 
