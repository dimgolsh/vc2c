import { ASTTransform, ReferenceKind, ASTResultKind } from './types';
import type ts from 'typescript';
import { convertI18nKey } from '../utils';

export const addI18nCompos: ASTTransform = (astResults, options) => {
	const ts = options.typescript;
	const tsModule = options.typescript;
	const dependent = new Set();

	const transformer: () => ts.TransformerFactory<ts.Node> = () => {
		return (context) => {
			const removeThisVisitor: ts.Visitor = (node) => {
				if (tsModule.isPropertyAccessExpression(node)) {
					if (node.expression.kind === tsModule.SyntaxKind.ThisKeyword) {
						const propertyName = node.name.getText();
						const i18nkey = convertI18nKey(propertyName);
						if (i18nkey) {
							dependent.add(i18nkey);
							return tsModule.createIdentifier(i18nkey);
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

	const patterns: ts.BindingElement[] = [];

	dependent.forEach((f) => {
		patterns.push(ts.createBindingElement(undefined, undefined, ts.createIdentifier(f as string), undefined));
		return f;
	});
	const node = ts.createVariableStatement(
		undefined,
		ts.createVariableDeclarationList(
			[
				ts.createVariableDeclaration(
					ts.createObjectBindingPattern(patterns),
					undefined,
					ts.createCall(ts.createIdentifier('useI18n'), undefined, []),
				),
			],
			ts.NodeFlags.Const,
		),
	);

	return [
		{
			kind: ASTResultKind.COMPOSITION,
			imports: [{ named: ['useI18n'], external: 'common/composables/use-i18n' }],
			reference: ReferenceKind.I18n,
			attributes: [],
			tag: 'I18nCompos',
			nodes: [node, ts.createIdentifier('\n')],
		},
		...astResults,
	];
};
