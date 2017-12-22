
let fs = require("fs");
let path = require("path");
let CompileReturn = require("../../../compile").CompileReturn;
let compile = require("../index").compile;

const folder = process.argv[2] || __dirname;
console.log(`compiling *.tlang from folder: ${folder}`);

readdir(folder)
    .then(files => Promise.all(files.filter(f => f.slice(-6) === ".tlang").map(f => compileFromFile(path.join(folder, f)))))
    .then(() => {
        console.log("done");
        process.exit(0);
    })
    .catch(err => console.error(err.stack));

function readdir(folderpath) {
    return new Promise((res, rej) => {
        fs.readdir(folderpath, (err, files) => {
            if (err) rej(err);
            else res(files);
        });
    });
}


function writeFile(filepath, data) {
    return new Promise((res, rej) => {
        fs.writeFile(filepath, data, err => {
            if (err == null) res();
            else rej(err);
        })
    });
}

function readFile(filepath) {
    return new Promise((res, rej) => {
        fs.readFile(filepath, (err, data) => {
            if (err == null) res(data);
            else rej(err);
        });
    });
}

function compileFromFile(srcfilepath) {
    console.log(`working on file: ${srcfilepath}`);
    return readFile(srcfilepath)
        .then((data) => {
            const compret = compile(data.toString("utf8"), 1 | 2 | 4);
            if (compret.error) {
                return new CompileReturn(compret.error);
            } else {
                return Promise.all([
                    writeFile(srcfilepath + ".optimized.ic", compret.intermediateCode),
                    writeFile(srcfilepath + ".optimized.regallocated.ic", compret.icAfterRegAlloc),
                    writeFile(srcfilepath + ".asm", compret.mips)
                ])
                    .then(() => new CompileReturn());
            }
        })
        .then(cret => {
            if (cret.accept) console.log(`compile ${srcfilepath} accepted`);
            else {
                console.error(`compile ${srcfilepath} not accepted`);
                console.error(cret.error);
            }
        })
        .catch(err => {
            console.log(`error when compiling file: ${srcfilepath}`);
            console.error(err.stack)
        });
}
