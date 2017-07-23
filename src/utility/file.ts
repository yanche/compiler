
import * as fs from "fs";

export function writeFile(filepath: string, data: any): Promise<any> {
    return new Promise((res, rej) => {
        fs.writeFile(filepath, data, (err: Error) => {
            if (err == null) res();
            else rej(err);
        })
    });
}

export function readFile(filepath: string): Promise<Buffer> {
    return new Promise<Buffer>((res, rej) => {
        fs.readFile(filepath, (err: Error, data: Buffer) => {
            if (err == null) res(data);
            else rej(err);
        });
    });
}
