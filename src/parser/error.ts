
import { SyntaxError, ParseReturn } from "../compile";

export enum ErrorCode {
    NEED_MODE_TOKENS = 1000,
    TOO_MANY_TOKENS = 1001,
    INPUT_NOT_ACCEPTABLE = 1002
}

export class NotAcceptableError extends SyntaxError {
    constructor(errmsg: string) {
        super(errmsg, ErrorCode.INPUT_NOT_ACCEPTABLE);
    }
}


export class NeedMoreTokensError extends SyntaxError {
    constructor() {
        super("the language is not complete", ErrorCode.NEED_MODE_TOKENS);
    }
}

export class TooManyTokensError extends SyntaxError {
    constructor() {
        super("the language has more tokens than necessary", ErrorCode.TOO_MANY_TOKENS);
    }
}

export function createParseErrorReturn(error: SyntaxError): ParseReturn {
    return new ParseReturn(undefined, error);
}
