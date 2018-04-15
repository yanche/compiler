
export function isNum(input: any): input is number {
    return typeof input === "number";
}

export function isInt(num: any): boolean {
    return isNum(num) && num === Math.floor(num);
}
