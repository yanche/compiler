
import { compileFromFile } from "../index";
import { CompileReturn } from "../../../compile";
import * as fs from "fs";
import * as path from "path";

function compile(filename: string) {
    console.log(`working on file: ${filename}`)
    return compileFromFile(filename)
        .then((cret: CompileReturn) => {
            if (cret.accept) console.log(`compile ${filename} accepted`);
            else {
                console.error(`compile ${filename} not accepted`);
                console.error(cret.error);
            }
        })
        .catch((err: Error) => {
            console.log(`error when compiling file: ${filename}`);
            console.error(err.stack)
        });
}

function readdir(folderpath: string): Promise<Array<string>> {
    return new Promise<Array<string>>((res, rej) => {
        fs.readdir(folderpath, (err, files) => {
            if (err) rej(err);
            else res(files);
        });
    });
}

const folder = process.argv[2] || __dirname;
console.log(`compiling *.tlang from folder: ${folder}`);

readdir(folder)
    .then(files => Promise.all(files.filter(f => f.slice(-6) === ".tlang").map(f => compile(path.join(folder, f)))))
    .then(() => {
        console.log("done");
        process.exit(0);
    })
    .catch((err: Error) => console.error(err.stack));
