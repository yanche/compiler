
import { noArea, Area, SemanticCheckReturn as BaseSemanticCheckReturn, SemanticError } from "../../compile";
import * as util from "./util";
import * as a from "./ast";
import * as i from "./intermediatecode";
import { IdGen, flatten } from "../../utility";
import { ErrorCode } from "./error";

const PRIMITIVE_TYPE_INT = "int", PRIMITIVE_TYPE_BOOL = "bool";
const SPECIAL_TYPE_NULL = "null", SPECIAL_TYPE_VOID = "void";

export function assignable(fromtype: Type, totype: Type, classlookup: ClassLookup): boolean {
    if (fromtype.isNull()) return isReferenceType(totype, classlookup);
    if (fromtype.depth !== totype.depth) return false;
    if (fromtype.depth !== 0) return fromtype.basetype === totype.basetype;
    if (fromtype.basetype === totype.basetype) return true;
    if (fromtype.basetype === PRIMITIVE_TYPE_BOOL && totype.basetype === PRIMITIVE_TYPE_INT) return true;
    let classdef = classlookup.getClass(fromtype.basetype);
    return classdef != null && classdef.hasAncestor(totype.basetype);
}

export function isReferenceType(type: Type, classlookup: ClassLookup): boolean {
    return type.depth !== 0 || classlookup.hasClass(type.basetype);
}

let primitives = [PRIMITIVE_TYPE_INT, PRIMITIVE_TYPE_BOOL];
export function isType(name: string, classlookup: ClassLookup): boolean {
    return isPrimitive(name) || classlookup.hasClass(name);
}

export function isFnRet(name: string, classlookup: ClassLookup): boolean {
    return name === SPECIAL_TYPE_VOID || isType(name, classlookup);
}

export function isPrimitive(name: string): boolean { return primitives.some(p => p == name); }

export function fnApplicable(argtypelist: Array<Type>, parametertypelist: Array<Type>, classlookup: ClassLookup): { match: boolean, perfect: boolean } {
    let alen = argtypelist.length;
    if (alen === parametertypelist.length) {
        let perfect = true, i = 0;
        for (; i < alen; ++i) {
            let argtype = argtypelist[i], ptype = parametertypelist[i];
            if (!assignable(ptype, argtype, classlookup)) break;
            if (perfect && !ptype.equals2(argtype)) perfect = false;
        }
        if (i === alen) return { match: true, perfect: perfect };
    }
    return { match: false, perfect: false };
}


function hasFnDefined(fnList: Array<FunctionDefinition>, argtypelist: Array<Type>): boolean {
    for (let fndef of (fnList || [])) {
        let fnargtypelist = fndef.argtypelist;
        if (fnargtypelist.length === argtypelist.length && fnargtypelist.every((t, idx) => t.equals2(argtypelist[idx])))
            return true;
    }
    return false;
}

export class FunctionLookup {
    //key1: class name, key2: function name
    private _methodMap: Map<string, Map<string, Array<FunctionDefinition>>>;
    private _constructorMap: Map<string, Array<FunctionDefinition>>;
    private _fnMap: Map<string, Array<FunctionDefinition>>;
    private _seqid: IdGen;
    mainfnmipslabel: string;

    hasFn(fnname: string, argtypelist: Array<Type>): boolean {
        return hasFnDefined(this._fnMap.get(fnname), argtypelist);
    }

    hasDefinedMethod(methodname: string, classname: string, argtypelist: Array<Type>): boolean {
        let classMethodMap = this._methodMap.get(classname);
        return classMethodMap ? hasFnDefined(classMethodMap.get(methodname), argtypelist) : false;
    }

    hasConstructor(classname: string, argtypelist: Array<Type>): boolean {
        return hasFnDefined(this._constructorMap.get(classname), argtypelist);
    }

    addFn(fnname: string, rettype: Type, argtypelist: Array<Type>, area: Area, predefined: boolean): FunctionDefinition {
        if (this.hasFn(fnname, argtypelist)) throw new Error(`function exists: ${FunctionSigniture.toString(fnname, "", argtypelist)}`);
        let fnList = this._fnMap.get(fnname);
        if (!fnList) {
            fnList = [];
            this._fnMap.set(fnname, fnList);
        }
        let fndef = new FunctionDefinition(fnname, "", rettype, argtypelist, area, this._seqid, predefined);
        fnList.push(fndef);
        return fndef;
    }

