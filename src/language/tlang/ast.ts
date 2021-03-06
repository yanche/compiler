
import { Area, Token, ASTNode as ASTNodeBase, SemanticError, noArea } from "../../compile";
import * as util from "./util";
import { IdGen, range } from "../../utility";
import * as tc from "./tac";
import { CodeLine } from "./intermediatecode";
import { ErrorCode } from "./error";
import createInvalidTypeReturn = util.createInvalidTypeReturn;

function createTypeAssignMismatchReturn(rtype: util.Type, ltype: util.Type, area: Area): util.SemanticCheckReturn {
    return new util.SemanticCheckReturn(new SemanticError(`cannot assign type of ${rtype} to ${ltype}, at ${area}`, ErrorCode.TYPE_ASSIGN_MISMATCH));
}

function typeAnalysisExprList(exprlist: Array<ASTNode_expr>, parr: Array<util.Type>, classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
    const len = exprlist.length;
    for (let i = 0; i < len; ++i) {
        const cret = exprlist[i].typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        else parr[i] = cret.type;
    }
    return new util.SemanticCheckReturn();
}


export abstract class ASTNode extends ASTNodeBase {
    area: Area;
}

export class ASTNode_globaldefs extends ASTNode {
    constructor(public children: Array<ASTNode_classdef | ASTNode_functiondef>) { super(); }
}

export class ASTNode_functiondef extends ASTNode {
    // private _symboltable: util.SymbolFrame;
    private _tmpregidgen: IdGen;
    private _argtmpregidupper: number;

    constructor(public returntype: ASTNode_type, public name: Token, public argumentlist: ASTNode_argumentlist, public statementlist: ASTNode_statementlist) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        return this.statementlist.typeAnalysis(classlookup, fnlookup, ctx);
    }

    codepathAnalysis(): util.SemanticCheckReturn {
        const cret = this.statementlist.codepathAnalysis(false);
        if (!cret.accept) return cret;
        if (cret.returns || this.returntype.type.isVoid()) return new util.SemanticCheckReturn();
        else return new util.SemanticCheckReturn(new SemanticError(`function/method does not return a value, at ${this.name.area}`, ErrorCode.NOT_ALWAYS_RETURN));
    }

    makeSymbolTable(classname: string, classlookup: util.ClassLookup): util.SemanticCheckReturn {
        const symboltable = new util.SymbolFrame(null);
        // this._symboltable = symboltable;
        this._tmpregidgen = new IdGen();
        if (classname) {
            // for method
            symboltable.add("this", new util.SymbolAttrs(new util.Type(classname, 0), this._tmpregidgen.next(), noArea));
        }
        for (const vardeclare of this.argumentlist.children) {
            const cret = vardeclare.makeSymbolTable(symboltable, classlookup, this._tmpregidgen);
            if (!cret.accept) return cret;
        }
        this._argtmpregidupper = this._tmpregidgen.cur;
        return this.statementlist.makeSymbolTable(symboltable, classlookup, this._tmpregidgen);
    }

    genIntermediateCode(codelines: Array<CodeLine>) {
        this.statementlist.genIntermediateCode(codelines, new util.IcContext(), this._tmpregidgen);
        codelines.push(new CodeLine(new tc.TAC_ret()));
    }

    get tmpRegAssigned(): number { return this._tmpregidgen.cur; }

    get argTmpRegIdList(): Array<number> { return range(0, this._argtmpregidupper); }
}

export class ASTNode_constructordef extends ASTNode_functiondef {
    constructor(argumentlist: ASTNode_argumentlist, statementlist: ASTNode_statementlist) {
        super(null, null, argumentlist, statementlist);
    }

    codepathAnalysis(): util.SemanticCheckReturn {
        return this.statementlist.codepathAnalysis(false);
    }
}

export class ASTNode_classdef extends ASTNode {
    //private _classdef: d.ClassDefinition;
    constructor(public name: Token, public extendfrom: Token, public body: ASTNode_classbody) { super(); }
}

export class ASTNode_type extends ASTNode {
    private _type: util.Type;
    get type(): util.Type {
        if (this._type != null) return this._type;
        else {
            this._type = new util.Type(this.basetype.rawstr, this.depth);
            return this._type;
        }
    }
    constructor(public basetype: Token, public depth: number) { super(); }
}

export class ASTNode_argumentlist extends ASTNode {
    constructor(public children: Array<ASTNode_vardeclare>) { super(); }
}

export class ASTNode_classbody extends ASTNode {
    constructor(public children: Array<ASTNode_vardeclare | ASTNode_functiondef | ASTNode_constructordef>) { super(); }
}

export class ASTNode_exprlist extends ASTNode {
    constructor(public children: Array<ASTNode_expr>) { super(); }
}

export class ASTNode_fnref extends ASTNode {
    constructor(public name: Token) { super(); }
}

export class ASTNode_baseconstructorref extends ASTNode { }

//STATEMENT
export abstract class ASTNode_statement extends ASTNode {
    protected _symboltable: util.SymbolFrame;

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        return new util.SemanticCheckReturn();
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        return new util.SemanticCheckReturn();
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        return new util.SemanticCheckReturn();
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) { }
}

export class ASTNode_noop extends ASTNode_statement { };

