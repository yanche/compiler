
let fs = require("fs");
let path = require("path");

const folder = process.argv[2] || __dirname;
console.log(`compiling *.tlang from folder: ${folder}`);

readdir(folder)
    .then(files => Promise.all(files.filter(f => f.slice(-6) === ".tlang").map(f => compile(path.join(folder, f)))))
    .then(() => {
        console.log("done");
        process.exit(0);
    })
    .catch(err => console.error(err.stack));

function compile(filename) {
    console.log(`working on file: ${filename}`);
    return compileFromFile(filename)
        .then(cret => {
            if (cret.accept) console.log(`compile ${filename} accepted`);
            else {
                console.error(`compile ${filename} not accepted`);
                console.error(cret.error);
            }
        })
        .catch(err => {
            console.log(`error when compiling file: ${filename}`);
            console.error(err.stack)
        });
}

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
    return file.readFile(srcfilepath)
        .then((data) => {
            const compret = compile(data.toString("utf8"), CompileOutputFlag.ICAfterRegAlloc | CompileOutputFlag.IntermediateCode | CompileOutputFlag.MIPS);
            if (compret.error) {
                return new CompileReturn(compret.error);
            } else {
                return Promise.all([
                    file.writeFile(srcfilepath + ".optimized.ic", compret.intermediateCode),
                    file.writeFile(srcfilepath + ".optimized.regallocated.ic", compret.icAfterRegAlloc),
                    file.writeFile(srcfilepath + ".asm", compret.mips)
                ])
                    .then(() => new CompileReturn());
            }
        });
}
