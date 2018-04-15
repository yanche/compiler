
import { getSemanticResult } from "./util";
import { ErrorCode } from "../../error";
import * as assert from "assert";

describe("ensure main entry exists", () => {
    it("happy path", () => {
        const code = `void main() { }`;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });
    
    it("no main function", () => {
        const code = `void X() { }`;
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.ENTRY_NOTFOUND);
    });
    
    it("no main function without args", () => {
        const code = `void main(int c) { }`;
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.ENTRY_NOTFOUND);
    });
    
    it("int main function", () => {
        const code = `int main() { }`;
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.ENTRY_RETURNS_VOID);
    });
});