export class ASTNode_statementblock extends ASTNode_statement {
    constructor(public statementlist: ASTNode_statementlist) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        return this.statementlist.typeAnalysis(classlookup, fnlookup, ctx);
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        return this.statementlist.codepathAnalysis(inloop);
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        return this.statementlist.makeSymbolTable(symboltable.newFrame(), classlookup, tmpRegIdGen);
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        this.statementlist.genIntermediateCode(codelines, context, tmpRegIdGen);
    }
}

export class ASTNode_statementlist extends ASTNode_statement {
    constructor(public children: Array<ASTNode_statement>) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        for (const l of this.children) {
            const cret = l.typeAnalysis(classlookup, fnlookup, ctx);
            if (!cret.accept) return cret;
        }
        return new util.SemanticCheckReturn();
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        let i = 0;
        const len = this.children.length;
        for (; i < len; ++i) {
            const mret = this.children[i].codepathAnalysis(inloop);
            if (!mret.accept) return mret;
            if (mret.returns) break;
        }
        if (i === len) return new util.SemanticCheckReturn();
        else if (i === len - 1) return new util.SemanticCheckReturn().setReturns();
        else return new util.SemanticCheckReturn(new SemanticError(`unreachable code deteched after all code path returns, at ${new Area(this.children[i + 1].area.start, this.area.end)}`, ErrorCode.UNREACHABLE_PATH));
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        for (const stmt of this.children) {
            const cret = stmt.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
            if (!cret.accept) return cret;
        }
        return new util.SemanticCheckReturn();
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        for (const c of this.children) c.genIntermediateCode(codelines, context, tmpRegIdGen);
    }
}

export class ASTNode_vardeclare extends ASTNode_statement {
    constructor(public type: ASTNode_type, public name: Token) { super(); }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        if (this.name.rawstr === "this") return new util.SemanticCheckReturn(new SemanticError(`cannot use "this" as a variable name: at ${this.name.area}`, ErrorCode.THIS_AS_VARNAME));
        if (symboltable.hasOnTop(this.name.rawstr)) return new util.SemanticCheckReturn(new SemanticError(`duplicate variable declaration: ${this.name.rawstr} at ${this.name.area}`, ErrorCode.DUP_VARIABLE));
        const type = this.type.type;
        if (!util.isType(type.basetype, classlookup)) return createInvalidTypeReturn(type.basetype, this.type.area);
        symboltable.add(this.name.rawstr, new util.SymbolAttrs(type, tmpRegIdGen.next(), this.name.area));
        return new util.SemanticCheckReturn();
    }
}

export class ASTNode_if extends ASTNode_statement {
    constructor(public cond: ASTNode_expr, public thenstat: ASTNode_statement, public elsestat: ASTNode_statement) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const cretcond = this.cond.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cretcond.accept) return cretcond;
        if (!cretcond.type.isBool()) return new util.SemanticCheckReturn(new SemanticError(`expression of condition does not return bool at ${this.cond.area}`, ErrorCode.COND_TAKES_BOOL));
        const cret = this.thenstat.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        return this.elsestat.typeAnalysis(classlookup, fnlookup, ctx);
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        const mret1 = this.thenstat.codepathAnalysis(inloop);
        if (!mret1.accept) return mret1;
        const mret2 = this.elsestat.codepathAnalysis(inloop);
        if (!mret2.accept) return mret2;
        const ret = new util.SemanticCheckReturn();
        if (mret1.returns && mret2.returns) ret.setReturns();
        return ret;
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        let cret = this.cond.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        cret = this.thenstat.makeSymbolTable(symboltable.newFrame(), classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        return this.elsestat.makeSymbolTable(symboltable.newFrame(), classlookup, tmpRegIdGen);
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        const condreg = this.cond.genIntermediateCode_expr(codelines, tmpRegIdGen);
        const truelabel = new util.CodeLabel(), endlabel = new util.CodeLabel();
        codelines.push(new CodeLine(new tc.TAC_btrue(truelabel, condreg)));
        this.elsestat.genIntermediateCode(codelines, context, tmpRegIdGen);
        codelines.push(new CodeLine(new tc.TAC_branch(endlabel)));
        codelines.push(new CodeLine(new tc.TAC_noop(), truelabel));
        this.thenstat.genIntermediateCode(codelines, context, tmpRegIdGen);
        codelines.push(new CodeLine(new tc.TAC_noop(), endlabel));
    }
}

export class ASTNode_while extends ASTNode_statement {
    constructor(public cond: ASTNode_expr, public bodystmt: ASTNode_statement) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const cretcond = this.cond.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cretcond.accept) return cretcond;
        if (!cretcond.type.isBool()) return new util.SemanticCheckReturn(new SemanticError(`expression of condition does not return bool at ${this.cond.area}`, ErrorCode.COND_TAKES_BOOL));
        return this.bodystmt.typeAnalysis(classlookup, fnlookup, ctx);
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        //even if this.bodystmt returns, while statement does not return
        const mret = this.bodystmt.codepathAnalysis(true);
        if (!mret.accept) return mret;
        return new util.SemanticCheckReturn();
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        const cret = this.cond.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        else return this.bodystmt.makeSymbolTable(symboltable.newFrame(), classlookup, tmpRegIdGen);
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        const condlabel = new util.CodeLabel(), endlabel = new util.CodeLabel();
        const old_lelabel = context.loopEndLabel, old_allabel = context.afterLoopLabel;
        context.loopEndLabel = condlabel;
        context.afterLoopLabel = endlabel;
        codelines.push(new CodeLine(new tc.TAC_noop(), condlabel));
        const condreg = this.cond.genIntermediateCode_expr(codelines, tmpRegIdGen);
        codelines.push(new CodeLine(new tc.TAC_bfalse(endlabel, condreg)));
        this.bodystmt.genIntermediateCode(codelines, context, tmpRegIdGen);
        codelines.push(new CodeLine(new tc.TAC_branch(condlabel)));
        codelines.push(new CodeLine(new tc.TAC_noop(), endlabel));
        //restore the old label context
        context.loopEndLabel = old_lelabel;
        context.afterLoopLabel = old_allabel;
    }
}

