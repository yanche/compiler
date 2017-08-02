
import * as a from "./ast";
import * as c from "../../compile";
import * as util from "./util";

export default function analysize(root: a.ASTNode_globaldefs, classlookup: util.ClassLookup, fnlookup: util.FunctionLookup): util.SemanticCheckReturn {
    //predefined class
    classlookup.addClass("Object", c.noArea);
    classlookup.getClass("Object").setParent(null);
    //predefined function
    util.predefinedFn.print_int.mipslabel = fnlookup.addFn(util.predefinedFn.print_int.name, util.predefinedFn.print_int.rettype, util.predefinedFn.print_int.argtypelist, c.noArea).getMIPSLabel();
    util.predefinedFn.print_bool.mipslabel = fnlookup.addFn(util.predefinedFn.print_bool.name, util.predefinedFn.print_bool.rettype, util.predefinedFn.print_bool.argtypelist, c.noArea).getMIPSLabel();
    util.predefinedFn.print_newline.mipslabel = fnlookup.addFn(util.predefinedFn.print_newline.name, util.predefinedFn.print_newline.rettype, util.predefinedFn.print_newline.argtypelist, c.noArea).getMIPSLabel();

    //first loop, collect all classes
    for (let node of root.children) {
        if (node instanceof a.ASTNode_classdef) {
            let nametoken = node.name;
            if (util.isType(nametoken.rawstr, classlookup)) return new util.SemanticCheckReturn(false, "cannot define class, name duplication: " + nametoken.rawstr + " at " + nametoken.area, 0);
            else classlookup.addClass(nametoken.rawstr, node.area);
        }
    }

    //second loop, collect class inheritance relationship and function/method/field definition
    for (let node of root.children) {
        if (node instanceof a.ASTNode_classdef) {
            let parentclassname = node.extendfrom == null ? "Object" : node.extendfrom.rawstr;
            let parentclass = classlookup.getClass(parentclassname);
            if (parentclass == null) return new util.SemanticCheckReturn(false, "not a valid class to inherit: " + parentclassname + " at " + (node.extendfrom == null ? c.noArea : node.extendfrom.area), 0);
            //set base class
            let classdef = classlookup.getClass(node.name.rawstr);
            classdef.setParent(parentclass);
            let noconstructor = true;
            for (let b of node.body.children) {
                if (b instanceof a.ASTNode_vardeclare) {
                    //process a new field
                    let type = b.type.type;
                    if (!util.isType(type.basetype, classlookup)) return new util.SemanticCheckReturn(false, "not a valid type: " + type.basetype + " at " + b.type.area, 0);
                    if (classdef.hasOwnField(b.name.rawstr)) return new util.SemanticCheckReturn(false, "duplicate field declaration: " + b.name.rawstr + " at " + b.name.area, 0);
                    classdef.addField(b.name.rawstr, type, b.area);
                }
                else {
                    //check type of argument list and return declaration
                    for (let a of b.argumentlist.children) { if (!util.isType(a.type.type.basetype, classlookup)) return new util.SemanticCheckReturn(false, "not a valid type: " + a.type.type + " at " + a.type.area, 0); }
                    if (!util.isFnRet(b.returntype.type.basetype, classlookup)) return new util.SemanticCheckReturn(false, "not a valid method return type: " + b.returntype.type + " at " + b.returntype.area, 0);
                    let argtypelist = [new util.Type(classdef.name, 0)].concat(toArgTypeList(b.argumentlist));
                    if (fnlookup.hasMethod(b.name.rawstr, classdef.name, argtypelist)) return new util.SemanticCheckReturn(false, "duplicate method/constructor declaration: " + b.name.rawstr + " at " + b.name.area, 0);
                    //constructor or method
                    fnlookup.addMethod(b.name.rawstr, classdef.name, b.returntype.type, argtypelist, node.area).astnode = b;
                    if (noconstructor && b.name.rawstr === util.ClassLookup.constructorFnName) noconstructor = false;
                }
            }
            classdef.noConstructor = noconstructor;
        }
        else {
            //check type of argument list and return declaration
            for (let a of node.argumentlist.children) { if (!util.isType(a.type.type.basetype, classlookup)) return new util.SemanticCheckReturn(false, "not a valid type: " + a.type.type.basetype + " at " + a.type.area, 0); }
            if (!util.isFnRet(node.returntype.type.basetype, classlookup)) return new util.SemanticCheckReturn(false, "not a valid type: " + node.returntype.type.basetype + " at " + node.returntype.area, 0);
            //check existence of same function (by signiture)
            let argtypelist = toArgTypeList(node.argumentlist);
            if (fnlookup.hasFn(node.name.rawstr, argtypelist)) return new util.SemanticCheckReturn(false, "function already exists (with same signiture): " + node.name.rawstr + " at " + node.name.area, 0);
            //add function declaration
            fnlookup.addFn(node.name.rawstr, node.returntype.type, argtypelist, node.area).astnode = node;
        }
    }

    let cret = buildVTableAndField(classlookup, fnlookup);
    if (!cret.accept) return cret;

    let mainfn = fnlookup.getApplicableFn("main", [], classlookup);
    if (mainfn.length === 0) return new util.SemanticCheckReturn(false, "entry function (main without parameter) is not found", 0);
    if (mainfn.length > 1) throw new Error("impossible code path, reserve for debugging purpose");
    if (!mainfn[0].rettype.isVoid()) return new util.SemanticCheckReturn(false, "entry function must return void, at " + mainfn[0].area, 0);
    fnlookup.mainfnmipslabel = mainfn[0].getMIPSLabel();

    //return root.typecheck(new c.SymbolFrame(null), classlookup, fnlookup, new util.SemContext());
    //"" for global functions
    for (let classname of classlookup.getAllClasses().concat(null)) {
        let classdef = classlookup.getClass(classname);
        for (let fndef of fnlookup.findMethods(classname)) {
            if (fndef.astnode == null) continue;
            let cret = fndef.astnode.makeSymbolTable(classname, classlookup);
            if (!cret.accept) return cret;
            cret = fndef.astnode.typeAnalysis(classlookup, fnlookup, new util.SemContext(fndef.rettype, (classdef == null || fndef.name !== util.ClassLookup.constructorFnName) ? null : classdef.getParent(), classdef));
            if (!cret.accept) return cret;
            cret = fndef.astnode.codepathAnalysis();
            if (!cret.accept) return cret;
        }
    }

    return new util.SemanticCheckReturn(true);
}

