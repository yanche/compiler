
import { ASTNode_globaldefs, ASTNode_classdef, ASTNode_vardeclare, ASTNode_argumentlist, ASTNode_constructordef } from "../ast";
import { noArea, SemanticError, Area } from "../../../compile";
import { predefinedFn, ClassLookup, FunctionLookup, SemanticCheckReturn, isType, isFnRet, Type, FunctionDefinition, ClassDefinition, Field, SemContext, createInvalidTypeReturn } from "../util";
import { ErrorCode } from "../error";

const rootClassName = "Object";

export function buildGlobalTypes(root: ASTNode_globaldefs): {
    result: SemanticCheckReturn;
    classlookup?: ClassLookup;
    fnlookup?: FunctionLookup;
} {
    const classlookup = new ClassLookup();
    const fnlookup = new FunctionLookup();
    //predefined classes
    classlookup.addClass(rootClassName, noArea);
    classlookup.getClass(rootClassName).setParent(null);

    //predefined functions
    predefinedFn.print_int.mipslabel = fnlookup.addFn(predefinedFn.print_int.name, predefinedFn.print_int.rettype, predefinedFn.print_int.argtypelist, noArea, true).getMIPSLabel();
    predefinedFn.print_bool.mipslabel = fnlookup.addFn(predefinedFn.print_bool.name, predefinedFn.print_bool.rettype, predefinedFn.print_bool.argtypelist, noArea, true).getMIPSLabel();
    predefinedFn.print_newline.mipslabel = fnlookup.addFn(predefinedFn.print_newline.name, predefinedFn.print_newline.rettype, predefinedFn.print_newline.argtypelist, noArea, true).getMIPSLabel();

    //first loop, collect all classes
    for (const node of root.children) {
        if (node instanceof ASTNode_classdef) {
            const nametoken = node.name;
            if (isType(nametoken.rawstr, classlookup)) return makeErrorRet(`cannot define class, name duplication: ${nametoken.rawstr} at ${nametoken.area}`, ErrorCode.DUP_CLASS_DEFINITION);
            else classlookup.addClass(nametoken.rawstr, node.area);
        }
    }

    //second loop, collect class inheritance relationship and function/method/field definition
    for (const node of root.children) {
        if (node instanceof ASTNode_classdef) {
            const parentclassname = node.extendfrom ? node.extendfrom.rawstr : rootClassName;
            const parentclass = classlookup.getClass(parentclassname);
            if (!parentclass) return makeErrorRet(`not a valid class to inherit: ${parentclassname} at ${node.extendfrom.area}`, ErrorCode.CLASS_NOTFOUND);
            //set base class
            const classdef = classlookup.getClass(node.name.rawstr);
            classdef.setParent(parentclass);
            for (const b of node.body.children) {
                if (b instanceof ASTNode_vardeclare) {
                    //process a new field
                    const type = b.type.type;
                    if (!isType(type.basetype, classlookup)) return makeInvalidTypeRet(type.basetype, b.type.area);
                    if (classdef.hasOwnField(b.name.rawstr)) return makeErrorRet(`duplicate field declaration: ${b.name.rawstr} at ${b.name.area}`, ErrorCode.DUP_FIELD_DEFINITION);
                    classdef.addField(b.name.rawstr, type, b.area);
                }
                else if (b instanceof ASTNode_constructordef) {
                    for (const a of b.argumentlist.children) { if (!isType(a.type.type.basetype, classlookup)) return makeInvalidTypeRet(a.type.type.basetype, a.type.area); }
                    const argtypelist = [new Type(classdef.name, 0)].concat(toArgTypeList(b.argumentlist));
                    if (fnlookup.hasConstructor(classdef.name, argtypelist)) return makeErrorRet(`duplicate constructor declaration: ${b.area}`, ErrorCode.DUP_CONSTRUCTOR_DEFINITION);
                    fnlookup.addConstructor(classdef.name, argtypelist, b.area).astnode = b;
                }
                else {
                    for (const a of b.argumentlist.children) { if (!isType(a.type.type.basetype, classlookup)) return makeInvalidTypeRet(a.type.type.basetype, a.type.area); }
                    if (!isFnRet(b.returntype.type.basetype, classlookup)) return makeInvalidTypeRet(b.returntype.type.basetype, b.returntype.area);
                    const argtypelist = [new Type(classdef.name, 0)].concat(toArgTypeList(b.argumentlist));
                    if (fnlookup.hasDefinedMethod(b.name.rawstr, classdef.name, argtypelist)) return makeErrorRet(`duplicate method declaration: ${b.name.rawstr} at ${b.name.area}`, ErrorCode.DUP_METHOD_DEFINITION);
                    fnlookup.addMethod(b.name.rawstr, classdef.name, b.returntype.type, argtypelist, b.area).astnode = b;
                }
            }
        }
        else {
            //check type of argument list and return declaration
            for (const a of node.argumentlist.children) { if (!isType(a.type.type.basetype, classlookup)) return makeInvalidTypeRet(a.type.type.basetype, a.type.area); }
            if (!isFnRet(node.returntype.type.basetype, classlookup)) return makeInvalidTypeRet(node.returntype.type.basetype, node.returntype.area);
            //check existence of same function (by signiture)
            const argtypelist = toArgTypeList(node.argumentlist);
            if (fnlookup.hasFn(node.name.rawstr, argtypelist)) return makeErrorRet(`function already exists (with same signiture): ${node.name.rawstr} at ${node.name.area}`, ErrorCode.DUP_FN_DEFINITION);
            //add function declaration
            fnlookup.addFn(node.name.rawstr, node.returntype.type, argtypelist, node.area, false).astnode = node;
        }
    }

    const cret = buildVTableAndField(classlookup, fnlookup);
    if (!cret.accept) return { result: cret };
    else return {
        result: cret,
        classlookup: classlookup,
        fnlookup: fnlookup
    };

    function makeErrorRet(errmsg: string, errcode: number) {
        return {
            result: new SemanticCheckReturn(new SemanticError(errmsg, errcode))
        };
    }
    function makeInvalidTypeRet(typeBaseName: string, area: Area) {
        return {
            result: createInvalidTypeReturn(typeBaseName, area)
        }
    }
}