    addConstructor(classname: string, argtypelist: Array<Type>, area: Area): FunctionDefinition {
        if (this.hasConstructor(classname, argtypelist)) throw new Error(`constructor exists: ${FunctionSigniture.toString(ClassLookup.constructorFnName, classname, argtypelist)}`);
        let consList = this._constructorMap.get(classname);
        if (!consList) {
            consList = [];
            this._constructorMap.set(classname, consList);
        }
        let consdef = new FunctionDefinition(ClassLookup.constructorFnName, classname, null, argtypelist, area, this._seqid, false);
        consList.push(consdef);
        return consdef;
    }

    addMethod(methodname: string, classname: string, rettype: Type, argtypelist: Array<Type>, area: Area): FunctionDefinition {
        if (this.hasDefinedMethod(methodname, classname, argtypelist)) throw new Error(`method exists: ${FunctionSigniture.toString(methodname, classname, argtypelist)}`);
        let classMethodMap = this._methodMap.get(classname);
        if (!classMethodMap) {
            classMethodMap = new Map<string, Array<FunctionDefinition>>();
            this._methodMap.set(classname, classMethodMap);
        }
        let methodList = classMethodMap.get(methodname);
        if (!methodList) {
            methodList = [];
            classMethodMap.set(methodname, methodList);
        }
        let methoddef = new FunctionDefinition(methodname, classname, rettype, argtypelist, area, this._seqid, false);
        methodList.push(methoddef);
        return methoddef;
    }

    // getApplicableMethod(fnname: string, classname: string, parametertypelist: Array<Type>, classlookup: ClassLookup): Array<FunctionDefinition> {
    //     let fnlist = this._map.get(classname).get(fnname);
    //     let candidates = new Array<FunctionDefinition>();
    //     for (let fndef of fnlist) {
    //         let app = fnApplicable(fndef, fnname, parametertypelist, classlookup);
    //         if (app.match) {
    //             if (app.perfect) return [fndef];
    //             else candidates.push(fndef);
    //         }
    //     }
    //     return candidates;
    // }

    getApplicableFn(fnname: string, parametertypelist: Array<Type>, classlookup: ClassLookup): Array<FunctionDefinition> {
        let fnlist = this._fnMap.get(fnname);
        let candidates = new Array<FunctionDefinition>();
        for (let fndef of fnlist) {
            let app = fnApplicable(fndef.argtypelist, parametertypelist, classlookup);
            if (app.match) {
                if (app.perfect) return [fndef];
                else candidates.push(fndef);
            }
        }
        return candidates;
    }

    getApplicableConstructor(classdef: ClassDefinition, parametertypelist: Array<Type>, classlookup: ClassLookup): { noop: boolean; candidates?: Array<FunctionDefinition>; } {
        if (!classdef) return { noop: true };
        else {
            let fnlist = this._constructorMap.get(classdef.name);
            if (!fnlist) return this.getApplicableConstructor(classdef.getParent(), parametertypelist, classlookup);
            let candidates = new Array<FunctionDefinition>();
            for (let fndef of fnlist) {
                // ignore first parameter of constructor, the "this" pointer
                let app = fnApplicable(fndef.argtypelist.slice(1), parametertypelist, classlookup);
                if (app.match) {
                    if (app.perfect) return { noop: false, candidates: [fndef] };
                    else candidates.push(fndef);
                }
            }
            return { candidates: candidates, noop: false };
        }
    }

    findMethods(classname: string): Array<FunctionDefinition> {
        let ret = new Array<Array<FunctionDefinition>>();
        let m1 = this._methodMap.get(classname);
        if (m1)
            for (let x of m1) ret.push(x[1]);
        return flatten(ret);
    }

    constructor() {
        this._methodMap = new Map<string, Map<string, Array<FunctionDefinition>>>();
        this._constructorMap = new Map<string, Array<FunctionDefinition>>();
        this._fnMap = new Map<string, Array<FunctionDefinition>>();
        this._seqid = new IdGen();
    }
}

export class FunctionDefinition {
    signiture: FunctionSigniture;
    astnode: a.ASTNode_functiondef;

    private _predefined: boolean;
    private _seqid: number;

    constructor(public name: string, public classname: string, public rettype: Type, public argtypelist: Array<Type>, public area: Area, seqIdGen: IdGen, predefined: boolean) {
        this.signiture = new FunctionSigniture(name, classname, argtypelist);
        this.astnode = null;
        this._seqid = seqIdGen.next();
        this._predefined = predefined;
    }