function toArgTypeList(arglist: a.ASTNode_argumentlist): Array<util.Type> {
    return arglist.children.map(a => a.type.type);
}

function buildVTableAndFieldOnClass(classdef: util.ClassDefinition, fnlookup: util.FunctionLookup, colormap: Map<string, number>, classlookup: util.ClassLookup): util.SemanticCheckReturn {
    if (colormap.get(classdef.name) === 1) return new util.SemanticCheckReturn(false, "class loop inheritance: " + classdef.name + " at " + classdef.area, 0);
    if (colormap.get(classdef.name) === 2) return new util.SemanticCheckReturn(true); //work finished
    colormap.set(classdef.name, 1);
    let parentclass = classdef.getParent(), parentvtable: Array<util.FunctionDefinition> = null, parentfieldspace: Array<util.Field> = null, parentclassbytelength: number = null;
    if (parentclass != null) {
        //generate parent vtable
        let cret = buildVTableAndFieldOnClass(parentclass, fnlookup, colormap, classlookup);
        if (!cret.accept) return cret;
        parentvtable = parentclass.vmethodTable;
        parentfieldspace = parentclass.fieldSpace;
        parentclassbytelength = parentclass.byteLength;
    }
    else {
        parentvtable = new Array<util.FunctionDefinition>(); //parent class name: null means current class is "Object" and it has no parent class
        parentfieldspace = new Array<util.Field>();
        //for virtual table ptr
        parentclassbytelength = 4;
    }

    //construct virtual method table
    let selfdefmethods = fnlookup.findMethods(classdef.name), plen = parentvtable.length, selfvtable: Array<util.FunctionDefinition> = [].concat(parentvtable);
    for (let fndef of selfdefmethods) {
        //here we ignore the constructor, it does not need to appear in virtual-method-table
        if (fndef.name === util.ClassLookup.constructorFnName) continue;
        let i = 0;
        for (; i < plen; ++i) {
            if (selfvtable[i].overridedBy(fndef)) {
                if (selfvtable[i].rettype.equals2(fndef.rettype)) {
                    //replace entry from parent
                    selfvtable[i] = fndef;
                    break;
                }
                else return new util.SemanticCheckReturn(false, "return type must be the same in method override: " + fndef.name + " at " + fndef.area, 0);
            }
        }
        if (i === plen) {
            //add entry for self-defined method
            selfvtable.push(fndef);
        }
    }
    classdef.vmethodTable = selfvtable;

    //construct fields on class
    let selffields = classdef.getOwnFields();
    for (let field of selffields) {
        for (let parentfield of parentfieldspace) {
            if (field.name === parentfield.name) return new util.SemanticCheckReturn(false, "cannot define field: " + field.name + " as its parent already has it, at " + parentfield.area, 0);
        }
    }
    //put the non-bool (4 bytes length) at lower address and bool fields at higher address space
    let nonboolfields = selffields.filter(f => !f.type.isBool());
    let boolfields = selffields.filter(f => f.type.isBool());
    //first 4 bytes is the address to vtable, also called vptr
    let offset = parentclassbytelength;
    for (let f of nonboolfields) { f.offset = offset; offset += 4; }
    for (let f of boolfields) f.offset = offset++;
    classdef.fieldSpace = parentfieldspace.concat(nonboolfields).concat(boolfields);
    classdef.byteLength = Math.ceil(offset / 4) * 4;

    colormap.set(classdef.name, 2);
    return new util.SemanticCheckReturn(true);
}

function buildVTableAndField(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup): util.SemanticCheckReturn {
    let colormap = new Map<string, number>(), classes = classlookup.getAllClasses();
    for (let m of classes) { colormap.set(m, 0); }//color: 0->unvisited, 1->working on, 2->work finish
    let len = classes.length, i = 0;
    while (true) {
        while (i < len && colormap.get(classes[i]) != 0)++i;
        if (i == len) return new util.SemanticCheckReturn(true);
        let cret = buildVTableAndFieldOnClass(classlookup.getClass(classes[i]), fnlookup, colormap, classlookup);
        if (!cret.accept) return cret;
    }
}