export class ASTNode_dowhile extends ASTNode_while {
    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        //if this.bodystmt returns, then this do-while statement returns
        return this.bodystmt.codepathAnalysis(true);
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        const startlabel = new util.CodeLabel(), endlabel = new util.CodeLabel();
        const old_lelabel = context.loopEndLabel, old_allabel = context.afterLoopLabel;
        context.loopEndLabel = startlabel;
        context.afterLoopLabel = endlabel;
        codelines.push(new CodeLine(new tc.TAC_noop(), startlabel));
        this.bodystmt.genIntermediateCode(codelines, context, tmpRegIdGen);
        const condreg = this.cond.genIntermediateCode_expr(codelines, tmpRegIdGen);
        codelines.push(new CodeLine(new tc.TAC_btrue(startlabel, condreg)));
        codelines.push(new CodeLine(new tc.TAC_noop(), endlabel));
        //restore the old label context
        context.loopEndLabel = old_lelabel;
        context.afterLoopLabel = old_allabel;
    }
}

export class ASTNode_for extends ASTNode_statement {
    constructor(public initstmt: ASTNode_statement, public cond: ASTNode_expr, public endstmt: ASTNode_statement, public bodystmt: ASTNode_statement) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        let cret = this.initstmt.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        cret = this.cond.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        if (!cret.type.isBool()) return new util.SemanticCheckReturn(new SemanticError(`expression of condition does not return bool at ${this.cond.area}`, ErrorCode.COND_TAKES_BOOL));
        cret = this.endstmt.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        return this.bodystmt.typeAnalysis(classlookup, fnlookup, ctx);
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        let mret = this.initstmt.codepathAnalysis(inloop);
        if (!mret.accept) return mret;
        if (mret.returns) return new util.SemanticCheckReturn(new SemanticError(`unreachable code deteched after init-block of for-statement, at ${this.area}`, ErrorCode.UNREACHABLE_PATH));
        //even if this.bodystmt returns, while statement does not return
        mret = this.bodystmt.codepathAnalysis(true);
        if (!mret.accept) return mret;
        mret = this.endstmt.codepathAnalysis(true);
        if (!mret.accept) return mret;
        return new util.SemanticCheckReturn();
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        symboltable = symboltable.newFrame();
        this._symboltable = symboltable;
        let cret = this.cond.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        cret = this.initstmt.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        cret = this.endstmt.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        return this.bodystmt.makeSymbolTable(symboltable.newFrame(), classlookup, tmpRegIdGen);
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        const condlabel = new util.CodeLabel(), loopendlabel = new util.CodeLabel(), afterlooplabel = new util.CodeLabel();
        this.initstmt.genIntermediateCode(codelines, context, tmpRegIdGen);
        const old_lelabel = context.loopEndLabel, old_allabel = context.afterLoopLabel;
        context.loopEndLabel = loopendlabel;
        context.afterLoopLabel = afterlooplabel;
        codelines.push(new CodeLine(new tc.TAC_noop(), condlabel));
        const condreg = this.cond.genIntermediateCode_expr(codelines, tmpRegIdGen);
        codelines.push(new CodeLine(new tc.TAC_bfalse(afterlooplabel, condreg)));
        this.bodystmt.genIntermediateCode(codelines, context, tmpRegIdGen);
        codelines.push(new CodeLine(new tc.TAC_noop(), loopendlabel));
        this.endstmt.genIntermediateCode(codelines, context, tmpRegIdGen);
        codelines.push(new CodeLine(new tc.TAC_branch(condlabel)));
        codelines.push(new CodeLine(new tc.TAC_noop(), afterlooplabel));
        //restore the old context labels
        context.loopEndLabel = old_lelabel;
        context.afterLoopLabel = old_allabel;
    }
}

export class ASTNode_return extends ASTNode_statement {
    constructor(public retexp: ASTNode_expr) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        // for constructor, ctx.rettype is null
        const returntype = ctx.rettype;
        if (!returntype || returntype.isVoid()) return new util.SemanticCheckReturn(new SemanticError(`function declares to return void, cannot return a value at ${this.area}`, ErrorCode.FN_RETURN_MISMATCH));
        const cret = this.retexp.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        if (util.assignable(cret.type, returntype, classlookup)) return new util.SemanticCheckReturn();
        else return createTypeAssignMismatchReturn(cret.type, returntype, this.retexp.area);
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        return new util.SemanticCheckReturn().setReturns();
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        return this.retexp.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        codelines.push(new CodeLine(new tc.TAC_retreg(this.retexp.genIntermediateCode_expr(codelines, tmpRegIdGen))));
    }
}

export class ASTNode_returnvoid extends ASTNode_statement {
    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        // for constructor, ctx.rettype is null
        const returntype = ctx.rettype;
        if (returntype && !returntype.isVoid()) return new util.SemanticCheckReturn(new SemanticError(`function declares to return ${returntype}, not void, ${this.area}`, ErrorCode.FN_RETURN_MISMATCH));
        return new util.SemanticCheckReturn();
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        return new util.SemanticCheckReturn().setReturns();
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        codelines.push(new CodeLine(new tc.TAC_ret()));
    }
}

