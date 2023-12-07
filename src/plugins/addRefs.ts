import { ASTTransform, ReferenceKind, ASTResultKind, ASTResult } from './types';
import type ts from 'typescript';

export const addRefs: ASTTransform = (astResults, options) => {
	console.log('before', astResults);
	const ts = options.typescript;
	const tsModule = options.typescript;
	const dependent = new Set();

	const transformer: () => ts.TransformerFactory<ts.Node> = () => {
		return (context) => {
			const removeThisVisitor: ts.Visitor = (node) => {
				if (tsModule.isPropertyAccessExpression(node)) {
					if (node.expression.kind === tsModule.SyntaxKind.ThisKeyword) {
						const propertyName = node.name.getText();

						if (propertyName === '$refs') {
							const text = (node.parent as ts.VariableDeclaration).name.getText();

							dependent.add(text);
							return tsModule.createIdentifier(propertyName);
						}
					}
					return tsModule.visitEachChild(node, removeThisVisitor, context);
				}
				return tsModule.visitEachChild(node, removeThisVisitor, context);
			};

			return (node) => tsModule.visitNode(node, removeThisVisitor);
		};
	};

	astResults.forEach((astResult) => {
		if (astResult.kind === ASTResultKind.OBJECT) {
			return null;
		}
		tsModule.transform(astResult.nodes, [transformer()], { module: tsModule.ModuleKind.ESNext });
	});

	if (dependent.size === 0) {
		return astResults;
	}

	console.log('🚀 ~ file: addRefs.ts:41 ~ dependent:', dependent);

	const patterns: ASTResult<ts.Node>[] = [];

	dependent.forEach((dataName) => {
		const expression = ts.createCall(
			ts.createIdentifier('ref'),
			[ts.createTypeReferenceNode(ts.createIdentifier('HTMLElement'), undefined)],
			[ts.createNull()],
		);

		const node = ts.createVariableStatement(
			undefined,
			ts.createVariableDeclarationList(
				[ts.createVariableDeclaration(ts.createIdentifier(dataName as string), undefined, expression)],
				ts.NodeFlags.Const,
			),
		);

		patterns.push({
			tag: 'Data-ref',
			kind: ASTResultKind.COMPOSITION,
			imports: [
				{
					named: ['ref'],
					external: 'vue',
				},
			],
			reference: ReferenceKind.VARIABLE_VALUE,
			attributes: [dataName as string],
			nodes: [node],
		});
	});

	return [...patterns, ...astResults];
};
