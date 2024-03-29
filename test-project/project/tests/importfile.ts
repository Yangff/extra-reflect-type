class MyClass {
    test: string = "MyClass";
}

interface IInterface<T> {
    test: string;
    type: T;
}

type MyInterfaceType = IInterface<MyClass>;

export { MyClass, MyInterfaceType, IInterface };