    get predefined(): boolean {
        return this._predefined;
    }

    getMIPSLabel(): string {
        return `fnlabel_${this._seqid}`;
    }

    getMIPSLabel_return(): string {
        return `fnlabel_${this._seqid}_return`;
    }

    //NOTE: this method do not test on class inheritence relationship
    overridedBy(fndef: FunctionDefinition): boolean {
        //ignore the type match for "this" pointer
        return this.name === fndef.name && this.argtypelist.length === fndef.argtypelist.length && this.argtypelist.every((a, idx) => idx === 0 || fndef.argtypelist[idx].equals2(a))
            && Boolean(this.classname) && Boolean(fndef.classname);
    }
}

export class FunctionSigniture {
    private _name: string;
    private _classname: string;
    private _argtypelist: Array<Type>;
    constructor(name: string, classname: string, argtypelist: Array<Type>) {
        this._name = name;
        this._classname = classname || "";
        this._argtypelist = argtypelist;
    }
    equals(name: string, classname: string, argtypelist: Array<Type>) {
        return this._name === name && this._classname === (classname || "") && this._argtypelist.length === argtypelist.length && this._argtypelist.every((type, idx) => {
            return type.equals2(argtypelist[idx]);
        });
    }
    toString(): string {
        return FunctionSigniture.toString(this._name, this._classname, this._argtypelist);
    }
    static toString(name: string, classname: string, argtypelist: Array<Type>): string {
        let classprefix = classname ? (classname + ":") : "";
        return [classprefix + name].concat(argtypelist.map(type => type.toString())).join(":");
    }
}

export class Field {
    //by byte
    offset: number;
    constructor(public name: string, public type: Type, public area: Area) { }
}

export class ClassDefinition {
    private _parentclass: ClassDefinition;
    //self-defined fields
    private _fields: Map<string, Field>;

    fieldSpace: Array<Field>;
    vmethodTable: Array<FunctionDefinition>;
    byteLength: number;

    setParent(parent: ClassDefinition): this {
        this._parentclass = parent;
        return this;
    }

    getParent(): ClassDefinition {
        return this._parentclass;
    }

    hasOwnField(name: string): boolean { return this._fields.has(name); }

    addField(name: string, type: Type, area: Area): this {
        if (this.hasOwnField(name)) throw new Error("field exists: " + name);
        this._fields.set(name, new Field(name, type, area));
        return this;
    }

    getOwnFields(): Array<Field> {
        return [...this._fields].map(x => x[1]);
    }

    //hasField(name: string): boolean { return this.getField(name) != null; }
    getField(name: string): Field {
        for (let f of this.fieldSpace) {
            if (f.name === name) return f;
        }
        return null;
    }

    hasAncestor(classname: string): boolean {
        if (!this._parentclass) return false;
        else if (this._parentclass.name === classname) return true;
        else return this._parentclass.hasAncestor(classname);
    }

    getMIPSVTableLabel(): string {
        return `vtable_${this.name}`;
    }

    constructor(public name: string, public area: Area) {
        this._fields = new Map<string, Field>();
        this._parentclass = null;
        this.vmethodTable = null;
        this.fieldSpace = null;
    }
}

export class ClassLookup {
    static constructorFnName = "constructor";
    private _map: Map<string, ClassDefinition>;

    hasClass(classname: string): boolean {
        return this._map.has(classname);
    }

    addClass(classname: string, area: Area): this {
        if (this._map.has(classname)) throw new Error(`class exists: ${classname}`);
        this._map.set(classname, new ClassDefinition(classname, area));
        return this;
    }

    getClass(classname: string): ClassDefinition {
        return this._map.get(classname);
    }

    getAllClasses(): Array<string> {
        let ret = new Array<string>();
        for (let m of this._map) ret.push(m[0]);
        return ret;
    }

    constructor() {
        this._map = new Map<string, ClassDefinition>();
    }
}


export class SymbolFrame {
    private _map: Map<string, SymbolAttrs>;
    private _parent: SymbolFrame;

    find(varname: string): SymbolAttrs {
        if (this._map.has(varname)) return this._map.get(varname);
        else if (this._parent == null) return null;
        else return this._parent.find(varname);
    }