export class ASTNode_break extends ASTNode_statement {
    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        codelines.push(new CodeLine(new tc.TAC_branch(context.afterLoopLabel)));
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        if (inloop) return new util.SemanticCheckReturn();
        else return new util.SemanticCheckReturn(new SemanticError(`cannot use break statement out of a loop, at ${this.area}`, ErrorCode.BREAK_OUTSIDE_LOOP));
    }
}

export class ASTNode_continue extends ASTNode_statement {
    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        codelines.push(new CodeLine(new tc.TAC_branch(context.loopEndLabel)));
    }

    codepathAnalysis(inloop: boolean): util.SemanticCheckReturn {
        if (inloop) return new util.SemanticCheckReturn();
        else return new util.SemanticCheckReturn(new SemanticError(`cannot use continue statement out of a loop, at ${this.area}`, ErrorCode.CONTINUE_OUTSIDE_LOOP));
    }
}

export class ASTNode_vardefine extends ASTNode_statement {
    constructor(public type: ASTNode_type, public name: Token, public expr: ASTNode_expr) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const cret = this.expr.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        const type = this._symboltable.find(this.name.rawstr).type;
        if (!util.assignable(cret.type, type, classlookup)) return createTypeAssignMismatchReturn(cret.type, type, this.expr.area);
        return new util.SemanticCheckReturn();
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        const cret = this.expr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        if (this.name.rawstr === "this") return new util.SemanticCheckReturn(new SemanticError(`cannot use "this" as a variable name: at ${this.name.area}`, ErrorCode.THIS_AS_VARNAME));
        if (symboltable.hasOnTop(this.name.rawstr)) return new util.SemanticCheckReturn(new SemanticError(`variable exists: ${this.name.rawstr} at ${this.name.area}`, ErrorCode.DUP_VARIABLE));
        const type = this.type.type;
        if (!util.isType(type.basetype, classlookup)) return createInvalidTypeReturn(type.basetype, this.type.area);
        symboltable.add(this.name.rawstr, new util.SymbolAttrs(type, tmpRegIdGen.next(), this.name.area));
        return new util.SemanticCheckReturn();
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        const exprreg = this.expr.genIntermediateCode_expr(codelines, tmpRegIdGen);
        codelines.push(new CodeLine(new tc.TAC_mov(exprreg, this._symboltable.find(this.name.rawstr).tmpRegId)));
    }
}


//EXPRESSION
export abstract class ASTNode_expr extends ASTNode_statement {
    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        throw new Error("not implemented");
    }

    genIntermediateCode(codelines: Array<CodeLine>, context: util.IcContext, tmpRegIdGen: IdGen) {
        this.genIntermediateCode_expr(codelines, tmpRegIdGen);
    }
}

export class ASTNode_assignment extends ASTNode_expr {
    constructor(public lval: ASTNode_leftval, public expr: ASTNode_expr) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const cret = this.lval.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        const cretexpr = this.expr.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cretexpr.accept) return cretexpr;
        if (!util.assignable(cretexpr.type, cret.type, classlookup)) return createTypeAssignMismatchReturn(cretexpr.type, cret.type, this.expr.area);
        return new util.SemanticCheckReturn().setType(cretexpr.type);
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        const cret = this.lval.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        return this.expr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const exprreg = this.expr.genIntermediateCode_expr(codelines, tmpRegIdGen);
        const lvalret = this.lval.genIntermediateCode_lval(codelines, tmpRegIdGen);
        if (lvalret.directReg) {
            codelines.push(new CodeLine(new tc.TAC_mov(exprreg, lvalret.reg)));
        }
        else {
            if (lvalret.isbyte)
                codelines.push(new CodeLine(new tc.TAC_sb(lvalret.reg, lvalret.offset, exprreg)));
            else
                codelines.push(new CodeLine(new tc.TAC_sw(lvalret.reg, lvalret.offset, exprreg)));
        }
        return exprreg;
    }
}

