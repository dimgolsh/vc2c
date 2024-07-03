import { ASTConverter, ASTResult, ASTResultKind, ASTResultToObject, ASTTransform, ReferenceKind } from '../types';
import type ts from 'typescript';
import { copySyntheticComments } from '../../utils';

const modelDecoratorName = 'Validate';

//	@Validate({
// 		required: true,
// 		email: true,
// 		custom: (_: any, self: RestorePasswordPage) => self.emailExists,
// 	})
// 	public email: string = null;
// ->
// {email: {required: true, email: true, custom: (_: any, self: RestorePasswordPage) => self.emailExists}}

// const rules = {
//	{email: {required: true, email: true, custom: (_: any, self: RestorePasswordPage) => self.emailExists}}
// }

export const convertValidate: ASTConverter<ts.PropertyDeclaration> = (node, options) => {
	if (!node.decorators) {
		return false;
	}

	const decorator = node.decorators.find((el) => (el.expression as ts.CallExpression).expression.getText() === modelDecoratorName);
	if (decorator) {
		const tsModule = options.typescript;
		// email
		const name = node.name.getText();
		const decoratorArguments = (decorator.expression as ts.CallExpression).arguments;

		if (decoratorArguments.length > 0 && node.initializer) {

			const properties = (decoratorArguments[0] as ts.ObjectLiteralExpression).properties;

			const res = {
				tag: 'Validate',
				kind: ASTResultKind.OBJECT,
				imports: [],
				reference: ReferenceKind.Validate,
				attributes: [node.name.getText()],
				nodes: [
					tsModule.createPropertyAssignment(
						tsModule.createIdentifier(name),
						tsModule.createObjectLiteral(properties, true),
					),
					tsModule.createPropertyAssignment(
						tsModule.createIdentifier(name),
						node.initializer,
					),
				] as ts.PropertyAssignment[],
			};

			return res;
		}
	}

	return false;
};

export const mergeValidate: ASTTransform = (astResults, options) => {
	const tsModule = options.typescript;
	const propTags = ['Validate'];

	const propASTResults = astResults.filter((el) => propTags.includes(el.tag));

	if (propASTResults.length === 0) {
		return astResults;
	}

	const otherASTResults = astResults.filter((el) => !propTags.includes(el.tag));

	const nodes: ts.ObjectLiteralElementLike[] = [];
	const stateNodes: ts.ObjectLiteralElementLike[] = [];

	propASTResults.forEach((res) => {
		nodes.push(res.nodes[0] as ts.ObjectLiteralElementLike);
		stateNodes.push(res.nodes[1] as ts.ObjectLiteralElementLike);
	});

	const stateValidate = tsModule.createVariableStatement(undefined, tsModule.createVariableDeclarationList([
		tsModule.createVariableDeclaration(tsModule.createIdentifier('stateValidate'), undefined,
			tsModule.createCall(tsModule.createIdentifier('reactive'), undefined, [
				tsModule.createObjectLiteral([...stateNodes], true),
			])),
	], tsModule.NodeFlags.Const));

	const rulesNode = tsModule.createVariableStatement(undefined, tsModule.createVariableDeclarationList([
		tsModule.createVariableDeclaration(
			tsModule.createIdentifier('rules'),
			undefined, tsModule.createObjectLiteral([...nodes], true),
		),
	], tsModule.NodeFlags.Const));

	const v$Node = tsModule.createVariableStatement(undefined, tsModule.createVariableDeclarationList([
		tsModule.createVariableDeclaration(tsModule.createIdentifier('$v'), undefined, tsModule.createCall(tsModule.createIdentifier('useVuelidate'), undefined, [
			tsModule.createIdentifier('rules'),
			tsModule.createIdentifier('stateValidate'),
		])),
	], tsModule.NodeFlags.Const));

	const provideNode = tsModule.createExpressionStatement(tsModule.createCall(
		tsModule.createIdentifier('provide'),
		undefined,
		[
			tsModule.createStringLiteral('$v'),
			tsModule.createIdentifier('$v'),
		],
	));

	const mergeASTResult: ASTResult<ts.Statement> = {
		tag: 'Validate',
		kind: ASTResultKind.COMPOSITION,
		imports: [{
			named: ['useVuelidate'],
			external: '@vuelidate/core',
		}, {
			named: ['provide'],
			external: 'vue',
		}, ...propASTResults.map((l) => l.imports).reduce((array, el) => array.concat(el), [])],
		reference: ReferenceKind.Validate,
		attributes: ['stateValidate'],
		nodes: [
			stateValidate,
			rulesNode,
			v$Node,
			provideNode,
		],
	};

	return [
		mergeASTResult,
		...otherASTResults,
	];
};
