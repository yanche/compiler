
import { getSemanticResult } from "./util";
import { ErrorCode } from "../../error";
 import { assert } from "chai";

describe("ensure main entry exists", () => {
    it("happy path", () => {
        let code = `void main() { }`;
        let sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });
    
    it("no main function", () => {
        let code = `void X() { }`;
        let sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.ENTRY_NOTFOUND);
    });
    
    it("no main function without args", () => {
        let code = `void main(int c) { }`;
        let sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.ENTRY_NOTFOUND);
    });
    
    it("int main function", () => {
        let code = `int main() { }`;
        let sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.ENTRY_RETURNS_VOID);
    });
});