    add(varname: string, symattrs: SymbolAttrs): this {
        if (!symattrs) throw new Error("null symbol-attributes is not allowed");
        if (this._map.has(varname)) throw new Error("variable " + varname + " exists");
        this._map.set(varname, symattrs);
        return this;
    }

    has(varname: string): boolean {
        return this.find(varname) != null;
    }

    hasOnTop(varname: string): boolean {
        return this._map.has(varname);
    }

    newFrame(): SymbolFrame { return new SymbolFrame(this); }

    constructor(parent: SymbolFrame) {
        this._map = new Map<string, SymbolAttrs>();
        this._parent = parent;
    }
}

export class SymbolAttrs {
    //used in intermediate code generation
    private _tmpregid: number;
    private _declaredArea: Area;

    constructor(public type: Type, tmpregid: number, declaredArea: Area) {
        this._tmpregid = tmpregid;
        this._declaredArea = declaredArea;
    }

    get declaredArea(): Area { return this._declaredArea; }

    get tmpRegId(): number { return this._tmpregid; }
}

export class SemanticCheckReturn extends BaseSemanticCheckReturn {
    private _type: Type;
    private _returns: boolean;

    constructor(error?: SemanticError) {
        super(error);
        this._type = null;
        this._returns = false;
    }
    get type(): Type { return this._type; }
    setType(type: Type): this { this._type = type; return this; }
    get returns(): boolean { return this._returns; }
    setReturns(): this { this._returns = true; return this; }
}

export class Type {
    constructor(public basetype: string, public depth: number) { };

    toString(): string {
        return Type.toString(this.basetype, this.depth);
    }

    equals2(type: Type): boolean {
        return this.basetype === type.basetype && this.depth === type.depth;
    }

    equals(basetype: string, depth: number): boolean {
        return this.basetype === basetype && this.depth === depth;
    }

    isBool(): boolean {
        return this.equals(PRIMITIVE_TYPE_BOOL, 0);
    }

    isInt(): boolean {
        return this.equals(PRIMITIVE_TYPE_INT, 0);
    }

    isVoid(): boolean {
        return this.equals(SPECIAL_TYPE_VOID, 0);
    }

    isNull(): boolean {
        return this.equals(SPECIAL_TYPE_NULL, 0);
    }

    static void = new Type(SPECIAL_TYPE_VOID, 0);
    static null = new Type(SPECIAL_TYPE_NULL, 0);

    static toString(basetype: string, depth: number): string {
        return depth === 0 ? basetype : ["[", Type.toString(basetype, depth - 1), "]"].join("");
    }

    static intType(depth: number): Type {
        return new Type(PRIMITIVE_TYPE_INT, depth);
    }
    static boolType(depth: number): Type {
        return new Type(PRIMITIVE_TYPE_BOOL, depth);
    }
}

export class SemContext {
    constructor(public rettype: Type, public inConstructor: boolean, public classdef: ClassDefinition) { }
}

export class IcContext {
    //for continue statement
    loopEndLabel: CodeLabel;
    afterLoopLabel: CodeLabel;
    constructor() {
        this.loopEndLabel = null;
        this.afterLoopLabel = null;
    }
}

//intermediate code label
export class CodeLabel {
    num: number;
    owner: i.CodeLine;
    upstreams: Array<i.CodeLine>;
    //get num(): number { return this._num; }
    toString(): string {
        return "label_" + this.num;
    }
    constructor() {
        this.num = null;
        this.owner = null;
        this.upstreams = null;
    }
}

class PredefinedFunction {
    mipslabel: string;
    constructor(public name: string, public rettype: Type, public argtypelist: Array<Type>) { }
}
let predefinedFn = {
    print_int: new PredefinedFunction("print_int", Type.void, [new Type(PRIMITIVE_TYPE_INT, 0)]),
    print_bool: new PredefinedFunction("print_bool", Type.void, [new Type(PRIMITIVE_TYPE_BOOL, 0)]),
    print_newline: new PredefinedFunction("print_newline", Type.void, [])
}

const TMP_REGS_FP = -1;
export { predefinedFn, TMP_REGS_FP };

export function createInvalidTypeReturn(typeBaseName: string, area: Area): SemanticCheckReturn {
    return new SemanticCheckReturn(new SemanticError(`invalid type: ${typeBaseName}, at ${area}`, ErrorCode.TYPE_NOTFOUND));
}
