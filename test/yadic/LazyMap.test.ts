import {describe, expect, test} from "bun:test";
import {type Dependency, LazyMap} from "../../src/yadic/mod.ts";

describe("LazyMap", () => {
    test("is immutable from the start", async () => {
        try {
            // @ts-ignore
            LazyMap.create()['should'] = 'not work';
            expect(false).toBeTruthy();
        } catch (e) {
            expect(e).toBeInstanceOf(TypeError);
        }
    });

    test("can set using a function", async () => {
        const map = LazyMap.create().set('should', () => 'work');
        expect(map.should).toEqual('work');
    });

    test("is lazy and function is only called once", async () => {
        let count = 0
        const map = LazyMap.create().set('should', () => ++count);
        expect(map.should).toEqual(1);
        expect(map.should).toEqual(1);
    });

    test("can set with an instance", async () => {
        const map = LazyMap.create().setInstance('should', 'work');
        expect(map.should).toEqual('work');
    });

    test("can set with a constructor", async () => {
        class Foo {
        }

        const map = LazyMap.create().setConstructor('should', Foo);
        expect(map.should).toBeInstanceOf(Foo);
    });

    test("can set with a constructor that depends on another type", async () => {
        class Foo {
            constructor(deps: Dependency<'aDependency', number>,
                        public aDependency = deps.aDependency ) {
            }
        }

        const map = LazyMap.create()
            .setInstance('aDependency', 1)
            .setConstructor('should', Foo);
        expect(map.should).toBeInstanceOf(Foo);
        expect(map.should.aDependency).toEqual(1);
    });

    test("can decorate a dependency", async () => {
        class A {
        }

        class B {
            constructor(deps: Dependency<'object', A>, public a = deps.object) {
            }
        }

        const map = LazyMap.create()
            .setConstructor('object', A)
            .decorate('object', deps => new B(deps));
        expect(map.object).toBeInstanceOf(B);
        expect(map.object.a).toBeInstanceOf(A);
    });

    test("can create a map from another map", async () => {
        const parent = LazyMap.create().setInstance('a', 1)

        const child = LazyMap.create(parent)
            .set('b', deps => deps.a + 1);

        expect(parent.a).toEqual(1);
        expect(child.b).toEqual(2);
    });
})
