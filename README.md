# TypeScript Extra Reflection Transformer
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI/CD Workflow](https://github.com/Yangff/extra-reflect-type/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/Yangff/extra-reflect-type/actions/workflows/build.yml)
[![npm version](https://badge.fury.io/js/extra-reflect-type.svg)](https://badge.fury.io/js/extra-reflect-type)

This TypeScript library provides a custom transformer for TypeScript, aimed at enhancing the TypeScript compilation process with additional type transformations. It utilizes the TypeScript compiler API to inspect and modify the AST during the compilation phase, enabling advanced type manipulation and metadata reflection capabilities.

## Introduction

This library is designed for developers aiming to enhance TypeScript's original reflection system with comprehensive type information. 
As the discussion in https://github.com/microsoft/TypeScript/issues/7169 , the current `reflect-metadata` implementation falls short in preserving detailed type information, such as the element type for arrays, generics, and more. 

By leveraging the TypeScript compiler API, this transformer injects additional type information into the compiled JavaScript code, facilitating runtime type introspection and validation. It's particularly useful for applications requiring detailed type information at runtime, such as serialization/deserialization libraries, ORMs, and frameworks implementing dependency injection.

## Installation

To install this library, you'll need to have Node.js and npm installed. Once set up, you can add the library to your project by running:

```bash
npm install extra-reflect-type --save-dev
```

Ensure you have `typescript` and `ts-patch` installed in your project, as this library relies on them:

```bash
npm install typescript ts-patch --save-dev
```

# Usage

To use this transformer in your TypeScript project, you need to patch the TypeScript installation with `ts-patch` and configure your `tsconfig.json` to include the transformer. Here's a step-by-step guide:

1. Patch TypeScript
```bash
npx ts-patch install
```
2. Configure `tsconfig.json`
```json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "extra-reflect-type",
        "onlyDecorated": true
      }
    ]
  }
}
```

The `onlyDecorated` option is optional and can be set to `true` to only apply the transformer to decorated classes and members. This can help reduce the overhead of the transformer by only applying it to specific parts of your codebase.

The default value for `onlyDecorated` is `true`.

3. Add `import "reflect-metadata";` to your source files to enable runtime type reflection.

```typescript
import "reflect-metadata";
```

If the `reflect-metadata` is not imported in your source files, the transformer will **NOT** inject any metadata into the compiled code.

3. Compile your project
```bash
npx tsc
```

The transformer will automatically inject additional type information into the compiled JavaScript code, enabling runtime type reflection with the `reflect-metadata`.

## Metadata Reflection

This library injects runtime type metadata using `Reflect.metadata(...)`.
The injected metadata for type information follows the following format:

```typescript
{
    name: string;                                               // The name of the type
    typetype: "builtin" | "class" | "not class" | "unknown";    // The type category
    type?: any;                                                 // The actual type (if available)
    extra?: any[];                                              // Additional type information (e.g., generic type parameters)
    keytype?: any;                                              // The type of the keys (for maps)
    elemtype?: any;                                             // The type of the elements (for maps and arrays)
    elemtypes?: any[];                                          // The types of elements (for tuples, unions, and intersections)
}
```

It can contain nested type information for composite types like arrays, maps, tuples, unions, and intersections.

Below are descriptions of the metadata formats for different types, it shows the transformed code and the injected metadata:

### Basic Types (String, Number, Boolean)
For basic types like string, number, and boolean, the metadata injected reflects the type directly:
```typescript
class Example {
    @Reflect.metadata("design:ttype", {name: "String", type: String, typetype: "builtin"})
    basicString: string;
}
```

### Interfaces and Classes
For interfaces and classes, the metadata includes the name and indicates whether it's a class type. For interfaces, since they don't exist at runtime, the type is treated similarly but with a notation to differentiate from classes:
```typescript
interface IExample {}
class ExampleClass {}

class Example {
    @Reflect.metadata("design:ttype", {name: "IExample", typetype: "not class"})
    interfaceExample: IExample;

    @Reflect.metadata("design:ttype", {name: "ExampleClass", type: ExampleClass, typetype: "class"})
    classExample: ExampleClass;
}
```

### Arrays
For arrays, the metadata reflects the array nature and the type of its elements:

```typescript
class Example {
    @Reflect.metadata("design:ttype", {name: "Array", type: Array, elemtype: {name: "String", type: String, typetype: "builtin"}})
    stringArray: string[];
}
```

### Maps (Object Literals)
For object literals that act as maps, the metadata reflects the key and value types:
```typescript
class Example {
    @Reflect.metadata("design:ttype", {name: "$Map", keytype: {name: "String", type: String, typetype: "builtin"}, elemtype: {name: "String", type: String, typetype: "builtin"}})
    mapExample: { [key: string]: string };
}
```

### Tuples

For tuples, the metadata includes the specific types of elements within the tuple:

```typescript
class Example {
    @Reflect.metadata("design:ttype", {name: "$Tuple", elemtypes: [{name: "String", type: String, typetype: "builtin"}, {name: "Number", type: Number, typetype: "builtin"}]})
    tupleExample: [string, number];
}
```

### Union and Intersection Types
For union and intersection types, the metadata captures the composite nature and the constituent types:
```typescript
class Example {
    @Reflect.metadata("design:ttype", {name: "$Union", elemtypes: [{name: "String", type: String, typetype: "builtin"}, {name: "Number", type: Number, typetype: "builtin"}]})
    unionExample: string | number;
}
```

### Generics (Templates)
For generics, the metadata reflects the generic type and its constraints:
```typescript
class Example {
    @Reflect.metadata("design:ttype", {name: "Has", extra: [{name: "String", type: String, typetype: "builtin"}], typetype: "not class"})
    genericExample: Has<string>;
}
```

### Member Functions

This library also injects metadata for member function parameters, return types, and handles generics and void returns. Below are examples illustrating these capabilities:

For functions, metadata is injected for each parameter, detailing its type:
```typescript
class Example {
    @Reflect.metadata("design:paramttypes", [{name: "String", type: String, typetype: "builtin"}])
    @Reflect.metadata("design:returnttype", {name: "Number", type: Number, typetype: "builtin"})
    func(name: string) {
        return 1;
    }
}
```

Generics (templates) used in functions are reflected with their generic type parameters:

```typescript
class Example {
    @Reflect.metadata("design:paramttypes", [{name: 'T', typetype: 'not class'}])
    @Reflect.metadata("design:returnttype", {name: 'T', typetype: 'not class'})
    templateFunc<T>(name: T) {
        return name;
    }
}
```

This metadata specifies the generic type T used in the function, allowing runtime introspection of the generic parameter and return type.

For functions with no return value (void), the metadata reflects this with a specific indication of the void return type:

```typescript
class Example {
    @Reflect.metadata("design:returnttype", {name: "void", type: void 0, typetype: "builtin"})
    noreturn() {
        return;
    }
}
```

### Unkown Types
If the transformer encounters an unknown type, it will inject a placeholder metadata entry to indicate the unknown type:

```typescript
class Example {
    @Reflect.metadata("design:ttype", {name: "unknown", typetype: "unknown"})
    unknownExample: unknown;
}
```

# License

This library is released under the MIT license.

```
Copyright 2024 Yangff

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```