export class ASTNode_opexpr extends ASTNode_expr {
    constructor(public op: Token, public expr1: ASTNode_expr, public expr2: ASTNode_expr) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const cret1 = this.expr1.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret1.accept) return cret1;
        const cret2 = this.expr2.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret2.accept) return cret2;
        const booltype = util.Type.boolType(0), inttype = util.Type.intType(0);
        switch (this.op.rawstr) {
            case "||":
            case "&&":
                if (!cret1.type.isBool()) return new util.SemanticCheckReturn(new SemanticError(`not a boolean, ${cret1.type}, at ${this.expr1.area}`, ErrorCode.NOT_BOOL_FOR_BOOL_OP));
                if (!cret2.type.isBool()) return new util.SemanticCheckReturn(new SemanticError(`not a boolean, ${cret2.type}, at ${this.expr2.area}`, ErrorCode.NOT_BOOL_FOR_BOOL_OP));
                return new util.SemanticCheckReturn().setType(booltype);
            case "==":
            case "!=":
                let ret = true;
                if (cret1.type.isNull() || cret2.type.isNull()) {
                    if (cret1.type.isInt() || cret2.type.isInt() || cret1.type.isBool() || cret2.type.isBool()) ret = false;
                }
                else if (!cret1.type.equals2(cret2.type)) ret = false;
                if (ret) return new util.SemanticCheckReturn().setType(booltype);
                else return new util.SemanticCheckReturn(new SemanticError(`cannot compare between ${cret1.type} and ${cret2.type} at ${this.area}`, ErrorCode.CANNOT_COMPARE_VAR));
            case ">=":
            case "<=":
            case ">":
            case "<":
                if (!cret1.type.isInt()) return new util.SemanticCheckReturn(new SemanticError(`not an integer ${cret1.type}, at ${this.expr1.area}`, ErrorCode.NOT_INT_FOR_INT_OP));
                if (!cret2.type.isInt()) return new util.SemanticCheckReturn(new SemanticError(`not an integer ${cret2.type}, at ${this.expr2.area}`, ErrorCode.NOT_INT_FOR_INT_OP));
                return new util.SemanticCheckReturn().setType(booltype);
            case "&":
            case "|":
            case "^":
            case "+":
            case "-":
            case "*":
            case "/":
            case ">>":
            case ">>>":
            case "<<":
                if (!cret1.type.isInt()) return new util.SemanticCheckReturn(new SemanticError(`not an integer ${cret1.type}, at ${this.expr1.area}`, ErrorCode.NOT_INT_FOR_INT_OP));
                if (!cret2.type.isInt()) return new util.SemanticCheckReturn(new SemanticError(`not an integer ${cret2.type}, at ${this.expr2.area}`, ErrorCode.NOT_INT_FOR_INT_OP));
                return new util.SemanticCheckReturn().setType(inttype);
            default:
                throw new Error("unknown op " + this.op.rawstr + " at " + this.op.area);
        }
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        const cret = this.expr1.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        return this.expr2.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const exprreg1 = this.expr1.genIntermediateCode_expr(codelines, tmpRegIdGen);
        const exprreg2 = this.expr2.genIntermediateCode_expr(codelines, tmpRegIdGen);
        const retreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_binary(this.op.rawstr, exprreg1, exprreg2, retreg)));
        return retreg;
    }
}

export class ASTNode_fncall extends ASTNode_expr {
    private _fndef: util.FunctionDefinition;

    constructor(public fn: ASTNode_fnref | ASTNode_baseconstructorref, public parameters: ASTNode_exprlist) { super(); this._fndef = null; }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const plen = this.parameters.children.length;
        const parr = new Array<util.Type>(plen);
        const cret = typeAnalysisExprList(this.parameters.children, parr, classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        const fn = this.fn;
        let candidates: Array<util.FunctionDefinition>;
        if (fn instanceof ASTNode_fnref) {
            candidates = fnlookup.getApplicableFn(fn.name.rawstr, parr, classlookup);
        }
        else {
            if (!ctx.inConstructor) return new util.SemanticCheckReturn(new SemanticError(`not in a constructor, cannot call super at ${fn.area}`, ErrorCode.SUPER_OUTSIDE_CONSTRUCTOR));
            const consret = fnlookup.getApplicableConstructor(ctx.classdef.getParent(), parr, classlookup);
            if (consret.noop && plen === 0) return new util.SemanticCheckReturn().setType(util.Type.void); // no constructor can be applied, here this._fndef will stay null
            candidates = consret.candidates || [];
        }
        if (candidates.length === 0) return new util.SemanticCheckReturn(new SemanticError(`no function/constructor with given parameter is applicable, at ${fn.area}`, ErrorCode.FN_NOTFOUND));
        if (candidates.length > 1) return new util.SemanticCheckReturn(new SemanticError(`ambiguous functions/constructor with given parameter are applicable, at ${fn.area}`, ErrorCode.FN_AMBIGUOUS));
        this._fndef = candidates[0];
        return new util.SemanticCheckReturn().setType(candidates[0].rettype);
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        for (const expr of this.parameters.children) {
            const cret = expr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
            if (!cret.accept) return cret;
        }
        return new util.SemanticCheckReturn();
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        //this._fndef is null means the function is a super-call but base class has no constructor, so it's safe to ignore this expression
        if (!this._fndef) return null;
        //TODO, if no constructor, ignore fncall
        const pregs = new Array<number>();
        for (const p of this.parameters.children) {
            pregs.push(p.genIntermediateCode_expr(codelines, tmpRegIdGen));
        }
        for (const p of pregs.reverse()) {
            codelines.push(new CodeLine(new tc.TAC_param(p)));
        }
        if (this._fndef.name === util.ClassLookup.constructorFnName) //if this is a super-call
            codelines.push(new CodeLine(new tc.TAC_param(this._symboltable.find("this").tmpRegId)));
        const retreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_fncall(this._fndef, retreg)));
        return retreg;
    }
}

export class ASTNode_methodcall extends ASTNode_expr {
    private _vtable_seq: number;

    constructor(public obj: ASTNode_expr, public method: Token, public parameters: ASTNode_exprlist) { super(); }

