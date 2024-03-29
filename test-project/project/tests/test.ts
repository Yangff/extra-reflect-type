import "reflect-metadata";

import * as my from "./importfile";

interface IRemote {
    name: string;
}

interface Has<T> {
    name: string;
    type: T;
}

class AnotherClass {
    name: string = "AnotherClass";
}

class MyClass {
    aaa: string = "MyClass";
    another: AnotherClass = new AnotherClass();
    ary: string[] = ["a", "b", "c"];
    mapobj: { [key: string]: string } = { a: "a", b: "b", c: "c" };
    tupleobj: [string, number] = ["a", 1];
    unionobj: string | number = "a";
    intersectionobj: string & number & IRemote | null = null;
    nestedobj: string[][] = [["a", "b"], ["c", "d"]];
    nestedmap: { [key: number]: { [key: string]: string[] } } = { 1: { a: ["a", "b"], b: ["c", "d"] } };
    hasT: Has<string> = { name: "Has", type: "string" };

    namespace_test: my.MyClass = new my.MyClass();
    namespace_interface: my.MyInterfaceType | null = null;
    namespace_interface_pure: my.IInterface<number> | null = null;

    any_type: any = null;

    func(name: string) {
        return 1;
    }

    func1(name:string): string[] {
        return [name];
    }

    func2(name:string) {
        return ["asda", "adad", "gwgwf"]
    }

    templateFunc<T>(name: T) {
        return name;
    }

    warpping<T>(name: T): Has<T> {
        return {name: "Has", type: name};
    }

    wappring1<T>(name: T) {
        return {name: "Has", type: name};
    }

    qualifiedNameFunc(inp: my.MyClass) {
        return inp;
    }

    noreturn() {
        return;
    }

    onlyreturn() {
        return 1.0;
    }
    
    onlyreturnqualified() {
        return new my.MyClass();
    }
}

const instance = new MyClass();
// get reflect info for aaa
it('aaa should be String', () => {
    const aaa = Reflect.getMetadata("design:ttype", instance, "aaa");
    expect(aaa.name).toBe("String");
    expect(aaa.type).toBe(String);
});

it('another should be AnotherClass', () => {
    const another = Reflect.getMetadata("design:ttype", instance, "another");
    expect(another.name).toBe("AnotherClass");
    expect(another.type).toBe(AnotherClass);
});

it('ary should be Array', () => {
    const ary = Reflect.getMetadata("design:ttype", instance, "ary");
    expect(ary.name).toBe("Array");
    expect(ary.type).toBe(Array);
    expect(ary.elemtype).toEqual({ name: "String", type: String, "typetype": "builtin" });
});

it('mapobj should be Object', () => {
    const mapobj = Reflect.getMetadata("design:ttype", instance, "mapobj");
    expect(mapobj.name).toBe("$Map");
    expect(mapobj.keytype).toEqual({ name: "String", type: String, "typetype": "builtin" });
    expect(mapobj.elemtype).toEqual({ name: "String", type: String, "typetype": "builtin" });
});


it("hasT should be Has<string>", () => {
    const hasT = Reflect.getMetadata("design:ttype", instance, "hasT");
    expect(hasT.name).toBe("Has");
    expect(hasT.extra).toEqual([{ name: "String", type: String, "typetype": "builtin" }]);
})

it("qualified name should be my.MyClass", () => {
    const name = Reflect.getMetadata("design:ttype", instance, "namespace_test");
    expect(name.name).toBe("my.MyClass");
    expect(name.type).toBe(my.MyClass);

    const interfaceType = Reflect.getMetadata("design:ttype", instance, "namespace_interface");
    expect(interfaceType.name).toBe("$Union");
    expect(interfaceType).toStrictEqual(
        {
            name: '$Union',
            elemtypes: [
                { name: 'my.MyInterfaceType', typetype: 'not class' },
                { name: 'null', type: null, typetype: 'class' }
            ]
        }
    );
    
    const interfacePureType = Reflect.getMetadata("design:ttype", instance, "namespace_interface_pure");
    expect(interfacePureType.name).toBe("$Union");
    expect(interfacePureType).toStrictEqual(
        {
            name: '$Union',
            elemtypes: [
                { name: 'my.IInterface', typetype: 'not class', extra:[{name:'Number', type: Number, typetype: 'builtin'}] },
                { name: 'null', type: null, typetype: 'class' }
            ]
        }
    );
});