export function semanticAnalysize(classlookup: ClassLookup, fnlookup: FunctionLookup): SemanticCheckReturn {
    const mainfn = fnlookup.getApplicableFn("main", [], classlookup);
    if (mainfn.length === 0) return new SemanticCheckReturn(new SemanticError("entry function (main without parameter) is not found", ErrorCode.ENTRY_NOTFOUND));
    if (mainfn.length > 1) throw new Error("impossible code path, reserve for debugging purpose");
    if (!mainfn[0].rettype.isVoid()) return new SemanticCheckReturn(new SemanticError(`entry function must return void, at ${mainfn[0].area}`, ErrorCode.ENTRY_RETURNS_VOID));
    fnlookup.mainfnmipslabel = mainfn[0].getMIPSLabel();

    // includes methods, constructors, global functions
    const allFnList = classlookup.getAllClasses().map(c => {
        return { fnList: fnlookup.findMethods(c).concat(fnlookup.findConstructors(c)), classdef: classlookup.getClass(c) };
    }).concat({ fnList: fnlookup.allFn(), classdef: null });
    for (const item of allFnList) {
        for (const fndef of item.fnList) {
            if (fndef.predefined) continue;
            let cret = fndef.astnode.makeSymbolTable(item.classdef ? item.classdef.name : null, classlookup);
            if (!cret.accept) return cret;
            cret = fndef.astnode.typeAnalysis(classlookup, fnlookup, new SemContext(fndef.rettype, fndef.name === ClassLookup.constructorFnName, item.classdef));
            if (!cret.accept) return cret;
            cret = fndef.astnode.codepathAnalysis();
            if (!cret.accept) return cret;
        }
    }

    return new SemanticCheckReturn();
}

function toArgTypeList(arglist: ASTNode_argumentlist): Array<Type> {
    return arglist.children.map(a => a.type.type);
}