    //TODO: reuse code with ASTNode_fncall
    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const plen = this.parameters.children.length;
        const parr = new Array<util.Type>(plen);
        let cret = typeAnalysisExprList(this.parameters.children, parr, classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        cret = this.obj.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        if (cret.type.depth !== 0) return new util.SemanticCheckReturn(new SemanticError(`array of ${cret.type} has no method at ${this.obj.area}`, ErrorCode.ARRAY_NO_METHOD));
        const classdef = classlookup.getClass(cret.type.basetype);
        if (!classdef) return new util.SemanticCheckReturn(new SemanticError(`variable not an instance of class, type ${cret.type} at ${this.obj.area}`, ErrorCode.PRIMITIVE_NO_METHOD));
        let candidates = new Array<{ seq: number, fndef: util.FunctionDefinition }>();
        for (let i = 0; i < classdef.vmethodTable.length; ++i) {
            const fndef = classdef.vmethodTable[i];
            if (this.method.rawstr === fndef.name) {
                // ignore the match of "this" pointer here
                const m = util.fnApplicable(fndef.argtypelist.slice(1), parr, classlookup);
                if (m.match) {
                    if (m.perfect) {
                        candidates = [{ seq: i, fndef: fndef }];
                        break;
                    }
                    else candidates.push({ seq: i, fndef: fndef });
                }
            }
        }
        if (candidates.length === 0) return new util.SemanticCheckReturn(new SemanticError(`no method with given parameter is applicable, at ${this.method.area}`, ErrorCode.METHOD_NOTFOUND));
        if (candidates.length > 1) return new util.SemanticCheckReturn(new SemanticError(`ambiguous method with given parameter are applicable, at ${this.method.area}`, ErrorCode.METHOD_AMBIGUOUS));
        this._vtable_seq = candidates[0].seq;
        return new util.SemanticCheckReturn().setType(candidates[0].fndef.rettype);
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        for (const expr of this.parameters.children) {
            const cret = expr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
            if (!cret.accept) return cret;
        }
        return this.obj.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        //value of "this"
        const objreg = this.obj.genIntermediateCode_expr(codelines, tmpRegIdGen);
        const pregs = [objreg];
        for (const p of this.parameters.children) {
            pregs.push(p.genIntermediateCode_expr(codelines, tmpRegIdGen));
        }
        for (const p of pregs.reverse()) {
            codelines.push(new CodeLine(new tc.TAC_param(p)));
        }
        const retreg = tmpRegIdGen.next();
        //now retreg has the address of vtable
        codelines.push(new CodeLine(new tc.TAC_lw(objreg, 0, retreg)));
        //now retreg has the runtime address of method
        if (this._vtable_seq > 0)
            codelines.push(new CodeLine(new tc.TAC_binary_int("+", retreg, this._vtable_seq * 4, retreg)));
        //load the method address into retreg
        codelines.push(new CodeLine(new tc.TAC_lw(retreg, 0, retreg)));
        //call the method
        codelines.push(new CodeLine(new tc.TAC_fncall_reg(retreg, pregs.length, retreg)));
        return retreg;
    }
}

export class LVALICReturn {
    constructor(
        public directReg: boolean,
        //the register number of value if directReg is true
        //the register number of base address if directReg is false
        public reg: number,
        public offset: number,
        public isbyte: boolean) { }
}

export abstract class ASTNode_leftval extends ASTNode_expr {
    //for write into
    genIntermediateCode_lval(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): LVALICReturn {
        throw new Error("not implemented");
    }
}

export class ASTNode_varref extends ASTNode_leftval {
    constructor(public token: Token) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        if (!this._symboltable.has(this.token.rawstr)) return new util.SemanticCheckReturn(new SemanticError(`variable not found: ${this.token.rawstr} at ${this.token.area}`, ErrorCode.VAR_NOTFOUND));
        else {
            const symbol = this._symboltable.find(this.token.rawstr);
            if (varUsedBeforeDeclared(this.token.area, symbol.declaredArea)) return new util.SemanticCheckReturn(new SemanticError(`variable used before declared: ${this.token.rawstr}, at ${this.token.area}`, ErrorCode.VAR_USED_BEFORE_DECLARED));
            return new util.SemanticCheckReturn().setType(symbol.type);
        }
    }

    //for read
    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        return this._symboltable.find(this.token.rawstr).tmpRegId;
    }

    //for write into
    genIntermediateCode_lval(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): LVALICReturn {
        return new LVALICReturn(true, this.genIntermediateCode_expr(codelines, tmpRegIdGen), null, null);
    }
}

export class ASTNode_arrderef extends ASTNode_leftval {
    private _itemisbyte: boolean;

    constructor(public expr: ASTNode_expr, public indexexpr: ASTNode_expr) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const cret1 = this.expr.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret1.accept) return cret1;
        if (cret1.type.depth === 0) return new util.SemanticCheckReturn(new SemanticError(`type ${cret1.type} is not an array at ${this.expr.area}`, ErrorCode.NOT_AN_ARRAY));
        const cret2 = this.indexexpr.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret2.accept) return cret2;
        if (!cret2.type.isInt()) return new util.SemanticCheckReturn(new SemanticError(`not an integer: ${cret2.type} at ${this.indexexpr.area}`, ErrorCode.NOT_INT_FOR_INT_OP));
        const rettype = new util.Type(cret1.type.basetype, cret1.type.depth - 1);
        this._itemisbyte = rettype.isBool();
        return new util.SemanticCheckReturn().setType(rettype);
    }

    //storage address register
    private _addr_reg(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const basereg = this.expr.genIntermediateCode_expr(codelines, tmpRegIdGen);
        const indexreg = this.indexexpr.genIntermediateCode_expr(codelines, tmpRegIdGen);
        const addrreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_binary_int("*", indexreg, this._itemisbyte ? 1 : 4, addrreg)));
        codelines.push(new CodeLine(new tc.TAC_binary("+", basereg, addrreg, addrreg)));
        return addrreg;
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        const cret = this.expr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
        if (!cret.accept) return cret;
        return this.indexexpr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
    }

    //for read
    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const retreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_lw(this._addr_reg(codelines, tmpRegIdGen), 0, retreg)));
        return retreg;
    }

    //for write into
    genIntermediateCode_lval(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): LVALICReturn {
        return new LVALICReturn(false, this._addr_reg(codelines, tmpRegIdGen), 0, this._itemisbyte);
    }
}

