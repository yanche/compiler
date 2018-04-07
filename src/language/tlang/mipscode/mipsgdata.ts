

export abstract class MIPSGData {
    protected _comments: string;
    setComments(c: string): this {
        this._comments = c;
        return this;
    }
}

//just a newline, for readability
export class MIPSGData_emptyline extends MIPSGData {
    toString(): string {
        return "";
    }
}

export class MIPSGData_word extends MIPSGData {
    private _nums: Array<number>;

    toString(): string {
        return ".word " + this._nums.join(" ");
    }

    constructor(nums: Array<number> | number) {
        super();
        if (typeof nums === "number") {
            const arr = new Array<number>(nums);
            for (let i = 0; i < nums; ++i) arr[i] = 0;
            this._nums = arr;
        }
        else this._nums = nums;
    }
}
export class MIPSGData_asciiz extends MIPSGData {
    private _str: string;

    toString(): string {
        return ".asciiz " + this._str;
    }

    constructor(str: string) {
        super();
        this._str = str;
    }
}
