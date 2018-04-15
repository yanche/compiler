
import { getSemanticResult } from "./util";
import { ErrorCode } from "../../error";
import * as assert from "assert";

describe("call base class constructor test cases", () => {
    it("basic scenario", () => {
        const code = `
        class C {
            constructor() {
                super();
            }
        }
        void main() {}
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("call with parameter", () => {
        const code = `
        class B {
            constructor(int a) {}
        }
        class C:B {
            constructor() {super(10);}
        }
        void main() {}
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("find right one", () => {
        const code = `
        class B {
            constructor(int a) {}
            constructor(bool b) {}
        }
        class C:B {
            constructor() {super(true);}
        }
        void main() {}
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("not found", () => {
        const code = `
        class B {
            constructor(bool b) {}
        }
        class C:B {
            constructor() {super(10);}
        }
        void main() {}
        `;
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.FN_NOTFOUND);
    });

    it("find from grandparent if parent does not define constructor", () => {
        const code = `
        class A {
            constructor(int a) {}
        }
        class B:A {
        }
        class C:B {
            constructor() { super(10); }
        }
        void main() {}
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("only choose from parent constructor as long as one is defined, won't use the one from grandparent even fn signiture matches", () => {
        const code = `
        class A {
            constructor(int a) {}
        }
        class B:A {
            constructor(bool a) { super(10); }
        }
        class C:B {
            constructor() { super(10); }
        }
        void main() {}
        `;
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.FN_NOTFOUND);
    });

    it("no super call needed if not inherit from anyclass (by default everyone inherits from Object)", () => {
        const code = `
        class C {
            constructor() { }
        }
        void main() {}
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    // not implemented nowadays
    it("must call super in first line if it inherits from another class", () => {
        const code = `
        class B {
            constructor(bool a) { }
        }
        class C:B {
            constructor() { }
        }
        void main() {}
        `;
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.SUPER_IN_LINEONE);
    });

    // not implemented nowadays
    it("following expressions should not contain super call, except the line one", () => {
        const code = `
        class B {
            constructor(bool a) { }
        }
        class C:B {
            constructor() {
                super(true);
                int a = 10;
                super(false);
            }
        }
        void main() {}
        `;
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.SUPER_IN_LINEONE);
    });
});