export class ASTNode_fieldref extends ASTNode_leftval {
    private _fieldoffset: number;
    private _fieldisbyte: boolean;

    constructor(public expr: ASTNode_expr, public token: Token) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const cret1 = this.expr.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cret1.accept) return cret1;
        if (cret1.type.depth !== 0) return new util.SemanticCheckReturn(new SemanticError(`type ${cret1.type} is an array at ${this.expr.area}`, ErrorCode.NOT_A_CLASS));
        const classdef = classlookup.getClass(cret1.type.basetype);
        if (classdef == null) return new util.SemanticCheckReturn(new SemanticError(`type ${cret1.type} is not a class at ${this.expr.area}`, ErrorCode.NOT_A_CLASS));
        const field = classdef.getField(this.token.rawstr);
        if (field == null) return new util.SemanticCheckReturn(new SemanticError(`class ${cret1.type} has no field ${this.token.rawstr} at ${this.expr.area}`, ErrorCode.FIELD_NOTFOUND));
        this._fieldisbyte = field.type.isBool();
        this._fieldoffset = field.offset;
        return new util.SemanticCheckReturn().setType(field.type);
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        return this.expr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
    }

    //storage address register
    private _addr_reg(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const basereg = this.expr.genIntermediateCode_expr(codelines, tmpRegIdGen);
        const addrreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_binary_int("+", basereg, this._fieldoffset, addrreg)));
        return addrreg;
    }

    //for read
    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const addrreg = this._addr_reg(codelines, tmpRegIdGen), retreg = tmpRegIdGen.next();
        if (this._fieldisbyte)
            codelines.push(new CodeLine(new tc.TAC_lb(addrreg, 0, retreg)));
        else
            codelines.push(new CodeLine(new tc.TAC_lw(addrreg, 0, retreg)));
        return retreg;
    }

    //for write into
    genIntermediateCode_lval(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): LVALICReturn {
        return new LVALICReturn(false, this._addr_reg(codelines, tmpRegIdGen), 0, this._fieldisbyte);
    }
}

export abstract class ASTNode_literal extends ASTNode_expr { }

export class ASTNode_literal_integer extends ASTNode_literal {
    constructor(public literal: Token) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        return new util.SemanticCheckReturn().setType(util.Type.intType(0));
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const retreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_loadint(Number(this.literal.rawstr), retreg)));
        return retreg;
    }
}

export class ASTNode_literal_boolean extends ASTNode_literal {
    constructor(public literal: Token) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        return new util.SemanticCheckReturn().setType(util.Type.boolType(0));
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const retreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_loadint(this.literal.rawstr.toLowerCase() === "true" ? 1 : 0, retreg)));
        return retreg;
    }
}

export class ASTNode_literal_null extends ASTNode_literal {
    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        return new util.SemanticCheckReturn().setType(util.Type.null);
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const retreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_loadint(0, retreg)));
        return retreg;
    }
}

export class ASTNode_newinstance extends ASTNode_expr {
    private _constructfndef: util.FunctionDefinition;
    private _classdef: util.ClassDefinition;

    constructor(public classname: Token, public parameters: ASTNode_exprlist) { super(); this._constructfndef = null; this._classdef = null; }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const plen = this.parameters.children.length;
        const parr = new Array<util.Type>(plen);
        const cret = typeAnalysisExprList(this.parameters.children, parr, classlookup, fnlookup, ctx);
        if (!cret.accept) return cret;
        const classdef = classlookup.getClass(this.classname.rawstr);
        if (!classdef) return new util.SemanticCheckReturn(new SemanticError(`class not found: ${this.classname.rawstr}, at: ${this.classname.area}`, ErrorCode.CLASS_NOTFOUND));
        const rettype = new util.Type(this.classname.rawstr, 0);
        this._classdef = classdef;
        const consret = fnlookup.getApplicableConstructor(classdef, parr, classlookup);
        if (consret.noop && plen === 0) return new util.SemanticCheckReturn().setType(rettype);
        const candidates = consret.candidates || [];
        if (candidates.length === 0) return new util.SemanticCheckReturn(new SemanticError(`no constructor with given parameter is applicable, at ${this.classname.area}`, ErrorCode.FN_NOTFOUND));
        if (candidates.length > 1) return new util.SemanticCheckReturn(new SemanticError(`ambiguous constructor with given parameter are applicable, at ${this.classname.area}`, ErrorCode.FN_AMBIGUOUS));
        else {
            this._constructfndef = candidates[0];
            return new util.SemanticCheckReturn().setType(rettype);
        }
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        for (const expr of this.parameters.children) {
            const cret = expr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
            if (!cret.accept) return cret;
        }
        return new util.SemanticCheckReturn();
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const objreg = tmpRegIdGen.next(), tmpreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_loadint(this._classdef.byteLength, objreg)));
        codelines.push(new CodeLine(new tc.TAC_allocate(objreg, objreg)));
        codelines.push(new CodeLine(new tc.TAC_la(tmpreg, this._classdef.getMIPSVTableLabel())));
        codelines.push(new CodeLine(new tc.TAC_sw(objreg, 0, tmpreg)));
        if (this._constructfndef) {
            const pregs = new Array<number>();
            for (const p of this.parameters.children) {
                pregs.push(p.genIntermediateCode_expr(codelines, tmpRegIdGen));
            }
            for (const p of pregs.reverse()) {
                codelines.push(new CodeLine(new tc.TAC_param(p)));
            }
            // value of "this"
            codelines.push(new CodeLine(new tc.TAC_param(objreg)));
            codelines.push(new CodeLine(new tc.TAC_procedurecall(this._constructfndef)));
        }
        return objreg;
    }
}

