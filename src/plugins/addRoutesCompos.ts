import { ASTTransform, ReferenceKind, ASTResultKind } from './types';
import type ts from 'typescript';
import { convertRoutesKey } from '../utils';

export const addRoutesCompos: ASTTransform = (astResults, options) => {
	const ts = options.typescript;
	const tsModule = options.typescript;
	const dependent = new Set();

	const transformer: () => ts.TransformerFactory<ts.Node> = () => {
		return (context) => {
			const removeThisVisitor: ts.Visitor = (node) => {
				if (tsModule.isPropertyAccessExpression(node)) {
					if (node.expression.kind === tsModule.SyntaxKind.ThisKeyword) {
						const propertyName = node.name.getText();
						const i18nkey = convertRoutesKey(propertyName);
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

	console.log(dependent)

	if (dependent.size === 0) {
		return astResults;
	}

	const nodes: ts.VariableStatement[] = [];

	const mapRoute = {
		route: 'useRoute',
		router: 'useRouter',
	};

	dependent.forEach((f) => {
		const key = mapRoute[f as keyof typeof mapRoute] ?? '';
		console.log(key)
		if (key) {
			const node = ts.createVariableStatement(
				undefined,
				ts.createVariableDeclarationList(
					[
						ts.createVariableDeclaration(
							ts.createIdentifier(f as string),
							undefined,
							ts.createCall(ts.createIdentifier(key), undefined, []),
						),
					],
					ts.NodeFlags.Const,
				),
			);

			nodes.push(node);
		}

		return f;
	});

	return [
		{
			kind: ASTResultKind.COMPOSITION,
			imports: [],
			reference: ReferenceKind.Route,
			attributes: [],
			tag: 'RouteCompos',
			nodes: [...nodes, ts.createIdentifier('\n')],
		},
		...astResults,
	];
};
