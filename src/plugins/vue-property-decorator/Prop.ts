import { ASTConverter, ASTResultKind, ASTTransform, ASTResultToObject, ReferenceKind } from '../types';
import ts from 'typescript';
import { copySyntheticComments } from '../../utils';

const propDecoratorName = 'Prop';

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
		let hasType = false;

		if (decoratorArguments.length > 0) {
			const propName = node.name.getText();
			const propArguments = decoratorArguments[0] as ts.ObjectLiteralExpression;

			if (node.type?.kind === ts.SyntaxKind.TypeReference) {
				hasType = true;
				const typeName = (node.type as ts.TypeReferenceNode).typeName;
				console.log('🚀 ~ file: Prop.ts:15 ~ decorator:', typeName.getText());
				console.log('🚀 ~ file: Prop.ts:15 ~ decoratorArguments[0]:', propArguments.properties[0].getChildAt(2));

				const findType = propArguments.properties.findIndex((f) => f.name?.getText() === 'type');

				if (findType !== -1) {
          const ident = propArguments.properties[0].getChildAt(2).getText()
					const node = ts.createPropertyAssignment(
						ts.createIdentifier('type'),
						ts.createAsExpression(
							ts.createIdentifier(ident),
							ts.createTypeReferenceNode(ts.createIdentifier('PropType'), [
								ts.createTypeReferenceNode(ts.createIdentifier(typeName.getText()), undefined),
							]),
						),
					);
					propArguments.properties[findType] = node;
				}
			}

			const nodeRes = copySyntheticComments(
				tsModule,
				tsModule.createPropertyAssignment(tsModule.createIdentifier(propName), propArguments),
				node,
			);

			console.log(hasType);

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
