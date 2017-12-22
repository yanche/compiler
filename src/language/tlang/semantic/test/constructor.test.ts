
import { getSemanticResult } from "./util";
import { ErrorCode } from "../../error";
 import { assert } from "chai";

describe("constructor test cases", () => {
    it("defined in itself", () => {
        let code = `
        class C {
            constructor() {

            }
        }
        void main() {
            C c = new C();
        }
        `;
        let sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("not defined", () => {
        let code = `
        class C {
        }
        void main() {
            C c = new C();
        }
        `;
        let sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("with parameters", () => {
        let code = `
        class C {
            constructor(int a) {}
        }
        void main() {
            C c = new C(1);
        }
        `;
        let sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("not found", () => {
        let code = `
        class C {
            constructor(int a) {}
        }
        void main() {
            C c = new C(1, 2);
        }
        `;
        let sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.FN_NOTFOUND);
    });

    it("find the right one", () => {
        let code = `
        class C {
            constructor(int a) {}
            constructor(int a, int b) {}
        }
        void main() {
            C c = new C(1, 2);
        }
        `;
        let sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("not defined, use constructor from parent", () => {
        let code = `
        class C {
            constructor(int a) {}
        }
        class D:C {

        }
        void main() {
            D d = new D(1);
        }
        `;
        let sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("not defined, use constructor from parent, not found", () => {
        let code = `
        class C {
            constructor(int a) {}
        }
        class D:C {

        }
        void main() {
            D d = new D();
        }
        `;
        let sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.FN_NOTFOUND);
    });

    it("not defined, won't use constructor from parent", () => {
        let code = `
        class B {
            constructor(int a, int b) {}
        }
        class C:B {
            constructor(int a) { super(a, 10); }
        }
        class D:C {

        }
        void main() {
            D d = new D(1, 2);
        }
        `;
        let sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.FN_NOTFOUND);
    });
});
