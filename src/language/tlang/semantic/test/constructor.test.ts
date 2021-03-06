
import { getSemanticResult } from "./util";
import { ErrorCode } from "../../error";
import * as assert from "assert";

describe("constructor test cases", () => {
    it("defined in itself", () => {
        const code = `
        class C {
            constructor() {

            }
        }
        void main() {
            C c = new C();
        }
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("not defined", () => {
        const code = `
        class C {
        }
        void main() {
            C c = new C();
        }
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("with parameters", () => {
        const code = `
        class C {
            constructor(int a) {}
        }
        void main() {
            C c = new C(1);
        }
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("not found", () => {
        const code = `
        class C {
            constructor(int a) {}
        }
        void main() {
            C c = new C(1, 2);
        }
        `;
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.FN_NOTFOUND);
    });

    it("find the right one", () => {
        const code = `
        class C {
            constructor(int a) {}
            constructor(int a, int b) {}
        }
        void main() {
            C c = new C(1, 2);
        }
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("not defined, use constructor from parent", () => {
        const code = `
        class C {
            constructor(int a) {}
        }
        class D:C {

        }
        void main() {
            D d = new D(1);
        }
        `;
        const sret = getSemanticResult(code);
        assert.ok(sret.accept);
    });

    it("not defined, use constructor from parent, not found", () => {
        const code = `
        class C {
            constructor(int a) {}
        }
        class D:C {

        }
        void main() {
            D d = new D();
        }
        `;
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.FN_NOTFOUND);
    });

    it("not defined, won't use constructor from parent", () => {
        const code = `
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
        const sret = getSemanticResult(code);
        assert.ok(!sret.accept);
        assert.strictEqual(sret.error.errCode, ErrorCode.FN_NOTFOUND);
    });
});