function buildVTableAndFieldOnClass(classdef: ClassDefinition, fnlookup: FunctionLookup, colormap: Map<string, number>, classlookup: ClassLookup): SemanticCheckReturn {
    if (colormap.get(classdef.name) === 1) return new SemanticCheckReturn(new SemanticError(`class loop inheritance: ${classdef.name} at ${classdef.area}`, ErrorCode.CLASS_LOOP_INHERITANCE));
    if (colormap.get(classdef.name) === 2) return new SemanticCheckReturn(); //work finished
    colormap.set(classdef.name, 1);
    const parentclass = classdef.getParent();
    let parentvtable: Array<FunctionDefinition> = null, parentfieldspace: Array<Field> = null, parentclassbytelength: number = null;
    if (parentclass) {
        //generate parent vtable
        const cret = buildVTableAndFieldOnClass(parentclass, fnlookup, colormap, classlookup);
        if (!cret.accept) return cret;
        parentvtable = parentclass.vmethodTable;
        parentfieldspace = parentclass.fieldSpace;
        parentclassbytelength = parentclass.byteLength;
    }
    else {
        parentvtable = new Array<FunctionDefinition>(); //parent class name: null means current class is "Object" and it has no parent class
        parentfieldspace = new Array<Field>();
        //for virtual table ptr
        parentclassbytelength = 4;
    }

    //construct virtual method table
    const selfdefmethods = fnlookup.findMethods(classdef.name), plen = parentvtable.length, selfvtable: Array<FunctionDefinition> = [].concat(parentvtable);
    for (const fndef of selfdefmethods) {
        let i = 0;
        for (; i < plen; ++i) {
            if (selfvtable[i].overridedBy(fndef)) {
                if (selfvtable[i].rettype.equals2(fndef.rettype)) {
                    //replace entry from parent
                    selfvtable[i] = fndef;
                    break;
                }
                else return new SemanticCheckReturn(new SemanticError(`return type must be the same in method override: ${fndef.name} at ${fndef.area}`, ErrorCode.METHOD_OVERRIDE_RETURN_TYPE));
            }
        }
        if (i === plen) {
            //add entry for self-defined method
            selfvtable.push(fndef);
        }
    }
    classdef.vmethodTable = selfvtable;

    //construct fields on class
    const selffields = classdef.getOwnFields();
    for (const field of selffields) {
        for (const parentfield of parentfieldspace) {
            if (field.name === parentfield.name) return new SemanticCheckReturn(new SemanticError(`cannot define field: ${field.name} as its parent already has it, at ${parentfield.area}`, ErrorCode.PARENT_HAS_FIELD));
        }
    }
    //put the non-bool (4 bytes length) at lower address and bool fields at higher address space
    const nonboolfields = selffields.filter(f => !f.type.isBool());
    const boolfields = selffields.filter(f => f.type.isBool());
    //first 4 bytes is the address to vtable, also called vptr
    let offset = parentclassbytelength;
    for (const f of nonboolfields) { f.offset = offset; offset += 4; }
    for (const f of boolfields) f.offset = offset++;
    classdef.fieldSpace = parentfieldspace.concat(nonboolfields).concat(boolfields);
    classdef.byteLength = Math.ceil(offset / 4) * 4;

    colormap.set(classdef.name, 2);
    return new SemanticCheckReturn();
}

function buildVTableAndField(classlookup: ClassLookup, fnlookup: FunctionLookup): SemanticCheckReturn {
    const colormap = new Map<string, number>(), classes = classlookup.getAllClasses();
    for (const m of classes) { colormap.set(m, 0); }//color: 0->unvisited, 1->working on, 2->work finish
    const len = classes.length;
    let i = 0;
    while (true) {
        while (i < len && colormap.get(classes[i]) !== 0)++i;
        if (i === len) return new SemanticCheckReturn();
        const cret = buildVTableAndFieldOnClass(classlookup.getClass(classes[i]), fnlookup, colormap, classlookup);
        if (!cret.accept) return cret;
    }
}
