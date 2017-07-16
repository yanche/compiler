
import * as p from '../../parser';

export default p.createSLR1Parser([
    'RE -> S-RE || S-RE | RE',
    'S-RE -> B-RE || B-RE S-RE',
    'B-RE -> E-RE REPEAT',
    'REPEAT -> * || + || ? || ',
    'E-RE -> ( RE ) || SINGLE-INPUT || SET',
    'SET -> P-SET',
    'P-SET -> [ SET-ITEMS ]',
    //'N-SET -> [ ^ SET-ITEMS ]',
    'SET-ITEMS -> SINGLE-INPUT || SINGLE-INPUT SET-ITEMS',
    'SINGLE-INPUT -> CHAR || GROUP-SINGLE-INPUT',
    'GROUP-SINGLE-INPUT -> l_letter - l_letter || u_letter - u_letter || digit - digit',
    'CHAR -> l_letter || u_letter || digit'
], '||');