it("any type", ()=>{
    const anyType = Reflect.getMetadata("design:ttype", instance, "any_type");
    expect(anyType.name).toBe("any");
    expect(anyType.type).toBe(Object);
})

it("member function types", ()=>{ 
    const funcType = Reflect.getMetadata("design:paramttypes", instance, "func");
    expect(funcType).toEqual([{name: "String", type: String, typetype: "builtin"}]);
    const retType = Reflect.getMetadata("design:returnttype", instance, "func");
    expect(retType).toEqual({name: "Number", type: Number, typetype: "builtin"});
  
    const func1Type = Reflect.getMetadata("design:paramttypes", instance, "func1");
    expect(func1Type).toEqual([{name: "String", type: String, typetype: "builtin"}]);
    const ret1Type = Reflect.getMetadata("design:returnttype", instance, "func1");
    expect(ret1Type).toEqual({name: "Array", elemtype: {name: "String", type: String, typetype: "builtin"}, type: Array});

    const func2Type = Reflect.getMetadata("design:paramttypes", instance, "func2");
    expect(func2Type).toEqual([{name: "String", type: String, typetype: "builtin"}]);
    const ret2Type = Reflect.getMetadata("design:returnttype", instance, "func2");
    expect(ret2Type).toEqual({name: "Array", elemtype: {name: "String", type: String, typetype: "builtin"}, type: Array});

    const templateFuncType = Reflect.getMetadata("design:paramttypes", instance, "templateFunc");
    expect(templateFuncType).toEqual( [ { name: 'T', typetype: 'not class' } ]);

    const templateFuncRetType = Reflect.getMetadata("design:returnttype", instance, "templateFunc");
    expect(templateFuncRetType).toEqual({name: 'T', typetype: 'not class'});

    const wrappingFuncType = Reflect.getMetadata("design:paramttypes", instance, "warpping");
    expect(wrappingFuncType).toEqual( [ { name: 'T', typetype: 'not class' } ]);
    const warppingRetType = Reflect.getMetadata("design:returnttype", instance, "warpping");
    expect(warppingRetType).toEqual({name: 'Has', extra: [{name: 'T', typetype: 'not class'}], typetype: 'not class'});

    const wappring1FuncType = Reflect.getMetadata("design:paramttypes", instance, "wappring1");
    expect(wappring1FuncType).toEqual( [ { name: 'T', typetype: 'not class' } ]);

    const wappring1RetType = Reflect.getMetadata("design:returnttype", instance, "wappring1");
    expect(wappring1RetType).toEqual({name: 'unknown'});

    const qualifiedNameFuncType = Reflect.getMetadata("design:paramttypes", instance, "qualifiedNameFunc");
    expect(qualifiedNameFuncType).toHaveLength(1);
    expect(qualifiedNameFuncType[0].name).toBe("my.MyClass");
    expect(qualifiedNameFuncType[0].type).toBe(my.MyClass);
    expect(qualifiedNameFuncType[0].typetype).toBe("class");

    const qualifiedNameFuncRetType = Reflect.getMetadata("design:returnttype", instance, "qualifiedNameFunc");
    expect(qualifiedNameFuncRetType.name).toBe("my.MyClass");
    expect(qualifiedNameFuncRetType.type).toBe(my.MyClass);
    expect(qualifiedNameFuncRetType.typetype).toBe("class");

    const onlyreturn = Reflect.getMetadata("design:returnttype", instance, "onlyreturn");
    expect(onlyreturn.type).toBe(Number);
    expect(onlyreturn.name).toBe("Number");

    const noreturnFunc = Reflect.getMetadata("design:returnttype", instance, "noreturn");
    expect(noreturnFunc.type).toBeUndefined()
    expect(noreturnFunc.name).toBe("void");
    expect(noreturnFunc.typetype).toBe("builtin");

    const onlyreturnqualified = Reflect.getMetadata("design:returnttype", instance, "onlyreturnqualified");
    expect(onlyreturnqualified.type).toBe(my.MyClass);
    expect(onlyreturnqualified.name).toBe("my.MyClass");
    expect(onlyreturnqualified.typetype).toBe("class");
}); 
