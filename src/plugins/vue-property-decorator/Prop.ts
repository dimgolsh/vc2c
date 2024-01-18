import { ASTConverter, ASTResultKind, ASTTransform, ASTResultToObject, ReferenceKind } from '../types';
import ts from 'typescript';
import { copySyntheticComments } from '../../utils';

const propDecoratorName = 'Prop';

const getArguments = (
	node: ts.PropertyDeclaration,
	propArguments: ts.ObjectLiteralExpression,
): ts.ObjectLiteralExpression => {
	// @Prop({ type: Object, required: true })
	// public value: INotificationModel;
	if (node.type?.kind === ts.SyntaxKind.TypeReference) {
		const args = propArguments.properties.map((type) => {
			const typeName = (node.type as ts.TypeReferenceNode).typeName;
			const ident = propArguments.properties[0].getChildAt(2).getText();

			if (type.name?.getText() === 'type') {
				return ts.createPropertyAssignment(
					ts.createIdentifier('type'),
					ts.createAsExpression(
						ts.createIdentifier(ident),
						ts.createTypeReferenceNode(ts.createIdentifier('PropType'), [
							ts.createTypeReferenceNode(ts.createIdentifier(typeName.getText()), undefined),
						]),
					),
				);
			}

			return type;
		});

		return ts.createObjectLiteral(args);
	}

	// @Prop({ type: Array, required: true })
	// tqs: IQAErrorModel[];
	if (node.type?.kind === ts.SyntaxKind.ArrayType && propArguments.properties) {
		const typeName = (node.type as ts.ArrayTypeNode).elementType;

		const args = propArguments.properties.map((type) => {
			if (type.name?.getText() === 'type') {
				return ts.createPropertyAssignment(
					ts.createIdentifier('type'),
					ts.createAsExpression(
						ts.createIdentifier('Array'),
						ts.createTypeReferenceNode(ts.createIdentifier('PropType'), [
							ts.createArrayTypeNode(ts.createTypeReferenceNode(ts.createIdentifier(typeName.getText()), undefined)),
						]),
					),
				);
			}

			return type;
		});

		return ts.createObjectLiteral(args);
	}

	// @Prop(Array)
	// tqs: IQAErrorModel[];
	if (node.type?.kind === ts.SyntaxKind.ArrayType && !propArguments.properties) {
		const typeName = (node.type as ts.ArrayTypeNode).elementType;

		return ts.createObjectLiteral([
			ts.createPropertyAssignment(
				ts.createIdentifier('type'),
				ts.createAsExpression(
					ts.createIdentifier('Array'),
					ts.createTypeReferenceNode(ts.createIdentifier('PropType'), [
						ts.createArrayTypeNode(ts.createTypeReferenceNode(ts.createIdentifier(typeName.getText()), undefined)),
					]),
				),
			),
		]);
	}

	return propArguments;
};

export const convertProp: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
	if (!node.decorators) {
		return false;
	}

	const decorator = node.decorators.find(
		(el) => (el.expression as ts.CallExpression).expression.getText() === propDecoratorName,
	);

	if (decorator) {
		const tsModule = options.typescript;
		const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;

		if (decoratorArguments.length > 0) {
			const propName = node.name.getText();
			const propArguments = decoratorArguments[0] as ts.ObjectLiteralExpression;

			const nodeRes = copySyntheticComments(
				tsModule,
				tsModule.createPropertyAssignment(tsModule.createIdentifier(propName), getArguments(node, propArguments)),
				node,
			);

			const hasType = [ts.SyntaxKind.TypeReference, ts.SyntaxKind.ArrayType].includes(
				(node.type as ts.TypeReferenceNode).kind,
			);

			const imports = hasType
				? [
						{
							named: ['PropType'],
							external: 'vue',
						},
				  ]
				: [];

			return {
				tag: 'Prop',
				kind: ASTResultKind.OBJECT,
				imports,
				reference: ReferenceKind.PROPS,
				attributes: [propName],
				nodes: [nodeRes],
			};
		}
	}

	return false;
};
export const mergeProps: ASTTransform = (astResults, options) => {
	const tsModule = options.typescript;
	const propTags = ['Prop', 'Model'];

	const propASTResults = astResults.filter((el) => propTags.includes(el.tag));

	const otherASTResults = astResults.filter((el) => !propTags.includes(el.tag));
	const modelASTResult = astResults.find((el) => el.tag === 'Model');

	const mergeASTResult: ASTResultToObject = {
		tag: 'Prop',
		kind: ASTResultKind.OBJECT,
		imports: propASTResults.map((l) => l.imports).reduce((array, el) => array.concat(el), []),
		reference: ReferenceKind.PROPS,
		attributes: propASTResults.map((el) => el.attributes).reduce((array, el) => array.concat(el), []),
		nodes: [
			tsModule.createPropertyAssignment(
				tsModule.createIdentifier('props'),
				tsModule.createObjectLiteral(
					[
						...propASTResults
							.map((el) => (el.tag === 'Prop' ? el.nodes : [el.nodes[1]]))
							.reduce((array, el) => array.concat(el), [] as ts.ObjectLiteralElementLike[]),
					] as ts.ObjectLiteralElementLike[],
					true,
				),
			),
		],
	};

	return [
		...(modelASTResult
			? [
					{
						...modelASTResult,
						nodes: modelASTResult.nodes.slice(0, 1) as ts.PropertyAssignment[],
					},
			  ]
			: []),
		mergeASTResult,
		...otherASTResults,
	];
};
