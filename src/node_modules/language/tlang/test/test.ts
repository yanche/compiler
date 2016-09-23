
import * as t from '../index';
import * as c from 'compile';

function compileFromFile(filename: string) {
    return t.compileFromFile(filename).then((cret: c.CompileReturn) => {
        if (cret.accept) console.log('compile ' + filename + ' accepted');
        else {
            console.error('compile ' + filename + ' not accepted');
            console.error(cret.errmsg);
        }
    }).catch((err: Error) => {
        console.log('error when compiling file: ' + filename);
        console.error(err.stack)
    });
}

Promise.all([
    compileFromFile('./qsort.tlang'),
    compileFromFile('./methodoverride.tlang'),
    compileFromFile('./test.tlang')
])
    .then(() => console.log('done'));