export class ASTNode_newarray extends ASTNode_expr {
    private _itembyte: boolean;

    constructor(public type: ASTNode_type, public exprlist: ASTNode_exprlist) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        if (this.type.depth === 0) return new util.SemanticCheckReturn(new SemanticError(`not an array: ${this.type}, at ${this.exprlist.area}`, ErrorCode.NOT_AN_ARRAY));
        if (!util.isType(this.type.basetype.rawstr, classlookup)) return new util.SemanticCheckReturn(new SemanticError(`not a valid type at ${this.type.basetype.area}`, ErrorCode.TYPE_NOTFOUND));
        if (this.exprlist.children.length !== 1) return new util.SemanticCheckReturn(new SemanticError(`only one parameter can be passed to array initialization at ${this.exprlist.area}`, ErrorCode.ARRAY_CONSTRUCTOR_PARAMS));
        const cretexpr = this.exprlist.children[0].typeAnalysis(classlookup, fnlookup, ctx);
        if (!cretexpr.accept) return cretexpr;
        if (!cretexpr.type.isInt()) return new util.SemanticCheckReturn(new SemanticError(`expression returns ${cretexpr.type}, not int at ${this.exprlist.children[0].area}`, ErrorCode.NOT_INT_FOR_INT_OP));
        this._itembyte = new util.Type(this.type.basetype.rawstr, this.type.depth - 1).isBool();
        return new util.SemanticCheckReturn().setType(this.type.type);
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        for (const expr of this.exprlist.children) {
            const cret = expr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
            if (!cret.accept) return cret;
        }
        return new util.SemanticCheckReturn();
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const exprreg = this.exprlist.children[0].genIntermediateCode_expr(codelines, tmpRegIdGen);
        const objreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_binary_int("*", exprreg, this._itembyte ? 1 : 4, objreg)));
        codelines.push(new CodeLine(new tc.TAC_allocate(objreg, objreg)));
        return objreg;
    }
}

export class ASTNode_unaryopexpr extends ASTNode_expr {
    constructor(public token: Token, public expr: ASTNode_expr) { super(); }

    typeAnalysis(classlookup: util.ClassLookup, fnlookup: util.FunctionLookup, ctx: util.SemContext): util.SemanticCheckReturn {
        const cretexpr = this.expr.typeAnalysis(classlookup, fnlookup, ctx);
        if (!cretexpr.accept) return cretexpr;
        switch (this.token.rawstr) {
            case "~":
            case "-":
                if (!cretexpr.type.isInt()) return new util.SemanticCheckReturn(new SemanticError(`expression returns ${cretexpr.type}, not int at ${this.expr.area}`, ErrorCode.NOT_INT_FOR_INT_OP));
                else return new util.SemanticCheckReturn().setType(cretexpr.type);
            case "!":
                if (!cretexpr.type.isBool()) return new util.SemanticCheckReturn(new SemanticError(`expression returns ${cretexpr.type}, not bool at ${this.expr.area}`, ErrorCode.NOT_BOOL_FOR_BOOL_OP));
                else return new util.SemanticCheckReturn().setType(cretexpr.type);
            default:
                throw new Error("unknown op " + this.token.rawstr + " at " + this.token.area);
        }
    }

    makeSymbolTable(symboltable: util.SymbolFrame, classlookup: util.ClassLookup, tmpRegIdGen: IdGen): util.SemanticCheckReturn {
        this._symboltable = symboltable;
        return this.expr.makeSymbolTable(symboltable, classlookup, tmpRegIdGen);
    }

    genIntermediateCode_expr(codelines: Array<CodeLine>, tmpRegIdGen: IdGen): number {
        const exprreg = this.expr.genIntermediateCode_expr(codelines, tmpRegIdGen);
        const retreg = tmpRegIdGen.next();
        codelines.push(new CodeLine(new tc.TAC_unary(this.token.rawstr, exprreg, retreg)));
        return retreg;
    }
}

//HELPERS
export class ASTNode_functiondef_main extends ASTNode {
    constructor(public argumentlist: ASTNode_argumentlist, public statementlist: ASTNode_statementlist) { super(); }
}

export class ASTNode_token extends ASTNode {
    constructor(public token: Token) { super(); }
}

export class ASTNode_for_head extends ASTNode {
    constructor(public initstmt: ASTNode_statement, public cond: ASTNode_expr, public endstmt: ASTNode_statement) { super(); }
}

function varUsedBeforeDeclared(areaUsed: Area, areaDeclared: Area): boolean {
    return areaDeclared !== noArea && areaUsed !== noArea && (areaUsed.start.row < areaDeclared.start.row || (areaUsed.start.row === areaDeclared.start.row && areaUsed.start.col < areaDeclared.start.col));
}
