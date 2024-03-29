import * as ts from 'typescript';
import { type TransformerExtras, type PluginConfig } from 'ts-patch';

export default function (program: ts.Program, pluginConfig: PluginConfig, { ts: _tsInstance }: TransformerExtras) {
    const onlyDecorated = pluginConfig.hasOwnProperty('onlyDecorated') ? pluginConfig.onlyDecorated : true;
    return (ctx: ts.TransformationContext) => {
        const { factory } = ctx;
        let hasImportReflectMetadata = false;
        
        const generateTypeNode = (type: ts.TypeNode, override_type:ts.Type | null = null): ts.Expression => {
            if (ts.isArrayTypeNode(type)) {
                const elementType = generateTypeNode(type.elementType);
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment("name", factory.createStringLiteral("Array")),
                    factory.createPropertyAssignment("type", factory.createIdentifier("Array")),
                    factory.createPropertyAssignment("elemtype", elementType)
                ]);
            } else if (ts.isTypeLiteralNode(type)) {
                // Assuming map-like structure?
                // aka { [key: keytype]: valuetype }
                const indexSignature = type.members.find(ts.isIndexSignatureDeclaration);
                if (indexSignature) {
                    const keyType = indexSignature.parameters[0].type!;
                    const valueType = indexSignature.type;
                    return factory.createObjectLiteralExpression([
                        factory.createPropertyAssignment("name", factory.createStringLiteral("$Map")),
                        // factory.createPropertyAssignment("type", factory.createIdentifier("Map")),
                        factory.createPropertyAssignment("keytype", generateTypeNode(keyType)),
                        factory.createPropertyAssignment("elemtype", generateTypeNode(valueType))
                    ]);
                }
            } else if (ts.isTupleTypeNode(type)) {
                const elementTypes = factory.createArrayLiteralExpression(type.elements.map((x) => generateTypeNode(x)));
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment("name", factory.createStringLiteral("$Tuple")),
                    // factory.createPropertyAssignment("type", factory.createIdentifier("Tuple")),
                    factory.createPropertyAssignment("elemtypes", elementTypes)
                ]);
            } else if (ts.isUnionTypeNode(type)) {
                const elementTypes = factory.createArrayLiteralExpression(type.types.map((x) => generateTypeNode(x)));
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment("name", factory.createStringLiteral("$Union")),
                    // factory.createPropertyAssignment("type", factory.createIdentifier("Union")),
                    factory.createPropertyAssignment("elemtypes", elementTypes)
                ]);
            } else if (ts.isIntersectionTypeNode(type)) {
                const elementTypes = factory.createArrayLiteralExpression(type.types.map((x) => generateTypeNode(x)));
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment("name", factory.createStringLiteral("$Intersection")),
                    // factory.createPropertyAssignment("type", factory.createIdentifier("Intersection")),
                    factory.createPropertyAssignment("elemtypes", elementTypes)
                ]);
            } else if (ts.isTypeQueryNode(type)) {
                if (ts.isIdentifier(type.exprName)) {
                    return factory.createObjectLiteralExpression([
                        factory.createPropertyAssignment("name", factory.createStringLiteral("$Query")),
                        factory.createPropertyAssignment("type",
                            factory.createCallExpression(
                                factory.createIdentifier("typeof"),
                                undefined,
                                [type.exprName]
                            )
                        )
                    ])
                }
            }
            else {
                // Handle basic types (string, number, boolean) and named types.
                let typeName: string | null = null;
                let typeNameStr: string | null = null;
                let extra: null | ts.ArrayLiteralExpression = null;
                let typetype: string = "builtin";
                switch (type.kind) {
                    case ts.SyntaxKind.StringKeyword:
                        typeName = "String";
                        break;
                    case ts.SyntaxKind.NumberKeyword:
                        typeName = "Number";
                        break;
                    case ts.SyntaxKind.BooleanKeyword:
                        typeName = "Boolean";
                        break;
                    case ts.SyntaxKind.AnyKeyword:
                        typeNameStr = "any";
                        typeName = "Object";
                        break;
                    case ts.SyntaxKind.VoidKeyword:
                        typeNameStr = "void";
                        typeName = "void 0";
                        break;
                    default:
                        // This assumes named types or other types default to 'unknown'.
                        // we need to skip generics and other complex types
                        // for those we only keep the basic type name
                        // e.g. XXX<T> -> XXX
                        typetype = "class";
                        if (ts.isTypeReferenceNode(type)) {
                            const checker = program.getTypeChecker();
                            const realtype = override_type || checker.getTypeAtLocation(type);
                            const getNameSafe = () : string | null => {
                                let resultName = null;
                                try {
                                    resultName = type.typeName.getText();
                                } catch {
                                    if (ts.isQualifiedName(type.typeName)) {
                                        const genQualName = (node: ts.QualifiedName): string => {
                                            const right = node.right.escapedText as string;
                                            if (ts.isQualifiedName(node.left)) {
                                                return `${genQualName(node.left)}.${node.right.escapedText}`;
                                            } else {
                                                if (ts.isIdentifier(node.left)) {
                                                    return `${node.left.escapedText}.${right}`;
                                                }
                                            }
                                            return right;
                                        }
                                        resultName = genQualName(type.typeName);
                                    } else {
                                        if (ts.isIdentifier(type.typeName)) {
                                            resultName = type.typeName.escapedText as string;
                                        }
                                    }
                                }
                                return resultName;
                            }

                            if (realtype.isClass()) {
                                typeName = getNameSafe();
                                typeNameStr = typeName;
                            } else {
                                typetype = "not class";
                                typeNameStr = getNameSafe();
                            }
                            if (type.typeArguments) {
                                const args = type.typeArguments.map((x) => generateTypeNode(x));
                                extra = factory.createArrayLiteralExpression(args);
                            }
                        } else {
                            if (ts.isTypeOperatorNode(type)) {
                                return generateTypeNode(type.type);
                            }
                            typeName = type.getText();
                        }
        
                        break;
                }

                const objectLiterals = [];
                if (typeNameStr || typeName) {
                    objectLiterals.push(factory.createPropertyAssignment("name", factory.createStringLiteral(typeNameStr || typeName || "")));
                }
                if (typeName) {
                    objectLiterals.push(factory.createPropertyAssignment("type", factory.createIdentifier(typeName)));
                }
                if (extra) {
                    objectLiterals.push(factory.createPropertyAssignment("extra", extra));
                }
                objectLiterals.push(factory.createPropertyAssignment("typetype", factory.createStringLiteral(typetype)));
                
                return factory.createObjectLiteralExpression(objectLiterals);
            }
        
            // Fallback for unhandled types, returning an 'unknown' type object.
            return factory.createObjectLiteralExpression([
                factory.createPropertyAssignment("name", factory.createStringLiteral("unknown")),
                factory.createPropertyAssignment("typetype", factory.createStringLiteral("unknown"))
            ]);
        }
        
        return (sourceFile: ts.SourceFile) => {
            // transformation code here
            const visitor: ts.Visitor = (node) => {
                // update hasImportReflectMetadata
                if (ts.isImportDeclaration(node)) {
                    const moduleName = node.moduleSpecifier.getText();
                    if (moduleName.includes('reflect-metadata')) {
                        hasImportReflectMetadata = true;
                    }
                }
                const hasDecorator = (node: ts.HasDecorators) => {
                    const decorators = ts.getDecorators(node);
                    return decorators && decorators.length > 0;
                }
                // find all property declarations
                if (ts.isPropertyDeclaration(node) && hasImportReflectMetadata && (!onlyDecorated || hasDecorator(node))) {
                    // get the type of the property
                    // clone node to avoid modifying the original
                    const type = node.type;
                    // generate a decorator for the property
                    if (type) {
                        const typeNode = generateTypeNode(type);
                        factory.createIdentifier("Reflect.metadata");
                        const decoratorExpr = factory.createDecorator(
                            factory.createCallExpression(factory.createIdentifier("Reflect.metadata"), undefined, [
                                factory.createStringLiteral("design:ttype"),
                                typeNode
                            ])
                        );
                        // Check if there are existing decorators and append the new one
                        let newModifiers = [];
                        if (!node.modifiers) {
                            newModifiers = [decoratorExpr];
                        } else {
                            newModifiers = [...(node as any).modifiers, decoratorExpr];
                        }
                        return factory.updatePropertyDeclaration(node, newModifiers, node.name, node.questionToken, node.type, node.initializer);
                    }
                }

                if (ts.isMethodDeclaration(node) && hasImportReflectMetadata && (!onlyDecorated || hasDecorator(node))) {
                    const addedDecorators = [];
                    const nodeArray = node.parameters.map((param) => generateTypeNode(param.type!) );
                    const arrayNode = factory.createArrayLiteralExpression(nodeArray);
                    const decoratorExpr = factory.createDecorator(
                        factory.createCallExpression(factory.createIdentifier("Reflect.metadata"), undefined, [
                            factory.createStringLiteral("design:paramttypes"),
                            arrayNode
                        ])
                    );
                    
                    addedDecorators.push(decoratorExpr);
                    
                    const checker = program.getTypeChecker();
                    const signature = checker.getSignatureFromDeclaration(node);
                    if (signature) {
                        const returnType = checker.getReturnTypeOfSignature(signature);
                        const typeNode = checker.typeToTypeNode(returnType, node, ts.NodeBuilderFlags.IgnoreErrors);
                        if (typeNode) {
                            const returnDecoratorExpr = factory.createDecorator(
                                factory.createCallExpression(factory.createIdentifier("Reflect.metadata"), undefined, [
                                    factory.createStringLiteral("design:returnttype"),
                                    generateTypeNode(typeNode, returnType)
                                ])
                            );
                            addedDecorators.push(returnDecoratorExpr);
                        }
                        
                    }
                    let newModifiers = [];
                    if (!node.modifiers) {
                        newModifiers = addedDecorators;
                    } else {
                        newModifiers = [...(node as any).modifiers, ...addedDecorators];
                    }
                    return factory.updateMethodDeclaration(node, newModifiers, node.asteriskToken, node.name, node.questionToken, node.typeParameters, node.parameters, node.type, node.body);
                    // return node;
                }
                return ts.visitEachChild(node, visitor, ctx);
            }

            const result = ts.visitNode(sourceFile, visitor);
            if (result) {
                // console.log(result.getFullText());
                return result.getSourceFile();
            }
            return sourceFile;
        };
    };
    
}