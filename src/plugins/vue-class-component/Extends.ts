import { ASTConverter, ASTResultKind, ReferenceKind } from '../types';
import ts from 'typescript';

export const convertExtends: ASTConverter<ts.HeritageClause> = (node, options) => {

	const expressionObj = node.types[0];

	const expressionName = expressionObj.expression.getText();

	if (expressionName !== 'Popup') {
		return false;
	}

	const typeReference = expressionObj.typeArguments;

	const getParam = () => {
		if (typeReference && typeReference[0].kind === ts.SyntaxKind.TypeReference) {
			return ts.createTypeReferenceNode(
				ts.createIdentifier(typeReference[0].getText()),
				undefined,
			);
		}
		return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
	};

	const nodeBody = ts.createObjectLiteral([
		ts.createPropertyAssignment(
			ts.createIdentifier('type'),
			ts.createAsExpression(
				ts.createIdentifier('Function'),
				ts.createTypeReferenceNode(ts.createIdentifier('PropType'), [
					ts.createFunctionTypeNode(undefined, [
						ts.createParameter(undefined, undefined, undefined, ts.createIdentifier('close'), undefined, getParam(), undefined),
					], ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)),
				]),
			),
		),
	]);

	const nodeRes = ts.createPropertyAssignment(ts.createIdentifier('close'), nodeBody);

	return [{
		tag: 'Prop',
		kind: ASTResultKind.OBJECT,
		imports: [{
			named: ['PropType'],
			external: 'vue',
		}],
		reference: ReferenceKind.PROPS,
		attributes: ['close'],
		nodes: [nodeRes],
	}];
};
